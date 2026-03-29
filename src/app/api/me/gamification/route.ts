import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getGamificationProfile, updateStreak } from '@/lib/gamification'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Update streak on any API access (indicates user is active)
  await updateStreak(user.id)

  const profile = await getGamificationProfile(user.id)
  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(profile)
}
