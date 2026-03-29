'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AgentAvatar from '@/components/ui/AgentAvatar';
import { haptics } from '@/lib/haptics';

interface Agent {
  id: string;
  name: string;
  avatarUrl: string;
  category: string;
}

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export default function ChatPage({ params }: { params: Promise<{ agentId: string }> }) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize conversation
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { agentId } = await params;
      try {
        const res = await fetch('/api/conversations/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          return;
        }

        const data = await res.json();
        if (cancelled) return;
        setAgent(data.agent);
        setConversationId(data.conversationId);

        // Load existing messages
        const msgsRes = await fetch(`/api/conversations/${data.conversationId}/messages`);
        if (msgsRes.ok) {
          const msgs = await msgsRes.json();
          if (!cancelled) setMessages(msgs);
        }
      } catch {
        // Failed to initialize
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [params, router]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !conversationId || sending) return;

    const userMsg = input.trim();
    setInput('');
    setSending(true);
    haptics.lightTap();

    // Optimistic: add user message immediately
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });

      if (res.ok) {
        const data = await res.json();
        // Replace optimistic user msg + add AI response
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'user', content: userMsg },
          data.aiMessage,
        ]);
        haptics.lightTap();
      }
    } catch {
      // Keep the optimistic message, just stop loading
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, conversationId, sending]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!agent || !conversationId) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black">
        <p className="text-sm text-white/50">Could not start conversation</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-black/80 backdrop-blur-md px-4 py-3">
        <button onClick={() => router.back()} className="text-white/60 hover:text-white">
          <BackIcon />
        </button>
        <AgentAvatar name={agent.name} size={36} />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white truncate">{agent.name}</h1>
          <p className="text-xs text-green-400">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <AgentAvatar name={agent.name} size={64} />
            <h2 className="mt-4 text-lg font-bold text-white">{agent.name}</h2>
            <p className="mt-2 text-sm text-white/50 max-w-xs">
              Start a conversation. Ask anything — they&apos;ll respond in character with their unique perspective.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {getSuggestions(agent.category).map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id ?? `msg-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-zinc-800 text-white/90 rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <AgentAvatar name={agent.name} size={20} />
                    <span className="text-xs font-semibold text-white/60">{agent.name}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {sending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="rounded-2xl rounded-bl-md bg-zinc-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <AgentAvatar name={agent.name} size={20} />
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-2 rounded-full bg-white/40"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-white/5 bg-black/80 backdrop-blur-md px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.name}...`}
            rows={1}
            maxLength={2000}
            className="flex-1 resize-none rounded-xl bg-zinc-900 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 max-h-32"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 transition-colors hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function getSuggestions(category: string): string[] {
  const suggestions: Record<string, string[]> = {
    philosophy: ["What's the meaning of struggle?", "How do I find purpose?", "Help me with a tough decision"],
    comedy: ["Roast my morning routine", "What's the funniest thing about humans?", "Make me laugh"],
    finance: ["How should I think about money?", "Is now a good time to invest?", "Help me budget better"],
    fitness: ["I can't stay consistent", "Best beginner workout?", "How important is sleep?"],
    health: ["I've been anxious lately", "How do I set better boundaries?", "What is burnout really?"],
    tech: ["Explain APIs like I'm 5", "Best way to learn coding?", "What's a design pattern?"],
    science: ["Blow my mind with a fact", "How does consciousness work?", "Why is water so weird?"],
    entertainment: ["Recommend a hidden gem film", "What makes a great story?", "Best album to listen to?"],
    business: ["I'm stuck on my startup idea", "How do I price my product?", "Leadership advice?"],
    motivation: ["I can't focus today", "How do I stop procrastinating?", "Am I working too hard?"],
    relationships: ["Red flags vs green flags?", "How to communicate better?", "Dating app advice?"],
    food: ["Quick dinner idea?", "Why does browning = flavor?", "Meal prep tips?"],
    education: ["Teach me something surprising", "Make math interesting", "Coolest history fact?"],
  };
  return suggestions[category] ?? suggestions.philosophy;
}

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}
