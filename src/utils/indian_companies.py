# src/utils/indian_companies.py
# ─────────────────────────────────────────────────────────────────────────────
# 100 NSE-listed Indian companies with Yahoo Finance tickers (.NS suffix)
# Used by bulk collector, signal generator, and dashboard watchlist
# ─────────────────────────────────────────────────────────────────────────────

INDIAN_COMPANIES = {
    # ── Large Cap / Nifty 50 ─────────────────────────────────────────────────
    "RELIANCE.NS":  {"name": "Reliance Industries",      "sector": "Energy",       "index": "NIFTY50"},
    "TCS.NS":       {"name": "Tata Consultancy Services","sector": "IT",           "index": "NIFTY50"},
    "HDFCBANK.NS":  {"name": "HDFC Bank",                "sector": "Banking",      "index": "NIFTY50"},
    "INFY.NS":      {"name": "Infosys",                  "sector": "IT",           "index": "NIFTY50"},
    "ICICIBANK.NS": {"name": "ICICI Bank",               "sector": "Banking",      "index": "NIFTY50"},
    "HINDUNILVR.NS":{"name": "Hindustan Unilever",       "sector": "FMCG",         "index": "NIFTY50"},
    "ITC.NS":       {"name": "ITC Limited",              "sector": "FMCG",         "index": "NIFTY50"},
    "SBIN.NS":      {"name": "State Bank of India",      "sector": "Banking",      "index": "NIFTY50"},
    "BHARTIARTL.NS":{"name": "Bharti Airtel",            "sector": "Telecom",      "index": "NIFTY50"},
    "KOTAKBANK.NS": {"name": "Kotak Mahindra Bank",      "sector": "Banking",      "index": "NIFTY50"},
    "LT.NS":        {"name": "Larsen & Toubro",          "sector": "Construction", "index": "NIFTY50"},
    "AXISBANK.NS":  {"name": "Axis Bank",                "sector": "Banking",      "index": "NIFTY50"},
    "ASIANPAINT.NS":{"name": "Asian Paints",             "sector": "Chemicals",    "index": "NIFTY50"},
    "MARUTI.NS":    {"name": "Maruti Suzuki",            "sector": "Auto",         "index": "NIFTY50"},
    "SUNPHARMA.NS": {"name": "Sun Pharmaceutical",       "sector": "Pharma",       "index": "NIFTY50"},
    "WIPRO.NS":     {"name": "Wipro",                    "sector": "IT",           "index": "NIFTY50"},
    "ULTRACEMCO.NS":{"name": "UltraTech Cement",         "sector": "Cement",       "index": "NIFTY50"},
    "BAJFINANCE.NS":{"name": "Bajaj Finance",            "sector": "Finance",      "index": "NIFTY50"},
    "NESTLEIND.NS": {"name": "Nestle India",             "sector": "FMCG",         "index": "NIFTY50"},
    "TITAN.NS":     {"name": "Titan Company",            "sector": "Consumer",     "index": "NIFTY50"},
    "POWERGRID.NS": {"name": "Power Grid Corporation",   "sector": "Utilities",    "index": "NIFTY50"},
    "NTPC.NS":      {"name": "NTPC",                     "sector": "Utilities",    "index": "NIFTY50"},
    "ONGC.NS":      {"name": "Oil & Natural Gas Corp",   "sector": "Energy",       "index": "NIFTY50"},
    "HCLTECH.NS":   {"name": "HCL Technologies",         "sector": "IT",           "index": "NIFTY50"},
    "TECHM.NS":     {"name": "Tech Mahindra",            "sector": "IT",           "index": "NIFTY50"},
    "GRASIM.NS":    {"name": "Grasim Industries",        "sector": "Diversified",  "index": "NIFTY50"},
    "ADANIENT.NS":  {"name": "Adani Enterprises",        "sector": "Diversified",  "index": "NIFTY50"},
    "ADANIPORTS.NS":{"name": "Adani Ports",              "sector": "Infrastructure","index": "NIFTY50"},
    "COALINDIA.NS": {"name": "Coal India",               "sector": "Mining",       "index": "NIFTY50"},
    "JSWSTEEL.NS":  {"name": "JSW Steel",                "sector": "Metals",       "index": "NIFTY50"},
    "TATASTEEL.NS": {"name": "Tata Steel",               "sector": "Metals",       "index": "NIFTY50"},
    "TATAMOTORS.NS":{"name": "Tata Motors",              "sector": "Auto",         "index": "NIFTY50"},
    "M&M.NS":       {"name": "Mahindra & Mahindra",      "sector": "Auto",         "index": "NIFTY50"},
    "BAJAJFINSV.NS":{"name": "Bajaj Finserv",            "sector": "Finance",      "index": "NIFTY50"},
    "BPCL.NS":      {"name": "Bharat Petroleum",         "sector": "Energy",       "index": "NIFTY50"},
    "HEROMOTOCO.NS":{"name": "Hero MotoCorp",            "sector": "Auto",         "index": "NIFTY50"},
    "BRITANNIA.NS": {"name": "Britannia Industries",     "sector": "FMCG",         "index": "NIFTY50"},
    "CIPLA.NS":     {"name": "Cipla",                    "sector": "Pharma",       "index": "NIFTY50"},
    "DRREDDY.NS":   {"name": "Dr. Reddy's Laboratories", "sector": "Pharma",       "index": "NIFTY50"},
    "EICHERMOT.NS": {"name": "Eicher Motors",            "sector": "Auto",         "index": "NIFTY50"},
    "HINDALCO.NS":  {"name": "Hindalco Industries",      "sector": "Metals",       "index": "NIFTY50"},
    "INDUSINDBK.NS":{"name": "IndusInd Bank",            "sector": "Banking",      "index": "NIFTY50"},
    "SBILIFE.NS":   {"name": "SBI Life Insurance",       "sector": "Insurance",    "index": "NIFTY50"},
    "HDFCLIFE.NS":  {"name": "HDFC Life Insurance",      "sector": "Insurance",    "index": "NIFTY50"},
    "APOLLOHOSP.NS":{"name": "Apollo Hospitals",         "sector": "Healthcare",   "index": "NIFTY50"},
    "DIVISLAB.NS":  {"name": "Divi's Laboratories",      "sector": "Pharma",       "index": "NIFTY50"},

    # ── Nifty Next 50 / Mid Cap ──────────────────────────────────────────────
    "ZOMATO.NS":    {"name": "Zomato",                   "sector": "Internet",     "index": "NIFTYNEXT50"},
    "PAYTM.NS":     {"name": "Paytm (One97 Comm.)",      "sector": "Fintech",      "index": "NIFTYNEXT50"},
    "NYKAA.NS":     {"name": "Nykaa (FSN E-Commerce)",   "sector": "E-Commerce",   "index": "NIFTYNEXT50"},
    "DMART.NS":     {"name": "Avenue Supermarts (DMart)", "sector": "Retail",      "index": "NIFTYNEXT50"},
    "PIDILITIND.NS":{"name": "Pidilite Industries",      "sector": "Chemicals",    "index": "NIFTYNEXT50"},
    "SIEMENS.NS":   {"name": "Siemens India",            "sector": "Industrial",   "index": "NIFTYNEXT50"},
    "HAVELLS.NS":   {"name": "Havells India",            "sector": "Consumer Elec","index": "NIFTYNEXT50"},
    "BERGEPAINT.NS":{"name": "Berger Paints",            "sector": "Chemicals",    "index": "NIFTYNEXT50"},
    "COLPAL.NS":    {"name": "Colgate-Palmolive India",  "sector": "FMCG",         "index": "NIFTYNEXT50"},
    "MCDOWELL-N.NS":{"name": "United Spirits (McDowell)","sector": "Beverages",    "index": "NIFTYNEXT50"},
    "GODREJCP.NS":  {"name": "Godrej Consumer Products", "sector": "FMCG",         "index": "NIFTYNEXT50"},
    "DABUR.NS":     {"name": "Dabur India",              "sector": "FMCG",         "index": "NIFTYNEXT50"},
    "MARICO.NS":    {"name": "Marico",                   "sector": "FMCG",         "index": "NIFTYNEXT50"},
    "EMAMILTD.NS":  {"name": "Emami",                    "sector": "FMCG",         "index": "NIFTYNEXT50"},
    "MUTHOOTFIN.NS":{"name": "Muthoot Finance",          "sector": "Finance",      "index": "NIFTYNEXT50"},
    "CHOLAFIN.NS":  {"name": "Cholamandalam Finance",    "sector": "Finance",      "index": "NIFTYNEXT50"},
    "SHRIRAMFIN.NS":{"name": "Shriram Finance",          "sector": "Finance",      "index": "NIFTYNEXT50"},
    "BAJAJ-AUTO.NS":{"name": "Bajaj Auto",               "sector": "Auto",         "index": "NIFTYNEXT50"},
    "TVSMOTOR.NS":  {"name": "TVS Motor",                "sector": "Auto",         "index": "NIFTYNEXT50"},
    "BALKRISIND.NS":{"name": "Balkrishna Industries",    "sector": "Auto",         "index": "NIFTYNEXT50"},
    "MPHASIS.NS":   {"name": "Mphasis",                  "sector": "IT",           "index": "NIFTYNEXT50"},
    "LTIM.NS":      {"name": "LTIMindtree",              "sector": "IT",           "index": "NIFTYNEXT50"},
    "PERSISTENT.NS":{"name": "Persistent Systems",       "sector": "IT",           "index": "NIFTYNEXT50"},
    "COFORGE.NS":   {"name": "Coforge",                  "sector": "IT",           "index": "NIFTYNEXT50"},
    "TATACONSUM.NS":{"name": "Tata Consumer Products",   "sector": "FMCG",         "index": "NIFTYNEXT50"},
    "TATACOMM.NS":  {"name": "Tata Communications",      "sector": "Telecom",      "index": "NIFTYNEXT50"},
    "INDIGO.NS":    {"name": "IndiGo (InterGlobe Avn.)", "sector": "Aviation",     "index": "NIFTYNEXT50"},
    "IRCTC.NS":     {"name": "IRCTC",                    "sector": "Travel",       "index": "NIFTYNEXT50"},
    "IRFC.NS":      {"name": "IRFC",                     "sector": "Finance",      "index": "NIFTYNEXT50"},
    "HAL.NS":       {"name": "Hindustan Aeronautics",    "sector": "Defence",      "index": "NIFTYNEXT50"},
    "BEL.NS":       {"name": "Bharat Electronics",       "sector": "Defence",      "index": "NIFTYNEXT50"},
    "BHEL.NS":      {"name": "BHEL",                     "sector": "Industrial",   "index": "NIFTYNEXT50"},
    "ABB.NS":       {"name": "ABB India",                "sector": "Industrial",   "index": "NIFTYNEXT50"},
    "CUMMINSIND.NS":{"name": "Cummins India",            "sector": "Industrial",   "index": "NIFTYNEXT50"},
    "TORNTPHARM.NS":{"name": "Torrent Pharmaceuticals",  "sector": "Pharma",       "index": "NIFTYNEXT50"},
    "AUROPHARMA.NS":{"name": "Aurobindo Pharma",         "sector": "Pharma",       "index": "NIFTYNEXT50"},
    "LUPIN.NS":     {"name": "Lupin",                    "sector": "Pharma",       "index": "NIFTYNEXT50"},
    "BIOCON.NS":    {"name": "Biocon",                   "sector": "Pharma",       "index": "NIFTYNEXT50"},
    "ALKEM.NS":     {"name": "Alkem Laboratories",       "sector": "Pharma",       "index": "NIFTYNEXT50"},
    "MAXHEALTH.NS": {"name": "Max Healthcare",           "sector": "Healthcare",   "index": "NIFTYNEXT50"},
    "FORTIS.NS":    {"name": "Fortis Healthcare",        "sector": "Healthcare",   "index": "NIFTYNEXT50"},

    # ── Small Cap / Emerging ─────────────────────────────────────────────────
    "POLICYBZR.NS": {"name": "PB Fintech (PolicyBazaar)","sector": "Fintech",      "index": "SMALLCAP"},
    "DELHIVERY.NS": {"name": "Delhivery",                "sector": "Logistics",    "index": "SMALLCAP"},
    "CARTRADE.NS":  {"name": "CarTrade Tech",            "sector": "Auto Tech",    "index": "SMALLCAP"},
    "EASEMYTRIP.NS":{"name": "EaseMyTrip",               "sector": "Travel",       "index": "SMALLCAP"},
    "NAZARA.NS":    {"name": "Nazara Technologies",      "sector": "Gaming",       "index": "SMALLCAP"},
    "RATEGAIN.NS":  {"name": "RateGain Travel Tech",     "sector": "SaaS",         "index": "SMALLCAP"},
    "LATENTVIEW.NS":{"name": "LatentView Analytics",     "sector": "Analytics",    "index": "SMALLCAP"},
    "TANLA.NS":     {"name": "Tanla Platforms",          "sector": "CPaaS",        "index": "SMALLCAP"},
    "HAPPSTMNDS.NS":{"name": "Happiest Minds Tech",      "sector": "IT",           "index": "SMALLCAP"},
    "KPITTECH.NS":  {"name": "KPIT Technologies",        "sector": "Auto Tech",    "index": "SMALLCAP"},
    "TATAELXSI.NS": {"name": "Tata Elxsi",               "sector": "Design Tech",  "index": "SMALLCAP"},
    "ROUTE.NS":     {"name": "Route Mobile",             "sector": "CPaaS",        "index": "SMALLCAP"},
    "MAPMYINDIA.NS":{"name": "MapMyIndia (C.E. Info)",   "sector": "Mapping Tech", "index": "SMALLCAP"},
    "Campus.NS":    {"name": "Campus Activewear",        "sector": "Consumer",     "index": "SMALLCAP"},
    "VEDL.NS":      {"name": "Vedanta",                  "sector": "Metals",       "index": "SMALLCAP"},
    "SAIL.NS":      {"name": "SAIL",                     "sector": "Metals",       "index": "SMALLCAP"},
    "NMDC.NS":      {"name": "NMDC",                     "sector": "Mining",       "index": "SMALLCAP"},
    "GLAND.NS":     {"name": "Gland Pharma",             "sector": "Pharma",       "index": "SMALLCAP"},
}

# ── Lookup helpers ────────────────────────────────────────────────────────────

def get_all_tickers() -> list[str]:
    return list(INDIAN_COMPANIES.keys())

def get_company_name(ticker: str) -> str:
    return INDIAN_COMPANIES.get(ticker, {}).get("name", ticker)

def get_sector(ticker: str) -> str:
    return INDIAN_COMPANIES.get(ticker, {}).get("sector", "Unknown")

def get_by_sector(sector: str) -> list[str]:
    return [t for t, v in INDIAN_COMPANIES.items()
            if v["sector"].lower() == sector.lower()]

def get_nifty50() -> list[str]:
    return [t for t, v in INDIAN_COMPANIES.items()
            if v["index"] == "NIFTY50"]

def get_nifty_next50() -> list[str]:
    return [t for t, v in INDIAN_COMPANIES.items()
            if v["index"] == "NIFTYNEXT50"]

# ── Ticker patterns for news matching ────────────────────────────────────────
TICKER_PATTERNS = {
    "RELIANCE.NS":   r'\b(reliance industries|reliance jio|jio\b|mukesh ambani|ril\b)\b',
    "TCS.NS":        r'\b(tata consultancy|tcs\b)\b',
    "HDFCBANK.NS":   r'\b(hdfc bank|hdfcbank)\b',
    "INFY.NS":       r'\b(infosys|infy\b|narayana murthy|salil parekh)\b',
    "ICICIBANK.NS":  r'\b(icici bank|icicibank)\b',
    "HINDUNILVR.NS": r'\b(hindustan unilever|hul\b|lifebuoy|dove\b|lux soap)\b',
    "ITC.NS":        r'\b(itc limited|itc ltd|wills\b|gold flake)\b',
    "SBIN.NS":       r'\b(state bank of india|sbi\b)\b',
    "BHARTIARTL.NS": r'\b(airtel|bharti airtel|sunil mittal)\b',
    "KOTAKBANK.NS":  r'\b(kotak mahindra|kotak bank|uday kotak)\b',
    "LT.NS":         r'\b(larsen.toubro|l&t\b|lt\b construction)\b',
    "AXISBANK.NS":   r'\b(axis bank)\b',
    "ASIANPAINT.NS": r'\b(asian paints)\b',
    "MARUTI.NS":     r'\b(maruti suzuki|maruti\b|alto\b|swift\b car)\b',
    "SUNPHARMA.NS":  r'\b(sun pharma|sun pharmaceutical)\b',
    "WIPRO.NS":      r'\b(wipro\b)\b',
    "ULTRACEMCO.NS": r'\b(ultratech cement|ultratech)\b',
    "BAJFINANCE.NS": r'\b(bajaj finance)\b',
    "NESTLEIND.NS":  r'\b(nestle india|maggi\b|kitkat india)\b',
    "TITAN.NS":      r'\b(titan company|tanishq|fastrack)\b',
    "ADANIENT.NS":   r'\b(adani enterprises|gautam adani|adani group)\b',
    "ADANIPORTS.NS": r'\b(adani ports)\b',
    "TATASTEEL.NS":  r'\b(tata steel)\b',
    "TATAMOTORS.NS": r'\b(tata motors|jaguar land rover|jlr\b)\b',
    "ZOMATO.NS":     r'\b(zomato|deepinder goyal)\b',
    "PAYTM.NS":      r'\b(paytm|one97 communications|vijay shekhar sharma)\b',
    "NYKAA.NS":      r'\b(nykaa|fsn e-commerce)\b',
    "DMART.NS":      r'\b(dmart|avenue supermarts|d-mart)\b',
    "INDIGO.NS":     r'\b(indigo airline|interglobe aviation|indigo flight)\b',
    "IRCTC.NS":      r'\b(irctc\b|indian railway catering)\b',
    "HAL.NS":        r'\b(hindustan aeronautics|hal\b aircraft)\b',
    "BEL.NS":        r'\b(bharat electronics|bel\b defence)\b',
    "DRREDDY.NS":    r'\b(dr reddy|dr\. reddy)\b',
    "CIPLA.NS":      r'\b(cipla\b)\b',
    "LUPIN.NS":      r'\b(lupin pharma|lupin ltd)\b',
    "BIOCON.NS":     r'\b(biocon\b|kiran mazumdar)\b',
    "HCLTECH.NS":    r'\b(hcl tech|hcl technologies)\b',
    "TECHM.NS":      r'\b(tech mahindra|techm\b)\b',
    "PERSISTENT.NS": r'\b(persistent systems)\b',
    "MPHASIS.NS":    r'\b(mphasis\b)\b',
    "LTIM.NS":       r'\b(ltimindtree|lti\b mindtree)\b',
    "TATAELXSI.NS":  r'\b(tata elxsi)\b',
    "POLICYBZR.NS":  r'\b(policybazaar|pb fintech)\b',
    "DELHIVERY.NS":  r'\b(delhivery\b)\b',
    "NAZARA.NS":     r'\b(nazara tech|nazara games)\b',
    "MAPMYINDIA.NS": r'\b(mapmyindia|mappls)\b',
}