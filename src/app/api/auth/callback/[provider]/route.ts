import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { createSessionToken, storeSession, setSessionCookie } from '@/lib/auth'
import { getUserInfo, type OAuthProvider } from '@/lib/oauth'

const VALID_PROVIDERS = new Set(['google', 'facebook', 'linkedin'])

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_denied`)
  }

  if (!VALID_PROVIDERS.has(provider)) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_provider`)
  }

  // Verify CSRF state
  const cookieStore = await cookies()
  const storedState = cookieStore.get('oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_state`)
  }
  cookieStore.delete('oauth_state')

  try {
    // Get user info from provider
    const userInfo = await getUserInfo(provider as OAuthProvider, code)

    // Find or create user
    let user = await prisma.user.findFirst({
      where: { oauthProvider: provider, oauthId: userInfo.id },
      select: { id: true },
    })

    if (!user) {
      // Check if email already exists (link accounts)
      if (userInfo.email) {
        const existingByEmail = await prisma.user.findFirst({
          where: { email: userInfo.email },
          select: { id: true },
        })
        if (existingByEmail) {
          // Link OAuth to existing account
          await prisma.user.update({
            where: { id: existingByEmail.id },
            data: {
              oauthProvider: provider,
              oauthId: userInfo.id,
              avatarUrl: userInfo.avatarUrl ?? undefined,
            },
          })
          user = existingByEmail
        }
      }

      if (!user) {
        // Generate unique username from name
        const baseUsername = userInfo.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 20)
        let username = baseUsername
        let suffix = 1
        while (await prisma.user.findUnique({ where: { username } })) {
          username = `${baseUsername}${suffix}`
          suffix++
        }

        user = await prisma.user.create({
          data: {
            username,
            passwordHash: '',
            oauthProvider: provider,
            oauthId: userInfo.id,
            email: userInfo.email || undefined,
            avatarUrl: userInfo.avatarUrl ?? undefined,
          },
          select: { id: true },
        })
      }
    }

    // Create session
    const token = createSessionToken()
    await storeSession(token, user.id)
    await setSessionCookie(token)

    return NextResponse.redirect(`${appUrl}/`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`)
  }
}
