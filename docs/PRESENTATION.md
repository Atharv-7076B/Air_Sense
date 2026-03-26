# ExposureTracker — Evaluator Presentation Guide

## The Problem (30 seconds)

Every air quality app shows one number for an entire city. A construction worker outdoors, an asthmatic child, and a healthy adult in an AC office all see the same AQI. Their actual pollution intake differs by 3-5x. People either over-panic or dangerously ignore air quality because the information isn't relevant to **them**.

## Our Solution (30 seconds)

ExposureTracker computes a **personalized exposure score** — what you actually breathe, not what's in the ambient air. It combines real-time AQI, your activity from Fitbit, your medical history, and your environment to show your real pollution intake.

**Example:** A Mumbai office worker with AC sees personal exposure of 45 against city AQI of 145 (60% reduction — accurate). Someone with COPD exercising outdoors in the same city sees 190 with specific protective recommendations. Same air, different reality.

---

## Core Algorithms & Models

### 1. Personal Exposure Score (The Core Innovation)

**What it does:** Calculates how much pollution you actually inhale throughout the day, instead of just showing ambient air quality.

**How it works in simple terms:**
- Start with the city's AQI as a baseline
- If you're **indoors with AC**, reduce by ~65% (AC filters out most particles)
- If you're **running**, multiply by 3x (you breathe 3x faster while running)
- If you're **near a highway**, add 30% (traffic pollution hotspot)
- Finally, multiply by your **health vulnerability** (a person with severe asthma is more affected)

**Formula:**
```
Personal Score = City AQI x Indoor Factor x Breathing Rate x Location Modifier x Health Vulnerability
```

**Key multipliers:**

| Factor | Values |
|--------|--------|
| Indoor (apartment + AC) | 0.35x (filters 65%) |
| Indoor (house, no AC) | 0.65x (filters 35%) |
| Outdoor | 1.0x (full exposure) |
| Sleeping | 0.5x breathing rate |
| Walking | 1.5x breathing rate |
| Running | 3.0x breathing rate |
| Near highway | 1.3x location penalty |
| Near construction | 1.4x location penalty |
| Near park | 0.95x (slight benefit) |

**Output:** Score 0-300, risk category (low/moderate/high/very high), hourly breakdown, and contextual insights.

**Why this matters:** This is grounded in pulmonary physiology — your lungs take in pollutants proportional to your ventilation rate. Running = more breaths = more pollution inhaled.

---

### 2. Health Vulnerability Multiplier

**What it does:** Scores how sensitive a person is to pollution based on their medical profile. Used as a multiplier across the entire system.

**How it works in simple terms:**
- Start at 1.0x (healthy baseline)
- Each medical condition adds vulnerability
- The most severe respiratory condition dominates; others add smaller amounts
- Age, smoking, pregnancy, and systemic conditions compound further
- Capped at 3.0x maximum

**Condition weights (examples):**

| Condition | Mild | Moderate | Severe |
|-----------|------|----------|--------|
| Asthma | 1.3x | 1.6x | 2.0x |
| COPD | 1.5x | 2.0x | 2.5x |
| Bronchitis | 1.2x | 1.5x | 1.8x |

**Additional factors:**
- Current smoker: +0.5
- Age >75: +0.6
- Cardiovascular disease: +0.2 to +0.5
- Pregnancy: +0.3
- Immunocompromised: +0.5

**Output:** Multiplier (1.0-3.0), list of contributing factors, risk level.

**Why this matters:** A healthy 25-year-old (1.0x) and a 70-year-old with severe COPD and smoking history (~2.8x) experience the same air quality very differently. This captures that medically.

---

### 3. SARIMA Forecasting (Predicting Future Air Quality)

**What it does:** Predicts AQI 6 months into the future using 6-8 years of historical pollution data.

**How it works in simple terms:**
- Collect monthly average AQI data going back 6-8 years from real APIs (OpenWeatherMap, OpenMeteo)
- Feed this into a SARIMA model — a statistical time-series model that captures both **trends** (is pollution getting worse over time?) and **seasonality** (winter is always worse in Delhi, monsoon cleans Mumbai's air)
- The model automatically finds the best parameters through a stepwise search
- Produces forecasts with **confidence bands** (95% confidence interval) so users know the uncertainty

**What is SARIMA?**
- **S**easonal **A**uto-**R**egressive **I**ntegrated **M**oving **A**verage
- **Auto-Regressive (AR):** Future values depend on past values ("if AQI was high last month, it's likely high this month")
- **Integrated (I):** Handles trends by differencing the data
- **Moving Average (MA):** Accounts for past prediction errors
- **Seasonal:** Captures repeating yearly patterns (e.g., Delhi's winter smog every November-January)

**Technical details:**
- Library: `pmdarima` (Python) with `auto_arima` for automatic parameter selection
- Parameters searched: p,q in [0,5], P,Q in [0,2], seasonal period = 12 months
- Minimum 12 data points required
- Falls back to non-seasonal ARIMA if seasonal fit fails

**Output:** Monthly forecasted AQI values with upper/lower bounds, model order, AIC (model quality), RMSE (prediction accuracy).

**Verified result:** For Delhi, the model found SARIMA(1,0,0)(1,0,0,12) with RMSE of 51.56 — meaning predictions are typically within ~52 AQI points of actual values.

---

### 4. Fuzzy Logic Recommendation Engine

**What it does:** Generates nuanced, personalized health recommendations instead of rigid "stay indoors" alerts.

**Why fuzzy logic instead of simple rules?**
Simple rules create harsh cutoffs: "AQI > 150 = stay indoors." But the difference between AQI 149 and 151 is negligible — the recommendation shouldn't flip suddenly. Fuzzy logic provides **smooth transitions** between categories, producing more natural and realistic guidance.

**How it works in simple terms:**
1. **Fuzzify inputs:** Convert crisp numbers into degrees of membership. Example: AQI of 120 might be "60% moderate" and "40% unhealthy for sensitive groups" simultaneously
2. **Apply rules:** 45+ rules like "IF AQI is unhealthy AND vulnerability is high THEN mask is required AND outdoor safety is avoid"
3. **Combine outputs:** Rules that fire partially produce partial outputs, which are combined
4. **Defuzzify:** Convert the fuzzy output back to a crisp number using centroid method (center of gravity)

**7 Inputs:**

| Input | What it captures |
|-------|-----------------|
| AQI (0-500) | Current air quality |
| Exposure Score (0-500) | Your personal exposure |
| Health Vulnerability (1.0-3.0) | Your medical sensitivity |
| Fitness Level (0-100) | Your physical capacity |
| Time of Day (0-24) | Morning/afternoon/evening/night |
| Activity Type (0-3) | Sedentary to vigorous |
| Forecast Trend (-1 to +1) | Is air quality improving or worsening? |

**6 Outputs:**

| Output | Example |
|--------|---------|
| Outdoor Safety | "Avoid outdoor activities" (score: 69.9) |
| Mask Recommendation | "Required — N95" (score: 77.8) |
| Purifier Urgency | "Recommended" (score: 69.9) |
| Exercise Modification | "Indoor only" (score: 62.1) |
| Ventilation Advice | "Use purifier" (score: 84.9) |
| Medical Alert | "Monitor symptoms" (score: 39.2) |

**Mask type mapping:** Score <25 = None, 25-55 = Surgical, 55-80 = KN95, 80+ = N95

**Each recommendation includes a reasoning string** explaining why (e.g., "Moderate AQI combined with high health vulnerability and vigorous outdoor activity warrants N95 mask usage").

**Technical details:**
- Mamdani-type fuzzy inference system
- Trapezoidal membership functions
- Centroid defuzzification
- Library: `scikit-fuzzy` (Python)
- Fallback: JavaScript rule-based engine if Python service is unavailable

---

### 5. Resilience Score

**What it does:** Measures how well-equipped you are to handle pollution exposure (0-100).

**How it works:** Weighted average of 5 factors:

| Factor | Weight | What it measures |
|--------|--------|-----------------|
| Health History | 40% | Inverse of vulnerability — fewer conditions = higher resilience |
| Age Factor | 15% | Peak at 25-35, declining for elderly and very young |
| Lifestyle | 20% | Smoking status (40%), exercise frequency (35%), diet quality (25%) |
| City Acclimatization | 15% | Years lived in current city — logarithmic (most benefit in first 5 years) |
| Recovery Capacity | 10% | From wearable: resting heart rate and SpO2 |

**Acclimatization formula:** `30 + 70 x ln(years + 1) / ln(21)` — this means a person living in Delhi for 5 years has significantly better acclimatization than a newcomer, but gains diminish after ~10 years.

**Levels:** Excellent (80+), Good (60-79), Average (40-59), Below Average (25-39), Poor (<25)

---

### 6. Fitness Score

**What it does:** Measures physical fitness relevant to pollution resilience (0-100), driven by wearable data.

**How it works:** Weighted average of 5 factors:

| Factor | Weight | Data Source | Scoring |
|--------|--------|-------------|---------|
| Cardiovascular Health | 30% | Resting HR + HR recovery | Lower resting HR = better (50bpm = 100pts) |
| Activity Level | 25% | Daily steps + active minutes | 12k+ steps = 100pts |
| BMI | 15% | User profile | 18.5-24.9 = 100pts (normal range) |
| Blood Oxygen (SpO2) | 15% | Fitbit | 98%+ = 100pts |
| Sleep Quality | 15% | Fitbit | 7-9 hours = optimal |

**Why fitness matters for pollution:** Fitter individuals have better lung capacity, more efficient oxygen transport, and faster recovery from pollution exposure. This score quantifies that advantage.

---

### 7. GPSI (General Population Sustainability Index)

**What it does:** Rates cities on a 0-100 scale for how sustainable and healthy they are for their residents.

**How it works:** Weighted composite of three pillars:

| Pillar | Weight | Components |
|--------|--------|------------|
| Environmental | 40% | Average PM2.5 levels + trend direction (improving/stable/worsening) + sustainability trajectory |
| Health | 30% | Respiratory disease prevalence + pollution-related mortality + life expectancy |
| Infrastructure | 30% | Green cover % + healthcare density + public transport quality - industrial zone penalty |

**Data sources:** Curated from WHO Global Health Observatory, National Health Profile 2022, Census 2011 for 10 Indian cities.

**Comparison feature:** Estimates the city's average resilience from health statistics, then shows where the user's personal resilience ranks as a percentile.

---

### 8. Travel Advisory System

**What it does:** Compares air quality between origin and destination cities with health-personalized risk levels.

**How it works:**
1. Fetch real-time AQI for both cities
2. Calculate `effectiveAQI = destination AQI x health vulnerability`
3. Determine advisory level:
   - **Safe:** effectiveAQI <= 150
   - **Caution:** effectiveAQI 150-200 OR worsening direction with AQI > 100
   - **Warning:** effectiveAQI 200-300
   - **Danger:** effectiveAQI > 300
4. Generate preparation checklist scaled to risk
5. Recommend travel kit (masks, purifiers, supplements)

**Why health-personalized:** A healthy person traveling to a city with AQI 160 sees "Caution." A person with severe asthma (vulnerability 2.0x) sees effectiveAQI = 320 = "Danger." Same destination, different medical reality.

---

## System Architecture (For Technical Evaluators)

```
+----------------------------------------------------------+
|              Next.js Frontend (React 19)                  |
|   Dashboard | Analytics | Map | Recommendations | Travel |
|                                                          |
|              16 API Routes (Next.js)                      |
+------+------------+------------+------------+-------------+
       |            |            |            |
       v            v            v            v
  +---------+  +--------+  +-----------+  +--------+
  | SQLite  |  |External|  |  Python   |  | Fitbit |
  | Prisma  |  |  APIs  |  | FastAPI   |  | OAuth  |
  | 11 tbls |  |        |  | Port 8001 |  | PKCE   |
  |         |  | WAQI   |  |           |  |        |
  | Users   |  | OWM    |  | SARIMA    |  | Steps  |
  | Health  |  | Meteo  |  | Fuzzy     |  | HR     |
  | Cache   |  | Nomin. |  | Logic     |  | Sleep  |
  +---------+  +--------+  +-----------+  +--------+
```

**Key design principle: Graceful Degradation**
- WAQI API fails → fallback to cached data → fallback to city baselines
- Fitbit not connected → deterministic simulation (clearly labeled)
- Python service down → JavaScript rule-based fallback
- The app **never breaks** — it shows badges indicating data source transparency

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, Framer Motion |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| Database | SQLite + Prisma ORM (11 tables) |
| ML/Analytics | pmdarima (SARIMA), scikit-fuzzy (Mamdani) |
| Microservice | Python FastAPI |
| External APIs | WAQI, OpenWeatherMap, OpenMeteo, Nominatim, Fitbit |

---

## What Makes This Different (Closing Points)

1. **Personal, not ambient** — your exposure, not the city's number
2. **Medically aware** — 11 conditions with severity grading change everything
3. **Wearable-driven** — real Fitbit data, not assumptions
4. **Fuzzy, not binary** — smooth recommendations with reasoning, not rigid cutoffs
5. **Predictive** — 6-month SARIMA forecasts from 6-8 years of real data
6. **Transparent** — every data source labeled, every recommendation explained
7. **Resilient** — 5 external APIs, each with fallback chains, never crashes

---

## Anticipated Evaluator Questions

**Q: Why SARIMA over deep learning (LSTM, etc.)?**
A: SARIMA is the right tool for this data. We have ~72-96 monthly data points per city — far too few for deep learning to generalize. SARIMA handles seasonality natively (Delhi's winter spikes, Mumbai's monsoon dips), is interpretable (you can see the model order), and provides statistically rigorous confidence intervals. For monthly environmental data with clear seasonal patterns, SARIMA outperforms black-box models.

**Q: Why fuzzy logic instead of a neural network for recommendations?**
A: Health recommendations need to be **explainable**. A neural network might say "wear N95" but can't explain why. Our fuzzy system produces reasoning chains ("Moderate AQI + high vulnerability + vigorous activity = N95 required"). For health-critical decisions, transparency is non-negotiable. Fuzzy logic also handles the smooth transitions between risk categories that rigid rules cannot.

**Q: How accurate is the exposure calculation?**
A: The multipliers are derived from EPA indoor air quality research (indoor filtration rates), pulmonary physiology literature (ventilation rate by activity), and WHO guidelines (vulnerability factors). While not a substitute for personal air quality monitors, it provides a scientifically grounded estimate that is far more accurate than showing raw city AQI to everyone.

**Q: What happens when APIs are down?**
A: Every external dependency has a fallback chain. WAQI → cached data → city baselines. Fitbit → deterministic simulation. SARIMA → rule-based forecasting. Fuzzy logic → JavaScript rule engine. The app always works and always tells the user what data source is being used.

**Q: Is the health data secure?**
A: Health profiles are stored locally in SQLite. Fitbit uses OAuth 2.0 PKCE (no client secret exposed to browser). No health data is sent to external services — the Python microservice only receives anonymized scores (vulnerability number, fitness level), not medical records.
