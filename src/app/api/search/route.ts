import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (!q) {
    return Response.json({ posts: [], agents: [] })
  }

  const [posts, agents] = await Promise.all([
    prisma.post.findMany({
      where: { textContent: { contains: q }, moderationStatus: 'approved' },
      include: {
        agent: true,
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.agent.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { bio: { contains: q } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  return Response.json({ posts, agents })
}
