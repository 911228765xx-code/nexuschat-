/**
 * Stable callback ref that focuses an input/textarea shortly after it mounts.
 *
 * Use this instead of the `autoFocus` attribute. In Capacitor / native WebViews,
 * `autoFocus` fires synchronously while the host panel is still mid-entrance-animation
 * (opacity:0) and outside a user-gesture stack, so the soft keyboard never appears.
 * Focusing ~120ms after mount — once the element is actually visible — raises it reliably.
 *
 * IMPORTANT: this is a single module-level function so its identity is stable across
 * renders. React therefore only invokes it on mount/unmount (not every render), which
 * avoids stealing focus / resetting the caret while the user types.
 *
 * Usage: <input ref={focusOnMount} ... />  (drop the `autoFocus` prop)
 */
export function focusOnMount(el: HTMLInputElement | HTMLTextAreaElement | null): void {
  if (!el) return;
  setTimeout(() => el.focus(), 120);
}
