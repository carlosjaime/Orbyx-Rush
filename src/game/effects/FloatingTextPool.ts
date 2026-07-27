import * as Phaser from 'phaser';
import { PERFORMANCE } from '@/game/config/balance';

interface PooledText {
  text: Phaser.GameObjects.Text;
  life: number;
  maxLife: number;
  vy: number;
  active: boolean;
}

/**
 * Pooled floating combat text ("+250", "PERFECTO", "x3").
 *
 * Text objects are the most expensive thing to allocate in Phaser, so a fixed
 * pool is created up-front and reused for the whole session.
 */
export class FloatingTextPool {
  private readonly pool: PooledText[] = [];
  private cursor = 0;

  constructor(scene: Phaser.Scene, depth: number, size = PERFORMANCE.pools.floatingText) {
    for (let i = 0; i < size; i += 1) {
      const text = scene.add
        .text(0, 0, '', {
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          fontSize: '40px',
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(depth)
        .setActive(false)
        .setVisible(false);
      this.pool.push({ text, life: 0, maxLife: 1, vy: 0, active: false });
    }
  }

  spawn(options: {
    x: number;
    y: number;
    label: string;
    color: string;
    size?: number;
    life?: number;
    rise?: number;
  }): void {
    let entry: PooledText | null = null;
    for (let i = 0; i < this.pool.length; i += 1) {
      const candidate = this.pool[(this.cursor + i) % this.pool.length]!;
      if (!candidate.active) {
        entry = candidate;
        this.cursor = (this.cursor + i + 1) % this.pool.length;
        break;
      }
    }
    if (!entry) return;

    entry.active = true;
    entry.maxLife = options.life ?? 0.9;
    entry.life = entry.maxLife;
    entry.vy = -(options.rise ?? 90);
    entry.text
      .setText(options.label)
      .setPosition(options.x, options.y)
      .setColor(options.color)
      .setFontSize(options.size ?? 40)
      .setAlpha(1)
      .setScale(1)
      .setActive(true)
      .setVisible(true);
  }

  update(deltaSeconds: number): void {
    for (const entry of this.pool) {
      if (!entry.active) continue;
      entry.life -= deltaSeconds;
      if (entry.life <= 0) {
        entry.active = false;
        entry.text.setActive(false).setVisible(false);
        continue;
      }
      const ratio = entry.life / entry.maxLife;
      entry.text.y += entry.vy * deltaSeconds;
      entry.text.setAlpha(Math.min(1, ratio * 1.8));
      entry.text.setScale(1 + (1 - ratio) * 0.18);
    }
  }

  clear(): void {
    for (const entry of this.pool) {
      entry.active = false;
      entry.text.setActive(false).setVisible(false);
    }
  }

  destroy(): void {
    for (const entry of this.pool) entry.text.destroy();
    this.pool.length = 0;
  }
}
