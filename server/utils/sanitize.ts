/**
 * Server-side input sanitization for XSS prevention.
 * Strips HTML tags from user input before storing in database.
 */

/**
 * Strip all HTML tags from input, leaving only plain text.
 * Used for posts, comments, messages, bios, usernames, etc.
 */
export function stripHtml(input: string): string {
  if (!input) return "";
  // Decode HTML entities FIRST so that encoded tags (e.g. "&lt;img onerror=...&gt;")
  // become real tags, then strip all tags. Doing this in the reverse order would
  // re-introduce live HTML after stripping and reopen an XSS hole.
  const decoded = input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&amp;/g, "&"); // decode &amp; last so "&amp;lt;" stays inert text

  // Strip tags repeatedly until stable, to defeat overlapping/nested constructs
  // like "<scr<script>ipt>" that a single pass would leave behind.
  let prev: string;
  let out = decoded;
  do {
    prev = out;
    out = out.replace(/<[^>]*>/g, "");
  } while (out !== prev);
  return out;
}

/**
 * Sanitize text input: trim whitespace, strip HTML, limit length.
 */
export function sanitizeInput(input: string, maxLength = 10000): string {
  if (!input) return "";
  const stripped = stripHtml(input.trim());
  return stripped.slice(0, maxLength);
}

/**
 * Sanitize a username/handle: alphanumeric + underscores + dots only.
 */
export function sanitizeUsername(input: string): string {
  if (!input) return "";
  return input.trim().replace(/[^a-zA-Z0-9_.\-]/g, "").slice(0, 50);
}
