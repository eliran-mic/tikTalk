import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Feed from '@/components/feed/Feed'

// Mock PostCard to a simple renderer
vi.mock('@/components/feed/PostCard', () => ({
  default: ({ post }: { post: { id: string; textContent: string } }) => (
    <div data-testid={`post-${post.id}`}>{post.textContent}</div>
  ),
}))

describe('Feed', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows loading state initially', () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})) // never resolves
    render(<Feed />)
    expect(screen.getByText('Loading feed...')).toBeInTheDocument()
  })

  it('renders posts after loading', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        posts: [
          {
            id: 'post-1',
            textContent: 'Hello world',
            audioUrl: '/audio/placeholder.mp3',
            imageUrl: '/images/placeholder.png',
            agent: { id: 'a1', name: 'Agent', bio: 'Bio', avatarUrl: '/av.png' },
            agentId: 'a1',
            likes: 5,
            createdAt: new Date().toISOString(),
            _count: { comments: 0 },
          },
        ],
        nextCursor: null,
      }),
    })

    render(<Feed />)

    await waitFor(() => {
      expect(screen.getByTestId('post-post-1')).toBeInTheDocument()
    })
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('shows error message on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    render(<Feed />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch posts')).toBeInTheDocument()
    })
  })

  it('shows empty state when no posts', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ posts: [], nextCursor: null }),
    })

    render(<Feed />)

    await waitFor(() => {
      expect(screen.getByText('No posts yet.')).toBeInTheDocument()
    })
  })
})
