/**
 * XSS Sanitization utility
 * Uses DOMPurify to clean user-generated content before rendering.
 */
import DOMPurify from "dompurify";

/**
 * Sanitize user-generated text content (posts, comments, messages, bios).
 * Strips all HTML tags, leaving only plain text.
 */
export function sanitizeText(input: string): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize HTML content that may contain safe formatting (e.g., Markdown-rendered reports).
 * Allows basic formatting tags but strips scripts, event handlers, etc.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "strong", "em", "b", "i", "u", "s", "del",
      "ul", "ol", "li",
      "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "pre", "code",
      "a", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize a URL to prevent javascript: protocol attacks.
 */
export function sanitizeUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  ) {
    return "";
  }
  return trimmed;
}
