import * as Phaser from 'phaser';

/**
 * Every sprite in Orbyx Rush is generated at runtime from vector primitives.
 *
 * That keeps the bundle free of third-party art (and of any copyright doubt),
 * makes the game start instantly, and still gives us GPU-friendly textured
 * quads instead of per-frame Graphics redraws.
 *
 * Swapping in professional art later means changing this file only: the keys
 * below are the contract the entities rely on.
 */

export const TEXTURE_KEYS = {
  orb: 'tex-orb',
  glow: 'tex-glow',
  spark: 'tex-spark',
  ring: 'tex-ring',
  ringThick: 'tex-ring-thick',
  coreCore: 'tex-core-core',
  starSmall: 'tex-star-small',
  starMedium: 'tex-star-medium',
  nebula: 'tex-nebula',
  hazardBar: 'tex-hazard-bar',
  fragment: 'tex-fragment',
  shield: 'tex-shield',
  portal: 'tex-portal',
  zone: 'tex-zone',
  hexagon: 'tex-hexagon',
  vignette: 'tex-vignette',
} as const;

export type TextureKey = (typeof TEXTURE_KEYS)[keyof typeof TEXTURE_KEYS];

interface RadialStop {
  offset: number;
  color: string;
}

/** Draws a radial gradient into a canvas texture — the workhorse for glows. */
function makeRadialTexture(
  scene: Phaser.Scene,
  key: string,
  size: number,
  stops: RadialStop[],
): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, size, size);
  if (!texture) return;
  const ctx = texture.getContext();
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  for (const stop of stops) gradient.addColorStop(stop.offset, stop.color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  texture.refresh();
}

function makeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) return;
  draw(texture.getContext(), width, height);
  texture.refresh();
}

/** Generates the whole atlas. Call once, from PreloadScene. */
export function generateTextures(scene: Phaser.Scene): void {
  // --- Orb: a bright white core fading into a coloured halo (tinted at use).
  makeRadialTexture(scene, TEXTURE_KEYS.orb, 128, [
    { offset: 0, color: 'rgba(255,255,255,1)' },
    { offset: 0.28, color: 'rgba(255,255,255,0.95)' },
    { offset: 0.52, color: 'rgba(255,255,255,0.42)' },
    { offset: 1, color: 'rgba(255,255,255,0)' },
  ]);

  // --- Soft glow used for bloom-ish halos and light pools.
  makeRadialTexture(scene, TEXTURE_KEYS.glow, 256, [
    { offset: 0, color: 'rgba(255,255,255,0.55)' },
    { offset: 0.45, color: 'rgba(255,255,255,0.18)' },
    { offset: 1, color: 'rgba(255,255,255,0)' },
  ]);

  // --- Particle spark: tighter falloff so bursts read as discrete points.
  makeRadialTexture(scene, TEXTURE_KEYS.spark, 48, [
    { offset: 0, color: 'rgba(255,255,255,1)' },
    { offset: 0.35, color: 'rgba(255,255,255,0.6)' },
    { offset: 1, color: 'rgba(255,255,255,0)' },
  ]);

  // --- Capture ring: thin annulus marking the exact orbit radius.
  makeCanvasTexture(scene, TEXTURE_KEYS.ring, 256, 256, (ctx, w) => {
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, w / 2 - 6, 0, Math.PI * 2);
    ctx.stroke();
  });

  makeCanvasTexture(scene, TEXTURE_KEYS.ringThick, 256, 256, (ctx, w) => {
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(w / 2, w / 2, w / 2 - 12, 0, Math.PI * 2);
    ctx.stroke();
  });

  // --- Core body: a hexagonal shell with an inner light well.
  makeCanvasTexture(scene, TEXTURE_KEYS.coreCore, 160, 160, (ctx, w) => {
    const cx = w / 2;
    const cy = w / 2;
    const radius = w / 2 - 10;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 5;
    ctx.stroke();
  });

  makeCanvasTexture(scene, TEXTURE_KEYS.hexagon, 96, 96, (ctx, w) => {
    const cx = w / 2;
    const radius = w / 2 - 6;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cx + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 6;
    ctx.stroke();
  });

  // --- Star fields, tiled for parallax. Three densities.
  makeStarField(scene, TEXTURE_KEYS.starSmall, 512, 120, 0.8, 0.45);
  makeStarField(scene, TEXTURE_KEYS.starMedium, 512, 46, 1.6, 0.8);

  // --- Nebula band: cheap layered blobs, tinted per theme. Every blob is drawn
  // nine times (the 3x3 wrap offsets) so the texture tiles without a visible
  // seam when it scrolls as a parallax layer.
  makeCanvasTexture(scene, TEXTURE_KEYS.nebula, 512, 512, (ctx, w, h) => {
    for (let i = 0; i < 14; i += 1) {
      const baseX = Math.random() * w;
      const baseY = Math.random() * h;
      const radius = 60 + Math.random() * 180;
      const alpha = 0.05 + Math.random() * 0.05;
      for (const offsetX of [-w, 0, w]) {
        for (const offsetY of [-h, 0, h]) {
          const x = baseX + offsetX;
          const y = baseY + offsetY;
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
      }
    }
  });

  // --- Hazard bar: a bright capsule with darker edges.
  makeCanvasTexture(scene, TEXTURE_KEYS.hazardBar, 256, 32, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.35)');
    ctx.fillStyle = gradient;
    const radius = h / 2;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(w - radius, 0);
    ctx.arc(w - radius, radius, radius, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(radius, h);
    ctx.arc(radius, radius, radius, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  });

  // --- Fragment: a rotated diamond with a bright centre.
  makeCanvasTexture(scene, TEXTURE_KEYS.fragment, 64, 64, (ctx, w) => {
    const c = w / 2;
    ctx.beginPath();
    ctx.moveTo(c, 6);
    ctx.lineTo(w - 6, c);
    ctx.lineTo(c, w - 6);
    ctx.lineTo(6, c);
    ctx.closePath();
    const gradient = ctx.createRadialGradient(c, c, 1, c, c, c);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.35)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  // --- Shield: a double ring, visually distinct from a fragment.
  makeCanvasTexture(scene, TEXTURE_KEYS.shield, 96, 96, (ctx, w) => {
    const c = w / 2;
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(c, c, c - 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, c - 20, 0, Math.PI * 2);
    ctx.stroke();
  });

  // --- Portal: concentric dashes, clearly not a core.
  makeCanvasTexture(scene, TEXTURE_KEYS.portal, 160, 160, (ctx, w) => {
    const c = w / 2;
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 6;
    for (let ring = 0; ring < 3; ring += 1) {
      const radius = c - 12 - ring * 20;
      const segments = 8 + ring * 2;
      for (let i = 0; i < segments; i += 1) {
        const start = (Math.PI * 2 * i) / segments + ring * 0.3;
        ctx.beginPath();
        ctx.arc(c, c, radius, start, start + Math.PI / segments);
        ctx.stroke();
      }
    }
  });

  // --- Vignette: a vertical gradient darkening the top and bottom bands so the
  // HUD stays legible over bright nebulae. A gradient rather than flat
  // rectangles is what keeps the transition free of a visible seam.
  makeCanvasTexture(scene, TEXTURE_KEYS.vignette, 8, 512, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(0.16, 'rgba(255,255,255,0.28)');
    gradient.addColorStop(0.34, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.9, 'rgba(255,255,255,0.34)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  });

  // --- Zone: soft filled disc used for slow/boost/gravity fields.
  makeRadialTexture(scene, TEXTURE_KEYS.zone, 256, [
    { offset: 0, color: 'rgba(255,255,255,0.32)' },
    { offset: 0.7, color: 'rgba(255,255,255,0.14)' },
    { offset: 0.98, color: 'rgba(255,255,255,0.4)' },
    { offset: 1, color: 'rgba(255,255,255,0)' },
  ]);
}

function makeStarField(
  scene: Phaser.Scene,
  key: string,
  size: number,
  count: number,
  maxRadius: number,
  maxAlpha: number,
): void {
  makeCanvasTexture(scene, key, size, size, (ctx, w, h) => {
    for (let i = 0; i < count; i += 1) {
      const baseX = Math.random() * w;
      const baseY = Math.random() * h;
      const radius = 0.4 + Math.random() * maxRadius;
      const alpha = 0.2 + Math.random() * maxAlpha;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      // Wrap stars that straddle an edge so the tiled field has no grid lines.
      for (const offsetX of [-w, 0, w]) {
        for (const offsetY of [-h, 0, h]) {
          ctx.beginPath();
          ctx.arc(baseX + offsetX, baseY + offsetY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  });
}
