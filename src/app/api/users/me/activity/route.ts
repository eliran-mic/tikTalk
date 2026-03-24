import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const comments = await prisma.comment.findMany({
    where: { userId: user.id },
    include: {
      post: {
        select: {
          id: true,
          textContent: true,
          agent: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({ comments })
}
