/**
 * Structured generation metrics logger.
 * Tracks attempted/succeeded/failed/fallback counts per generation run.
 */

export interface GenerationMetrics {
  totalAttempted: number
  totalSucceeded: number
  totalFailed: number
  totalFallbackToMock: number
  agentMetrics: Record<
    string,
    {
      attempted: number
      succeeded: number
      failed: number
      fallbackToMock: number
    }
  >
}

export function createGenerationLogger(): {
  logAttempt: (agentName: string) => void
  logSuccess: (agentName: string) => void
  logFailure: (agentName: string, error: string) => void
  logFallback: (agentName: string, reason: string) => void
  getMetrics: () => GenerationMetrics
} {
  const metrics: GenerationMetrics = {
    totalAttempted: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    totalFallbackToMock: 0,
    agentMetrics: {},
  }

  function ensureAgent(agentName: string) {
    if (!metrics.agentMetrics[agentName]) {
      metrics.agentMetrics[agentName] = {
        attempted: 0,
        succeeded: 0,
        failed: 0,
        fallbackToMock: 0,
      }
    }
  }

  return {
    logAttempt(agentName: string) {
      ensureAgent(agentName)
      metrics.totalAttempted++
      metrics.agentMetrics[agentName].attempted++
      console.log(
        JSON.stringify({
          event: 'generation_attempt',
          agent: agentName,
          timestamp: new Date().toISOString(),
        })
      )
    },

    logSuccess(agentName: string) {
      ensureAgent(agentName)
      metrics.totalSucceeded++
      metrics.agentMetrics[agentName].succeeded++
      console.log(
        JSON.stringify({
          event: 'generation_success',
          agent: agentName,
          timestamp: new Date().toISOString(),
        })
      )
    },

    logFailure(agentName: string, error: string) {
      ensureAgent(agentName)
      metrics.totalFailed++
      metrics.agentMetrics[agentName].failed++
      console.log(
        JSON.stringify({
          event: 'generation_failure',
          agent: agentName,
          error,
          timestamp: new Date().toISOString(),
        })
      )
    },

    logFallback(agentName: string, reason: string) {
      ensureAgent(agentName)
      metrics.totalFallbackToMock++
      metrics.agentMetrics[agentName].fallbackToMock++
      console.log(
        JSON.stringify({
          event: 'generation_fallback_to_mock',
          agent: agentName,
          reason,
          timestamp: new Date().toISOString(),
        })
      )
    },

    getMetrics() {
      return metrics
    },
  }
}
