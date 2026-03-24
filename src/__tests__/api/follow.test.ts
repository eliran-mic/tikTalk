import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma, resetMocks } from '../helpers'
import { mockCookieStore } from '../setup'

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: vi.fn(() => null),
}))

function setupAuth() {
  mockCookieStore.set('session_token', { name: 'session_token', value: 'valid-token' })
  mockPrisma.session.findUnique.mockResolvedValue({
    id: 'sess-1',
    token: 'valid-token',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 86400000),
  })
  mockPrisma.user.findUnique.mockResolvedValue({
    id: 'user-1',
    username: 'testuser',
    createdAt: new Date(),
  })
}

describe('Follow API Routes', () => {
  beforeEach(() => {
    resetMocks()
    mockCookieStore.clear()
  })

  describe('POST /api/agents/[id]/follow', () => {
    it('requires authentication', async () => {
      const { POST } = await import('@/app/api/agents/[id]/follow/route')

      const req = new Request('http://localhost:3000/api/agents/agent-1/follow', { method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ id: 'agent-1' }) })

      expect(res.status).toBe(401)
    })

    it('creates a follow for an existing agent', async () => {
      const { POST } = await import('@/app/api/agents/[id]/follow/route')

      setupAuth()
      mockPrisma.agent.findUnique.mockResolvedValue({ id: 'agent-1', name: 'Agent' })
      mockPrisma.follow.findUnique.mockResolvedValue(null)
      mockPrisma.follow.create.mockResolvedValue({ id: 'follow-1' })

      const req = new Request('http://localhost:3000/api/agents/agent-1/follow', { method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ id: 'agent-1' }) })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.following).toBe(true)
    })

    it('returns existing follow without creating duplicate', async () => {
      const { POST } = await import('@/app/api/agents/[id]/follow/route')

      setupAuth()
      mockPrisma.agent.findUnique.mockResolvedValue({ id: 'agent-1', name: 'Agent' })
      mockPrisma.follow.findUnique.mockResolvedValue({ id: 'follow-1' })

      const req = new Request('http://localhost:3000/api/agents/agent-1/follow', { method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ id: 'agent-1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.following).toBe(true)
      expect(mockPrisma.follow.create).not.toHaveBeenCalled()
    })

    it('returns 404 for nonexistent agent', async () => {
      const { POST } = await import('@/app/api/agents/[id]/follow/route')

      setupAuth()
      mockPrisma.agent.findUnique.mockResolvedValue(null)

      const req = new Request('http://localhost:3000/api/agents/ghost/follow', { method: 'POST' })
      const res = await POST(req, { params: Promise.resolve({ id: 'ghost' }) })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/agents/[id]/follow', () => {
    it('requires authentication', async () => {
      const { DELETE } = await import('@/app/api/agents/[id]/follow/route')

      const req = new Request('http://localhost:3000/api/agents/agent-1/follow', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: 'agent-1' }) })

      expect(res.status).toBe(401)
    })

    it('removes a follow', async () => {
      const { DELETE } = await import('@/app/api/agents/[id]/follow/route')

      setupAuth()
      mockPrisma.follow.deleteMany.mockResolvedValue({ count: 1 })

      const req = new Request('http://localhost:3000/api/agents/agent-1/follow', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: 'agent-1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.following).toBe(false)
    })
  })

  describe('GET /api/users/me/following', () => {
    it('requires authentication', async () => {
      const { GET } = await import('@/app/api/users/me/following/route')

      const res = await GET()

      expect(res.status).toBe(401)
    })

    it('returns followed agents', async () => {
      const { GET } = await import('@/app/api/users/me/following/route')

      setupAuth()
      mockPrisma.follow.findMany.mockResolvedValue([
        {
          agent: { id: 'agent-1', name: 'Agent 1', bio: 'Bio', avatarUrl: '/avatars/default.png' },
        },
      ])

      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.following).toHaveLength(1)
      expect(data.following[0].id).toBe('agent-1')
    })
  })
})
