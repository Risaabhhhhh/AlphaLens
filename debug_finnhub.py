"""
debug_finnhub.py
Run this first to diagnose why news collection is returning 0 articles.
Usage: python debug_finnhub.py
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("FINNHUB_API_KEY", "")

if not API_KEY:
    print("❌ FINNHUB_API_KEY not found in environment or .env file")
    print("   Make sure your .env file has: FINNHUB_API_KEY=your_key_here")
    exit(1)

print(f"✓ API key found: {API_KEY[:6]}...{API_KEY[-4:]}\n")

# ── Test 1: Basic API connectivity ────────────────────────────────────────────
print("Test 1: Basic API connectivity...")
r = requests.get(f"https://finnhub.io/api/v1/quote?symbol=AAPL&token={API_KEY}")
print(f"  Status: {r.status_code}")
if r.status_code == 200:
    print(f"  Response: {r.json()}")
    print("  ✓ API key works\n")
elif r.status_code == 401:
    print("  ❌ 401 Unauthorized — API key is wrong or expired")
    exit(1)
else:
    print(f"  ❌ Unexpected status: {r.text}")

# ── Test 2: Company news endpoint ─────────────────────────────────────────────
print("Test 2: Company news for AAPL (last 30 days)...")
r2 = requests.get(
    "https://finnhub.io/api/v1/company-news",
    params={"symbol": "AAPL", "from": "2024-09-01", "to": "2024-09-30", "token": API_KEY}
)
print(f"  Status: {r2.status_code}")
data = r2.json()

if r2.status_code == 403:
    print("  ❌ 403 Forbidden — company-news requires a PAID Finnhub plan")
    print("  → Free tier only allows: general_news, not company-specific news")
    print("  → See FIX below")
elif isinstance(data, list):
    print(f"  ✓ Got {len(data)} articles")
    if data:
        print(f"  Sample: {data[0].get('headline', '')[:80]}")
elif isinstance(data, dict) and "error" in data:
    print(f"  ❌ API error: {data['error']}")
else:
    print(f"  Response: {data}")

# ── Test 3: General news (free tier) ──────────────────────────────────────────
print("\nTest 3: General news (free tier)...")
r3 = requests.get(
    "https://finnhub.io/api/v1/news",
    params={"category": "general", "token": API_KEY}
)
print(f"  Status: {r3.status_code}")
data3 = r3.json()
if isinstance(data3, list):
    print(f"  ✓ Got {len(data3)} general articles")
    if data3:
        print(f"  Sample: {data3[0].get('headline', '')[:80]}")
else:
    print(f"  Response: {data3}")

print("\n" + "="*55)
print("DIAGNOSIS COMPLETE — read the output above")
print("="*55)