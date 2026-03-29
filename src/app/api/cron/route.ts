import { NextResponse } from 'next/server'
import { runTrendIngestionPipeline } from '@/lib/trends/pipeline'
import { generateContentForAllAgents } from '@/lib/content-generator'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron
 * Combined endpoint: runs trend ingestion then content generation.
 * Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // Step 1: Ingest trends
    const trendMetrics = await runTrendIngestionPipeline()

    // Step 2: Generate content for all agents
    const { results, metrics: generationMetrics } =
      await generateContentForAllAgents()

    const totalPosts = results.reduce((sum, r) => sum + r.postsCreated, 0)
    const totalTrend = results.reduce((sum, r) => sum + r.trendBased, 0)
    const totalStatic = results.reduce((sum, r) => sum + r.staticBased, 0)

    return NextResponse.json({
      success: true,
      trends: trendMetrics,
      generation: {
        totalPostsGenerated: totalPosts,
        trendBased: totalTrend,
        staticBased: totalStatic,
        agents: results,
        metrics: generationMetrics,
      },
    })
  } catch (error) {
    console.error('Cron job failed:', error)
    return NextResponse.json(
      { error: 'Cron job failed', message: String(error) },
      { status: 500 }
    )
  }
}
