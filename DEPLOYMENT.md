# Despliegue — Orbyx Rush

El juego se compila a un sitio **completamente estático**. No necesita Node en
producción, no usa Server Actions ni rutas de API, y el mismo artefacto sirve
para la web y para los WebView nativos.

---

## 1. Compilar

```bash
pnpm install --frozen-lockfile
pnpm build
```

Salida: `out/` (~2,7 MB).

```
out/
  index.html            El juego
  404.html              Página de error
  offline/index.html    Fallback del service worker
  privacy/index.html    Política de privacidad (obligatoria para las tiendas)
  manifest.webmanifest
  sw.js
  favicon.ico
  icons/
  _next/static/         JS y CSS con hash de contenido
```

Servir localmente:

```bash
pnpm start                       # o
npx serve out --no-clipboard
```

> No sirvas `out/` en modo SPA (`serve -s`): reescribiría todas las rutas a
> `index.html` y romperían el 404 y la página offline.

---

## 2. Vercel

### 2.1 Desde el panel

1. **New Project** → importa el repositorio de GitHub o GitLab.
2. Vercel detecta Next.js. Confirma:
   - Framework: **Next.js**
   - Build Command: `pnpm build`
   - Output Directory: `out`
   - Install Command: `pnpm install --frozen-lockfile`
3. Añade las variables de entorno (§3) — todas opcionales.
4. **Deploy**.

`vercel.json` ya está en el repositorio con las cabeceras y las reglas de caché,
así que no hay nada más que configurar.

### 2.2 Desde la CLI

```bash
npm i -g vercel
vercel login
vercel            # despliegue de vista previa
vercel --prod     # producción
```

### 2.3 Qué configura `vercel.json`

| Cabecera                  | Valor                                                                   |
| ------------------------- | ----------------------------------------------------------------------- |
| `X-Content-Type-Options`  | `nosniff`                                                               |
| `X-Frame-Options`         | `SAMEORIGIN`                                                            |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`                                       |
| `Permissions-Policy`      | Deniega geolocalización, cámara, micrófono, pago, USB, Bluetooth y FLoC |
| `Content-Security-Policy` | `default-src 'self'`, sin orígenes externos                             |

Caché: `_next/static/*` inmutable durante un año (los nombres llevan hash);
`sw.js` sin caché para que las actualizaciones se detecten; `manifest` una hora.

> La CSP incluye `'unsafe-inline'` para scripts porque Next.js inyecta el
> arranque de hidratación en línea. No hay ningún origen externo permitido, así
> que la superficie sigue siendo mínima.

### 2.4 Comprobación posterior

- [ ] `/` carga y el botón **Jugar** se habilita.
- [ ] `/privacy/` y `/offline/` responden 200.
- [ ] Una ruta inexistente responde **404**.
- [ ] `/manifest.webmanifest` se sirve como `application/manifest+json`.
- [ ] Lighthouse detecta la PWA como instalable.
- [ ] Sin errores en la consola.

---

## 3. Variables de entorno

Todas son opcionales: el juego funciona sin ninguna. Ver `.env.example`.

| Variable                           | Uso                                                 | Por defecto                     |
| ---------------------------------- | --------------------------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_SITE_URL`             | URL canónica y Open Graph                           | `https://orbyx-rush.vercel.app` |
| `NEXT_PUBLIC_APP_VERSION`          | Versión mostrada en Créditos                        | `1.0.0`                         |
| `NEXT_PUBLIC_ENABLE_DEBUG`         | Habilita el panel de depuración fuera de desarrollo | `false`                         |
| `NEXT_PUBLIC_FORCED_SEED`          | Fija la seed de todas las partidas (QA)             | vacío                           |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER`   | `noop` o `console`                                  | `noop`                          |
| `NEXT_PUBLIC_LEADERBOARD_ENDPOINT` | Reservado para v1.1                                 | vacío                           |

> **`NEXT_PUBLIC_ENABLE_DEBUG` debe quedar en `false` en producción.** Es la
> única forma de que el panel de depuración aparezca en un build no-desarrollo.

---

## 4. Otros hostings estáticos

Cualquier CDN sirve `out/` tal cual. Lo único imprescindible:

1. Servir `404.html` con estado 404 en rutas desconocidas.
2. **No** activar el modo SPA / reescritura universal a `index.html`.
3. Servir `/sw.js` desde la raíz y sin caché.
4. Servir `manifest.webmanifest` con el tipo MIME correcto.

**Netlify** (`netlify.toml`):

```toml
[build]
  command = "pnpm build"
  publish = "out"
```

**Cloudflare Pages**: build `pnpm build`, output `out`.

**Nginx**:

```nginx
root /var/www/orbyx-rush/out;
index index.html;

location / {
    try_files $uri $uri/ $uri/index.html =404;
}

location = /sw.js {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

location /_next/static/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

error_page 404 /404.html;
```

---

## 5. PWA y actualizaciones

El service worker (`public/sw.js`) está escrito a mano y es auditable de un
vistazo:

- **Navegaciones**: red primero, caché como respaldo, `/offline/` como último
  recurso.
- **`_next/static/*`**: caché primero (los nombres llevan hash, son inmutables).
- **Resto del mismo origen**: _stale-while-revalidate_.
- **Otros orígenes**: no se interceptan.

Al desplegar una versión nueva, el worker se instala en segundo plano y **espera**.
La app muestra un aviso discreto; el cambio solo ocurre cuando el jugador lo
acepta. Nunca se recarga la página en mitad de una partida.

El service worker solo se registra en builds de producción servidos por HTTP(S):
en desarrollo y dentro de los WebView nativos se omite.

---

## 6. Integración continua

```yaml
name: CI
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build

      - run: npx playwright install --with-deps chromium
      - run: pnpm test:e2e
```

---

## 7. Rendimiento esperado

| Métrica                     | Objetivo                                  |
| --------------------------- | ----------------------------------------- |
| Bundle estático total       | ~2,7 MB (Phaser incluido)                 |
| Peticiones de red del juego | 0 tras la carga inicial                   |
| Descarga de audio           | 0 bytes (síntesis en tiempo real)         |
| Descarga de imágenes        | 0 bytes de sprites (generados por código) |
| FPS objetivo                | 60, con modo ahorro a 30                  |

En navegadores sin aceleración por GPU (entornos headless, algunas máquinas
virtuales) el canvas cae a unos pocos FPS por rasterización por software. Es una
limitación del entorno de ejecución, no del juego.
