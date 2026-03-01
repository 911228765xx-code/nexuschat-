/**
 * LightMarkdown — 轻量级 Markdown 渲染组件
 *
 * 替代 streamdown，不依赖 shiki (9MB)、mermaid (1.5MB)、katex (267KB)
 * 使用 CSS 样式的代码块替代语法高亮，保持视觉效果
 * 体积：~0KB（使用内置 DOM）
 *
 * 支持：粗体、斜体、代码块、行内代码、标题、列表、链接、引用块、分割线
 */
import { useMemo } from "react";

interface Props {
  children: string;
  className?: string;
  /** 是否在流式输出时使用（不需要完整 markdown） */
  streaming?: boolean;
}

/**
 * 将 markdown 文本转换为 HTML 字符串
 * 轻量实现，不依赖任何外部库
 */
function parseMarkdown(text: string): string {
  if (!text) return "";

  let html = text
    // Escape HTML entities first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const langClass = lang ? ` data-lang="${lang}"` : "";
    return `<pre class="code-block"${langClass}><code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');

  // Headers
  html = html.replace(/^#{6}\s+(.+)$/gm, '<h6 class="md-h6">$1</h6>');
  html = html.replace(/^#{5}\s+(.+)$/gm, '<h5 class="md-h5">$1</h5>');
  html = html.replace(/^#{4}\s+(.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^#{3}\s+(.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^#{2}\s+(.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^#{1}\s+(.+)$/gm, '<h1 class="md-h1">$1</h1>');

  // Blockquotes
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr class="md-hr" />');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

  // Unordered lists
  html = html.replace(/^[\*\-\+]\s+(.+)$/gm, '<li class="md-li">$1</li>');
  html = html.replace(/(<li class="md-li">[\s\S]+?<\/li>)(?!\s*<li)/g, '<ul class="md-ul">$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="md-oli">$1</li>');
  html = html.replace(/(<li class="md-oli">[\s\S]+?<\/li>)(?!\s*<li)/g, '<ol class="md-ol">$1</ol>');

  // Paragraphs (double newline = paragraph break)
  const lines = html.split('\n\n');
  html = lines.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // Don't wrap already-wrapped elements
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol') ||
        trimmed.startsWith('<pre') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr')) {
      return trimmed;
    }
    // Replace single newlines with <br> within paragraphs
    return `<p class="md-p">${trimmed.replace(/\n/g, '<br />')}</p>`;
  }).join('\n');

  return html;
}

export default function LightMarkdown({ children, className = "", streaming = false }: Props) {
  const html = useMemo(() => parseMarkdown(children || ""), [children]);

  return (
    <div
      className={`light-markdown ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
