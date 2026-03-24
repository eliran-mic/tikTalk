import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

const SESSION_COOKIE = 'session_token'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function storeSession(token: string, userId: string) {
  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
    },
  })
}

export async function getSessionData(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
  })
  if (!session) return null
  if (new Date() > session.expiresAt) {
    await prisma.session.delete({ where: { id: session.id } })
    return null
  }
  return { userId: session.userId, expiresAt: session.expiresAt.getTime() }
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { token } })
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE)
  if (!sessionCookie) return null

  const session = await getSessionData(sessionCookie.value)
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, createdAt: true },
  })

  return user
}
