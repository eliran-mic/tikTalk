import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTrendHealthMetrics } from '@/lib/trends/monitor'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/metrics
 * Returns admin dashboard metrics. Protected by CRON_SECRET.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const [
      trendHealth,
      totalAgents,
      totalPosts,
      totalUsers,
      recentPosts24h,
      moderationRejected,
      perAgentStats,
    ] = await Promise.all([
      getTrendHealthMetrics(),
      prisma.agent.count(),
      prisma.post.count(),
      prisma.user.count(),
      prisma.post.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.post.count({ where: { moderationStatus: 'rejected' } }),
      prisma.agent.findMany({
        select: {
          name: true,
          category: true,
          domain: true,
          _count: {
            select: {
              posts: true,
              followers: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ])

    return NextResponse.json({
      overview: {
        totalAgents,
        totalPosts,
        totalUsers,
        recentPosts24h,
        moderationRejected,
        moderationRejectionRate:
          totalPosts > 0
            ? Math.round((moderationRejected / totalPosts) * 100 * 10) / 10
            : 0,
      },
      trendHealth,
      agents: perAgentStats.map((a) => ({
        name: a.name,
        category: a.category,
        domain: a.domain,
        posts: a._count.posts,
        followers: a._count.followers,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch admin metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
