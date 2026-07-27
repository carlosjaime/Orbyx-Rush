# Compilación móvil — Orbyx Rush

Android e iOS usan **exactamente el mismo código** que la web. Capacitor
empaqueta la exportación estática (`out/`) dentro de un WebView nativo.

---

## 1. Requisitos

| Plataforma | Necesitas                                                  |
| ---------- | ---------------------------------------------------------- |
| Ambas      | Node 20+, pnpm 10                                          |
| Android    | Android Studio (Ladybug+), JDK 21, SDK 35                  |
| iOS        | macOS, Xcode 15+, CocoaPods (`sudo gem install cocoapods`) |

---

## 2. Flujo de trabajo

```bash
# 1. Compila la web y genera ./out
pnpm build

# 2. Copia ./out a los proyectos nativos y actualiza los plugins
npx cap sync

# 3. Abre el IDE nativo
pnpm mobile:android    # Android Studio
pnpm mobile:ios        # Xcode
```

Atajos: `pnpm mobile:sync` hace los pasos 1 y 2;
`pnpm mobile:build:android` y `pnpm mobile:build:ios` hacen los tres.

> `cap sync` **no** compila la web. Si olvidas `pnpm build`, se empaqueta la
> versión anterior de `out/`.

Si el directorio `android/` o `ios/` no existe todavía:

```bash
pnpm mobile:add:android
pnpm mobile:add:ios
```

---

## 3. Configuración aplicada

`capacitor.config.ts`:

| Clave             | Valor                   |
| ----------------- | ----------------------- |
| `appId`           | `com.devhive.orbyxrush` |
| `appName`         | `Orbyx Rush`            |
| `webDir`          | `out`                   |
| `backgroundColor` | `#04070f`               |

Plugins instalados: App, Haptics, Preferences, Share, Splash Screen, Status Bar.
Ninguno pide permisos sensibles.

---

## 4. Android

### 4.1 Lo que ya está configurado

- **Orientación vertical** bloqueada (`android:screenOrientation="portrait"`).
- **Permisos**: solo `INTERNET` (requerido por el WebView) y `VIBRATE` (háptica,
  desactivable desde Configuración). Nada más.
- **Edge-to-edge**: barras de estado y navegación transparentes; la capa web se
  aparta con `env(safe-area-inset-*)`.
- **Icono adaptativo** con fondo `#04070F` y primer plano vectorial, en las cinco
  densidades (mdpi → xxxhdpi).
- **Splash screen** en vertical y horizontal, en las cinco densidades.
- **Tema oscuro** con `windowBackground` en el negro del juego, para que no haya
  destello blanco al arrancar.
- `versionCode 1`, `versionName "1.0.0"`.

### 4.2 Abrir y ejecutar

```bash
pnpm build && npx cap sync android && pnpm mobile:android
```

En Android Studio: espera al _Gradle sync_, elige un dispositivo y pulsa **Run**.

### 4.3 Generar un App Bundle (AAB) firmado

1. **Crea un keystore** (una sola vez, y guárdalo fuera del repositorio):

   ```bash
   keytool -genkey -v \
     -keystore orbyx-rush-release.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias orbyx-release
   ```

   > Si pierdes este fichero o su contraseña **no podrás volver a publicar
   > actualizaciones** de la app. Haz copia de seguridad en un gestor de
   > secretos.

2. **Declara las credenciales** en `~/.gradle/gradle.properties` (nunca en el
   repositorio):

   ```properties
   ORBYX_STORE_FILE=/ruta/absoluta/orbyx-rush-release.jks
   ORBYX_STORE_PASSWORD=...
   ORBYX_KEY_ALIAS=orbyx-release
   ORBYX_KEY_PASSWORD=...
   ```

3. **Añade la configuración de firma** en `android/app/build.gradle`, dentro de
   `android { }`:

   ```gradle
   signingConfigs {
       release {
           if (project.hasProperty('ORBYX_STORE_FILE')) {
               storeFile file(ORBYX_STORE_FILE)
               storePassword ORBYX_STORE_PASSWORD
               keyAlias ORBYX_KEY_ALIAS
               keyPassword ORBYX_KEY_PASSWORD
           }
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
           minifyEnabled true
           shrinkResources true
           proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
       }
   }
   ```

4. **Compila**:

   ```bash
   cd android
   ./gradlew bundleRelease
   ```

   Resultado: `android/app/build/outputs/bundle/release/app-release.aab`.

   Para un APK de prueba: `./gradlew assembleRelease`.

5. **Sube** el AAB a Google Play Console → Producción → Crear nueva versión.

### 4.4 Antes de publicar en Google Play

- [ ] `versionCode` incrementado respecto a la versión anterior.
- [ ] Ficha: título, descripción corta y larga, categoría _Juegos › Arcade_.
- [ ] Icono 512×512 (`public/icons/store-icon-1024.png`, redimensionado).
- [ ] Gráfico de cabecera 1024×500.
- [ ] Al menos 2 capturas de teléfono en vertical.
- [ ] URL de la política de privacidad: `https://<tu-dominio>/privacy/`.
- [ ] Cuestionario de seguridad de datos: **no se recopilan ni comparten datos**.
- [ ] Clasificación por edades (sin contenido sensible, sin compras, sin azar).
- [ ] Declarar que la app **no** contiene anuncios.

---

## 5. iOS

### 5.1 Lo que ya está configurado

- **Orientación vertical** únicamente en iPhone; iPad admite además vertical
  invertido.
- **Barra de estado** en estilo claro sobre fondo oscuro, con la vista web
  dibujando por debajo y `env(safe-area-inset-*)` apartando la interfaz.
- **Icono** de 1024×1024 en el catálogo de assets.
- **Launch screen** con el splash generado (2732×2732).
- **`PrivacyInfo.xcprivacy`** declarando cero recogida de datos, cero seguimiento
  y la única API de motivo requerido que se usa (`UserDefaults`, motivo
  `CA92.1`).
- `ITSAppUsesNonExemptEncryption = false`, que evita el cuestionario de
  exportación en cada envío.

### 5.2 Abrir y ejecutar

```bash
pnpm build && npx cap sync ios && pnpm mobile:ios
```

En Xcode: selecciona el target **App**, elige tu equipo en _Signing &
Capabilities_ y pulsa **Run**.

> Si `PrivacyInfo.xcprivacy` no aparece en el proyecto, arrástralo desde
> `ios/App/App/` al navegador de Xcode y marca el target **App**.

### 5.3 Generar el archivo para distribución

1. En Xcode, selecciona **Any iOS Device (arm64)** como destino.
2. Ajusta el número de compilación en _General → Identity_.
3. **Product → Archive**.
4. En el Organizer: **Distribute App → App Store Connect → Upload**.
5. Firma con tu _Distribution Certificate_ y el _provisioning profile_ de App
   Store (Xcode puede gestionarlo automáticamente).

Desde línea de comandos:

```bash
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -configuration Release -archivePath build/OrbyxRush.xcarchive archive

xcodebuild -exportArchive -archivePath build/OrbyxRush.xcarchive \
  -exportPath build/ipa -exportOptionsPlist ExportOptions.plist
```

### 5.4 Antes de publicar en App Store

- [ ] Número de compilación incrementado.
- [ ] Capturas para 6,7" y 6,5" (y 12,9" si declaras compatibilidad con iPad).
- [ ] Icono de 1024×1024 sin canal alfa.
- [ ] URL de la política de privacidad.
- [ ] Etiquetas de privacidad: **no se recopilan datos**.
- [ ] Clasificación por edades 4+.
- [ ] Confirmar que no hay compras integradas ni anuncios.

---

## 6. Comportamiento nativo implementado

| Tema                    | Comportamiento                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Botón Atrás (Android)   | Cierra modal → sale de la pausa → pide confirmación → solo entonces sale de la app. Nunca cierra durante una partida. |
| Segundo plano           | Detiene el bucle de render, suspende el audio, vuelca el guardado y pausa la partida.                                 |
| Vuelta al primer plano  | Reanuda bucle y audio sin duplicar el juego.                                                                          |
| Interrupciones de audio | El `AudioContext` se suspende y se reanuda; si el sistema lo rechaza, se reintenta en el siguiente gesto.             |
| Háptica                 | Capacitor Haptics en nativo, Vibration API en web, silencio si no hay soporte. Limitada a un pulso cada 40 ms.        |
| Compartir               | Hoja nativa vía Capacitor Share; en web, Web Share API; si no, portapapeles con confirmación visual.                  |
| Almacenamiento          | `localStorage` dentro del WebView; persiste entre sesiones y actualizaciones.                                         |

---

## 7. Problemas frecuentes

| Síntoma                               | Solución                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Pantalla en blanco al abrir la app    | Falta `pnpm build` antes de `cap sync`; comprueba que `out/index.html` existe.                                                             |
| El splash no se oculta                | Revisa `launchShowDuration` en `capacitor.config.ts`; `PlatformAdapter.initialise()` llama a `SplashScreen.hide()`.                        |
| Fallo de Gradle por la versión de JDK | Android Studio → Settings → Build Tools → Gradle → _Gradle JDK_ → 21.                                                                      |
| `pod install` falla                   | `cd ios/App && pod repo update && pod install`.                                                                                            |
| La app gira en horizontal             | Comprueba `android:screenOrientation="portrait"` y `UISupportedInterfaceOrientations`.                                                     |
| Sin vibración                         | El interruptor de Configuración, o falta el permiso `VIBRATE`. iOS no soporta la Vibration API web: la háptica llega por el plugin nativo. |
| Cambios web que no aparecen           | `pnpm build && npx cap sync`, y borra los datos de la app en el dispositivo.                                                               |
