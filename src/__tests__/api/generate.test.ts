import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetMocks } from '../helpers'

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: vi.fn(() => null),
}))

const mockGenerateContentForAllAgents = vi.fn()

vi.mock('@/lib/content-generator', () => ({
  generateContentForAllAgents: (...args: unknown[]) => mockGenerateContentForAllAgents(...args),
}))

describe('Generate API Routes', () => {
  const originalCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    resetMocks()
    mockGenerateContentForAllAgents.mockReset()
    delete process.env.CRON_SECRET
  })

  afterEach(() => {
    if (originalCronSecret !== undefined) {
      process.env.CRON_SECRET = originalCronSecret
    } else {
      delete process.env.CRON_SECRET
    }
  })

  describe('POST /api/generate', () => {
    it('triggers content generation and returns results', async () => {
      const { POST } = await import('@/app/api/generate/route')

      mockGenerateContentForAllAgents.mockResolvedValue({
        results: [
          { agentName: 'Agent 1', postsCreated: 2 },
          { agentName: 'Agent 2', postsCreated: 1 },
        ],
        metrics: { attempted: 3, succeeded: 3, failed: 0, fallback: 0 },
      })

      const req = new Request('http://localhost:3000/api/generate', { method: 'POST' })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.totalPostsGenerated).toBe(3)
      expect(data.agents).toHaveLength(2)
    })

    it('returns 401 when CRON_SECRET is set but not provided', async () => {
      const { POST } = await import('@/app/api/generate/route')

      process.env.CRON_SECRET = 'my-secret'

      const req = new Request('http://localhost:3000/api/generate', { method: 'POST' })
      const res = await POST(req)

      expect(res.status).toBe(401)
    })

    it('accepts request when CRON_SECRET matches', async () => {
      const { POST } = await import('@/app/api/generate/route')

      process.env.CRON_SECRET = 'my-secret'
      mockGenerateContentForAllAgents.mockResolvedValue({
        results: [],
        metrics: { attempted: 0, succeeded: 0, failed: 0, fallback: 0 },
      })

      const req = new Request('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: { Authorization: 'Bearer my-secret' },
      })
      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 500 on generation error', async () => {
      const { POST } = await import('@/app/api/generate/route')

      mockGenerateContentForAllAgents.mockRejectedValue(new Error('API down'))

      const req = new Request('http://localhost:3000/api/generate', { method: 'POST' })
      const res = await POST(req)

      expect(res.status).toBe(500)
    })
  })
})
