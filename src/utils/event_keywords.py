EVENT_KEYWORDS = {
    "earnings": ["earnings", "revenue", "profit", "guidance"],
    "product_launch": ["launch", "unveil", "release", "announce"],
    "acquisition": ["acquire", "acquisition", "merger", "buy"],
    "lawsuit": ["lawsuit", "sue", "court", "legal"],
    "partnership": ["partnership", "collaboration", "deal"],
    "macro": ["inflation", "interest rate", "oil", "war"]
}

EVENT_WEIGHTS = {
    "earnings": 1.0,
    "acquisition": 0.9,
    "product_launch": 0.7,
    "lawsuit": 0.6,
    "partnership": 0.5,
    "macro": 0.4
}