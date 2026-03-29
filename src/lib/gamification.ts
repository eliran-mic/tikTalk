import { prisma } from '@/lib/db'

// XP rewards per action
const XP_REWARDS: Record<string, number> = {
  like: 5,
  comment: 15,
  listen: 10,
  streak: 25,      // daily streak bonus
  challenge: 50,   // completing a daily challenge
  referral: 100,   // successful referral
  follow: 10,
}

// Level thresholds — level N requires XP_FOR_LEVEL(N)
// Level 1: 0, Level 2: 100, Level 3: 250, Level 4: 450, ...
function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.floor(50 * (level - 1) * (level / 2))
}

export function calculateLevel(totalXp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= totalXp) {
    level++
  }
  return level
}

export function xpToNextLevel(totalXp: number): { current: number; required: number; progress: number } {
  const level = calculateLevel(totalXp)
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  const progressXp = totalXp - currentLevelXp
  const requiredXp = nextLevelXp - currentLevelXp
  return {
    current: progressXp,
    required: requiredXp,
    progress: requiredXp > 0 ? progressXp / requiredXp : 1,
  }
}

/**
 * Award XP to a user for an action.
 * Updates user XP total and level, creates XP event log.
 */
export async function awardXp(
  userId: string,
  action: string,
  metadata?: Record<string, string | number | boolean>
): Promise<{ xp: number; totalXp: number; level: number; leveledUp: boolean }> {
  const xp = XP_REWARDS[action] ?? 0
  if (xp === 0) return { xp: 0, totalXp: 0, level: 1, leveledUp: false }

  // Create XP event and update user in a transaction
  const user = await prisma.$transaction(async (tx) => {
    await tx.xpEvent.create({
      data: { userId, action, xp, metadata: metadata as Record<string, string | number | boolean> ?? undefined },
    })

    return tx.user.update({
      where: { id: userId },
      data: { xp: { increment: xp } },
      select: { xp: true, level: true },
    })
  })

  const newLevel = calculateLevel(user.xp)
  const leveledUp = newLevel > user.level

  if (leveledUp) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel },
    })
  }

  return { xp, totalXp: user.xp, level: newLevel, leveledUp }
}

/**
 * Update the user's daily streak.
 * Call this on any user activity. Awards streak XP bonus.
 */
export async function updateStreak(userId: string): Promise<{
  currentStreak: number
  longestStreak: number
  streakBonusAwarded: boolean
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveDate: true, currentStreak: true, longestStreak: true },
  })

  if (!user) return { currentStreak: 0, longestStreak: 0, streakBonusAwarded: false }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (user.lastActiveDate) {
    const lastActive = new Date(user.lastActiveDate)
    const lastDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate())

    // Already active today — no change
    if (lastDay.getTime() === today.getTime()) {
      return { currentStreak: user.currentStreak, longestStreak: user.longestStreak, streakBonusAwarded: false }
    }

    const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      // Consecutive day — extend streak
      const newStreak = user.currentStreak + 1
      const newLongest = Math.max(newStreak, user.longestStreak)

      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: now,
        },
      })

      // Award streak XP
      await awardXp(userId, 'streak', { day: newStreak })

      return { currentStreak: newStreak, longestStreak: newLongest, streakBonusAwarded: true }
    }

    // Streak broken — reset
    await prisma.user.update({
      where: { id: userId },
      data: { currentStreak: 1, lastActiveDate: now },
    })

    return { currentStreak: 1, longestStreak: user.longestStreak, streakBonusAwarded: false }
  }

  // First activity ever
  await prisma.user.update({
    where: { id: userId },
    data: { currentStreak: 1, lastActiveDate: now },
  })

  return { currentStreak: 1, longestStreak: 1, streakBonusAwarded: false }
}

/**
 * Get user's gamification profile.
 */
export async function getGamificationProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      xp: true,
      level: true,
      currentStreak: true,
      longestStreak: true,
      referralCode: true,
      lastActiveDate: true,
    },
  })

  if (!user) return null

  const levelProgress = xpToNextLevel(user.xp)

  // Get recent XP events
  const recentXp = await prisma.xpEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { action: true, xp: true, createdAt: true },
  })

  // Get referral count
  const referralCount = await prisma.referral.count({
    where: { referrerId: userId },
  })

  // Get challenge completion count
  const challengeCount = await prisma.challengeEntry.count({
    where: { userId, completed: true },
  })

  return {
    xp: user.xp,
    level: user.level,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    referralCode: user.referralCode,
    levelProgress,
    recentXp,
    referralCount,
    challengeCount,
  }
}
