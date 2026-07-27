'use client';

import { useState } from 'react';
import { Button } from '@/components/common/Button';
import { ScreenPanel } from '@/components/common/Panel';
import {
  SKINS,
  THEMES,
  TRAILS,
  isUnlocked,
  unlockContextFromProfile,
  type CosmeticCategory,
  type CosmeticDefinition,
} from '@/game/config/cosmetics';
import { useProfileStore } from '@/stores/useProfileStore';
import { useUiStore } from '@/stores/useUiStore';

const TABS: ReadonlyArray<{
  id: CosmeticCategory;
  label: string;
  items: readonly CosmeticDefinition[];
}> = [
  { id: 'skin', label: 'Esferas', items: SKINS },
  { id: 'trail', label: 'Estelas', items: TRAILS },
  { id: 'theme', label: 'Fondos', items: THEMES },
];

/** Cosmetics gallery. Everything is earned by playing — nothing is for sale. */
export function SkinsScreen() {
  const closeScreen = useUiStore((state) => state.closeScreen);
  const profile = useProfileStore((state) => state.profile);
  const equip = useProfileStore((state) => state.equip);
  const [tab, setTab] = useState<CosmeticCategory>('skin');

  const context = unlockContextFromProfile(profile);
  const active = TABS.find((entry) => entry.id === tab) ?? TABS[0]!;
  const owned =
    tab === 'skin'
      ? profile.unlockedSkins
      : tab === 'trail'
        ? profile.unlockedTrails
        : profile.unlockedThemes;
  const equipped =
    tab === 'skin'
      ? profile.equippedSkin
      : tab === 'trail'
        ? profile.equippedTrail
        : profile.equippedTheme;

  return (
    <ScreenPanel
      title="Apariencias"
      subtitle="Todo se desbloquea jugando. No hay compras ni cajas de recompensa."
      onClose={closeScreen}
    >
      <div
        role="tablist"
        aria-label="Categorías de apariencia"
        className="border-surface-border bg-surface mb-4 grid grid-cols-3 gap-1 rounded-xl border p-1"
      >
        {TABS.map((entry) => (
          <button
            key={entry.id}
            role="tab"
            aria-selected={entry.id === tab}
            onClick={() => setTab(entry.id)}
            className={[
              'min-h-[44px] rounded-lg text-sm font-bold transition-colors',
              entry.id === tab ? 'bg-primary text-void' : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-3 pb-4">
        {active.items.map((item) => {
          const unlocked = owned.includes(item.id) || isUnlocked(item.unlock, context);
          const isEquipped = equipped === item.id;
          return (
            <li
              key={item.id}
              className={[
                'panel-surface flex flex-col gap-3 p-3',
                isEquipped ? 'border-primary' : '',
              ].join(' ')}
            >
              <CosmeticPreview definition={item} locked={!unlocked} />
              <div className="min-h-[3.5rem]">
                <p className="text-ink text-sm font-bold">{unlocked ? item.name : '???'}</p>
                <p className="text-ink-muted mt-0.5 text-[11px] leading-snug">
                  {unlocked ? item.description : item.unlock.label}
                </p>
              </div>
              <Button
                size="sm"
                variant={isEquipped ? 'primary' : 'secondary'}
                disabled={!unlocked || isEquipped}
                onClick={() => equip(item.category, item.id)}
                fullWidth
              >
                {isEquipped ? 'Equipado' : unlocked ? 'Equipar' : 'Bloqueado'}
              </Button>
            </li>
          );
        })}
      </ul>
    </ScreenPanel>
  );
}

function CosmeticPreview({
  definition,
  locked,
}: {
  definition: CosmeticDefinition;
  locked: boolean;
}) {
  const [primary, secondary] = definition.colors;
  return (
    <div
      className="border-surface-border relative flex h-24 items-center justify-center overflow-hidden rounded-xl border"
      style={{ background: `radial-gradient(circle at 50% 60%, ${secondary}22, #04070f 72%)` }}
      aria-hidden="true"
    >
      {definition.category === 'theme' ? (
        <div
          className="h-full w-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${primary}, transparent 60%), radial-gradient(circle at 70% 70%, ${secondary}66, transparent 55%)`,
            filter: locked ? 'grayscale(1) brightness(0.4)' : 'none',
          }}
        />
      ) : (
        <div
          className="h-11 w-11 rounded-full"
          style={{
            background: `radial-gradient(circle, #fff 12%, ${primary} 55%, ${secondary} 100%)`,
            boxShadow: locked ? 'none' : `0 0 26px ${primary}`,
            filter: locked ? 'grayscale(1) brightness(0.4)' : 'none',
          }}
        />
      )}
      {definition.category === 'trail' && !locked ? (
        <div
          className="absolute bottom-4 left-3 h-1.5 w-2/3 rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, ${primary})` }}
        />
      ) : null}
      {locked ? (
        <span className="bg-void/70 text-ink-muted absolute inset-0 flex items-center justify-center text-xs font-black tracking-widest">
          BLOQUEADO
        </span>
      ) : null}
    </div>
  );
}
