import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

const SESSION_COOKIE = 'session_token'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

// Simple in-memory session store. For production, use a database or Redis.
const sessions = new Map<string, { userId: string; expiresAt: number }>()

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function storeSession(token: string, userId: string) {
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
  })
}

export function getSessionData(token: string) {
  const session = sessions.get(token)
  if (!session) return null
  if (Date.now() > session.expiresAt) {
    sessions.delete(token)
    return null
  }
  return session
}

export function deleteSession(token: string) {
  sessions.delete(token)
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

  const session = getSessionData(sessionCookie.value)
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, createdAt: true },
  })

  return user
}
