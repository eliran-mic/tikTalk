import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FollowButton from '@/components/ui/FollowButton'

let mockUser: { id: string; username: string } | null = null

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}))

describe('FollowButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUser = null
  })

  it('renders nothing when not authenticated', () => {
    mockUser = null
    const { container } = render(<FollowButton agentId="agent-1" />)
    expect(container.innerHTML).toBe('')
  })

  it('shows Follow when not following', async () => {
    mockUser = { id: 'user-1', username: 'testuser' }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ following: [] }),
    })

    render(<FollowButton agentId="agent-1" />)

    await waitFor(() => {
      expect(screen.getByText('Follow')).toBeInTheDocument()
    })
  })

  it('shows Following when already following', async () => {
    mockUser = { id: 'user-1', username: 'testuser' }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ following: [{ id: 'agent-1' }] }),
    })

    render(<FollowButton agentId="agent-1" />)

    await waitFor(() => {
      expect(screen.getByText('Following')).toBeInTheDocument()
    })
  })

  it('toggles follow state on click', async () => {
    mockUser = { id: 'user-1', username: 'testuser' }
    const fetchMock = vi.fn()
      // First call: check following
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ following: [] }),
      })
      // Second call: POST follow
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ following: true }),
      })
    global.fetch = fetchMock

    render(<FollowButton agentId="agent-1" />)

    await waitFor(() => {
      expect(screen.getByText('Follow')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Follow'))

    await waitFor(() => {
      expect(screen.getByText('Following')).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/agents/agent-1/follow',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
