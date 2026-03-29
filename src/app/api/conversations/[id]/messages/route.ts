import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/conversations/[id]/messages — get conversation messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!conversation || conversation.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, content: true, createdAt: true },
  })

  return NextResponse.json(messages)
}

// POST /api/conversations/[id]/messages — send message and get AI response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { message } = body as Record<string, unknown>
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  if (message.trim().length > 2000) {
    return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })
  }

  // Verify conversation belongs to user
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      agent: { select: { name: true, systemPrompt: true } },
    },
  })

  if (!conversation || conversation.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Save user message
  await prisma.message.create({
    data: {
      conversationId: id,
      role: 'user',
      content: message.trim(),
    },
  })

  // Get recent conversation history for context (last 20 messages)
  const history = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: { role: true, content: true },
  })

  // Generate AI response
  let aiContent: string

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic()

      const chatSystemPrompt = `${conversation.agent.systemPrompt}

You are now in a 1-on-1 conversation with a user. Respond naturally and in character. Keep responses concise (2-4 paragraphs max). Be warm, engaging, and true to your persona. Ask follow-up questions to keep the conversation going. Never break character.`

      const apiMessages = history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: chatSystemPrompt,
        messages: apiMessages,
      })

      const textBlock = response.content.find((b) => b.type === 'text')
      aiContent = textBlock?.text ?? "I'm having trouble gathering my thoughts. Could you try again?"
    } catch {
      aiContent = generateFallbackResponse(conversation.agent.name, message.trim())
    }
  } else {
    aiContent = generateFallbackResponse(conversation.agent.name, message.trim())
  }

  // Save AI response
  const aiMessage = await prisma.message.create({
    data: {
      conversationId: id,
      role: 'assistant',
      content: aiContent,
    },
  })

  // Update conversation title from first user message if it's still default
  if (conversation.title === 'New conversation') {
    const title = message.trim().length > 40
      ? message.trim().slice(0, 37) + '...'
      : message.trim()
    await prisma.conversation.update({
      where: { id },
      data: { title },
    })
  }

  // Touch updatedAt
  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  })

  return NextResponse.json({
    userMessage: { role: 'user', content: message.trim() },
    aiMessage: { id: aiMessage.id, role: 'assistant', content: aiContent, createdAt: aiMessage.createdAt },
  })
}

function generateFallbackResponse(agentName: string, userMessage: string): string {
  const responses: Record<string, string[]> = {
    default: [
      `That's a really thoughtful question about "${userMessage.slice(0, 50)}..." — let me share my perspective.\n\nI think the key insight here is that most people overcomplicate this. The real answer often lies in stripping things back to fundamentals. What's the core of what you're really asking?\n\nI'd love to hear more about what prompted this question.`,
      `I love that you're thinking about this. "${userMessage.slice(0, 50)}..." is something I've spent a lot of time reflecting on.\n\nHere's what I've found: the answer usually isn't what you expect. It's rarely the obvious path that leads to the deepest understanding.\n\nWhat's your instinct telling you?`,
      `Great question. Let me think about this from my perspective.\n\nWhen it comes to "${userMessage.slice(0, 50)}...", I think there's a nuance most people miss. The surface-level answer is easy, but the real insight requires sitting with the discomfort of not knowing for a moment.\n\nTell me more about where you're coming from with this.`,
    ],
  }

  const pool = responses[agentName] ?? responses.default
  return pool[Math.floor(Math.random() * pool.length)]
}
