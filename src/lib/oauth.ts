import crypto from 'crypto'

export interface OAuthUserInfo {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

// ── Google ────────────────────────────────────────────────────────────

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function getGoogleUser(code: string): Promise<OAuthUserInfo> {
  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenRes.json()

  // Get user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const user = await userRes.json()

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.picture,
  }
}

// ── Facebook ──────────────────────────────────────────────────────────

export function getFacebookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`,
    response_type: 'code',
    scope: 'email,public_profile',
    state,
  })
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`
}

export async function getFacebookUser(code: string): Promise<OAuthUserInfo> {
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook`,
        code,
      })
  )
  const tokens = await tokenRes.json()

  const userRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${tokens.access_token}`
  )
  const user = await userRes.json()

  return {
    id: user.id,
    email: user.email ?? '',
    name: user.name,
    avatarUrl: user.picture?.data?.url,
  }
}

// ── LinkedIn ──────────────────────────────────────────────────────────

export function getLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`,
    response_type: 'code',
    scope: 'openid profile email',
    state,
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}

export async function getLinkedInUser(code: string): Promise<OAuthUserInfo> {
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`,
    }),
  })
  const tokens = await tokenRes.json()

  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const user = await userRes.json()

  return {
    id: user.sub,
    email: user.email ?? '',
    name: user.name,
    avatarUrl: user.picture,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex')
}

export type OAuthProvider = 'google' | 'facebook' | 'linkedin'

export function getAuthUrl(provider: OAuthProvider, state: string): string {
  switch (provider) {
    case 'google': return getGoogleAuthUrl(state)
    case 'facebook': return getFacebookAuthUrl(state)
    case 'linkedin': return getLinkedInAuthUrl(state)
  }
}

export function getUserInfo(provider: OAuthProvider, code: string): Promise<OAuthUserInfo> {
  switch (provider) {
    case 'google': return getGoogleUser(code)
    case 'facebook': return getFacebookUser(code)
    case 'linkedin': return getLinkedInUser(code)
  }
}
