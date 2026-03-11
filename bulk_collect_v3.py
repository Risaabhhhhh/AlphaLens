"""
bulk_collect_v3.py
══════════════════════════════════════════════════════════════════
Properly fetches per-ticker news from Alpha Vantage free tier.
Targets 500+ labeled rows.

Usage:
  python bulk_collect_v3.py

Needs in .env:
  ALPHA_VANTAGE_KEY=your_key
  FINNHUB_API_KEY=your_key
══════════════════════════════════════════════════════════════════
"""

import os, sys, json, time, re
import pandas as pd
import yfinance as yf
import requests
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

ROOT          = Path(__file__).parent
RAW_DIR       = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

LABELED_CSV  = PROCESSED_DIR / "labeled_dataset.csv"
FEATURES_CSV = PROCESSED_DIR / "news_features.csv"

AV_KEY       = os.getenv("ALPHA_VANTAGE_KEY", "")
FINNHUB_KEY  = os.getenv("FINNHUB_API_KEY", "")

TICKERS = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "META",
    "AMZN", "TSLA", "JPM", "AMD", "NFLX",
    "INTC", "QCOM", "UBER", "COIN", "GS",
]

EVENT_KEYWORDS = {
    "earnings":       ["earnings","revenue","profit","eps","quarterly","beat","miss","guidance","q1","q2","q3","q4","fiscal"],
    "acquisition":    ["acqui","merger","takeover","buyout","deal","purchase","acquire"],
    "product_launch": ["launch","unveil","announce","release","new product","new model","debut","introduces","unveils"],
    "partnership":    ["partner","collaborat","agreement","joint venture","teams up"],
    "lawsuit":        ["lawsuit","sue","court","legal","settle","class action","charges","litigation"],
    "regulatory":     ["sec","ftc","doj","regulat","fine","penalty","ban","antitrust","probe","investigation"],
    "macro":          ["fed","inflation","gdp","interest rate","recession","jobs","fomc","rate hike","rate cut"],
}
EVENT_IMPORTANCE = {
    "earnings":1.0,"acquisition":0.9,"lawsuit":0.8,
    "regulatory":0.8,"product_launch":0.7,
    "partnership":0.5,"macro":0.6,"general":0.3,
}

def classify_event(text: str) -> tuple[str, float]:
    t = text.lower()
    for event, kws in EVENT_KEYWORDS.items():
        if any(k in t for k in kws):
            return event, EVENT_IMPORTANCE[event]
    return "general", 0.3


# ── Price cache ───────────────────────────────────────────────────────────────
_prices = {}

def get_prices(ticker: str) -> pd.DataFrame:
    if ticker not in _prices:
        print(f"    Downloading prices for {ticker}...")
        try:
            end_date = (datetime.today() + timedelta(days=2)).strftime("%Y-%m-%d")
            df = yf.download(ticker, start="2023-01-01", end=end_date,
                             progress=False, auto_adjust=True)
            if not df.empty:
                df = df.reset_index()
                df.columns = [c[0].lower() if isinstance(c, tuple) else c.lower()
                              for c in df.columns]
                df["date"] = pd.to_datetime(df["date"]).dt.normalize()
                _prices[ticker] = df[["date","close"]]
            else:
                _prices[ticker] = pd.DataFrame()
        except Exception as e:
            print(f"    Price error {ticker}: {e}")
            _prices[ticker] = pd.DataFrame()
    return _prices[ticker]

def get_return(ticker: str, pub_date_str: str) -> float | None:
    prices = get_prices(ticker)
    if prices.empty:
        return None
    try:
        pub = pd.Timestamp(pub_date_str).normalize()

        # Skip articles from last 2 days — no forward price exists yet
        if pub >= pd.Timestamp(datetime.today().date() - timedelta(days=2)):
            return None

        fwd = pub + pd.Timedelta(days=1)
        r0  = prices[prices["date"] >= pub].head(1)
        r1  = prices[prices["date"] >= fwd].head(1)
        if r0.empty or r1.empty:
            return None
        p0, p1 = float(r0["close"].iloc[0]), float(r1["close"].iloc[0])
        return round((p1 - p0) / p0, 6) if p0 else None
    except:
        return None


# ── Alpha Vantage: per-ticker news ────────────────────────────────────────────
def fetch_av_ticker(ticker: str) -> list[dict]:
    """
    Fetches news for a specific ticker from Alpha Vantage.
    Free tier: 25 calls/day, 200 results per call.
    """
    if not AV_KEY:
        return []
    try:
        r = requests.get(
            "https://www.alphavantage.co/query",
            params={
                "function":  "NEWS_SENTIMENT",
                "tickers":   ticker,
                "limit":     200,
                "sort":      "RELEVANCE",        # gets older important articles
                "time_from": "20240101T0000",    # go back to Jan 2024
                "time_to":   "20250301T0000",    # up to Mar 2025 (price data exists)
                "apikey":    AV_KEY,
            },
            timeout=15,
        )
        data = r.json()

        # Rate limit hit
        if "Information" in data or "Note" in data:
            msg = data.get("Information", data.get("Note", ""))
            print(f"    ⚠  AV rate limit: {msg[:80]}")
            return []

        articles = data.get("feed", [])
        parsed = []
        for item in articles:
            # Parse timestamp: "20241015T143000"
            ts_str = item.get("time_published", "")
            try:
                pub_date = datetime.strptime(ts_str[:8], "%Y%m%d").strftime("%Y-%m-%d")
            except:
                continue

            parsed.append({
                "headline":   item.get("title", "").strip(),
                "summary":    item.get("summary", "")[:400],
                "source":     item.get("source", ""),
                "url":        item.get("url", ""),
                "ticker":     ticker,
                "pub_date":   pub_date,
                # AV provides its own sentiment
                "av_sentiment": item.get("overall_sentiment_label", ""),
                "av_score":     float(item.get("overall_sentiment_score", 0)),
            })
        return parsed

    except Exception as e:
        print(f"    AV error for {ticker}: {e}")
        return []


# ── Finnhub general news → aggressive ticker matching ────────────────────────
TICKER_PATTERNS = {
    "AAPL":  r'\b(apple|iphone|ipad|macbook|mac\b|tim cook|app store|ios\b)\b',
    "MSFT":  r'\b(microsoft|azure|windows|satya nadella|office 365|teams\b|xbox)\b',
    "NVDA":  r'\b(nvidia|jensen huang|cuda|h100|h200|blackwell|geforce|gpu\b)\b',
    "GOOGL": r'\b(google|alphabet|gemini|waymo|youtube|sundar pichai|android|chrome)\b',
    "META":  r'\b(meta\b|facebook|instagram|zuckerberg|whatsapp|threads|oculus)\b',
    "AMZN":  r'\b(amazon|aws\b|bezos|andy jassy|prime\b|alexa\b|whole foods)\b',
    "TSLA":  r'\b(tesla|elon musk|cybertruck|model [3sy]\b|supercharger|autopilot)\b',
    "JPM":   r'\b(jpmorgan|jp morgan|jamie dimon|chase bank)\b',
    "GS":    r'\b(goldman sachs|goldman)\b',
    "AMD":   r'\b(amd\b|advanced micro|lisa su|ryzen|radeon|epyc)\b',
    "INTC":  r'\b(intel\b|pat gelsinger|core\b processor|xeon)\b',
    "NFLX":  r'\b(netflix|reed hastings|streaming service|subscriber)\b',
    "UBER":  r'\b(uber\b|dara khosrowshahi|rideshare|ride.hail)\b',
    "COIN":  r'\b(coinbase|brian armstrong|crypto exchange)\b',
    "QCOM":  r'\b(qualcomm|snapdragon|5g chip)\b',
}

def match_ticker(text: str) -> str | None:
    t = text.lower()
    for ticker, pattern in TICKER_PATTERNS.items():
        if re.search(pattern, t):
            return ticker
    return None

def fetch_finnhub_general() -> list[dict]:
    articles = []
    for cat in ("general", "technology", "merger"):
        try:
            r = requests.get(
                "https://finnhub.io/api/v1/news",
                params={"category": cat, "token": FINNHUB_KEY},
                timeout=10,
            )
            if r.status_code == 200:
                data = r.json()
                if isinstance(data, list):
                    articles.extend(data)
        except:
            pass
        time.sleep(0.3)
    return articles


# ── Build labeled row ─────────────────────────────────────────────────────────
def make_row(headline: str, summary: str, source: str, url: str,
             ticker: str, pub_date: str,
             av_sentiment: str = "", av_score: float = 0.0) -> dict | None:

    if not headline or len(headline) < 10 or not ticker or not pub_date:
        return None

    ret = get_return(ticker, pub_date)
    if ret is None:
        return None

    event_type, importance = classify_event(f"{headline} {summary}")

    return {
        "headline":     headline,
        "summary":      summary[:300],
        "source":       source,
        "url":          url,
        "ticker":       ticker,
        "published_at": pub_date,
        "event_type":   event_type,
        "importance":   importance,
        "av_sentiment": av_sentiment,
        "av_score":     av_score,
        "return_24h":   ret,
        "label":        1 if abs(ret) > 0.02 else 0,
    }


# ── Main ──────────────────────────────────────────────────────────────────────
def run():
    print("\n" + "═"*58)
    print("  AlphaLens — Bulk Collector v3")
    print("═"*58)

    if not AV_KEY:
        print("❌ ALPHA_VANTAGE_KEY not set in .env")
        print("   Get free key at: alphavantage.co/support/#api-key")
        sys.exit(1)

    rows = []
    seen_urls = set()

    # ── Part 1: Alpha Vantage per-ticker (best source) ────────────────────
    print(f"\n[1/2] Alpha Vantage — fetching per-ticker news")
    print(f"      Tickers: {', '.join(TICKERS)}")
    print(f"      (25 free calls/day — using {len(TICKERS)} calls)\n")

    av_total = 0
    for i, ticker in enumerate(TICKERS):
        print(f"  [{i+1}/{len(TICKERS)}] {ticker}", end=" ... ", flush=True)
        articles = fetch_av_ticker(ticker)
        count = 0
        for a in articles:
            url = a.get("url", a["headline"][:50])
            if url in seen_urls:
                continue
            seen_urls.add(url)
            row = make_row(
                headline=a["headline"], summary=a["summary"],
                source=a["source"],    url=a["url"],
                ticker=ticker,         pub_date=a["pub_date"],
                av_sentiment=a["av_sentiment"], av_score=a["av_score"],
            )
            if row:
                rows.append(row)
                count += 1
        print(f"{len(articles)} fetched → {count} labeled")
        av_total += count
        time.sleep(12)  # AV free tier: 5 req/min = 12s between calls

    print(f"\n  Alpha Vantage total: {av_total} labeled rows")

    # ── Part 2: Finnhub general news with aggressive ticker matching ──────
    print(f"\n[2/2] Finnhub general news — aggressive ticker matching")
    fh_articles = fetch_finnhub_general()
    print(f"  Fetched {len(fh_articles)} general articles")

    fh_count = 0
    for a in fh_articles:
        headline = a.get("headline", "").strip()
        summary  = a.get("summary", "")
        full     = f"{headline} {summary}"

        ticker = match_ticker(full)
        if not ticker:
            continue

        url = a.get("url", "")
        if url in seen_urls:
            continue
        seen_urls.add(url)

        pub_ts = a.get("datetime", 0)
        if not pub_ts:
            continue
        pub_date = datetime.fromtimestamp(pub_ts).strftime("%Y-%m-%d")

        row = make_row(
            headline=headline, summary=summary,
            source=a.get("source",""), url=url,
            ticker=ticker, pub_date=pub_date,
        )
        if row:
            rows.append(row)
            fh_count += 1

    print(f"  Finnhub matched: {fh_count} labeled rows")

    # ── Merge + save ──────────────────────────────────────────────────────
    if not rows:
        print("\n❌ 0 rows. Check your Alpha Vantage key is correct.")
        return

    new_df = pd.DataFrame(rows)

    # Save new raw JSON
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    (RAW_DIR / f"news_bulk_v3_{ts}.json").write_text(
        json.dumps(rows, indent=2, default=str)
    )

    if LABELED_CSV.exists():
        existing = pd.read_csv(LABELED_CSV)
        before   = len(existing)
        combined = pd.concat([existing, new_df], ignore_index=True)
        combined = combined.drop_duplicates(subset=["headline","ticker"], keep="last")
        print(f"\n  Merged: {before} existing + {len(new_df)} new = {len(combined)} total")
    else:
        combined = new_df

    combined.to_csv(LABELED_CSV, index=False)
    feat_cols = ["headline","summary","source","ticker","published_at","event_type","importance"]
    combined[[c for c in feat_cols if c in combined.columns]].to_csv(FEATURES_CSV, index=False)

    # ── Print summary ─────────────────────────────────────────────────────
    print("\n" + "═"*58)
    print("  COLLECTION COMPLETE")
    print("═"*58)
    print(f"  Total rows    : {len(combined):,}")
    print(f"  Moved >2%     : {combined['label'].sum():,} ({combined['label'].mean():.1%})")
    print(f"  Tickers       : {combined['ticker'].nunique()}")
    print(f"\n  Per-ticker breakdown:")
    for ticker, grp in sorted(combined.groupby("ticker"), key=lambda x: -len(x[1])):
        bar = "█" * min(len(grp) // 2, 25)
        print(f"    {ticker:<6} {bar:<25} {len(grp):>4} rows  |  {grp['label'].mean():.0%} moved")

    print()
    if len(combined) >= 300:
        print("  ✅ Good dataset! Retrain now:")
        print("     python src/models/impact_model.py")
    else:
        print(f"  ⚠  {len(combined)} rows. Run again tomorrow for more AV data.")
    print("═"*58 + "\n")


if __name__ == "__main__":
    run()