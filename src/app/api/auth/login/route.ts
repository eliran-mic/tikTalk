import { prisma } from '@/lib/db'
import { createSessionToken, storeSession, setSessionCookie } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rate-limit'
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

  const { username, password } = body as Record<string, unknown>

  if (typeof username !== 'string' || typeof password !== 'string') {
    return Response.json(
      { error: 'Username and password are required' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    return Response.json(
      { error: 'Invalid username or password' },
      { status: 401 }
    )
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return Response.json(
      { error: 'Invalid username or password' },
      { status: 401 }
    )
  }

  const token = createSessionToken()
  await storeSession(token, user.id)
  await setSessionCookie(token)

  return Response.json({
    user: { id: user.id, username: user.username, createdAt: user.createdAt },
  })
}
