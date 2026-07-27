'use client';

import { useEffect, useState } from 'react';
import { debugState, isDebugAvailable, type DebugFlags } from '@/game/config/debug';
import { gameBus } from '@/game/events/GameEvents';
import { getSaveManager } from '@/services/persistence/SaveManager';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';

/**
 * Development-only debug panel.
 *
 * Gated by `isDebugAvailable()`, which is false in every production build
 * unless `NEXT_PUBLIC_ENABLE_DEBUG=true` is set explicitly, so this can never
 * ship enabled to a store build.
 */
export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [flags, setFlags] = useState<DebugFlags>(debugState.current);
  const [seed, setSeed] = useState('');
  const setSetting = useSettingsStore((state) => state.set);
  const showToast = useUiStore((state) => state.showToast);

  useEffect(() => debugState.subscribe(setFlags), []);

  useEffect(() => {
    if (!isDebugAvailable()) return;
    const handler = (event: KeyboardEvent) => {
      // Backquote is the classic console key and never collides with gameplay.
      if (event.key === '`' || event.key === '~') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!isDebugAvailable()) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-surface-border bg-surface/90 text-ink-faint absolute right-2 bottom-2 z-50 rounded-lg border px-2 py-1 font-mono text-[10px]"
      >
        DEBUG (`)
      </button>
    );
  }

  const toggles: Array<{ key: keyof DebugFlags; label: string }> = [
    { key: 'showFps', label: 'FPS' },
    { key: 'showHitboxes', label: 'Hitboxes' },
    { key: 'showGravityRadius', label: 'Radios de captura' },
    { key: 'showTrajectory', label: 'Trayectoria estimada' },
    { key: 'invincible', label: 'Invencible' },
    { key: 'simulateSlowDevice', label: 'Simular dispositivo lento' },
  ];

  return (
    <aside className="border-surface-border bg-void/95 absolute right-2 bottom-2 z-50 flex w-64 flex-col gap-2 rounded-xl border p-3 font-mono text-[11px] backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-primary font-bold">DEBUG</span>
        <button
          type="button"
          aria-label="Cerrar panel de depuración"
          onClick={() => setOpen(false)}
          className="text-ink-faint px-1"
        >
          ✕
        </button>
      </div>

      {toggles.map((entry) => (
        <label key={String(entry.key)} className="flex items-center justify-between gap-2">
          <span className="text-ink-muted">{entry.label}</span>
          <input
            type="checkbox"
            checked={Boolean(flags[entry.key])}
            onChange={() => debugState.toggle(entry.key as never)}
          />
        </label>
      ))}

      <label className="flex items-center justify-between gap-2">
        <span className="text-ink-muted">Velocidad</span>
        <input
          type="range"
          min={0.2}
          max={2}
          step={0.1}
          value={flags.timeScale}
          onChange={(event) => debugState.set('timeScale', Number(event.target.value))}
          className="w-24"
        />
      </label>
      <span className="text-ink-faint text-right">x{flags.timeScale.toFixed(1)}</span>

      <div className="flex gap-1">
        <input
          value={seed}
          onChange={(event) => setSeed(event.target.value.toUpperCase())}
          placeholder="SEMILLA"
          className="border-surface-border bg-surface text-ink min-w-0 flex-1 rounded border px-1.5 py-1"
        />
        <button
          type="button"
          className="border-surface-border text-primary rounded border px-2"
          onClick={() => {
            debugState.set('forcedSeed', seed || null);
            gameBus.emit('DEBUG_COMMAND', { command: 'set-seed', value: seed });
          }}
        >
          Fijar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <DebugButton
          onClick={() => gameBus.emit('DEBUG_COMMAND', { command: 'add-score', value: 5000 })}
        >
          +5000 pts
        </DebugButton>
        <DebugButton onClick={() => gameBus.emit('DEBUG_COMMAND', { command: 'force-game-over' })}>
          Game over
        </DebugButton>
        <DebugButton onClick={() => gameBus.emit('DEBUG_COMMAND', { command: 'spawn-obstacle' })}>
          Obstáculos
        </DebugButton>
        <DebugButton onClick={() => setSetting('particleQuality', 'low')}>Partículas ↓</DebugButton>
        <DebugButton
          className="col-span-2"
          onClick={() => {
            getSaveManager().reset();
            showToast('Almacenamiento limpiado', 'info');
          }}
        >
          Limpiar almacenamiento
        </DebugButton>
      </div>
    </aside>
  );
}

function DebugButton({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-surface-border text-ink-muted hover:text-ink rounded border px-1.5 py-1 ${className}`}
    >
      {children}
    </button>
  );
}
