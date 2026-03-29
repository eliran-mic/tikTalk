import webpush from 'web-push'
import { prisma } from '@/lib/db'

// Configure VAPID keys (generate with: npx web-push generate-vapid-keys)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:hello@agentra.me',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  url?: string
  tag?: string
}

/**
 * Send a push notification to a specific user.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
      } catch (error) {
        // Remove expired/invalid subscriptions
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const statusCode = (error as { statusCode: number }).statusCode
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } })
          }
        }
        throw error
      }
    })
  )

  return {
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  }
}

/**
 * Send notifications to all followers of an agent when new content is posted.
 */
export async function notifyAgentFollowers(
  agentId: string,
  agentName: string,
  postId: string,
  excerpt: string
) {
  const followers = await prisma.follow.findMany({
    where: { agentId },
    select: { userId: true },
  })

  const payload: PushPayload = {
    title: `${agentName} just posted`,
    body: excerpt.length > 80 ? excerpt.slice(0, 77) + '...' : excerpt,
    icon: '/icons/icon-192.png',
    url: `/post/${postId}`,
    tag: `agent-${agentId}`,
  }

  const results = await Promise.allSettled(
    followers.map((f) => sendPushToUser(f.userId, payload))
  )

  return {
    notified: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  }
}
