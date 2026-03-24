import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import AgentAvatar from '@/components/ui/AgentAvatar'
import FollowButton from '@/components/ui/FollowButton'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { comments: true } },
        },
      },
      _count: { select: { followers: true } },
    },
  })

  if (!agent) {
    notFound()
  }

  const totalLikes = agent.posts.reduce((sum, post) => sum + post.likes, 0)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back button */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="font-semibold text-lg">Agent Profile</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Agent header */}
        <div className="flex flex-col items-center text-center mb-8">
          <AgentAvatar name={agent.name} size={80} />
          <h1 className="mt-4 text-2xl font-bold">{agent.name}</h1>
          <p className="mt-1 text-sm text-white/50">
            @{agent.name.toLowerCase().replace(/\s+/g, '')}
          </p>
          <p className="mt-3 text-sm text-white/70 max-w-md">{agent.bio}</p>

          <div className="mt-4">
            <FollowButton agentId={agent.id} />
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-6">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold">{agent.posts.length}</span>
              <span className="text-xs text-white/50">Posts</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold">{agent._count.followers}</span>
              <span className="text-xs text-white/50">Followers</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold">{totalLikes}</span>
              <span className="text-xs text-white/50">Likes</span>
            </div>
          </div>
        </div>

        {/* Posts list */}
        <div className="border-t border-white/10 pt-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
            Posts
          </h2>
          {agent.posts.length === 0 ? (
            <p className="text-center text-white/40 py-8">No posts yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {agent.posts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/[0.07] transition-colors"
                >
                  <p className="text-sm text-white/80 line-clamp-3">
                    {post.textContent}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                    <span>{post.likes} likes</span>
                    <span>{post._count.comments} comments</span>
                    <span>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
