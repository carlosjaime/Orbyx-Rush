'use client';

import { useEffect } from 'react';
import { useUiStore } from '@/stores/useUiStore';

/** Aspect ratio beyond which a phone is considered "sideways". */
const LANDSCAPE_RATIO = 1.15;
/** Below this height a landscape phone simply has no room for a 9:16 field. */
const MIN_LANDSCAPE_HEIGHT = 520;

/**
 * Detects a landscape phone and asks the player to rotate.
 *
 * Deliberately advisory: the overlay is dismissible and the game keeps running
 * underneath, because locking orientation is not always permitted and trapping
 * the player would be worse than a slightly awkward layout.
 */
export function useOrientationGuard(): void {
  const setLandscapeBlocked = useUiStore((state) => state.setLandscapeBlocked);

  useEffect(() => {
    const evaluate = () => {
      const { innerWidth, innerHeight } = window;
      const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const ratio = innerWidth / Math.max(1, innerHeight);
      setLandscapeBlocked(
        isCoarsePointer && ratio > LANDSCAPE_RATIO && innerHeight < MIN_LANDSCAPE_HEIGHT,
      );
    };

    evaluate();
    window.addEventListener('resize', evaluate);
    window.addEventListener('orientationchange', evaluate);
    return () => {
      window.removeEventListener('resize', evaluate);
      window.removeEventListener('orientationchange', evaluate);
    };
  }, [setLandscapeBlocked]);
}
