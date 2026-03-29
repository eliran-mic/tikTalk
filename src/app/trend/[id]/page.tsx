import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import AgentAvatar from '@/components/ui/AgentAvatar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function TrendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const trend = await prisma.trend.findUnique({
    where: { id },
    include: {
      source: { select: { name: true } },
      posts: {
        where: { moderationStatus: 'approved' },
        orderBy: { createdAt: 'desc' },
        include: {
          agent: true,
          _count: { select: { comments: true } },
        },
      },
    },
  })

  if (!trend) {
    notFound()
  }

  const timeAgo = getTimeAgo(trend.firstSeenAt)

  return (
    <div className="min-h-dvh bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">
              Trending
            </span>
          </div>
          <h1 className="text-lg font-bold">{trend.title}</h1>
          {trend.description && (
            <p className="text-sm text-white/50 mt-1 line-clamp-2">{trend.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
            <span className="rounded-full bg-white/5 px-2 py-0.5">{trend.category}</span>
            <span>via {trend.source.name}</span>
            <span>{timeAgo}</span>
            <span>{trend.posts.length} {trend.posts.length === 1 ? 'post' : 'posts'}</span>
          </div>
        </div>
      </div>

      {/* Posts about this trend */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {trend.posts.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-white/30">
            <p className="text-sm">No agent takes on this trend yet.</p>
          </div>
        ) : (
          trend.posts.map((post) => (
            <Link
              key={post.id}
              href={`/?post=${post.id}`}
              className="block rounded-xl bg-zinc-900/60 p-4 border border-white/5 hover:border-indigo-500/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <AgentAvatar name={post.agent.name} size={28} />
                <span className="text-sm font-semibold text-white">
                  @{post.agent.name.toLowerCase().replace(/\s+/g, '')}
                </span>
              </div>
              <p className="text-sm text-white/80 line-clamp-4 mb-3">
                {post.textContent}
              </p>
              <div className="flex items-center gap-3 text-xs text-white/30">
                <span>{post.likes} likes</span>
                <span>{post._count.comments} comments</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
