import os
import re
import math
import sqlite3
import requests
import feedparser
import pandas as pd
from datetime import datetime, timedelta
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv
from openai import OpenAI
from typing import Optional

load_dotenv()

# ---------------- CONFIG ----------------
NEWS_API_KEY     = os.getenv("NEWS_API_KEY")
OPENCAGE_API_KEY = os.getenv("OPENCAGE_API_KEY")
OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY")

openai_client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI(title="Women Safety AI", version="3.0")

# CORS — allows Next.js frontend (port 3000) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CATEGORY_WEIGHTS = {
    "harassment": 3,
    "assault":    5,
    "stalking":   4,
    "unsafe_area": 2
}

# IST = UTC + 5:30
IST_OFFSET = timedelta(hours=5, minutes=30)

# Night hours in IST (10 PM to 5 AM) → risk multiplier
NIGHT_MULTIPLIER = 1.5
EVENING_MULTIPLIER = 1.2   # 7 PM – 10 PM

# ---------------- DISTRICT-LEVEL NCRB DATA ----------------
# Source: National Crime Records Bureau 2022 — Crimes Against Women
# Normalized to [0, 1] based on rate per lakh female population
# This provides MUCH more granularity than state-level data

DISTRICT_RISK = {
    # Delhi districts
    "new delhi": 0.82, "north delhi": 0.80, "south delhi": 0.75,
    "east delhi": 0.83, "west delhi": 0.78, "central delhi": 0.85,
    "north east delhi": 0.84, "north west delhi": 0.79,
    "south east delhi": 0.76, "south west delhi": 0.74,
    "shahdara": 0.81, "dwarka": 0.70,
    
    # Mumbai districts
    "mumbai": 0.50, "mumbai suburban": 0.48, "thane": 0.52,
    "navi mumbai": 0.45, "pune": 0.42, "nagpur": 0.55,
    
    # UP major districts
    "lucknow": 0.78, "kanpur nagar": 0.82, "agra": 0.80,
    "varanasi": 0.76, "allahabad": 0.79, "prayagraj": 0.79,
    "meerut": 0.77, "ghaziabad": 0.75, "noida": 0.72,
    "gautam buddha nagar": 0.72, "bareilly": 0.74,
    "moradabad": 0.73, "gorakhpur": 0.71, "aligarh": 0.76,
    
    # Rajasthan districts
    "jaipur": 0.88, "jodhpur": 0.85, "udaipur": 0.80,
    "kota": 0.82, "ajmer": 0.83, "bikaner": 0.79,
    "alwar": 0.90, "bharatpur": 0.87, "sikar": 0.84,
    
    # Haryana districts
    "gurugram": 0.78, "gurgaon": 0.78, "faridabad": 0.80,
    "hisar": 0.82, "rohtak": 0.84, "karnal": 0.79,
    "panipat": 0.81, "sonipat": 0.83, "ambala": 0.76,
    
    # MP districts
    "bhopal": 0.75, "indore": 0.70, "jabalpur": 0.72,
    "gwalior": 0.78, "ujjain": 0.73, "sagar": 0.74,
    
    # Karnataka districts
    "bangalore urban": 0.45, "bengaluru": 0.45, "bangalore": 0.45,
    "mysore": 0.38, "mysuru": 0.38, "mangalore": 0.35,
    "mangaluru": 0.35, "hubli": 0.40, "belgaum": 0.42, "belagavi": 0.42,
    
    # Tamil Nadu districts
    "chennai": 0.35, "coimbatore": 0.30, "madurai": 0.33,
    "tiruchirappalli": 0.32, "salem": 0.34, "tirunelveli": 0.28,
    
    # West Bengal districts
    "kolkata": 0.50, "howrah": 0.52, "north 24 parganas": 0.55,
    "south 24 parganas": 0.53, "murshidabad": 0.58, "bardhaman": 0.48,
    
    # Kerala districts
    "thiruvananthapuram": 0.30, "trivandrum": 0.30, "kochi": 0.28,
    "ernakulam": 0.28, "kozhikode": 0.27, "thrissur": 0.25,
    
    # Gujarat districts
    "ahmedabad": 0.42, "surat": 0.38, "vadodara": 0.40,
    "rajkot": 0.37, "gandhinagar": 0.35,
    
    # Bihar districts
    "patna": 0.70, "gaya": 0.72, "muzaffarpur": 0.68,
    "bhagalpur": 0.66, "darbhanga": 0.65,
    
    # Telangana districts
    "hyderabad": 0.48, "rangareddy": 0.50, "warangal": 0.52,
    "karimnagar": 0.49, "nizamabad": 0.47,
    
    # Andhra Pradesh districts
    "visakhapatnam": 0.44, "vijayawada": 0.46, "guntur": 0.48,
    "nellore": 0.45, "kakinada": 0.43, "tirupati": 0.40,
    
    # Punjab districts
    "ludhiana": 0.38, "amritsar": 0.40, "jalandhar": 0.37,
    "patiala": 0.39, "bathinda": 0.42,
    
    # Jharkhand districts
    "ranchi": 0.62, "jamshedpur": 0.58, "dhanbad": 0.64,
    "bokaro": 0.60, "hazaribagh": 0.63,
    
    # Odisha districts
    "bhubaneswar": 0.65, "cuttack": 0.67, "berhampur": 0.63,
    
    # Assam districts
    "guwahati": 0.58, "kamrup": 0.60, "dibrugarh": 0.55,
    
    # Chhattisgarh districts
    "raipur": 0.60, "bilaspur": 0.62, "bhilai": 0.58, "durg": 0.58,
    
    # Uttarakhand districts
    "dehradun": 0.38, "haridwar": 0.42, "nainital": 0.30,
    
    # Other cities/areas
    "chandigarh": 0.55, "shimla": 0.28, "panaji": 0.22, "goa": 0.22,
    "imphal": 0.45, "shillong": 0.40, "aizawl": 0.20,
    "itanagar": 0.35, "kohima": 0.25, "gangtok": 0.18,
    "agartala": 0.42, "srinagar": 0.50, "jammu": 0.48,
}

# State-level fallback (NCRB 2022)
NCRB_STATE_RISK = {
    "Rajasthan":        0.85,
    "Uttar Pradesh":    0.80,
    "Haryana":          0.78,
    "Delhi":            0.80,
    "Madhya Pradesh":   0.72,
    "Odisha":           0.65,
    "Bihar":            0.62,
    "Jharkhand":        0.60,
    "Chhattisgarh":     0.58,
    "Assam":            0.55,
    "West Bengal":      0.52,
    "Telangana":        0.48,
    "Andhra Pradesh":   0.45,
    "Maharashtra":      0.45,
    "Karnataka":        0.40,
    "Gujarat":          0.38,
    "Punjab":           0.37,
    "Uttarakhand":      0.35,
    "Himachal Pradesh": 0.28,
    "Tamil Nadu":       0.32,
    "Kerala":           0.28,
    "Goa":              0.22,
    "Manipur":          0.45,
    "Meghalaya":        0.40,
    "Mizoram":          0.20,
    "Nagaland":         0.25,
    "Sikkim":           0.18,
    "Tripura":          0.42,
    "Arunachal Pradesh": 0.35,
    "Jammu and Kashmir": 0.48,
    "Chandigarh":       0.55,
}

# Known Indian cities/states for text extraction
INDIAN_LOCATIONS = {
    "delhi", "mumbai", "bangalore", "bengaluru", "hyderabad", "ahmedabad",
    "chennai", "kolkata", "surat", "pune", "jaipur", "lucknow", "kanpur",
    "nagpur", "indore", "thane", "bhopal", "visakhapatnam", "patna",
    "vadodara", "ghaziabad", "ludhiana", "agra", "nashik", "faridabad",
    "meerut", "rajkot", "varanasi", "srinagar", "aurangabad", "dhanbad",
    "amritsar", "prayagraj", "allahabad", "ranchi", "howrah", "coimbatore",
    "jabalpur", "gwalior", "vijayawada", "jodhpur", "madurai", "raipur",
    "kota", "guwahati", "chandigarh", "solapur", "bareilly", "moradabad",
    "mysore", "mysuru", "gurugram", "gurgaon", "noida", "dehradun",
    "aligarh", "jalandhar", "tiruchirappalli", "bhubaneswar", "salem",
    "warangal", "guntur", "gorakhpur", "bikaner", "jamshedpur", "bhilai",
    "cuttack", "kochi", "ernakulam", "jammu", "mangalore", "mangaluru",
    "udaipur", "ujjain", "siliguri", "jhansi", "kolhapur", "ajmer",
    "nellore", "kakinada", "hubli", "dharwad", "belgaum", "belagavi",
    "shimla", "imphal", "shillong", "aizawl", "itanagar", "kohima",
    "panaji", "goa", "thiruvananthapuram", "trivandrum", "kozhikode",
    "maharashtra", "karnataka", "tamilnadu", "westbengal", "rajasthan",
    "gujarat", "uttarpradesh", "bihar", "madhyapradesh", "haryana",
    "punjab", "telangana", "andhra", "kerala", "odisha", "jharkhand",
    "assam", "chhattisgarh", "uttarakhand", "himachal"
}

# ---------------- DB ----------------
conn   = sqlite3.connect("events.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS events (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    lat       REAL,
    lon       REAL,
    timestamp TEXT,
    source    TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS user_reports (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    lat       REAL,
    lon       REAL,
    category  TEXT,
    timestamp TEXT
)
""")

conn.commit()

# ---------------- GEO ----------------
def get_location_details(lat, lon):
    """Returns state, district, and city from coordinates using OpenCage."""
    try:
        url = (
            f"https://api.opencagedata.com/geocode/v1/json"
            f"?q={lat}+{lon}&key={OPENCAGE_API_KEY}"
        )
        res = requests.get(url, timeout=5).json()

        if res.get("results"):
            comp = res["results"][0]["components"]
            state = comp.get("state", "Unknown")
            district = comp.get("state_district", "")
            city = comp.get("city", "") or comp.get("town", "") or comp.get("village", "")
            suburb = comp.get("suburb", "") or comp.get("neighbourhood", "")
            formatted = res["results"][0].get("formatted", "")
            
            return {
                "state": state,
                "district": district,
                "city": city,
                "suburb": suburb,
                "formatted": formatted
            }
    except Exception as e:
        print(f"[GEO ERROR] {e}")

    return {"state": "Unknown", "district": "", "city": "", "suburb": "", "formatted": ""}


def get_coordinates(place):
    try:
        url = (
            f"https://api.opencagedata.com/geocode/v1/json"
            f"?q={place}, India&key={OPENCAGE_API_KEY}"
        )
        res = requests.get(url, timeout=5).json()

        if res.get("results"):
            g    = res["results"][0]["geometry"]
            name = res["results"][0].get("formatted", place)
            return g["lat"], g["lng"], name

    except Exception as e:
        print(f"[GEO ERROR] {e}")

    return None, None, None


def extract_indian_location(text):
    """Scans text for known Indian city/state names."""
    text_lower = text.lower()
    text_clean = re.sub(r"[^a-z\s]", " ", text_lower)
    words = text_clean.split()

    for word in words:
        if word in INDIAN_LOCATIONS:
            return word

    for i in range(len(words) - 1):
        pair = words[i] + " " + words[i + 1]
        if pair.replace(" ", "") in INDIAN_LOCATIONS or pair in INDIAN_LOCATIONS:
            return pair

    return None


def get_coordinates_from_text(text):
    """Extract location from free-text input and return coordinates."""
    location_word = extract_indian_location(text)

    if not location_word:
        stopwords = {
            "going", "to", "visit", "travel", "traveling", "in", "at",
            "the", "a", "is", "am", "are", "tomorrow", "today", "tonight",
            "now", "i", "me", "we", "was", "were", "had", "has", "have"
        }
        words    = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        filtered = [w for w in words if w not in stopwords]
        if not filtered:
            return None, None, None
        location_word = filtered[-1]

    print(f"[LOCATION] Extracted: {location_word}")
    lat, lon, name = get_coordinates(location_word)
    return lat, lon, name


# ---------------- OSM INFRASTRUCTURE SCORING ----------------
def get_infrastructure_score(lat, lon, radius_m=500):
    """
    Queries OpenStreetMap via Overpass API to assess safety infrastructure
    within a radius around the given coordinates.
    
    Checks for:
    - Street lights
    - Police stations
    - Hospitals/clinics
    - Bus stops / metro stations
    - CCTV cameras
    - Populated buildings density
    
    Returns a score 0.0 (no infrastructure) to 1.0 (well-equipped area)
    and a breakdown dict.
    """
    try:
        # Overpass query for safety-relevant infrastructure
        query = f"""[out:json][timeout:8];
(
  node["highway"="street_lamp"](around:{radius_m},{lat},{lon});
  node["amenity"="police"](around:{radius_m*3},{lat},{lon});
  way["amenity"="police"](around:{radius_m*3},{lat},{lon});
  node["amenity"="hospital"](around:{radius_m*3},{lat},{lon});
  way["amenity"="hospital"](around:{radius_m*3},{lat},{lon});
  node["amenity"="clinic"](around:{radius_m*2},{lat},{lon});
  node["highway"="bus_stop"](around:{radius_m},{lat},{lon});
  node["railway"="station"](around:{radius_m*2},{lat},{lon});
  node["man_made"="surveillance"](around:{radius_m},{lat},{lon});
  way["building"](around:{radius_m},{lat},{lon});
);
out count;"""

        res = requests.post(
            "https://overpass-api.de/api/interpreter",
            data={"data": query},
            timeout=10
        )
        data = res.json()
        
        # Parse counts from Overpass response
        total_elements = data.get("elements", [])
        count = len(total_elements) if isinstance(total_elements, list) else 0
        
        # Also try the tags count approach
        if count == 0 and "elements" in data:
            for el in data["elements"]:
                if el.get("type") == "count":
                    count = el.get("tags", {}).get("total", 0)
                    try:
                        count = int(count)
                    except:
                        count = 0

        # Normalize: 0 elements → 0.0, 50+ elements → 1.0
        # Using logarithmic scaling for better distribution
        if count <= 0:
            infra_score = 0.0
        else:
            infra_score = min(math.log1p(count) / math.log1p(50), 1.0)

        return infra_score, {
            "elements_found": count,
            "radius_m": radius_m,
            "assessment": "Well-lit & monitored" if infra_score > 0.6 
                         else "Moderate infrastructure" if infra_score > 0.3
                         else "Limited infrastructure nearby"
        }

    except Exception as e:
        print(f"[OSM ERROR] {e}")
        # Return neutral score on failure (don't penalize for API errors)
        return 0.5, {"elements_found": -1, "radius_m": radius_m, "assessment": "Infrastructure data unavailable"}


def get_population_density_proxy(lat, lon, radius_m=300):
    """
    Uses OSM building count as a proxy for population density.
    More buildings = more populated = generally safer at odd hours.
    Returns a density score 0.0 (isolated) to 1.0 (highly populated).
    """
    try:
        query = f"""[out:json][timeout:5];
(
  way["building"](around:{radius_m},{lat},{lon});
  relation["building"](around:{radius_m},{lat},{lon});
);
out count;"""

        res = requests.post(
            "https://overpass-api.de/api/interpreter",
            data={"data": query},
            timeout=8
        )
        data = res.json()
        
        count = 0
        elements = data.get("elements", [])
        if isinstance(elements, list):
            count = len(elements)
            # Check for count-type response
            for el in elements:
                if el.get("type") == "count":
                    try:
                        count = int(el.get("tags", {}).get("total", 0))
                    except:
                        pass

        # Normalize: 0 buildings → 0.0, 100+ buildings → 1.0
        if count <= 0:
            return 0.2, "sparse"  # Default to sparse, not zero
        elif count < 10:
            return 0.3, "isolated"
        elif count < 30:
            return 0.5, "semi-populated"
        elif count < 70:
            return 0.7, "populated"
        else:
            return 0.9, "densely populated"

    except Exception as e:
        print(f"[DENSITY ERROR] {e}")
        return 0.5, "unknown"


# ---------------- TIME OF DAY ----------------
def get_time_multiplier():
    """Returns a risk multiplier based on current IST time."""
    now_ist = datetime.utcnow() + IST_OFFSET
    hour    = now_ist.hour

    if 22 <= hour or hour < 5:   # 10 PM – 5 AM
        return NIGHT_MULTIPLIER, "Night hours (10 PM – 5 AM) — elevated risk"
    elif 19 <= hour < 22:        # 7 PM – 10 PM
        return EVENING_MULTIPLIER, "Evening hours (7 PM – 10 PM) — slightly elevated risk"
    else:
        return 1.0, "Daytime — normal risk"

# ---------------- NEWS ----------------
NEWS_FEEDS = [
    # Google News RSS - crime against women India
    "https://news.google.com/rss/search?q=crime+women+India+harassment+assault&hl=en-IN&gl=IN&ceid=IN:en",
    # Times of India crime section
    "https://timesofindia.indiatimes.com/rssfeeds/913168846.cms",
    # NDTV India news
    "https://feeds.feedburner.com/ndtvnews-india-news",
    # India Today crime
    "https://www.indiatoday.in/rss/1206578",
]

NEWSAPI_URL = (
    f"https://newsapi.org/v2/everything"
    f"?q=(harassment OR assault OR rape OR stalking OR \"crime against women\") AND India"
    f"&sortBy=publishedAt&pageSize=30&apiKey={NEWS_API_KEY}"
)

CRIME_KEYWORDS = {
    "harassment", "assault", "rape", "stalking", "molestation", "eve-teasing",
    "kidnapping", "abduction", "murder", "robbery", "theft", "crime",
    "attack", "violence", "domestic violence", "dowry", "acid attack",
    "sexual", "molest", "grope", "stalk", "unsafe", "danger"
}


def _is_crime_related(text):
    """Check if text contains crime-related keywords."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in CRIME_KEYWORDS)


def _store_event(lat, lon, source):
    try:
        cursor.execute(
            "INSERT INTO events (lat, lon, timestamp, source) VALUES (?, ?, ?, ?)",
            (lat, lon, datetime.utcnow().isoformat(), source)
        )
    except Exception as e:
        print(f"[DB ERROR] {e}")


def fetch_news():
    """Fetches from NewsAPI + multiple RSS feeds and stores geolocated events."""
    articles = []

    # --- NewsAPI ---
    if NEWS_API_KEY:
        try:
            data = requests.get(NEWSAPI_URL, timeout=10).json()
            for a in data.get("articles", []):
                title = a.get("title", "") or ""
                desc  = a.get("description", "") or ""
                articles.append(title + " " + desc)
        except Exception as e:
            print(f"[NEWSAPI ERROR] {e}")

    # --- Multiple RSS Feeds ---
    for feed_url in NEWS_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries:
                text = (entry.get("title", "") + " " + entry.get("summary", ""))
                if _is_crime_related(text):
                    articles.append(text)
        except Exception as e:
            print(f"[RSS ERROR] {feed_url}: {e}")

    stored = 0
    for text in articles:
        location = extract_indian_location(text)
        if not location:
            continue

        lat, lon, _ = get_coordinates(location)
        if lat is None:
            continue

        _store_event(lat, lon, "news")
        stored += 1

    conn.commit()
    print(f"[NEWS] Fetched {len(articles)} articles → stored {stored} events")


# Run news fetch every 5 minutes in the background
scheduler = BackgroundScheduler()
scheduler.add_job(fetch_news, "interval", minutes=5, id="news_fetch")
scheduler.start()

# Fetch news immediately on startup
@app.on_event("startup")
async def startup_event():
    import threading
    threading.Thread(target=fetch_news, daemon=True).start()

# ---------------- DISTANCE ----------------
def haversine(lat1, lon1, lat2, lon2):
    R    = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a    = (math.sin(dlat / 2) ** 2 +
            math.cos(math.radians(lat1)) *
            math.cos(math.radians(lat2)) *
            math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# ---------------- DECAY ----------------
def time_decay(ts: datetime, half_life_hours=12):
    """Exponential decay: a report loses half its weight every `half_life_hours`."""
    age_hours = (datetime.utcnow() - ts).total_seconds() / 3600
    return math.exp(-0.693 * age_hours / half_life_hours)

# ---------------- LAYERS ----------------
def get_layers(user_lat, user_lon, radius_km=15):
    """
    Returns weighted incident counts within radius_km of user.
    Applies exponential decay so recent events matter much more.
    """
    now   = datetime.utcnow()
    r_cut = now - timedelta(hours=6)
    m_cut = now - timedelta(hours=24)

    r = m = o = 0.0
    news_count = report_count = 0

    # --- news/auto events ---
    cursor.execute("SELECT lat, lon, timestamp FROM events")
    for lat, lon, ts_str in cursor.fetchall():
        ts = datetime.fromisoformat(ts_str)
        if haversine(user_lat, user_lon, lat, lon) > radius_km:
            continue
        decay = time_decay(ts)
        if ts > r_cut:
            r += 1.0 * decay
            news_count += 1
        elif ts > m_cut:
            m += 1.0 * decay
        else:
            o += 0.5 * decay

    # --- user reports (weighted by category + decay) ---
    cursor.execute("SELECT lat, lon, category, timestamp FROM user_reports")
    for lat, lon, category, ts_str in cursor.fetchall():
        ts = datetime.fromisoformat(ts_str)
        if lat is None or lon is None:
            continue
        if haversine(user_lat, user_lon, lat, lon) > radius_km:
            continue
        weight = CATEGORY_WEIGHTS.get(category, 1)
        decay  = time_decay(ts, half_life_hours=6)
        if ts > r_cut:
            r += weight * decay
            report_count += 1
        elif ts > m_cut:
            m += weight * decay
        else:
            o += (weight * 0.3) * decay

    return r, m, o, news_count, report_count

# ---------------- BASELINE ----------------
def get_baseline(location_details):
    """
    Multi-level baseline lookup:
    1. Try district-level data (most granular)
    2. Fall back to city-level
    3. Fall back to state-level
    4. Default to 0.4
    """
    district = location_details.get("district", "").lower().strip()
    city = location_details.get("city", "").lower().strip()
    suburb = location_details.get("suburb", "").lower().strip()
    state = location_details.get("state", "Unknown")
    
    # Try district match
    if district and district in DISTRICT_RISK:
        return DISTRICT_RISK[district], "district"
    
    # Try city match
    if city and city in DISTRICT_RISK:
        return DISTRICT_RISK[city], "city"
    
    # Try suburb (sometimes contains area name)
    if suburb and suburb.lower() in DISTRICT_RISK:
        return DISTRICT_RISK[suburb.lower()], "suburb"
    
    # Fall back to state
    if state in NCRB_STATE_RISK:
        return NCRB_STATE_RISK[state], "state"
    
    return 0.4, "default"

# ---------------- COMPUTE (ENHANCED) ----------------
def compute_v3(lat, lon, include_infra=True):
    """
    Enhanced safety score computation with multiple layers:
    
    Final Score = weighted combination of:
      - 35% Historical baseline (NCRB district/state data)
      - 30% Realtime signal (news + reports in last 6h)
      - 15% Infrastructure score (OSM: lights, police, hospitals)
      - 10% Population density (OSM building count proxy)
      - 10% Mid-term signal (6-24h incidents)
    
    Then multiplied by time-of-day factor, capped at 1.0.
    """
    location_details = get_location_details(lat, lon)
    state = location_details["state"]
    
    baseline, baseline_source = get_baseline(location_details)
    r, m, o, news_count, report_count = get_layers(lat, lon)
    
    realtime = min(math.log1p(r) / 3, 1.0)
    mid_term = min(m / 10, 1.0)
    
    # Infrastructure and density (with fallback if Overpass is slow/down)
    infra_score = 0.5  # neutral default
    density_score = 0.5
    infra_details = {"assessment": "Not queried"}
    density_label = "unknown"
    
    if include_infra:
        infra_score, infra_details = get_infrastructure_score(lat, lon)
        density_score, density_label = get_population_density_proxy(lat, lon)
    
    # Infrastructure REDUCES risk (more infra = safer)
    # So we invert it: high infra → low risk contribution
    infra_risk = 1.0 - infra_score
    density_risk = 1.0 - density_score
    
    # Weighted combination
    score = (
        0.35 * baseline +
        0.30 * realtime +
        0.15 * infra_risk +
        0.10 * density_risk +
        0.10 * mid_term
    )
    
    # Time multiplier
    time_mult, time_label = get_time_multiplier()
    score = min(score * time_mult, 1.0)
    
    return {
        "score": score,
        "state": state,
        "location_details": location_details,
        "baseline": baseline,
        "baseline_source": baseline_source,
        "realtime": realtime,
        "mid_term": mid_term,
        "infra_score": infra_score,
        "infra_details": infra_details,
        "density_score": density_score,
        "density_label": density_label,
        "raw_recent": r,
        "raw_mid": m,
        "raw_old": o,
        "news_count": news_count,
        "report_count": report_count,
        "time_label": time_label,
        "time_multiplier": time_mult,
    }

# ---------------- LLM SUMMARY ----------------
def generate_risk_summary(location, score, risk_level, time_label, recent, state, infra_assessment, density_label):
    try:
        prompt = f"""You are a women safety assistant for India. Based on the data below, write a 2-3 sentence natural language safety summary. Be direct, empathetic, and practical.

Location: {location}
State: {state}
Risk Level: {risk_level} (score: {score}/1.0)
Time Context: {time_label}
Incidents in last 6 hours nearby: {recent}
Infrastructure: {infra_assessment}
Area Density: {density_label}

Write only the summary, no headings or bullet points."""

        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[LLM ERROR] {e}")
        return None


def generate_report_summary(location, category):
    try:
        prompt = f"""You are a women safety assistant for India. A woman just reported a {category} incident near {location}. Write a 2-sentence empathetic acknowledgement that validates her experience and reminds her of emergency helplines (1091 for women, 112 for emergency). Be warm and supportive. Write only the message."""

        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=100,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[LLM ERROR] {e}")
        return None


# ---------------- SAFETY ADVICE ----------------
def get_advice(score, infra_assessment, density_label, time_label):
    """Context-aware safety advice based on actual environmental factors."""
    advice = []
    
    if score > 0.7:
        advice.append("This area has elevated risk — avoid if possible, especially alone")
        advice.append("Share your live location with someone you trust")
        advice.append("Keep emergency contacts ready (112, 1091)")
        if "Night" in time_label:
            advice.append("Night travel in this area is particularly risky — consider alternatives")
    elif score > 0.4:
        advice.append("Stay alert and aware of your surroundings")
        advice.append("Prefer travelling with company if possible")
        if "Limited" in infra_assessment:
            advice.append("Limited street lighting nearby — use main roads")
        if density_label in ("isolated", "sparse"):
            advice.append("Area is less populated — stick to busier routes")
        advice.append("Keep your phone charged and accessible")
    else:
        advice.append("Area appears relatively safe based on available data")
        if "Night" in time_label or "Evening" in time_label:
            advice.append("Stay vigilant even in safer areas during evening/night")
        advice.append("Trust your instincts — leave if something feels wrong")
    
    return advice

# ---------------- ENDPOINTS ----------------

@app.post("/risk_by_coords")
def risk_by_coords(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    include_infra: bool = Query(True, description="Include OSM infrastructure scoring (adds ~2-3s)")
):
    """
    PRIMARY ENDPOINT: Takes exact GPS coordinates directly.
    No text parsing, no re-geocoding — maximum precision.
    Used by the frontend's useSafetyScore hook.
    """
    result = compute_v3(lat, lon, include_infra=include_infra)
    
    score = result["score"]
    risk_level = "High" if score > 0.7 else "Moderate" if score > 0.4 else "Low"
    location_name = result["location_details"].get("formatted", f"{lat}, {lon}")
    
    infra_assessment = result["infra_details"].get("assessment", "Unknown")
    density_label = result["density_label"]
    
    return {
        "coordinates":       {"lat": lat, "lon": lon},
        "detected_location": location_name,
        "state":             result["state"],
        "risk_score":        round(score, 3),
        "risk_level":        risk_level,
        "time_context":      result["time_label"],
        "breakdown": {
            "historical_baseline":  round(result["baseline"], 3),
            "baseline_source":      result["baseline_source"],
            "realtime_signal":      round(result["realtime"], 3),
            "mid_term_signal":      round(result["mid_term"], 3),
            "infrastructure_score": round(result["infra_score"], 3),
            "density_score":        round(result["density_score"], 3),
            "time_multiplier":      result["time_multiplier"],
        },
        "environment": {
            "infrastructure": infra_assessment,
            "population_density": density_label,
            "elements_nearby": result["infra_details"].get("elements_found", -1),
        },
        "nearby_incidents": {
            "last_6_hours":  round(result["raw_recent"], 1),
            "last_24_hours": round(result["raw_mid"], 1),
            "older":         round(result["raw_old"], 1),
            "news_events":   result["news_count"],
            "user_reports":  result["report_count"]
        },
        "safety_advice":  get_advice(score, infra_assessment, density_label, result["time_label"]),
        "summary":        generate_risk_summary(
            location_name, round(score, 2), risk_level,
            result["time_label"], round(result["raw_recent"], 1),
            result["state"], infra_assessment, density_label
        ),
        "emergency":      {"police": "100", "women_helpline": "1091", "emergency": "112"},
        "data_factors": {
            "total_signals_used": 5,
            "signals": [
                f"NCRB historical data ({result['baseline_source']} level)",
                f"Real-time incidents ({result['news_count']} news + {result['report_count']} reports nearby)",
                f"Infrastructure assessment ({result['infra_details'].get('elements_found', 0)} elements scanned)",
                f"Population density ({density_label})",
                f"Time-of-day factor (×{result['time_multiplier']})"
            ]
        }
    }


@app.post("/smart_risk")
def smart_risk(user_input: str):
    """
    Text-based endpoint. Takes free-text like 'going to CP Delhi tonight'
    and returns a detailed risk assessment.
    Also supports direct lat/lon if provided as query params.
    """
    lat, lon, location_name = get_coordinates_from_text(user_input)

    if not lat:
        return {
            "error": "Could not detect a known Indian location in your input",
            "tip": "Try being specific, e.g. 'Lajpat Nagar Delhi' or 'MG Road Bangalore'"
        }

    result = compute_v3(lat, lon, include_infra=True)
    score = result["score"]
    risk_level = "High" if score > 0.7 else "Moderate" if score > 0.4 else "Low"
    
    infra_assessment = result["infra_details"].get("assessment", "Unknown")
    density_label = result["density_label"]

    return {
        "input":              user_input,
        "detected_location":  location_name,
        "coordinates":        {"lat": lat, "lon": lon},
        "state":              result["state"],
        "risk_score":         round(score, 3),
        "risk_level":         risk_level,
        "time_context":       result["time_label"],
        "breakdown": {
            "historical_baseline":  round(result["baseline"], 3),
            "baseline_source":      result["baseline_source"],
            "realtime_signal":      round(result["realtime"], 3),
            "mid_term_signal":      round(result["mid_term"], 3),
            "infrastructure_score": round(result["infra_score"], 3),
            "density_score":        round(result["density_score"], 3),
            "time_multiplier":      result["time_multiplier"],
        },
        "environment": {
            "infrastructure": infra_assessment,
            "population_density": density_label,
            "elements_nearby": result["infra_details"].get("elements_found", -1),
        },
        "nearby_incidents": {
            "last_6_hours":  round(result["raw_recent"], 1),
            "last_24_hours": round(result["raw_mid"], 1),
            "older":         round(result["raw_old"], 1),
            "news_events":   result["news_count"],
            "user_reports":  result["report_count"]
        },
        "safety_advice":  get_advice(score, infra_assessment, density_label, result["time_label"]),
        "summary":        generate_risk_summary(
            location_name, round(score, 2), risk_level,
            result["time_label"], round(result["raw_recent"], 1),
            result["state"], infra_assessment, density_label
        ),
        "emergency":      {"police": "100", "women_helpline": "1091", "emergency": "112"},
        "data_factors": {
            "total_signals_used": 5,
            "signals": [
                f"NCRB historical data ({result['baseline_source']} level)",
                f"Real-time incidents ({result['news_count']} news + {result['report_count']} reports nearby)",
                f"Infrastructure assessment ({result['infra_details'].get('elements_found', 0)} elements scanned)",
                f"Population density ({density_label})",
                f"Time-of-day factor (×{result['time_multiplier']})"
            ]
        }
    }


@app.post("/report")
def report(user_input: str, category: str):
    """
    Victim reports an incident via free-text.
    category: harassment | assault | stalking | unsafe_area
    """
    if category not in CATEGORY_WEIGHTS:
        return {"error": f"Invalid category. Choose from: {list(CATEGORY_WEIGHTS.keys())}"}

    lat, lon, location_name = get_coordinates_from_text(user_input)

    if not lat or location_name == "India":
        return {
            "status":  "need_location",
            "message": "Could not detect location. Please mention a specific place like 'Lajpat Nagar' or 'Sector 18 Noida'"
        }

    cursor.execute(
        "INSERT INTO user_reports VALUES (NULL, ?, ?, ?, ?)",
        (lat, lon, category, datetime.utcnow().isoformat())
    )
    conn.commit()

    return {
        "status":   "reported",
        "location": location_name,
        "category": category,
        "message":  generate_report_summary(location_name, category) or "Thank you for reporting. Your report helps keep others safe.",
        "support":  {"women_helpline": "1091", "emergency": "112"}
    }


@app.post("/report_location")
def report_location(location: str, category: str):
    """Follow-up when location was not auto-detected."""
    if category not in CATEGORY_WEIGHTS:
        return {"error": f"Invalid category. Choose from: {list(CATEGORY_WEIGHTS.keys())}"}

    lat, lon, location_name = get_coordinates(location)

    if not lat:
        return {"error": "Could not find this location. Please try a nearby landmark or area name."}

    cursor.execute(
        "INSERT INTO user_reports VALUES (NULL, ?, ?, ?, ?)",
        (lat, lon, category, datetime.utcnow().isoformat())
    )
    conn.commit()

    return {
        "status":   "reported",
        "location": location_name,
        "category": category,
        "message":  "Thank you for reporting. Your report helps keep others safe.",
        "support":  {"women_helpline": "1091", "emergency": "112"}
    }


@app.post("/sos")
def sos_trigger():
    """Called automatically when the SOS hand gesture is held for 3 seconds."""
    cursor.execute(
        "INSERT INTO user_reports VALUES (NULL, NULL, NULL, ?, ?)",
        ("sos", datetime.utcnow().isoformat())
    )
    conn.commit()

    return {
        "status":    "sos_received",
        "timestamp": datetime.utcnow().isoformat(),
        "message":   "SOS alert received. Stay safe.",
        "emergency": {"police": "100", "women_helpline": "1091", "emergency": "112"}
    }


@app.get("/")
def home():
    return {
        "service": "Women Safety AI",
        "version": "3.0",
        "status":  "running",
        "improvements": [
            "District-level NCRB data (100+ districts vs 22 states)",
            "Direct GPS coordinate endpoint (/risk_by_coords)",
            "OSM infrastructure scoring (streetlights, police, hospitals)",
            "Population density proxy (building count)",
            "Multiple news RSS feeds for better coverage",
            "Context-aware safety advice",
        ],
        "endpoints": {
            "POST /risk_by_coords": "Get risk from exact GPS coordinates (primary, most accurate)",
            "POST /smart_risk":     "Get risk from free-text location description",
            "POST /report":         "Report an incident via free text",
            "POST /report_location": "Report with explicit location name",
            "POST /sos":            "Triggered by SOS hand gesture"
        }
    }
