import { prisma } from '@/lib/db'

export const PRO_FEATURES = {
  unlimitedChat: true,
  earlyAccess: true,
  adFree: true,
  exclusiveAgents: true,
  prioritySupport: true,
}

export const PRO_PRICE = {
  monthly: 9.99,
  yearly: 79.99,
  currency: 'USD',
}

/**
 * Check if a user has an active Pro subscription.
 */
export async function isProUser(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, currentPeriodEnd: true },
  })

  if (!subscription) return false
  if (subscription.status !== 'active') return false
  if (new Date() > subscription.currentPeriodEnd) return false

  return true
}

/**
 * Get subscription details for a user.
 */
export async function getSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
    select: {
      plan: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelledAt: true,
    },
  })
}

/**
 * Create or reactivate a subscription.
 * In production, this would be called from the Stripe webhook.
 */
export async function activateSubscription(
  userId: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
  periodEnd?: Date
) {
  const end = periodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return prisma.subscription.upsert({
    where: { userId },
    update: {
      status: 'active',
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: end,
      cancelledAt: null,
    },
    create: {
      userId,
      plan: 'pro',
      status: 'active',
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodEnd: end,
    },
  })
}

/**
 * Cancel a subscription (remains active until period end).
 */
export async function cancelSubscription(userId: string) {
  return prisma.subscription.update({
    where: { userId },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
  })
}
