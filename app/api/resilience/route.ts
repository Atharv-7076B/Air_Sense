import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateHealthMultiplier } from '@/lib/health-multiplier'
import { calculateResilience } from '@/lib/resilience-score'
import type { HealthProfile } from '@/lib/health-multiplier'

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      include: { healthProfile: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const profile = user.healthProfile

    // Calculate health multiplier
    let healthMultiplier = 1.0
    if (profile) {
      const vulnerability = calculateHealthMultiplier(profile as unknown as HealthProfile)
      healthMultiplier = vulnerability.score
    }

    const result = calculateResilience({
      age: profile?.age,
      smokingStatus: profile?.smokingStatus,
      exerciseFrequency: profile?.exerciseFrequency,
      dietQuality: profile?.dietQuality,
      yearsInCurrentCity: profile?.yearsInCurrentCity,
      healthMultiplier,
      // Wearable data would be added here from Fitbit
      restingHeartRate: null,
      spo2: null,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Resilience score error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate resilience score' },
      { status: 500 }
    )
  }
}
