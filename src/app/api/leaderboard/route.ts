import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/leaderboard — top users by XP
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)

  const topUsers = await prisma.user.findMany({
    orderBy: { xp: 'desc' },
    take: limit,
    select: {
      id: true,
      username: true,
      xp: true,
      level: true,
      currentStreak: true,
      avatarUrl: true,
      _count: { select: { following: true, likes: true, comments: true } },
    },
  })

  return NextResponse.json(topUsers)
}
