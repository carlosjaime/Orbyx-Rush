/**
 * Orbyx Rush wordmark and isotype.
 *
 * Built from primitives so it scales losslessly, themes with CSS variables and
 * carries no licensing baggage.
 */

export function OrbyxMark({ size = 96, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      role="img"
      aria-label="Isotipo de Orbyx Rush"
      className={className}
    >
      <defs>
        <radialGradient id="orbyx-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-ink)" />
          <stop offset="55%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-secondary)" />
        </radialGradient>
        <linearGradient id="orbyx-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-primary)" />
          <stop offset="100%" stopColor="var(--color-secondary)" />
        </linearGradient>
      </defs>

      {/* Outer orbit */}
      <ellipse
        cx="48"
        cy="48"
        rx="40"
        ry="40"
        stroke="url(#orbyx-ring)"
        strokeWidth="3"
        strokeDasharray="6 9"
        opacity="0.65"
      />
      {/* Inclined inner orbit */}
      <ellipse
        cx="48"
        cy="48"
        rx="40"
        ry="17"
        stroke="url(#orbyx-ring)"
        strokeWidth="3"
        transform="rotate(-28 48 48)"
        opacity="0.9"
      />
      {/* Gravitational core: hexagon */}
      <path
        d="M48 30 L63.6 39 L63.6 57 L48 66 L32.4 57 L32.4 39 Z"
        fill="var(--color-surface-raised)"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* The orb itself */}
      <circle cx="79" cy="33" r="9" fill="url(#orbyx-core)" />
      <circle cx="79" cy="33" r="14" fill="var(--color-primary)" opacity="0.18" />
    </svg>
  );
}

export function OrbyxWordmark({ className }: { className?: string }) {
  return (
    <div className={className}>
      <h1 className="neon-text text-primary text-4xl font-black tracking-[0.22em] sm:text-5xl">
        ORBYX
      </h1>
      <p className="text-secondary -mt-1 text-2xl font-bold tracking-[0.62em] sm:text-3xl">RUSH</p>
    </div>
  );
}

export function OrbyxLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <OrbyxMark size={compact ? 64 : 104} className="animate-soft-pulse" />
      <OrbyxWordmark className="text-center" />
    </div>
  );
}
