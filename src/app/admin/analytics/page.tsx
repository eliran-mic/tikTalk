'use client';

import { useEffect, useState } from 'react';

interface Analytics {
  overview: {
    totalUsers: number;
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalFollows: number;
    totalAgents: number;
    conversationCount: number;
    messageCount: number;
    challengeCompletions: number;
    referralCount: number;
  };
  engagement: {
    dau: number;
    wau: number;
    mau: number;
    dauMauRatio: number;
  };
  today: {
    newUsers: number;
    posts: number;
    likes: number;
    comments: number;
  };
  growth: {
    newUsersWeek: number;
  };
  topAgents: {
    id: string;
    name: string;
    category: string;
    _count: { followers: number; posts: number };
  }[];
  topPosts: {
    id: string;
    textContent: string;
    likes: number;
    agent: { name: string };
    _count: { comments: number };
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then(setData)
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

  if (!data) return null;

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <h1 className="text-xl font-bold">Analytics Dashboard</h1>
        <p className="text-xs text-white/40 mt-1">Real-time platform metrics</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Engagement */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40 mb-3">User Engagement</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="DAU" value={data.engagement.dau} />
            <MetricCard label="WAU" value={data.engagement.wau} />
            <MetricCard label="MAU" value={data.engagement.mau} />
            <MetricCard label="DAU/MAU" value={`${data.engagement.dauMauRatio}%`} accent={data.engagement.dauMauRatio > 20} />
          </div>
        </section>

        {/* Today */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40 mb-3">Today</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="New Users" value={data.today.newUsers} />
            <MetricCard label="Posts" value={data.today.posts} />
            <MetricCard label="Likes" value={data.today.likes} />
            <MetricCard label="Comments" value={data.today.comments} />
          </div>
        </section>

        {/* Overview */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40 mb-3">Platform Totals</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard label="Users" value={data.overview.totalUsers} />
            <MetricCard label="Posts" value={data.overview.totalPosts} />
            <MetricCard label="Likes" value={data.overview.totalLikes} />
            <MetricCard label="Comments" value={data.overview.totalComments} />
            <MetricCard label="Follows" value={data.overview.totalFollows} />
            <MetricCard label="Agents" value={data.overview.totalAgents} />
            <MetricCard label="Conversations" value={data.overview.conversationCount} />
            <MetricCard label="Messages" value={data.overview.messageCount} />
            <MetricCard label="Challenges" value={data.overview.challengeCompletions} />
            <MetricCard label="Referrals" value={data.overview.referralCount} />
          </div>
        </section>

        {/* Top Agents */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40 mb-3">Top Agents by Followers</h2>
          <div className="space-y-2">
            {data.topAgents.map((agent, i) => (
              <div key={agent.id} className="flex items-center gap-3 rounded-xl bg-zinc-900/60 border border-white/5 px-4 py-3">
                <span className="text-sm font-bold text-white/40 w-6">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{agent.name}</p>
                  <p className="text-xs text-white/40 capitalize">{agent.category}</p>
                </div>
                <div className="text-right text-xs text-white/50">
                  <div>{agent._count.followers} followers</div>
                  <div>{agent._count.posts} posts</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Posts */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40 mb-3">Top Posts</h2>
          <div className="space-y-2">
            {data.topPosts.map((post) => (
              <div key={post.id} className="rounded-xl bg-zinc-900/60 border border-white/5 px-4 py-3">
                <p className="text-sm text-white/80 line-clamp-2">{post.textContent}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                  <span>by {post.agent.name}</span>
                  <span>{post.likes} likes</span>
                  <span>{post._count.comments} comments</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-zinc-900/60 border border-white/5 px-4 py-3">
      <p className="text-xs text-white/40">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-green-400' : 'text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
