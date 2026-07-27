'use client';

import type { ReactNode } from 'react';
import { IconButton } from '@/components/common/Button';

interface ScreenPanelProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Full-screen overlay panel used by every secondary screen. */
export function ScreenPanel({ title, subtitle, onClose, children, footer }: ScreenPanelProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="bg-void/85 animate-fade-in absolute inset-0 z-40 flex flex-col backdrop-blur-md"
    >
      <header className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
        <div>
          <h2 className="neon-text text-primary text-2xl font-black tracking-[0.14em] uppercase">
            {title}
          </h2>
          {subtitle ? <p className="text-ink-muted mt-1 text-sm">{subtitle}</p> : null}
        </div>
        {onClose ? (
          <IconButton label="Cerrar" onClick={onClose}>
            <CloseGlyph />
          </IconButton>
        ) : null}
      </header>

      <div className="scroll-panel min-h-0 flex-1 px-5 pb-4">{children}</div>

      {footer ? (
        <footer className="border-surface-border border-t px-5 py-4">{footer}</footer>
      ) : null}
    </div>
  );
}

/** Card used inside panels for grouped content. */
export function Card({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'li';
}) {
  return <Tag className={`panel-surface p-4 ${className}`}>{children}</Tag>;
}

/** Label + value row, the workhorse of the stats and summary screens. */
export function StatRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="border-surface-border/60 flex items-baseline justify-between gap-4 border-b py-2.5 last:border-b-0">
      <span className="text-ink-muted text-sm">{label}</span>
      <span
        className={
          emphasis ? 'text-primary neon-text text-xl font-black' : 'text-ink text-lg font-bold'
        }
      >
        {value}
      </span>
    </div>
  );
}

export function CloseGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Progress bar with an accessible role and a text alternative. */
export function ProgressBar({
  ratio,
  label,
  tone = 'primary',
}: {
  ratio: number;
  label: string;
  tone?: 'primary' | 'success' | 'ember';
}) {
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  const toneClass =
    tone === 'success' ? 'bg-success' : tone === 'ember' ? 'bg-ember' : 'bg-primary';
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      className="bg-surface-raised border-surface-border h-2.5 w-full overflow-hidden rounded-full border"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${toneClass}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
