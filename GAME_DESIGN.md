# Game Design Document — Orbyx Rush

Versión 1.0.0 · RCMX · 2026

---

## 1. Fantasía del jugador

Eres una chispa de energía atrapada en un campo de núcleos gravitacionales.
No puedes acelerar, no puedes girar, no puedes frenar: **lo único que decides es
el instante exacto en que te sueltas**. Toda la expresividad del juego cabe en la
diferencia entre soltarse un frame antes o un frame después.

La sensación buscada es la de un tirador de precisión disfrazado de juego casual:
un solo botón, cero fricción, y un techo de habilidad que se nota desde la
tercera partida.

---

## 2. Core loop

```
ORBITAR  ──►  LEER el siguiente núcleo  ──►  SOLTAR en el instante justo
    ▲                                                   │
    └────────  CAPTURA (perfecta o normal)  ◄───────────┘
                          │
                     FALLO ──► fin de partida ──► reintento inmediato
```

Duración objetivo: **45 s – 3 min**. El reintento es un solo toque y no recarga
nada, para que el coste de volver a intentarlo sea prácticamente cero.

---

## 3. Meta loop

```
Partida ──► Puntuación ──► XP + fragmentos ──► Nivel de perfil
                 │                                    │
                 └──► Logros ──► Cosméticos ◄─────────┘
                 │
                 └──► Récord personal / Reto diario
```

Nada de la meta-progresión afecta a la dificultad ni concede ventaja. La única
excepción es la **reanimación**, y está deliberadamente acotada: se desbloquea
por nivel, se paga con fragmentos ganados jugando, y solo puede usarse una vez
por partida. No se compra, no se obtiene viendo nada y no aparece en el trazado.

---

## 4. Mecánicas

### 4.1 Órbita

La esfera gira a velocidad angular constante alrededor del núcleo actual. Radio y
velocidad los fija el núcleo, de modo que cada uno impone una ventana de
lanzamiento distinta. El sentido de giro se señala con un arco con punta que
rota: la información **nunca** depende solo del color.

Si el jugador no suelta en 6 segundos, se dispara un lanzamiento automático de
seguridad. Es intencionadamente malo: acampar en una órbita no es una estrategia.

### 4.2 Lanzamiento y captura

Al soltar, la esfera sale por la tangente en línea recta y a velocidad constante.
Es el comportamiento más predecible posible, que es exactamente lo que un juego
de precisión necesita.

- **Captura normal:** entrar en el radio de captura (1,42 × el radio de órbita).
- **Captura perfecta:** entrar a ±21 px del anillo de órbita.

Una captura perfecta da +75 puntos planos, +2 de combo (en vez de +1), una
micro-cámara-lenta de 0,12 s y un anillo de partículas. Es el gesto que el juego
premia y el que define el techo de habilidad.

### 4.3 Combo y multiplicador

- Perfecta: +2. Normal: +1.
- Multiplicador = `1 + floor(combo / 4) × 0,5`, con tope en 8×.
- Una captura descuidada con el combo ya alto (≥ 12) **recorta** el 35 % de la
  cadena en lugar de borrarla.

Ese recorte parcial es una decisión de diseño: el jugador siente el error, pero
no pierde de golpe el trabajo de un minuto, que es lo que hace abandonar una
partida.

### 4.4 Riesgo

Pasar cerca de un peligro sin chocar es un **near miss**: +40 puntos y un
destello del obstáculo. Solo cuenta una vez por peligro y vuelo, para que no se
pueda farmear rozando el mismo obstáculo dos veces.

### 4.5 Peligros y variantes

| Elemento          | Se desbloquea en tier | Efecto                                                 |
| ----------------- | --------------------- | ------------------------------------------------------ |
| Barrera giratoria | 1                     | Letal al contacto; gira más rápido con la dificultad   |
| Núcleo móvil      | 2                     | Oscila horizontalmente                                 |
| Núcleo pulsante   | 3                     | Su radio de órbita respira                             |
| Zonas             | 3                     | Cámara lenta, aceleración o gravedad lateral           |
| Láser             | 4                     | Ciclo aviso (0,85 s) → letal (1,1 s) → apagado (1,5 s) |
| Núcleo señuelo    | 5                     | Se desintegra al soltarte de él                        |
| Portal            | 6                     | Teletransporta hacia delante, nunca a un callejón      |

El láser **siempre** se telegrafía antes de ser letal: una muerte tiene que ser
comprensible.

### 4.6 Recogibles

- **Fragmento de energía** — moneda cosmética; +25 puntos × multiplicador. Se
  otorga uno extra cada 5 capturas perfectas.
- **Escudo** — absorbe un impacto letal y da 0,6 s de invulnerabilidad. Aparece
  con una probabilidad del 11 % en lugar de un fragmento.

Ambos tienen un imán suave de 96 px: un roce casi perfecto cuenta.

---

## 5. Controles

Un solo verbo: **soltar**.

| Plataforma | Entrada                                 |
| ---------- | --------------------------------------- |
| Móvil      | Toque en cualquier punto de la pantalla |
| Escritorio | Clic izquierdo o <kbd>Espacio</kbd>     |
| Pausa      | Botón del HUD o <kbd>Esc</kbd>          |
| Reintentar | Botón principal o <kbd>Enter</kbd>      |

Sin joystick virtual, sin gestos, sin botones que tapen el campo de juego. El
HUD vive en la banda superior y en la esquina, nunca sobre la trayectoria.

---

## 6. Dificultad

El tier (0–10) mezcla núcleos alcanzados (65 %) y segundos sobrevividos (35 %),
suavizado logarítmicamente: rampa rápida en los primeros 30 segundos para
enganchar, y una cola larga y plana después, donde la exigencia es de ejecución y
no de reflejos.

Lo que cambia con el tier **no es solo la velocidad**:

| Parámetro                    | Tier 0 | Tier 10 |
| ---------------------------- | ------ | ------- |
| Separación vertical          | 300    | 470     |
| Desplazamiento lateral       | ±150   | ±430    |
| Radio de órbita              | 150    | 84      |
| Velocidad angular            | ×1,00  | ×1,75   |
| Velocidad de lanzamiento     | ×1,00  | ×1,50   |
| Probabilidad de obstáculo    | 0 %    | 72 %    |
| Probabilidad de núcleo móvil | 0 %    | 55 %    |

Radios más pequeños con velocidad angular mayor estrechan la ventana de
lanzamiento: es ahí donde vive la dificultad real, no en la velocidad de la
esfera.

**Contrato de generación:** ningún trazado imposible. Ver `ARCHITECTURE.md` §3.4.

---

## 7. Progresión

- **XP** = puntuación / 40 + perfectas × 3 + núcleos × 1 (+60 en reto diario).
- **Nivel** = `120 × (N−1)^1,42` de XP acumulada, hasta el nivel 60.
- El tutorial es práctica pura: no da XP, no cuenta partidas y no toca el récord.

---

## 8. Economía cosmética

Trece objetos en tres familias: 6 esferas, 4 estelas, 3 temas de fondo. Cada uno
se desbloquea con una condición pública y verificable (nivel, puntuación, combo,
capturas perfectas, retos completados o un logro concreto).

**No hay** compras, cajas de recompensa, tiradas aleatorias, pases ni moneda
premium. Los fragmentos solo se usan en la reanimación.

---

## 9. Retos diarios

Seed = `ORBYX-DAILY-YYYY-MM-DD` en UTC. Todos los jugadores del mundo reciben el
mismo orden de núcleos, peligros y recogibles, sin servidor de por medio.

Intentos ilimitados; se guarda la mejor puntuación del día y se muestra la cuenta
atrás hasta el siguiente. Se conserva el historial de 60 días.

La clasificación es **local y de demostración**: las entradas sintéticas están
marcadas como tales y la interfaz dice explícitamente que no son jugadores
reales. La interfaz `LeaderboardProvider` ya tiene la forma que necesitaría un
backend real.

---

## 10. Logros

Veinte logros declarativos en cuatro categorías — habilidad, resistencia,
colección y constancia — desde "Primera Órbita" hasta "Élite Orbital" (50 000
puntos) y "Constancia" (7 retos diarios). El progreso es monótono: una partida
floja nunca reduce un máximo ya conseguido.

Cada logro se define con una función pura `progress(context)`. Añadir uno es
añadir una entrada a `achievements.ts` y nada más.

---

## 11. Dirección visual

Arcade espacial neon sobre negro azulado profundo. Cian eléctrico como color
principal, violeta neon como secundario, magenta y naranja como acentos.

Profundidad sin 3D: cuatro capas de parallax, mezcla aditiva para los brillos,
estela con degradado, partículas, viñeta en degradado y un fondo que gana
intensidad con el combo. Todo el arte es vectorial y generado en tiempo de
ejecución.

Al subir el combo, el fondo se aviva y la música gana capas: la dificultad se
_siente_ antes de leerse en el HUD.

---

## 12. Dirección de audio

Electrónica ambiental sintetizada al vuelo sobre una rejilla de 124 BPM. La
intensidad (0–1) se mapea al tier de combo y controla la densidad del arpegio, el
brillo del filtro y la aparición de la capa aguda.

Cada acción tiene su firma sonora: lanzamiento, captura, captura perfecta (acorde
ascendente), fragmento, combo, récord, escudo, impacto y game over. Los sonidos
de interfaz son deliberadamente discretos.

---

## 13. Accesibilidad

- Reducción de movimiento (desactiva cámara lenta, estela y desplazamiento del
  fondo) y reducción de destellos, ambos respetando `prefers-reduced-motion`.
- Alto contraste con paleta distinguible bajo deuteranopia.
- Vibración y temblor de cámara desactivables por separado.
- Calidad de partículas en tres niveles y modo ahorro a 30 FPS.
- Áreas táctiles nunca inferiores a 44 px.
- Navegación por teclado con foco visible.
- Pausa automática al perder el foco de la ventana.
- Ningún estado depende únicamente del color.
- Sin destellos rápidos: máximo ~3 Hz y opacidad ≤ 0,35.

---

## 14. Métricas futuras

`AnalyticsAdapter` define los eventos (`run_started`, `run_finished`,
`high_score_reached`, `tutorial_completed`, `skin_unlocked`…) sin implementación
activa. Si algún día se conectan, las preguntas que importan serían:

- ¿En qué tier muere la mayoría? ¿Coincide con el salto de una mecánica nueva?
- ¿Qué porcentaje termina el tutorial y cuántos lo saltan?
- Reintentos por sesión: el indicador directo de "una partida más".
- Ratio de capturas perfectas por tier: ¿la ventana se estrecha demasiado rápido?
- Retención del reto diario día 1 / 7 / 30.

Cualquier recogida futura requeriría consentimiento explícito y una actualización
de la política de privacidad.

---

## 15. Riesgos de diseño

| Riesgo                          | Mitigación aplicada                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Muertes que se sienten injustas | Prueba de alcanzabilidad, láseres telegrafiados, asistencia acotada, colisión _swept_ |
| Frustración por perder el combo | Recorte parcial en vez de reinicio total                                              |
| Un solo botón se agota rápido   | Siete familias de variantes escalonadas por tier                                      |
| Curva demasiado dura            | Rampa logarítmica y radios más generosos al inicio                                    |
| La asistencia mata la habilidad | Solo cerca del objetivo, solo si ya casi acierta, sin cambiar la velocidad            |
| Acampar en una órbita           | Doble fuente de dificultad + lanzamiento automático a los 6 s                         |
| Fotosensibilidad                | Destellos limitados en frecuencia y opacidad                                          |
| Fatiga de la meta-progresión    | Cosméticos con condiciones claras, sin azar                                           |

---

## 16. Ideas para actualizaciones

- **Contrarreloj**: 60 segundos, máxima puntuación posible.
- **Modo espejo**: todos los núcleos giran al revés.
- **Núcleos encadenados**: dos núcleos que orbitan un baricentro común.
- **Agujeros negros**: curvan la trayectoria en vuelo libre.
- **Repetición**: guardar seed + tiempos de lanzamiento reproduce la partida.
- **Seeds compartibles**: un código de 8 caracteres reproduce el trazado exacto
  (el motor ya lo soporta; falta la interfaz).
- **Retos semanales** con reglas modificadas.
- **Ghost personal**: la trayectoria de tu mejor partida como referencia.
