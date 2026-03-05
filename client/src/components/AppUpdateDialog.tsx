import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { CURRENT_APP_VERSION } from "@/const";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, X } from "lucide-react";

// Detect platform
function getPlatform(): "android" | "ios" | "web" {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

// Key to store the version we've already shown the dialog for
const SHOWN_DIALOG_KEY = "nexuschat_update_dialog_shown_v";

interface AppUpdateDialogProps {
  /** If true, only show when there's an update (auto-check on mount) */
  autoCheck?: boolean;
  /** If true, show the dialog immediately (triggered manually from Settings) */
  open?: boolean;
  onClose?: () => void;
}

export function AppUpdateDialog({
  autoCheck = false,
  open: externalOpen,
  onClose,
}: AppUpdateDialogProps) {
  const [open, setOpen] = useState(false);
  const platform = getPlatform();

  const { data, isLoading, refetch } = trpc.appVersion.checkVersion.useQuery(
    { currentVersion: CURRENT_APP_VERSION, platform },
    {
      enabled: autoCheck || externalOpen === true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Auto-check: show dialog if update available AND we haven't shown it for this version yet
  useEffect(() => {
    if (autoCheck && data?.hasUpdate && data?.latestVersion) {
      const shownVersion = sessionStorage.getItem(SHOWN_DIALOG_KEY);
      // Only show if we haven't already shown the dialog for this version
      // (unless it's a force update, which always shows)
      if (data.isForceUpdate || shownVersion !== data.latestVersion) {
        setOpen(true);
      }
    }
  }, [autoCheck, data?.hasUpdate, data?.latestVersion, data?.isForceUpdate]);

  // External open (from Settings)
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  const handleClose = () => {
    if (data?.isForceUpdate) return; // Cannot close force update
    // Mark this version as "dialog shown" so it doesn't reappear this session
    if (data?.latestVersion) {
      sessionStorage.setItem(SHOWN_DIALOG_KEY, data.latestVersion);
    }
    setOpen(false);
    onClose?.();
  };

  const handleUpdate = () => {
    if (data?.downloadUrl) {
      // Native app: open download URL
      window.open(data.downloadUrl, "_blank");
    } else {
      // Web: just close the dialog and reload the page to get latest assets
      if (data?.latestVersion) {
        sessionStorage.setItem(SHOWN_DIALOG_KEY, data.latestVersion);
      }
      setOpen(false);
      onClose?.();
      // Small delay before reload to let dialog close animation finish
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  };

  const isForce = data?.isForceUpdate ?? false;
  const hasUpdate = data?.hasUpdate ?? false;

  return (
    <Dialog open={open} onOpenChange={isForce ? undefined : handleClose}>
      <DialogContent
        className="max-w-sm mx-auto"
        onPointerDownOutside={isForce ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={isForce ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isForce ? (
              <>
                <RefreshCw size={18} className="text-[#ff3366]" />
                <span>需要更新</span>
              </>
            ) : (
              <>
                <Download size={18} className="text-[#00d4ff]" />
                <span>发现新版本</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 pt-1">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">正在检查更新...</p>
              ) : !hasUpdate ? (
                <p className="text-sm text-muted-foreground">
                  当前已是最新版本 <span className="font-mono text-foreground">{data?.currentVersion ?? CURRENT_APP_VERSION}</span>
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">当前版本</span>
                    <span className="font-mono">{data?.currentVersion}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">最新版本</span>
                    <span className="font-mono text-[#00d4ff]">{data?.latestVersion}</span>
                  </div>
                  {data?.releaseNotes && (
                    <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border/20">
                      <p className="text-xs text-muted-foreground mb-1">更新内容</p>
                      {/* Use whitespace-pre-line to preserve line breaks in release notes */}
                      <p className="text-sm leading-relaxed whitespace-pre-line">{data.releaseNotes}</p>
                    </div>
                  )}
                  {isForce && (
                    <p className="text-xs text-[#ff3366] mt-2">
                      当前版本过旧，请更新后继续使用。
                    </p>
                  )}
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 pt-2">
          {!isLoading && hasUpdate && (
            <Button
              onClick={handleUpdate}
              className="flex-1 bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white hover:opacity-90"
            >
              <Download size={14} className="mr-1.5" />
              立即更新
            </Button>
          )}
          {!isForce && (
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-border/40"
            >
              {hasUpdate ? "稍后再说" : (
                <>
                  <X size={14} className="mr-1.5" />
                  关闭
                </>
              )}
            </Button>
          )}
          {!isLoading && !hasUpdate && (
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="flex-1 border-border/40"
            >
              <RefreshCw size={14} className="mr-1.5" />
              重新检查
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
