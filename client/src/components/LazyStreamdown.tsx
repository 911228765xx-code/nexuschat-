/**
 * LazyStreamdown — deferred wrapper for the `streamdown` Markdown renderer.
 *
 * `streamdown` transitively pulls in shiki (~9 MB) and mermaid (~1.6 MB).
 * By lazy-importing it here we ensure those heavy chunks are only fetched
 * when the component is first rendered, not on initial page load.
 */
import { lazy, Suspense } from "react";

// Dynamically import Streamdown so shiki/mermaid are code-split away
const StreamdownInner = lazy(() =>
  import("streamdown").then((mod) => ({ default: mod.Streamdown }))
);

interface Props {
  children: string;
}

export function LazyStreamdown({ children }: Props) {
  return (
    <Suspense
      fallback={
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {children}
        </pre>
      }
    >
      <StreamdownInner>{children}</StreamdownInner>
    </Suspense>
  );
}
