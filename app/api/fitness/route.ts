import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateFitness } from '@/lib/fitness-score'

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      include: { healthProfile: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const profile = user.healthProfile

    const result = calculateFitness({
      bmi: profile?.bmi,
      // Wearable data would be fetched from Fitbit here
      restingHeartRate: null,
      heartRateRecovery: null,
      avgDailySteps: null,
      activeMinutesPerWeek: null,
      spo2: null,
      sleepHours: null,
      sleepScore: null,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Fitness score error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate fitness score' },
      { status: 500 }
    )
  }
}
