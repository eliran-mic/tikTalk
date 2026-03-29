import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTodaysChallenge, submitChallengeEntry } from '@/lib/challenges'
import { awardXp } from '@/lib/gamification'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const challenge = await getTodaysChallenge()
  if (!challenge) {
    return NextResponse.json({ error: 'No challenge available' }, { status: 404 })
  }

  const user = await getCurrentUser()
  let completed = false
  let userEntry = null

  if (user) {
    const entry = await prisma.challengeEntry.findUnique({
      where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
    })
    completed = !!entry
    userEntry = entry
  }

  return NextResponse.json({
    ...challenge,
    completed,
    userEntry,
  })
}

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

  const { challengeId, response } = body as Record<string, unknown>

  if (!challengeId || typeof challengeId !== 'string') {
    return NextResponse.json({ error: 'challengeId required' }, { status: 400 })
  }

  if (!response || typeof response !== 'string' || response.trim().length === 0) {
    return NextResponse.json({ error: 'Response text required' }, { status: 400 })
  }

  if (response.trim().length > 1000) {
    return NextResponse.json({ error: 'Response must be 1000 characters or less' }, { status: 400 })
  }

  const challenge = await prisma.dailyChallenge.findUnique({
    where: { id: challengeId },
  })

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
  }

  const result = await submitChallengeEntry(user.id, challengeId, response as string)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 409 })
  }

  // Award XP for completing the challenge
  const xpResult = await awardXp(user.id, 'challenge', { challengeId })

  return NextResponse.json({
    entry: result.entry,
    xp: xpResult,
  }, { status: 201 })
}
