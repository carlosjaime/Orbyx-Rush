import * as Phaser from 'phaser';
import { FEEDBACK, PERFORMANCE } from '@/game/config/balance';
import { TEXTURE_KEYS } from '@/game/effects/textures';
import type { ParticleQuality } from '@/game/types';

interface PooledParticle {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  drag: number;
  startScale: number;
  active: boolean;
}

/**
 * Hand-rolled particle pool.
 *
 * Phaser's emitters are excellent, but a fixed pool of tinted quads gives us
 * exact control over the allocation budget: nothing is created after `preload`,
 * so the game loop never triggers a GC pause mid-run.
 */
export class ParticleSystem {
  private readonly pool: PooledParticle[] = [];
  private cursor = 0;
  private quality: ParticleQuality = 'high';

  constructor(scene: Phaser.Scene, depth: number, poolSize = PERFORMANCE.pools.particles) {
    for (let i = 0; i < poolSize; i += 1) {
      const sprite = scene.add
        .image(0, 0, TEXTURE_KEYS.spark)
        .setDepth(depth)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setActive(false)
        .setVisible(false);
      this.pool.push({
        sprite,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        drag: 0.9,
        startScale: 1,
        active: false,
      });
    }
  }

  setQuality(quality: ParticleQuality): void {
    this.quality = quality;
  }

  private scaledCount(count: number): number {
    return Math.max(1, Math.round(count * FEEDBACK.particles.qualityScale[this.quality]));
  }

  private acquire(): PooledParticle | null {
    // Round-robin over the pool; if everything is busy the burst is simply
    // smaller, which is the correct behaviour under load.
    for (let i = 0; i < this.pool.length; i += 1) {
      const candidate = this.pool[(this.cursor + i) % this.pool.length]!;
      if (!candidate.active) {
        this.cursor = (this.cursor + i + 1) % this.pool.length;
        return candidate;
      }
    }
    return null;
  }

  /** Radial burst. `speed` is in logical px/s. */
  burst(options: {
    x: number;
    y: number;
    count: number;
    color: number;
    speed: number;
    life: number;
    size: number;
    spread?: number;
    angle?: number;
  }): void {
    const count = this.scaledCount(options.count);
    const spread = options.spread ?? Math.PI * 2;
    const baseAngle = options.angle ?? 0;

    for (let i = 0; i < count; i += 1) {
      const particle = this.acquire();
      if (!particle) return;
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = options.speed * (0.45 + Math.random() * 0.75);
      const size = options.size * (0.6 + Math.random() * 0.8);

      particle.active = true;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.maxLife = options.life * (0.7 + Math.random() * 0.6);
      particle.life = particle.maxLife;
      particle.drag = 0.86 + Math.random() * 0.1;
      particle.startScale = size / 48;

      particle.sprite
        .setPosition(options.x, options.y)
        .setTint(options.color)
        .setScale(particle.startScale)
        .setAlpha(1)
        .setActive(true)
        .setVisible(true);
    }
  }

  /** Ring of particles expanding outward — used for perfect captures. */
  ring(options: { x: number; y: number; radius: number; count: number; color: number }): void {
    const count = this.scaledCount(options.count);
    for (let i = 0; i < count; i += 1) {
      const particle = this.acquire();
      if (!particle) return;
      const angle = (Math.PI * 2 * i) / count;
      particle.active = true;
      particle.vx = Math.cos(angle) * options.radius * 2.4;
      particle.vy = Math.sin(angle) * options.radius * 2.4;
      particle.maxLife = 0.5;
      particle.life = 0.5;
      particle.drag = 0.9;
      particle.startScale = 0.5;
      particle.sprite
        .setPosition(
          options.x + Math.cos(angle) * options.radius * 0.4,
          options.y + Math.sin(angle) * options.radius * 0.4,
        )
        .setTint(options.color)
        .setScale(0.5)
        .setAlpha(1)
        .setActive(true)
        .setVisible(true);
    }
  }

  update(deltaSeconds: number): void {
    for (const particle of this.pool) {
      if (!particle.active) continue;
      particle.life -= deltaSeconds;
      if (particle.life <= 0) {
        particle.active = false;
        particle.sprite.setActive(false).setVisible(false);
        continue;
      }
      const dragFactor = Math.pow(particle.drag, deltaSeconds * 60);
      particle.vx *= dragFactor;
      particle.vy *= dragFactor;
      particle.sprite.x += particle.vx * deltaSeconds;
      particle.sprite.y += particle.vy * deltaSeconds;
      const ratio = particle.life / particle.maxLife;
      particle.sprite.setAlpha(ratio);
      particle.sprite.setScale(particle.startScale * (0.35 + ratio * 0.65));
    }
  }

  clear(): void {
    for (const particle of this.pool) {
      particle.active = false;
      particle.sprite.setActive(false).setVisible(false);
    }
  }

  destroy(): void {
    for (const particle of this.pool) particle.sprite.destroy();
    this.pool.length = 0;
  }
}
