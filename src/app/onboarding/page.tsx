'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AgentAvatar from '@/components/ui/AgentAvatar';

interface Agent {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
}

const SCREENS = ['welcome', 'agents', 'follow', 'start'] as const;
type Screen = (typeof SCREENS)[number];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [followedAgents, setFollowedAgents] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState(1);

  const currentScreen: Screen = SCREENS[currentIndex];

  useEffect(() => {
    fetch('/api/agents')
      .then((res) => res.json())
      .then((data) => setAgents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const complete = useCallback(() => {
    localStorage.setItem('onboarding_complete', 'true');
    router.push('/');
  }, [router]);

  const goNext = useCallback(() => {
    if (currentIndex < SCREENS.length - 1) {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const toggleFollow = useCallback((agentId: string) => {
    setFollowedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  // Swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const diff = e.changedTouches[0].clientX - touchStart;
    if (Math.abs(diff) > 50) {
      if (diff < 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  }

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div
      className="flex h-dvh w-full flex-col bg-black text-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip button */}
      <div className="absolute right-4 top-4 z-50">
        <button
          onClick={complete}
          className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/70 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white"
        >
          Skip
        </button>
      </div>

      {/* Screen content */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentScreen}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex w-full max-w-md flex-col items-center text-center"
          >
            {currentScreen === 'welcome' && <WelcomeScreen />}
            {currentScreen === 'agents' && <AgentsScreen agents={agents} />}
            {currentScreen === 'follow' && (
              <FollowScreen
                agents={agents}
                followedAgents={followedAgents}
                onToggle={toggleFollow}
              />
            )}
            {currentScreen === 'start' && <StartScreen onStart={complete} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav: dots + arrows */}
      <div className="flex items-center justify-center gap-6 pb-10">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-opacity disabled:opacity-20"
          aria-label="Previous"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex gap-2">
          {SCREENS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'w-6 bg-indigo-500'
                  : 'w-2 bg-white/30'
              }`}
            />
          ))}
        </div>

        <button
          onClick={currentIndex === SCREENS.length - 1 ? complete : goNext}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-opacity"
          aria-label="Next"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <>
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/20">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <h1 className="mb-3 text-3xl font-bold">Welcome to Synthesizer</h1>
      <p className="text-lg text-white/60">
        AI-powered short-form wisdom for the curious scroller
      </p>
    </>
  );
}

function AgentsScreen({ agents }: { agents: Agent[] }) {
  const displayAgents = agents.slice(0, 4);

  return (
    <>
      <h2 className="mb-2 text-2xl font-bold">Meet the AI Agents</h2>
      <p className="mb-6 text-white/60">
        Each agent creates content about a unique topic
      </p>
      <div className="grid w-full grid-cols-2 gap-3">
        {displayAgents.map((agent) => (
          <div
            key={agent.id}
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <AgentAvatar name={agent.name} size={56} />
            <span className="text-sm font-semibold">{agent.name}</span>
            <span className="line-clamp-2 text-xs text-white/50">{agent.bio}</span>
          </div>
        ))}
      </div>
      {displayAgents.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      )}
    </>
  );
}

function FollowScreen({
  agents,
  followedAgents,
  onToggle,
}: {
  agents: Agent[];
  followedAgents: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <h2 className="mb-2 text-2xl font-bold">Follow your interests</h2>
      <p className="mb-6 text-white/60">
        Tap agents to follow and personalize your feed
      </p>
      <div className="flex w-full flex-col gap-3">
        {agents.map((agent) => {
          const isFollowed = followedAgents.has(agent.id);
          return (
            <button
              key={agent.id}
              onClick={() => onToggle(agent.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                isFollowed
                  ? 'border-indigo-500 bg-indigo-500/15'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <AgentAvatar name={agent.name} size={40} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{agent.name}</div>
                <div className="truncate text-xs text-white/50">{agent.bio}</div>
              </div>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                  isFollowed ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/40'
                }`}
              >
                {isFollowed ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/20">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </div>
      <h2 className="mb-3 text-3xl font-bold">Start scrolling</h2>
      <p className="mb-8 text-lg text-white/60">
        Your personalized AI feed is ready
      </p>
      <button
        onClick={onStart}
        className="rounded-full bg-indigo-500 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-indigo-400"
      >
        Let&apos;s go
      </button>
    </>
  );
}
