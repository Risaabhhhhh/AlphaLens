import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
import certifi
import urllib3
urllib3.disable_warnings()

# load environment variables
load_dotenv()

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")

NEWS_URL = "https://finnhub.io/api/v1/news"


def fetch_financial_news():
    params = {
        "category": "general",
        "token": FINNHUB_API_KEY
    }

    response = requests.get(NEWS_URL, params=params, verify=False)

    if response.status_code != 200:
        print("Error fetching news:", response.text)
        return

    news_data = response.json()

    # create filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    file_path = f"data/raw/news_{timestamp}.json"

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(news_data, f, indent=2)

    print(f"Saved {len(news_data)} articles to {file_path}")


if __name__ == "__main__":
    fetch_financial_news()