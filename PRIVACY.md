# Política de privacidad — Orbyx Rush

**Responsable:** DevHive Software
**Aplicación:** Orbyx Rush (web, Android e iOS)
**Versión:** 1.0.0 · Última actualización: 2026

> Esta política está disponible dentro del juego (Configuración → Privacidad) y
> en la ruta pública `/privacy/`, que es la URL que hay que declarar en Google
> Play Console y App Store Connect.

---

## 1. Resumen

Orbyx Rush funciona **completamente en tu dispositivo**. No requiere registro, no
tiene cuentas de usuario, no se comunica con ningún servidor de juego y no envía
información a terceros.

---

## 2. Información almacenada localmente

La aplicación guarda en el almacenamiento local del navegador o del dispositivo:

- Tu mejor puntuación y la mejor puntuación de cada reto diario.
- Estadísticas de juego: partidas, tiempo total, distancia acumulada, capturas
  perfectas, combo máximo y pasadas cercanas.
- Progreso de logros y apariencias desbloqueadas y equipadas.
- Fragmentos de energía acumulados.
- El historial de los últimos 60 retos diarios.
- Tus preferencias de audio, accesibilidad y rendimiento.
- Si has completado el tutorial.

Esta información **nunca sale del dispositivo**. Se almacena mediante la API
`localStorage` del navegador (o del WebView, en las versiones móviles).

---

## 3. Información que NO se recoge

No recogemos, procesamos ni transmitimos:

- Nombre, correo electrónico, teléfono ni ningún dato identificativo.
- Ubicación, contactos, fotografías, archivos, cámara o micrófono.
- Identificadores publicitarios (IDFA, AAID) ni huellas de dispositivo.
- Dirección IP con fines de perfilado.
- Datos de uso, telemetría o informes de fallos.

No utilizamos cookies de seguimiento, píxeles ni herramientas de analítica de
terceros. La aplicación incluye una interfaz de analítica desacoplada
(`AnalyticsAdapter`), pero la implementación activa es **`NoopAnalyticsAdapter`**:
no recoge nada y no envía nada.

---

## 4. Permisos del sistema

| Plataforma | Permiso    | Motivo                                                                           |
| ---------- | ---------- | -------------------------------------------------------------------------------- |
| Android    | `INTERNET` | Requerido por el WebView de Capacitor para cargar los recursos locales de la app |
| Android    | `VIBRATE`  | Retorno háptico, desactivable en Configuración                                   |
| iOS        | —          | Ninguno; la háptica no requiere permiso                                          |

**No** se solicitan permisos de ubicación, cámara, micrófono, contactos,
almacenamiento externo, Bluetooth ni notificaciones.

---

## 5. Publicidad, compras y azar

Esta versión **no** contiene:

- Publicidad de ningún tipo.
- Compras integradas ni suscripciones.
- Cajas de recompensa, tiradas aleatorias ni mecánicas de azar.
- Enlaces de afiliación o promoción de terceros.

Todo el contenido cosmético se obtiene jugando, con condiciones de desbloqueo
públicas y deterministas.

---

## 6. Menores de edad

La aplicación no está dirigida específicamente a menores de 13 años. Al no
recoger ningún dato personal, no procesa información de menores y cumple con las
exigencias de COPPA y del RGPD en materia de datos de menores por diseño.

---

## 7. Control sobre tus datos

Desde **Configuración → Datos** puedes:

- **Exportar** todo tu progreso a un archivo JSON legible.
- **Importar** un archivo exportado previamente en cualquier dispositivo.
- **Restablecer** el progreso por completo, con confirmación explícita previa.

Desinstalar la aplicación, o borrar los datos del sitio en el navegador, elimina
toda la información almacenada. Al no existir copias en servidor, la eliminación
es definitiva e inmediata.

---

## 8. Base legal (RGPD)

No se realiza ningún tratamiento de datos personales en el sentido del artículo 4
del RGPD, ya que la información permanece exclusivamente en el dispositivo del
usuario y bajo su control, sin transmisión al responsable ni a terceros.

---

## 9. Seguridad

Al no transmitirse información, no existe riesgo de interceptación en tránsito.
Los datos locales quedan protegidos por el aislamiento por origen del navegador y
por el sandbox de la aplicación en Android e iOS.

---

## 10. Servicios de terceros

La aplicación no integra SDK de terceros que recojan datos. Las dependencias de
código abierto utilizadas (Next.js, React, Phaser, Tailwind CSS, Capacitor y sus
plugins oficiales) se ejecutan localmente y no realizan llamadas de red por su
cuenta.

Si alojas la versión web en un proveedor como Vercel, dicho proveedor puede
registrar solicitudes HTTP según su propia política. Eso ocurre en la capa de
alojamiento y es ajeno a la aplicación.

---

## 11. Cambios en esta política

Si en el futuro se añaden funciones que requieran tratar datos —por ejemplo, una
clasificación en línea— esta política se actualizará **antes** de activarlas, se
informará dentro de la aplicación y, cuando corresponda, se solicitará
consentimiento explícito.

---

## 12. Contacto

Consultas sobre privacidad: **privacidad@devhive.software**

---

© 2026 DevHive Software. Todos los derechos reservados.
