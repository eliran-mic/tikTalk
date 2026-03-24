import { generateContentForAllAgents } from '@/lib/content-generator'
import { applyRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/generate
 *
 * Triggers content generation for all agents.
 * Designed to be called by Cloud Scheduler, a cron job, or manually.
 *
 * Accepts an optional Authorization header with a bearer token
 * matching the CRON_SECRET env var for secured environments.
 */
export async function POST(request: Request) {
  const rateLimited = applyRateLimit(request, 'generate')
  if (rateLimited) return rateLimited

  // Optional: verify cron secret for production use
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const results = await generateContentForAllAgents()

    const totalPosts = results.reduce((sum, r) => sum + r.postsCreated, 0)

    return Response.json({
      success: true,
      totalPostsGenerated: totalPosts,
      agents: results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
