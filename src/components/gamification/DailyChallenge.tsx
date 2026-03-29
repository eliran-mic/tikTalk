'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AgentAvatar from '@/components/ui/AgentAvatar';
import { haptics } from '@/lib/haptics';

interface Challenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  agent: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  _count: { entries: number };
  completed: boolean;
  userEntry: { response: string } | null;
}

export default function DailyChallenge() {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);

  useEffect(() => {
    fetch('/api/challenges/today')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setChallenge(data);
          if (data.completed) setSubmitted(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!challenge) return null;

  async function handleSubmit() {
    if (!challenge || !response.trim() || submitting) return;
    setSubmitting(true);
    haptics.mediumTap();

    try {
      const res = await fetch('/api/challenges/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge.id, response: response.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmitted(true);
        setXpAwarded(data.xp?.xp ?? 50);
        haptics.success();
      }
    } catch {
      // Submission failed
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Challenge banner in feed */}
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 px-4 py-3 w-full text-left transition-colors hover:from-indigo-500/25 hover:to-purple-500/25"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/30">
          <TrophyIcon />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {submitted ? 'Challenge Complete!' : `Daily Challenge: ${challenge.title}`}
          </div>
          <div className="text-xs text-white/50">
            {submitted
              ? `+${xpAwarded || challenge.xpReward} XP earned`
              : `+${challenge.xpReward} XP · ${challenge._count.entries} completed`}
          </div>
        </div>
        <ChevronIcon />
      </button>

      {/* Expanded challenge modal */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70"
              onClick={() => setExpanded(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-zinc-900 border-t border-white/10 px-6 py-6 pb-10"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

              {/* Agent + challenge header */}
              <div className="flex items-start gap-4 mb-4">
                <AgentAvatar name={challenge.agent.name} size={48} />
                <div>
                  <h3 className="text-lg font-bold text-white">{challenge.title}</h3>
                  <p className="text-sm text-white/50">
                    Challenge from {challenge.agent.name}
                  </p>
                </div>
              </div>

              {/* Challenge description */}
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                {challenge.description}
              </p>

              {/* XP reward badge */}
              <div className="flex items-center gap-2 mb-6">
                <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-xs font-semibold text-indigo-300">
                  +{challenge.xpReward} XP
                </span>
                <span className="text-xs text-white/40">
                  {challenge._count.entries} people completed
                </span>
              </div>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center"
                >
                  <div className="text-2xl mb-2">&#10003;</div>
                  <p className="text-sm font-semibold text-green-400">Challenge Complete!</p>
                  <p className="text-xs text-white/50 mt-1">
                    +{xpAwarded || challenge.xpReward} XP earned
                  </p>
                  {challenge.userEntry && (
                    <p className="text-sm text-white/60 mt-3 italic">
                      &ldquo;{challenge.userEntry.response}&rdquo;
                    </p>
                  )}
                </motion.div>
              ) : (
                <div>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Share your response..."
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50 resize-none"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-white/30">
                      {response.length}/1000
                    </span>
                    <button
                      onClick={handleSubmit}
                      disabled={!response.trim() || submitting}
                      className="rounded-full bg-indigo-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : 'Complete Challenge'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0012 0V2z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
