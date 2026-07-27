'use client';

import { useEffect, useRef } from 'react';
import { gameBus, type GameEventMap, type GameEventName } from '@/game/events/GameEvents';

/**
 * Subscribes a component to a typed game event.
 *
 * The handler is kept in a ref (updated in an effect, never during render) so a
 * new inline closure on every render does not churn the subscription — which
 * matters because these events fire straight from the game loop.
 */
export function useGameEvent<K extends GameEventName>(
  event: K,
  handler: (payload: GameEventMap[K]) => void,
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    return gameBus.on(event, (payload) => handlerRef.current(payload));
  }, [event]);
}
