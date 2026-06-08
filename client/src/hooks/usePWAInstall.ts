/**
 * usePWAInstall — detects PWA installability and exposes install trigger.
 *
 * Android Chrome: listens for `beforeinstallprompt` and defers it so we can
 *   trigger it programmatically via `triggerInstall()`.
 * iOS Safari: no native prompt API; we detect the platform and show a manual
 *   "Share → Add to Home Screen" guide instead.
 * Already installed: `window.matchMedia('(display-mode: standalone)')` returns
 *   true when running as PWA — we hide the banner in that case.
 */
import { useEffect, useState } from "react";

type Platform = "android" | "ios" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAInstallState {
  /** True when the app can be installed (not yet installed, correct platform) */
  canInstall: boolean;
  /** True when running as an installed PWA (standalone mode) */
  isInstalled: boolean;
  /** "android" | "ios" | "other" */
  platform: Platform;
  /** Trigger native install prompt (Android Chrome only) */
  triggerInstall: () => Promise<boolean>;
  /** True while waiting for user choice */
  isInstalling: boolean;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

function isRunningStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isRunningStandalone);
  const [isInstalling, setIsInstalling] = useState(false);
  const platform = detectPlatform();

  useEffect(() => {
    // Already installed — nothing to do
    if (isRunningStandalone()) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Detect when user installs via browser UI (not our prompt)
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } finally {
      setIsInstalling(false);
    }
  };

  // canInstall:
  //   Android: native prompt available
  //   iOS: not installed yet (show manual guide)
  //   Other: only if prompt available
  const canInstall =
    !isInstalled &&
    (platform === "ios" || deferredPrompt !== null);

  return { canInstall, isInstalled, platform, triggerInstall, isInstalling };
}
