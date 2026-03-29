'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SubData {
  isPro: boolean;
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
  } | null;
  pricing: { monthly: number; yearly: number; currency: string };
  features: Record<string, boolean>;
}

const FEATURE_LIST = [
  { key: 'unlimitedChat', label: 'Unlimited AI Conversations', desc: 'Chat with every agent, no limits' },
  { key: 'exclusiveAgents', label: 'Exclusive Pro Agents', desc: 'Access agents only available to Pro members' },
  { key: 'earlyAccess', label: 'Early Access', desc: 'Be the first to try new features and agents' },
  { key: 'adFree', label: 'Ad-Free Experience', desc: 'Pure, uninterrupted content feed' },
  { key: 'prioritySupport', label: 'Priority Support', desc: 'Get help faster when you need it' },
];

export default function ProPage() {
  const [data, setData] = useState<SubData | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => (r.ok ? r.json() : null))
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

  const isPro = data?.isPro ?? false;

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 px-4 py-1.5 mb-4">
            <span className="text-xs font-semibold text-indigo-300">PRO</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Agentra Pro</h1>
          <p className="text-white/50">Unlock the full power of AI-driven conversations</p>
        </motion.div>

        {isPro ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-gradient-to-b from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-8 text-center"
          >
            <div className="text-4xl mb-3">&#10003;</div>
            <h2 className="text-xl font-bold text-indigo-300">You&apos;re a Pro member!</h2>
            {data?.subscription && (
              <p className="text-sm text-white/40 mt-2">
                {data.subscription.status === 'cancelled' ? 'Active until ' : 'Renews '}
                {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </motion.div>
        ) : (
          <>
            {/* Billing toggle */}
            <div className="flex justify-center gap-2 mb-8">
              <button
                onClick={() => setBilling('monthly')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  billing === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  billing === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50'
                }`}
              >
                Yearly
                <span className="ml-1 text-xs text-green-400">Save 33%</span>
              </button>
            </div>

            {/* Price */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="text-5xl font-bold">
                ${billing === 'monthly' ? data?.pricing.monthly : data?.pricing.yearly}
              </div>
              <p className="text-white/40 text-sm mt-1">
                per {billing === 'monthly' ? 'month' : 'year'}
              </p>
            </motion.div>

            {/* CTA */}
            <button className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-lg font-semibold text-white transition hover:from-indigo-500 hover:to-purple-500 mb-8">
              Start Free Trial
            </button>
            <p className="text-center text-xs text-white/30 mb-8">7-day free trial, cancel anytime</p>
          </>
        )}

        {/* Features */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">What&apos;s included</h3>
          {FEATURE_LIST.map((feature, i) => (
            <motion.div
              key={feature.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 rounded-xl bg-zinc-900/60 border border-white/5 px-4 py-3"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 shrink-0 mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{feature.label}</p>
                <p className="text-xs text-white/40">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
