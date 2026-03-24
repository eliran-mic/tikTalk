import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CommentSheet from '@/components/feed/CommentSheet'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      return ({ children, ...props }: Record<string, unknown>) => {
        const safeProps: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(props)) {
          if (typeof value !== 'object' || value === null) {
            safeProps[key] = value
          }
        }
        return <div data-motion={prop as string} {...safeProps}>{children as React.ReactNode}</div>
      }
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

// Track the auth state so tests can switch it
let mockUser: { id: string; username: string } | null = null

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}))

describe('CommentSheet', () => {
  const onClose = vi.fn()
  const onCountChange = vi.fn()

  beforeEach(() => {
    vi.restoreAllMocks()
    mockUser = null
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
  })

  it('does not render when closed', () => {
    const { container } = render(
      <CommentSheet postId="post-1" open={false} onClose={onClose} onCountChange={onCountChange} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('fetches and displays comments when opened', async () => {
    const mockComments = [
      { id: 'c1', text: 'Great post!', createdAt: new Date().toISOString(), user: { id: 'u1', username: 'alice' } },
    ]
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockComments,
    })

    render(
      <CommentSheet postId="post-1" open={true} onClose={onClose} onCountChange={onCountChange} />
    )

    await waitFor(() => {
      expect(screen.getByText('Great post!')).toBeInTheDocument()
    })
    expect(screen.getByText('@alice')).toBeInTheDocument()
  })

  it('shows login prompt when user is not authenticated', () => {
    mockUser = null
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })

    render(
      <CommentSheet postId="post-1" open={true} onClose={onClose} onCountChange={onCountChange} />
    )

    expect(screen.getByText('Log in')).toBeInTheDocument()
    expect(screen.getByText(/to comment/)).toBeInTheDocument()
  })

  it('shows comment input when authenticated', async () => {
    mockUser = { id: 'user-1', username: 'testuser' }
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })

    render(
      <CommentSheet postId="post-1" open={true} onClose={onClose} onCountChange={onCountChange} />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument()
    })
  })

  it('submits a comment', async () => {
    mockUser = { id: 'user-1', username: 'testuser' }

    const fetchMock = vi.fn()
      // First call: GET comments
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      // Second call: POST comment
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'c-new',
          text: 'My comment',
          createdAt: new Date().toISOString(),
          user: { id: 'user-1', username: 'testuser' },
        }),
      })
    global.fetch = fetchMock

    render(
      <CommentSheet postId="post-1" open={true} onClose={onClose} onCountChange={onCountChange} />
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Add a comment...')
    fireEvent.change(input, { target: { value: 'My comment' } })

    const submitBtn = screen.getByText('Post')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/posts/post-1/comments',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
