'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentAvatar from '@/components/ui/AgentAvatar';

interface Agent {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
}

interface Post {
  id: string;
  textContent: string;
  audioUrl: string;
  imageUrl: string;
  agent: Agent;
  agentId: string;
  likes: number;
  createdAt: string;
}

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(false);
  const [showBurst, setShowBurst] = useState(false);

  async function handleLike() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((prev) => (wasLiked ? prev - 1 : prev + 1));

    if (!wasLiked) {
      setShowBurst(true);
      setTimeout(() => setShowBurst(false), 600);
    }

    try {
      await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
    } catch {
      // Revert on error
      setLiked(wasLiked);
      setLikes((prev) => (wasLiked ? prev + 1 : prev - 1));
    }
  }

  return (
    <div
      className="relative w-full flex-shrink-0 flex items-center justify-center overflow-hidden"
      style={{ height: '100dvh', scrollSnapAlign: 'start' }}
    >
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-black to-zinc-950" />

      {/* Subtle radial accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)]" />

      {/* Main content — centered quote card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 mx-auto max-w-sm px-8 pb-36"
      >
        <p className="text-lg leading-relaxed font-medium text-white/90 line-clamp-[10] md:text-xl">
          {post.textContent}
        </p>
      </motion.div>

      {/* Play button placeholder */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="absolute bottom-44 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
        aria-label="Play audio (coming soon)"
      >
        <svg
          width="20"
          height="24"
          viewBox="0 0 20 24"
          fill="none"
          className="ml-1"
        >
          <path d="M0 0L20 12L0 24V0Z" fill="white" fillOpacity={0.8} />
        </svg>
      </motion.button>

      {/* Bottom-left: Agent info */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="absolute bottom-8 left-4 z-10 flex items-end gap-3 max-w-[70%]"
      >
        <AgentAvatar name={post.agent.name} size={44} />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-white">
            @{post.agent.name.toLowerCase().replace(/\s+/g, '')}
          </span>
          <span className="text-xs text-white/60 line-clamp-2">
            {post.agent.bio}
          </span>
        </div>
      </motion.div>

      {/* Right-side action bar */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="absolute bottom-10 right-4 z-10 flex flex-col items-center gap-6"
      >
        {/* Like button */}
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1"
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <div className="relative">
            <motion.div
              whileTap={{ scale: 1.3 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <HeartIcon filled={liked} />
            </motion.div>
            <AnimatePresence>
              {showBurst && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <HeartIcon filled />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <span className="text-xs text-white/80">{likes}</span>
        </button>

        {/* Comment icon placeholder */}
        <button className="flex flex-col items-center gap-1" aria-label="Comments">
          <CommentIcon />
          <span className="text-xs text-white/80">0</span>
        </button>

        {/* Share icon placeholder */}
        <button className="flex flex-col items-center gap-1" aria-label="Share">
          <ShareIcon />
          <span className="text-xs text-white/80">Share</span>
        </button>
      </motion.div>
    </div>
  );
}

/* ---- Icon components ---- */

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill={filled ? '#ef4444' : 'none'}
      stroke={filled ? '#ef4444' : 'white'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
