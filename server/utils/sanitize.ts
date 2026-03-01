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
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
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
