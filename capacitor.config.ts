import type { CapacitorConfig } from '@anthropic/capacitor-types';

const config: CapacitorConfig = {
  appId: 'app.connktus.bluetooth',
  appName: 'ConnKtus',
  webDir: 'dist',
  server: {
    url: 'https://7df9d7d6-04e4-4a9f-9b90-c6d83728e8bb.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0073e6',
      showSpinner: true,
      spinnerColor: '#ffffff'
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#0073e6'
    }
  }
};

export default config;
