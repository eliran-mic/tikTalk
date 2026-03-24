/**
 * Haptic feedback wrapper around navigator.vibrate with feature detection.
 */

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

export const haptics = {
  /** Ultra-short tap — UI toggle acknowledgement */
  lightTap: () => vibrate(10),
  /** Medium tap — button press confirmation */
  mediumTap: () => vibrate(50),
  /** Double-pulse — success pattern (50ms on, 50ms gap, 50ms on) */
  success: () => vibrate([50, 50, 50]),
} as const;
