import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma, createRequest, createJsonRequest, resetMocks } from '../helpers'
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

describe('Comments API Routes', () => {
  beforeEach(() => {
    resetMocks()
    mockCookieStore.clear()
  })

  describe('GET /api/posts/[id]/comments', () => {
    it('returns comments for a post', async () => {
      const { GET } = await import('@/app/api/posts/[id]/comments/route')

      const mockComments = [
        {
          id: 'comment-1',
          text: 'Great post!',
          createdAt: new Date(),
          user: { id: 'user-1', username: 'testuser' },
        },
      ]
      mockPrisma.comment.findMany.mockResolvedValue(mockComments)

      const req = createRequest('/api/posts/post-1/comments')
      const res = await GET(req, { params: Promise.resolve({ id: 'post-1' }) })
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].text).toBe('Great post!')
    })
  })

  describe('POST /api/posts/[id]/comments', () => {
    it('requires authentication', async () => {
      const { POST } = await import('@/app/api/posts/[id]/comments/route')

      const req = createJsonRequest('/api/posts/post-1/comments', { text: 'Hello' })
      const res = await POST(req, { params: Promise.resolve({ id: 'post-1' }) })

      expect(res.status).toBe(401)
    })

    it('creates a comment when authenticated', async () => {
      const { POST } = await import('@/app/api/posts/[id]/comments/route')

      setupAuth()
      mockPrisma.post.findUnique.mockResolvedValue({ id: 'post-1' })
      mockPrisma.comment.create.mockResolvedValue({
        id: 'comment-1',
        text: 'Nice!',
        createdAt: new Date(),
        user: { id: 'user-1', username: 'testuser' },
      })

      const req = createJsonRequest('/api/posts/post-1/comments', { text: 'Nice!' })
      const res = await POST(req, { params: Promise.resolve({ id: 'post-1' }) })
      const data = await res.json()

      expect(res.status).toBe(201)
      expect(data.text).toBe('Nice!')
    })

    it('rejects empty comment text', async () => {
      const { POST } = await import('@/app/api/posts/[id]/comments/route')

      setupAuth()

      const req = createJsonRequest('/api/posts/post-1/comments', { text: '   ' })
      const res = await POST(req, { params: Promise.resolve({ id: 'post-1' }) })

      expect(res.status).toBe(400)
    })

    it('rejects comments over 500 characters', async () => {
      const { POST } = await import('@/app/api/posts/[id]/comments/route')

      setupAuth()

      const req = createJsonRequest('/api/posts/post-1/comments', {
        text: 'a'.repeat(501),
      })
      const res = await POST(req, { params: Promise.resolve({ id: 'post-1' }) })

      expect(res.status).toBe(400)
    })

    it('returns 404 for nonexistent post', async () => {
      const { POST } = await import('@/app/api/posts/[id]/comments/route')

      setupAuth()
      mockPrisma.post.findUnique.mockResolvedValue(null)

      const req = createJsonRequest('/api/posts/nonexistent/comments', { text: 'Hello' })
      const res = await POST(req, { params: Promise.resolve({ id: 'nonexistent' }) })

      expect(res.status).toBe(404)
    })
  })
})
