import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma, createJsonRequest, resetMocks } from '../helpers'
import { mockCookieStore } from '../setup'

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

// Mock rate-limit to always allow
vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: vi.fn(() => null),
}))

describe('Auth API Routes', () => {
  beforeEach(() => {
    resetMocks()
    mockCookieStore.clear()
  })

  describe('POST /api/auth/signup', () => {
    it('creates a new user and sets session cookie', async () => {
      const { POST } = await import('@/app/api/auth/signup/route')

      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        createdAt: new Date(),
      })
      mockPrisma.session.create.mockResolvedValue({ id: 'session-1' })

      const req = createJsonRequest('/api/auth/signup', {
        username: 'testuser',
        password: 'password123',
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.user.username).toBe('testuser')
      expect(mockPrisma.session.create).toHaveBeenCalled()
    })

    it('rejects duplicate usernames', async () => {
      const { POST } = await import('@/app/api/auth/signup/route')

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' })

      const req = createJsonRequest('/api/auth/signup', {
        username: 'testuser',
        password: 'password123',
      })

      const res = await POST(req)
      expect(res.status).toBe(409)
    })

    it('rejects short passwords', async () => {
      const { POST } = await import('@/app/api/auth/signup/route')

      const req = createJsonRequest('/api/auth/signup', {
        username: 'testuser',
        password: '123',
      })

      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    it('rejects missing fields', async () => {
      const { POST } = await import('@/app/api/auth/signup/route')

      const req = createJsonRequest('/api/auth/signup', {})

      const res = await POST(req)
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const { POST } = await import('@/app/api/auth/login/route')
      const bcrypt = await import('bcryptjs')

      ;(bcrypt.default.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'hashed',
        createdAt: new Date(),
      })
      mockPrisma.session.create.mockResolvedValue({ id: 'session-1' })

      const req = createJsonRequest('/api/auth/login', {
        username: 'testuser',
        password: 'password123',
      })

      const res = await POST(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.user.username).toBe('testuser')
    })

    it('rejects invalid credentials', async () => {
      const { POST } = await import('@/app/api/auth/login/route')
      const bcrypt = await import('bcryptjs')

      ;(bcrypt.default.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        passwordHash: 'hashed',
      })

      const req = createJsonRequest('/api/auth/login', {
        username: 'testuser',
        password: 'wrong',
      })

      const res = await POST(req)
      expect(res.status).toBe(401)
    })

    it('rejects nonexistent user', async () => {
      const { POST } = await import('@/app/api/auth/login/route')

      mockPrisma.user.findUnique.mockResolvedValue(null)

      const req = createJsonRequest('/api/auth/login', {
        username: 'ghost',
        password: 'password123',
      })

      const res = await POST(req)
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('clears session and cookie', async () => {
      const { POST } = await import('@/app/api/auth/logout/route')

      mockCookieStore.set('session_token', { name: 'session_token', value: 'tok-123' })

      const res = await POST(new Request('http://localhost:3000/api/auth/logout', { method: 'POST' }))
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { token: 'tok-123' },
      })
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns null when not authenticated', async () => {
      const { GET } = await import('@/app/api/auth/me/route')

      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.user).toBeNull()
    })

    it('returns user when authenticated', async () => {
      const { GET } = await import('@/app/api/auth/me/route')

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

      const res = await GET()
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.user.username).toBe('testuser')
    })
  })
})
