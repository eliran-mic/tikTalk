'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from './PostCard';
import XpBar from '@/components/gamification/XpBar';

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

interface PostsResponse {
  posts: Post[];
  nextCursor: string | null;
}

type FeedType = '' | 'following' | 'trending';

const FEED_TABS: { label: string; value: FeedType }[] = [
  { label: 'For You', value: '' },
  { label: 'Trending', value: 'trending' },
  { label: 'Following', value: 'following' },
];

export default function Feed() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeFeed, setActiveFeed] = useState<FeedType>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (cursor?: string, feed?: FeedType) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      const feedParam = feed ?? '';
      if (feedParam) params.set('feed', feedParam);
      const url = `/api/posts${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data: PostsResponse = await res.json();

      if (isLoadMore) {
        setPosts((prev) => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts);
      }
      setNextCursor(data.nextCursor);
    } catch (err) {
      if (!isLoadMore) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('onboarding_complete')) {
      router.push('/onboarding');
    }
  }, [router]);

  // Load posts when feed type changes
  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setNextCursor(null);
    fetchPosts(undefined, activeFeed);
  }, [activeFeed, fetchPosts]);

  // Infinite scroll: load more when user scrolls near the end
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function handleScroll() {
      if (!el || loadingMore || !nextCursor) return;

      // Trigger when within 2 viewport heights of the bottom
      const threshold = window.innerHeight * 2;
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

      if (distanceToBottom < threshold) {
        fetchPosts(nextCursor, activeFeed);
      }
    }

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [loadingMore, nextCursor, fetchPosts, activeFeed]);

  const handlePostPlay = useCallback((postId: string) => {
    setActivePostId(postId);
  }, []);

  if (loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <span className="text-sm text-white/50">Loading feed...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-black">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-black">
        <p className="text-sm text-white/50">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full bg-black">
      {/* Feed header: XP bar + tabs */}
      <div className="absolute top-0 right-3 z-30 pt-3">
        <XpBar />
      </div>
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-center gap-4 pt-3 pb-2 bg-gradient-to-b from-black/80 to-transparent">
        {FEED_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFeed(tab.value)}
            className={`text-sm font-semibold transition-colors ${
              activeFeed === tab.value
                ? 'text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab.label}
            {activeFeed === tab.value && (
              <div className="mt-1 h-0.5 rounded-full bg-white mx-auto w-6" />
            )}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        className="hide-scrollbar h-full w-full overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory' }}
      >
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isActive={activePostId === post.id}
          onPlay={handlePostPlay}
        />
      ))}
      {loadingMore && (
        <div className="flex items-center justify-center py-8" style={{ scrollSnapAlign: 'start' }}>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      )}
      </div>
    </div>
  );
}
