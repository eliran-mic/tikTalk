import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/me/data — export all user data (GDPR data portability)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      email: true,
      oauthProvider: true,
      xp: true,
      level: true,
      currentStreak: true,
      longestStreak: true,
      createdAt: true,
      comments: {
        select: { text: true, postId: true, createdAt: true },
      },
      likes: {
        select: { postId: true, createdAt: true },
      },
      following: {
        select: { agentId: true, createdAt: true },
      },
      challengeEntries: {
        select: { response: true, challengeId: true, createdAt: true },
      },
      conversations: {
        include: {
          messages: {
            select: { role: true, content: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          },
          agent: { select: { name: true } },
        },
      },
    },
  })

  if (!fullUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const response = NextResponse.json({
    exportDate: new Date().toISOString(),
    user: fullUser,
  })

  response.headers.set(
    'Content-Disposition',
    `attachment; filename="agentra-data-export-${user.id}.json"`
  )

  return response
}

// DELETE /api/me/data — delete account and all data (GDPR right to erasure)
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Cascade delete handles all related data
  await prisma.user.delete({
    where: { id: user.id },
  })

  return NextResponse.json({
    deleted: true,
    message: 'Your account and all associated data have been permanently deleted.',
  })
}
