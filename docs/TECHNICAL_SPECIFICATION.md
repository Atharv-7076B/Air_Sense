# AirSense — Technical Specification & Architecture Document

## 1. System Overview

AirSense is a personalized air quality exposure tracker built with **Next.js 16 + TypeScript** on the frontend and a **Python FastAPI microservice** for advanced analytics. It combines real-time AQI data, wearable fitness data (Fitbit), health profiling, ARIMA time-series forecasting, fuzzy logic recommendations, and population-level sustainability indices into a single cohesive application.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.1.5 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, Framer Motion |
| Charts | Recharts 3.7 |
| Maps | Leaflet + react-leaflet |
| Database | SQLite via Prisma ORM 5.22 |
| Analytics Service | Python 3.14, FastAPI, pmdarima, scikit-fuzzy |
| External APIs | OpenWeatherMap (historical AQI), WAQI (real-time AQI), Nominatim (geocoding), Fitbit Web API |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (port 3000)             │
│  ┌──────────┐ ┌──────────┐ ┌─────┐ ┌──────┐ ┌───────────┐ │
│  │Dashboard │ │Analytics │ │ Map │ │Travel│ │Recommend. │ │
│  └────┬─────┘ └────┬─────┘ └──┬──┘ └──┬───┘ └─────┬─────┘ │
│       │             │          │       │            │       │
│  ┌────┴─────────────┴──────────┴───────┴────────────┴────┐  │
│  │              Next.js API Routes (/api/*)               │  │
│  │  exposure │ health-profile │ resilience │ fitness      │  │
│  │  gpsi │ travel │ fuzzy-recommend │ forecast │ ...      │  │
│  └──┬──────────┬──────────┬──────────────────────┬───────┘  │
│     │          │          │                      │          │
└─────┼──────────┼──────────┼──────────────────────┼──────────┘
      │          │          │                      │
      ▼          ▼          ▼                      ▼
┌──────────┐ ┌────────┐ ┌────────────────┐ ┌──────────────────┐
│  SQLite  │ │External│ │ Python FastAPI │ │   Fitbit API     │
│ (Prisma) │ │  APIs  │ │  (port 8001)   │ │  (OAuth2 PKCE)   │
│          │ │        │ │                │ │                  │
│ User     │ │ OWM    │ │ ARIMA Forecast │ │ Activity data    │
│ Health   │ │ WAQI   │ │ Fuzzy Logic    │ │ Heart rate       │
│ Profile  │ │ Nomin. │ │                │ │ Sleep / SpO2     │
│ History  │ │        │ │                │ │                  │
└──────────┘ └────────┘ └────────────────┘ └──────────────────┘
```

---

## 2. Database Schema (Prisma/SQLite)

### Models

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `User` | Root entity | `id`, `createdAt` |
| `HealthProfile` | 1:1 with User | `age`, `gender`, `bmi`, `smokingStatus`, 7 respiratory conditions (each with boolean + severity enum), `cardiovascularDisease`, `diabetes`, `immunocompromised`, `pregnancy`, lifestyle fields |
| `FitbitConnection` | OAuth2 tokens | `accessToken`, `refreshToken`, `expiresAt`, `fitbitUserId` |
| `HistoricalAQI` | Cached AQI history | `city`, `lat`, `lon`, `date`, `pm25..co`, `aqi`, `source`, `period` — unique on `[city, date, period]` |
| `CityData` | Population health stats | `city`, `respiratoryPrevalence`, `mortalityRate`, `greenCoverPercent`, etc. |

### Enums

- `SmokingStatus`: NEVER, FORMER, CURRENT
- `Severity`: MILD, MODERATE, SEVERE
- `ExerciseFrequency`: SEDENTARY, LIGHT, MODERATE, ACTIVE, VERY_ACTIVE
- `DietQuality`: POOR, FAIR, GOOD, EXCELLENT

---

## 3. Feature Specifications

### 3.1 Health Profile & Vulnerability Scoring

**File:** `lib/health-multiplier.ts`

Computes a vulnerability multiplier (1.0–3.0) from the user's health profile using EPA/WHO guidelines.

**Algorithm:**

```
1. Base multiplier = 1.0

2. Respiratory conditions (highest taken as primary, rest diminishing):
   - Asthma:     MILD=1.3x, MODERATE=1.6x, SEVERE=2.0x
   - COPD:       MILD=1.5x, MODERATE=2.0x, SEVERE=2.5x
   - Bronchitis:  MILD=1.2x, MODERATE=1.5x, SEVERE=1.8x
   - Pneumonia:   MILD=1.1x, MODERATE=1.3x, SEVERE=1.5x

   Primary condition: full multiplier
   Additional conditions: +10% of their multiplier each (diminishing)

3. Other conditions (additive):
   - Cardiovascular: +0.2-0.5 based on severity
   - Diabetes: +0.1-0.2
   - Immunocompromised: +0.3
   - Pregnancy: +0.2

4. Age factor:
   - <5 or >65: +0.3
   - 5-18 or 50-65: +0.1
   - 18-50: +0.0

5. Smoking:
   - FORMER: +0.15
   - CURRENT: +0.35

6. Final = min(compounded_score, 3.0)
```

**Output type:** `HealthVulnerability { score: number, factors: string[], riskLevel: 'low'|'medium'|'high' }`

### 3.2 Exposure Calculator

**File:** `lib/exposure-calculator.ts`

Computes a personal exposure score from base AQI, activity timeline, and environmental modifiers.

**Algorithm:**

```
For each activity period in the day:
  1. base = cityAQI
  2. if indoor:
       indoor_factor = hasAC ? 0.35 : 0.65  (AC removes 65% of particulates)
       base *= indoor_factor
  3. activity_multiplier:
       sedentary=0.8, light=1.0, moderate=1.5, vigorous=2.5
       (increased respiration rate draws more pollutants)
  4. location_modifier:
       near_highway=1.2, near_construction=1.3, near_park=0.85
  5. period_exposure = base * activity_multiplier * location_modifier * (duration/total_minutes)

personalScore = sum(period_exposures) * healthMultiplier
riskCategory = personalScore <= 50 → low | <=100 → moderate | <=150 → high | else → very_high
```

**Response fields:** `personalScore`, `riskCategory`, `indoorPercent`, `avgActivityLevel`, `totalSteps`, `avgHeartRate`, `hourlyExposure[]`, `insights[]`

### 3.3 Historical AQI Data Pipeline

**File:** `lib/historical-aqi.ts`

Fetches 6–8 years of historical air quality data per city.

**Data flow:**
```
1. Check Prisma cache for existing monthly data
2. For missing date ranges:
   a. Primary: OpenWeatherMap Air Pollution History API
      - Endpoint: /data/2.5/air_pollution/history?lat={}&lon={}&start={}&end={}
      - Returns hourly: PM2.5, PM10, O3, NO2, SO2, CO concentrations
      - Rate limited: 200ms delay between 30-day chunk requests
   b. Fallback: Open-Meteo Air Quality API (free, no key)
      - Endpoint: /v1/air-quality?latitude={}&longitude={}&hourly=pm2_5,pm10,...
3. Aggregate hourly data → monthly averages
4. Convert PM2.5 → AQI using EPA breakpoint formula:
   AQI = ((AQI_hi - AQI_lo) / (BP_hi - BP_lo)) * (C - BP_lo) + AQI_lo
5. Cache results in HistoricalAQI table
6. Calculate trend: linear regression on PM2.5 over time
   - pm25Trend: 'improving' (>5% decrease) | 'stable' | 'worsening' (>5% increase)
   - sustainabilityScore: 0-100 based on absolute levels + trend direction
```

**Supported cities (with lat/lon):** Delhi, Mumbai, Pune, Bangalore, Chennai, Kolkata, Hyderabad, Ahmedabad, Jaipur, Lucknow

### 3.4 ARIMA Time-Series Forecasting

**Service:** `services/analytics-service/arima_model.py`
**Client:** `lib/arima-client.ts`

Uses SARIMA (Seasonal ARIMA) to forecast future AQI from historical monthly data.

**Algorithm:**
```
1. Input: Monthly AQI values (minimum 12 data points)
2. pmdarima auto_arima selects optimal (p,d,q)(P,D,Q,s) parameters:
   - max_p=5, max_q=5, max_P=2, max_Q=2
   - seasonal period m=12 (monthly seasonality)
   - stepwise=True for efficient search
   - n_fits=50 maximum iterations
3. If SARIMA fails → fallback to non-seasonal ARIMA(p,d,q)
4. Generate n_periods forecasts with confidence intervals
   - alpha = 1 - confidence_level (default 95%)
5. Output: {date, value, lower_bound, upper_bound}[] + model_order, AIC, RMSE
```

**API:** `GET /api/forecast?city=Delhi&days=180` → 6-month forecast
**Python:** `POST http://127.0.0.1:8001/forecast` with `{dates, values, forecast_days, seasonal, confidence_level}`

**Verified model output:** SARIMA(1,0,0)(1,0,0,12), RMSE=51.56 for Delhi

### 3.5 Fuzzy Logic Recommendation Engine

**Service:** `services/analytics-service/fuzzy_engine.py`
**Client:** `lib/fuzzy-client.ts`

A 7-input, 6-output fuzzy inference system using Mamdani-type rules with centroid defuzzification.

**Input variables (Antecedents):**

| Variable | Range | Membership Functions |
|----------|-------|---------------------|
| AQI | 0–500 | good, moderate, unhealthy_sensitive, unhealthy, hazardous |
| Exposure Score | 0–500 | low, medium, high, very_high |
| Health Vulnerability | 0–30 (scaled from 1.0–3.0) | low, medium, high |
| Fitness Level | 0–100 | poor, average, good, excellent |
| Time of Day | 0–24 | morning, afternoon, evening, night |
| Activity Type | 0–3.9 | sedentary, light, moderate, vigorous |
| Forecast Trend | -10 to 10 | improving, stable, worsening |

**Output variables (Consequents):**

| Variable | Range | Membership Functions | Example Output |
|----------|-------|---------------------|---------------|
| Outdoor Safety | 0–100 | safe, caution, avoid | "Avoid" (69.9) |
| Mask Recommendation | 0–100 | none, optional, recommended, required | "Required — N95" (77.8) |
| Purifier Urgency | 0–100 | not_needed, recommended, essential | "Recommended" (69.9) |
| Exercise Modification | 0–100 | normal, reduce, indoor_only, avoid | "Indoor only" (62.1) |
| Ventilation | 0–100 | open_windows, keep_closed, use_purifier | "Use purifier" (84.9) |
| Medical Alert | 0–100 | none, monitor, consult, emergency | "Monitor" (39.2) |

**Rule base:** 50+ rules covering AQI×vulnerability, exposure-based, time-of-day, fitness-based, and forecast-trend combinations.

**Mask type mapping:** value<25→None, 25-55→Surgical, 55-80→KN95, 80+→N95

**Fallback:** If Python service is unavailable, the recommendations page falls back to a rule-based engine in `lib/ai-client.ts`.

### 3.6 Resilience Score

**File:** `lib/resilience-score.ts`

A 0–100 score measuring how well-equipped a person is to handle pollution exposure.

**Formula:**
```
Score = Σ (factor_score × weight)

Factor               Weight   Computation
─────────────────────────────────────────────────────────────
Health History        40%     100 - (healthMultiplier - 1.0) × 50  [capped 0-100]
Age Factor            15%     Peak at 25-35 (100), declining gaussian curve
Lifestyle             20%     smoking(40%) + exercise(40%) + diet(20%)
                              NEVER=100, FORMER=60, CURRENT=20 (smoking)
                              VERY_ACTIVE=100...SEDENTARY=20 (exercise)
Acclimatization       15%     ln(years+1) / ln(21) × 100  [logarithmic, caps at 20yr]
Recovery Capacity     10%     From wearables: restingHR<60→90, SpO2>97→95
                              Default: 50 when no wearable data
```

**Levels:** ≥80→excellent, ≥60→good, ≥40→average, ≥25→below_average, <25→poor

### 3.7 Fitness Score

**File:** `lib/fitness-score.ts`

A 0–100 score measuring physical fitness relevant to pollution resilience.

**Formula:**
```
Score = Σ (factor_score × weight)

Factor               Weight   Computation
─────────────────────────────────────────────────────────────
Cardiovascular        30%     restingHR<60→90, 60-70→70, 70-80→50, >80→30
                              HRrecovery: >30bpm/min→90, >20→70, >10→50
Activity Level        25%     steps≥12k→95, ≥10k→80, ≥7k→60, ≥5k→40
                              activeMinutes≥300/wk→95...
BMI                   15%     18.5-24.9→100, 25-29.9→70, <18.5→60, ≥30→40
Blood Oxygen          15%     SpO2≥98→100, ≥97→90, ≥95→70, ≥93→40
Sleep Quality         15%     7-9hrs→90, 6-7→70, <6→40
                              sleepScore≥85→95...
```

**Data sources:** Fitbit wearable (when connected) → self-reported defaults (50) when unavailable

### 3.8 GPSI (General Population Sustainability Index)

**File:** `lib/gpsi.ts`

A city-level 0–100 score combining environmental, health, and infrastructure factors.

**Formula:**
```
GPSI = Environmental(40%) + Health(30%) + Infrastructure(30%)

Environmental (from historical AQI):
  - Base: PM2.5 avg (<12→50pts, <25→40, <35→30, <55→20, <100→10, else→5)
  - Trend: improving→30pts, stable→15, worsening→5
  - Sustainability bonus: sustainabilityScore × 0.2

Health (from curated WHO/NHP data):
  - Respiratory prevalence: <6%→35pts ... ≥12%→5pts
  - Mortality rate: <35→35pts ... ≥80→5pts
  - Life expectancy: >76→30pts ... ≤70→6pts

Infrastructure (from curated open data):
  - Green cover: >25%→30pts ... <10%→6pts
  - Healthcare density: >45/100k→25pts ... <25→8pts
  - Public transport: score×0.25
  - Industrial density penalty: (100-density)×0.2
```

**Comparison:** Estimates city average resilience from health stats, compares with user's personal resilience score to generate percentile ranking.

**Data source:** `lib/city-health-data.ts` — curated dataset for 10 Indian cities from NHP 2022, WHO GHO, Census 2011.

### 3.9 City Search & Geocoding

**File:** `lib/city-search.ts`

Uses OpenStreetMap Nominatim API (free, no key required).

- `searchCities(query, limit)` → autocomplete with debounce (300ms)
- `reverseGeocode(lat, lon)` → location name from coordinates
- Filters results to `class=place` or `type=city/town/administrative`
- Returns: `{ name, displayName, lat, lon, country, state, type }`

**Frontend:** `components/ui/city-search.tsx` — debounced input with dropdown results, used across Dashboard, Analytics, Recommendations, Settings pages.

### 3.10 Travel Advisory System

**File:** `lib/travel-advisory.ts`

Compares origin and destination AQI with health-profile-aware warnings.

**Algorithm:**
```
1. aqiChange = destAQI - originAQI
2. direction = change<-20→'better' | change>20→'worse' | else→'same'
3. effectiveAQI = destAQI × healthVulnerability
4. Advisory level:
   - effectiveAQI>300 → danger
   - effectiveAQI>200 → warning
   - effectiveAQI>150 or (worse && destAQI>100) → caution
   - else → safe
5. Generate preparations checklist (N95 masks, purifiers, medications...)
6. Attach travel kit (product recommendations filtered for portability)
```

**Output:** `TravelAdvisory { level, summary, details[], aqiComparison, preparations[], travelKit[] }`

### 3.11 Product Recommendations

**File:** `lib/product-recommendations.ts`

Curated database of 14 products for the Indian market:
- 5 air purifiers (Dyson, Mi, Coway, Honeywell, Sharp)
- 3 masks (3M N95, Venus N95, Cambridge N99)
- 2 monitors (IQAir AirVisual Pro, Temtop M10)
- 2 supplements (Vitamin C, NAC)

Recommendation logic matches AQI severity to product categories with urgency scoring. Products are labeled "Partner Recommendations" for transparency.

### 3.12 Map Visualization

**Page:** `app/map/page.tsx`
**Component:** `components/map/aqi-map.tsx`

Interactive Leaflet.js map with:
- OpenStreetMap tiles
- CircleMarker overlays colored by AQI (green→red→purple gradient)
- Marker radius scales with AQI severity
- Click-to-select with detail panel showing pollutant breakdown
- "My Location" geolocation button
- City search integration

### 3.13 Wearable Integration (Fitbit)

**Files:** `lib/fitbit-client.ts`, `lib/fitbit-transformer.ts`, `app/api/fitbit/`

OAuth2 PKCE flow for Fitbit Web API:
- Activity data (steps, active minutes, activity type)
- Heart rate (resting HR, intraday)
- Sleep (duration, stages, score)
- SpO2 (blood oxygen)

Data feeds into: Exposure calculator, Fitness score, Resilience score (recovery capacity).

---

## 4. API Reference

### Frontend → Next.js API Routes

| Endpoint | Method | Parameters | Response | Notes |
|----------|--------|-----------|----------|-------|
| `/api/exposure` | GET | `city`, `hasAC`, `homeType`, `period` | `{exposure, riskDetails, cityAQI, dataSource, healthMultiplier}` | Auto-fetches Fitbit + health multiplier |
| `/api/health-profile` | GET | — | `{profile, userId}` | |
| `/api/health-profile` | POST | Full health profile body | `{profile, success}` | BMI auto-calculated |
| `/api/city-search` | GET | `q`, `limit` | `{results: CitySearchResult[]}` | Nominatim proxy |
| `/api/resilience` | GET | — | `{score, breakdown[], interpretation, level}` | |
| `/api/fitness` | GET | — | `{score, breakdown[], interpretation, level}` | |
| `/api/gpsi` | GET | `city` | `{city, score, breakdown, cityStats, comparison}` | Includes user comparison |
| `/api/travel` | POST | `{originCity, destinationCity, travelDate}` | `{advisory, originAQIData, destinationAQIData}` | |
| `/api/fuzzy-recommend` | POST | `{aqi, exposureScore, timeOfDay, activityType, forecastTrend}` | `{recommendations: FuzzyRecommendations, inputs}` | Auto-fetches health vulnerability |
| `/api/historical-aqi` | GET | `city`, `years` | `{city, data[], yearOverYear[], summary}` | Real OWM data, cached |
| `/api/forecast` | GET | `city`, `days` | `{city, historical[], forecast[], model}` | Requires Python service |

### Next.js → Python Analytics Service

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `POST /forecast` | POST | `{dates[], values[], forecast_days, seasonal, confidence_level}` | `{forecast[], model_order, aic, rmse, data_points_used}` |
| `POST /recommend` | POST | `{aqi, exposure_score, health_vulnerability, fitness_level, time_of_day, activity_type, forecast_trend}` | `{outdoor_safety, mask_recommendation, purifier_urgency, exercise_modification, ventilation_advice, medical_alert, reasoning[]}` |
| `GET /health` | GET | — | `{status, service, version}` |

---

## 5. Data Flow Examples

### Dashboard Load Sequence
```
1. Page mounts → fetch /api/exposure?city=Mumbai&hasAC=true
2. API route:
   a. getSimulatedAQI("Mumbai") → AQI data with pollutants
   b. getHealthMultiplier() → queries Prisma for health profile → 1.3x (mild asthma)
   c. getFitbitActivities() → tries Fitbit OAuth, falls back to simulated
   d. calculateExposure({baseAQI, activities, hasAC, healthMultiplier})
   e. Returns {exposure, riskDetails, cityAQI, dataSource, healthMultiplier}
3. ScoreCards component → parallel fetch /api/resilience + /api/fitness
4. ForecastCard → getSimulatedForecast(city, 7)
5. GPSIComparison → fetch /api/gpsi?city=Mumbai
   a. Fetches historical AQI for environmental score
   b. Reads health profile for user resilience comparison
   c. Returns GPSI score with breakdown and comparison
```

### Fuzzy Recommendation Flow
```
1. Recommendations page calculates local AQI + exposure
2. POST /api/fuzzy-recommend {aqi: 180, exposureScore: 70, ...}
3. API route:
   a. Reads health vulnerability from DB → 1.3 (asthma)
   b. Checks Python service health → /health returns {service: "analytics"}
   c. Calls Python service POST /recommend with all 7 inputs
4. Python fuzzy_engine.py:
   a. Scales vulnerability: (1.3 - 1.0) × 15 = 4.5
   b. Sets all 7 inputs on simulation
   c. Computes fuzzy inference (centroid defuzzification)
   d. Maps outputs to labels (N95 mask, Avoid outdoor, etc.)
   e. Generates reasoning strings
5. Returns structured recommendations to frontend
6. If Python unavailable → falls back to rule-based engine (lib/ai-client.ts)
```

---

## 6. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite path: `file:./dev.db` |
| `OPENWEATHERMAP_API_KEY` | Yes | For historical AQI data |
| `ANALYTICS_SERVICE_URL` | No | Python service URL (default: `http://127.0.0.1:8001`) |
| `FITBIT_CLIENT_ID` | No | Fitbit OAuth2 client ID |
| `FITBIT_CLIENT_SECRET` | No | Fitbit OAuth2 client secret |
| `NEXTAUTH_URL` | No | Base URL for OAuth callbacks |

---

## 7. Running the Application

```bash
# 1. Install dependencies
npm install
cd services/analytics-service && python3 -m venv venv
source venv/bin/activate && pip install -r requirements.txt

# 2. Setup database
npx prisma db push

# 3. Start Python analytics service
cd services/analytics-service
source venv/bin/activate && python main.py
# Runs on http://127.0.0.1:8001

# 4. Start Next.js (separate terminal)
npm run dev
# Runs on http://localhost:3000
```

---

## 8. Compatibility Audit Summary

All frontend→backend parameter mappings have been verified:

| Route | Frontend Caller | Status |
|-------|----------------|--------|
| `/api/exposure` | `app/page.tsx` | Params match: city, hasAC, homeType. Response fields: exposure, cityAQI, dataSource, healthMultiplier all consumed correctly |
| `/api/health-profile` | `components/settings/health-profile-form.tsx` | GET returns {profile, userId}. POST accepts full body with all condition fields |
| `/api/city-search` | `components/ui/city-search.tsx` | Sends q + limit. Reads results[].name/state/country/lat/lon |
| `/api/resilience` | `components/dashboard/score-cards.tsx` | Returns {score, breakdown[], interpretation, level}. Frontend types match ResilienceResult |
| `/api/fitness` | `components/dashboard/score-cards.tsx` | Returns {score, breakdown[], interpretation, level}. Frontend types match FitnessResult |
| `/api/gpsi` | `components/dashboard/gpsi-comparison.tsx` | Returns {score, breakdown.{environmental,health,infrastructure}, comparison.{userResilience,cityAvgResilience,percentile,insight}} — frontend interface matches |
| `/api/travel` | `app/travel/page.tsx` | POST sends {originCity, destinationCity, travelDate}. Response advisory.travelKit mapped as ProductRecommendation[] with rec.product.* fields |
| `/api/fuzzy-recommend` | `app/recommendations/page.tsx` | POST sends {aqi, exposureScore, timeOfDay, activityType, forecastTrend}. API auto-adds healthVulnerability + fitnessLevel. Response.recommendations maps to FuzzyRecommendations type |
| `/api/historical-aqi` | `app/analytics/page.tsx` | GET sends city + years. Response {data[], yearOverYear[], summary} consumed by SustainabilityChart |
| `/api/forecast` | `app/api/forecast/route.ts` | Passes dates[] + values[] to Python. Python ForecastRequest field names match client mapping |
| Python `/recommend` | `lib/fuzzy-client.ts` | Client sends exposure_score → Python FuzzyInput.exposure_score. All 7 fields mapped with snake_case conversion |
| Python `/forecast` | `lib/arima-client.ts` | Client sends forecast_days → Python ForecastRequest.forecast_days. Response model_order/aic/rmse mapped correctly |

**Legacy routes** (no frontend callers): `/api/aqi`, `/api/simulate`, `/api/ai` — retained for potential direct API usage.
