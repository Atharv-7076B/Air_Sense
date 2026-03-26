import { NextResponse } from 'next/server'
import { getRecommendations } from '@/lib/fuzzy-client'
import { checkServiceHealth } from '@/lib/arima-client'
import { prisma } from '@/lib/prisma'
import { calculateHealthMultiplier } from '@/lib/health-multiplier'
import type { HealthProfile } from '@/lib/health-multiplier'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      aqi,
      exposureScore,
      fitnessLevel = 50,
      timeOfDay,
      activityType = 0,
      forecastTrend = 0,
    } = body

    if (aqi === undefined || exposureScore === undefined) {
      return NextResponse.json(
        { error: 'aqi and exposureScore are required' },
        { status: 400 }
      )
    }

    // Get health vulnerability from profile
    let healthVulnerability = 1.0
    try {
      const user = await prisma.user.findFirst({
        include: { healthProfile: true },
      })
      if (user?.healthProfile) {
        const profile = user.healthProfile as unknown as HealthProfile
        const vulnerability = calculateHealthMultiplier(profile)
        healthVulnerability = vulnerability.score
      }
    } catch {
      // Use default vulnerability
    }

    // Check analytics service
    const serviceHealthy = await checkServiceHealth()
    if (!serviceHealthy) {
      return NextResponse.json(
        { error: 'Analytics service is not available. Please start the Python service.' },
        { status: 503 }
      )
    }

    const currentHour = timeOfDay ?? new Date().getHours()

    const recommendations = await getRecommendations({
      aqi,
      exposureScore,
      healthVulnerability,
      fitnessLevel,
      timeOfDay: currentHour,
      activityType,
      forecastTrend,
    })

    return NextResponse.json({
      recommendations,
      inputs: {
        aqi,
        exposureScore,
        healthVulnerability,
        fitnessLevel,
        timeOfDay: currentHour,
        activityType,
        forecastTrend,
      },
    })
  } catch (error) {
    console.error('Fuzzy recommendation error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate recommendations'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
