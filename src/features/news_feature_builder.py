import json
import os
import spacy
import pandas as pd

from src.utils.company_tickers import COMPANY_TICKERS
from src.models.sentiment_model import analyze_sentiment

# load NLP model
nlp = spacy.load("en_core_web_sm")

RAW_FOLDER = "data/raw"
OUTPUT_FILE = "data/processed/news_features.csv"


def build_dataset():

    files = [f for f in os.listdir(RAW_FOLDER) if f.startswith("news")]

    if not files:
        print("No news files found")
        return

    latest_file = sorted(files)[-1]

    print("Processing:", latest_file)

    with open(f"{RAW_FOLDER}/{latest_file}", "r", encoding="utf-8") as f:
        news_data = json.load(f)

    rows = []

    for article in news_data:

        headline = article.get("headline", "")
        source = article.get("source", "")

        doc = nlp(headline)

        companies = [ent.text for ent in doc.ents if ent.label_ == "ORG"]

        valid_companies = [c for c in companies if c in COMPANY_TICKERS]

        ticker = None
        company = None

        if valid_companies:
            company = valid_companies[0]
            ticker = COMPANY_TICKERS[company]

        # run FinBERT sentiment
        sentiment, confidence = analyze_sentiment(headline)

        rows.append({
            "headline": headline,
            "company": company,
            "ticker": ticker,
            "sentiment": sentiment,
            "confidence": confidence,
            "source": source
        })

    df = pd.DataFrame(rows)

    os.makedirs("data/processed", exist_ok=True)

    df.to_csv(OUTPUT_FILE, index=False)

    print("\nDataset saved:", OUTPUT_FILE)
    print("Rows:", len(df))


if __name__ == "__main__":
    build_dataset()