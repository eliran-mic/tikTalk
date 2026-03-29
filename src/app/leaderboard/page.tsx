'use client';

import { useEffect, useState } from 'react';

interface LeaderboardUser {
  id: string;
  username: string;
  xp: number;
  level: number;
  currentStreak: number;
  avatarUrl: string | null;
  _count: { following: number; likes: number; comments: number };
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard?limit=50')
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <h1 className="text-xl font-bold">Leaderboard</h1>
        <p className="text-xs text-white/40 mt-1">Top creators by XP</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Top 3 podium */}
        {users.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-8 pt-4">
            <PodiumCard user={users[1]} rank={2} height="h-24" />
            <PodiumCard user={users[0]} rank={1} height="h-32" />
            <PodiumCard user={users[2]} rank={3} height="h-20" />
          </div>
        )}

        {/* Full list */}
        <div className="space-y-2">
          {users.map((user, i) => (
            <div
              key={user.id}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                i < 3 ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-zinc-900/60 border border-white/5'
              }`}
            >
              <span className={`text-sm font-bold w-8 text-center ${
                i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-white/40'
              }`}>
                #{i + 1}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/30 text-sm font-bold text-indigo-300 shrink-0">
                {user.level}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">@{user.username}</p>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span>{user.xp.toLocaleString()} XP</span>
                  {user.currentStreak > 0 && (
                    <span className="text-orange-400">{user.currentStreak}d streak</span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs text-white/30">
                <div>{user._count.following} following</div>
                <div>{user._count.likes + user._count.comments} interactions</div>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <p className="text-sm">No users yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ user, rank, height }: { user: LeaderboardUser; rank: number; height: string }) {
  const colors = rank === 1 ? 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30' :
                 rank === 2 ? 'from-gray-400/20 to-gray-500/10 border-gray-400/30' :
                              'from-amber-600/20 to-amber-700/10 border-amber-600/30';
  const medal = rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd';

  return (
    <div className={`flex flex-col items-center w-24`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/30 text-lg font-bold text-indigo-300 mb-2">
        {user.level}
      </div>
      <p className="text-xs font-semibold text-white truncate w-full text-center">@{user.username}</p>
      <p className="text-[10px] text-white/40">{user.xp.toLocaleString()} XP</p>
      <div className={`${height} w-full mt-2 rounded-t-lg bg-gradient-to-b ${colors} border flex items-center justify-center`}>
        <span className="text-sm font-bold text-white/70">{medal}</span>
      </div>
    </div>
  );
}
