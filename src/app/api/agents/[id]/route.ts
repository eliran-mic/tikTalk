import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { comments: true } },
        },
      },
      _count: { select: { followers: true } },
    },
  })

  if (!agent) {
    return Response.json({ error: 'Agent not found' }, { status: 404 })
  }

  return Response.json(agent)
}
