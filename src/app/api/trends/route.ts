import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/trends
 * Returns active trends, optionally filtered by category.
 * Query params: ?category=tech&limit=20&status=active
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const status = searchParams.get('status') ?? 'active'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  try {
    const trends = await prisma.trend.findMany({
      where: {
        status,
        ...(category ? { category } : {}),
      },
      orderBy: { viralityScore: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        viralityScore: true,
        crossPlatform: true,
        firstSeenAt: true,
        lastSeenAt: true,
        url: true,
        source: {
          select: { name: true },
        },
        _count: {
          select: { posts: true },
        },
      },
    })

    return NextResponse.json({ trends })
  } catch (error) {
    console.error('Failed to fetch trends:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trends' },
      { status: 500 }
    )
  }
}
