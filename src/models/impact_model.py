import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

INPUT_FILE = "data/processed/labeled_dataset.csv"
MODEL_PATH = "data/models/impact_model.pkl"

SENTIMENT_MAP = {
    # FinBERT labels
    "negative": 0, "neutral": 1, "positive": 2,
    # Alpha Vantage labels
    "Bearish": 0, "Somewhat-Bearish": 0,
    "Neutral": 1,
    "Somewhat-Bullish": 2, "Bullish": 2,
}

# Numeric score for richer signal (-1 to +1)
SENTIMENT_SCORE_MAP = {
    "negative": -1.0,  "neutral": 0.0,   "positive": 1.0,
    "Bearish": -1.0,   "Somewhat-Bearish": -0.5,
    "Neutral": 0.0,
    "Somewhat-Bullish": 0.5, "Bullish": 1.0,
}

EVENT_MAP = {"earnings": 0, "acquisition": 1, "product_launch": 2,
             "partnership": 3, "lawsuit": 4, "regulatory": 5,
             "macro": 6, "general": 7}

SOURCE_SCORES = {"reuters": 1.0, "bloomberg": 1.0, "wsj": 0.95,
                 "cnbc": 0.85, "marketwatch": 0.80, "seekingalpha": 0.70,
                 "benzinga": 0.70, "yahoo": 0.75, "motley fool": 0.65}

FEATURES = [
    "sentiment_encoded",
    "sentiment_score",     # numeric -1 to +1 (more informative than label)
    "event_encoded",
    "confidence",
    "importance",
    "headline_len",
    "source_score",
    "sentiment_x_event",
]


# ── Helpers ───────────────────────────────────────────────────────────────────
def _source_score(s: str) -> float:
    if not s:
        return 0.5
    s = s.lower()
    for k, v in SOURCE_SCORES.items():
        if k in s:
            return v
    return 0.5


def _build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Build feature matrix from a DataFrame. Works for training + inference."""
    df = df.copy()
    df.columns = [c.strip().lower() for c in df.columns]

    # ── Sentiment encoding — merge FinBERT + Alpha Vantage ───────────────────
    # Priority: use FinBERT 'sentiment' if available, else 'av_sentiment'
    if "sentiment" in df.columns and "av_sentiment" in df.columns:
        # Merge: prefer FinBERT where it exists, fall back to AV
        merged = df["sentiment"].combine_first(df["av_sentiment"])
    elif "sentiment" in df.columns:
        merged = df["sentiment"]
    elif "av_sentiment" in df.columns:
        merged = df["av_sentiment"]
    else:
        merged = pd.Series(["neutral"] * len(df))

    df["sentiment_encoded"] = merged.map(SENTIMENT_MAP).fillna(1)
    df["sentiment_score"]   = merged.map(SENTIMENT_SCORE_MAP).fillna(0.0)

    # ── Event encoding ────────────────────────────────────────────────────────
    if "event_type" in df.columns:
        df["event_encoded"] = df["event_type"].map(EVENT_MAP).fillna(7)
    else:
        df["event_encoded"] = 7

    # ── Confidence (use av_score if confidence missing) ───────────────────────
    if "confidence" not in df.columns:
        if "av_score" in df.columns:
            df["confidence"] = df["av_score"].abs()
        else:
            df["confidence"] = 0.5

    # ── Importance ────────────────────────────────────────────────────────────
    if "importance" not in df.columns:
        df["importance"] = 0.3

    # ── Extra features ────────────────────────────────────────────────────────
    df["headline_len"]      = df.get("headline", pd.Series([""] * len(df))).str.len().fillna(0)
    df["source_score"]      = df.get("source",   pd.Series([""] * len(df))).apply(_source_score)
    df["sentiment_x_event"] = df["sentiment_score"] * df["importance"]  # numeric × importance

    return df[FEATURES].fillna(0)


# ── Load model ────────────────────────────────────────────────────────────────
def load_model():
    if not os.path.exists(MODEL_PATH):
        raise Exception("Model not trained yet. Run: python src/models/impact_model.py")
    return joblib.load(MODEL_PATH)


# ── Predict ───────────────────────────────────────────────────────────────────
def predict_impact(row: dict) -> float:
    """
    Pass a dict with any of: sentiment, event_type, confidence, importance, source
    Returns float 0.0–1.0 = probability of >2% price move
    """
    model = load_model()
    df    = pd.DataFrame([row])
    X     = _build_features(df)
    return round(float(model.predict_proba(X)[0][1]), 4)


# ── Train ─────────────────────────────────────────────────────────────────────
def train_model():
    print("\n" + "=" * 52)
    print("  AlphaLens — Impact Model Training")
    print("=" * 52)

    # ── Load ──────────────────────────────────────────────────────────────────
    print("\nLoading dataset...")
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Not found: {INPUT_FILE}")
        print("   Run bulk_collect_v3.py first.")
        return

    df = pd.read_csv(INPUT_FILE)
    df.columns = [c.strip().lower() for c in df.columns]
    print(f"   Loaded {len(df)} rows | Columns: {df.columns.tolist()}")

    # ── Fix return column name ────────────────────────────────────────────────
    if "return_24h" in df.columns and "label" not in df.columns:
        df["label"] = (df["return_24h"].abs() > 0.02).astype(int)
    if "price_return_24h" in df.columns and "label" not in df.columns:
        df["label"] = (df["price_return_24h"].abs() > 0.02).astype(int)

    df = df.dropna(subset=["label"])

    # ── Class distribution ────────────────────────────────────────────────────
    pos  = int(df["label"].sum())
    neg  = len(df) - pos
    rate = df["label"].mean()
    print(f"\n   Label=0 (flat):     {neg:>4} rows  ({1-rate:.1%})")
    print(f"   Label=1 (moved>2%): {pos:>4} rows  ({rate:.1%})")

    if len(df) < 50:
        print(f"\n❌ Only {len(df)} rows — need 50+. Run bulk_collect_v3.py first.")
        return

    # ── Features ──────────────────────────────────────────────────────────────
    print("\nBuilding features...")
    X = _build_features(df)
    y = df["label"]
    print(f"   Features: {FEATURES}")

    # ── Split ─────────────────────────────────────────────────────────────────
    print("\nSplitting dataset...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"   Train: {len(X_train)} | Test: {len(X_test)}")

    # ── Train ─────────────────────────────────────────────────────────────────
    # scale_pos_weight fixes the class imbalance problem
    scale = neg / pos if pos > 0 else 1.0
    print(f"\nTraining XGBoost model...")
    print(f"   scale_pos_weight = {scale:.1f}  (fixes class imbalance)")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=2,
        scale_pos_weight=scale,   # ← THE KEY FIX
        eval_metric="auc",
        random_state=42,
        verbosity=0,
    )

    # Cross-validation (5-fold)
    cv       = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_aucs  = cross_val_score(model, X_train, y_train, cv=cv, scoring="roc_auc")
    print(f"   Cross-val AUC: {cv_aucs.mean():.3f} ± {cv_aucs.std():.3f}")

    model.fit(X_train, y_train)

    # ── Evaluate ──────────────────────────────────────────────────────────────
    print("\nEvaluating model...")
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    auc    = roc_auc_score(y_test, y_prob)

    print(f"\n{'='*52}")
    print(f"  Test ROC-AUC : {auc:.3f}")
    if   auc >= 0.70: print("  Verdict      : 🟢 STRONG")
    elif auc >= 0.60: print("  Verdict      : 🟡 DECENT — collect more data")
    else:             print("  Verdict      : 🔴 WEAK   — need more data")
    print(f"{'='*52}\n")

    print("Classification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # ── Feature importance ────────────────────────────────────────────────────
    fi = pd.Series(model.feature_importances_, index=FEATURES).sort_values(ascending=False)
    print("\nFeature Importance:")
    for feat, score in fi.items():
        bar = "█" * int(score * 40)
        print(f"  {feat:<25} {bar:<20} {score:.4f}")

    # ── Save ──────────────────────────────────────────────────────────────────
    os.makedirs("data/models", exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    meta = {
        "n_samples":          len(df),
        "cv_auc_mean":        round(float(cv_aucs.mean()), 4),
        "cv_auc_std":         round(float(cv_aucs.std()),  4),
        "test_auc":           round(float(auc), 4),
        "positive_rate":      round(float(rate), 4),
        "features":           FEATURES,
        "feature_importance": fi.round(4).to_dict(),
    }
    joblib.dump(meta, "data/models/model_meta.pkl")
    print(f"\n✅ Model saved to: {MODEL_PATH}")


if __name__ == "__main__":
    train_model()