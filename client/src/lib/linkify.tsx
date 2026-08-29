/** 聊天文本：@提及高亮 + http(s)/www 链接可点开 */
export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(@[^\s@]+|https?:\/\/[^\s<>"'`]+|www\.[^\s<>"'`]+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("@") && part.length > 1) {
          return <span key={i} className="text-neon-cyan font-medium cursor-pointer hover:underline">{part}</span>;
        }
        if (/^(https?:\/\/|www\.)/i.test(part)) {
          const match = part.match(/^(.*?)([),.!?;:，。！？；：]*)$/);
          const core = match?.[1] ?? part;
          const trail = match?.[2] ?? "";
          const href = /^www\./i.test(core) ? `https://${core}` : core;
          try {
            const parsed = new URL(href);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return part;
          } catch {
            return part;
          }
          return (
            <span key={i}>
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-neon-cyan underline break-all" onClick={(e) => e.stopPropagation()}>{core}</a>
              {trail}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
}
