# AlphaLens — Phase 9 + 10

FastAPI backend + React dashboard wired to YOUR existing CSV files and model.

## Your repo structure this targets

```
AlphaLens/
├── data/
│   ├── models/impact_model.pkl       ← your trained model
│   ├── processed/
│   │   ├── labeled_dataset.csv       ← used by /signals
│   │   └── news_features.csv         ← used by /news features
│   └── raw/
│       └── news_*.json               ← used by /news
├── src/
│   ├── api/main.py                   ← REPLACE with this
│   ├── preprocessing/entity_extractor.py
│   └── models/sentiment_model.py
└── frontend/                         ← ADD this entire folder
```

## Integration Steps

### 1. Replace your API
```bash
# From your AlphaLens/ root
cp path/to/new/src/api/main.py  src/api/main.py
```

### 2. Add the frontend
```bash
# Copy the entire frontend/ folder into your repo
cp -r path/to/new/frontend/  ./frontend/
```

### 3. Update docker-compose.yml
```bash
cp path/to/new/docker-compose.yml  ./docker-compose.yml
```

### 4. Launch
```bash
docker-compose up --build
```

Open:
- Dashboard → http://localhost:3000
- API docs  → http://localhost:8000/docs
- Health    → http://localhost:8000/health

## API Endpoints

| Method | Endpoint         | Description                            |
|--------|-----------------|----------------------------------------|
| GET    | /health          | Status + file checks                   |
| POST   | /predict         | Single headline → signal               |
| GET    | /signals         | All signals from labeled_dataset.csv   |
| GET    | /signals?ticker=NVDA | Filter by ticker                   |
| GET    | /signals?signal=Bullish | Filter by signal type           |
| GET    | /news            | Raw news from JSON files               |
| GET    | /company/{TICKER} | Per-ticker breakdown + stats          |
| GET    | /summary         | Dashboard overview stats               |
| GET    | /model/info      | Model metadata + feature importance    |

## POST /predict example

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"headline": "Nvidia announces new AI chip", "ticker": "NVDA"}'
```

Response:
```json
{
  "headline": "Nvidia announces new AI chip",
  "ticker": "NVDA",
  "sentiment": "positive",
  "sentiment_score": 0.82,
  "event_type": "product_launch",
  "impact_probability": 0.71,
  "signal": "Bullish",
  "confidence": 0.42
}
```

## Dashboard Features

- Live signal feed from your labeled_dataset.csv
- Filter by Bullish / Bearish / Neutral
- Filter by ticker (AAPL, NVDA, MSFT...)
- Signal distribution pie chart
- Top tickers bar chart
- Model status panel
- ⚡ Live PREDICT button — type any headline → instant signal
- Raw news tab from your JSON files
- Auto-refreshes every 30 seconds