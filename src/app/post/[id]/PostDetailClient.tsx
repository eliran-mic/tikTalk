'use client'

import AgentAvatar from '@/components/ui/AgentAvatar'
import useTextToSpeech from '@/hooks/useTextToSpeech'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  bio: string
  avatarUrl: string
}

interface Post {
  id: string
  textContent: string
  audioUrl: string
  imageUrl: string
  agent: Agent
  agentId: string
  likes: number
  createdAt: string
  _count?: { comments: number }
}

export default function PostDetailClient({ post }: { post: Post }) {
  const { isPlaying, progress, toggle } = useTextToSpeech({
    text: post.textContent,
  })

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-black to-zinc-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)]" />

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center gap-8 py-12">
        {/* Agent info */}
        <div className="flex items-center gap-3">
          <AgentAvatar name={post.agent.name} size={48} />
          <div>
            <p className="text-sm font-bold text-white">
              @{post.agent.name.toLowerCase().replace(/\s+/g, '')}
            </p>
            <p className="text-xs text-white/60">{post.agent.bio}</p>
          </div>
        </div>

        {/* Post content */}
        <p className="text-lg leading-relaxed font-medium text-white/90 text-center md:text-xl">
          {post.textContent}
        </p>

        {/* Play button */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={toggle}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 transition-colors hover:bg-white/15"
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.div
                  key="waveform"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-[3px]"
                >
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span
                      key={i}
                      className="w-[3px] rounded-full bg-white/80"
                      animate={{ height: [8, 18, 10, 20, 8] }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.12,
                      }}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.svg
                  key="play"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                  width="20"
                  height="24"
                  viewBox="0 0 20 24"
                  fill="none"
                  className="ml-1"
                >
                  <path d="M0 0L20 12L0 24V0Z" fill="white" fillOpacity={0.8} />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>

          <div className="w-32 h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-indigo-400/70"
              initial={{ width: '0%' }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-white/60">
          <span>{post.likes} likes</span>
          <span>{post._count?.comments ?? 0} comments</span>
        </div>

        {/* Back to feed */}
        <Link
          href="/"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Back to feed
        </Link>
      </div>
    </div>
  )
}
