/*
 * SwipeBack — 右滑返回上一页手势组件
 * 从屏幕左边缘右滑触发返回操作
 */
import { useState, useCallback, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

interface SwipeBackProps {
  children: React.ReactNode;
  backPath?: string;
  enabled?: boolean;
}

const EDGE_WIDTH = 30; // px from left edge to trigger
const THRESHOLD = 100; // px to complete swipe

export default function SwipeBack({ children, backPath, enabled = true }: SwipeBackProps) {
  const [, setLocation] = useLocation();
  const x = useMotionValue(0);
  const [isEdgeSwipe, setIsEdgeSwipe] = useState(false);
  const startX = useRef(0);

  const indicatorOpacity = useTransform(x, [0, 40, THRESHOLD], [0, 0.6, 1]);
  const indicatorX = useTransform(x, [0, THRESHOLD], [-20, 10]);
  const overlayOpacity = useTransform(x, [0, THRESHOLD], [0, 0.15]);

  const handleDragStart = useCallback((_: any, info: PanInfo) => {
    startX.current = info.point.x - info.offset.x;
    // Only activate if starting from left edge
    setIsEdgeSwipe(startX.current < EDGE_WIDTH);
  }, []);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    if (!isEdgeSwipe) {
      x.set(0);
      return;
    }
    // Only allow right swipe
    if (info.offset.x < 0) {
      x.set(0);
    }
  }, [isEdgeSwipe, x]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (isEdgeSwipe && info.offset.x > THRESHOLD && enabled) {
      if (backPath) {
        setLocation(backPath);
      } else {
        window.history.back();
      }
    }
    setIsEdgeSwipe(false);
  }, [isEdgeSwipe, enabled, backPath, setLocation]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative h-full overflow-hidden">
      {/* Left edge indicator */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center z-50 pointer-events-none"
        style={{ opacity: indicatorOpacity, x: indicatorX }}
      >
        <div className="w-8 h-16 rounded-r-xl bg-neon-cyan/20 [backdrop-filter:none] border border-neon-cyan/30 border-l-0 flex items-center justify-center">
          <ChevronLeft size={18} className="text-neon-cyan" />
        </div>
      </motion.div>

      {/* Overlay */}
      <motion.div
        className="absolute inset-0 bg-black pointer-events-none z-40"
        style={{ opacity: overlayOpacity }}
      />

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.5 }}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x: isEdgeSwipe ? x : 0 }}
        animate={!isEdgeSwipe ? { x: 0 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
