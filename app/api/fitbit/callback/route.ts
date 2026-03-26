import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForTokens } from '@/lib/fitbit-client'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      return NextResponse.redirect(`${baseUrl}/settings?fitbit=denied`)
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      )
    }

    // Verify state and get code verifier from cookies
    const cookieStore = await cookies()
    const savedState = cookieStore.get('fitbit_state')?.value
    const codeVerifier = cookieStore.get('fitbit_code_verifier')?.value

    if (!savedState || savedState !== state) {
      return NextResponse.json(
        { error: 'Invalid state parameter - possible CSRF attack' },
        { status: 403 }
      )
    }

    if (!codeVerifier) {
      return NextResponse.json(
        { error: 'Missing code verifier - please try again' },
        { status: 400 }
      )
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, codeVerifier)

    // Get or create user (using first user for now - no auth system)
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: { name: 'User', city: 'Mumbai' },
      })
    }

    // Store Fitbit connection
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000)
    await prisma.fitbitConnection.upsert({
      where: { userId: user.id },
      update: {
        fitbitUserId: tokens.userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        scopes: tokens.scope,
      },
      create: {
        userId: user.id,
        fitbitUserId: tokens.userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        scopes: tokens.scope,
      },
    })

    // Clear OAuth cookies
    cookieStore.delete('fitbit_code_verifier')
    cookieStore.delete('fitbit_state')

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${baseUrl}/settings?fitbit=connected`)
  } catch (error) {
    console.error('Fitbit callback error:', error)
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${baseUrl}/settings?fitbit=error`)
  }
}
