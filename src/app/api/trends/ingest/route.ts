import { NextResponse } from 'next/server'
import { runTrendIngestionPipeline } from '@/lib/trends/pipeline'

export const dynamic = 'force-dynamic'

/**
 * POST /api/trends/ingest
 * Runs the trend ingestion pipeline. Protected by CRON_SECRET.
 */
export async function POST(request: Request) {
  // Validate cron secret if configured
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const metrics = await runTrendIngestionPipeline()
    return NextResponse.json({ success: true, metrics })
  } catch (error) {
    console.error('Trend ingestion failed:', error)
    return NextResponse.json(
      { error: 'Trend ingestion failed', message: String(error) },
      { status: 500 }
    )
  }
}
