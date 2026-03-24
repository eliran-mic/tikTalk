'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTextToSpeechOptions {
  text: string;
  /** Called when this utterance starts speaking — parent can use this to pause others. */
  onPlay?: () => void;
}

interface UseTextToSpeechReturn {
  /** Whether this utterance is currently speaking. */
  isPlaying: boolean;
  /** 0-1 progress through the utterance. */
  progress: number;
  /** Toggle play/pause. */
  toggle: () => void;
  /** Stop and reset. */
  stop: () => void;
}

export default function useTextToSpeech({
  text,
  onPlay,
}: UseTextToSpeechOptions): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const estimatedDurationRef = useRef(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startProgressTimer = useCallback(() => {
    stopProgressTimer();
    startTimeRef.current = Date.now();
    // Rough estimate: ~150 words per minute for TTS
    const wordCount = text.split(/\s+/).length;
    estimatedDurationRef.current = (wordCount / 150) * 60 * 1000;

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / estimatedDurationRef.current, 0.95);
      setProgress(pct);
    }, 100);
  }, [text, stopProgressTimer]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    stopProgressTimer();
    setIsPlaying(false);
    setProgress(0);
    utteranceRef.current = null;
  }, [stopProgressTimer]);

  const toggle = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    // Currently speaking — pause
    if (synth.speaking && !synth.paused && isPlaying) {
      synth.pause();
      stopProgressTimer();
      setIsPlaying(false);
      return;
    }

    // Currently paused — resume
    if (synth.paused) {
      synth.resume();
      startProgressTimer();
      setIsPlaying(true);
      return;
    }

    // Not speaking — start new utterance
    synth.cancel(); // Clear any lingering queue
    onPlay?.();

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1;
    utt.pitch = 1;

    utt.onstart = () => {
      setIsPlaying(true);
      startProgressTimer();
    };

    utt.onend = () => {
      setIsPlaying(false);
      setProgress(1);
      stopProgressTimer();
      // Reset progress after a short delay so the bar fills completely
      setTimeout(() => setProgress(0), 600);
    };

    utt.onerror = () => {
      setIsPlaying(false);
      setProgress(0);
      stopProgressTimer();
    };

    utteranceRef.current = utt;
    synth.speak(utt);
  }, [text, isPlaying, onPlay, startProgressTimer, stopProgressTimer]);

  return { isPlaying, progress, toggle, stop };
}
