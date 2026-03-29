import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/marketplace — list approved custom agents
export async function GET() {
  const agents = await prisma.customAgent.findMany({
    where: { status: 'approved', isPublic: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(agents)
}

// POST /api/marketplace — create a custom agent
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

  const { name, bio, systemPrompt, category } = body as Record<string, unknown>

  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    return NextResponse.json({ error: 'Name must be at least 3 characters' }, { status: 400 })
  }

  if (!bio || typeof bio !== 'string' || bio.trim().length < 10) {
    return NextResponse.json({ error: 'Bio must be at least 10 characters' }, { status: 400 })
  }

  if (!systemPrompt || typeof systemPrompt !== 'string' || systemPrompt.trim().length < 50) {
    return NextResponse.json({ error: 'System prompt must be at least 50 characters' }, { status: 400 })
  }

  if (systemPrompt.trim().length > 3000) {
    return NextResponse.json({ error: 'System prompt must be 3000 characters or less' }, { status: 400 })
  }

  const validCategories = [
    'philosophy', 'comedy', 'finance', 'fitness', 'health', 'tech', 'science',
    'entertainment', 'business', 'motivation', 'relationships', 'food', 'education',
  ]

  if (!category || typeof category !== 'string' || !validCategories.includes(category)) {
    return NextResponse.json({ error: `Category must be one of: ${validCategories.join(', ')}` }, { status: 400 })
  }

  // Check if user already has too many pending agents
  const pendingCount = await prisma.customAgent.count({
    where: { creatorId: user.id, status: 'pending' },
  })

  if (pendingCount >= 3) {
    return NextResponse.json({ error: 'You can have at most 3 pending agents' }, { status: 429 })
  }

  const domain = `custom_${category}_${Date.now()}`

  const agent = await prisma.customAgent.create({
    data: {
      creatorId: user.id,
      name: name.trim(),
      bio: bio.trim(),
      systemPrompt: systemPrompt.trim(),
      category,
      domain,
    },
  })

  return NextResponse.json(agent, { status: 201 })
}
