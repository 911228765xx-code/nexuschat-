import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexuschat.app',
  appName: 'BitChat',
  webDir: 'dist/public',
  // 套壳已退役：不再把整站 /app 嵌进 WebView。
  // 若有人误打 Capacitor 包，打开后只进官方下载页，引导改装 Expo 原生包。
  server: {
    url: 'https://nexuschat.best/download',
    cleartext: false,
  },
  plugins: {
    // Keyboard plugin: prevent WebView from resizing when keyboard opens
    // This avoids the bottom nav bar being pushed up
    Keyboard: {
      resize: 'none',
      style: 'dark',
      resizeOnFullScreen: false,
    },
    // Status bar: dark content on transparent background
    StatusBar: {
      style: 'dark',
      backgroundColor: '#060b18',
      overlaysWebView: true,
    },
    // Push notifications (Firebase FCM) — configured separately
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    // SplashScreen: auto-hide after app loads
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#060b18',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  android: {
    // Allow cleartext for local dev (remove for production)
    allowMixedContent: false,
    // Enable hardware back button handling
    hardwareBackButton: true,
    // Minimum SDK version (Android 7.0+)
    minWebViewVersion: 60,
  },
  ios: {
    // Content inset: automatic handles safe areas
    contentInset: 'automatic',
    // Scroll enabled for the WebView
    scrollEnabled: true,
    // Liminal color for status bar area
    backgroundColor: '#060b18',
  },
};

export default config;
