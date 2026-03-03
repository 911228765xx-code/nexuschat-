/*
 * PullToRefresh — 下拉刷新手势组件
 * 在列表顶部下拉触发刷新操作
 */
import { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void> | void;
  className?: string;
}

const THRESHOLD = 60;

export default function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullReady, setPullReady] = useState(false);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const indicatorOpacity = useTransform(y, [0, 30, THRESHOLD], [0, 0.5, 1]);
  const indicatorScale = useTransform(y, [0, 30, THRESHOLD], [0.5, 0.8, 1]);
  const indicatorRotate = useTransform(y, [0, THRESHOLD, THRESHOLD * 2], [0, 180, 360]);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    // Only allow pull down when at top of scroll
    const container = containerRef.current;
    if (container && container.scrollTop > 0) {
      y.set(0);
      return;
    }
    if (info.offset.y < 0) {
      y.set(0);
      return;
    }
    setPullReady(info.offset.y > THRESHOLD);
  }, [y]);

  const handleDragEnd = useCallback(async (_: any, info: PanInfo) => {
    if (info.offset.y > THRESHOLD && onRefresh && !refreshing) {
      setRefreshing(true);
      setPullReady(false);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullReady(false);
  }, [onRefresh, refreshing]);

  return (
    <div className={`relative overflow-hidden ${className || ""}`}>
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-20 pointer-events-none"
        style={{ opacity: indicatorOpacity, scale: indicatorScale, y: useTransform(y, [0, THRESHOLD], [-20, 10]) }}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          pullReady ? "bg-neon-cyan/20" : "bg-secondary/60"
        } [backdrop-filter:none] border border-border/20`}>
          <motion.div style={{ rotate: refreshing ? undefined : indicatorRotate }}>
            <RefreshCw
              size={16}
              className={`transition-colors ${
                refreshing ? "text-neon-cyan animate-spin" : pullReady ? "text-neon-cyan" : "text-muted-foreground"
              }`}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Refreshing state banner */}
      {refreshing && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 36, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex items-center justify-center gap-2 bg-neon-cyan/5 border-b border-neon-cyan/10"
        >
          <RefreshCw size={12} className="text-neon-cyan animate-spin" />
          <span className="text-[11px] text-neon-cyan font-medium">Refreshing...</span>
        </motion.div>
      )}

      {/* Draggable content */}
      <motion.div
        ref={containerRef}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.4, bottom: 0 }}
        dragMomentum={false}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y: refreshing ? undefined : y }}
        animate={!refreshing ? { y: 0 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="h-full overflow-y-auto"
      >
        {children}
      </motion.div>
    </div>
  );
}
