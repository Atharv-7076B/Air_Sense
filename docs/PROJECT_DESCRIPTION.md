# ExposureTracker - Personalized Air Quality Exposure Intelligence Platform

## Problem Statement

Air quality apps today show a single city-wide AQI number -- the same whether you're jogging outdoors or working in an air-conditioned office. This one-size-fits-all approach is dangerously misleading: a person with asthma cycling near a highway faces radically different health risk than a healthy individual resting indoors, yet both see the same number. Vulnerable populations -- the elderly, children, those with respiratory or cardiovascular conditions -- have no way to understand their *actual* pollution exposure or receive guidance calibrated to their health profile.

ExposureTracker solves this by computing a **personalized exposure score** that reflects what *you* actually breathe, not just what's in the ambient air.

---

## What ExposureTracker Does

ExposureTracker is a full-stack air quality intelligence platform that transforms abstract AQI numbers into personalized, health-aware, and actionable insights. It combines real-time pollution data, wearable activity tracking, medical health profiling, machine learning forecasting, and fuzzy logic inference to deliver six core capabilities:

### 1. Personal Exposure Scoring

The core innovation. Instead of showing ambient AQI, ExposureTracker calculates your **actual inhaled exposure** using a multi-factor algorithm:

- **Indoor protection factor** -- apartment with AC reduces particle intake by ~65%; house without AC by ~25%. These aren't arbitrary numbers; they're modeled on EPA indoor air quality research.
- **Activity-based breathing multipliers** -- running increases ventilation rate 3x over resting, meaning 3x more pollutant inhalation. Walking is 1.5x, cycling 2.5x. These are derived from pulmonary physiology literature.
- **Location modifiers** -- near highways (+30%), construction zones (+40%), industrial areas (+50%), parks (-15%).
- **Health vulnerability multiplier** -- a proprietary scoring system (1.0x to 3.0x) that accounts for 7 respiratory conditions (asthma, COPD, bronchitis, pneumonia, TB, allergic rhinitis, sinusitis) each with severity grading, plus cardiovascular disease, diabetes, immunocompromised status, pregnancy, age-based vulnerability curves, and smoking history.

**Result:** A personal exposure score (0-300) with risk category, hourly breakdown, and contextual insights. A typical indoor worker in Mumbai sees a personal score of ~45-60 against a city AQI of 145 -- a 60% reduction that accurately reflects their actual exposure.

### 2. Wearable Integration (Real Fitbit Data)

ExposureTracker connects to **Fitbit** via OAuth 2.0 PKCE flow to pull real activity data:

- Steps, calories, active minutes, sedentary time
- Heart rate (current, resting, zones)
- Sleep data (total, deep, light, REM, awake time)
- SpO2 (blood oxygen saturation)
- Breathing rate

This data feeds directly into the exposure algorithm -- your actual activity patterns determine your actual exposure, not assumptions. When Fitbit is connected, the analytics page shows real 7-day trends; a badge indicates "Fitbit Connected" vs. "Simulated Data" for full transparency. When no wearable is connected, a deterministic simulator generates consistent daily patterns for demonstration.

### 3. SARIMA Forecasting (6-Month AQI Predictions)

A dedicated **Python microservice** running `pmdarima` performs automated SARIMA model selection on 6-8 years of historical pollution data:

- Auto-selects optimal (p,d,q)(P,D,Q,12) parameters via stepwise search
- Produces 6-month forward forecasts with 95% confidence intervals
- Reports model diagnostics (AIC, RMSE, model order)
- Seasonal decomposition captures Delhi's winter pollution spikes and Mumbai's monsoon dips

Historical data is sourced from **OpenWeatherMap Air Pollution History API** (hourly data from Nov 2020 onwards) and **OpenMeteo Air Quality API** (free fallback from 2022 onwards), aggregated into monthly averages and cached in the database to avoid redundant API calls.

### 4. Fuzzy Logic Recommendation Engine

Rather than rigid if-then rules ("AQI > 150 = stay indoors"), ExposureTracker uses a **Mamdani-type fuzzy inference system** with:

- **7 fuzzified inputs:** AQI, personal exposure score, health vulnerability, fitness level, time of day, activity type, forecast trend
- **6 defuzzified outputs:** outdoor safety level, mask recommendation (with type: N95/KN95/surgical), air purifier urgency, exercise modification, ventilation advice, medical alert level
- **50+ fuzzy rules** covering realistic exposure scenarios with smooth transitions between categories

Each recommendation includes a **reasoning string** explaining the inference chain (e.g., "Moderate AQI combined with high health vulnerability and vigorous outdoor activity warrants N95 mask usage and reduced exercise intensity"). This transparency is critical for health-related guidance.

### 5. Travel Health Advisory

A health-aware travel planning tool that:

- Compares real-time AQI between origin and destination cities
- Applies health vulnerability multiplier to destination AQI for personalized risk assessment
- Generates advisory levels (Safe / Caution / Warning / Danger)
- Produces dynamic preparation checklists based on destination conditions
- Recommends travel kits (masks, portable purifiers, supplements) filtered for portability

### 6. City Sustainability Analytics (GPSI)

The **General Population Sustainability Index** provides city-level analysis combining:

- **Environmental score (40%):** Historical PM2.5 levels, trend direction (improving/stable/worsening), sustainability trajectory
- **Health score (30%):** Respiratory disease prevalence, pollution-attributable mortality, life expectancy
- **Infrastructure score (30%):** Green cover percentage, healthcare facility density, public transport availability, industrial zone density

Users see how their personal resilience score compares to estimated city population averages, with percentile rankings and targeted insights.

---

## Technical Architecture

### Frontend
- **Next.js 16** (App Router) with **React 19** and **TypeScript 5** (strict mode)
- **Tailwind CSS v4** for responsive, utility-first styling
- **Framer Motion** for smooth page transitions and micro-animations
- **Recharts** for interactive data visualizations (line charts, bar charts, area charts)
- **Leaflet + react-leaflet** for interactive AQI map with color-coded markers
- **Prisma Client** for type-safe database access

### Backend
- **Next.js API Routes** -- 16 endpoints handling AQI fetching, exposure calculation, health profiling, wearable data, forecasting, recommendations, travel advisories, and city search
- **SQLite via Prisma ORM** -- 11 tables covering users, health profiles, wearable connections, AQI cache, historical data, activity logs, exposure logs, city data, product recommendations, and travel advisories
- **Python FastAPI microservice** (port 8001) -- SARIMA forecasting and fuzzy logic inference, running independently with numpy, pandas, pmdarima, and scikit-fuzzy

### External Data Sources (Real APIs)
| Source | Data | Auth |
|--------|------|------|
| WAQI (World Air Quality Index) | Real-time AQI, PM2.5, PM10, O3, NO2, SO2, CO | API key |
| OpenWeatherMap Air Pollution | 6-8 years hourly historical pollution data | API key |
| OpenMeteo Air Quality | Historical air quality (free fallback) | None |
| Nominatim (OpenStreetMap) | City search, geocoding, reverse geocoding | None |
| Fitbit Web API | Activity, heart rate, sleep, SpO2, breathing rate | OAuth 2.0 PKCE |

### Graceful Degradation
Every external dependency has a fallback: WAQI falls back to IQAir, then to cached data, then to city baselines. Fitbit falls back to deterministic simulation. SARIMA falls back to rule-based forecasting. Fuzzy logic falls back to a JavaScript rule engine. The app never breaks -- it indicates data source transparency via badges.

---

## Scoring Systems & Algorithms

### Personal Exposure Score (0-300)
```
personalScore = SUM(activity_exposure_i) x healthVulnerabilityMultiplier

where activity_exposure = baseAQI x indoorFactor x breathingMultiplier x locationModifier
```

### Health Vulnerability Multiplier (1.0x - 3.0x)
Multiplicative model for primary respiratory condition, additive for secondary conditions, smoking, age, and systemic conditions. Accounts for condition severity (mild/moderate/severe) and compounding effects.

### Resilience Score (0-100)
Weighted composite: health history (40%) + age factor (15%) + lifestyle habits (20%) + city acclimatization (15%) + physiological recovery capacity (10%).

### Fitness Score (0-100)
Weighted composite: cardiovascular health (30%) + activity level (25%) + BMI (15%) + blood oxygen (15%) + sleep quality (15%). Sourced from wearable data when available.

### GPSI (0-100)
City-level index combining environmental quality (40%), population health metrics (30%), and infrastructure readiness (30%).

---

## Pages & User Interface

| Page | Purpose |
|------|---------|
| **Dashboard** | Real-time exposure score, AQI details, resilience/fitness scores, GPSI comparison, 7-day forecast, activity timeline, contextual insights |
| **Analytics** | 7-day exposure trends, activity breakdown, hourly exposure patterns, weekly summary, SARIMA 6-month forecast with confidence bands, sustainability analytics with year-over-year comparisons |
| **Map** | Interactive Leaflet map with AQI-colored markers, city search, geolocation, click-to-inspect pollutant details |
| **Recommendations** | Fuzzy logic powered: outdoor safety, mask type, purifier urgency, exercise modification, ventilation, medical alerts -- each with reasoning |
| **Travel** | Origin/destination comparison, health-adjusted advisory levels, preparation checklists, travel kit recommendations |
| **Wearables** | Fitbit OAuth connection, real-time device data display, simulated device cards for demo, activity timeline |
| **Settings** | Health profile intake (11 conditions, lifestyle, medications, family history), home environment, notifications, data privacy controls |

---

## Database Schema (11 Tables)

- **User** -- root entity with city, home type, AC status
- **HealthProfile** -- comprehensive medical history (7 respiratory conditions with severity, 4 systemic conditions, lifestyle factors, medications, family history)
- **FitbitConnection** -- OAuth2 tokens with auto-refresh
- **AQICache** -- real-time AQI with 5-minute TTL
- **HistoricalAQI** -- monthly aggregated pollution data (6-8 years)
- **CityData** -- population health statistics and infrastructure metrics
- **ActivityLog** -- timestamped activity records from any source
- **ExposureLog** -- daily exposure snapshots for trend tracking
- **TravelAdvisory** -- saved travel risk assessments
- **ProductRecommendation** -- curated health products (purifiers, masks, supplements)
- **RecommendationClick** -- engagement analytics

---

## What Makes ExposureTracker Different

1. **Personal, not ambient.** Most apps show city AQI. We show *your* exposure -- factoring in where you are, what you're doing, how you breathe, and what conditions you have.

2. **Medically aware.** 11 health conditions tracked with severity grading. A person with severe asthma sees fundamentally different risk scores and recommendations than a healthy athlete, even in identical air quality.

3. **Wearable-driven, not assumed.** Real Fitbit integration means exposure calculations use your actual steps, heart rate, sleep patterns, and activity timeline -- not generic assumptions.

4. **Fuzzy, not binary.** 50+ fuzzy inference rules produce nuanced recommendations with smooth transitions and human-readable reasoning, not rigid threshold-based alerts.

5. **Predictive, not reactive.** SARIMA models trained on 6-8 years of historical data forecast AQI 6 months ahead with confidence intervals, enabling proactive health planning.

6. **Transparent.** Every data source is labeled (Fitbit vs. Simulated, SARIMA vs. Rule-Based). Every recommendation includes its reasoning chain. Every score shows its component breakdown.

7. **Resilient.** Five external APIs, each with fallback chains. The app degrades gracefully -- never crashes, always communicates what data is real vs. estimated.

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict), Python 3.14 |
| UI | React 19, Tailwind CSS v4, Framer Motion |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| Database | SQLite + Prisma ORM |
| ML/Analytics | pmdarima (SARIMA), scikit-fuzzy (Mamdani inference) |
| Microservice | FastAPI (Python) |
| APIs | WAQI, OpenWeatherMap, OpenMeteo, Nominatim, Fitbit |
| Auth | OAuth 2.0 PKCE (Fitbit) |

---

## Setup

```bash
# Frontend
npm install
npx prisma db push
npm run dev

# Python analytics service (separate terminal)
cd services/analytics-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py
```

Environment variables: `WAQI_API_KEY`, `OPENWEATHERMAP_API_KEY`, `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET`, `DATABASE_URL`, `ANALYTICS_SERVICE_URL`.
