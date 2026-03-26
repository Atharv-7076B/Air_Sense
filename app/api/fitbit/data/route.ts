import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { refreshAccessToken, getAllHealthData } from '@/lib/fitbit-client'
import { transformActivities, buildFitbitDeviceData } from '@/lib/fitbit-transformer'

// Get a valid access token, refreshing if expired
async function getValidToken(connectionId: string, refreshToken: string, expiresAt: Date) {
  if (expiresAt > new Date()) {
    const connection = await prisma.fitbitConnection.findUnique({ where: { id: connectionId } })
    return connection?.accessToken || null
  }

  // Token expired, refresh it
  const newTokens = await refreshAccessToken(refreshToken)
  await prisma.fitbitConnection.update({
    where: { id: connectionId },
    data: {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
    },
  })

  return newTokens.accessToken
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'summary'
    const dateStr = searchParams.get('date')
    const date = dateStr ? new Date(dateStr) : new Date()

    // Get user's Fitbit connection
    const user = await prisma.user.findFirst({
      include: { fitbitConnection: true },
    })

    if (!user?.fitbitConnection) {
      return NextResponse.json(
        { error: 'No Fitbit connection found', connected: false },
        { status: 404 }
      )
    }

    const connection = user.fitbitConnection

    // Get valid access token
    const accessToken = await getValidToken(
      connection.id,
      connection.refreshToken,
      connection.expiresAt
    )

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to get valid access token', connected: false },
        { status: 401 }
      )
    }

    // Fetch data based on requested type
    if (type === 'summary' || type === 'all') {
      const healthData = await getAllHealthData(accessToken, date)
      const activities = transformActivities(
        healthData.activity,
        healthData.sleep,
        healthData.heartRate,
      )
      const deviceData = buildFitbitDeviceData(healthData)

      return NextResponse.json({
        connected: true,
        device: deviceData,
        activities,
        raw: type === 'all' ? healthData : undefined,
      })
    }

    return NextResponse.json(
      { error: `Unknown data type: ${type}` },
      { status: 400 }
    )
  } catch (error) {
    console.error('Fitbit data error:', error)

    if (error instanceof Error && error.message === 'FITBIT_TOKEN_EXPIRED') {
      return NextResponse.json(
        { error: 'Fitbit session expired. Please reconnect.', connected: false },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch Fitbit data' },
      { status: 500 }
    )
  }
}
