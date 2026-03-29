import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/push — get VAPID public key
export async function GET() {
  return NextResponse.json({
    publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
  })
}

// POST /api/push — subscribe to push notifications
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { endpoint, keys } = body as Record<string, unknown>
  const typedKeys = keys as { p256dh?: string; auth?: string } | undefined

  if (!endpoint || typeof endpoint !== 'string' || !typedKeys?.p256dh || !typedKeys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId: user.id,
      p256dh: typedKeys.p256dh,
      auth: typedKeys.auth,
    },
    create: {
      userId: user.id,
      endpoint,
      p256dh: typedKeys.p256dh,
      auth: typedKeys.auth,
    },
  })

  return NextResponse.json({ subscribed: true }, { status: 201 })
}

// DELETE /api/push — unsubscribe
export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { endpoint } = body as Record<string, unknown>
  if (!endpoint || typeof endpoint !== 'string') {
    return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  })

  return NextResponse.json({ unsubscribed: true })
}
