"""
bulk_collect_india.py
──────────────────────────────────────────────────────────────────────────────
Collects news for Indian companies and labels them with 24h price returns.

Strategy (all free APIs):
  1. Finnhub general news   → filter articles mentioning Indian companies
  2. Alpha Vantage NEWS_SENTIMENT (per ticker, free tier: 25 req/day)
  3. yfinance for 24h price returns (always free)

Run:
    python bulk_collect_india.py

Output:
    data/processed/labeled_dataset.csv   ← used by the API
    data/raw/india_news_YYYYMMDD.json    ← raw articles
"""

import os, re, json, time, requests
from datetime import datetime, timedelta
from pathlib import Path
import pandas as pd
import yfinance as yf
from dotenv import load_dotenv

load_dotenv()
ROOT = Path(__file__).parent

FINNHUB_KEY = os.getenv("FINNHUB_API_KEY", "")
AV_KEY      = os.getenv("ALPHA_VANTAGE_KEY", "")

RAW_DIR      = ROOT / "data" / "raw"
PROCESSED    = ROOT / "data" / "processed"
LABELED_CSV  = PROCESSED / "labeled_dataset.csv"
RAW_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED.mkdir(parents=True, exist_ok=True)

# ── Indian companies + keyword patterns ──────────────────────────────────────
INDIAN_COMPANIES = {
    "RELIANCE.NS": ["reliance industries","reliance jio","jio","mukesh ambani","ril"],
    "TCS.NS":      ["tata consultancy","tcs "],
    "HDFCBANK.NS": ["hdfc bank","hdfcbank"],
    "INFY.NS":     ["infosys","infy ","narayana murthy","salil parekh"],
    "ICICIBANK.NS":["icici bank","icicibank"],
    "HINDUNILVR.NS":["hindustan unilever","hul ","lifebuoy","dove india"],
    "ITC.NS":      ["itc limited","itc ltd","itc share","wills cigarette"],
    "SBIN.NS":     ["state bank of india","sbi bank","sbi share"],
    "BHARTIARTL.NS":["airtel","bharti airtel","sunil mittal"],
    "KOTAKBANK.NS":["kotak mahindra","kotak bank","uday kotak"],
    "LT.NS":       ["larsen toubro","l&t ","lt construction"],
    "AXISBANK.NS": ["axis bank"],
    "ASIANPAINT.NS":["asian paints"],
    "MARUTI.NS":   ["maruti suzuki","maruti share","swift car","alto car"],
    "SUNPHARMA.NS":["sun pharma","sun pharmaceutical"],
    "WIPRO.NS":    ["wipro limited","wipro it","wipro share"],
    "BAJFINANCE.NS":["bajaj finance","bajaj fin share"],
    "NESTLEIND.NS":["nestle india","maggi noodle","kitkat india"],
    "TITAN.NS":    ["titan company","tanishq","fastrack watch"],
    "ADANIENT.NS": ["adani enterprises","adani group","gautam adani"],
    "ADANIPORTS.NS":["adani ports","mundra port"],
    "TATAMOTORS.NS":["tata motors","jaguar land rover","jlr ","tata ev"],
    "TATASTEEL.NS":["tata steel","tata steel share"],
    "JSWSTEEL.NS": ["jsw steel","jsw share"],
    "HCLTECH.NS":  ["hcl tech","hcl technologies"],
    "TECHM.NS":    ["tech mahindra","techm share"],
    "ZOMATO.NS":   ["zomato","deepinder goyal","food delivery india"],
    "PAYTM.NS":    ["paytm","one97 communications","vijay shekhar"],
    "NYKAA.NS":    ["nykaa","fsn e-commerce","falguni nayar"],
    "DMART.NS":    ["dmart","avenue supermarts","radhakishan damani"],
    "INDIGO.NS":   ["indigo airline","interglobe aviation","indigo flight"],
    "IRCTC.NS":    ["irctc ","indian railway catering"],
    "HAL.NS":      ["hindustan aeronautics","hal aircraft","hal share"],
    "BEL.NS":      ["bharat electronics","bel share","bel defence"],
    "DRREDDY.NS":  ["dr reddy","dr. reddy","drreddy"],
    "CIPLA.NS":    ["cipla pharma","cipla share","cipla drug"],
    "LUPIN.NS":    ["lupin pharma","lupin limited"],
    "BIOCON.NS":   ["biocon","kiran mazumdar shaw"],
    "DIVISLAB.NS": ["divi's lab","divi laboratories","divis share"],
    "APOLLOHOSP.NS":["apollo hospitals","apollo health"],
    "BAJAJ-AUTO.NS":["bajaj auto","bajaj motorcycle","bajaj pulsar"],
    "HEROMOTOCO.NS":["hero motocorp","hero motorcycle","hero honda"],
    "TVSMOTOR.NS": ["tvs motor","tvs apache","tvs share"],
    "COALINDIA.NS":["coal india","coal india share","coal ministry india"],
    "ONGC.NS":     ["ongc india","oil natural gas india","ongc share"],
    "NTPC.NS":     ["ntpc india","ntpc power","ntpc share"],
    "POWERGRID.NS":["power grid india","pgcil","power grid share"],
    "HINDALCO.NS": ["hindalco","hindalco share","novelis"],
    "VEDL.NS":     ["vedanta india","vedl share","anil agarwal vedanta"],
    "PERSISTENT.NS":["persistent systems","persistent share"],
    "LTIM.NS":     ["ltimindtree","lti mindtree","lti share"],
    "POLICYBZR.NS":["policybazaar","pb fintech","yashish dahiya"],
    "DELHIVERY.NS":["delhivery","delhivery share","sahil barua"],
    "NAZARA.NS":   ["nazara technologies","nazara games","nazara share"],
    "MAPMYINDIA.NS":["mapmyindia","mappls","ce info systems"],
    "IRFC.NS":     ["irfc india","indian railway finance"],
    "MUTHOOTFIN.NS":["muthoot finance","muthoot gold"],
    "BAJAJFINSV.NS":["bajaj finserv","bajaj allianz"],
    "SBILIFE.NS":  ["sbi life insurance","sbilife share"],
    "HDFCLIFE.NS": ["hdfc life insurance","hdfclife share"],
    "BRITANNIA.NS":["britannia industries","britannia biscuit","good day biscuit"],
    "EICHERMOT.NS":["eicher motors","royal enfield","re bullet"],
    "MARICO.NS":   ["marico india","parachute coconut","saffola"],
    "DABUR.NS":    ["dabur india","dabur chyawanprash","dabur share"],
    "COFORGE.NS":  ["coforge limited","coforge share"],
    "KPITTECH.NS": ["kpit technologies","kpit share"],
    "TATAELXSI.NS":["tata elxsi","tata elxsi share"],
    "HAPPSTMNDS.NS":["happiest minds","happy minds tech"],
}

# ── Finnhub: general market news (free) ──────────────────────────────────────
def fetch_finnhub_news(days_back: int = 30) -> list[dict]:
    if not FINNHUB_KEY:
        print("⚠️  No FINNHUB_API_KEY — skipping Finnhub")
        return []

    articles = []
    end   = datetime.now()
    start = end - timedelta(days=days_back)

    # Free endpoint: general market news (no ticker required)
    categories = ["general", "forex", "merger"]
    for cat in categories:
        url = f"https://finnhub.io/api/v1/news?category={cat}&token={FINNHUB_KEY}"
        try:
            r = requests.get(url, timeout=15)
            if r.status_code == 200:
                data = r.json()
                for a in (data if isinstance(data, list) else []):
                    articles.append({
                        "headline":     a.get("headline",""),
                        "summary":      a.get("summary",""),
                        "source":       a.get("source","finnhub"),
                        "url":          a.get("url",""),
                        "published_at": a.get("datetime", 0),
                    })
                print(f"  Finnhub '{cat}': {len(data)} articles")
            time.sleep(0.3)
        except Exception as e:
            print(f"  Finnhub error: {e}")

    print(f"  Total Finnhub articles: {len(articles)}")
    return articles

# ── Alpha Vantage: per-ticker news (free: 25 calls/day) ──────────────────────
def fetch_av_news(tickers: list[str], time_from: str = "20240101") -> list[dict]:
    if not AV_KEY:
        print("⚠️  No ALPHA_VANTAGE_KEY — skipping Alpha Vantage")
        return []

    articles = []
    base_url = "https://www.alphavantage.co/query"
    limit    = 25   # free tier

    for i, ticker in enumerate(tickers[:limit]):
        # Strip .NS for AV ticker format  (AV uses INFY not INFY.NS)
        av_ticker = ticker.replace(".NS","").replace(".BO","")
        params = {
            "function":   "NEWS_SENTIMENT",
            "tickers":    av_ticker,
            "time_from":  f"{time_from}T0000",
            "time_to":    datetime.now().strftime("%Y%m%dT%H%M"),
            "limit":      200,
            "apikey":     AV_KEY,
        }
        try:
            r = requests.get(base_url, params=params, timeout=20)
            if r.status_code == 200:
                data = r.json()
                feed = data.get("feed", [])
                for a in feed:
                    # Get sentiment for this specific ticker
                    ts_data = next(
                        (ts for ts in a.get("ticker_sentiment",[])
                         if ts["ticker"] == av_ticker), {}
                    )
                    articles.append({
                        "ticker":       ticker,      # Indian .NS format
                        "headline":     a.get("title",""),
                        "summary":      a.get("summary","")[:500],
                        "source":       a.get("source",""),
                        "url":          a.get("url",""),
                        "published_at": a.get("time_published",""),
                        "av_sentiment": ts_data.get("ticker_sentiment_label","Neutral"),
                        "av_score":     float(ts_data.get("ticker_sentiment_score", 0)),
                    })
                print(f"  [{i+1}/{min(len(tickers),limit)}] {av_ticker}: {len(feed)} articles")
            else:
                print(f"  {av_ticker}: HTTP {r.status_code}")
            time.sleep(12)   # AV free tier: 5 req/min
        except Exception as e:
            print(f"  {av_ticker} error: {e}")

    print(f"  Total AV articles: {len(articles)}")
    return articles

# ── Match general news to Indian companies ───────────────────────────────────
def match_to_indian_tickers(articles: list[dict]) -> list[dict]:
    matched = []
    for a in articles:
        text = (a.get("headline","") + " " + a.get("summary","")).lower()
        for ticker, keywords in INDIAN_COMPANIES.items():
            for kw in keywords:
                if kw in text:
                    matched.append({**a, "ticker": ticker})
                    break   # one match per article per company is enough
    print(f"  Matched {len(matched)} article-company pairs from general news")
    return matched

# ── Price labeling ────────────────────────────────────────────────────────────
def label_with_prices(articles: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(articles)
    if df.empty:
        return df

    # Parse published_at to datetime
    def parse_dt(v):
        if not v: return None
        try:
            if isinstance(v, int): return datetime.utcfromtimestamp(v)
            if len(str(v)) == 15: return datetime.strptime(str(v), "%Y%m%dT%H%M%S")
            return pd.to_datetime(v, errors="coerce")
        except: return None

    df["pub_dt"] = df["published_at"].apply(parse_dt)
    df = df.dropna(subset=["pub_dt", "ticker"])

    # Skip articles from last 2 days (no forward price yet)
    cutoff = datetime.now() - timedelta(days=2)
    df = df[df["pub_dt"] < cutoff]

    print(f"\n  Labeling {len(df)} articles with yfinance prices…")

    # Download price data per ticker
    price_cache: dict[str, pd.Series] = {}
    unique_tickers = df["ticker"].unique().tolist()

    for t in unique_tickers:
        try:
            hist = yf.download(t, period="2y", interval="1d",
                               auto_adjust=True, progress=False)
            if not hist.empty:
                price_cache[t] = hist["Close"].squeeze()
                print(f"    {t}: {len(hist)} price rows")
        except Exception as e:
            print(f"    {t} price error: {e}")

    # Compute 24h return
    def get_return(row):
        t   = row["ticker"]
        dt  = row["pub_dt"]
        if t not in price_cache: return None, None
        prices = price_cache[t]
        try:
            prices.index = pd.to_datetime(prices.index).tz_localize(None)
            dt = pd.to_datetime(dt).tz_localize(None)
            # Find nearest trading day >= pub date
            future  = prices[prices.index >= dt]
            current = prices[prices.index >= dt - timedelta(days=3)]
            if future.empty or current.empty: return None, None
            p0 = float(current.iloc[0])
            p1 = float(future.iloc[0]) if len(future) == 1 else float(future.iloc[1]) if len(future) > 1 else None
            if p1 is None or p0 == 0: return None, None
            ret = (p1 - p0) / p0
            label = 1 if abs(ret) > 0.01 else 0
            return round(ret, 6), label
        except Exception as e:
            return None, None

    df[["return_24h","label"]] = df.apply(
        lambda r: pd.Series(get_return(r)), axis=1
    )

    # Drop rows with no price data
    before = len(df)
    df = df.dropna(subset=["return_24h"])
    print(f"  Labeled {len(df)}/{before} articles with price returns")

    return df

# ── Sentiment from av_sentiment or keyword fallback ──────────────────────────
def derive_signal(row) -> str:
    BULL = {"positive","bullish","somewhat-bullish","buy"}
    BEAR = {"negative","bearish","somewhat-bearish","sell"}
    sent = str(row.get("av_sentiment","")).lower().strip()
    if sent in BULL: return "Bullish"
    if sent in BEAR: return "Bearish"
    ret = row.get("return_24h")
    if ret is not None:
        if ret > 0.015:  return "Bullish"
        if ret < -0.015: return "Bearish"
    return "Neutral"

# ── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "="*60)
    print("  ALPHALENS — INDIAN MARKET DATA COLLECTOR")
    print("="*60)

    all_articles: list[dict] = []

    # Step 1: Alpha Vantage per-ticker (most reliable, free 25/day)
    print("\n[1/3] Alpha Vantage per-ticker news…")
    av_tickers = list(INDIAN_COMPANIES.keys())
    av_articles = fetch_av_news(av_tickers, time_from="20240601")
    all_articles.extend(av_articles)

    # Step 2: Finnhub general news → keyword match
    print("\n[2/3] Finnhub general news + keyword matching…")
    finnhub_raw  = fetch_finnhub_news(days_back=60)
    finnhub_matched = match_to_indian_tickers(finnhub_raw)
    all_articles.extend(finnhub_matched)

    # Save raw
    raw_path = RAW_DIR / f"india_news_{datetime.now().strftime('%Y%m%d')}.json"
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2, default=str)
    print(f"\n  Raw articles saved: {raw_path} ({len(all_articles)} total)")

    # Step 3: Label with prices
    print("\n[3/3] Labeling with 24h price returns…")
    df = label_with_prices(all_articles)

    if df.empty:
        print("\n❌ No articles could be labeled. Check your API keys.")
        print("   Set FINNHUB_API_KEY and/or ALPHA_VANTAGE_KEY in .env")
        exit(1)

    # Add signal
    df["signal"] = df.apply(derive_signal, axis=1)

    # Select key columns
    keep = ["ticker","headline","summary","source","url","published_at",
            "av_sentiment","av_score","return_24h","label","signal"]
    df = df[[c for c in keep if c in df.columns]]

    # Merge with existing CSV if present
    if LABELED_CSV.exists():
        existing = pd.read_csv(LABELED_CSV)
        existing.columns = [c.strip().lower() for c in existing.columns]
        if "ticker" in existing.columns and existing["ticker"].str.endswith(".NS").any():
            # Already has Indian data — append new rows
            merged = pd.concat([existing, df], ignore_index=True)
            merged = merged.drop_duplicates(subset=["ticker","headline"], keep="last")
            df = merged
            print(f"\n  Merged with existing CSV: {len(df)} total rows")
        else:
            print(f"\n  ⚠️  Existing CSV has non-Indian tickers — replacing with Indian data")

    df.to_csv(LABELED_CSV, index=False)

    # Summary
    print("\n" + "="*60)
    print("  COLLECTION COMPLETE")
    print("="*60)
    print(f"\n  Total rows    : {len(df)}")
    print(f"  Unique tickers: {df['ticker'].nunique()}")
    print(f"  Signal counts : {df['signal'].value_counts().to_dict()}")
    print(f"\n  Saved to: {LABELED_CSV}")
    print("\n  Next steps:")
    print("  1. Restart uvicorn")
    print("  2. Refresh the dashboard")
    print("  3. Run: python src/models/impact_model.py  (retrain model on Indian data)")
    print()