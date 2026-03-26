import { NextResponse } from 'next/server'
import {
  generateAppleWatchData,
  generateNoiseBandData,
  generateDayActivities,
  generateWeeklyData,
  type WearableSource,
} from '@/lib/wearable-simulator'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const source = (searchParams.get('source') || 'simulator') as WearableSource
  const type = searchParams.get('type') || 'daily'

  try {
    if (type === 'apple_watch') {
      return NextResponse.json(generateAppleWatchData())
    }

    if (type === 'noise_band') {
      return NextResponse.json(generateNoiseBandData())
    }

    if (type === 'weekly') {
      const data = generateWeeklyData(new Date(), source)
      return NextResponse.json(data)
    }

    // Default: daily activities
    const activities = generateDayActivities(new Date(), source)
    return NextResponse.json(activities)
  } catch (error) {
    console.error('Simulation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate simulation data' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { source = 'simulator', date } = body

    const targetDate = date ? new Date(date) : new Date()
    const activities = generateDayActivities(targetDate, source)

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString(),
      activitiesCount: activities.length,
      activities,
    })
  } catch (error) {
    console.error('Simulation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate simulation data' },
      { status: 500 }
    )
  }
}
