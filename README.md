# Orbyx Rush

**Arcade orbital 2D de precisión, ritmo y reflejos.** Gratis, sin anuncios, sin
compras y jugable con una sola mano.

> Desarrollado por DevHive Software.
> © 2026 DevHive Software. Todos los derechos reservados.

---

## 1. Descripción del juego

Controlas **Orbyx**, una esfera de energía que gira automáticamente alrededor de
núcleos gravitacionales flotantes. Un toque la libera por la tangente de su
órbita; si entra en el campo de atracción del siguiente núcleo, queda capturada y
empieza una nueva órbita. Si falla, choca o cae al vacío, la partida termina.

El bucle es de aprendizaje inmediato y techo alto: entender qué hace el botón
cuesta dos segundos, pero encadenar **capturas perfectas** — entrar justo sobre
el anillo de órbita — mientras esquivas barreras giratorias y láseres es cuestión
de práctica.

Una partida dura entre **45 segundos y 3 minutos**. El reinicio es instantáneo y
nunca recarga la página.

### Lo que hay dentro

| Área          | Contenido                                                                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Modos         | Endless Arcade procedural, Reto diario con seed determinista, Tutorial interactivo                                                                                                                                                                           |
| Mecánicas     | Órbitas de radio variable, captura perfecta, combos, multiplicadores, near miss, núcleos móviles / pulsantes / invertidos / señuelo, portales, zonas de cámara lenta, aceleración y gravedad, láseres, barreras giratorias, fragmentos, escudos, reanimación |
| Progresión    | Récord, XP, 60 niveles de perfil, 20 logros, 13 cosméticos (esferas, estelas, temas)                                                                                                                                                                         |
| Accesibilidad | Reducción de movimiento y destellos, alto contraste, control de vibración, calidad de partículas, pausa automática al perder el foco, navegación por teclado                                                                                                 |
| Plataformas   | Web (PWA instalable), Android y iOS vía Capacitor                                                                                                                                                                                                            |

---

## 2. Stack tecnológico

- **Next.js 16** (App Router, `output: 'export'`)
- **React 19** + **TypeScript 5** en modo estricto
- **Phaser 3.90** como motor del juego
- **Tailwind CSS 4** para la interfaz React
- **Zustand 5** para el estado global
- **Capacitor 8** para Android e iOS
- **Vitest 4** (unitarias) y **Playwright 1.62** (end-to-end)
- **ESLint 9** + **Prettier 3**
- **pnpm** como gestor de paquetes

Sin motores externos, sin assets de terceros y sin recursos con copyright: todos
los gráficos se generan por código a partir de primitivas vectoriales y todo el
audio se sintetiza en tiempo real con la Web Audio API.

---

## 3. Requisitos

- **Node.js 20 o superior** (probado con 22)
- **pnpm 10** (`corepack enable && corepack prepare pnpm@10 --activate`)
- Para Android: **Android Studio** (Ladybug o superior) y **JDK 21**
- Para iOS: **macOS**, **Xcode 15 o superior** y **CocoaPods**

---

## 4. Instalación

```bash
git clone <url-del-repositorio>
cd Orbyx-Rush
pnpm install
```

El `pnpm-lock.yaml` está versionado: usa `pnpm install --frozen-lockfile` en CI
para builds reproducibles.

---

## 5. Ejecución local

```bash
pnpm dev          # http://localhost:3000 con Fast Refresh
pnpm build        # exportación estática a ./out
pnpm start        # sirve ./out localmente
```

En desarrollo se habilita el **panel de depuración**: ábrelo con la tecla
<kbd>`</kbd> o con el botón `DEBUG` de la esquina inferior derecha.

---

## 6. Comandos disponibles

| Comando                                               | Qué hace                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `pnpm dev`                                            | Servidor de desarrollo                                          |
| `pnpm build` / `pnpm build:web`                       | Build de producción + exportación estática a `out/`             |
| `pnpm build:e2e`                                      | Build con panel de depuración y seed fija, usado por Playwright |
| `pnpm start`                                          | Sirve `out/` localmente                                         |
| `pnpm lint` / `pnpm lint:fix`                         | ESLint                                                          |
| `pnpm format` / `pnpm format:check`                   | Prettier                                                        |
| `pnpm typecheck`                                      | `tsc --noEmit`                                                  |
| `pnpm test` / `pnpm test:watch`                       | Pruebas unitarias (Vitest)                                      |
| `pnpm test:coverage`                                  | Cobertura de la lógica de dominio                               |
| `pnpm test:e2e`                                       | Build E2E + Playwright                                          |
| `pnpm verify`                                         | typecheck + lint + tests + build                                |
| `pnpm assets:generate`                                | Regenera iconos y splash desde los SVG fuente                   |
| `pnpm mobile:sync`                                    | `next build && cap sync`                                        |
| `pnpm mobile:android` / `pnpm mobile:ios`             | Abre Android Studio / Xcode                                     |
| `pnpm mobile:build:android` / `pnpm mobile:build:ios` | Build + sync + abrir IDE                                        |

---

## 7. Arquitectura

Separación estricta entre **motor**, **interfaz**, **dominio**, **plataforma** y
**persistencia**. Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md) para el detalle.

```
src/
  app/                 Rutas Next.js (/, /offline, /privacy, 404)
  components/
    game/              GameCanvas (dynamic, ssr:false), GameBridge, GameShell, DebugPanel
    hud/               HUD de partida
    menus/             Menú principal y pantallas secundarias
    modals/            Pausa, game over y overlays
    common/            Botones, paneles, controles, logotipo
  game/
    config/            balance.ts, palette.ts, achievements.ts, cosmetics.ts, debug.ts
    scenes/            Boot, Preload, Menu, Tutorial, Game, Challenge, GameOver, UI
    entities/          Orb, CoreEntity, HazardEntity, PickupEntity, ZoneEntity
    systems/           Orbit, Launch, Capture, Collision, Difficulty, Score, PowerUp,
                       ProceduralLevel, Reward, DailyChallenge, scoring, progression
    physics/           orbitMath.ts (matemática pura de órbitas y trayectorias)
    procedural/        rng.ts, levelGenerator.ts, reachability.ts
    audio/             AudioManager (Web Audio procedural)
    effects/           textures.ts, ParticleSystem, FloatingTextPool, BackgroundLayer, ScreenEffects
    managers/          HapticsManager
    adapters/          Platform, Analytics, Monetization
    events/            GameEvents.ts (bus tipado Phaser <-> React)
  services/persistence/ SaveManager, schema, migrations, storage
  stores/              Zustand: settings, profile, ui
  hooks/               Eventos del juego, ciclo de vida, audio, orientación, PWA
```

**Regla central:** React nunca importa clases de Phaser y Phaser nunca importa
componentes de React. Todo cruza el bus tipado de `game/events/GameEvents.ts`.

---

## 8. Controles

**Móvil**

- Un toque en cualquier punto: soltar la esfera.
- Vibración ligera al capturar, más intensa al impactar.
- Todo el flujo es alcanzable con una sola mano.

**Escritorio**

- Clic izquierdo o <kbd>Espacio</kbd>: soltar.
- <kbd>Enter</kbd>: reintentar desde la pantalla de resultado.
- <kbd>Esc</kbd>: pausar / reanudar, cerrar pantallas.
- <kbd>`</kbd>: panel de depuración (solo en desarrollo).

**Android**

El botón físico Atrás cierra el modal abierto, luego el menú de pausa, luego pide
confirmación antes de salir. Nunca cierra la app durante una partida.

---

## 9. Sistema de escenas

| Escena           | Responsabilidad                                                           |
| ---------------- | ------------------------------------------------------------------------- |
| `BootScene`      | Detección de dispositivo, registro de servicios, FPS objetivo             |
| `PreloadScene`   | Generación del atlas procedural con barra de progreso y manejo de errores |
| `MenuScene`      | Fondo animado del menú (la interfaz es React)                             |
| `TutorialScene`  | Tutorial guiado por acciones, sin obstáculos                              |
| `GameScene`      | Gameplay principal: orquesta todos los sistemas                           |
| `ChallengeScene` | Reto diario (hereda de `GameScene` con seed fija)                         |
| `GameOverScene`  | Fondo ambiental y banner de récord                                        |
| `UIScene`        | Velo de pausa y muerte dentro del canvas                                  |

---

## 10. Persistencia

- `localStorage` a través de un `StorageDriver` intercambiable (memoria como
  fallback si el navegador lo bloquea).
- Esquema **versionado** (`SAVE_SCHEMA_VERSION`) con migraciones encadenadas.
- Toda la carga pasa por `sanitizeSave`: cualquier campo corrupto vuelve a su
  valor por defecto en lugar de romper el arranque.
- Copia de seguridad automática antes de cada escritura, y recuperación desde
  ella si el fichero principal queda ilegible.
- Exportación e importación del progreso en JSON desde Configuración → Datos.
- Restablecimiento total con confirmación explícita.

---

## 11. Pruebas

```bash
pnpm test        # 153 pruebas unitarias
pnpm test:e2e    # 40 pruebas end-to-end (móvil vertical + escritorio)
```

**Unitarias** — fórmula de puntuación, multiplicadores y combos, curva de
dificultad, RNG determinista, generación por seed, validación de alcanzabilidad,
matemática de órbitas, colisiones, persistencia, migraciones, logros,
recompensas, progresión y reto diario.

**End-to-end** — arranque, tutorial, partida, pausa/reanudación, game over,
reintento sin recarga, persistencia del récord tras recargar, cambios de
configuración persistentes, todas las pantallas, reto diario, restablecimiento
de progreso, página offline, 404 y manifest.

**Semilla reproducible:** `pnpm build:e2e` compila con
`NEXT_PUBLIC_FORCED_SEED=E2ESEED01` y `NEXT_PUBLIC_ENABLE_DEBUG=true`, de modo
que cada ejecución recorre exactamente el mismo trazado.

---

## 12. Compilación y despliegue

- Web / Vercel: ver [`DEPLOYMENT.md`](./DEPLOYMENT.md).
- Android e iOS: ver [`MOBILE_BUILD.md`](./MOBILE_BUILD.md).

Resumen del flujo móvil:

```bash
pnpm build            # genera ./out
npx cap sync          # copia ./out a android/ e ios/
pnpm mobile:android   # abre Android Studio
pnpm mobile:ios       # abre Xcode
```

---

## 13. Reemplazo de assets

Los gráficos actuales son **placeholders profesionales generados por código**,
pensados para sustituirse sin tocar la lógica:

1. **Sprites del juego** — `src/game/effects/textures.ts` genera todo el atlas.
   Sustituye el cuerpo de `generateTextures()` por `scene.load.atlas(...)`
   manteniendo las claves de `TEXTURE_KEYS`. Ninguna entidad cambia.
2. **Colores** — están centralizados en `src/game/config/palette.ts` y
   reflejados en los tokens de `src/app/globals.css`.
3. **Audio** — `AudioManager` expone `playSfx`, `startMusic` y `setIntensity`.
   Cambiar síntesis por samples es reescribir esa clase y nada más.
4. **Iconos y splash** — edita los SVG de `public/icons/` y ejecuta
   `pnpm assets:generate`.

---

## 14. Solución de problemas

| Síntoma                                                                  | Causa y solución                                                                                                                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No suena nada                                                            | Los navegadores bloquean el audio hasta la primera interacción. Toca la pantalla una vez. Comprueba también el interruptor "Silenciar todo".                                                                                   |
| Canvas duplicado tras editar código                                      | El `GameController` es un singleton y sobrevive a Fast Refresh. Si ocurre, recarga la página.                                                                                                                                  |
| `next build` falla con "Export default doesn't exist" al importar Phaser | Phaser 3.90 solo tiene _named exports_ en su bundle ESM: usa `import * as Phaser from 'phaser'`.                                                                                                                               |
| El juego va a pocos FPS                                                  | Activa Configuración → Rendimiento → Modo ahorro y baja la calidad de partículas. En navegadores sin aceleración por GPU (headless, máquinas virtuales) el rendimiento cae mucho: es una limitación del entorno, no del juego. |
| Playwright no encuentra el navegador                                     | `npx playwright install chromium`, o define `PLAYWRIGHT_CHROMIUM_PATH` apuntando a un Chromium ya instalado.                                                                                                                   |
| El progreso no se guarda                                                 | Modo incógnito o almacenamiento bloqueado. El juego sigue funcionando en memoria durante la sesión.                                                                                                                            |
| `cap sync` no encuentra `out/`                                           | Ejecuta `pnpm build` antes.                                                                                                                                                                                                    |

---

## 15. Roadmap

**v1.1**

- Clasificación remota real sustituyendo el proveedor de demostración.
- Modo "contrarreloj" de 60 segundos.
- Repetición de la última muerte.

**v1.2**

- Editor de trazados con seeds compartibles.
- Más familias de peligros (agujeros negros, núcleos encadenados).
- Retos semanales.

**v2.0**

- Sincronización opcional de progreso entre dispositivos.
- Sustitución del atlas procedural por arte definitivo.
- Localización a inglés y portugués.

Las interfaces de monetización (`MonetizationAdapter`) y analítica
(`AnalyticsAdapter`) ya existen desacopladas, pero **no** están implementadas ni
tienen interfaz visible en esta versión.

---

## 16. Licencias

- Código de Orbyx Rush: © 2026 DevHive Software. Todos los derechos reservados.
- Dependencias de terceros: cada una bajo su propia licencia de código abierto
  (Next.js, React, Phaser, Tailwind CSS y Capacitor bajo MIT).
- **No se incluye ningún asset gráfico o sonoro de terceros.** Todo el arte se
  genera por código y todo el audio se sintetiza en tiempo de ejecución.

---

## Documentación adicional

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — decisiones técnicas y estructura
- [`GAME_DESIGN.md`](./GAME_DESIGN.md) — documento de diseño de juego
- [`MOBILE_BUILD.md`](./MOBILE_BUILD.md) — Android e iOS paso a paso
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — despliegue web y Vercel
- [`PRIVACY.md`](./PRIVACY.md) — política de privacidad
- [`CHANGELOG.md`](./CHANGELOG.md) — historial de versiones
