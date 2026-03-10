import yfinance as yf

def fetch_stock_data(ticker="AAPL"):

    stock = yf.Ticker(ticker)

    df = stock.history(period="5d", interval="1h")

    df.to_csv(f"data/raw/{ticker}_prices.csv")

    print(f"Saved price data for {ticker}")


if __name__ == "__main__":
    fetch_stock_data()