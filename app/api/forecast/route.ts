import { NextResponse } from 'next/server'
import { getHistoricalAQI, CITY_COORDINATES } from '@/lib/historical-aqi'
import { getForecast, checkServiceHealth } from '@/lib/arima-client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') || 'Mumbai'
  const days = parseInt(searchParams.get('days') || '90', 10)

  const cityKey = city.toLowerCase()
  if (!CITY_COORDINATES[cityKey]) {
    return NextResponse.json(
      { error: `City "${city}" not supported` },
      { status: 400 }
    )
  }

  // Check if analytics service is available
  const serviceHealthy = await checkServiceHealth()
  if (!serviceHealthy) {
    return NextResponse.json(
      { error: 'Analytics service is not available. Please start the Python service.' },
      { status: 503 }
    )
  }

  try {
    // Get historical data
    const historical = await getHistoricalAQI(city, 5)

    if (historical.data.length < 12) {
      return NextResponse.json(
        { error: `Insufficient historical data for ${city}. Need at least 12 months.` },
        { status: 400 }
      )
    }

    // Prepare data for ARIMA
    const dates = historical.data.map(d => d.date)
    const values = historical.data.map(d => d.aqi ?? d.pm25 ?? 0)

    // Run ARIMA forecast
    const forecast = await getForecast(dates, values, days)

    return NextResponse.json({
      city,
      historical: historical.data.slice(-24), // Last 2 years for context
      forecast: forecast.forecast,
      model: {
        order: forecast.modelOrder,
        aic: forecast.aic,
        rmse: forecast.rmse,
        dataPointsUsed: forecast.dataPointsUsed,
      },
    })
  } catch (error) {
    console.error('Forecast error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate forecast'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
