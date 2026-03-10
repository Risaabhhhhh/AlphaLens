import pandas as pd
import yfinance as yf
import os

INPUT_FILE = "data/processed/news_features.csv"
OUTPUT_FILE = "data/processed/labeled_dataset.csv"


def get_24h_return(ticker):

    try:

        stock = yf.Ticker(ticker)

        df = stock.history(period="2d", interval="1h")

        if len(df) < 2:
            return None

        start_price = df["Close"].iloc[0]
        end_price = df["Close"].iloc[-1]

        return_pct = (end_price - start_price) / start_price

        return return_pct

    except Exception:
        return None


def label_dataset():

    df = pd.read_csv(INPUT_FILE)

    returns = []
    labels = []

    for _, row in df.iterrows():

        ticker = row["ticker"]

        if pd.isna(ticker):
            returns.append(None)
            labels.append(0)
            continue

        r = get_24h_return(ticker)

        returns.append(r)

        if r is None:
            labels.append(0)
        elif abs(r) > 0.02:
            labels.append(1)
        else:
            labels.append(0)

    df["return_24h"] = returns
    df["label"] = labels

    os.makedirs("data/processed", exist_ok=True)

    df.to_csv(OUTPUT_FILE, index=False)

    print("\nLabeled dataset saved:", OUTPUT_FILE)
    print("Rows:", len(df))


if __name__ == "__main__":
    label_dataset()