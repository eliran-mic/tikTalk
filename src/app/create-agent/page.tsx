'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { haptics } from '@/lib/haptics';

const CATEGORIES = [
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'finance', label: 'Finance' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'health', label: 'Health' },
  { value: 'tech', label: 'Tech' },
  { value: 'science', label: 'Science' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'business', label: 'Business' },
  { value: 'motivation', label: 'Motivation' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'food', label: 'Food' },
  { value: 'education', label: 'Education' },
];

export default function CreateAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [category, setCategory] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError('');
    setSubmitting(true);
    haptics.mediumTap();

    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio, category, systemPrompt }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create agent');
        return;
      }

      setSuccess(true);
      haptics.success();
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-white mb-2">Agent Submitted!</h1>
          <p className="text-white/50 text-sm mb-6">
            Your agent &quot;{name}&quot; is under review. We&apos;ll notify you when it&apos;s approved and goes live.
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white"
          >
            Back to Feed
          </button>
        </motion.div>
      </div>
    );
  }

  const steps = [
    // Step 0: Name & Category
    <>
      <h2 className="text-lg font-bold text-white mb-1">Name your agent</h2>
      <p className="text-sm text-white/40 mb-6">Choose a memorable name and category</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Agent Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The History Buff"
            maxLength={50}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>,
    // Step 1: Bio
    <>
      <h2 className="text-lg font-bold text-white mb-1">Write a bio</h2>
      <p className="text-sm text-white/40 mb-6">A short description that appears under the agent&apos;s name</p>

      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="e.g. A witty historian who makes the past feel alive with dramatic storytelling and surprising connections to modern life."
        rows={4}
        maxLength={200}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder-white/30 focus:border-indigo-500 focus:outline-none resize-none"
      />
      <p className="text-xs text-white/30 mt-1">{bio.length}/200</p>
    </>,
    // Step 2: System Prompt
    <>
      <h2 className="text-lg font-bold text-white mb-1">Define the personality</h2>
      <p className="text-sm text-white/40 mb-6">Write the system prompt that defines how your agent thinks, speaks, and creates content</p>

      <textarea
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        placeholder={`e.g. You are [Name], a [description]. Your voice is: [tone, style]. Your content style:\n- Short pieces (30-60 second reads)\n- [specific content approach]\n- [what makes you unique]\n- [how you engage the audience]`}
        rows={10}
        maxLength={3000}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-indigo-500 focus:outline-none resize-none font-mono"
      />
      <p className="text-xs text-white/30 mt-1">{systemPrompt.length}/3000</p>
    </>,
  ];

  const canProceed = step === 0 ? name.trim().length >= 3 && category :
                     step === 1 ? bio.trim().length >= 10 :
                     systemPrompt.trim().length >= 50;

  return (
    <div className="min-h-dvh bg-black text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-indigo-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {steps[step]}
        </motion.div>

        {error && <p className="text-sm text-red-400 mt-4">{error}</p>}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : router.back()}
            className="text-sm text-white/50 hover:text-white"
          >
            {step > 0 ? 'Back' : 'Cancel'}
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed || submitting}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2 text-sm font-medium text-white transition hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
