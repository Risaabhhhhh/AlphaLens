import pandas as pd
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier


INPUT_FILE = "data/processed/labeled_dataset.csv"
MODEL_PATH = "data/models/impact_model.pkl"


def train_model():

    print("Loading dataset...")

    df = pd.read_csv(INPUT_FILE)

    # drop rows without ticker
    df = df.dropna(subset=["ticker"])

    # encode categorical features
    sentiment_encoder = LabelEncoder()
    event_encoder = LabelEncoder()

    df["sentiment_encoded"] = sentiment_encoder.fit_transform(df["sentiment"])
    df["event_encoded"] = event_encoder.fit_transform(df["event_type"])

    # feature columns
    features = [
        "sentiment_encoded",
        "confidence",
        "importance",
        "event_encoded"
    ]

    X = df[features]
    y = df["label"]

    print("Splitting dataset...")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42
    )

    print("Training XGBoost model...")

    model = XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        eval_metric="logloss"
    )

    model.fit(X_train, y_train)

    print("Evaluating model...")

    predictions = model.predict(X_test)

    print("\nClassification Report:\n")
    print(classification_report(y_test, predictions))

    os.makedirs("data/models", exist_ok=True)

    joblib.dump(model, MODEL_PATH)

    print("\nModel saved to:", MODEL_PATH)


if __name__ == "__main__":
    train_model()