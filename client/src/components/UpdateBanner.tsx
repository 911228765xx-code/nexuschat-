/**
 * UpdateBanner — 顶部版本更新提示条
 * - 有新版本时在页面顶部显示一条可关闭的提示横幅
 * - 强制更新时不可关闭，显示红色警告样式
 * - 每 30 分钟自动轮询一次版本接口
 * - 用户关闭后本次会话内不再显示（非强制更新）
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, RefreshCw, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CURRENT_APP_VERSION } from "@/const";

function getPlatform(): "android" | "ios" | "web" {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

const DISMISSED_KEY = "nexuschat_update_banner_dismissed_v";

export function UpdateBanner() {
  const [dismissed, setDismissed] = useState(false);
  const platform = getPlatform();

  const { data, refetch } = trpc.appVersion.checkVersion.useQuery(
    { currentVersion: CURRENT_APP_VERSION, platform },
    {
      // Initial check on mount
      enabled: true,
      staleTime: 30 * 60 * 1000, // 30 minutes
      refetchInterval: 30 * 60 * 1000, // Poll every 30 minutes
      refetchIntervalInBackground: false, // Only poll when tab is active
    }
  );

  // Check if user already dismissed this version's banner
  useEffect(() => {
    if (data?.latestVersion) {
      const dismissedVersion = sessionStorage.getItem(DISMISSED_KEY);
      if (dismissedVersion === data.latestVersion) {
        setDismissed(true);
      }
    }
  }, [data?.latestVersion]);

  const handleDismiss = useCallback(() => {
    if (data?.isForceUpdate) return; // Cannot dismiss force update
    if (data?.latestVersion) {
      sessionStorage.setItem(DISMISSED_KEY, data.latestVersion);
    }
    setDismissed(true);
  }, [data?.isForceUpdate, data?.latestVersion]);

  const handleUpdate = useCallback(() => {
    if (data?.downloadUrl) {
      if (platform === "web") {
        // Web platform: navigate to the download/update page
        if (data.latestVersion) {
          sessionStorage.setItem(DISMISSED_KEY, data.latestVersion);
        }
        setDismissed(true);
        setTimeout(() => {
          window.location.href = data.downloadUrl!;
        }, 200);
      } else {
        // Native app (Android/iOS): open download URL in new tab
        window.open(data.downloadUrl, "_blank");
      }
    } else {
      // Fallback: reload page to get latest assets
      if (data?.latestVersion) {
        sessionStorage.setItem(DISMISSED_KEY, data.latestVersion);
      }
      setDismissed(true);
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  }, [data?.downloadUrl, data?.latestVersion, platform]);

  const show = !dismissed && (data?.hasUpdate || data?.isForceUpdate);
  const isForce = data?.isForceUpdate ?? false;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${
              isForce
                ? "bg-[#ff3366]/15 border-b border-[#ff3366]/30 text-[#ff3366]"
                : "bg-[#00d4ff]/10 border-b border-[#00d4ff]/20 text-[#00d4ff]"
            }`}
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              {isForce ? (
                <AlertTriangle size={15} />
              ) : (
                <Download size={15} />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              {isForce ? (
                <span>
                  当前版本过旧，请立即更新至{" "}
                  <span className="font-mono font-bold">v{data?.latestVersion}</span>{" "}
                  才能继续使用
                </span>
              ) : (
                <span>
                  🎉 发现新版本{" "}
                  <span className="font-mono font-bold">v{data?.latestVersion}</span>
                  {data?.releaseNotes ? `：${data.releaseNotes.slice(0, 40)}${data.releaseNotes.length > 40 ? "…" : ""}` : "，点击立即更新"}
                </span>
              )}
            </div>

            {/* Update button */}
            <button
              onClick={handleUpdate}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                isForce
                  ? "bg-[#ff3366] text-white hover:bg-[#ff3366]/80"
                  : "bg-[#00d4ff] text-black hover:bg-[#00d4ff]/80"
              }`}
            >
              <RefreshCw size={11} />
              {platform === "web" ? "刷新" : "更新"}
            </button>

            {/* Close button (only for non-force updates) */}
            {!isForce && (
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors text-[#00d4ff]/60 hover:text-[#00d4ff]"
                aria-label="关闭更新提示"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
