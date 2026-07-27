# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado según [SemVer](https://semver.org/lang/es/).

---

## [1.0.0] — 2026

Primera versión pública de **Orbyx Rush**.

### Añadido

**Jugabilidad**

- Modo Endless Arcade con generación procedural y dificultad progresiva.
- Mecánica orbital: giro automático, lanzamiento por tangente y captura por
  radio de atracción.
- Ventana de captura perfecta con recompensa en puntos, combo, cámara lenta y
  efecto de anillo.
- Sistema de combo con multiplicador hasta 8× y penalización parcial (no total)
  ante una captura descuidada con el combo alto.
- Bonificación por _near miss_ al pasar cerca de un peligro sin chocar.
- Núcleos móviles, pulsantes, de giro invertido y señuelo.
- Barreras giratorias y láseres con fase de aviso antes de ser letales.
- Zonas de cámara lenta, aceleración y gravedad lateral, y portales de
  teletransporte.
- Fragmentos de energía con imán suave y escudos que absorben un impacto.
- Reanimación limitada: una por partida, desbloqueada por nivel y pagada con
  fragmentos ganados jugando.
- Curva de dificultad de 11 niveles que combina núcleos alcanzados y tiempo
  sobrevivido con suavizado logarítmico.

**Generación procedural**

- RNG determinista mulberry32 con hash FNV-1a, reproducible entre plataformas.
- Validación matemática de alcanzabilidad: ningún segmento se emite sin una
  solución de lanzamiento demostrada, libre de obstáculos y dentro del campo.
- Los núcleos móviles se validan en todos los extremos de su recorrido.
- Los peligros solo se aceptan si el segmento sigue siendo resoluble.
- Colocación de fragmentos con distancia mínima garantizada a los peligros.

**Progresión y meta**

- Récord personal, XP y 60 niveles de perfil.
- 20 logros declarativos en cuatro categorías, con progreso monótono.
- 13 cosméticos (6 esferas, 4 estelas, 3 temas), todos desbloqueables jugando.
- Reto diario con seed derivada de la fecha UTC, intentos ilimitados, mejor
  puntuación del día e historial de 60 días.
- Clasificación local de demostración, señalizada explícitamente como ficticia.

**Presentación**

- Atlas de texturas generado en tiempo de ejecución: cero assets de terceros.
- Fondo de parallax con cuatro capas, nebulosa y viñeta en degradado, todas con
  teselado sin costuras.
- Sistema de partículas y de texto flotante con pools de tamaño fijo.
- Temblor de cámara, destellos, cámara lenta e intensidad de fondo reactiva al
  combo.
- Audio íntegramente procedural con Web Audio API: 12 efectos y música dinámica
  a 124 BPM con capas que responden al combo.
- Retorno háptico vía Capacitor Haptics con reserva a la Vibration API.

**Interfaz**

- 16 pantallas: splash, precarga, menú, tutorial, juego, pausa, game over,
  resumen, apariencias, retos, logros, estadísticas, configuración, créditos,
  privacidad y confirmación de borrado.
- HUD que nunca cubre la trayectoria ni los núcleos.
- Tarjeta de resultado compartible mediante Web Share API, con reserva al
  portapapeles.
- Aviso de rotación no bloqueante en horizontal.

**Plataforma**

- PWA instalable con service worker escrito a mano, página offline y aviso de
  actualización que nunca recarga en mitad de una partida.
- Proyectos Android e iOS con Capacitor 8, ambos en orientación vertical.
- Android: icono adaptativo, splash en cinco densidades, edge-to-edge, botón
  Atrás con precedencia correcta y solo los permisos `INTERNET` y `VIBRATE`.
- iOS: manifiesto de privacidad, launch screen, áreas seguras y gestión de
  interrupciones de audio.
- Pausa automática y volcado del guardado al pasar a segundo plano.

**Accesibilidad**

- Reducción de movimiento y de destellos, respetando `prefers-reduced-motion`.
- Modo de alto contraste con paleta apta para daltonismo.
- Control independiente de vibración y de temblor de cámara.
- Calidad de partículas en tres niveles y modo de ahorro a 30 FPS.
- Áreas táctiles de 44 px como mínimo y navegación por teclado con foco visible.
- Ningún estado depende únicamente del color.
- Destellos limitados a ~3 Hz y opacidad ≤ 0,35.

**Persistencia**

- Esquema versionado con migraciones encadenadas desde la versión 1.
- Validación campo a campo que degrada a valores por defecto ante corrupción.
- Copia de seguridad automática y recuperación desde ella.
- Exportación e importación del progreso en JSON.
- Restablecimiento con confirmación explícita.

**Calidad**

- 153 pruebas unitarias sobre puntuación, dificultad, RNG, generación,
  alcanzabilidad, matemática orbital, colisiones, persistencia, migraciones,
  logros, recompensas, progresión y reto diario.
- 40 pruebas end-to-end en móvil vertical y escritorio.
- TypeScript estricto con `noUncheckedIndexedAccess`, ESLint y Prettier.
- Panel de depuración solo en desarrollo, con FPS, hitboxes, radios de captura,
  trayectoria estimada, invencibilidad, control de velocidad y seed fija.

### Notas

- Sin publicidad, compras integradas, cajas de recompensa ni mecánicas de azar.
- Las interfaces de monetización y analítica existen desacopladas pero no están
  implementadas ni tienen interfaz visible.
- El progreso se guarda únicamente en el dispositivo.
