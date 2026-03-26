"""
ARIMA/SARIMA Time Series Forecasting for AQI Data
Uses pmdarima's auto_arima for automatic parameter selection
"""

from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from pmdarima import auto_arima
from pydantic import BaseModel


class ForecastRequest(BaseModel):
    """Input for ARIMA forecasting"""
    dates: list[str]  # ISO date strings (YYYY-MM)
    values: list[float]  # AQI or pollutant values
    forecast_days: int = 30  # Number of days to forecast
    seasonal: bool = True  # Whether to use SARIMA
    confidence_level: float = 0.95


class ForecastPoint(BaseModel):
    """Single forecast point"""
    date: str
    value: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    """ARIMA forecast response"""
    forecast: list[ForecastPoint]
    model_order: str  # e.g., "(1,1,1)(1,1,1,12)"
    aic: Optional[float] = None
    rmse: Optional[float] = None
    data_points_used: int


def run_arima_forecast(request: ForecastRequest) -> ForecastResponse:
    """
    Fit ARIMA/SARIMA model and generate forecasts.

    Auto-selects optimal (p,d,q)(P,D,Q,s) parameters.
    Returns forecasted values with confidence intervals.
    """
    # Prepare data
    values = np.array(request.values, dtype=float)

    # Remove NaN values
    valid_mask = ~np.isnan(values)
    values = values[valid_mask]

    if len(values) < 12:
        raise ValueError(f"Need at least 12 data points for ARIMA, got {len(values)}")

    # Create pandas series with proper date index
    valid_dates = [d for d, m in zip(request.dates, valid_mask) if m]

    # Determine seasonality period
    # Monthly data → seasonal period = 12
    seasonal_period = 12 if request.seasonal and len(values) >= 24 else 1

    # Fit auto-ARIMA model
    try:
        model = auto_arima(
            values,
            seasonal=request.seasonal and seasonal_period > 1,
            m=seasonal_period if seasonal_period > 1 else 1,
            d=None,  # auto-detect
            D=None if seasonal_period > 1 else 0,
            max_p=5,
            max_q=5,
            max_P=2,
            max_Q=2,
            max_d=2,
            max_D=1,
            stepwise=True,
            suppress_warnings=True,
            error_action="ignore",
            trace=False,
            n_fits=50,
        )
    except Exception as e:
        # Fallback to simpler model
        model = auto_arima(
            values,
            seasonal=False,
            max_p=3,
            max_q=3,
            max_d=2,
            stepwise=True,
            suppress_warnings=True,
            error_action="ignore",
        )

    # Generate forecasts
    alpha = 1 - request.confidence_level
    n_periods = request.forecast_days

    # If data is monthly, convert forecast_days to months
    if all("-" in d and len(d) == 7 for d in valid_dates[:5]):
        n_periods = max(1, request.forecast_days // 30)

    forecast_values, conf_int = model.predict(
        n_periods=n_periods,
        return_conf_int=True,
        alpha=alpha,
    )

    # Generate forecast dates
    last_date = valid_dates[-1] if valid_dates else request.dates[-1]
    forecast_dates = []

    if len(last_date) == 7:  # Monthly format YYYY-MM
        last_dt = datetime.strptime(last_date, "%Y-%m")
        for i in range(1, n_periods + 1):
            next_month = last_dt.month + i
            next_year = last_dt.year + (next_month - 1) // 12
            next_month = ((next_month - 1) % 12) + 1
            forecast_dates.append(f"{next_year}-{next_month:02d}")
    else:  # Daily format
        last_dt = datetime.strptime(last_date[:10], "%Y-%m-%d")
        for i in range(1, n_periods + 1):
            forecast_dates.append((last_dt + timedelta(days=i)).strftime("%Y-%m-%d"))

    # Build response
    forecast_points = []
    for i in range(n_periods):
        value = max(0, float(forecast_values[i]))  # AQI can't be negative
        lower = max(0, float(conf_int[i, 0]))
        upper = max(0, float(conf_int[i, 1]))

        forecast_points.append(ForecastPoint(
            date=forecast_dates[i],
            value=round(value, 1),
            lower_bound=round(lower, 1),
            upper_bound=round(upper, 1),
        ))

    # Model info
    order = model.order
    seasonal_order = getattr(model, "seasonal_order", None)

    if seasonal_order and seasonal_order != (0, 0, 0, 0):
        order_str = f"({order[0]},{order[1]},{order[2]})({seasonal_order[0]},{seasonal_order[1]},{seasonal_order[2]},{seasonal_order[3]})"
    else:
        order_str = f"({order[0]},{order[1]},{order[2]})"

    # Calculate in-sample RMSE
    fitted = model.predict_in_sample()
    rmse = float(np.sqrt(np.mean((values[-len(fitted):] - fitted) ** 2)))

    return ForecastResponse(
        forecast=forecast_points,
        model_order=order_str,
        aic=round(float(model.aic()), 2) if hasattr(model, "aic") else None,
        rmse=round(rmse, 2),
        data_points_used=len(values),
    )
