"""
AirSense Analytics Service
FastAPI microservice for ARIMA forecasting and Fuzzy Logic recommendations
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from arima_model import ForecastRequest, ForecastResponse, run_arima_forecast
from fuzzy_engine import FuzzyInput, FuzzyOutput, run_fuzzy_inference

app = FastAPI(
    title="AirSense Analytics Service",
    description="ARIMA forecasting and Fuzzy Logic recommendation engine for AQI data",
    version="1.0.0",
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "analytics", "version": "1.0.0"}


@app.post("/forecast", response_model=ForecastResponse)
async def forecast(request: ForecastRequest):
    """
    Run ARIMA/SARIMA forecast on time series data.

    Accepts historical AQI data (dates + values) and returns
    forecasted values with confidence intervals.
    """
    try:
        if len(request.dates) != len(request.values):
            raise HTTPException(
                status_code=400,
                detail="dates and values arrays must have the same length",
            )

        if len(request.values) < 12:
            raise HTTPException(
                status_code=400,
                detail=f"Need at least 12 data points for ARIMA, got {len(request.values)}",
            )

        result = run_arima_forecast(request)
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")


@app.post("/recommend", response_model=FuzzyOutput)
async def recommend(inputs: FuzzyInput):
    """
    Run Fuzzy Logic inference for personalized recommendations.

    Takes AQI, exposure, health vulnerability, fitness level,
    time of day, activity type, and forecast trend as inputs.
    Returns recommendations for outdoor safety, masks, purifiers,
    exercise, ventilation, and medical alerts.
    """
    try:
        result = run_fuzzy_inference(inputs)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fuzzy inference error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
