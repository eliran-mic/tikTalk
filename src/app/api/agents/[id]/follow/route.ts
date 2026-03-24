import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params
  const user = await getCurrentUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const agent = await prisma.agent.findUnique({ where: { id: agentId } })
  if (!agent) {
    return Response.json({ error: 'Agent not found' }, { status: 404 })
  }

  const existing = await prisma.follow.findUnique({
    where: { userId_agentId: { userId: user.id, agentId } },
  })

  if (existing) {
    return Response.json({ following: true })
  }

  await prisma.follow.create({
    data: { userId: user.id, agentId },
  })

  return Response.json({ following: true }, { status: 201 })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params
  const user = await getCurrentUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  await prisma.follow.deleteMany({
    where: { userId: user.id, agentId },
  })

  return Response.json({ following: false })
}
