import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rate-limit'
import { awardXp } from '@/lib/gamification'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const comments = await prisma.comment.findMany({
    where: { postId: id },
    include: {
      user: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(comments)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = applyRateLimit(request, 'general')
  if (rateLimited) return rateLimited

  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    return Response.json(
      { error: 'You must be logged in to comment' },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  const { text } = body as Record<string, unknown>

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return Response.json(
      { error: 'Comment text is required' },
      { status: 400 }
    )
  }

  const trimmedText = text.trim()

  if (trimmedText.length > 500) {
    return Response.json(
      { error: 'Comment must be 500 characters or less' },
      { status: 400 }
    )
  }

  const post = await prisma.post.findUnique({ where: { id } })
  if (!post) {
    return Response.json(
      { error: 'Post not found' },
      { status: 404 }
    )
  }

  const comment = await prisma.comment.create({
    data: {
      text: trimmedText,
      userId: user.id,
      postId: id,
    },
    include: {
      user: { select: { id: true, username: true } },
    },
  })

  // Award XP for commenting
  await awardXp(user.id, 'comment', { postId: id })

  return Response.json(comment, { status: 201 })
}
