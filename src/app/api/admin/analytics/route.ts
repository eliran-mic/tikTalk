import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Run all queries in parallel
  const [
    totalUsers,
    totalPosts,
    totalLikes,
    totalComments,
    totalFollows,
    dau,
    wau,
    mau,
    newUsersToday,
    newUsersWeek,
    postsToday,
    likesToday,
    commentsToday,
    agentStats,
    topAgentsByFollowers,
    topPostsByLikes,
    conversationCount,
    messageCount,
    challengeCompletions,
    referralCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.post.count({ where: { moderationStatus: 'approved' } }),
    prisma.like.count(),
    prisma.comment.count(),
    prisma.follow.count(),
    // DAU: users with activity in last 24h
    prisma.user.count({ where: { lastActiveDate: { gte: oneDayAgo } } }),
    // WAU: users with activity in last 7 days
    prisma.user.count({ where: { lastActiveDate: { gte: sevenDaysAgo } } }),
    // MAU: users with activity in last 30 days
    prisma.user.count({ where: { lastActiveDate: { gte: thirtyDaysAgo } } }),
    // New users
    prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    // Today's activity
    prisma.post.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.like.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.comment.count({ where: { createdAt: { gte: oneDayAgo } } }),
    // Agent count
    prisma.agent.count(),
    // Top agents by followers
    prisma.agent.findMany({
      orderBy: { followers: { _count: 'desc' } },
      take: 10,
      select: {
        id: true,
        name: true,
        category: true,
        _count: { select: { followers: true, posts: true } },
      },
    }),
    // Top posts by likes
    prisma.post.findMany({
      orderBy: { likes: 'desc' },
      take: 5,
      select: {
        id: true,
        textContent: true,
        likes: true,
        agent: { select: { name: true } },
        _count: { select: { comments: true } },
      },
    }),
    // Conversations
    prisma.conversation.count(),
    prisma.message.count(),
    // Challenges
    prisma.challengeEntry.count({ where: { completed: true } }),
    // Referrals
    prisma.referral.count(),
  ])

  return NextResponse.json({
    overview: {
      totalUsers,
      totalPosts,
      totalLikes,
      totalComments,
      totalFollows,
      totalAgents: agentStats,
      conversationCount,
      messageCount,
      challengeCompletions,
      referralCount,
    },
    engagement: {
      dau,
      wau,
      mau,
      dauMauRatio: mau > 0 ? Math.round((dau / mau) * 100) : 0,
    },
    today: {
      newUsers: newUsersToday,
      posts: postsToday,
      likes: likesToday,
      comments: commentsToday,
    },
    growth: {
      newUsersWeek,
    },
    topAgents: topAgentsByFollowers,
    topPosts: topPostsByLikes.map((p) => ({
      ...p,
      textContent: p.textContent.slice(0, 100) + (p.textContent.length > 100 ? '...' : ''),
    })),
  })
}
