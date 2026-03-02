/**
 * PWAInstallBanner
 *
 * Android Chrome: shows a bottom banner with "Add to Home Screen" button that
 *   triggers the native beforeinstallprompt.
 * iOS Safari: shows a bottom sheet with step-by-step "Share -> Add to Home Screen"
 *   instructions, since iOS has no programmatic install API.
 *
 * The banner is dismissed permanently via localStorage so it does not reappear
 * after the user explicitly closes it.
 */
import { useState, useEffect } from "react";
import { X, Download, Share, Plus } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useI18n } from "@/contexts/I18nContext";

const DISMISSED_KEY = "nexuschat_pwa_banner_dismissed";

export default function PWAInstallBanner() {
  const { canInstall, isInstalled, platform, triggerInstall, isInstalling } =
    usePWAInstall();
  const { t } = useI18n();

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Hide once installed
  useEffect(() => {
    if (isInstalled) setDismissed(true);
  }, [isInstalled]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  };

  const handleInstall = async () => {
    if (platform === "android") {
      await triggerInstall();
    }
    // iOS: banner is informational only — user follows manual steps
  };

  if (!canInstall || dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {platform === "ios" ? (
        /* iOS: manual guide */
        <div className="mx-3 mb-3 rounded-2xl bg-[#0d1117] border border-[#00d4ff]/20 shadow-2xl p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <img src="/icon-192.png" alt="NexusChat" className="w-9 h-9 rounded-xl" />
              <div>
                <p className="text-sm font-semibold text-white">{t("pwa.installTitle")}</p>
                <p className="text-xs text-[#00d4ff]">{t("pwa.installSubtitle")}</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-500 hover:text-gray-300 p-1 -mt-1 -mr-1"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          {/* Step-by-step iOS guide */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-gray-300">
              <div className="w-6 h-6 rounded-full bg-[#00d4ff]/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[#00d4ff] font-bold text-[10px]">1</span>
              </div>
              <span>
                {t("pwa.iosStep1")}{" "}
                <Share size={12} className="inline text-[#00d4ff] mx-0.5" />
                {" "}{t("pwa.iosStep1b")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300">
              <div className="w-6 h-6 rounded-full bg-[#00d4ff]/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[#00d4ff] font-bold text-[10px]">2</span>
              </div>
              <span>
                {t("pwa.iosStep2")}{" "}
                <Plus size={12} className="inline text-[#00d4ff] mx-0.5" />
                {" "}{t("pwa.iosStep2b")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300">
              <div className="w-6 h-6 rounded-full bg-[#00d4ff]/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[#00d4ff] font-bold text-[10px]">3</span>
              </div>
              <span>{t("pwa.iosStep3")}</span>
            </div>
          </div>
          {/* Arrow pointing down to Safari toolbar */}
          <div className="flex justify-center mt-3">
            <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#00d4ff]/40" />
          </div>
        </div>
      ) : (
        /* Android: native install banner */
        <div className="mx-3 mb-3 rounded-2xl bg-[#0d1117] border border-[#00d4ff]/20 shadow-2xl p-4">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="NexusChat" className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{t("pwa.installTitle")}</p>
              <p className="text-xs text-gray-400 truncate">{t("pwa.androidDesc")}</p>
            </div>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white text-sm font-semibold flex-shrink-0 disabled:opacity-60"
            >
              <Download size={14} />
              {isInstalling ? t("pwa.installing") : t("pwa.install")}
            </button>
            <button
              onClick={handleDismiss}
              className="text-gray-500 hover:text-gray-300 p-1 flex-shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
