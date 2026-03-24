import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma, createRequest, resetMocks } from '../helpers'
import { mockCookieStore } from '../setup'

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: vi.fn(() => null),
}))

vi.mock('@/lib/ranking', () => ({
  scorePost: vi.fn(() => 1),
}))

const mockAgent = {
  id: 'agent-1',
  name: 'Test Agent',
  bio: 'A test agent',
  avatarUrl: '/avatars/default.png',
  systemPrompt: 'test',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockPost = {
  id: 'post-1',
  textContent: 'Hello world',
  audioUrl: '/audio/placeholder.mp3',
  imageUrl: '/images/placeholder.png',
  agentId: 'agent-1',
  agent: mockAgent,
  likes: 5,
  createdAt: new Date(),
  _count: { comments: 2 },
}

// Helper to set up authenticated user
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

describe('Posts API Routes', () => {
  beforeEach(() => {
    resetMocks()
    mockCookieStore.clear()
  })

  describe('GET /api/posts', () => {
    it('returns a list of posts', async () => {
      const { GET } = await import('@/app/api/posts/route')

      mockPrisma.post.findMany.mockResolvedValue([mockPost])

      const req = createRequest('/api/posts')
      const res = await GET(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.posts).toHaveLength(1)
      expect(data.posts[0].id).toBe('post-1')
    })

    it('includes liked state for authenticated user', async () => {
      const { GET } = await import('@/app/api/posts/route')

      setupAuth()
      mockPrisma.post.findMany.mockResolvedValue([mockPost])
      mockPrisma.follow.findMany.mockResolvedValue([])
      mockPrisma.like.findMany.mockResolvedValue([{ postId: 'post-1' }])

      const req = createRequest('/api/posts')
      const res = await GET(req)
      const data = await res.json()

      expect(data.posts[0].liked).toBe(true)
    })

    it('returns liked=false for unauthenticated user', async () => {
      const { GET } = await import('@/app/api/posts/route')

      mockPrisma.post.findMany.mockResolvedValue([mockPost])

      const req = createRequest('/api/posts')
      const res = await GET(req)
      const data = await res.json()

      expect(data.posts[0].liked).toBe(false)
    })

    it('supports cursor-based pagination', async () => {
      const { GET } = await import('@/app/api/posts/route')

      const posts = Array.from({ length: 15 }, (_, i) => ({
        ...mockPost,
        id: `post-${i}`,
      }))
      mockPrisma.post.findMany.mockResolvedValue(posts)

      const req = createRequest('/api/posts?limit=5')
      const res = await GET(req)
      const data = await res.json()

      expect(data.posts).toHaveLength(5)
      expect(data.nextCursor).toBe('5')
    })
  })

  describe('GET /api/posts/[id]', () => {
    it('returns a single post', async () => {
      const { GET } = await import('@/app/api/posts/[id]/route')

      mockPrisma.post.findUnique.mockResolvedValue(mockPost)

      const req = createRequest('/api/posts/post-1')
      const res = await GET(req, { params: Promise.resolve({ id: 'post-1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.id).toBe('post-1')
      expect(data.liked).toBe(false)
    })

    it('returns 404 for missing post', async () => {
      const { GET } = await import('@/app/api/posts/[id]/route')

      mockPrisma.post.findUnique.mockResolvedValue(null)

      const req = createRequest('/api/posts/nonexistent')
      const res = await GET(req, { params: Promise.resolve({ id: 'nonexistent' }) })

      expect(res.status).toBe(404)
    })

    it('includes liked=true when user has liked the post', async () => {
      const { GET } = await import('@/app/api/posts/[id]/route')

      setupAuth()
      mockPrisma.post.findUnique.mockResolvedValue(mockPost)
      mockPrisma.like.findUnique.mockResolvedValue({ id: 'like-1' })

      const req = createRequest('/api/posts/post-1')
      const res = await GET(req, { params: Promise.resolve({ id: 'post-1' }) })
      const data = await res.json()

      expect(data.liked).toBe(true)
    })
  })

  describe('POST /api/posts/[id]/like', () => {
    it('requires authentication', async () => {
      const { POST } = await import('@/app/api/posts/[id]/like/route')

      const res = await POST(
        new Request('http://localhost:3000/api/posts/post-1/like', { method: 'POST' }),
        { params: Promise.resolve({ id: 'post-1' }) }
      )

      expect(res.status).toBe(401)
    })

    it('creates a like when not already liked', async () => {
      const { POST } = await import('@/app/api/posts/[id]/like/route')

      setupAuth()
      mockPrisma.like.findUnique.mockResolvedValue(null)
      mockPrisma.like.create.mockResolvedValue({ id: 'like-1' })
      mockPrisma.post.update.mockResolvedValue({ ...mockPost, likes: 6 })
      mockPrisma.post.findUnique.mockResolvedValue({ ...mockPost, likes: 6 })

      const res = await POST(
        new Request('http://localhost:3000/api/posts/post-1/like', { method: 'POST' }),
        { params: Promise.resolve({ id: 'post-1' }) }
      )
      const data = await res.json()

      expect(data.liked).toBe(true)
      expect(data.likes).toBe(6)
    })

    it('removes a like when already liked', async () => {
      const { POST } = await import('@/app/api/posts/[id]/like/route')

      setupAuth()
      mockPrisma.like.findUnique.mockResolvedValue({ id: 'like-1', userId: 'user-1', postId: 'post-1' })
      mockPrisma.like.delete.mockResolvedValue({})
      mockPrisma.post.update.mockResolvedValue({ ...mockPost, likes: 4 })
      mockPrisma.post.findUnique.mockResolvedValue({ ...mockPost, likes: 4 })

      const res = await POST(
        new Request('http://localhost:3000/api/posts/post-1/like', { method: 'POST' }),
        { params: Promise.resolve({ id: 'post-1' }) }
      )
      const data = await res.json()

      expect(data.liked).toBe(false)
      expect(data.likes).toBe(4)
    })
  })
})
