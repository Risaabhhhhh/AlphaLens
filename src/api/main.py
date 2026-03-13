"""
main.py — AlphaLens FastAPI Backend
Reads from your CSV files + model. No database needed.

Endpoints:
  GET  /health
  GET  /signals          — top signals from labeled_dataset.csv
  GET  /news             — raw news from data/raw/*.json
  GET  /summary          — dashboard stats
  GET  /company/{ticker} — per-ticker breakdown
  POST /analyze          — analyze any headline live
  GET  /top              — top signals ranked by probability
  GET  /watchlist        — signals for watchlist tickers only
"""

import os, json, glob, joblib, math
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(title="AlphaLens API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean(obj):
    """Recursively replace NaN/Inf with None so JSON serialization never fails."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return None if (math.isnan(float(obj)) or math.isinf(float(obj))) else float(obj)
    if isinstance(obj, np.ndarray):
        return clean(obj.tolist())
    return obj

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT         = Path(__file__).parent.parent.parent
LABELED_CSV  = ROOT / "data" / "processed" / "labeled_dataset.csv"
FEATURES_CSV = ROOT / "data" / "processed" / "news_features.csv"
MODEL_PKL    = ROOT / "data" / "models"     / "impact_model.pkl"
META_PKL     = ROOT / "data" / "models"     / "model_meta.pkl"
RAW_DIR      = ROOT / "data" / "raw"

# ── Sentiment + event maps (matches your impact_model.py) ─────────────────────
SENTIMENT_SCORE_MAP = {
    "negative": -1.0,  "neutral": 0.0,   "positive": 1.0,
    "Bearish": -1.0,   "Somewhat-Bearish": -0.5,
    "Neutral": 0.0,
    "Somewhat-Bullish": 0.5, "Bullish": 1.0,
}
EVENT_MAP = {
    "earnings": 0, "acquisition": 1, "product_launch": 2,
    "partnership": 3, "lawsuit": 4, "regulatory": 5,
    "macro": 6, "general": 7,
}
SOURCE_SCORES = {
    "reuters": 1.0, "bloomberg": 1.0, "wsj": 0.95,
    "cnbc": 0.85, "marketwatch": 0.80, "seekingalpha": 0.70,
    "benzinga": 0.70, "yahoo": 0.75, "motley fool": 0.65,
}
EVENT_KEYWORDS = {
    "earnings":       ["earnings","revenue","profit","eps","quarterly","beat","miss","guidance"],
    "acquisition":    ["acqui","merger","takeover","buyout","deal","purchase"],
    "product_launch": ["launch","unveil","announce","release","new product","debut","introduces"],
    "partnership":    ["partner","collaborat","agreement","joint venture"],
    "lawsuit":        ["lawsuit","sue","court","legal","settle","class action"],
    "regulatory":     ["sec","ftc","regulation","fine","penalty","ban","antitrust"],
    "macro":          ["fed","inflation","gdp","interest rate","recession","fomc"],
}
EVENT_IMPORTANCE = {
    "earnings":1.0,"acquisition":0.9,"lawsuit":0.8,"regulatory":0.8,
    "product_launch":0.7,"macro":0.6,"partnership":0.5,"general":0.3,
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def classify_event(text: str) -> tuple[str, float]:
    t = text.lower()
    for ev, kws in EVENT_KEYWORDS.items():
        if any(k in t for k in kws):
            return ev, EVENT_IMPORTANCE[ev]
    return "general", 0.3

def source_score(s: str) -> float:
    if not s: return 0.5
    s = s.lower()
    for k, v in SOURCE_SCORES.items():
        if k in s: return v
    return 0.5

def sentiment_to_signal(sentiment: str, prob: float) -> str:
    if prob >= 0.65: return "Bullish"
    if prob <= 0.35: return "Bearish"
    return "Neutral"

def explanation_drivers(sentiment: str, event_type: str,
                        source: str, prob: float) -> list[str]:
    drivers = []
    if sentiment in ("positive","Bullish","Somewhat-Bullish"):
        drivers.append("✓ Positive market sentiment")
    elif sentiment in ("negative","Bearish","Somewhat-Bearish"):
        drivers.append("✗ Negative market sentiment")
    if event_type in ("earnings","acquisition","regulatory","lawsuit"):
        drivers.append(f"✓ High-impact event: {event_type.replace('_',' ').title()}")
    elif event_type == "product_launch":
        drivers.append("✓ Product launch event")
    sc = source_score(source)
    if sc >= 0.9:
        drivers.append("✓ High-credibility source")
    elif sc <= 0.6:
        drivers.append("~ Lower-credibility source")
    if prob >= 0.65:
        drivers.append(f"→ Model confidence: {prob:.0%} move probability")
    return drivers or ["~ General news, moderate signal"]

# ── Data cache ────────────────────────────────────────────────────────────────
_cache: dict = {}

def get_df() -> pd.DataFrame:
    if "df" not in _cache:
        if not LABELED_CSV.exists():
            return pd.DataFrame()
        df = pd.read_csv(LABELED_CSV)
        df.columns = [c.strip().lower() for c in df.columns]

        # ── 1. Unified ticker column ──────────────────────────────────────────
        # CSV may store ticker in "ticker", "symbol", or "related" columns
        for col in ("ticker", "symbol", "related"):
            if col in df.columns:
                df["ticker"] = df[col].fillna("").astype(str).str.strip()
                break
        if "ticker" not in df.columns:
            df["ticker"] = ""

        # ── 2. Unified sentiment ──────────────────────────────────────────────
        if "sentiment" in df.columns and "av_sentiment" in df.columns:
            df["_sentiment"] = df["sentiment"].combine_first(df["av_sentiment"])
        elif "sentiment" in df.columns:
            df["_sentiment"] = df["sentiment"]
        elif "av_sentiment" in df.columns:
            df["_sentiment"] = df["av_sentiment"]
        else:
            df["_sentiment"] = "neutral"
        df["_sentiment"] = df["_sentiment"].fillna("neutral").astype(str).str.strip()

        # ── 3. Confidence / score ─────────────────────────────────────────────
        for col in ("av_score", "confidence", "score"):
            if col in df.columns:
                df["confidence"] = pd.to_numeric(df[col], errors="coerce").fillna(0.5)
                break
        if "confidence" not in df.columns:
            df["confidence"] = 0.5

        # ── 4. Return column normalisation ────────────────────────────────────
        for col in ("return_24h", "price_return_24h", "return"):
            if col in df.columns:
                df["return_24h"] = pd.to_numeric(df[col], errors="coerce")
                break

        # ── 5. Signal generation ──────────────────────────────────────────────
        # Strategy: use av_sentiment / sentiment string directly mapped to signal.
        # Fall back to label + return if sentiment not available.
        BULL_SENT = {"positive", "bullish", "somewhat-bullish", "buy"}
        BEAR_SENT = {"negative", "bearish", "somewhat-bearish", "sell"}

        def derive_signal(row):
            # Priority 1: direct av_sentiment string (Alpha Vantage values)
            sent = str(row.get("_sentiment", "")).lower().strip()
            if sent in BULL_SENT:
                return "Bullish"
            if sent in BEAR_SENT:
                return "Bearish"

            # Priority 2: confidence + label
            label = row.get("label", None)
            conf  = float(row.get("confidence", 0.5) or 0.5)
            ret   = row.get("return_24h", None)

            if label == 1:
                if conf >= 0.60:
                    return "Bullish"
                return "Neutral"
            if label == 0:
                if conf >= 0.60 and ret is not None and ret < -0.01:
                    return "Bearish"
                return "Neutral"

            # Priority 3: return alone
            if ret is not None:
                if ret > 0.01:  return "Bullish"
                if ret < -0.01: return "Bearish"

            return "Neutral"

        if "signal" not in df.columns:
            df["signal"] = df.apply(derive_signal, axis=1)
        else:
            # Validate existing signal values
            valid = {"Bullish", "Bearish", "Neutral"}
            mask  = ~df["signal"].isin(valid)
            if mask.any():
                df.loc[mask, "signal"] = df[mask].apply(derive_signal, axis=1)

        # ── 6. Headline fallback ──────────────────────────────────────────────
        if "headline" not in df.columns:
            for col in ("title", "summary", "text"):
                if col in df.columns:
                    df["headline"] = df[col].fillna("").astype(str).str[:200]
                    break
        if "headline" not in df.columns:
            df["headline"] = ""

        _cache["df"] = df
    return _cache["df"]

def get_raw_news() -> list[dict]:
    if "news" not in _cache:
        articles = []
        for p in sorted(RAW_DIR.glob("*.json"), reverse=True)[:20]:
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(data, list): articles.extend(data)
            except: pass
        _cache["news"] = articles
    return _cache["news"]

def get_model():
    if "model" not in _cache and MODEL_PKL.exists():
        _cache["model"] = joblib.load(MODEL_PKL)
    return _cache.get("model")

def invalidate_cache():
    _cache.clear()

# ── Live prediction helper ────────────────────────────────────────────────────
def run_prediction(headline: str, sentiment_label: str,
                   sentiment_conf: float, source: str = "") -> dict:
    event_type, importance = classify_event(headline)
    sent_score = SENTIMENT_SCORE_MAP.get(sentiment_label, 0.0)

    model = get_model()
    if model is not None:
        row = pd.DataFrame([{
            "sentiment_encoded":  {"negative":0,"neutral":1,"positive":2,
                                   "Bearish":0,"Neutral":1,"Bullish":2,
                                   "Somewhat-Bearish":0,"Somewhat-Bullish":2
                                   }.get(sentiment_label, 1),
            "sentiment_score":    sent_score,
            "event_encoded":      EVENT_MAP.get(event_type, 7),
            "confidence":         sentiment_conf,
            "importance":         importance,
            "headline_len":       len(headline),
            "source_score":       source_score(source),
            "sentiment_x_event":  sent_score * importance,
        }])
        try:
            prob = float(model.predict_proba(row)[0][1])
        except Exception:
            prob = abs(sent_score) * 0.6 + importance * 0.3
    else:
        prob = abs(sent_score) * 0.6 + importance * 0.3

    signal  = sentiment_to_signal(sentiment_label, prob)
    drivers = explanation_drivers(sentiment_label, event_type, source, prob)

    return {
        "sentiment":          sentiment_label,
        "sentiment_score":    round(sent_score, 3),
        "confidence":         round(sentiment_conf, 3),
        "event_type":         event_type,
        "importance":         round(importance, 3),
        "impact_probability": round(prob, 3),
        "signal":             signal,
        "drivers":            drivers,
    }

# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {
        "status":       "ok",
        "model":        MODEL_PKL.exists(),
        "labeled_data": LABELED_CSV.exists(),
        "raw_files":    len(list(RAW_DIR.glob("*.json"))) if RAW_DIR.exists() else 0,
    }

@app.get("/debug/csv")
def debug_csv():
    """Inspect what's actually in your labeled_dataset.csv — use this to diagnose empty signals."""
    df = get_df()
    if df.empty:
        return {"error": "CSV not found or empty", "path": str(LABELED_CSV)}

    tickers  = df["ticker"].dropna().unique().tolist() if "ticker" in df.columns else []
    signals  = df["signal"].value_counts().to_dict() if "signal" in df.columns else {}
    sentiments = df["_sentiment"].value_counts().to_dict() if "_sentiment" in df.columns else {}
    columns  = df.columns.tolist()
    sample   = clean(df.head(3).where(pd.notnull(df), None).to_dict(orient="records"))

    return JSONResponse(content=clean({
        "total_rows":      len(df),
        "columns":         columns,
        "tickers_found":   tickers[:50],
        "ticker_count":    len(tickers),
        "signal_counts":   signals,
        "sentiment_counts":sentiments,
        "sample_rows":     sample,
        "csv_path":        str(LABELED_CSV),
    }))

# ── POST /analyze — headline analyzer ────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    headline: str
    ticker:   Optional[str] = None
    source:   Optional[str] = ""

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """Live pipeline: headline → FinBERT → XGBoost → signal + explanation."""
    try:
        from src.models.sentiment_model import analyze_sentiment
        sentiment_label, sentiment_conf = analyze_sentiment(req.headline)
    except Exception:
        # Fallback if FinBERT not available in API context
        sentiment_label, sentiment_conf = "neutral", 0.5

    result = run_prediction(req.headline, sentiment_label,
                            sentiment_conf, req.source or "")
    return {
        "headline": req.headline,
        "ticker":   req.ticker,
        **result,
    }

# ── GET /signals ──────────────────────────────────────────────────────────────
@app.get("/signals")
def get_signals(
    ticker: Optional[str] = Query(None),
    signal: Optional[str] = Query(None),
    limit:  int           = Query(50, le=200),
):
    df = get_df()
    if df.empty: return []

    if ticker:
        df = df[df.get("ticker", pd.Series()).str.upper() == ticker.upper()]
    if signal:
        df = df[df["signal"].str.lower() == signal.lower()]

    for col in ("published_at", "date"):
        if col in df.columns:
            df = df.sort_values(col, ascending=False)
            break

    out = df.head(limit).where(pd.notnull(df), None)
    return JSONResponse(content=clean(out.to_dict(orient="records")))

# ── GET /top — ranked by impact ───────────────────────────────────────────────
@app.get("/top")
def get_top(limit: int = Query(10, le=50)):
    """Top signals ranked by impact probability / label."""
    df = get_df()
    if df.empty: return JSONResponse(content=[])

    sort_cols = []
    if "label"      in df.columns: sort_cols.append("label")
    if "confidence" in df.columns: sort_cols.append("confidence")
    if "importance" in df.columns: sort_cols.append("importance")

    if sort_cols:
        df = df.sort_values(sort_cols, ascending=False)

    top = df.head(limit).where(pd.notnull(df), None)
    records = top.to_dict(orient="records")

    for i, r in enumerate(records):
        r["rank"] = i + 1
        conf = r.get("confidence") or r.get("importance") or 0.5
        try:
            conf = float(conf) if conf is not None else 0.5
        except:
            conf = 0.5
        r["drivers"] = explanation_drivers(
            r.get("_sentiment", r.get("sentiment", "neutral")),
            r.get("event_type", "general"),
            r.get("source", ""),
            conf,
        )

    return JSONResponse(content=clean(records))

# ── GET /news ─────────────────────────────────────────────────────────────────
@app.get("/news")
def get_news(limit: int = Query(30, le=100)):
    articles = get_raw_news()[:limit]
    return [{
        "headline":     a.get("headline", a.get("title", "")),
        "summary":      a.get("summary",  "")[:200],
        "source":       a.get("source",   ""),
        "url":          a.get("url",      ""),
        "ticker":       a.get("related",  a.get("ticker", "")),
        "published_at": a.get("datetime", ""),
    } for a in articles if a.get("headline") or a.get("title")]

# ── GET /summary ──────────────────────────────────────────────────────────────
@app.get("/summary")
def get_summary():
    df  = get_df()
    raw = get_raw_news()

    if df.empty:
        return {"total":0,"bullish":0,"bearish":0,"neutral":0,
                "top_signals":[],"model_loaded": MODEL_PKL.exists()}

    bull = int((df["signal"] == "Bullish").sum())
    bear = int((df["signal"] == "Bearish").sum())
    neut = int((df["signal"] == "Neutral").sum())

    # Top 3 tickers by signal count
    top_signals = []
    if "ticker" in df.columns:
        for ticker, grp in df.groupby("ticker"):
            b = int((grp["signal"] == "Bullish").sum())
            r = int((grp["signal"] == "Bearish").sum())
            dominant = "Bullish" if b >= r else "Bearish"
            conf = round(max(b, r) / len(grp), 2)
            top_signals.append({"ticker": ticker, "signal": dominant,
                                 "confidence": conf, "count": len(grp)})
        top_signals = sorted(top_signals, key=lambda x: -x["count"])[:8]

    avg_ret = None
    for col in ("return_24h", "price_return_24h"):
        if col in df.columns:
            avg_ret = round(float(df[col].mean()), 4)
            break

    return JSONResponse(content=clean({
        "total":        len(df),
        "raw_news":     len(raw),
        "bullish":      bull,
        "bearish":      bear,
        "neutral":      neut,
        "avg_return":   avg_ret,
        "model_loaded": MODEL_PKL.exists(),
        "top_signals":  top_signals,
    }))

# ── GET /company/{ticker} ─────────────────────────────────────────────────────
@app.get("/company/{ticker}")
def get_company(ticker: str):
    ticker = ticker.upper()
    df = get_df()
    if df.empty or "ticker" not in df.columns:
        raise HTTPException(404, "No data")

    sub = df[df["ticker"].str.upper() == ticker]
    if sub.empty:
        raise HTTPException(404, f"No data for {ticker}")

    bull = int((sub["signal"] == "Bullish").sum())
    bear = int((sub["signal"] == "Bearish").sum())
    neut = int((sub["signal"] == "Neutral").sum())

    avg_ret = None
    for col in ("return_24h","price_return_24h"):
        if col in sub.columns:
            avg_ret = round(float(sub[col].mean()), 4)
            break

    recent = sub.sort_values("published_at", ascending=False).head(10) \
               if "published_at" in sub.columns else sub.head(10)

    return JSONResponse(content=clean({
        "ticker":   ticker,
        "stats": {
            "total":    len(sub),
            "bullish":  bull,
            "bearish":  bear,
            "neutral":  neut,
            "avg_return_24h": avg_ret,
            "move_rate": round(float(sub["label"].mean()), 3) if "label" in sub.columns else None,
        },
        "recent": recent.where(pd.notnull(recent), None).to_dict(orient="records"),
    }))

# ── GET /model/info ───────────────────────────────────────────────────────────
@app.get("/model/info")
def model_info():
    model = get_model()
    if model is None:
        return {"status": "not_found"}
    meta = joblib.load(META_PKL) if META_PKL.exists() else {}
    return {"status": "loaded", "type": type(model).__name__, **meta}

# ── POST /refresh — reload cache ──────────────────────────────────────────────
@app.post("/refresh")
def refresh():
    invalidate_cache()
    return {"status": "cache cleared"}