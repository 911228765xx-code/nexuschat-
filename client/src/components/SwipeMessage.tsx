/*
 * SwipeMessage — 左滑回复消息手势组件
 * 在聊天消息上左滑触发回复操作
 */
import { useRef, useState, useCallback } from "react";
import { Reply } from "lucide-react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";

interface SwipeMessageProps {
  children: React.ReactNode;
  onSwipeReply?: () => void;
  enabled?: boolean;
}

export default function SwipeMessage({ children, onSwipeReply, enabled = true }: SwipeMessageProps) {
  const x = useMotionValue(0);
  const [swiping, setSwiping] = useState(false);
  const hasTriggered = useRef(false);

  // Reply icon opacity and scale based on drag distance
  const replyOpacity = useTransform(x, [-80, -40, 0], [1, 0.5, 0]);
  const replyScale = useTransform(x, [-80, -40, 0], [1, 0.7, 0.3]);
  const replyX = useTransform(x, [-80, -40, 0], [0, 10, 30]);

  const handleDragStart = useCallback(() => {
    setSwiping(true);
    hasTriggered.current = false;
  }, []);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    // Only allow left swipe
    if (info.offset.x > 0) {
      x.set(0);
      return;
    }
    // Trigger haptic feedback at threshold
    if (info.offset.x < -60 && !hasTriggered.current) {
      hasTriggered.current = true;
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  }, [x]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    setSwiping(false);
    if (info.offset.x < -60 && onSwipeReply && enabled) {
      onSwipeReply();
    }
  }, [onSwipeReply, enabled]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Reply indicator */}
      <motion.div
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center"
        style={{ opacity: replyOpacity, scale: replyScale, x: replyX }}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          hasTriggered.current ? "bg-neon-cyan/30" : "bg-secondary/60"
        }`}>
          <Reply size={16} className={hasTriggered.current ? "text-neon-cyan" : "text-muted-foreground"} />
        </div>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={{ left: 0.3, right: 0 }}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={!swiping ? { x: 0 } : undefined}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}
