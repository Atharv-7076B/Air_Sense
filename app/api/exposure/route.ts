import { NextResponse } from 'next/server'
import { calculateExposure, getRiskDetails } from '@/lib/exposure-calculator'
import { getAQI } from '@/lib/aqi-client'
import { generateDayActivities, generateWeeklyData } from '@/lib/wearable-simulator'
import { prisma } from '@/lib/prisma'
import { refreshAccessToken, getAllHealthData } from '@/lib/fitbit-client'
import { transformActivities } from '@/lib/fitbit-transformer'
import { calculateHealthMultiplier } from '@/lib/health-multiplier'
import type { HealthProfile } from '@/lib/health-multiplier'
import type { ActivityData } from '@/lib/wearable-simulator'

// Get health multiplier from user's health profile
async function getHealthMultiplier(): Promise<number> {
  try {
    const user = await prisma.user.findFirst({
      include: { healthProfile: true },
    })
    if (!user?.healthProfile) return 1.0

    const profile = user.healthProfile as unknown as HealthProfile
    const vulnerability = calculateHealthMultiplier(profile)
    return vulnerability.score
  } catch {
    return 1.0
  }
}

// Try to get real Fitbit activities for today
async function getFitbitActivities(): Promise<ActivityData[] | null> {
  try {
    const user = await prisma.user.findFirst({
      include: { fitbitConnection: true },
    })

    if (!user?.fitbitConnection) return null

    let accessToken = user.fitbitConnection.accessToken

    // Refresh token if expired
    if (user.fitbitConnection.expiresAt <= new Date()) {
      const newTokens = await refreshAccessToken(user.fitbitConnection.refreshToken)
      await prisma.fitbitConnection.update({
        where: { id: user.fitbitConnection.id },
        data: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
        },
      })
      accessToken = newTokens.accessToken
    }

    const healthData = await getAllHealthData(accessToken, new Date())
    const activities = transformActivities(
      healthData.activity,
      healthData.sleep,
      healthData.heartRate,
    )

    return activities.length > 0 ? activities : null
  } catch (error) {
    console.error('Failed to fetch Fitbit activities for exposure:', error)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city') || 'Mumbai'
  const hasAC = searchParams.get('hasAC') !== 'false'
  const homeType = (searchParams.get('homeType') || 'apartment') as 'apartment' | 'house'
  const period = searchParams.get('period') || 'daily'

  try {
    // Get AQI data and health multiplier
    const [aqiData, healthMultiplier] = await Promise.all([
      getAQI(city),
      getHealthMultiplier(),
    ])

    if (period === 'weekly') {
      // Generate weekly data
      const weeklyData = generateWeeklyData()
      const weeklyExposure = weeklyData.map(day => {
        const exposure = calculateExposure({
          baseAQI: aqiData.aqi,
          activities: day.activities,
          hasAC,
          homeType,
          healthMultiplier,
        })
        return {
          date: day.date,
          personalScore: exposure.personalScore,
          riskCategory: exposure.riskCategory,
          indoorPercent: exposure.indoorPercent,
          avgActivityLevel: exposure.avgActivityLevel,
          totalSteps: day.totalSteps,
        }
      })

      return NextResponse.json({
        weekly: weeklyExposure,
        cityAQI: aqiData,
      })
    }

    // Try real Fitbit data first, fall back to simulated
    const fitbitActivities = await getFitbitActivities()
    const activities = fitbitActivities || generateDayActivities(new Date())
    const dataSource = fitbitActivities ? 'fitbit' : 'simulated'

    // Calculate exposure
    const exposure = calculateExposure({
      baseAQI: aqiData.aqi,
      activities,
      hasAC,
      homeType,
      healthMultiplier,
    })

    const riskDetails = getRiskDetails(exposure.riskCategory)

    return NextResponse.json({
      exposure,
      riskDetails,
      cityAQI: aqiData,
      activitiesCount: activities.length,
      dataSource,
      healthMultiplier,
    })
  } catch (error) {
    console.error('Exposure calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate exposure' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      city = 'Mumbai',
      hasAC = true,
      homeType = 'apartment',
      activities,
      nearConstruction = false,
      nearHighway = false,
    } = body

    // Get AQI data and health multiplier
    const [aqiData, healthMultiplier] = await Promise.all([
      getAQI(city),
      getHealthMultiplier(),
    ])

    // Use provided activities, or try Fitbit, or generate simulated
    let activityData = activities
    let dataSource = 'provided'

    if (!activityData) {
      const fitbitActivities = await getFitbitActivities()
      if (fitbitActivities) {
        activityData = fitbitActivities
        dataSource = 'fitbit'
      } else {
        activityData = generateDayActivities(new Date())
        dataSource = 'simulated'
      }
    }

    // Calculate exposure
    const exposure = calculateExposure({
      baseAQI: aqiData.aqi,
      activities: activityData,
      hasAC,
      homeType,
      nearConstruction,
      nearHighway,
      healthMultiplier,
    })

    const riskDetails = getRiskDetails(exposure.riskCategory)

    return NextResponse.json({
      exposure,
      riskDetails,
      cityAQI: aqiData,
      dataSource,
    })
  } catch (error) {
    console.error('Exposure calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate exposure' },
      { status: 500 }
    )
  }
}
