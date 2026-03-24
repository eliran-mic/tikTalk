import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { applyRateLimit } from '@/lib/rate-limit'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimited = applyRateLimit(request, 'general')
  if (rateLimited) return rateLimited

  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId: id } },
  })

  if (existing) {
    // Unlike: remove like and decrement count
    await prisma.$transaction([
      prisma.like.delete({ where: { id: existing.id } }),
      prisma.post.update({
        where: { id },
        data: { likes: { decrement: 1 } },
      }),
    ])

    const post = await prisma.post.findUnique({ where: { id } })
    return Response.json({ ...post, liked: false })
  } else {
    // Like: create like and increment count
    await prisma.$transaction([
      prisma.like.create({
        data: { userId: user.id, postId: id },
      }),
      prisma.post.update({
        where: { id },
        data: { likes: { increment: 1 } },
      }),
    ])

    const post = await prisma.post.findUnique({ where: { id } })
    return Response.json({ ...post, liked: true })
  }
}
