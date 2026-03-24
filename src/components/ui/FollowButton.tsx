'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

interface FollowButtonProps {
  agentId: string;
  size?: 'sm' | 'md';
}

export default function FollowButton({ agentId, size = 'md' }: FollowButtonProps) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function checkFollow() {
      try {
        const res = await fetch('/api/users/me/following');
        if (res.ok) {
          const data = await res.json();
          const isFollowing = data.following.some(
            (agent: { id: string }) => agent.id === agentId
          );
          setFollowing(isFollowing);
        }
      } finally {
        setLoading(false);
      }
    }

    checkFollow();
  }, [user, agentId]);

  async function handleToggle() {
    if (!user) return;

    const wasFollowing = following;
    setFollowing(!wasFollowing);

    try {
      const res = await fetch(`/api/agents/${agentId}/follow`, {
        method: wasFollowing ? 'DELETE' : 'POST',
      });
      if (!res.ok) {
        setFollowing(wasFollowing);
      }
    } catch {
      setFollowing(wasFollowing);
    }
  }

  if (!user) return null;
  if (loading) return null;

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1 text-xs'
    : 'px-5 py-1.5 text-sm';

  return (
    <button
      onClick={handleToggle}
      className={`${sizeClasses} rounded-full font-semibold transition-colors ${
        following
          ? 'bg-white/10 text-white border border-white/20 hover:bg-white/15'
          : 'bg-indigo-500 text-white hover:bg-indigo-400'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
