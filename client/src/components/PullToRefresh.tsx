/*
 * PullToRefresh — 下拉刷新手势组件
 * 使用原生 Touch 事件实现，完全不依赖 framer-motion drag
 * 避免 motion-shim 对 drag 属性处理不完整导致的移动端黑屏问题
 */
import { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
  className?: string;
}

const THRESHOLD = 60;
const MAX_PULL = 100;

export default function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const pullReady = pullDistance >= THRESHOLD;
  const indicatorOpacity = Math.min(pullDistance / THRESHOLD, 1);
  const indicatorScale = 0.5 + Math.min(pullDistance / THRESHOLD, 1) * 0.5;
  const indicatorRotate = (pullDistance / THRESHOLD) * 180;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || refreshing) return;
    const container = containerRef.current;
    if (container && container.scrollTop > 0) {
      isPullingRef.current = false;
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) { setPullDistance(0); return; }
    const resistance = Math.min(delta * 0.5, MAX_PULL);
    setPullDistance(resistance);
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    if (pullDistance >= THRESHOLD && onRefresh && !refreshing) {
      setRefreshing(true);
      setPullDistance(0);
      try { await onRefresh(); } finally { setRefreshing(false); }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh, refreshing]);

  return (
    <div className={`relative ${className || ""}`}>
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-20 pointer-events-none"
          style={{
            opacity: refreshing ? 1 : indicatorOpacity,
            transform: `scale(${refreshing ? 1 : indicatorScale}) translateY(${refreshing ? 8 : Math.min(pullDistance * 0.15, 10)}px)`,
            transition: refreshing ? "none" : "transform 0.1s ease",
          }}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            pullReady || refreshing ? "bg-neon-cyan/20" : "bg-secondary/60"
          } border border-border/20`}>
            <div style={{ transform: `rotate(${refreshing ? 0 : indicatorRotate}deg)` }}>
              <RefreshCw
                size={16}
                className={`transition-colors ${
                  refreshing ? "text-neon-cyan animate-spin" : pullReady ? "text-neon-cyan" : "text-muted-foreground"
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Refreshing state banner */}
      {refreshing && (
        <div className="flex items-center justify-center gap-2 bg-neon-cyan/5 border-b border-neon-cyan/10 h-9">
          <RefreshCw size={12} className="text-neon-cyan animate-spin" />
          <span className="text-[11px] text-neon-cyan font-medium">Refreshing...</span>
        </div>
      )}

      {/* Scrollable content — NO framer-motion drag, pure native scroll */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
