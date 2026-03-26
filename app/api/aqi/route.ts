import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAQI, type AQIData } from '@/lib/aqi-client'

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') || 'Mumbai'

  try {
    // Check cache first
    const cached = await prisma.aQICache.findUnique({
      where: { city: city.toLowerCase() },
    })

    const now = new Date()
    let aqiData: AQIData

    if (cached && (now.getTime() - cached.updatedAt.getTime()) < CACHE_DURATION) {
      // Use cached data (including weather)
      aqiData = {
        city,
        aqi: cached.aqi,
        pm25: cached.pm25,
        pm10: cached.pm10,
        o3: cached.o3,
        no2: cached.no2,
        so2: cached.so2,
        co: cached.co,
        temperature: cached.temperature,
        humidity: cached.humidity,
        wind: cached.wind,
        timestamp: cached.updatedAt,
        dominantPollutant: 'pm25',
        source: (cached.source as AQIData['source']) || 'waqi',
      }
    } else {
      // Fetch fresh data from WAQI/IQAir with weather enrichment
      aqiData = await getAQI(city)

      // Update cache
      await prisma.aQICache.upsert({
        where: { city: city.toLowerCase() },
        update: {
          aqi: aqiData.aqi,
          pm25: aqiData.pm25,
          pm10: aqiData.pm10,
          o3: aqiData.o3,
          no2: aqiData.no2,
          so2: aqiData.so2,
          co: aqiData.co,
          temperature: aqiData.temperature,
          humidity: aqiData.humidity,
          wind: aqiData.wind,
          source: aqiData.source,
        },
        create: {
          city: city.toLowerCase(),
          aqi: aqiData.aqi,
          pm25: aqiData.pm25,
          pm10: aqiData.pm10,
          o3: aqiData.o3,
          no2: aqiData.no2,
          so2: aqiData.so2,
          co: aqiData.co,
          temperature: aqiData.temperature,
          humidity: aqiData.humidity,
          wind: aqiData.wind,
          source: aqiData.source,
        },
      })
    }

    return NextResponse.json({ data: aqiData })
  } catch (error) {
    console.error('AQI API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AQI data' },
      { status: 500 }
    )
  }
}
