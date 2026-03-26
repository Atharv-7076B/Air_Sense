// ARIMA Forecast Client
// Calls the Python analytics service for time series forecasting

const ANALYTICS_SERVICE_URL =
  process.env.ANALYTICS_SERVICE_URL || "http://localhost:8000";

export interface ForecastPoint {
  date: string;
  value: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastResult {
  forecast: ForecastPoint[];
  modelOrder: string;
  aic: number | null;
  rmse: number | null;
  dataPointsUsed: number;
}

export async function getForecast(
  dates: string[],
  values: number[],
  forecastDays: number = 90,
): Promise<ForecastResult> {
  const response = await fetch(`${ANALYTICS_SERVICE_URL}/forecast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dates,
      values,
      forecast_days: forecastDays,
      seasonal: true,
      confidence_level: 0.95,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const text = await response.text();
  if (!text) {
    throw new Error("Analytics service returned empty response");
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Analytics service returned invalid JSON");
  }

  if (!response.ok) {
    throw new Error(
      `ARIMA service error: ${data.detail || response.statusText}`,
    );
  }

  if (!data.forecast || !Array.isArray(data.forecast)) {
    throw new Error("Analytics service returned unexpected format");
  }

  return {
    forecast: data.forecast,
    modelOrder: data.model_order,
    aic: data.aic,
    rmse: data.rmse,
    dataPointsUsed: data.data_points_used,
  };
}

export async function checkServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ANALYTICS_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return false;
    const data = await response.json();
    // Verify it's actually our analytics service
    return data?.service === "analytics";
  } catch {
    return false;
  }
}
