'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTextToSpeechOptions {
  text: string;
  audioUrl?: string;
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
  /** Whether audio is muted. */
  isMuted: boolean;
  /** Toggle mute/unmute. */
  toggleMute: () => void;
}

/**
 * Returns true if the URL points to real audio (not a placeholder).
 */
function isRealAudioUrl(url?: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:audio/')) return true;
  if (url.includes('placeholder')) return false;
  if (url.startsWith('http') || url.startsWith('/audio/')) return true;
  return false;
}

export default function useTextToSpeech({
  text,
  audioUrl,
  onPlay,
}: UseTextToSpeechOptions): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const estimatedDurationRef = useRef(0);

  const hasRealAudio = isRealAudioUrl(audioUrl);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
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
    // Stop HTML5 Audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // Stop Web Speech API
    window.speechSynthesis?.cancel();
    stopProgressTimer();
    setIsPlaying(false);
    setProgress(0);
    utteranceRef.current = null;
  }, [stopProgressTimer]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  // HTML5 Audio playback
  const toggleHtml5Audio = useCallback(() => {
    if (!audioUrl) return;

    let audio = audioRef.current;

    // Currently playing — pause
    if (audio && !audio.paused && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    // Currently paused — resume
    if (audio && audio.paused && audio.currentTime > 0) {
      audio.play();
      setIsPlaying(true);
      return;
    }

    // Start new playback
    onPlay?.();

    audio = new Audio(audioUrl);
    audio.muted = isMuted;
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      if (audio.duration && isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(1);
      setTimeout(() => setProgress(0), 600);
    });

    audio.addEventListener('error', () => {
      setIsPlaying(false);
      setProgress(0);
    });

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });
  }, [audioUrl, isPlaying, isMuted, onPlay]);

  // Web Speech API playback (fallback)
  const toggleWebSpeech = useCallback(() => {
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
    synth.cancel();
    onPlay?.();

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1;
    utt.pitch = 1;
    utt.volume = isMuted ? 0 : 1;

    utt.onstart = () => {
      setIsPlaying(true);
      startProgressTimer();
    };

    utt.onend = () => {
      setIsPlaying(false);
      setProgress(1);
      stopProgressTimer();
      setTimeout(() => setProgress(0), 600);
    };

    utt.onerror = () => {
      setIsPlaying(false);
      setProgress(0);
      stopProgressTimer();
    };

    utteranceRef.current = utt;
    synth.speak(utt);
  }, [text, isPlaying, isMuted, onPlay, startProgressTimer, stopProgressTimer]);

  const toggle = useCallback(() => {
    if (hasRealAudio) {
      toggleHtml5Audio();
    } else {
      toggleWebSpeech();
    }
  }, [hasRealAudio, toggleHtml5Audio, toggleWebSpeech]);

  return { isPlaying, progress, toggle, stop, isMuted, toggleMute };
}
