'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/common/Button';
import { SectionTitle, SegmentedControl, Slider, Toggle } from '@/components/common/Controls';
import { ScreenPanel } from '@/components/common/Panel';
import { useProfileStore } from '@/stores/useProfileStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUiStore } from '@/stores/useUiStore';
import type { ParticleQuality } from '@/game/types';

const QUALITY_OPTIONS: ReadonlyArray<{ value: ParticleQuality; label: string }> = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
];

export function SettingsScreen() {
  const closeScreen = useUiStore((state) => state.closeScreen);
  const openScreen = useUiStore((state) => state.openScreen);
  const showToast = useUiStore((state) => state.showToast);
  const settings = useSettingsStore((state) => state.settings);
  const set = useSettingsStore((state) => state.set);
  const exportProgress = useProfileStore((state) => state.exportProgress);
  const importProgress = useProfileStore((state) => state.importProgress);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    try {
      const payload = exportProgress();
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `orbyx-rush-progreso-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast('Progreso exportado', 'success');
    } catch {
      showToast('No se pudo exportar el progreso', 'danger');
    }
  };

  const handleImport = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const imported = importProgress(text);
      showToast(
        imported ? 'Progreso importado' : 'El archivo no es válido',
        imported ? 'success' : 'danger',
      );
    } catch {
      showToast('No se pudo leer el archivo', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenPanel title="Configuración" onClose={closeScreen}>
      <div className="pb-6">
        <SectionTitle>Audio</SectionTitle>
        <Toggle
          label="Silenciar todo"
          checked={settings.muted}
          onChange={(value) => set('muted', value)}
        />
        <Slider
          label="Música"
          value={settings.musicVolume}
          disabled={settings.muted}
          onChange={(value) => set('musicVolume', value)}
        />
        <Slider
          label="Efectos"
          value={settings.sfxVolume}
          disabled={settings.muted}
          onChange={(value) => set('sfxVolume', value)}
        />

        <SectionTitle>Accesibilidad</SectionTitle>
        <Toggle
          label="Reducir movimiento"
          description="Desactiva la cámara lenta, la estela y el desplazamiento del fondo."
          checked={settings.reducedMotion}
          onChange={(value) => set('reducedMotion', value)}
        />
        <Toggle
          label="Reducir destellos"
          description="Elimina los flashes a pantalla completa."
          checked={settings.reducedFlashes}
          onChange={(value) => set('reducedFlashes', value)}
        />
        <Toggle
          label="Vibración del dispositivo"
          checked={settings.hapticsEnabled}
          onChange={(value) => set('hapticsEnabled', value)}
        />
        <Toggle
          label="Vibración de cámara"
          description="El temblor de pantalla al capturar e impactar."
          checked={settings.screenShakeEnabled}
          onChange={(value) => set('screenShakeEnabled', value)}
        />
        <Toggle
          label="Alto contraste"
          description="Paleta reforzada y distinguible con daltonismo."
          checked={settings.highContrast}
          onChange={(value) => set('highContrast', value)}
        />
        <Toggle
          label="Mostrar atajos de teclado"
          checked={settings.showKeyboardHints}
          onChange={(value) => set('showKeyboardHints', value)}
        />

        <SectionTitle>Rendimiento</SectionTitle>
        <SegmentedControl
          label="Calidad de partículas"
          value={settings.particleQuality}
          options={QUALITY_OPTIONS}
          onChange={(value) => set('particleQuality', value)}
        />
        <Toggle
          label="Modo ahorro de energía"
          description="Limita el juego a 30 FPS para alargar la batería."
          checked={settings.powerSaver}
          onChange={(value) => set('powerSaver', value)}
        />
        <Toggle
          label="Movimiento del fondo"
          checked={settings.backgroundMotion}
          onChange={(value) => set('backgroundMotion', value)}
        />

        <SectionTitle>Datos</SectionTitle>
        <div className="flex flex-col gap-2 py-3">
          <Button size="sm" onClick={handleExport} fullWidth>
            Exportar progreso (JSON)
          </Button>
          <Button size="sm" fullWidth disabled={busy} onClick={() => fileInputRef.current?.click()}>
            Importar progreso
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
              event.target.value = '';
            }}
          />
          <Button size="sm" variant="danger" fullWidth onClick={() => openScreen('reset-confirm')}>
            Restablecer progreso
          </Button>
        </div>

        <SectionTitle>Información</SectionTitle>
        <div className="flex flex-col gap-2 py-3">
          <Button size="sm" variant="ghost" fullWidth onClick={() => openScreen('privacy')}>
            Privacidad
          </Button>
          <Button size="sm" variant="ghost" fullWidth onClick={() => openScreen('credits')}>
            Créditos
          </Button>
        </div>
      </div>
    </ScreenPanel>
  );
}
