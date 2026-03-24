import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PostCard from '@/components/feed/PostCard'

// Mock framer-motion to render plain divs
vi.mock('framer-motion', () => {
  const actual = { AnimatePresence: ({ children }: { children: React.ReactNode }) => children }
  return {
    ...actual,
    motion: new Proxy({}, {
      get: (_target, prop) => {
        if (prop === 'div' || prop === 'svg' || prop === 'span' || prop === 'path') {
          const MotionComponent = ({ children, ...props }: Record<string, unknown>) => {
            const Component = prop as string
            const safeProps: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(props)) {
              if (typeof value !== 'object' || value === null) {
                safeProps[key] = value
              }
            }
            return <div data-motion={Component} {...safeProps}>{children as React.ReactNode}</div>
          }
          MotionComponent.displayName = `motion.${prop as string}`
          return MotionComponent
        }
        return undefined
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useMotionValue: (initial: number) => ({
      get: () => initial,
      set: () => {},
      on: () => () => {},
    }),
    useTransform: () => ({
      get: () => 0,
      set: () => {},
      on: () => () => {},
    }),
  }
})

// Mock useTextToSpeech
vi.mock('@/hooks/useTextToSpeech', () => ({
  default: () => ({
    isPlaying: false,
    progress: 0,
    toggle: vi.fn(),
    stop: vi.fn(),
  }),
}))

// Mock haptics
vi.mock('@/lib/haptics', () => ({
  haptics: { lightTap: vi.fn(), mediumTap: vi.fn(), success: vi.fn() },
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

// Mock FollowButton
vi.mock('@/components/ui/FollowButton', () => ({
  default: () => <button data-testid="follow-btn">Follow</button>,
}))

// Mock AgentAvatar
vi.mock('@/components/ui/AgentAvatar', () => ({
  default: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}))

// Mock CommentSheet
vi.mock('@/components/feed/CommentSheet', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="comment-sheet">Comments</div> : null,
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockPost = {
  id: 'post-1',
  textContent: 'Test post content here',
  audioUrl: '/audio/placeholder.mp3',
  imageUrl: '/images/placeholder.png',
  agent: {
    id: 'agent-1',
    name: 'Test Agent',
    bio: 'A test bio',
    avatarUrl: '/avatars/default.png',
  },
  agentId: 'agent-1',
  likes: 10,
  liked: false,
  createdAt: new Date().toISOString(),
  _count: { comments: 3 },
}

describe('PostCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  })

  it('renders post content', () => {
    render(<PostCard post={mockPost} isActive={false} onPlay={vi.fn()} />)
    expect(screen.getByText('Test post content here')).toBeInTheDocument()
  })

  it('renders agent name', () => {
    render(<PostCard post={mockPost} isActive={false} onPlay={vi.fn()} />)
    expect(screen.getByText('@testagent')).toBeInTheDocument()
  })

  it('renders like count', () => {
    render(<PostCard post={mockPost} isActive={false} onPlay={vi.fn()} />)
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders comment count', () => {
    render(<PostCard post={mockPost} isActive={false} onPlay={vi.fn()} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('initializes liked state from post.liked', () => {
    const likedPost = { ...mockPost, liked: true }
    render(<PostCard post={likedPost} isActive={false} onPlay={vi.fn()} />)
    // The like button should have aria-label "Unlike" when liked
    expect(screen.getByLabelText('Unlike')).toBeInTheDocument()
  })

  it('toggles like on click', async () => {
    render(<PostCard post={mockPost} isActive={false} onPlay={vi.fn()} />)

    const likeBtn = screen.getByLabelText('Like')
    fireEvent.click(likeBtn)

    // Count should increment optimistically
    expect(screen.getByText('11')).toBeInTheDocument()

    // Should call the API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/posts/post-1/like', { method: 'POST' })
    })
  })

  it('opens comment sheet on click', () => {
    render(<PostCard post={mockPost} isActive={false} onPlay={vi.fn()} />)

    const commentBtn = screen.getByLabelText('Comments')
    fireEvent.click(commentBtn)

    expect(screen.getByTestId('comment-sheet')).toBeInTheDocument()
  })
})
