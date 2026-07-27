# Arquitectura — Orbyx Rush

Este documento explica **por qué** el proyecto está organizado como está. Para el
inventario de carpetas, ver el README.

---

## 1. Principio rector

> El motor no sabe que existe React. React no sabe que existe Phaser.

Toda la comunicación cruza un **bus de eventos tipado**
(`src/game/events/GameEvents.ts`). Esto compra tres cosas concretas:

1. **Testabilidad.** La lógica de juego (puntuación, dificultad, generación,
   alcanzabilidad, colisiones) es matemática pura sin dependencias de Phaser ni
   del DOM, así que se prueba en milisegundos con Vitest.
2. **Rendimiento.** El bucle de juego corre a 60 FPS; React no puede renderizar a
   esa frecuencia. El HUD se actualiza mediante eventos limitados a uno cada
   80 ms (`BRIDGE.hudThrottleMs`), no por frame.
3. **Sustituibilidad.** Cambiar Phaser por otro renderer, o el HUD React por uno
   nativo del canvas, no toca el dominio.

```
┌──────────────┐   REQUEST_* / SETTINGS_CHANGED   ┌──────────────┐
│  React (UI)  │ ───────────────────────────────► │ Phaser (motor)│
│  Zustand     │ ◄─────────────────────────────── │  Sistemas     │
└──────────────┘   HUD_TICK / PLAYER_DIED / ...   └──────────────┘
                          gameBus (tipado)
```

---

## 2. Capas

| Capa             | Ubicación                                                        | Dependencias permitidas |
| ---------------- | ---------------------------------------------------------------- | ----------------------- |
| **Dominio**      | `game/systems`, `game/physics`, `game/procedural`, `game/config` | Ninguna externa         |
| **Motor**        | `game/scenes`, `game/entities`, `game/effects`                   | Phaser + dominio        |
| **Puente**       | `game/events`, `game/GameController`                             | Nada de UI              |
| **Interfaz**     | `components/`, `stores/`, `hooks/`                               | React + puente          |
| **Plataforma**   | `game/adapters`, `game/managers`                                 | Capacitor (dinámico)    |
| **Persistencia** | `services/persistence`                                           | Ninguna externa         |

La regla se puede verificar de un vistazo: ningún fichero bajo `game/systems`,
`game/physics` o `game/procedural` importa Phaser.

---

## 3. Decisiones técnicas

### 3.1 Phaser fuera del bundle de servidor

`output: 'export'` prerenderiza en Node, donde no existen `window`, `document`
ni `AudioContext`. Tres medidas garantizan que Phaser jamás se evalúe ahí:

1. `GameCanvas` se carga con `next/dynamic` y `ssr: false`.
2. `GameController` importa Phaser **y** el grafo de escenas dinámicamente,
   dentro de `ensure()`. Nada estático alcanza el motor.
3. Los ficheros que solo necesitan los _tipos_ de Phaser usan
   `import type * as Phaser from 'phaser'`, que TypeScript borra al compilar.

> **Nota sobre la importación:** el bundle ESM de Phaser 3.90 no tiene _default
> export_. La forma correcta es `import * as Phaser from 'phaser'`; con
> `import Phaser from 'phaser'` el build falla.

### 3.2 Una sola instancia de `Phaser.Game`

`GameController` es un singleton a nivel de módulo con un candado de creación
(`this.creating`). Es la única forma fiable de sobrevivir al doble montaje de
React StrictMode y al Fast Refresh de Next.js sin acabar con dos canvas, dos
grafos de audio y dos pilas de input.

El efecto de `GameCanvas` deliberadamente **no** destruye el juego al
desmontarse: en desarrollo el segundo montaje reutiliza el renderer que el
primero creó. La liberación real ocurre al descargar la página.

### 3.3 El canvas nunca se remonta

Menús, pausa y game over son _overlays_ React sobre un canvas siempre montado.
Reiniciar una partida es `scene.restart()`, no una recarga ni un remontaje:
por eso el reintento es instantáneo y el contexto de audio nunca se pierde.

### 3.4 Generación procedural con prueba de alcanzabilidad

Un arcade que genera trazados imposibles se siente roto, no difícil. Por eso
`levelGenerator.ts` nunca emite un segmento sin que `reachability.ts` lo haya
validado.

La geometría es exacta y no una heurística. Al soltarse desde el ángulo θ de una
órbita de radio _r_, la esfera viaja por la tangente. La distancia perpendicular
del núcleo objetivo a esa recta es `|D·cos(φ) − r|`, donde _D_ es la distancia
entre núcleos y _φ_ el ángulo entre el radio y la dirección al objetivo. Igualar
a cero da `cos(φ) = r / D`: dos soluciones exactas siempre que `D ≥ r`.

`evaluateReachability` comprueba, para cada solución candidata:

- que el viaje sea hacia delante (no es alcanzable "hacia atrás" con ese giro);
- que la distancia caiga bien dentro del anillo de captura, no rozándolo;
- que el vuelo quepa en `LAUNCH.maxFlightTime`;
- que ni la salida ni la llegada se salgan del campo;
- que la trayectoria no cruce ningún peligro con margen.

Para núcleos móviles se valida en **todos** los extremos de su recorrido, no solo
en el centro. Los peligros se aceptan uno a uno, y solo si el segmento sigue
siendo resoluble después de colocarlos. Si tras 24 intentos no hay colocación
válida, se recurre a un núcleo de emergencia garantizado.

`auditTrack()` recorre un trazado completo y se usa en las pruebas como red de
seguridad sobre seis seeds distintas.

### 3.5 Física propia en lugar de Arcade Physics

El movimiento es determinista y analítico: una órbita circular y una recta. No
hay cuerpos rígidos, ni resolución de contactos, ni integrador que estabilizar.
Añadir Arcade Physics (y desde luego Matter.js) habría sido peso y no
determinismo.

Todo avanza con **delta time acotado** (`MAX_DELTA_SECONDS = 1/20`), de modo que
un cambio de pestaña no teletransporta la esfera. Las colisiones son _swept_:
el desplazamiento de un frame se trata como un segmento y se mide contra el
segmento del peligro, con distancia cero cuando se cruzan. Sin eso, una esfera
rápida atravesaría un láser fino a bajo frame rate.

### 3.6 Asistencia de trayectoria acotada

`LaunchSystem` aplica una corrección lateral mínima hacia el anillo del objetivo,
limitada por tres condiciones: solo actúa cerca del objetivo, solo cuando la
trayectoria ya es casi correcta (`0.15 < error < 1.6` radios), y se renormaliza
para cambiar el rumbo sin alterar la velocidad. Rescata el jitter de un frame
sin apuntar por el jugador.

### 3.7 Audio 100 % procedural

`AudioManager` sintetiza cada efecto con osciladores y ruido filtrado, y programa
la música sobre una rejilla de 124 BPM con un _look-ahead_ de 25 ms. No hay ni un
fichero de audio en el repositorio: cero exposición a derechos de autor y cero
bytes de descarga. La interfaz pública es minúscula (`playSfx`, `startMusic`,
`setIntensity`, volúmenes), así que migrar a samples es reescribir una clase.

El contexto se desbloquea en el primer gesto del usuario, se suspende al pasar a
segundo plano y se reanuda al volver, cubriendo las interrupciones de iOS y
Android.

### 3.8 Sin asignaciones en el bucle

`ParticleSystem` y `FloatingTextPool` son _pools_ de tamaño fijo creados al
arrancar la escena. Si el pool se agota, la ráfaga simplemente es más pequeña —
el comportamiento correcto bajo carga. Los objetos de texto de Phaser son lo más
caro de crear, y por eso nunca se crean durante una partida.

El trazado se transmite por _streaming_: `ProceduralLevelSystem` genera por
delante de la cámara y destruye lo que queda muy por detrás, así que el coste por
frame es constante por larga que sea la partida.

### 3.9 Persistencia defensiva

Un guardado corrupto **nunca** puede impedir que el juego arranque. La cadena es:

```
localStorage → JSON.parse → migrateSave → sanitizeSave → SaveData válido
     ↓ falla          ↓ falla        ↓ falla
   backup  →  ... misma cadena ...  →  valores por defecto
```

`sanitizeSave` valida campo a campo: cada valor fuera de rango, de tipo
equivocado o ausente vuelve a su valor por defecto sin descartar los demás. Las
escrituras están agrupadas (debounce 220 ms) y siempre dejan la copia anterior
como respaldo.

### 3.10 Accesibilidad centralizada

`ScreenEffects` es el único punto por el que pasan temblor de cámara, destellos y
cámara lenta, y consulta los ajustes ahí dentro. Ningún punto de llamada puede
olvidarse de respetar "reducir movimiento". Los destellos están además limitados
por frecuencia (máx. ~3 Hz) y por opacidad (≤ 0.35) para no suponer un riesgo
fotosensible.

Ningún estado del juego se comunica **solo** por color: el sentido de giro lleva
un arco con punta, los tipos de zona llevan glifos propios y los interruptores de
la interfaz muestran "Sí"/"No" junto a su posición.

### 3.11 Áreas seguras

`safe-area` aplica **únicamente** los `env(safe-area-inset-*)` y se pone una sola
vez, en el `<main>` de `GameShell`. Los overlays con `position: absolute;
inset: 0` se posicionan contra la _caja de padding_, así que heredan el margen
seguro automáticamente. El canvas usa `position: fixed`, que se resuelve contra
el viewport, y por eso sigue ocupando la pantalla completa por debajo del notch.

> **Trampa conocida:** `safe-area` y las clases `p-*`/`px-*`/`py-*` de Tailwind
> escriben las mismas propiedades. Combinarlas en el mismo elemento hace que una
> pise a la otra en silencio. Para páginas independientes existe `safe-block`,
> que suma inset y padding en un `calc()`.

---

## 4. Contrato de eventos

Definido en `GameEventMap`. Los principales:

**Motor → interfaz**

| Evento                                  | Cuándo                                             |
| --------------------------------------- | -------------------------------------------------- |
| `GAME_READY`                            | El atlas está generado y el motor listo            |
| `PRELOAD_PROGRESS`                      | Avance de la precarga                              |
| `RUN_STARTED`                           | Empieza una partida (modo + seed)                  |
| `HUD_TICK`                              | Estado del HUD, limitado a 12,5 Hz                 |
| `SCORE_CHANGED` / `COMBO_CHANGED`       | Eventos discretos para efectos                     |
| `PLAYER_DIED`                           | Muerte, **con las estadísticas finales incluidas** |
| `TUTORIAL_STEP` / `TUTORIAL_COMPLETED`  | Avance del tutorial                                |
| `REWARD_GRANTED` / `HIGH_SCORE_CHANGED` | Desbloqueos y récords                              |

**Interfaz → motor**

`REQUEST_START_RUN`, `REQUEST_PAUSE`, `REQUEST_RESUME`, `REQUEST_RESTART`,
`REQUEST_REVIVE`, `REQUEST_QUIT_TO_MENU`, `SETTINGS_CHANGED`, `DEBUG_COMMAND`.

`PLAYER_DIED` lleva las estadísticas dentro a propósito: si React tuviera que
deducirlas del último `HUD_TICK`, un tick perdido falsearía el resultado.

---

## 5. Estado

| Store              | Contenido                                       | Persistido |
| ------------------ | ----------------------------------------------- | ---------- |
| `useSettingsStore` | Audio, accesibilidad, rendimiento               | Sí         |
| `useProfileStore`  | Récord, XP, logros, cosméticos, retos diarios   | Sí         |
| `useUiStore`       | Fase, pila de pantallas, espejo del HUD, avisos | No         |

La pila de pantallas (`screenStack`) es lo que permite que el botón Atrás de
Android desapile una pantalla cada vez en lugar de saltar al menú.

---

## 6. Rendimiento

- Resolución lógica fija de 1080×1920 con escalado `FIT`: mismas proporciones en
  cualquier pantalla, sin estirar.
- `devicePixelRatio` limitado (2, o 1,25 en gama baja).
- Modo ahorro a 30 FPS.
- Calidad de partículas en tres niveles, con estimación automática de gama.
- Pools fijos, cero asignaciones en el bucle.
- Streaming del trazado con culling.
- El bucle se detiene por completo cuando la app pasa a segundo plano.
- Fondo de parallax: cuatro quads en total, independientemente de la distancia.

---

## 7. Qué está preparado pero no implementado

Interfaces desacopladas, sin implementación ni interfaz visible:

- `MonetizationAdapter` — la implementación activa
  (`DisabledMonetizationAdapter`) responde "no disponible" a todo.
- `AnalyticsAdapter` — activo `NoopAnalyticsAdapter`: no recoge ni envía nada.
- `LeaderboardProvider` — activo `LocalDemoLeaderboardProvider`, cuyas entradas
  están marcadas explícitamente como demostración en la interfaz.
