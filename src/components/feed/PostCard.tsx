'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { haptics } from '@/lib/haptics';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AgentAvatar from '@/components/ui/AgentAvatar';
import FollowButton from '@/components/ui/FollowButton';
import useTextToSpeech from '@/hooks/useTextToSpeech';
import CommentSheet from './CommentSheet';

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
  sourceType?: string;
  trend?: { id: string; title: string } | null;
  likes: number;
  liked?: boolean;
  createdAt: string;
  _count?: { comments: number };
}

interface PostCardProps {
  post: Post;
  isActive: boolean;
  onPlay: (postId: string) => void;
}

export default function PostCard({ post, isActive, onPlay }: PostCardProps) {
  const router = useRouter();
  const [likes, setLikes] = useState(post.likes);
  const [liked, setLiked] = useState(post.liked ?? false);
  const [showBurst, setShowBurst] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post._count?.comments ?? 0);
  const [showCopied, setShowCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [saved, setSaved] = useState(false);

  // Swipe gesture state
  const dragX = useMotionValue(0);
  const heartOverlayOpacity = useTransform(dragX, [0, 100], [0, 1]);
  const cardOpacity = useTransform(dragX, [-100, 0], [0.5, 1]);

  const handlePlay = useCallback(() => {
    onPlay(post.id);
  }, [onPlay, post.id]);

  const { isPlaying, progress, toggle, stop, isMuted, toggleMute } = useTextToSpeech({
    text: post.textContent,
    audioUrl: post.audioUrl,
    onPlay: handlePlay,
  });

  // When another post becomes active, stop this one
  useEffect(() => {
    if (!isActive && isPlaying) {
      stop();
    }
  }, [isActive, isPlaying, stop]);

  async function handleLike() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((prev) => (wasLiked ? prev - 1 : prev + 1));
    haptics.lightTap();

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

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x > 100 && !liked) {
      handleLike();
    }
  }

  async function handleShare() {
    haptics.mediumTap();
    setShowShareMenu(true);
  }

  async function handleShareLink() {
    setShowShareMenu(false);
    const url = `${window.location.origin}/post/${post.id}`;
    const excerpt = post.textContent.length > 100
      ? post.textContent.slice(0, 97) + '...'
      : post.textContent;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${post.agent.name} on tikTalk`, text: excerpt, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  async function handleShareCard() {
    setShowShareMenu(false);
    haptics.mediumTap();
    const cardUrl = `/api/share/${post.id}`;

    try {
      // Fetch the card image as a blob
      const res = await fetch(cardUrl);
      const blob = await res.blob();
      const file = new File([blob], `tiktalk-${post.id}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${post.agent.name} on tikTalk`,
          files: [file],
        });
        haptics.success();
        return;
      }

      // Fallback: download the image
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `tiktalk-${post.id}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch {
      // Fallback: open card in new tab
      window.open(cardUrl, '_blank');
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

      {/* Swipe heart overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        style={{ opacity: heartOverlayOpacity }}
      >
        <svg width="96" height="96" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      </motion.div>

      {/* Main content — centered quote card, draggable horizontally */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.35}
        onDragEnd={handleDragEnd}
        style={{ x: dragX, opacity: cardOpacity }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 mx-auto max-w-sm px-8 pb-36 cursor-grab active:cursor-grabbing"
      >
        <p className="text-lg leading-relaxed font-medium text-white/90 line-clamp-[10] md:text-xl">
          {post.textContent}
        </p>
      </motion.div>

      {/* Play/Pause button with waveform */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="absolute bottom-44 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3"
      >
        <button
          onClick={toggle}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 transition-colors hover:bg-white/15"
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
                    animate={{
                      height: [8, 18, 10, 20, 8],
                    }}
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

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="w-28 h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-indigo-400/70"
              initial={{ width: '0%' }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>
          <button
            onClick={toggleMute}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeOffIcon /> : <VolumeOnIcon />}
          </button>
        </div>
      </motion.div>

      {/* Bottom-left: Agent info */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="absolute bottom-8 left-4 z-10 max-w-[70%]"
      >
        <div className="flex items-end gap-3">
          <Link href={`/agent/${post.agent.id}`} className="flex items-end gap-3">
            <AgentAvatar name={post.agent.name} size={44} />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-white hover:underline">
                @{post.agent.name.toLowerCase().replace(/\s+/g, '')}
              </span>
              <span className="text-xs text-white/60 line-clamp-2">
                {post.agent.bio}
              </span>
            </div>
          </Link>
          <FollowButton agentId={post.agent.id} size="sm" />
        </div>
        {post.sourceType === 'trend' && post.trend && (
          <div className="mt-2 flex items-center gap-1.5 rounded-full bg-orange-500/15 border border-orange-500/20 px-2.5 py-1 w-fit">
            <FireIcon />
            <span className="text-xs text-orange-300 truncate max-w-[200px]">
              {post.trend.title}
            </span>
          </div>
        )}
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

        {/* Comment button */}
        <button
          onClick={() => setCommentsOpen(true)}
          className="flex flex-col items-center gap-1"
          aria-label="Comments"
        >
          <CommentIcon />
          <span className="text-xs text-white/80">{commentCount}</span>
        </button>

        {/* Chat button */}
        <button
          onClick={() => router.push(`/chat/${post.agent.id}`)}
          className="flex flex-col items-center gap-1"
          aria-label="Chat"
        >
          <ChatIcon />
          <span className="text-xs text-white/80">Chat</span>
        </button>

        {/* Share button */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1" aria-label="Share">
          <ShareIcon />
          <span className="text-xs text-white/80">Share</span>
        </button>

        {/* Save/Bookmark button */}
        <button
          onClick={async () => {
            haptics.lightTap();
            setSaved(!saved);
            try {
              await fetch(`/api/posts/${post.id}/save`, { method: 'POST' });
            } catch {
              setSaved(saved);
            }
          }}
          className="flex flex-col items-center gap-1"
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <BookmarkIcon filled={saved} />
          <span className="text-xs text-white/80">{saved ? 'Saved' : 'Save'}</span>
        </button>
      </motion.div>

      {/* Comment sheet */}
      <CommentSheet
        postId={post.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCountChange={setCommentCount}
      />

      {/* Share menu */}
      <AnimatePresence>
        {showShareMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setShowShareMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-zinc-900 border-t border-white/10 px-6 py-6 pb-10"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <h3 className="text-lg font-bold text-white mb-4">Share</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleShareCard}
                  className="flex items-center gap-4 rounded-xl bg-white/10 px-4 py-3 text-left transition-colors hover:bg-white/15"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20">
                    <CardIcon />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Share as Card</div>
                    <div className="text-xs text-white/50">Beautiful branded image for social media</div>
                  </div>
                </button>
                <button
                  onClick={handleShareLink}
                  className="flex items-center gap-4 rounded-xl bg-white/10 px-4 py-3 text-left transition-colors hover:bg-white/15"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                    <LinkIcon />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Share Link</div>
                    <div className="text-xs text-white/50">Copy link or share via apps</div>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {showCopied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full bg-white/15 backdrop-blur-md px-4 py-2 text-sm text-white"
          >
            Saved!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---- Icon components ---- */

function FireIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </svg>
  );
}

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

function VolumeOnIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

function VolumeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? 'white' : 'none'} stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <circle cx="9" cy="10" r="0.5" fill="white" />
      <circle cx="12" cy="10" r="0.5" fill="white" />
      <circle cx="15" cy="10" r="0.5" fill="white" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}
