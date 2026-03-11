"""
bulk_collect.py
═══════════════════════════════════════════════════════════════════
Bulk historical data collector for AlphaLens.

Fetches 6 months of company news + matching stock prices for 20
tickers, then builds a fully labeled dataset ready for training.

Works with YOUR file structure:
  data/raw/news_*.json
  data/processed/news_features.csv
  data/processed/labeled_dataset.csv

Usage:
  python bulk_collect.py

  # Dry run (no API calls, just show what it would do):
  python bulk_collect.py --dry-run

  # Custom date range:
  python bulk_collect.py --from 2024-01-01 --to 2024-12-31

  # Specific tickers only:
  python bulk_collect.py --tickers AAPL NVDA MSFT

Requirements:
  pip install finnhub-python yfinance pandas requests python-dotenv
═══════════════════════════════════════════════════════════════════
"""

import os
import sys
import json
import time
import argparse
import requests
import pandas as pd
import yfinance as yf
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# ── Paths (matching your AlphaLens repo) ─────────────────────────────────────
ROOT          = Path(__file__).parent
RAW_DIR       = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

FEATURES_CSV = PROCESSED_DIR / "news_features.csv"
LABELED_CSV  = PROCESSED_DIR / "labeled_dataset.csv"

# ── Tickers to collect ────────────────────────────────────────────────────────
DEFAULT_TICKERS = [
    # Mega-cap tech (most news coverage)
    "AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN", "TSLA",
    # Finance
    "JPM", "GS", "BAC",
    # Semiconductors
    "AMD", "INTC", "QCOM",
    # Other high-news stocks
    "NFLX", "UBER", "COIN", "PLTR", "SNOW", "SHOP",
]

# ── Event keyword classifier ──────────────────────────────────────────────────
EVENT_KEYWORDS = {
    "earnings":       ["earnings", "revenue", "profit", "eps", "quarterly", "beat", "miss", "guidance"],
    "acquisition":    ["acqui", "merger", "takeover", "buyout", "deal", "purchase"],
    "product_launch": ["launch", "unveil", "announce", "release", "new product", "new model", "debut"],
    "partnership":    ["partner", "collaborat", "agreement", "joint venture"],
    "lawsuit":        ["lawsuit", "sue", "court", "legal action", "settle", "class action"],
    "regulatory":     ["sec", "ftc", "doj", "regulation", "fine", "penalty", "ban", "antitrust"],
    "macro":          ["fed", "inflation", "gdp", "interest rate", "recession", "jobs report"],
}

def classify_event(text: str) -> tuple[str, float]:
    t = text.lower()
    for event, keywords in EVENT_KEYWORDS.items():
        if any(k in t for k in keywords):
            importance = {
                "earnings": 1.0, "acquisition": 0.9, "lawsuit": 0.8,
                "regulatory": 0.8, "product_launch": 0.7,
                "partnership": 0.5, "macro": 0.6,
            }.get(event, 0.3)
            return event, importance
    return "general", 0.3


# ── Finnhub news fetcher ──────────────────────────────────────────────────────
def fetch_company_news(ticker: str, from_date: str, to_date: str, api_key: str) -> list[dict]:
    """Fetch company news from Finnhub REST API directly."""
    url = "https://finnhub.io/api/v1/company-news"
    params = {
        "symbol": ticker,
        "from":   from_date,
        "to":     to_date,
        "token":  api_key,
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        if isinstance(data, list):
            return data
        return []
    except Exception as e:
        print(f"    ⚠  Finnhub error for {ticker}: {e}")
        return []


# ── Price fetcher ─────────────────────────────────────────────────────────────
def fetch_prices(ticker: str, from_date: str, to_date: str) -> pd.DataFrame:
    """Returns daily OHLCV for a ticker between dates."""
    try:
        df = yf.download(ticker, start=from_date, end=to_date,
                         progress=False, auto_adjust=True)
        if df.empty:
            return pd.DataFrame()
        df = df.reset_index()
        # Flatten MultiIndex columns if present
        df.columns = [c[0].lower() if isinstance(c, tuple) else c.lower() for c in df.columns]
        df["ticker"] = ticker
        return df[["ticker", "date", "close"]]
    except Exception as e:
        print(f"    ⚠  yfinance error for {ticker}: {e}")
        return pd.DataFrame()


def get_return(prices: pd.DataFrame, pub_date: str) -> float | None:
    """Get 24h forward return from a publish date."""
    if prices.empty:
        return None
    prices = prices.copy()
    prices["date"] = pd.to_datetime(prices["date"]).dt.normalize()
    pub = pd.Timestamp(pub_date).normalize()
    fwd = pub + pd.Timedelta(days=1)

    row_now = prices[prices["date"] >= pub].head(1)
    row_fwd = prices[prices["date"] >= fwd].head(1)

    if row_now.empty or row_fwd.empty:
        return None

    p0 = float(row_now["close"].iloc[0])
    p1 = float(row_fwd["close"].iloc[0])
    if p0 == 0:
        return None
    return round((p1 - p0) / p0, 6)


# ── Date range splitter ───────────────────────────────────────────────────────
def date_windows(from_date: str, to_date: str, window_days: int = 30) -> list[tuple]:
    """Split a date range into windows (Finnhub limits each call to 1 year)."""
    start = datetime.strptime(from_date, "%Y-%m-%d")
    end   = datetime.strptime(to_date,   "%Y-%m-%d")
    windows = []
    cur = start
    while cur < end:
        w_end = min(cur + timedelta(days=window_days), end)
        windows.append((cur.strftime("%Y-%m-%d"), w_end.strftime("%Y-%m-%d")))
        cur = w_end + timedelta(days=1)
    return windows


# ── Main collector ────────────────────────────────────────────────────────────
def run(tickers: list[str], from_date: str, to_date: str,
        api_key: str, dry_run: bool = False):

    print("\n" + "═" * 60)
    print("  AlphaLens — Bulk Historical Data Collector")
    print("═" * 60)
    print(f"  Tickers    : {len(tickers)} stocks")
    print(f"  Date range : {from_date}  →  {to_date}")
    print(f"  Output     : {LABELED_CSV}")
    if dry_run:
        print("  Mode       : DRY RUN (no API calls)")
    print("═" * 60 + "\n")

    if dry_run:
        print("Dry run complete. Remove --dry-run to collect real data.")
        return

    all_rows = []
    raw_articles_all = []

    for i, ticker in enumerate(tickers):
        print(f"[{i+1}/{len(tickers)}] {ticker}")

        # ── Fetch prices once for whole range ────────────────────────────────
        print(f"    Fetching prices...")
        prices = fetch_prices(ticker, from_date, to_date)
        if prices.empty:
            print(f"    ✗ No price data — skipping")
            continue
        print(f"    ✓ {len(prices)} price days")

        # ── Fetch news in monthly windows (avoids API limits) ─────────────
        ticker_articles = []
        windows = date_windows(from_date, to_date, window_days=30)

        for w_from, w_to in windows:
            articles = fetch_company_news(ticker, w_from, w_to, api_key)
            ticker_articles.extend(articles)
            time.sleep(0.3)  # respect rate limit (60 req/min free tier)

        # Deduplicate by URL
        seen_urls = set()
        unique_articles = []
        for a in ticker_articles:
            url = a.get("url", "")
            if url not in seen_urls:
                seen_urls.add(url)
                unique_articles.append(a)

        print(f"    ✓ {len(unique_articles)} unique news articles")

        if not unique_articles:
            continue

        # ── Save raw JSON ─────────────────────────────────────────────────
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        raw_path = RAW_DIR / f"news_{ticker}_{ts}.json"
        with open(raw_path, "w") as f:
            json.dump(unique_articles, f, indent=2)
        raw_articles_all.extend(unique_articles)

        # ── Build feature rows ─────────────────────────────────────────────
        article_count = 0
        for a in unique_articles:
            headline = a.get("headline", "").strip()
            summary  = a.get("summary",  "").strip()
            source   = a.get("source",   "")
            url      = a.get("url",      "")
            pub_ts   = a.get("datetime", 0)

            if not headline:
                continue

            pub_date = datetime.fromtimestamp(pub_ts).strftime("%Y-%m-%d") if pub_ts else None
            if not pub_date:
                continue

            # Event classification
            full_text           = f"{headline} {summary}"
            event_type, importance = classify_event(full_text)

            # Forward return
            return_24h = get_return(prices, pub_date)
            if return_24h is None:
                continue

            # Label
            label = 1 if abs(return_24h) > 0.02 else 0

            all_rows.append({
                "headline":      headline,
                "summary":       summary[:300] if summary else "",
                "source":        source,
                "url":           url,
                "ticker":        ticker,
                "published_at":  pub_date,
                "event_type":    event_type,
                "importance":    importance,
                # Price data
                "return_24h":    return_24h,
                "label":         label,
            })
            article_count += 1

        print(f"    ✓ {article_count} labeled rows added\n")

        # Brief pause between tickers
        time.sleep(1.0)

    # ── Save datasets ─────────────────────────────────────────────────────────
    if not all_rows:
        print("⚠  No rows collected. Check your API key and date range.")
        return

    new_df = pd.DataFrame(all_rows)

    # Merge with existing labeled_dataset.csv if it exists
    if LABELED_CSV.exists():
        existing = pd.read_csv(LABELED_CSV)
        print(f"Existing dataset: {len(existing)} rows")
        combined = pd.concat([existing, new_df], ignore_index=True)
        # Deduplicate by headline + ticker
        combined = combined.drop_duplicates(subset=["headline", "ticker"], keep="last")
        print(f"After merge:      {len(combined)} rows (+{len(combined)-len(existing)} new)")
    else:
        combined = new_df
        print(f"New dataset:      {len(combined)} rows")

    combined.to_csv(LABELED_CSV, index=False)

    # Also save news_features.csv (subset without price labels, for exploration)
    feature_cols = ["headline", "summary", "source", "ticker",
                    "published_at", "event_type", "importance"]
    combined[feature_cols].to_csv(FEATURES_CSV, index=False)

    # ── Final summary ─────────────────────────────────────────────────────────
    print("\n" + "═" * 60)
    print("  COLLECTION COMPLETE")
    print("═" * 60)
    print(f"  Total labeled rows : {len(combined):,}")
    print(f"  Positive labels    : {combined['label'].sum():,} ({combined['label'].mean():.1%})")
    print(f"  Tickers covered    : {combined['ticker'].nunique()}")
    print(f"  Date range         : {combined['published_at'].min()} → {combined['published_at'].max()}")
    print(f"\n  Saved to:")
    print(f"    {LABELED_CSV}")
    print(f"    {FEATURES_CSV}")
    print(f"\n  Label distribution:")
    for ticker, grp in combined.groupby("ticker"):
        bar   = "█" * min(grp['label'].sum(), 30)
        moved = grp['label'].sum()
        total = len(grp)
        print(f"    {ticker:<6} {bar:<30} {moved:>3}/{total:<3} moved >2%")

    if len(combined) >= 500:
        print("\n  ✅ 500+ samples — ready to retrain!")
        print("     Run: python src/models/impact_model.py")
    elif len(combined) >= 200:
        print("\n  ⚡ Good dataset. Retrain with:")
        print("     python src/models/impact_model.py")
    else:
        print(f"\n  ⚠  Only {len(combined)} rows. Try a wider date range.")
        print("     Recommended: --from 2024-01-01 --to 2024-12-31")
    print("═" * 60 + "\n")


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AlphaLens bulk data collector")
    parser.add_argument("--from",    dest="from_date", default="2024-06-01",
                        help="Start date YYYY-MM-DD (default: 2024-06-01)")
    parser.add_argument("--to",      dest="to_date",   default="2025-01-01",
                        help="End date YYYY-MM-DD (default: 2025-01-01)")
    parser.add_argument("--tickers", nargs="+",        default=DEFAULT_TICKERS,
                        help="Ticker symbols to collect")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show plan without making API calls")
    args = parser.parse_args()

    api_key = os.getenv("FINNHUB_API_KEY", "")
    if not api_key and not args.dry_run:
        print("❌ FINNHUB_API_KEY not set.")
        print("   Either: export FINNHUB_API_KEY=your_key")
        print("   Or add it to your .env file")
        sys.exit(1)

    run(
        tickers   = args.tickers,
        from_date = args.from_date,
        to_date   = args.to_date,
        api_key   = api_key,
        dry_run   = args.dry_run,
    )