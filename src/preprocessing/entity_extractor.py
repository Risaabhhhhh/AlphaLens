import json
import spacy
import os
from src.utils.company_tickers import COMPANY_TICKERS

# load spaCy model
nlp = spacy.load("en_core_web_sm")

DATA_FOLDER = "data/raw"


def extract_entities_from_news():

    files = [f for f in os.listdir(DATA_FOLDER) if f.startswith("news")]

    if not files:
        print("No news files found")
        return

    latest_file = sorted(files)[-1]

    print("Processing:", latest_file)

    with open(f"{DATA_FOLDER}/{latest_file}", "r", encoding="utf-8") as f:
        news_data = json.load(f)

    for article in news_data[:10]:

        headline = article.get("headline", "")

        doc = nlp(headline)

        # detect organizations
        companies = [ent.text for ent in doc.ents if ent.label_ == "ORG"]

        # keep only companies we track
        valid_companies = [c for c in companies if c in COMPANY_TICKERS]

        print("\nHeadline:", headline)

        if valid_companies:
            company = valid_companies[0]
            ticker = COMPANY_TICKERS[company]

            print("Company:", company)
            print("Ticker:", ticker)
        else:
            print("No tracked company detected")


if __name__ == "__main__":
    extract_entities_from_news()