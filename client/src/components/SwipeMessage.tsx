/*
 * SwipeMessage — 左滑回复消息手势组件
 * 使用原生 Touch 事件实现，完全不依赖 framer-motion drag
 */
import { useRef, useState, useCallback } from "react";
import { Reply } from "lucide-react";

interface SwipeMessageProps {
  children: React.ReactNode;
  onSwipeReply?: () => void;
  enabled?: boolean;
}

const REPLY_THRESHOLD = 60;

export default function SwipeMessage({ children, onSwipeReply, enabled = true }: SwipeMessageProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);
  const hasTriggered = useRef(false);

  const replyOpacity = Math.min(Math.abs(swipeX) / REPLY_THRESHOLD, 1);
  const replyScale = 0.3 + Math.min(Math.abs(swipeX) / REPLY_THRESHOLD, 1) * 0.7;
  const triggered = Math.abs(swipeX) >= REPLY_THRESHOLD;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    startXRef.current = e.touches[0].clientX;
    hasTriggered.current = false;
    setSwiping(true);
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !swiping) return;
    const delta = e.touches[0].clientX - startXRef.current;
    if (delta > 0) { setSwipeX(0); return; }
    const clamped = Math.max(delta, -REPLY_THRESHOLD * 1.3);
    setSwipeX(clamped);
    if (clamped < -REPLY_THRESHOLD && !hasTriggered.current) {
      hasTriggered.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
    }
  }, [enabled, swiping]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    setSwiping(false);
    if (swipeX < -REPLY_THRESHOLD && onSwipeReply) {
      onSwipeReply();
    }
    setSwipeX(0);
  }, [enabled, swipeX, onSwipeReply]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reply indicator */}
      {swiping && Math.abs(swipeX) > 5 && (
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{
            opacity: replyOpacity,
            transform: `scale(${replyScale}) translateX(${Math.min(Math.abs(swipeX) / REPLY_THRESHOLD, 1) * -10}px)`,
          }}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            triggered ? "bg-neon-cyan/30" : "bg-secondary/60"
          }`}>
            <Reply size={16} className={triggered ? "text-neon-cyan" : "text-muted-foreground"} />
          </div>
        </div>
      )}

      {/* Content — translate with swipe */}
      <div
        className="relative z-10"
        style={{
          transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
          transition: !swiping ? "transform 0.2s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
