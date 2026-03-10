from transformers import pipeline

# load FinBERT model
sentiment_pipeline = pipeline(
    "sentiment-analysis",
    model="ProsusAI/finbert"
)


def analyze_sentiment(text):

    result = sentiment_pipeline(text)[0]

    label = result["label"]
    score = result["score"]

    return label, score


if __name__ == "__main__":

    headline = "Nvidia launches new AI chip for data centers"

    label, score = analyze_sentiment(headline)

    print("Headline:", headline)
    print("Sentiment:", label)
    print("Confidence:", score)