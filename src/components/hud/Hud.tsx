'use client';

import { useEffect, useRef, useState } from 'react';
import { IconButton } from '@/components/common/Button';
import { gameBus } from '@/game/events/GameEvents';
import { useUiStore } from '@/stores/useUiStore';
import { useSettingsStore } from '@/stores/useSettingsStore';

/**
 * In-run HUD.
 *
 * Everything sits in the top band and the very bottom corner so it never
 * overlaps the play field, where the orb and the next core live. Values come
 * from a throttled store slice, not from a per-frame subscription.
 */
export function Hud() {
  const hud = useUiStore((state) => state.hud);
  const phase = useUiStore((state) => state.phase);
  const showKeyboardHints = useSettingsStore((state) => state.settings.showKeyboardHints);
  const visible = phase === 'playing' || phase === 'tutorial' || phase === 'paused';

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <div className="flex flex-col gap-1.5">
          <AnimatedScore value={hud.score} />
          <div className="flex items-center gap-2">
            <Chip label="Combo" value={`x${hud.combo}`} tone="magenta" />
            <Chip label="Mult" value={`${hud.multiplier.toFixed(1)}x`} tone="primary" />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto">
            <IconButton label="Pausar" onClick={() => gameBus.emit('REQUEST_PAUSE')}>
              <PauseGlyph />
            </IconButton>
          </div>
          <Chip label="Fragmentos" value={String(hud.fragments)} tone="ember" compact />
          {hud.shieldActive ? <ShieldBadge /> : null}
        </div>
      </div>

      <div className="flex-1" />

      {showKeyboardHints ? (
        <p className="text-ink-faint hidden pb-3 text-center text-[11px] tracking-wider uppercase sm:block">
          Clic / Espacio: soltar · Esc: pausa · Enter: reintentar
        </p>
      ) : null}
    </div>
  );
}

/** Score counter that animates towards its target instead of snapping. */
function AnimatedScore({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);
  const frameRef = useRef<number | null>(null);
  const currentRef = useRef(value);

  useEffect(() => {
    const animate = () => {
      const diff = value - currentRef.current;
      if (Math.abs(diff) < 1) {
        currentRef.current = value;
        setDisplayed(value);
        frameRef.current = null;
        return;
      }
      currentRef.current += diff * 0.22;
      setDisplayed(Math.round(currentRef.current));
      frameRef.current = requestAnimationFrame(animate);
    };

    if (frameRef.current === null) frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value]);

  return (
    <p
      className="neon-text text-ink text-4xl leading-none font-black tabular-nums sm:text-5xl"
      aria-live="off"
    >
      {displayed.toLocaleString('es')}
    </p>
  );
}

function Chip({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: string;
  tone: 'primary' | 'magenta' | 'ember';
  compact?: boolean;
}) {
  const toneClass =
    tone === 'magenta' ? 'text-magenta' : tone === 'ember' ? 'text-ember' : 'text-primary';
  return (
    <div className="border-surface-border bg-surface/70 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 backdrop-blur-sm">
      {!compact ? (
        <span className="text-ink-faint text-[10px] font-bold tracking-wider uppercase">
          {label}
        </span>
      ) : null}
      <span className={`text-sm font-black tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

function ShieldBadge() {
  return (
    <div className="border-success/60 bg-success/15 text-success flex items-center gap-1.5 rounded-lg border px-2.5 py-1 backdrop-blur-sm">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
        <circle cx="8" cy="8" r="2.5" fill="currentColor" />
      </svg>
      <span className="text-[10px] font-black tracking-wider uppercase">Escudo</span>
    </div>
  );
}

function PauseGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="3.5" height="12" rx="1.2" fill="currentColor" />
      <rect x="10.5" y="3" width="3.5" height="12" rx="1.2" fill="currentColor" />
    </svg>
  );
}
