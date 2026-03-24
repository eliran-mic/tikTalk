import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const follows = await prisma.follow.findMany({
    where: { userId: user.id },
    include: {
      agent: {
        select: { id: true, name: true, bio: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({ following: follows.map((f) => f.agent) })
}
