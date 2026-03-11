"""
bulk_collect_v2.py
══════════════════════════════════════════════════════════════════
Fixed version — works on Finnhub FREE tier.

The original bulk_collect.py used company-news endpoint which
requires a PAID Finnhub plan ($50+/month).

This version uses TWO free approaches:
  1. Finnhub general news  → filter articles mentioning your tickers
  2. Alpha Vantage NEWS API → free, 25 req/day, good coverage

Also adds a fallback: generates synthetic labeled data from your
existing raw JSON files so you can still train immediately.
══════════════════════════════════════════════════════════════════
Usage:
  python bulk_collect_v2.py            # uses Finnhub general news
  python bulk_collect_v2.py --alpha    # also uses Alpha Vantage
  python bulk_collect_v2.py --rebuild  # rebuild labels from existing raw JSON
"""

import os, sys, json, time, re, argparse, requests
import pandas as pd
import yfinance as yf
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

FINNHUB_KEY     = os.getenv("FINNHUB_API_KEY", "")
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "")   # optional, free at alphavantage.co

# ── Ticker → company name map (for keyword matching in general news) ──────────
TICKER_KEYWORDS = {
    "AAPL":  ["apple", "iphone", "ipad", "mac", "tim cook"],
    "MSFT":  ["microsoft", "azure", "windows", "satya nadella", "copilot"],
    "NVDA":  ["nvidia", "jensen huang", "cuda", "h100", "blackwell", "geforce"],
    "GOOGL": ["google", "alphabet", "gemini", "waymo", "youtube", "sundar"],
    "META":  ["meta", "facebook", "instagram", "zuckerberg", "whatsapp", "threads"],
    "AMZN":  ["amazon", "aws", "bezos", "andy jassy", "prime"],
    "TSLA":  ["tesla", "elon musk", "cybertruck", "model 3", "model y", "supercharger"],
    "JPM":   ["jpmorgan", "jp morgan", "jamie dimon", "chase"],
    "GS":    ["goldman sachs", "goldman"],
    "BAC":   ["bank of america", "bofa"],
    "AMD":   ["amd", "advanced micro", "lisa su", "ryzen", "radeon"],
    "INTC":  ["intel", "pat gelsinger"],
    "QCOM":  ["qualcomm", "snapdragon"],
    "NFLX":  ["netflix", "reed hastings", "streaming"],
    "UBER":  ["uber", "dara khosrowshahi", "rideshare"],
    "COIN":  ["coinbase", "brian armstrong", "crypto exchange"],
    "PLTR":  ["palantir", "alex karp"],
    "SNOW":  ["snowflake", "frank slootman"],
}

EVENT_KEYWORDS = {
    "earnings":       ["earnings", "revenue", "profit", "eps", "quarterly", "beat", "miss", "guidance", "q1","q2","q3","q4"],
    "acquisition":    ["acqui", "merger", "takeover", "buyout", "deal closed", "purchase"],
    "product_launch": ["launch", "unveil", "announce", "release", "new product", "new model", "debut", "introduces"],
    "partnership":    ["partner", "collaborat", "agreement", "joint venture", "team up"],
    "lawsuit":        ["lawsuit", "sue", "court", "legal action", "settle", "class action", "charges"],
    "regulatory":     ["sec", "ftc", "doj", "regulation", "fine", "penalty", "ban", "antitrust", "probe"],
    "macro":          ["fed", "inflation", "gdp", "interest rate", "recession", "jobs report", "fomc"],
}
EVENT_IMPORTANCE = {
    "earnings": 1.0, "acquisition": 0.9, "lawsuit": 0.8,
    "regulatory": 0.8, "product_launch": 0.7,
    "partnership": 0.5, "macro": 0.6, "general": 0.3,
}

def classify_event(text: str) -> tuple[str, float]:
    t = text.lower()
    for event, kws in EVENT_KEYWORDS.items():
        if any(k in t for k in kws):
            return event, EVENT_IMPORTANCE[event]
    return "general", 0.3

def detect_ticker(text: str) -> str | None:
    t = text.lower()
    for ticker, keywords in TICKER_KEYWORDS.items():
        if any(k in t for k in keywords):
            return ticker
    # Also check for explicit $TICKER or uppercase patterns
    matches = re.findall(r'\b([A-Z]{2,5})\b', text)
    for m in matches:
        if m in TICKER_KEYWORDS:
            return m
    return None


# ── Price helper ──────────────────────────────────────────────────────────────
_price_cache = {}

def get_prices(ticker: str) -> pd.DataFrame:
    if ticker not in _price_cache:
        try:
            df = yf.download(ticker, start="2023-01-01", end="2025-03-01",
                             progress=False, auto_adjust=True)
            if not df.empty:
                df = df.reset_index()
                df.columns = [c[0].lower() if isinstance(c, tuple) else c.lower() for c in df.columns]
                df["date"] = pd.to_datetime(df["date"]).dt.normalize()
                _price_cache[ticker] = df[["date", "close"]]
            else:
                _price_cache[ticker] = pd.DataFrame()
        except:
            _price_cache[ticker] = pd.DataFrame()
    return _price_cache[ticker]

def get_return(ticker: str, pub_date_str: str) -> float | None:
    prices = get_prices(ticker)
    if prices.empty:
        return None
    pub = pd.Timestamp(pub_date_str).normalize()
    fwd = pub + pd.Timedelta(days=1)
    r0 = prices[prices["date"] >= pub].head(1)
    r1 = prices[prices["date"] >= fwd].head(1)
    if r0.empty or r1.empty:
        return None
    p0, p1 = float(r0["close"].iloc[0]), float(r1["close"].iloc[0])
    return round((p1 - p0) / p0, 6) if p0 != 0 else None


# ── Source 1: Finnhub general news (FREE) ─────────────────────────────────────
def fetch_finnhub_general(categories=("general","technology","merger")) -> list[dict]:
    articles = []
    for cat in categories:
        try:
            r = requests.get(
                "https://finnhub.io/api/v1/news",
                params={"category": cat, "token": FINNHUB_KEY},
                timeout=10
            )
            if r.status_code == 200:
                data = r.json()
                if isinstance(data, list):
                    articles.extend(data)
                    print(f"  Finnhub [{cat}]: {len(data)} articles")
            else:
                print(f"  Finnhub [{cat}]: status {r.status_code}")
            time.sleep(0.5)
        except Exception as e:
            print(f"  Finnhub [{cat}] error: {e}")
    return articles


# ── Source 2: Alpha Vantage news (FREE, optional) ─────────────────────────────
def fetch_alpha_vantage(tickers: list[str]) -> list[dict]:
    if not ALPHA_VANTAGE_KEY:
        return []
    articles = []
    # AV allows fetching news for multiple tickers at once
    ticker_str = ",".join(tickers[:5])  # max 5 per call on free tier
    try:
        r = requests.get(
            "https://www.alphavantage.co/query",
            params={
                "function": "NEWS_SENTIMENT",
                "tickers":  ticker_str,
                "limit":    200,
                "apikey":   ALPHA_VANTAGE_KEY,
            },
            timeout=15
        )
        data = r.json()
        if "feed" in data:
            print(f"  Alpha Vantage: {len(data['feed'])} articles")
            for item in data["feed"]:
                articles.append({
                    "headline": item.get("title", ""),
                    "summary":  item.get("summary", ""),
                    "source":   item.get("source", ""),
                    "url":      item.get("url", ""),
                    "datetime": int(datetime.strptime(
                        item.get("time_published", "20240101T000000"),
                        "%Y%m%dT%H%M%S"
                    ).timestamp()),
                    "related":  ",".join([t["ticker"] for t in item.get("ticker_sentiment", [])]),
                })
    except Exception as e:
        print(f"  Alpha Vantage error: {e}")
    return articles


# ── Source 3: Rebuild from existing raw JSON files ────────────────────────────
def load_existing_raw() -> list[dict]:
    articles = []
    json_files = sorted(RAW_DIR.glob("*.json"))
    print(f"  Found {len(json_files)} raw JSON files in data/raw/")
    for f in json_files:
        try:
            data = json.loads(f.read_text())
            if isinstance(data, list):
                articles.extend(data)
            elif isinstance(data, dict):
                articles.append(data)
        except:
            pass
    return articles


# ── Article → labeled row ─────────────────────────────────────────────────────
def article_to_row(a: dict, force_ticker: str = None) -> dict | None:
    headline = a.get("headline", a.get("title", "")).strip()
    if not headline or len(headline) < 10:
        return None

    summary  = a.get("summary", a.get("description", ""))[:300]
    source   = a.get("source", "")
    url      = a.get("url", "")
    pub_ts   = a.get("datetime", a.get("publishedAt", 0))

    # Parse publish date
    if isinstance(pub_ts, (int, float)) and pub_ts > 0:
        pub_date = datetime.fromtimestamp(pub_ts).strftime("%Y-%m-%d")
    elif isinstance(pub_ts, str) and len(pub_ts) >= 10:
        pub_date = pub_ts[:10]
    else:
        return None

    # Detect ticker
    ticker = force_ticker
    if not ticker:
        related = a.get("related", "")
        if related:
            ticker = related.split(",")[0].strip().upper()
    if not ticker:
        ticker = detect_ticker(f"{headline} {summary}")
    if not ticker:
        return None

    # Get 24h return
    ret = get_return(ticker, pub_date)
    if ret is None:
        return None

    event_type, importance = classify_event(f"{headline} {summary}")

    return {
        "headline":     headline,
        "summary":      summary,
        "source":       source,
        "url":          url,
        "ticker":       ticker,
        "published_at": pub_date,
        "event_type":   event_type,
        "importance":   importance,
        "return_24h":   ret,
        "label":        1 if abs(ret) > 0.02 else 0,
    }


# ── Main ──────────────────────────────────────────────────────────────────────
def run(use_alpha: bool = False, rebuild_only: bool = False):
    print("\n" + "═"*58)
    print("  AlphaLens — Bulk Collector v2 (Free Tier)")
    print("═"*58)

    all_articles = []

    # Always load existing raw files
    print("\n[1] Loading existing raw JSON files...")
    existing_raw = load_existing_raw()
    all_articles.extend(existing_raw)
    print(f"    Total from existing files: {len(existing_raw)}")

    if not rebuild_only:
        # Finnhub general news
        if FINNHUB_KEY:
            print("\n[2] Fetching Finnhub general news (free tier)...")
            fh = fetch_finnhub_general()
            all_articles.extend(fh)
            # Save to raw
            if fh:
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                (RAW_DIR / f"news_general_{ts}.json").write_text(json.dumps(fh, indent=2))
        else:
            print("\n[2] Skipping Finnhub (no API key)")

        # Alpha Vantage (optional)
        if use_alpha:
            print("\n[3] Fetching Alpha Vantage news...")
            av = fetch_alpha_vantage(list(TICKER_KEYWORDS.keys()))
            all_articles.extend(av)
            if av:
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                (RAW_DIR / f"news_alphavantage_{ts}.json").write_text(json.dumps(av, indent=2))

    # ── Deduplicate by URL ─────────────────────────────────────────────────
    seen, unique = set(), []
    for a in all_articles:
        url = a.get("url", "")
        key = url or a.get("headline", "")[:60]
        if key and key not in seen:
            seen.add(key)
            unique.append(a)

    print(f"\n[4] Processing {len(unique)} unique articles → fetching prices + labels...")
    print("    (this may take a few minutes)\n")

    rows = []
    skipped = 0
    for a in unique:
        row = article_to_row(a)
        if row:
            rows.append(row)
        else:
            skipped += 1

    print(f"    ✓ {len(rows)} labeled rows  |  {skipped} skipped (no ticker/price)")

    if not rows:
        print("\n❌ No rows produced.")
        print("   Possible reasons:")
        print("   • No raw JSON files in data/raw/ yet")
        print("   • Finnhub free tier returned 0 general news (try again later)")
        print("   • Get a free Alpha Vantage key: alphavantage.co")
        print("     Then run: python bulk_collect_v2.py --alpha")
        return

    new_df = pd.DataFrame(rows)

    # Merge with existing
    if LABELED_CSV.exists():
        existing = pd.read_csv(LABELED_CSV)
        before = len(existing)
        combined = pd.concat([existing, new_df], ignore_index=True)
        combined = combined.drop_duplicates(subset=["headline", "ticker"], keep="last")
        print(f"\n    Merged: {before} existing + {len(new_df)} new = {len(combined)} total")
    else:
        combined = new_df
        print(f"\n    New dataset: {len(combined)} rows")

    combined.to_csv(LABELED_CSV, index=False)
    feat_cols = ["headline","summary","source","ticker","published_at","event_type","importance"]
    combined[[c for c in feat_cols if c in combined.columns]].to_csv(FEATURES_CSV, index=False)

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n" + "═"*58)
    print("  DONE")
    print("═"*58)
    print(f"  Total rows   : {len(combined):,}")
    print(f"  Label=1 rate : {combined['label'].mean():.1%}  (stocks that moved >2%)")
    print(f"  Tickers      : {combined['ticker'].nunique()}")
    if "published_at" in combined.columns:
        print(f"  Date range   : {combined['published_at'].min()} → {combined['published_at'].max()}")

    print(f"\n  Saved → {LABELED_CSV}\n")

    if len(combined) < 100:
        print("  ⚠  Still under 100 rows. Try:")
        print("     1. Get free Alpha Vantage key at alphavantage.co")
        print("        Add to .env:  ALPHA_VANTAGE_KEY=your_key")
        print("        Run: python bulk_collect_v2.py --alpha")
        print("     2. Or upgrade Finnhub to Starter ($0 trial available)")
    else:
        print("  ✅ Ready to retrain:")
        print("     python src/models/impact_model.py")
    print("═"*58 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--alpha",   action="store_true", help="Also use Alpha Vantage (needs ALPHA_VANTAGE_KEY in .env)")
    parser.add_argument("--rebuild", action="store_true", help="Just rebuild labels from existing raw JSON files")
    args = parser.parse_args()
    run(use_alpha=args.alpha, rebuild_only=args.rebuild)