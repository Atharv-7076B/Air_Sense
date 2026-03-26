import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revokeToken } from '@/lib/fitbit-client'

export async function POST() {
  try {
    const user = await prisma.user.findFirst({
      include: { fitbitConnection: true },
    })

    if (!user?.fitbitConnection) {
      return NextResponse.json({ success: true, message: 'No connection to disconnect' })
    }

    // Revoke tokens at Fitbit
    await revokeToken(user.fitbitConnection.accessToken)

    // Delete connection from DB
    await prisma.fitbitConnection.delete({
      where: { id: user.fitbitConnection.id },
    })

    return NextResponse.json({ success: true, message: 'Fitbit disconnected' })
  } catch (error) {
    console.error('Fitbit disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Fitbit' },
      { status: 500 }
    )
  }
}
