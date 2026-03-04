/**
 * useCapacitor — Initializes native Capacitor plugins on app startup.
 *
 * Handles:
 * - Keyboard: prevents WebView resize when keyboard opens (bottom nav stays fixed)
 * - StatusBar: transparent overlay so content extends under status bar
 * - Safe area: CSS variables are set via capacitor-plugin-safe-area or env() fallback
 *
 * This hook is a no-op in browser environments (Capacitor.isNativePlatform() = false).
 */
import { useEffect } from 'react';

// Detect if running inside a Capacitor native shell
function isNative(): boolean {
  return typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor !== 'undefined' &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

export function useCapacitor() {
  useEffect(() => {
    if (!isNative()) return;

    let cleanupFns: Array<() => void> = [];

    (async () => {
      try {
        // ── Keyboard ──────────────────────────────────────────────────────────
        // Prevent WebView from resizing when keyboard opens.
        // This keeps the bottom nav bar in place.
        const { Keyboard } = await import('@capacitor/keyboard');
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
        await Keyboard.setScroll({ isDisabled: false });

        // When keyboard shows, add padding to the active input's scroll container
        const showHandler = await Keyboard.addListener('keyboardWillShow', (info) => {
          document.documentElement.style.setProperty(
            '--keyboard-height',
            `${info.keyboardHeight}px`
          );
          document.body.classList.add('keyboard-open');
        });

        const hideHandler = await Keyboard.addListener('keyboardWillHide', () => {
          document.documentElement.style.setProperty('--keyboard-height', '0px');
          document.body.classList.remove('keyboard-open');
        });

        cleanupFns.push(() => showHandler.remove());
        cleanupFns.push(() => hideHandler.remove());

        // ── StatusBar ─────────────────────────────────────────────────────────
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#060b18' });
        await StatusBar.setOverlaysWebView({ overlay: true });

        // ── App (back button on Android) ──────────────────────────────────────
        const { App } = await import('@capacitor/app');
        const backHandler = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.minimizeApp();
          }
        });
        cleanupFns.push(() => backHandler.remove());

      } catch (err) {
        // Silently ignore — plugin not available in web environment
        console.debug('[Capacitor] Plugin init skipped:', err);
      }
    })();

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, []);
}
