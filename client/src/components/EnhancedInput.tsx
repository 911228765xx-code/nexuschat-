/*
 * EnhancedInput — 增强消息输入组件
 * Markdown实时预览、$TOKEN代币价格快捷插入、GIF/Sticker选择器
 */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Send, Smile, Bold, Italic, Code, Link2, List,
  DollarSign, Image as ImageIcon, Sticker, X, Search,
  Eye, EyeOff, Hash, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { trpc } from "@/lib/trpc";

// ── Supported token symbols for inline $TOKEN mentions ──
const SUPPORTED_SYMBOLS = [
  "BTC", "ETH", "SOL", "DOGE", "USDT", "USDC", "BNB", "XRP",
  "ADA", "AVAX", "DOT", "LINK", "UNI", "MATIC", "ARB", "OP",
];

type TokenPriceEntry = { price: string; change: string; trend: "up" | "down" | "flat" };

function formatPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  return `$${p.toPrecision(4)}`;
}

function buildTokenPrices(data: { symbol: string; price: number; change: number }[] | undefined): Record<string, TokenPriceEntry> {
  const map: Record<string, TokenPriceEntry> = {};
  if (!data) return map;
  for (const coin of data) {
    const trend: "up" | "down" | "flat" = coin.change > 0.05 ? "up" : coin.change < -0.05 ? "down" : "flat";
    map[coin.symbol] = {
      price: formatPrice(coin.price),
      change: `${coin.change >= 0 ? "+" : ""}${coin.change.toFixed(1)}%`,
      trend,
    };
  }
  return map;
}

// ── Sticker packs ──
const STICKER_PACKS = [
  {
    name: "Crypto Moods",
    stickers: ["🚀", "💎🙌", "📈", "📉", "🐂", "🐻", "🌕", "💰", "🔥", "❄️", "⚡", "🎯"],
  },
  {
    name: "Reactions",
    stickers: ["😂", "🤣", "😭", "🥺", "😤", "🤯", "🥳", "😎", "🤝", "👏", "💪", "🙏"],
  },
  {
    name: "Web3",
    stickers: ["⛓️", "🔗", "🪙", "🏦", "📊", "🔐", "🌐", "🤖", "💻", "🎮", "🖼️", "🎨"],
  },
];

// ── GIF categories (mock) ──
const GIF_CATEGORIES = [
  { name: "Trending", gifs: ["https://media.giphy.com/media/trN9ht5RlE3Dcwavg2/giphy.gif", "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif"] },
  { name: "Crypto", gifs: ["https://media.giphy.com/media/JTzPN5kkobFv7X0zIJ/giphy.gif", "https://media.giphy.com/media/lQh95VIYba5yba2GcN/giphy.gif"] },
  { name: "Celebrate", gifs: ["https://media.giphy.com/media/g9582DNuQppxC/giphy.gif", "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif"] },
];

interface EnhancedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  className?: string;
}

export default function EnhancedInput({ value, onChange, onSend, placeholder, className }: EnhancedInputProps) {
  const { t } = useI18n();

  // Fetch live token prices from CoinGecko via backend (60s stale time)
  const { data: priceData } = trpc.trading.getPrices.useQuery(
    { symbols: SUPPORTED_SYMBOLS },
    { staleTime: 60_000, refetchInterval: 120_000 }
  );
  const TOKEN_PRICES = useMemo(() => buildTokenPrices(priceData), [priceData]);

  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [showStickerPanel, setShowStickerPanel] = useState(false);
  const [activeStickerTab, setActiveStickerTab] = useState<"sticker" | "gif">("sticker");
  const [activeStickerPack, setActiveStickerPack] = useState(0);
  const [showFormatBar, setShowFormatBar] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tokenDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-detect $TOKEN pattern
  useEffect(() => {
    const match = value.match(/\$([A-Za-z]{1,10})$/);
    if (match && match[1].length >= 1) {
      setTokenSearch(match[1].toUpperCase());
      setShowTokenDropdown(true);
    } else {
      setShowTokenDropdown(false);
      setTokenSearch("");
    }
  }, [value]);

  // Close token dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tokenDropdownRef.current && !tokenDropdownRef.current.contains(e.target as Node)) {
        setShowTokenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    // Show all supported symbols even if prices haven't loaded yet
    const allEntries = SUPPORTED_SYMBOLS.map(s => [s, TOKEN_PRICES[s] || { price: "...", change: "0.0%", trend: "flat" as const }] as [string, TokenPriceEntry]);
    if (!tokenSearch) return allEntries.slice(0, 6);
    return allEntries.filter(([symbol]) =>
      symbol.startsWith(tokenSearch)
    ).slice(0, 6);
  }, [tokenSearch, TOKEN_PRICES]);

  // Insert token price card
  const insertTokenPrice = useCallback((symbol: string) => {
    const price = TOKEN_PRICES[symbol];
    if (!price) return;
    // Replace $PARTIAL with the full token mention
    const newValue = value.replace(/\$[A-Za-z]*$/, `$${symbol} `);
    onChange(newValue);
    setShowTokenDropdown(false);
    inputRef.current?.focus();
  }, [value, onChange]);

  // Markdown formatting helpers
  const insertFormat = useCallback((prefix: string, suffix: string = "") => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const before = value.substring(0, start);
    const after = value.substring(end);
    const formatted = `${before}${prefix}${selected || "text"}${suffix || prefix}${after}`;
    onChange(formatted);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
    }, 10);
  }, [value, onChange]);

  // Simple markdown to HTML (for preview)
  const renderMarkdown = (text: string): string => {
    let html = text
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
      .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-secondary/60 text-neon-cyan text-xs font-mono">$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-neon-cyan underline">$1</a>')
      .replace(/\n/g, "<br/>");

    // Token price inline cards
    html = html.replace(/\$([A-Z]{2,10})/g, (match, symbol) => {
      const price = TOKEN_PRICES[symbol];
      if (!price) return match;
      const trendColor = price.trend === "up" ? "text-neon-green" : price.trend === "down" ? "text-neon-red" : "text-muted-foreground";
      return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary/50 border border-border/30 text-xs font-mono"><span class="font-bold">${symbol}</span><span class="${trendColor}">${price.price}</span><span class="${trendColor} text-[10px]">${price.change}</span></span>`;
    });

    return html;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
    // Tab to accept token suggestion
    if (e.key === "Tab" && showTokenDropdown && filteredTokens.length > 0) {
      e.preventDefault();
      insertTokenPrice(filteredTokens[0][0]);
    }
    // Escape to close panels
    if (e.key === "Escape") {
      setShowTokenDropdown(false);
      setShowStickerPanel(false);
      setShowFormatBar(false);
    }
  };

  const handleStickerSend = (sticker: string) => {
    onChange(sticker);
    setTimeout(() => onSend(), 50);
    setShowStickerPanel(false);
  };

  return (
    <div className={`relative ${className || ""}`}>
      {/* ── Markdown Format Bar ── */}
      <AnimatePresence>
        {showFormatBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-1.5"
          >
            <div className="flex items-center gap-0.5 p-1 rounded-xl bg-card/80 border border-border/20 backdrop-blur-sm">
              <button onClick={() => insertFormat("**")} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors" title="Bold">
                <Bold size={14} className="text-muted-foreground" />
              </button>
              <button onClick={() => insertFormat("*")} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors" title="Italic">
                <Italic size={14} className="text-muted-foreground" />
              </button>
              <button onClick={() => insertFormat("`")} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors" title="Code">
                <Code size={14} className="text-muted-foreground" />
              </button>
              <button onClick={() => insertFormat("[", "](url)")} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors" title="Link">
                <Link2 size={14} className="text-muted-foreground" />
              </button>
              <button onClick={() => insertFormat("- ")} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors" title="List">
                <List size={14} className="text-muted-foreground" />
              </button>
              <div className="w-px h-5 bg-border/30 mx-0.5" />
              <button
                onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${showMarkdownPreview ? "bg-neon-cyan/15 text-neon-cyan" : "hover:bg-secondary/60 text-muted-foreground"}`}
                title="Preview"
              >
                {showMarkdownPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Markdown Preview ── */}
      <AnimatePresence>
        {showMarkdownPreview && value.trim() && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-1.5"
          >
            <div className="p-2.5 rounded-xl bg-card/60 border border-neon-cyan/20 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Eye size={10} className="text-neon-cyan" />
                <span className="text-[9px] font-medium text-neon-cyan uppercase tracking-wider">{t("chat.markdownPreview") || "Preview"}</span>
              </div>
              <div
                className="text-sm text-foreground leading-relaxed break-words"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Token Price Dropdown ── */}
      <AnimatePresence>
        {showTokenDropdown && filteredTokens.length > 0 && (
          <motion.div
            ref={tokenDropdownRef}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            className="absolute bottom-full left-0 right-0 mb-1.5 rounded-xl bg-popover/95 backdrop-blur-xl border border-border/40 shadow-2xl overflow-hidden z-30"
          >
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/20">
              <DollarSign size={12} className="text-neon-cyan" />
              <span className="text-[10px] text-muted-foreground font-medium">{t("chat.tokenInsert") || "Insert token price"}</span>
              <span className="text-[9px] text-muted-foreground/60 ml-auto">Tab ↹</span>
            </div>
            {filteredTokens.map(([symbol, data]) => {
              const TrendIcon = data.trend === "up" ? TrendingUp : data.trend === "down" ? TrendingDown : Minus;
              const trendColor = data.trend === "up" ? "text-neon-green" : data.trend === "down" ? "text-neon-red" : "text-muted-foreground";
              return (
                <button
                  key={symbol}
                  onClick={() => insertTokenPrice(symbol)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/40 transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center text-xs font-bold font-mono">
                    {symbol.slice(0, 2)}
                  </span>
                  <div className="flex-1 text-left">
                    <span className="text-sm font-medium font-mono">${symbol}</span>
                  </div>
                  <span className="text-xs font-mono text-foreground">{data.price}</span>
                  <span className={`flex items-center gap-0.5 text-[11px] font-mono ${trendColor}`}>
                    <TrendIcon size={10} />
                    {data.change}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sticker / GIF Panel ── */}
      <AnimatePresence>
        {showStickerPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 240, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-1.5 rounded-xl bg-card/80 border border-border/20 backdrop-blur-sm"
          >
            {/* Tabs */}
            <div className="flex items-center border-b border-border/20">
              <button
                onClick={() => setActiveStickerTab("sticker")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  activeStickerTab === "sticker" ? "text-neon-cyan border-b-2 border-neon-cyan" : "text-muted-foreground"
                }`}
              >
                <Sticker size={14} />
                {t("chat.stickers") || "Stickers"}
              </button>
              <button
                onClick={() => setActiveStickerTab("gif")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                  activeStickerTab === "gif" ? "text-neon-purple border-b-2 border-neon-purple" : "text-muted-foreground"
                }`}
              >
                <ImageIcon size={14} />
                GIF
              </button>
              <button
                onClick={() => setShowStickerPanel(false)}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {activeStickerTab === "sticker" ? (
              <div className="flex flex-col h-[196px]">
                {/* Pack selector */}
                <div className="flex gap-1 px-2 py-1.5 border-b border-border/10">
                  {STICKER_PACKS.map((pack, i) => (
                    <button
                      key={pack.name}
                      onClick={() => setActiveStickerPack(i)}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                        activeStickerPack === i
                          ? "bg-neon-cyan/15 text-neon-cyan"
                          : "text-muted-foreground hover:bg-secondary/40"
                      }`}
                    >
                      {pack.name}
                    </button>
                  ))}
                </div>
                {/* Sticker grid */}
                <div className="flex-1 overflow-y-auto p-2">
                  <div className="grid grid-cols-6 gap-1">
                    {STICKER_PACKS[activeStickerPack]?.stickers.map((sticker, i) => (
                      <button
                        key={i}
                        onClick={() => handleStickerSend(sticker)}
                        className="aspect-square flex items-center justify-center rounded-xl hover:bg-secondary/50 active:scale-90 transition-all text-2xl"
                      >
                        {sticker}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-[196px]">
                {/* GIF search */}
                <div className="px-2 py-1.5 border-b border-border/10">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/40">
                    <Search size={12} className="text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t("chat.searchGif") || "Search GIFs..."}
                      className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>
                {/* GIF categories */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {GIF_CATEGORIES.map((cat) => (
                    <div key={cat.name}>
                      <p className="text-[10px] font-medium text-muted-foreground mb-1 px-1">{cat.name}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {cat.gifs.map((gif, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              onChange(`[GIF: ${cat.name}]`);
                              setTimeout(() => onSend(), 50);
                              setShowStickerPanel(false);
                            }}
                            className="aspect-video rounded-lg bg-secondary/40 border border-border/20 overflow-hidden hover:border-neon-purple/40 transition-colors flex items-center justify-center"
                          >
                            <span className="text-xs text-muted-foreground">GIF</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input Row ── */}
      <div className="flex items-end gap-1.5">
        {/* Format toggle */}
        <button
          onClick={() => { setShowFormatBar(!showFormatBar); setShowStickerPanel(false); }}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0 ${
            showFormatBar ? "bg-neon-cyan/15 text-neon-cyan" : "hover:bg-secondary/60 text-muted-foreground"
          }`}
          title="Markdown"
        >
          <Hash size={18} />
        </button>

        {/* Sticker/GIF toggle */}
        <button
          onClick={() => { setShowStickerPanel(!showStickerPanel); setShowFormatBar(false); }}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0 ${
            showStickerPanel ? "bg-neon-purple/15 text-neon-purple" : "hover:bg-secondary/60 text-muted-foreground"
          }`}
        >
          <Sticker size={18} />
        </button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t("chat.inputPlaceholder")}
            rows={1}
            className="w-full min-h-[40px] max-h-[100px] px-4 py-2.5 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all resize-none leading-5"
            style={{ height: Math.min(100, Math.max(40, (value.split("\n").length) * 20 + 20)) }}
          />
          {/* $TOKEN hint */}
          {value.endsWith("$") && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="text-[9px] text-muted-foreground/50 font-mono animate-pulse">{t("chat.typeToken") || "Type token..."}</span>
            </div>
          )}
        </div>

        {/* Send */}
        {value.trim() ? (
          <button
            onClick={onSend}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-all shrink-0"
          >
            <Send size={18} />
          </button>
        ) : (
          <button
            onClick={() => { setShowStickerPanel(!showStickerPanel); setShowFormatBar(false); }}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-all shrink-0"
          >
            <Smile size={18} className="text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
