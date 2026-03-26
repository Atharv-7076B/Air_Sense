import { NextResponse } from 'next/server'
import { calculateGPSI } from '@/lib/gpsi'
import { getHistoricalAQI, CITY_COORDINATES } from '@/lib/historical-aqi'
import { prisma } from '@/lib/prisma'
import { calculateHealthMultiplier } from '@/lib/health-multiplier'
import { calculateResilience } from '@/lib/resilience-score'
import type { HealthProfile } from '@/lib/health-multiplier'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') || 'Mumbai'

  const cityKey = city.toLowerCase()
  if (!CITY_COORDINATES[cityKey]) {
    return NextResponse.json(
      { error: `City "${city}" not supported` },
      { status: 400 }
    )
  }

  try {
    // Get historical summary for environmental score
    let historicalSummary = null
    try {
      const historical = await getHistoricalAQI(city, 5)
      historicalSummary = historical.summary
    } catch {
      // Historical data may not be available
    }

    // Get user resilience for comparison
    let userResilience: number | undefined
    try {
      const user = await prisma.user.findFirst({
        include: { healthProfile: true },
      })
      if (user?.healthProfile) {
        const profile = user.healthProfile as unknown as HealthProfile
        const vulnerability = calculateHealthMultiplier(profile)
        const resilience = calculateResilience({
          age: user.healthProfile.age,
          smokingStatus: user.healthProfile.smokingStatus,
          exerciseFrequency: user.healthProfile.exerciseFrequency,
          dietQuality: user.healthProfile.dietQuality,
          yearsInCurrentCity: user.healthProfile.yearsInCurrentCity,
          healthMultiplier: vulnerability.score,
        })
        userResilience = resilience.score
      }
    } catch {
      // No user data
    }

    const result = calculateGPSI(city, historicalSummary, userResilience)

    return NextResponse.json({
      city,
      ...result,
    })
  } catch (error) {
    console.error('GPSI calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate GPSI' },
      { status: 500 }
    )
  }
}
