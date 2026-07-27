'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { getAudioManager } from '@/game/audio/AudioManager';
import { getHapticsManager } from '@/game/managers/HapticsManager';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'hero';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-void hover:bg-primary/90 active:bg-primary/80 shadow-[0_0_28px_-6px_var(--color-primary)]',
  secondary:
    'bg-surface-raised text-ink border border-surface-border hover:border-primary/70 hover:text-primary',
  ghost: 'bg-transparent text-ink-muted hover:text-ink hover:bg-surface/60',
  danger: 'bg-danger/15 text-danger border border-danger/45 hover:bg-danger/25',
};

/** Touch targets never go below 44px — the platform accessibility minimum. */
const SIZES: Record<Size, string> = {
  sm: 'min-h-[44px] px-4 text-sm',
  md: 'min-h-[52px] px-6 text-base',
  lg: 'min-h-[60px] px-8 text-lg',
  hero: 'min-h-[76px] px-10 text-2xl tracking-[0.18em]',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  fullWidth,
  className = '',
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={(event) => {
        // Feedback lives here so no call site can forget it.
        getAudioManager().playSfx(variant === 'ghost' ? 'ui-back' : 'ui-tap');
        getHapticsManager().fire('uiTap');
        onClick?.(event);
      }}
      className={[
        'inline-flex items-center justify-center gap-2.5 rounded-2xl font-bold uppercase',
        'transition-all duration-150 active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {icon}
      {rest.children}
    </button>
  );
}

/** Compact square button used for the HUD pause control and modal dismissals. */
export function IconButton({
  label,
  className = '',
  onClick,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        getAudioManager().playSfx('ui-tap');
        getHapticsManager().fire('uiTap');
        onClick?.(event);
      }}
      className={[
        'text-ink-muted hover:text-ink border-surface-border bg-surface/80 flex h-12 w-12',
        'items-center justify-center rounded-xl border backdrop-blur transition-colors',
        'active:scale-95',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
