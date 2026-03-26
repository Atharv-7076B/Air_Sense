import { NextResponse } from 'next/server'
import { getHistoricalAQI, CITY_COORDINATES } from '@/lib/historical-aqi'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') || 'Mumbai'
  const years = parseInt(searchParams.get('years') || '7', 10)

  // Validate city
  const cityKey = city.toLowerCase()
  if (!CITY_COORDINATES[cityKey]) {
    return NextResponse.json(
      {
        error: `City "${city}" not supported for historical data`,
        availableCities: Object.keys(CITY_COORDINATES),
      },
      { status: 400 }
    )
  }

  // Validate years range
  if (years < 1 || years > 8) {
    return NextResponse.json(
      { error: 'Years must be between 1 and 8' },
      { status: 400 }
    )
  }

  try {
    const result = await getHistoricalAQI(city, years)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Historical AQI fetch error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch historical data'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
