import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.devhive.orbyxrush',
  appName: 'Orbyx Rush',
  webDir: 'out',
  backgroundColor: '#04070f',
  android: {
    allowMixedContent: false,
    // Edge-to-edge is handled by the web layer through env(safe-area-inset-*).
    backgroundColor: '#04070f',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#04070f',
    scrollEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: '#04070f',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#04070f',
      overlaysWebView: true,
    },
  },
};

export default config;
