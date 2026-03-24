import { cookies } from 'next/headers'
import { deleteSession, clearSessionCookie } from '@/lib/auth'

export async function POST() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session_token')

  if (sessionCookie) {
    deleteSession(sessionCookie.value)
  }

  await clearSessionCookie()

  return Response.json({ success: true })
}
