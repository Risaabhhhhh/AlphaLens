📊 AlphaLens — Financial News Intelligence Platform

AlphaLens is an AI-powered platform that analyzes financial news in real time and predicts potential stock market impact using NLP and Machine Learning.

The system ingests financial news, extracts companies and events, performs sentiment analysis using FinBERT, and predicts whether the news will cause a significant stock move using an XGBoost model.

The platform provides signals through a FastAPI backend and visualizes them in a React dashboard.

🚀 Features
📰 News Intelligence

Fetches live financial news via Finnhub API

Identifies companies mentioned in headlines using spaCy NER

Extracts event types (earnings, acquisition, regulatory, macro)

🤖 NLP Sentiment Analysis

Uses FinBERT for financial sentiment classification

Outputs:

Positive

Neutral

Negative

Confidence score

📈 Market Impact Prediction

Trains an XGBoost classifier to predict if a stock will move significantly after news.

Features include:

Sentiment score

Event type

Source credibility

Headline length

Sentiment-event interaction

⚡ Signal Generation

Each news article is converted into a trading signal:

Bullish
Bearish
Neutral

with model confidence.

📊 Interactive Dashboard

React dashboard displaying:

Market sentiment distribution

Top signals

Active tickers

Raw news feed

Signal filtering by ticker or sentiment

🏗️ System Architecture
Financial News
      │
      ▼
Finnhub API
      │
      ▼
Data Ingestion Pipeline
      │
      ▼
spaCy NER + Event Detection
      │
      ▼
FinBERT Sentiment Analysis
      │
      ▼
Feature Engineering
      │
      ▼
XGBoost Impact Model
      │
      ▼
Signal Generator
      │
      ▼
FastAPI Backend
      │
      ▼
React Dashboard
🧠 Machine Learning Pipeline
NLP

FinBERT — financial sentiment analysis

spaCy — company entity recognition

Model

XGBoost Classifier

Target variable:

Did stock move > 2% within 24 hours of the news?

Output:

Probability of market impact
📂 Project Structure
AlphaLens
│
├── src
│   ├── ingestion        # news collection
│   ├── preprocessing    # text cleaning + NER
│   ├── features         # dataset building
│   ├── models           # ML models
│   ├── signals          # signal generator
│   └── api              # FastAPI backend
│
├── frontend             # React dashboard
├── data                 # datasets
├── config               # configuration files
├── scripts              # helper scripts
│
├── bulk_collect.py      # large scale dataset builder
├── docker-compose.yml
├── Dockerfile.api
└── requirements.txt
⚙️ Installation
1️⃣ Clone the repo
git clone https://github.com/YOUR_USERNAME/AlphaLens.git
cd AlphaLens
2️⃣ Create environment
python -m venv venv
source venv/bin/activate

Windows:

venv\Scripts\activate
3️⃣ Install dependencies
pip install -r requirements.txt
4️⃣ Install NLP models
python -m spacy download en_core_web_sm
🔑 Environment Variables

Create .env

FINNHUB_API_KEY=your_api_key_here

Get API key:

https://finnhub.io

▶️ Run the Backend
uvicorn src.api.main:app --reload

Backend runs at:

http://localhost:8000
💻 Run the Frontend
cd frontend
npm install
npm start

Dashboard runs at:

http://localhost:3000
📊 Example Output

Example signal:

Headline:
"Nvidia launches next generation AI chip"

Sentiment:
Positive

Predicted Impact:
0.71

Signal:
Bullish
🐳 Docker Deployment
docker-compose up --build

Runs:

FastAPI backend
React frontend
📈 Future Improvements

Real-time streaming pipeline

Portfolio tracking

Market backtesting engine

Reinforcement learning signal optimization

Mobile dashboard

👨‍💻 Author

Built by:

Rishabh

Full Stack Developer | ML Engineer

⭐ If you like this project

Give the repo a ⭐ on GitHub.
