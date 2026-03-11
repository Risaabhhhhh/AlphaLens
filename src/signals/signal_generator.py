import pandas as pd
from src.models.impact_model import predict_impact


BULLISH_THRESHOLD = 0.65
BEARISH_THRESHOLD = 0.35


def generate_signal(row):

    probability = predict_impact(row)

    if probability >= BULLISH_THRESHOLD:
        signal = "bullish"

    elif probability <= BEARISH_THRESHOLD:
        signal = "bearish"

    else:
        signal = "neutral"

    return {
        "probability": probability,
        "signal": signal
    }


def run_signal_generation(input_file="data/processed/news_features.csv"):

    df = pd.read_csv(input_file)

    signals = []

    for _, row in df.iterrows():

        result = generate_signal(row.to_dict())

        signals.append(result["signal"])

    df["signal"] = signals

    print(df[["headline", "ticker", "signal"]].head(10))


if __name__ == "__main__":
    run_signal_generation()