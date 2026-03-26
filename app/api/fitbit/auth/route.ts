import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  getFitbitAuthURL,
} from '@/lib/fitbit-client'

export async function GET() {
  try {
    if (!process.env.FITBIT_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Fitbit integration not configured. Set FITBIT_CLIENT_ID in .env' },
        { status: 500 }
      )
    }

    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const state = generateState()

    // Store PKCE verifier and state in cookies for the callback
    const cookieStore = await cookies()
    cookieStore.set('fitbit_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })
    cookieStore.set('fitbit_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    const authURL = getFitbitAuthURL({ codeChallenge, state })
    return NextResponse.redirect(authURL)
  } catch (error) {
    console.error('Fitbit auth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Fitbit authorization' },
      { status: 500 }
    )
  }
}
