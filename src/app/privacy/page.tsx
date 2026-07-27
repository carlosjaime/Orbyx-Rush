import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    'Orbyx Rush guarda el progreso únicamente en tu dispositivo. No recoge datos personales ni utiliza cookies de seguimiento.',
};

/**
 * Standalone privacy page.
 *
 * Store submissions require a publicly reachable URL, so the policy lives at a
 * real route in addition to the in-game screen.
 */
export default function PrivacyPage() {
  return (
    <div className="bg-void safe-block min-h-[100dvh]">
      <article className="text-ink mx-auto max-w-2xl">
        <Link href="/" className="text-primary text-sm font-bold">
          ← Volver al juego
        </Link>

        <h1 className="text-primary mt-6 text-3xl font-black tracking-[0.1em] uppercase">
          Política de privacidad
        </h1>
        <p className="text-ink-faint mt-2 text-xs">
          Orbyx Rush · RCMX · Última actualización: 2026
        </p>

        <Section title="1. Resumen">
          Orbyx Rush es un videojuego que funciona completamente en tu dispositivo. No requiere
          registro, no tiene cuentas de usuario y no envía tu información a ningún servidor.
        </Section>

        <Section title="2. Información que se almacena localmente">
          La aplicación guarda en el almacenamiento local de tu navegador o dispositivo: tu mejor
          puntuación, estadísticas de partidas, progreso de logros, apariencias desbloqueadas y
          equipadas, fragmentos acumulados, el historial de retos diarios y tus preferencias de
          audio, accesibilidad y rendimiento. Esta información nunca sale del dispositivo.
        </Section>

        <Section title="3. Información que NO se recoge">
          No recogemos nombre, correo electrónico, número de teléfono, ubicación, contactos,
          fotografías, archivos, identificadores publicitarios ni ningún otro dato personal. La
          aplicación no utiliza cookies de seguimiento ni herramientas de analítica de terceros.
        </Section>

        <Section title="4. Permisos del sistema">
          La aplicación no solicita permisos de ubicación, cámara, micrófono, contactos,
          almacenamiento externo ni Bluetooth. En las versiones móviles se utiliza únicamente la
          vibración del dispositivo para el retorno háptico, que puedes desactivar en cualquier
          momento desde Configuración.
        </Section>

        <Section title="5. Publicidad y compras">
          Esta versión no incluye publicidad, compras integradas, suscripciones, cajas de recompensa
          ni mecánicas de azar. Todo el contenido cosmético se obtiene jugando.
        </Section>

        <Section title="6. Menores de edad">
          El juego no está dirigido específicamente a menores de 13 años y, al no recoger ningún
          dato personal, no procesa información de menores.
        </Section>

        <Section title="7. Control de tus datos">
          Puedes exportar tu progreso a un archivo JSON, importarlo en otro dispositivo o borrarlo
          por completo desde Configuración → Datos. Desinstalar la aplicación o borrar los datos del
          sitio elimina toda la información almacenada.
        </Section>

        <Section title="8. Cambios en esta política">
          Si en el futuro se añaden funciones que requieran tratar datos (por ejemplo, una
          clasificación en línea), esta política se actualizará antes de activarlas y se informará
          dentro de la aplicación.
        </Section>

        <Section title="9. Contacto">
          Para cualquier consulta sobre privacidad puedes escribir a privacidad@devhive.software.
        </Section>

        <p className="text-ink-faint mt-10 text-xs">© 2026 RCMX. Todos los derechos reservados.</p>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-ink text-lg font-bold">{title}</h2>
      <p className="text-ink-muted mt-2 text-sm leading-relaxed">{children}</p>
    </section>
  );
}
