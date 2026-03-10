import json
import os
import spacy
import pandas as pd

from src.utils.company_tickers import COMPANY_TICKERS
from src.models.sentiment_model import analyze_sentiment
from src.utils.event_keywords import EVENT_KEYWORDS, EVENT_WEIGHTS


# load spaCy model
nlp = spacy.load("en_core_web_sm")

RAW_FOLDER = "data/raw"
OUTPUT_FILE = "data/processed/news_features.csv"


def detect_event_type(headline):
    """
    Detect event type based on keywords in the headline
    """

    headline_lower = headline.lower()

    for event, keywords in EVENT_KEYWORDS.items():
        for keyword in keywords:
            if keyword in headline_lower:
                return event

    return "general"


def build_dataset():

    # find latest news file
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

        if not headline:
            continue

        # spaCy entity detection
        doc = nlp(headline)

        companies = [ent.text for ent in doc.ents if ent.label_ == "ORG"]
        valid_companies = [c for c in companies if c in COMPANY_TICKERS]

        company = None
        ticker = None

        if valid_companies:
            company = valid_companies[0]
            ticker = COMPANY_TICKERS[company]

        # sentiment analysis (FinBERT)
        sentiment, confidence = analyze_sentiment(headline)

        # event detection
        event_type = detect_event_type(headline)
        importance = EVENT_WEIGHTS.get(event_type, 0.3)

        rows.append({
            "headline": headline,
            "company": company,
            "ticker": ticker,
            "sentiment": sentiment,
            "confidence": confidence,
            "event_type": event_type,
            "importance": importance,
            "source": source
        })

    # convert to dataframe
    df = pd.DataFrame(rows)

    os.makedirs("data/processed", exist_ok=True)

    df.to_csv(OUTPUT_FILE, index=False)

    print("\nDataset saved:", OUTPUT_FILE)
    print("Rows:", len(df))


if __name__ == "__main__":
    build_dataset()