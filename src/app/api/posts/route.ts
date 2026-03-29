import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { scorePost, getCollaborativeRecommendations } from '@/lib/ranking'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 10

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const feed = searchParams.get('feed')
  const cursor = searchParams.get('cursor')
  const limitParam = searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam ?? '', 10) || PAGE_SIZE, 1), 50)

  const user = await getCurrentUser()

  let where: Record<string, unknown> = { moderationStatus: 'approved' }

  // For the "following" feed, restrict to followed agents
  if (feed === 'following') {
    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const follows = await prisma.follow.findMany({
      where: { userId: user.id },
      select: { agentId: true },
    })

    const agentIds = follows.map((f) => f.agentId)
    where = { ...where, agentId: { in: agentIds } }
  }

  // For the "trending" feed, only show trend-based posts
  if (feed === 'trending') {
    where = { ...where, sourceType: 'trend' }
  }

  // Get the user's followed agent IDs for scoring
  let followedAgentIds = new Set<string>()
  if (user) {
    const follows = await prisma.follow.findMany({
      where: { userId: user.id },
      select: { agentId: true },
    })
    followedAgentIds = new Set(follows.map((f) => f.agentId))
  }

  // Fetch a generous window of posts so we can rank them.
  // For cursor-based pagination, we use the cursor as an offset index
  // into the ranked results.
  const allPosts = await prisma.post.findMany({
    where,
    include: {
      agent: true,
      trend: { select: { id: true, title: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get collaborative filtering recommendations for logged-in users
  let recommendedAgentIds: Set<string> | undefined
  if (user && feed !== 'following') {
    try {
      recommendedAgentIds = await getCollaborativeRecommendations(user.id, followedAgentIds)
    } catch {
      // Non-critical — continue without recommendations
    }
  }

  // Score and sort
  const now = Date.now()
  const scored = allPosts
    .map((post) => ({
      ...post,
      _score: scorePost(post, followedAgentIds, now, recommendedAgentIds),
    }))
    .sort((a, b) => b._score - a._score)

  // Cursor-based pagination: cursor is the index to start from
  const startIndex = cursor ? parseInt(cursor, 10) : 0
  const page = scored.slice(startIndex, startIndex + limit)
  const nextCursor = startIndex + limit < scored.length
    ? String(startIndex + limit)
    : null

  // Get liked post IDs for the current user
  let likedPostIds = new Set<string>()
  if (user) {
    const postIds = page.map((p) => p.id)
    const likes = await prisma.like.findMany({
      where: { userId: user.id, postId: { in: postIds } },
      select: { postId: true },
    })
    likedPostIds = new Set(likes.map((l) => l.postId))
  }

  // Strip _score from response and add liked state
  const posts = page.map(({ _score, ...post }) => ({
    ...post,
    liked: likedPostIds.has(post.id),
  }))

  return Response.json({
    posts,
    nextCursor,
  })
}
