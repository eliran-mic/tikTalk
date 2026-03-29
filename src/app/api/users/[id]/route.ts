import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/users/[id] — public user profile with social graph
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      xp: true,
      level: true,
      currentStreak: true,
      avatarUrl: true,
      createdAt: true,
      following: {
        include: {
          agent: { select: { id: true, name: true, avatarUrl: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { likes: true, comments: true, following: true },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}
