import { prisma } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const post = await prisma.post.update({
      where: { id },
      data: {
        likes: {
          increment: 1,
        },
      },
    })

    return Response.json(post)
  } catch {
    return Response.json(
      { error: 'Post not found' },
      { status: 404 }
    )
  }
}
