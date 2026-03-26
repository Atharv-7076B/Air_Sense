import { NextResponse } from 'next/server'
import { generateTravelAdvisory } from '@/lib/travel-advisory'
import { getAQI } from '@/lib/aqi-client'
import { prisma } from '@/lib/prisma'
import { calculateHealthMultiplier } from '@/lib/health-multiplier'
import type { HealthProfile } from '@/lib/health-multiplier'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      originCity,
      destinationCity,
      travelDate,
    } = body

    if (!originCity || !destinationCity) {
      return NextResponse.json(
        { error: 'originCity and destinationCity are required' },
        { status: 400 }
      )
    }

    // Get real AQI for both cities in parallel
    const [originAQI, destAQI] = await Promise.all([
      getAQI(originCity),
      getAQI(destinationCity),
    ])

    // Get health vulnerability
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
      // Default vulnerability
    }

    const advisory = generateTravelAdvisory({
      originCity,
      originAQI: originAQI.aqi,
      destinationCity,
      destinationAQI: destAQI.aqi,
      travelDate: travelDate || new Date().toISOString(),
      healthVulnerability,
    })

    return NextResponse.json({
      advisory,
      originAQIData: originAQI,
      destinationAQIData: destAQI,
    })
  } catch (error) {
    console.error('Travel advisory error:', error)
    return NextResponse.json(
      { error: 'Failed to generate travel advisory' },
      { status: 500 }
    )
  }
}
