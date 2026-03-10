"""
main.py  –  FastAPI backend for Alpha Detector
"""
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from src.utils.helpers import get_env, CONFIG

app = FastAPI(title="Financial News Alpha Detector API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = create_engine(get_env("DATABASE_URL"))


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "version": CONFIG["app"]["version"]}


# ── News ──────────────────────────────────────────────────────────────────────
@app.get("/news")
def get_news(
    ticker: Optional[str] = None,
    limit: int = Query(50, le=200),
):
    q = """
        SELECT na.id, na.headline, na.summary, na.source,
               na.url, na.ticker, na.published_at,
               nr.sentiment, nr.sentiment_score, nr.event_type
        FROM news_articles na
        LEFT JOIN nlp_results nr ON nr.article_id = na.id
        {where}
        ORDER BY na.published_at DESC
        LIMIT :limit
    """
    where = "WHERE na.ticker = :ticker" if ticker else ""
    params = {"limit": limit}
    if ticker:
        params["ticker"] = ticker.upper()

    with engine.connect() as conn:
        rows = conn.execute(text(q.format(where=where)), params).mappings().fetchall()

    return [dict(r) for r in rows]


# ── Signals ───────────────────────────────────────────────────────────────────
@app.get("/signals")
def get_signals(
    ticker: Optional[str] = None,
    signal_type: Optional[str] = None,
    limit: int = Query(50, le=200),
):
    conditions = []
    params: dict = {"limit": limit}

    if ticker:
        conditions.append("s.ticker = :ticker")
        params["ticker"] = ticker.upper()
    if signal_type:
        conditions.append("s.signal = :signal")
        params["signal"] = signal_type.capitalize()

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    q = f"""
        SELECT s.id, s.ticker, s.signal, s.confidence,
               s.sentiment_score, s.event_weight,
               s.model_prob, s.signal_score,
               s.created_at,
               na.headline, na.source, na.url
        FROM signals s
        JOIN news_articles na ON na.id = s.article_id
        {where}
        ORDER BY s.created_at DESC
        LIMIT :limit
    """

    with engine.connect() as conn:
        rows = conn.execute(text(q), params).mappings().fetchall()

    return [dict(r) for r in rows]


# ── Company ───────────────────────────────────────────────────────────────────
@app.get("/company/{ticker}")
def get_company(ticker: str):
    ticker = ticker.upper()
    with engine.connect() as conn:
        # Latest 10 signals
        signals = conn.execute(
            text("""
                SELECT s.signal, s.confidence, s.signal_score,
                       s.sentiment_score, s.created_at,
                       na.headline, na.source
                FROM signals s
                JOIN news_articles na ON na.id = s.article_id
                WHERE s.ticker = :t
                ORDER BY s.created_at DESC
                LIMIT 10
            """),
            {"t": ticker},
        ).mappings().fetchall()

        # Aggregate stats
        stats = conn.execute(
            text("""
                SELECT
                    COUNT(*) AS total_signals,
                    AVG(signal_score) AS avg_score,
                    SUM(CASE WHEN signal = 'Bullish' THEN 1 ELSE 0 END) AS bullish_count,
                    SUM(CASE WHEN signal = 'Bearish' THEN 1 ELSE 0 END) AS bearish_count,
                    SUM(CASE WHEN signal = 'Neutral' THEN 1 ELSE 0 END) AS neutral_count
                FROM signals WHERE ticker = :t
            """),
            {"t": ticker},
        ).mappings().fetchone()

    return {
        "ticker": ticker,
        "stats": dict(stats) if stats else {},
        "recent_signals": [dict(r) for r in signals],
    }


# ── Dashboard summary ─────────────────────────────────────────────────────────
@app.get("/summary")
def get_summary():
    with engine.connect() as conn:
        row = conn.execute(
            text("""
                SELECT
                    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24h') AS signals_24h,
                    COUNT(*) FILTER (WHERE signal = 'Bullish' AND created_at > NOW() - INTERVAL '24h') AS bullish_24h,
                    COUNT(*) FILTER (WHERE signal = 'Bearish' AND created_at > NOW() - INTERVAL '24h') AS bearish_24h
                FROM signals
            """)
        ).mappings().fetchone()
        top = conn.execute(
            text("""
                SELECT ticker, COUNT(*) AS signal_count, AVG(signal_score) AS avg_score
                FROM signals
                WHERE created_at > NOW() - INTERVAL '24h'
                GROUP BY ticker
                ORDER BY signal_count DESC
                LIMIT 5
            """)
        ).mappings().fetchall()

    return {
        "summary": dict(row) if row else {},
        "top_tickers": [dict(r) for r in top],
    }