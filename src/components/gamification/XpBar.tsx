'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GamificationProfile {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  referralCode: string;
  levelProgress: {
    current: number;
    required: number;
    progress: number;
  };
  referralCount: number;
  challengeCount: number;
}

export default function XpBar() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/me/gamification')
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => {});
  }, []);

  if (!profile) return null;

  return (
    <>
      {/* Compact XP indicator — always visible */}
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5 transition-colors hover:bg-white/15"
      >
        <LevelBadge level={profile.level} />
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-white/50 leading-none">
            {profile.xp} XP
          </span>
          <div className="w-16 h-1 rounded-full bg-white/10 mt-0.5">
            <motion.div
              className="h-full rounded-full bg-indigo-400"
              initial={{ width: 0 }}
              animate={{ width: `${profile.levelProgress.progress * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
        {profile.currentStreak > 0 && (
          <span className="text-xs text-orange-400 flex items-center gap-0.5">
            <FireIcon /> {profile.currentStreak}
          </span>
        )}
      </button>

      {/* Expanded stats modal */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setExpanded(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto rounded-2xl bg-zinc-900 border border-white/10 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Your Stats</h3>
                <button onClick={() => setExpanded(false)} className="text-white/40 hover:text-white/60">
                  <CloseIcon />
                </button>
              </div>

              {/* Level & XP */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-500/30">
                  <span className="text-2xl font-bold text-indigo-400">
                    {profile.level}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white/60 mb-1">Level {profile.level}</div>
                  <div className="w-full h-2 rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${profile.levelProgress.progress * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="text-xs text-white/40 mt-1">
                    {profile.levelProgress.current} / {profile.levelProgress.required} XP
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total XP" value={profile.xp.toLocaleString()} icon={<StarIcon />} />
                <StatCard
                  label="Streak"
                  value={`${profile.currentStreak} days`}
                  icon={<FireIcon />}
                  accent={profile.currentStreak >= 7 ? 'text-orange-400' : undefined}
                />
                <StatCard label="Challenges" value={String(profile.challengeCount)} icon={<TrophyIcon />} />
                <StatCard label="Referrals" value={String(profile.referralCount)} icon={<UsersIcon />} />
              </div>

              {/* Referral code */}
              <div className="mt-4 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <div className="text-xs text-white/40 mb-1">Your referral code</div>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-indigo-300">{profile.referralCode}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/signup?ref=${profile.referralCode}`
                      );
                    }}
                    className="text-xs text-white/50 hover:text-white/80 transition-colors"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={accent ?? 'text-white/40'}>{icon}</span>
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <div className={`text-lg font-bold ${accent ?? 'text-white'}`}>{value}</div>
    </div>
  );
}

function LevelBadge({ level }: { level: number }) {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/30 border border-indigo-400/40">
      <span className="text-[10px] font-bold text-indigo-300">{level}</span>
    </div>
  );
}

function FireIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0012 0V2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
