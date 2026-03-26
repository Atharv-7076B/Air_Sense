import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await prisma.user.findFirst({
      include: { fitbitConnection: true },
    })

    if (!user?.fitbitConnection) {
      return NextResponse.json({
        connected: false,
      })
    }

    return NextResponse.json({
      connected: true,
      fitbitUserId: user.fitbitConnection.fitbitUserId,
      scopes: user.fitbitConnection.scopes,
      connectedAt: user.fitbitConnection.createdAt,
      tokenExpiresAt: user.fitbitConnection.expiresAt,
    })
  } catch (error) {
    console.error('Fitbit status error:', error)
    return NextResponse.json({ connected: false })
  }
}
