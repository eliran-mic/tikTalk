import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthUrl, generateOAuthState, type OAuthProvider } from '@/lib/oauth'

const VALID_PROVIDERS = new Set(['google', 'facebook', 'linkedin'])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params

  if (!VALID_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const state = generateOAuthState()

  // Store state in cookie for CSRF verification
  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  })

  const url = getAuthUrl(provider as OAuthProvider, state)
  return NextResponse.redirect(url)
}
