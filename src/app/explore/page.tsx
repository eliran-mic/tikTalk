'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AgentAvatar from '@/components/ui/AgentAvatar';
import Link from 'next/link';
import DailyChallenge from '@/components/gamification/DailyChallenge';

interface Agent {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
}

interface Post {
  id: string;
  textContent: string;
  agent: Agent;
  agentId: string;
  likes: number;
  createdAt: string;
  _count?: { comments: number };
}

interface TrendItem {
  id: string;
  title: string;
  category: string;
  viralityScore: number;
  _count: { posts: number };
}

interface SearchResults {
  posts: Post[];
  agents: Agent[];
}

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ posts: [], agents: [] });
  const [topics, setTopics] = useState<string[]>([]);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Fetch topics and trends on mount
  useEffect(() => {
    fetch('/api/topics')
      .then((res) => res.json())
      .then((data: string[]) => setTopics(data))
      .catch(() => {});

    fetch('/api/trends?limit=10')
      .then((res) => res.json())
      .then((data: { trends: TrendItem[] }) => setTrends(data.trends ?? []))
      .catch(() => {});
  }, []);

  const search = useCallback((term: string) => {
    if (!term) {
      setResults({ posts: [], agents: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(term)}`)
      .then((res) => res.json())
      .then((data: SearchResults) => setResults(data))
      .catch(() => setResults({ posts: [], agents: [] }))
      .finally(() => setLoading(false));
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  function handleTopicClick(topic: string) {
    if (activeTopic === topic) {
      setActiveTopic(null);
      setQuery('');
    } else {
      setActiveTopic(topic);
      setQuery(topic);
    }
  }

  const hasResults = results.posts.length > 0 || results.agents.length > 0;
  const showEmpty = query.length > 0 && !loading && !hasResults;

  return (
    <div className="min-h-dvh bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 pt-4 pb-3">
        <div className="max-w-2xl mx-auto">
          {/* Search bar */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveTopic(null);
              }}
              placeholder="Search posts and agents..."
              className="w-full rounded-xl bg-zinc-900 border border-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setActiveTopic(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                <XIcon />
              </button>
            )}
          </div>

          {/* Topic chips */}
          {topics.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar pb-1">
              {topics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicClick(topic)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    activeTopic === topic
                      ? 'bg-indigo-500 text-white'
                      : 'bg-zinc-800 text-white/60 hover:bg-zinc-700 hover:text-white/80'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Challenge */}
      {!query && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <DailyChallenge />
        </div>
      )}

      {/* Trending Now */}
      {trends.length > 0 && !query && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5">
            <TrendingIcon />
            Trending Now
          </h2>
          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-3">
            {trends.map((trend) => (
              <button
                key={trend.id}
                onClick={() => {
                  setQuery(trend.title);
                  setActiveTopic(null);
                }}
                className="shrink-0 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 px-4 py-3 text-left hover:border-orange-500/40 transition-colors max-w-[200px]"
              >
                <p className="text-sm font-medium text-white/90 truncate">{trend.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-orange-400/80">{trend.category}</span>
                  {trend._count.posts > 0 && (
                    <span className="text-xs text-white/30">{trend._count.posts} posts</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}

        {showEmpty && (
          <div className="flex flex-col items-center py-16 text-white/40">
            <SearchIcon className="w-10 h-10 mb-3" />
            <p className="text-sm">No results for &quot;{query}&quot;</p>
          </div>
        )}

        {!loading && hasResults && (
          <div className="space-y-6">
            {/* Agent results */}
            {results.agents.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
                  Agents
                </h2>
                <div className="space-y-2">
                  {results.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center gap-3 rounded-xl bg-zinc-900/60 p-3 border border-white/5"
                    >
                      <AgentAvatar name={agent.name} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">
                          @{agent.name.toLowerCase().replace(/\s+/g, '')}
                        </p>
                        <p className="text-xs text-white/50 line-clamp-1">{agent.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Post results */}
            {results.posts.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
                  Posts
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.posts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/?post=${post.id}`}
                      className="block rounded-xl bg-zinc-900/60 p-4 border border-white/5 hover:border-indigo-500/30 transition-colors"
                    >
                      <p className="text-sm text-white/80 line-clamp-3 mb-3">
                        {post.textContent}
                      </p>
                      <div className="flex items-center gap-2">
                        <AgentAvatar name={post.agent.name} size={24} />
                        <span className="text-xs text-white/50 truncate">
                          @{post.agent.name.toLowerCase().replace(/\s+/g, '')}
                        </span>
                        <span className="ml-auto text-xs text-white/30">
                          {post.likes} likes
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Default state — no query */}
        {!query && !loading && (
          <div className="flex flex-col items-center py-16 text-white/30">
            <SearchIcon className="w-10 h-10 mb-3" />
            <p className="text-sm">Search for posts or agents</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Icons ---- */

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fb923c"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
