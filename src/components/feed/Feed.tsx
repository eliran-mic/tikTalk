'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PostCard from './PostCard';

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
  _count?: { comments: number };
}

interface PostsResponse {
  posts: Post[];
  nextCursor: string | null;
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (cursor?: string) => {
    const isLoadMore = !!cursor;
    if (isLoadMore) {
      setLoadingMore(true);
    }

    try {
      const url = cursor ? `/api/posts?cursor=${cursor}` : '/api/posts';
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

  // Initial load
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
        fetchPosts(nextCursor);
      }
    }

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [loadingMore, nextCursor, fetchPosts]);

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
    <div
      ref={scrollRef}
      className="hide-scrollbar h-dvh w-full overflow-y-scroll bg-black"
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
  );
}
