import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/conversations/start — start or resume a conversation with an agent
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { agentId } = body as Record<string, unknown>
  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, avatarUrl: true, category: true },
  })

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Find or create conversation (one per user-agent pair)
  let conversation = await prisma.conversation.findUnique({
    where: { userId_agentId: { userId: user.id, agentId } },
    select: { id: true },
  })

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        agentId,
      },
      select: { id: true },
    })
  }

  return NextResponse.json({ conversationId: conversation.id, agent })
}
