'use client';

import type { ReactNode } from 'react';
import { getAudioManager } from '@/game/audio/AudioManager';
import { getHapticsManager } from '@/game/managers/HapticsManager';

/** Accessible switch. State is signalled by position *and* text, never colour alone. */
export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="border-surface-border/60 flex cursor-pointer items-center justify-between gap-4 border-b py-3.5 last:border-b-0">
      <span className="min-w-0">
        <span className="text-ink block text-base font-semibold">{label}</span>
        {description ? (
          <span className="text-ink-muted mt-0.5 block text-xs leading-relaxed">{description}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-ink-muted w-16 text-right text-xs font-bold tracking-wider uppercase">
          {checked ? 'Sí' : 'No'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => {
            getAudioManager().playSfx('ui-tap');
            getHapticsManager().fire('uiTap');
            onChange(!checked);
          }}
          className={[
            'relative h-8 w-14 shrink-0 rounded-full border transition-colors',
            checked ? 'bg-primary/30 border-primary' : 'bg-surface border-surface-border',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-1 h-5 w-5 rounded-full transition-all duration-200',
              checked ? 'bg-primary left-8' : 'bg-ink-faint left-1',
            ].join(' ')}
          />
        </button>
      </span>
    </label>
  );
}

/** Volume-style slider with a live percentage read-out. */
export function Slider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const percent = Math.round(value * 100);
  return (
    <div className="border-surface-border/60 border-b py-3.5 last:border-b-0">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={`slider-${label}`} className="text-ink text-base font-semibold">
          {label}
        </label>
        <span className="text-ink-muted text-sm font-bold tabular-nums">{percent}%</span>
      </div>
      <input
        id={`slider-${label}`}
        type="range"
        min={0}
        max={100}
        step={5}
        value={percent}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="accent-primary bg-surface-raised h-2 w-full cursor-pointer appearance-none rounded-full disabled:opacity-40"
      />
    </div>
  );
}

/** Segmented control for enumerated settings (particle quality, etc.). */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="border-surface-border/60 border-b py-3.5 last:border-b-0">
      <p className="text-ink mb-2 text-base font-semibold">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="border-surface-border bg-surface grid grid-flow-col rounded-xl border p-1"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                getAudioManager().playSfx('ui-tap');
                getHapticsManager().fire('uiTap');
                onChange(option.value);
              }}
              className={[
                'min-h-[44px] rounded-lg px-3 text-sm font-bold transition-colors',
                active ? 'bg-primary text-void' : 'text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Section heading inside a settings or stats panel. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-ink-faint mt-6 mb-1 text-xs font-black tracking-[0.2em] uppercase first:mt-0">
      {children}
    </h3>
  );
}
