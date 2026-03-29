import { prisma } from '@/lib/db'
import { createSessionToken, storeSession, setSessionCookie } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rate-limit'
import { awardXp } from '@/lib/gamification'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const rateLimited = applyRateLimit(request, 'auth')
  if (rateLimited) return rateLimited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  const { username, password, referralCode } = body as Record<string, unknown>

  if (!username || !password) {
    return Response.json(
      { error: 'Username and password are required' },
      { status: 400 }
    )
  }

  if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
    return Response.json(
      { error: 'Username must be between 3 and 30 characters' },
      { status: 400 }
    )
  }

  if (typeof password !== 'string' || password.length < 6) {
    return Response.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 }
    )
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return Response.json(
      { error: 'Username already taken' },
      { status: 409 }
    )
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        referredBy: typeof referralCode === 'string' ? referralCode : undefined,
      },
      select: { id: true, username: true, createdAt: true },
    })

    // Process referral if valid code provided
    if (typeof referralCode === 'string' && referralCode.length > 0) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
        select: { id: true },
      })

      if (referrer) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id,
          },
        })
        // Award referral XP to the referrer
        await awardXp(referrer.id, 'referral', { referredUserId: user.id })
      }
    }

    const token = createSessionToken()
    await storeSession(token, user.id)
    await setSessionCookie(token)

    return Response.json({ user })
  } catch {
    return Response.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
