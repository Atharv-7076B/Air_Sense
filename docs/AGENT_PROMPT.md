# Prompt for AI Agent: Complete AirSense — Personalized AQI Exposure Tracker

## Project Context

You are working on **AirSense**, a Next.js 16 + TypeScript app (Tailwind CSS, Prisma/SQLite, Recharts, Framer Motion) that tracks personalized air quality exposure. The project has a working foundation: dashboard, analytics page, recommendations page, wearables page, settings page, Fitbit OAuth2 integration, simulated wearable data, basic exposure calculator, and WAQI API integration for live AQI. It currently supports 10 Indian cities with hardcoded fallback data and uses a rule-based recommendation engine.

**Your job is to elevate this from a basic prototype to a methodical, data-driven, scientifically grounded application.** The core upgrades are: ARIMA-based time series forecasting, Fuzzy logic recommendation engine, individual Resilience & Fitness scoring, a General Population Sustainability Index (GPSI), industrial bias layer, historical sustainability data (6-8 years), health history intake (asthma, pneumonia, past conditions), and city-agnostic operation with travel advisory.

---

## Phase 1: Health Profile & Disease History Intake

**Goal:** Collect the user's health background to personalize all scores and recommendations.

1. **Add a Health Profile page/section** (could be part of Settings or a dedicated onboarding flow) that collects:
   - Age, gender, weight, height, BMI (auto-calculated)
   - Smoking status (never / former / current)
   - **Past and current respiratory conditions**: asthma, pneumonia, COPD, bronchitis, tuberculosis, allergic rhinitis, sinusitis
   - **Other relevant conditions**: cardiovascular disease, diabetes, immunocompromised status, pregnancy
   - Severity level for each (mild / moderate / severe)
   - Duration (how long they've had it)
   - Current medications (free text)
   - Family history of respiratory illness (yes/no)

2. **Update the Prisma schema** with a `HealthProfile` model linked to `User`. Include fields for each condition as booleans + severity enums, plus a JSON field for additional conditions.

3. **Create a sensitivity multiplier function** in `lib/health-multiplier.ts` that takes the health profile and returns a vulnerability score (1.0 = normal, higher = more vulnerable). For example:
   - Asthma (moderate) → 1.6x
   - COPD → 2.0x
   - Smoker + asthma → 2.5x
   - Use published medical literature multipliers (EPA, WHO exposure guidelines)

4. **Wire this into the existing exposure calculator** (`lib/exposure-calculator.ts`) so that the final exposure score accounts for individual health vulnerability.

---

## Phase 2: Real Historical Data — 6 to 8 Years (Sustainability Showcase)

**Goal:** Fetch and display real historical AQI/pollution data for any supported city going back 6-8 years, to showcase environmental sustainability trends.

**DATA SOURCES — use only these real, trusted APIs:**

- **OpenWeatherMap Air Pollution History API** (`/air_pollution/history`) — provides historical PM2.5, PM10, O3, NO2, SO2, CO data given lat/lon and Unix timestamp range. Requires API key (free tier available). This is the primary source for historical pollution data.
- **WAQI API** (already integrated) — for current/recent AQI. Does NOT provide multi-year historical data, so it cannot be the sole source for 6-8 year history.
- **OpenMeteo Air Quality API** (`https://air-quality-api.open-meteo.com/v1/air-quality`) — free, no API key needed, provides historical air quality data (PM2.5, PM10, ozone, NO2, SO2, etc.) with hourly/daily granularity. Supports any lat/lon. Check their historical data availability (goes back several years).

**ASK THE USER:** "I need API keys for OpenWeatherMap (free tier at openweathermap.org/api). Do you already have one, or should I guide you through getting it? Also confirm: should I use OpenMeteo as the primary free source (no key needed) and OpenWeatherMap as secondary?"

**Implementation:**

1. **Create `lib/historical-aqi.ts`** — a service that:
   - Accepts a city name or lat/lon coordinates
   - Fetches monthly/weekly averaged AQI data for the past 6-8 years
   - Aggregates by month for trend analysis
   - Caches results in the database (new `HistoricalAQI` Prisma model) to avoid repeated API calls
   - Normalizes data from different sources into a unified format

2. **Create a Sustainability Analytics section** on the Analytics page (or a new `/sustainability` page) that shows:
   - Line chart: PM2.5 / PM10 / AQI trend over 6-8 years (monthly averages)
   - Year-over-year comparison charts
   - Seasonal patterns (winter spikes in North Indian cities, etc.)
   - Statistical summary: "Delhi PM2.5 has increased/decreased X% over 7 years"
   - Sustainability score for the city (derived from trend direction + absolute levels)

3. **Do NOT hardcode or simulate any historical data.** All data must come from real API calls. If an API doesn't have data for a specific date range, show a clear message to the user rather than fabricating data.

---

## Phase 3: ARIMA Time Series Forecasting

**Goal:** Use ARIMA (AutoRegressive Integrated Moving Average) to forecast future AQI levels for any city.

**Implementation approach:** Since this is a Next.js app (JavaScript/TypeScript), you have two options:

- **Option A (Recommended):** Create a lightweight Python microservice (FastAPI or Flask) that runs ARIMA using `statsmodels` or `pmdarima` (auto-ARIMA). The Next.js app calls this service via API. This is the proper way to do ARIMA.
- **Option B:** Use a JavaScript time-series library if one exists with ARIMA capability (e.g., `arima` npm package). Less robust but keeps the stack unified.

**ASK THE USER:** "For ARIMA forecasting, I recommend a small Python FastAPI microservice using `statsmodels`/`pmdarima` since JavaScript ARIMA libraries are limited. This would run alongside your Next.js app. Is that acceptable, or do you want everything in JS?"

**Implementation:**

1. **ARIMA service** that:
   - Takes historical AQI data (from Phase 2) as input
   - Fits an ARIMA/SARIMA model (seasonal, since AQI has clear seasonal patterns)
   - Returns 7-day, 30-day, and 90-day forecasts with confidence intervals
   - Automatically selects optimal (p,d,q) parameters using auto-ARIMA

2. **Create `lib/arima-client.ts`** in Next.js that calls the ARIMA service and returns forecasted data.

3. **Add forecast visualizations:**
   - Historical data + forecasted line with confidence bands (shaded area)
   - "AQI Forecast" card on the dashboard showing next 7 days predicted AQI
   - Alert if forecasted AQI crosses dangerous thresholds

4. **Use FB Prophet (optional enhancement):** If the user wants, also integrate Facebook Prophet (`prophet` Python package) as an alternative model for comparison. Prophet handles seasonality and holidays well.

---

## Phase 4: Fuzzy Logic Recommendation Engine

**Goal:** Replace the current rule-based recommendation system with a Fuzzy Inference System (FIS) that generates nuanced, personalized recommendations.

**Implementation:**

1. **Create a Fuzzy Logic module** (Python microservice or JS library like `fuzzylogic` / `fuzzysets`):

   **Input variables (fuzzified):**
   - Current AQI level (low / moderate / high / hazardous)
   - Individual exposure score (low / medium / high / very_high)
   - Health vulnerability (low / medium / high) — from Phase 1
   - Fitness level (poor / average / good / excellent) — from Phase 5
   - Time of day (morning / afternoon / evening / night)
   - Activity type (sedentary / light / moderate / vigorous)
   - Forecast trend (improving / stable / worsening) — from Phase 3

   **Output variables:**
   - Outdoor activity safety level (safe / caution / avoid)
   - Mask recommendation (none / optional / recommended / required — and type: N95, KN95, surgical)
   - Air purifier urgency (not_needed / recommended / essential)
   - Exercise modification (normal / reduce_intensity / indoor_only / avoid)
   - Ventilation advice (open_windows / keep_closed / use_purifier)
   - Medical alert level (none / monitor / consult_doctor / emergency)

   **Fuzzy rules (examples):**
   - IF AQI is high AND health_vulnerability is high THEN outdoor_safety is avoid AND mask is required AND medical_alert is consult_doctor
   - IF AQI is moderate AND fitness is good AND vulnerability is low THEN outdoor_safety is caution AND exercise is reduce_intensity
   - IF forecast is worsening AND AQI is moderate THEN purifier_urgency is recommended
   - Define 30-50 comprehensive rules covering all realistic combinations

2. **Defuzzification:** Use centroid method to get crisp output values, then map to recommendation categories.

3. **Update the `/recommendations` page** to display fuzzy-logic-driven recommendations instead of the current rule-based ones. Show the fuzzy inference reasoning (e.g., "Based on your asthma history and today's AQI of 185, outdoor exercise is not recommended").

4. **Product recommendations** should also be driven by fuzzy output: if purifier_urgency is high, recommend specific purifier models; if mask is required, recommend N95 masks with links.

---

## Phase 5: Resilience Score & Fitness Score

**Goal:** Calculate and display two individual scores that reflect how well a person can withstand pollution exposure.

### A. Resilience Score (0-100)

Measures how well the individual can tolerate and recover from pollution exposure. Factors:

- **Health history weight (40%):** Based on conditions from Phase 1. No conditions = high resilience. Asthma/COPD = lower resilience.
- **Age factor (15%):** Young adults (18-35) = highest resilience. Children and elderly = lower.
- **Lifestyle factor (20%):** Smoking status, exercise frequency, diet quality (collect in health profile).
- **Acclimatization factor (15%):** How long they've lived in their current city (longer = more acclimatized to local conditions, slightly higher resilience).
- **Recovery capacity (10%):** Based on resting heart rate, SpO2 levels (from wearable data if available).

Formula: `resilience = Σ(factor_weight × factor_score)` where each factor is normalized to 0-100.

### B. Fitness Score (0-100)

Measures current physical fitness relevant to pollution exposure. Factors:

- **Cardiovascular fitness (30%):** Resting heart rate, heart rate recovery (from Fitbit/wearables). Lower resting HR = better.
- **Activity level (25%):** Average daily steps, active minutes per week.
- **BMI factor (15%):** Normal BMI = highest score. Under/overweight = lower.
- **SpO2 levels (15%):** Average blood oxygen levels from wearable.
- **Sleep quality (15%):** Sleep score from wearable, hours of sleep.

If wearable data is unavailable, use self-reported values (ask user to input manually).

**Implementation:**

1. Create `lib/resilience-score.ts` and `lib/fitness-score.ts` with the calculation logic.
2. Add score display cards to the dashboard — two circular progress indicators showing Resilience and Fitness scores with breakdowns.
3. Add a detailed breakdown page/modal showing how each factor contributes.
4. These scores feed into the Fuzzy recommendation engine (Phase 4) as input variables.

---

## Phase 6: General Population Sustainability Index (GPSI)

**Goal:** Calculate a population-level sustainability/health index for each city and compare it against the individual's scores for personalization.

**GPSI Calculation:**

1. **City-level environmental score (40%):**
   - Average AQI over past year (from real data — Phase 2)
   - AQI trend direction (improving = better score)
   - Number of "hazardous" days per year
   - Seasonal variance (high variance = worse score)

2. **City-level health statistics (30%):**
   - Use WHO / Government of India health data for respiratory disease prevalence by city
   - **ASK THE USER:** "For city-level health statistics (respiratory disease rates, mortality data), I can use WHO Global Health Observatory API or India's National Health Profile data. Should I fetch from WHO API, or do you have a preferred dataset?"

3. **City-level infrastructure score (30%):**
   - Green cover / tree density (can use satellite data APIs or city reports)
   - Public transport vs. private vehicle ratio
   - Industrial zone proximity
   - Healthcare facility density

   **ASK THE USER:** "For city infrastructure data (green cover, transport, healthcare density), should I use a specific government API/dataset, or would you like me to find the best available open data source?"

**Personalization — Individual vs. Population:**

1. Show a comparison dashboard:
   - "Your resilience score: 72 | City average (estimated): 55"
   - "Your exposure risk: Moderate | General population risk for Delhi: High"
   - "You are X% more/less resilient than the estimated city average"

2. Use GPSI as a baseline. Individual scores from Phase 5 are compared against this baseline to generate personalized insights like:
   - "Despite Delhi's high pollution, your fitness level places you in the top 20% for resilience"
   - "Your asthma condition means you're more vulnerable than 80% of the population in this city"

---

## Phase 7: Industrial Bias Layer (Business Perspective)

**Goal:** Add a subtle but transparent business/monetization layer that provides genuinely useful product recommendations while acknowledging the commercial angle.

**Implementation:**

1. **Product recommendation engine** that activates based on fuzzy logic outputs:
   - **Air purifiers:** Recommend specific models based on room size, AQI severity, budget range. Include affiliate-style links (placeholder URLs for now). Brands: Dyson, Blueair, MI, Coway, Honeywell.
   - **Masks:** N95/KN95 recommendations based on AQI level and activity. Show comparison table.
   - **Air quality monitors:** Recommend personal AQI monitors for users who travel frequently.
   - **Health supplements:** Vitamin C, NAC, antioxidants (with disclaimer: "consult your doctor").
   - **Insurance:** Suggest health insurance plans that cover respiratory conditions (generic recommendation).

2. **Travel kit recommendations** (connects to Phase 8):
   - When a user checks a new city, show a "Travel Preparedness Kit" with recommended products for that city's pollution level.

3. **Transparency:**
   - Clearly label all product recommendations as "Sponsored" or "Partner Recommendations"
   - Add a toggle in settings: "Show product recommendations" (on by default)
   - Never let commercial recommendations override health safety advice

4. **Business metrics dashboard** (hidden/admin section):
   - Track recommendation clicks
   - Track which products are most recommended
   - Aggregate anonymized user data for potential B2B insights

---

## Phase 8: City-Agnostic Operation & Travel Advisory

**Goal:** Make the app work for ANY city worldwide, and provide travel health advisories.

**Implementation:**

1. **Replace hardcoded city list** with a dynamic city search:
   - Use **OpenStreetMap Nominatim API** (free, no key) or **Google Places Autocomplete API** (needs key) for city search with autocomplete
   - When user types a city name, fetch lat/lon coordinates
   - Use coordinates to query AQI APIs (WAQI, OpenWeatherMap, OpenMeteo all support lat/lon)

   **ASK THE USER:** "For city search/autocomplete, I can use OpenStreetMap Nominatim (free, no API key) or Google Places API (better autocomplete but needs API key). Which do you prefer?"

2. **Map integration:**
   - Add an interactive map (Leaflet.js with OpenStreetMap tiles — free, no API key) on the dashboard or a dedicated `/map` page
   - Show AQI heatmap overlay for the selected region
   - Allow clicking on the map to select a location
   - Show nearby AQI monitoring stations

3. **Travel Advisory feature:**
   - User inputs destination city and travel dates
   - System fetches current AQI + ARIMA forecast for those dates
   - Compares destination AQI with home city AQI
   - Generates a travel health advisory:
     - "Delhi → Bangalore: AQI improvement expected (285 → 95). No special precautions needed."
     - "Mumbai → Delhi: AQI worsening expected (145 → 285). Pack N95 masks, consider portable air purifier."
   - Suggest travel kit based on destination conditions (connects to Phase 7 industrial bias)
   - If user has asthma/respiratory conditions, add heightened warnings

4. **Ensure historical data availability:** When user selects a new city, check if 6-8 year historical data is available from the APIs. If not, show available range with a note.

---

## Phase 9: Integration, Testing & Polish

1. **Wire everything together:**
   - Dashboard shows: Exposure Score, Resilience Score, Fitness Score, GPSI comparison, AQI forecast, fuzzy recommendations
   - Analytics shows: Historical trends (6-8 years), ARIMA forecasts, sustainability analysis, GPSI trends
   - Recommendations powered entirely by Fuzzy Logic engine with ARIMA forecast input

2. **API route organization:**
   - `/api/health-profile` — CRUD for health data
   - `/api/historical-aqi` — Fetch/cache historical data
   - `/api/forecast` — ARIMA predictions
   - `/api/fuzzy-recommend` — Fuzzy inference
   - `/api/resilience` — Calculate resilience score
   - `/api/fitness` — Calculate fitness score
   - `/api/gpsi` — City GPSI calculation
   - `/api/travel` — Travel advisory
   - `/api/city-search` — City autocomplete

3. **Database updates:**
   - Add models: `HealthProfile`, `HistoricalAQI`, `CityData`, `TravelAdvisory`, `ProductRecommendation`
   - Add proper migrations

4. **Error handling:** Every API call must have proper error handling. No silent failures. Show user-friendly error messages.

5. **Loading states:** Every data-fetching component must show skeleton loaders (already have Skeleton component).

6. **Mobile responsiveness:** Ensure all new sections work on mobile.

---

## Critical Rules

1. **NO FAKE DATA.** Every data point displayed must come from a real API or user input. If an API is unavailable, show an error — do NOT fall back to simulated values for historical/forecast data.
2. **ASK before assuming.** If you need an API key, dataset, or the user to make a decision, ASK. Do not proceed with assumptions.
3. **Methodical execution.** Complete each phase fully before moving to the next. Test each phase independently.
4. **Real APIs only.** Document every API used, its limitations, and rate limits.
5. **Code quality.** TypeScript strict mode, proper error types, no `any` types, proper loading/error states.

---

## APIs Summary (to confirm with user)

| API | Purpose | Key Needed? |
|-----|---------|------------|
| WAQI | Current AQI | Yes (already have) |
| OpenWeatherMap Air Pollution | Historical AQI (6-8 yrs) | Yes (free tier) |
| OpenMeteo Air Quality | Historical AQI (free backup) | No |
| OpenStreetMap Nominatim | City search/geocoding | No |
| Fitbit Web API | Wearable data | Yes (already have) |
| WHO GHO API | Population health statistics | No |
| Leaflet + OSM Tiles | Interactive map | No |
| Python statsmodels/pmdarima | ARIMA forecasting | N/A (local) |

**ASK THE USER before starting:** "Please confirm: (1) Do you have or can you get an OpenWeatherMap API key? (2) Should I set up a Python microservice for ARIMA + Fuzzy, or keep everything in JS? (3) For city search, Nominatim (free) or Google Places (paid)? (4) For population health data, WHO API or India-specific dataset? (5) Any specific product brands/affiliate links you want for the industrial bias section?"
