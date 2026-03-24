import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma, createRequest, resetMocks } from '../helpers'

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: vi.fn(() => null),
}))

describe('Search API Routes', () => {
  beforeEach(() => {
    resetMocks()
  })

  describe('GET /api/search', () => {
    it('returns empty results for empty query', async () => {
      const { GET } = await import('@/app/api/search/route')

      const req = createRequest('/api/search?q=')
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.posts).toEqual([])
      expect(data.agents).toEqual([])
    })

    it('returns matching posts and agents', async () => {
      const { GET } = await import('@/app/api/search/route')

      mockPrisma.post.findMany.mockResolvedValue([
        { id: 'post-1', textContent: 'stoic wisdom' },
      ])
      mockPrisma.agent.findMany.mockResolvedValue([
        { id: 'agent-1', name: 'Stoic Marcus' },
      ])

      const req = createRequest('/api/search?q=stoic')
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.posts).toHaveLength(1)
      expect(data.agents).toHaveLength(1)
    })
  })
})
