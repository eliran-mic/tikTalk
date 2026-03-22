'use client';

import { useEffect, useState } from 'react';
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
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch('/api/posts');
        if (!res.ok) throw new Error('Failed to fetch posts');
        const data: Post[] = await res.json();
        setPosts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
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
      className="hide-scrollbar h-dvh w-full overflow-y-scroll bg-black"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
