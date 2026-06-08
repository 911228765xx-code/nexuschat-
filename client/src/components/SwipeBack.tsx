/*
 * SwipeBack — 右滑返回上一页手势组件
 * 使用原生 Touch 事件实现，完全不依赖 framer-motion drag
 */
import { useState, useCallback, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

interface SwipeBackProps {
  children: React.ReactNode;
  backPath?: string;
  enabled?: boolean;
}

const EDGE_WIDTH = 30;
const THRESHOLD = 100;

export default function SwipeBack({ children, backPath, enabled = true }: SwipeBackProps) {
  const [, setLocation] = useLocation();
  const [swipeX, setSwipeX] = useState(0);
  const [isEdgeSwipe, setIsEdgeSwipe] = useState(false);
  const startXRef = useRef(0);
  const startTouchXRef = useRef(0);

  const indicatorOpacity = Math.min(Math.max((swipeX - 0) / (THRESHOLD - 0), 0), 1) * 0.9;
  const indicatorTranslate = Math.min(swipeX / THRESHOLD, 1) * 30 - 20;
  const overlayOpacity = Math.min(swipeX / THRESHOLD, 1) * 0.15;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    const touchX = e.touches[0].clientX;
    startXRef.current = touchX;
    startTouchXRef.current = touchX;
    setIsEdgeSwipe(touchX < EDGE_WIDTH);
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !isEdgeSwipe) return;
    const delta = e.touches[0].clientX - startXRef.current;
    if (delta < 0) { setSwipeX(0); return; }
    setSwipeX(Math.min(delta, THRESHOLD * 1.5));
  }, [enabled, isEdgeSwipe]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    if (isEdgeSwipe && swipeX > THRESHOLD) {
      if (backPath) {
        setLocation(backPath);
      } else {
        window.history.back();
      }
    }
    setSwipeX(0);
    setIsEdgeSwipe(false);
  }, [enabled, isEdgeSwipe, swipeX, backPath, setLocation]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left edge indicator */}
      {swipeX > 5 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center z-50 pointer-events-none"
          style={{
            opacity: indicatorOpacity,
            transform: `translateX(${indicatorTranslate}px)`,
            transition: "none",
          }}
        >
          <div className="w-8 h-16 rounded-r-xl bg-neon-cyan/20 border border-neon-cyan/30 border-l-0 flex items-center justify-center">
            <ChevronLeft size={18} className="text-neon-cyan" />
          </div>
        </div>
      )}

      {/* Overlay */}
      {swipeX > 5 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none z-40"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Content — translate with swipe */}
      <div
        className="h-full"
        style={{
          transform: swipeX > 0 ? `translateX(${swipeX * 0.3}px)` : undefined,
          transition: swipeX === 0 ? "transform 0.2s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
