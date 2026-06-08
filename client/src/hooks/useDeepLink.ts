/**
 * useDeepLink — Handles deep links and universal links in Capacitor native app.
 *
 * Supported URL schemes:
 *   nexuschat://app/chat          → /app/chat
 *   nexuschat://app/research      → /app/research
 *   nexuschat://app/trading       → /app/trading
 *   https://nexuschat.best/app/*  → same path (Universal Links / App Links)
 *
 * This hook is a no-op in browser environments.
 */
import { useEffect } from 'react';
import { useLocation } from 'wouter';

function isNative(): boolean {
  return typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor !== 'undefined' &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
}

export function useDeepLink() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isNative()) return;

    let cleanupFn: (() => void) | undefined;

    (async () => {
      try {
        const { App } = await import('@capacitor/app');

        // Handle deep links when app is already running
        const handler = await App.addListener('appUrlOpen', (event) => {
          const url = event.url;
          try {
            const parsed = new URL(url);
            // Support both custom scheme (nexuschat://) and universal links (https://nexuschat.best)
            const path = parsed.pathname || '/';
            if (path && path !== '/') {
              setLocation(path);
            }
          } catch {
            console.debug('[DeepLink] Could not parse URL:', url);
          }
        });

        cleanupFn = () => handler.remove();

        // Handle deep link that launched the app (cold start)
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          try {
            const parsed = new URL(launchUrl.url);
            const path = parsed.pathname || '/';
            if (path && path !== '/') {
              setLocation(path);
            }
          } catch {
            console.debug('[DeepLink] Could not parse launch URL:', launchUrl.url);
          }
        }
      } catch (err) {
        console.debug('[DeepLink] Plugin not available:', err);
      }
    })();

    return () => {
      cleanupFn?.();
    };
  }, [setLocation]);
}
