import os
import json
import glob
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AlphaLens API",
    description="Financial News Alpha Detection System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Path constants (matching YOUR repo structure) ─────────────────────────────
BASE_DIR        = Path(__file__).parent.parent.parent
DATA_DIR        = BASE_DIR / "data"
RAW_DIR         = DATA_DIR / "raw"
PROCESSED_DIR   = DATA_DIR / "processed"
MODEL_DIR       = DATA_DIR / "models"

LABELED_CSV     = PROCESSED_DIR / "labeled_dataset.csv"
FEATURES_CSV    = PROCESSED_DIR / "news_features.csv"
MODEL_PKL       = MODEL_DIR / "impact_model.pkl"


# ── Data loaders (cached in memory) ──────────────────────────────────────────
_cache = {}

def load_labeled() -> pd.DataFrame:
    if "labeled" not in _cache or _stale("labeled"):
        if LABELED_CSV.exists():
            df = pd.read_csv(LABELED_CSV)
            df.columns = [c.strip().lower() for c in df.columns]
            _cache["labeled"] = df
            _cache["labeled_ts"] = datetime.now()
        else:
            return pd.DataFrame()
    return _cache["labeled"]


def load_features() -> pd.DataFrame:
    if "features" not in _cache or _stale("features"):
        if FEATURES_CSV.exists():
            df = pd.read_csv(FEATURES_CSV)
            df.columns = [c.strip().lower() for c in df.columns]
            _cache["features"] = df
            _cache["features_ts"] = datetime.now()
        else:
            return pd.DataFrame()
    return _cache["features"]


def load_raw_news() -> list[dict]:
    """Load all raw JSON files from data/raw/"""
    articles = []
    for path in sorted(RAW_DIR.glob("news_*.json"), reverse=True)[:10]:
        try:
            with open(path) as f:
                data = json.load(f)
                if isinstance(data, list):
                    articles.extend(data)
                elif isinstance(data, dict):
                    articles.append(data)
        except Exception:
            pass
    return articles


def load_model():
    if "model" not in _cache:
        if MODEL_PKL.exists():
            _cache["model"] = joblib.load(MODEL_PKL)
        else:
            return None
    return _cache["model"]


def _stale(key: str, ttl_seconds: int = 60) -> bool:
    ts_key = f"{key}_ts"
    if ts_key not in _cache:
        return True
    return (datetime.now() - _cache[ts_key]).seconds > ttl_seconds


# ── Signal logic (matches your signal_generator.py) ──────────────────────────
def compute_signal(prob: float, sentiment: str) -> dict:
    if prob > 0.65:
        signal = "Bullish"
    elif prob < 0.35:
        signal = "Bearish"
    else:
        signal = "Neutral"
    confidence = abs(prob - 0.5) * 2
    return {"signal": signal, "confidence": round(confidence, 3)}


# ═══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded":    MODEL_PKL.exists(),
        "labeled_data":    LABELED_CSV.exists(),
        "features_data":   FEATURES_CSV.exists(),
        "raw_files":       len(list(RAW_DIR.glob("news_*.json"))) if RAW_DIR.exists() else 0,
    }


# ── POST /predict — single headline prediction ────────────────────────────────
class PredictRequest(BaseModel):
    headline: str
    ticker: Optional[str] = None
    source: Optional[str] = None


@app.post("/predict")
def predict(req: PredictRequest):
    """
    Run the full pipeline on a single headline.
    Returns: sentiment, event_type, impact_probability, signal
    """
    from src.preprocessing.entity_extractor import classify_event
    from src.models.sentiment_model       import analyze_sentiment

    # Sentiment
    sentiment_label, sentiment_score = analyze_sentiment(req.headline)

    # Event classification
    event_type = classify_event(req.headline)

    # Impact probability
    model = load_model()
    if model is not None:
        # Build feature row matching your feature builder output
        event_map = {"earnings":6,"acquisition":5,"product_launch":4,
                     "partnership":3,"lawsuit":5,"regulatory":5,"macro":4,"general":1}
        row = pd.DataFrame([{
            "sentiment_score":    sentiment_score,
            "confidence":         abs(sentiment_score),
            "importance":         event_map.get(event_type, 1) / 6.0,
            "event_type_encoded": event_map.get(event_type, 1),
        }])
        try:
            # Try predict with available columns
            prob = float(model.predict_proba(row)[:, 1][0])
        except Exception:
            prob = abs(sentiment_score) * 0.7
    else:
        prob = abs(sentiment_score) * 0.7

    sig = compute_signal(prob, sentiment_label)

    return {
        "headline":           req.headline,
        "ticker":             req.ticker,
        "sentiment":          sentiment_label,
        "sentiment_score":    round(sentiment_score, 4),
        "event_type":         event_type,
        "impact_probability": round(prob, 4),
        "signal":             sig["signal"],
        "confidence":         sig["confidence"],
    }


# ── GET /signals — all signals from labeled dataset ───────────────────────────
@app.get("/signals")
def get_signals(
    ticker: Optional[str] = Query(None),
    signal: Optional[str] = Query(None, description="Bullish | Bearish | Neutral"),
    limit:  int           = Query(50, le=500),
):
    df = load_labeled()
    if df.empty:
        return []

    # Compute signal column if not present
    if "signal" not in df.columns:
        if "impact_probability" in df.columns:
            df["signal"] = df["impact_probability"].apply(
                lambda p: "Bullish" if p > 0.65 else ("Bearish" if p < 0.35 else "Neutral")
            )
        elif "label" in df.columns:
            df["signal"] = df["label"].apply(lambda x: "Bullish" if x == 1 else "Neutral")

    # Normalize column names (your CSV may use slightly different names)
    col_map = {
        "return_24h": "price_return_24h",
        "sentiment_label": "sentiment",
    }
    df = df.rename(columns=col_map)

    # Filters
    if ticker:
        if "ticker" in df.columns:
            df = df[df["ticker"].str.upper() == ticker.upper()]
    if signal:
        if "signal" in df.columns:
            df = df[df["signal"].str.lower() == signal.lower()]

    # Sort by most recent if date column exists
    for date_col in ["published_at", "date", "timestamp"]:
        if date_col in df.columns:
            df = df.sort_values(date_col, ascending=False)
            break

    df = df.head(limit)

    # Fill NaN for JSON serialization
    df = df.where(pd.notnull(df), None)
    return df.to_dict(orient="records")


# ── GET /news — raw news from your JSON files ─────────────────────────────────
@app.get("/news")
def get_news(
    ticker: Optional[str] = Query(None),
    limit:  int           = Query(50, le=200),
):
    articles = load_raw_news()

    if ticker:
        articles = [
            a for a in articles
            if ticker.upper() in str(a.get("related", "")).upper()
            or ticker.upper() in str(a.get("ticker", "")).upper()
        ]

    articles = articles[:limit]

    # Normalize keys across different Finnhub response shapes
    normalized = []
    for a in articles:
        normalized.append({
            "headline":     a.get("headline", a.get("title", "")),
            "summary":      a.get("summary", a.get("description", "")),
            "source":       a.get("source", ""),
            "url":          a.get("url", ""),
            "ticker":       a.get("related", a.get("ticker", "")),
            "published_at": a.get("datetime", a.get("publishedAt", "")),
        })

    return normalized


# ── GET /company/{ticker} — per-ticker breakdown ──────────────────────────────
@app.get("/company/{ticker}")
def get_company(ticker: str):
    ticker = ticker.upper()
    df = load_labeled()
    if df.empty:
        raise HTTPException(status_code=404, detail="No data available")

    if "ticker" not in df.columns:
        raise HTTPException(status_code=404, detail="ticker column not found in dataset")

    sub = df[df["ticker"].str.upper() == ticker]
    if sub.empty:
        raise HTTPException(status_code=404, detail=f"No data for {ticker}")

    if "signal" not in sub.columns and "impact_probability" in sub.columns:
        sub = sub.copy()
        sub["signal"] = sub["impact_probability"].apply(
            lambda p: "Bullish" if p > 0.65 else ("Bearish" if p < 0.35 else "Neutral")
        )

    stats = {
        "ticker":        ticker,
        "total_articles": int(len(sub)),
        "avg_sentiment":  round(float(sub["sentiment_score"].mean()), 4) if "sentiment_score" in sub.columns else None,
        "avg_return_24h": round(float(sub["price_return_24h"].mean()), 4) if "price_return_24h" in sub.columns else
                          round(float(sub["return_24h"].mean()), 4) if "return_24h" in sub.columns else None,
        "move_rate":      round(float(sub["label"].mean()), 4) if "label" in sub.columns else None,
        "bullish_count":  int((sub["signal"] == "Bullish").sum()) if "signal" in sub.columns else 0,
        "bearish_count":  int((sub["signal"] == "Bearish").sum()) if "signal" in sub.columns else 0,
        "neutral_count":  int((sub["signal"] == "Neutral").sum()) if "signal" in sub.columns else 0,
    }

    recent = sub.where(pd.notnull(sub), None).head(10).to_dict(orient="records")

    return {"ticker": ticker, "stats": stats, "recent": recent}


# ── GET /summary — dashboard overview ────────────────────────────────────────
@app.get("/summary")
def get_summary():
    df = load_labeled()
    raw = load_raw_news()

    if df.empty:
        return {
            "total_articles": 0,
            "total_signals":  len(raw),
            "bullish":        0,
            "bearish":        0,
            "neutral":        0,
            "top_tickers":    [],
            "model_loaded":   MODEL_PKL.exists(),
        }

    if "signal" not in df.columns and "impact_probability" in df.columns:
        df["signal"] = df["impact_probability"].apply(
            lambda p: "Bullish" if p > 0.65 else ("Bearish" if p < 0.35 else "Neutral")
        )
    elif "signal" not in df.columns and "label" in df.columns:
        df["signal"] = df["label"].apply(lambda x: "Bullish" if x == 1 else "Neutral")

    top_tickers = []
    if "ticker" in df.columns:
        top = (
            df.groupby("ticker")
            .agg(count=("ticker", "count"))
            .sort_values("count", ascending=False)
            .head(8)
            .reset_index()
        )
        top_tickers = top.to_dict(orient="records")

    return {
        "total_articles": len(df),
        "total_raw_news": len(raw),
        "bullish":        int((df["signal"] == "Bullish").sum()) if "signal" in df.columns else 0,
        "bearish":        int((df["signal"] == "Bearish").sum()) if "signal" in df.columns else 0,
        "neutral":        int((df["signal"] == "Neutral").sum()) if "signal" in df.columns else 0,
        "avg_return_24h": round(float(df["price_return_24h"].mean()), 4)
                          if "price_return_24h" in df.columns else
                          round(float(df["return_24h"].mean()), 4)
                          if "return_24h" in df.columns else None,
        "top_tickers":    top_tickers,
        "model_loaded":   MODEL_PKL.exists(),
    }


# ── GET /model/info ───────────────────────────────────────────────────────────
@app.get("/model/info")
def model_info():
    model = load_model()
    if model is None:
        return {"status": "not_found", "message": "Run: python src/models/impact_model.py"}

    info = {
        "status":       "loaded",
        "model_type":   type(model).__name__,
        "model_path":   str(MODEL_PKL),
    }

    # XGBoost exposes feature importances
    if hasattr(model, "feature_importances_"):
        fi = {f"feature_{i}": round(float(v), 4)
              for i, v in enumerate(model.feature_importances_)}
        info["feature_importances"] = fi

    df = load_labeled()
    if not df.empty and "label" in df.columns:
        info["training_samples"] = len(df)
        info["positive_rate"]    = round(float(df["label"].mean()), 4)
