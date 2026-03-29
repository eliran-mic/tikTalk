import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/collections — list user's collections
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(collections)
}

// POST /api/collections — create a new collection
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

  const { name } = body as Record<string, unknown>
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (name.trim().length > 50) {
    return NextResponse.json({ error: 'Name must be 50 characters or less' }, { status: 400 })
  }

  const collection = await prisma.collection.create({
    data: {
      name: name.trim(),
      userId: user.id,
    },
  })

  return NextResponse.json(collection, { status: 201 })
}
