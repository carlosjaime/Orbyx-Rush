'use client';

import { Button } from '@/components/common/Button';
import { OrbyxMark } from '@/components/common/Logo';
import { Card, ScreenPanel } from '@/components/common/Panel';
import { useProfileStore } from '@/stores/useProfileStore';
import { useUiStore } from '@/stores/useUiStore';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';

export function CreditsScreen() {
  const closeScreen = useUiStore((state) => state.closeScreen);
  return (
    <ScreenPanel title="Créditos" onClose={closeScreen}>
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <OrbyxMark size={96} />
        <div>
          <p className="text-primary neon-text text-2xl font-black tracking-[0.2em]">ORBYX RUSH</p>
          <p className="text-ink-faint mt-1 text-xs">Versión {APP_VERSION}</p>
        </div>

        <Card className="w-full text-left">
          <p className="text-ink text-sm leading-relaxed">
            Diseño, programación, dirección de arte y audio:{' '}
            <strong className="text-primary">RCMX</strong>.
          </p>
          <p className="text-ink-muted mt-3 text-xs leading-relaxed">
            Todos los gráficos son vectoriales y se generan en tiempo de ejecución. Todos los
            sonidos y la música se sintetizan con la Web Audio API. El juego no incluye ningún
            recurso de terceros sujeto a derechos de autor.
          </p>
        </Card>

        <Card className="w-full text-left">
          <p className="text-ink-faint text-[10px] font-black tracking-[0.2em] uppercase">
            Tecnología
          </p>
          <p className="text-ink-muted mt-2 text-xs leading-relaxed">
            Next.js · React · TypeScript · Phaser · Tailwind CSS · Zustand · Capacitor. Cada uno
            bajo su propia licencia de código abierto.
          </p>
        </Card>

        <p className="text-ink-faint text-xs leading-relaxed">
          Desarrollado por RCMX.
          <br />© 2026 RCMX. Todos los derechos reservados.
        </p>
      </div>
    </ScreenPanel>
  );
}

export function PrivacyScreen() {
  const closeScreen = useUiStore((state) => state.closeScreen);
  return (
    <ScreenPanel title="Privacidad" onClose={closeScreen}>
      <div className="flex flex-col gap-4 pb-6">
        <Card>
          <h3 className="text-primary text-sm font-black tracking-wider uppercase">Resumen</h3>
          <p className="text-ink-muted mt-2 text-sm leading-relaxed">
            Orbyx Rush guarda tu progreso{' '}
            <strong className="text-ink">solo en tu dispositivo</strong>. No hay cuentas, no hay
            servidores de juego y no se envía ninguna información a terceros.
          </p>
        </Card>

        <Card>
          <h3 className="text-primary text-sm font-black tracking-wider uppercase">
            Qué se guarda
          </h3>
          <ul className="text-ink-muted mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
            <li>Récord, estadísticas de partidas y progreso de logros.</li>
            <li>Apariencias desbloqueadas y equipadas.</li>
            <li>Tus ajustes de audio, accesibilidad y rendimiento.</li>
            <li>El histórico local de los retos diarios.</li>
          </ul>
          <p className="text-ink-faint mt-3 text-xs leading-relaxed">
            Se almacena con la API `localStorage` del navegador. Puedes exportarlo, importarlo o
            borrarlo por completo desde Configuración.
          </p>
        </Card>

        <Card>
          <h3 className="text-primary text-sm font-black tracking-wider uppercase">
            Qué NO se recoge
          </h3>
          <ul className="text-ink-muted mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
            <li>Datos personales, correo electrónico o identificadores de publicidad.</li>
            <li>Ubicación, contactos, cámara, micrófono, archivos o Bluetooth.</li>
            <li>Cookies de seguimiento o analítica de terceros.</li>
          </ul>
          <p className="text-ink-faint mt-3 text-xs leading-relaxed">
            La aplicación no solicita ningún permiso del sistema más allá de la vibración, que
            puedes desactivar en Configuración.
          </p>
        </Card>

        <Card>
          <h3 className="text-primary text-sm font-black tracking-wider uppercase">
            Menores y compras
          </h3>
          <p className="text-ink-muted mt-2 text-sm leading-relaxed">
            Esta versión no contiene publicidad, compras integradas, cajas de recompensa ni
            mecánicas de azar. Todo el contenido es accesible jugando.
          </p>
        </Card>

        <p className="text-ink-faint text-xs">
          Contacto: privacidad@devhive.software · Última actualización: 2026.
        </p>
      </div>
    </ScreenPanel>
  );
}

export function ResetConfirmScreen() {
  const closeScreen = useUiStore((state) => state.closeScreen);
  const closeAllScreens = useUiStore((state) => state.closeAllScreens);
  const showToast = useUiStore((state) => state.showToast);
  const resetProgress = useProfileStore((state) => state.resetProgress);

  return (
    <ScreenPanel title="Restablecer progreso" onClose={closeScreen}>
      <div className="flex flex-col gap-4 py-6">
        <Card className="border-danger/60">
          <p className="text-danger text-sm font-bold">Esta acción no se puede deshacer.</p>
          <p className="text-ink-muted mt-2 text-sm leading-relaxed">
            Se borrarán tu récord, tus estadísticas, tus logros, tus apariencias desbloqueadas, tus
            fragmentos y el historial de retos diarios. Tus ajustes volverán a los valores por
            defecto.
          </p>
          <p className="text-ink-muted mt-2 text-sm leading-relaxed">
            Si quieres conservar una copia, exporta el progreso antes de continuar.
          </p>
        </Card>

        <Button
          variant="danger"
          size="lg"
          fullWidth
          onClick={() => {
            resetProgress();
            closeAllScreens();
            showToast('Progreso restablecido', 'info');
          }}
        >
          Sí, borrar todo
        </Button>
        <Button variant="secondary" size="lg" fullWidth onClick={closeScreen}>
          Cancelar
        </Button>
      </div>
    </ScreenPanel>
  );
}
