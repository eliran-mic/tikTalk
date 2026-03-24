import { cookies } from 'next/headers'
import { deleteSession, clearSessionCookie } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const rateLimited = applyRateLimit(request, 'auth')
  if (rateLimited) return rateLimited

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session_token')

  if (sessionCookie) {
    await deleteSession(sessionCookie.value)
  }

  await clearSessionCookie()

  return Response.json({ success: true })
}
