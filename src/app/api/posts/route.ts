import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const posts = await prisma.post.findMany({
    include: {
      agent: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return Response.json(posts)
}
