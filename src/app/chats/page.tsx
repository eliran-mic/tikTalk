'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AgentAvatar from '@/components/ui/AgentAvatar';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  agent: {
    id: string;
    name: string;
    avatarUrl: string;
    category: string;
  };
  messages: {
    content: string;
    role: string;
    createdAt: string;
  }[];
}

interface Agent {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
  category: string;
}

export default function ChatsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/conversations').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/agents').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([convos, agentList]) => {
        setConversations(convos);
        setAgents(agentList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeConvoAgentIds = new Set(conversations.map((c) => c.agent.id));
  const availableAgents = agents.filter((a) => !activeConvoAgentIds.has(a.id));

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

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
        <h1 className="text-xl font-bold">Messages</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Active conversations */}
        {conversations.length > 0 && (
          <div className="px-4 pt-4">
            {conversations.map((convo) => {
              const lastMsg = convo.messages[0];
              return (
                <button
                  key={convo.id}
                  onClick={() => router.push(`/chat/${convo.agent.id}`)}
                  className="flex items-center gap-3 w-full text-left py-3 border-b border-white/5 hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2"
                >
                  <AgentAvatar name={convo.agent.name} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white truncate">
                        {convo.agent.name}
                      </span>
                      {lastMsg && (
                        <span className="text-xs text-white/30 shrink-0 ml-2">
                          {timeAgo(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="text-xs text-white/50 truncate mt-0.5">
                        {lastMsg.role === 'user' ? 'You: ' : ''}
                        {lastMsg.content}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Start new conversation */}
        {availableAgents.length > 0 && (
          <div className="px-4 pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
              Start a conversation
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {availableAgents.slice(0, 8).map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => router.push(`/chat/${agent.id}`)}
                  className="flex flex-col items-center gap-2 rounded-xl bg-zinc-900/60 border border-white/5 p-4 hover:border-indigo-500/30 transition-colors"
                >
                  <AgentAvatar name={agent.name} size={40} />
                  <span className="text-xs font-semibold text-white text-center truncate w-full">
                    {agent.name}
                  </span>
                  <span className="text-[10px] text-white/40 capitalize">{agent.category}</span>
                </button>
              ))}
            </div>
            {availableAgents.length > 8 && (
              <p className="text-center text-xs text-white/30 mt-3">
                +{availableAgents.length - 8} more agents available
              </p>
            )}
          </div>
        )}

        {conversations.length === 0 && availableAgents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <ChatBubbleIcon />
            <p className="mt-3 text-sm">No conversations yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}
