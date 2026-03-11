"""
debug_data.py — run this to see exactly what's failing
Place in your project root and run: python debug_data.py
"""
import os, requests, yfinance as yf, pandas as pd
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

AV_KEY = os.getenv("ALPHA_VANTAGE_KEY", "")

print("=" * 55)
print("STEP 1: Check what dates AV is returning for AAPL")
print("=" * 55)
r = requests.get(
    "https://www.alphavantage.co/query",
    params={"function":"NEWS_SENTIMENT","tickers":"AAPL","limit":5,"apikey":AV_KEY},
    timeout=15
)
data = r.json()
articles = data.get("feed", [])
print(f"Got {len(articles)} articles")
for a in articles[:5]:
    ts = a.get("time_published","")
    print(f"  date_raw='{ts}'  headline='{a.get('title','')[:60]}'")

print("\n" + "=" * 55)
print("STEP 2: Check yfinance price download for AAPL")
print("=" * 55)
df = yf.download("AAPL", start="2023-01-01", end="2025-03-01",
                 progress=False, auto_adjust=True)
print(f"Shape: {df.shape}")
print(f"Columns: {df.columns.tolist()}")
print(f"Date range: {df.index.min()} → {df.index.max()}")
print(f"\nFirst 3 rows:\n{df.head(3)}")

print("\n" + "=" * 55)
print("STEP 3: Test price lookup for a sample date")
print("=" * 55)
# Reset and flatten
df2 = df.reset_index()
df2.columns = [c[0].lower() if isinstance(c, tuple) else c.lower() for c in df2.columns]
print(f"Flattened columns: {df2.columns.tolist()}")
df2["date"] = pd.to_datetime(df2["date"]).dt.normalize()

# Try looking up a date we know exists
test_date = "2024-10-15"
pub = pd.Timestamp(test_date).normalize()
fwd = pub + pd.Timedelta(days=1)
r0 = df2[df2["date"] >= pub].head(1)
r1 = df2[df2["date"] >= fwd].head(1)
print(f"Test date: {test_date}")
print(f"r0 (at/after pub): {r0[['date','close']].values if not r0.empty else 'EMPTY'}")
print(f"r1 (next day):     {r1[['date','close']].values if not r1.empty else 'EMPTY'}")

if not r0.empty and not r1.empty:
    p0 = float(r0["close"].iloc[0])
    p1 = float(r1["close"].iloc[0])
    ret = (p1 - p0) / p0
    print(f"✓ Return computed: {ret:.4f}")
else:
    print("✗ Could not compute return")