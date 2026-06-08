/**
 * motion-shim.tsx — framer-motion 兼容层
 *
 * 将 framer-motion 的 motion.* 和 AnimatePresence 替换为纯 CSS 实现。
 * 这样无需修改任何页面代码，直接通过 Vite alias 拦截 framer-motion 导入。
 *
 * 解决问题：
 * - framer-motion 在 Android Chrome 某些版本中导致路由切换黑屏
 * - framer-motion 的 AnimatePresence 在 Android WebView 中会导致组件树卸载后不重新挂载
 * - framer-motion bundle 体积 79KB，增加移动端首屏加载时间
 */
import React, {
  forwardRef,
  type ComponentPropsWithRef,
  type ElementType,
  type ReactNode,
  type CSSProperties,
} from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type MotionProps = {
  initial?: Record<string, unknown> | string | boolean;
  animate?: Record<string, unknown> | string;
  exit?: Record<string, unknown> | string;
  transition?: Record<string, unknown>;
  whileHover?: Record<string, unknown>;
  whileTap?: Record<string, unknown>;
  whileInView?: Record<string, unknown>;
  viewport?: Record<string, unknown>;
  variants?: Record<string, unknown>;
  layout?: boolean | string;
  layoutId?: string;
  drag?: boolean | string;
  dragConstraints?: unknown;
  dragElastic?: unknown;
  dragMomentum?: unknown;
  onDragEnd?: (...args: unknown[]) => void;
  onDragStart?: (...args: unknown[]) => void;
  onDrag?: (...args: unknown[]) => void;
  onAnimationComplete?: (...args: unknown[]) => void;
  onAnimationStart?: (...args: unknown[]) => void;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
  [key: string]: unknown;
};

// ─── Strip framer-motion-specific props before passing to DOM ───────────────

const MOTION_PROPS = new Set([
  "initial", "animate", "exit", "transition", "whileHover", "whileTap",
  "whileInView", "viewport", "variants", "layout", "layoutId", "drag",
  "dragConstraints", "dragElastic", "dragMomentum", "onDragEnd", "onDragStart",
  "onDrag", "onAnimationComplete", "onAnimationStart", "transformTemplate",
  "custom", "inherit", "onUpdate", "onLayoutAnimationStart",
  "onLayoutAnimationComplete", "onBeforeLayoutMeasure", "onLayoutMeasure",
  "onHoverStart", "onHoverEnd", "onTap", "onTapStart", "onTapCancel",
  "onPan", "onPanStart", "onPanSessionStart", "onPanEnd",
  "onPointerDown", "onPointerUp", "onPointerCancel", "onPointerEnter",
  "onPointerLeave", "onPointerMove", "onPointerOver", "onPointerOut",
  "onFocus", "onBlur",
]);

function stripMotionProps(props: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const key in props) {
    if (!MOTION_PROPS.has(key)) {
      clean[key] = props[key];
    }
  }
  return clean;
}

// ─── Create a motion component for any HTML element ─────────────────────────

function createMotionComponent<T extends ElementType>(tag: T) {
  const Component = forwardRef<unknown, MotionProps & ComponentPropsWithRef<T>>(
    (props, ref) => {
      const clean = stripMotionProps(props as Record<string, unknown>);
      return React.createElement(tag as string, { ...clean, ref });
    }
  );
  Component.displayName = `motion.${String(tag)}`;
  return Component;
}

// ─── motion object — covers all commonly used HTML elements ─────────────────

export const motion = {
  div: createMotionComponent("div"),
  span: createMotionComponent("span"),
  p: createMotionComponent("p"),
  h1: createMotionComponent("h1"),
  h2: createMotionComponent("h2"),
  h3: createMotionComponent("h3"),
  h4: createMotionComponent("h4"),
  h5: createMotionComponent("h5"),
  h6: createMotionComponent("h6"),
  ul: createMotionComponent("ul"),
  ol: createMotionComponent("ol"),
  li: createMotionComponent("li"),
  a: createMotionComponent("a"),
  button: createMotionComponent("button"),
  img: createMotionComponent("img"),
  section: createMotionComponent("section"),
  article: createMotionComponent("article"),
  header: createMotionComponent("header"),
  footer: createMotionComponent("footer"),
  main: createMotionComponent("main"),
  nav: createMotionComponent("nav"),
  aside: createMotionComponent("aside"),
  form: createMotionComponent("form"),
  input: createMotionComponent("input"),
  textarea: createMotionComponent("textarea"),
  label: createMotionComponent("label"),
  table: createMotionComponent("table"),
  thead: createMotionComponent("thead"),
  tbody: createMotionComponent("tbody"),
  tr: createMotionComponent("tr"),
  td: createMotionComponent("td"),
  th: createMotionComponent("th"),
  svg: createMotionComponent("svg"),
  path: createMotionComponent("path"),
  circle: createMotionComponent("circle"),
  rect: createMotionComponent("rect"),
  line: createMotionComponent("line"),
  polyline: createMotionComponent("polyline"),
  polygon: createMotionComponent("polygon"),
  g: createMotionComponent("g"),
};

// ─── AnimatePresence — just renders children, no animation ──────────────────

export function AnimatePresence({
  children,
}: {
  children?: ReactNode;
  mode?: string;
  initial?: boolean;
  onExitComplete?: () => void;
  custom?: unknown;
  presenceAffectsLayout?: boolean;
}) {
  return <>{children}</>;
}

// ─── useMotionValue — returns a plain object with get/set/subscribe ──────────

export function useMotionValue(initial: number) {
  const ref = React.useRef({
    _val: initial,
    get: () => ref.current._val,
    set: (v: number) => { ref.current._val = v; },
    onChange: (_cb: (v: number) => void) => () => {},
    on: (_event: string, _cb: (v: number) => void) => () => {},
    subscribe: (_cb: (v: number) => void) => () => {},
    destroy: () => {},
    stop: () => {},
    isAnimating: () => false,
    animation: null,
    clearListeners: () => {},
    attach: () => {},
    renderValue: initial,
    current: initial,
  });
  return ref.current;
}

// ─── useTransform — maps one value to another ───────────────────────────────

export function useTransform(
  _value: unknown,
  _input: unknown,
  _output: unknown,
  _options?: unknown
) {
  return useMotionValue(0);
}

// ─── useAnimation — returns a plain animation controls object ───────────────

export function useAnimation() {
  return {
    start: async (_definition: unknown) => {},
    stop: () => {},
    set: (_definition: unknown) => {},
    mount: () => {},
    subscribe: (_cb: unknown) => () => {},
  };
}

// ─── useDragControls ─────────────────────────────────────────────────────────

export function useDragControls() {
  return {
    start: (_event: unknown, _options?: unknown) => {},
  };
}

// ─── useScroll ───────────────────────────────────────────────────────────────

export function useScroll(_options?: unknown) {
  return {
    scrollX: useMotionValue(0),
    scrollY: useMotionValue(0),
    scrollXProgress: useMotionValue(0),
    scrollYProgress: useMotionValue(0),
  };
}

// ─── useSpring ───────────────────────────────────────────────────────────────

export function useSpring(value: number | unknown, _config?: unknown) {
  return useMotionValue(typeof value === "number" ? value : 0);
}

// ─── useInView ───────────────────────────────────────────────────────────────

export function useInView(_ref: unknown, _options?: unknown) {
  return true; // always in view — no intersection observer needed
}

// ─── easing functions ────────────────────────────────────────────────────────

export const easeIn = [0.4, 0, 1, 1];
export const easeOut = [0, 0, 0.2, 1];
export const easeInOut = [0.4, 0, 0.2, 1];

// ─── LazyMotion / domAnimation / domMax (no-ops) ────────────────────────────

export function LazyMotion({ children }: { children: ReactNode; features?: unknown; strict?: boolean }) {
  return <>{children}</>;
}

export const domAnimation = {};
export const domMax = {};

// ─── m (alias for motion) ────────────────────────────────────────────────────

export const m = motion;

// ─── MotionConfig ────────────────────────────────────────────────────────────

export function MotionConfig({ children }: { children: ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

// ─── Reorder (no-op) ─────────────────────────────────────────────────────────

export const Reorder = {
  Group: createMotionComponent("ul"),
  Item: createMotionComponent("li"),
};

// ─── PanInfo type (for drag callbacks) ───────────────────────────────────────

export type PanInfo = {
  point: { x: number; y: number };
  delta: { x: number; y: number };
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
};

// Default export
export default motion;
