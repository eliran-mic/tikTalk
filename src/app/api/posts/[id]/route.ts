import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      agent: true,
      _count: { select: { comments: true } },
    },
  })

  if (!post) {
    return Response.json({ error: 'Post not found' }, { status: 404 })
  }

  const user = await getCurrentUser()
  let liked = false
  if (user) {
    const like = await prisma.like.findUnique({
      where: { userId_postId: { userId: user.id, postId: id } },
    })
    liked = !!like
  }

  return Response.json({ ...post, liked })
}
