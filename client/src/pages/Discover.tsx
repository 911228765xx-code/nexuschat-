/*
 * Discover — 发现页面
 * 三个Tab：社群 / 动态（朋友圈） / 推荐用户
 * Cyberpunk Noir风格
 */
import { useState, useRef } from "react";
import { Search, Users, Lock, Star, Globe, Heart, MessageSquare, Share2, Image, Send, MoreHorizontal, Repeat2, Bookmark, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";

/* ─── Types ─── */
interface Community {
  id: string;
  name: string;
  avatar: string;
  members: number;
  description: string;
  isTokenGated: boolean;
  gateToken?: string;
  category: string;
  isHot?: boolean;
}

interface TrendingUser {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  followers: number;
  isVerified: boolean;
}

interface MomentPost {
  id: string;
  author: { name: string; avatar: string; isVerified: boolean; handle: string };
  content: string;
  images?: string[];
  timestamp: string;
  likes: number;
  comments: number;
  reposts: number;
  isLiked: boolean;
  isBookmarked: boolean;
  tags?: string[];
}

/* ─── Mock Data ─── */
const mockCommunities: Community[] = [
  { id: "1", name: "BAYC Holders 🐵", avatar: "🐵", members: 8432, description: "Bored Ape Yacht Club official holders community", isTokenGated: true, gateToken: "BAYC NFT", category: "NFT", isHot: true },
  { id: "2", name: "DeFi Alpha Club 🔒", avatar: "🔑", members: 3210, description: "Professional DeFi strategy sharing & discussion", isTokenGated: true, gateToken: "≥100 UNI", category: "DeFi", isHot: true },
  { id: "3", name: "ETH Developers", avatar: "⟠", members: 12500, description: "Ethereum developer community", isTokenGated: false, category: "Dev" },
  { id: "4", name: "Solana Ecosystem", avatar: "◎", members: 9800, description: "Solana ecosystem projects & alpha sharing", isTokenGated: false, category: "L1" },
  { id: "5", name: "AI x Crypto", avatar: "🤖", members: 5600, description: "Exploring the intersection of AI and crypto", isTokenGated: false, category: "AI", isHot: true },
  { id: "6", name: "Azuki Holders", avatar: "⛩️", members: 4200, description: "Azuki NFT holders exclusive community", isTokenGated: true, gateToken: "Azuki NFT", category: "NFT" },
];

const mockUsers: TrendingUser[] = [
  { id: "1", name: "vitalik.eth", avatar: "V", bio: "Ethereum co-founder", followers: 5200000, isVerified: true },
  { id: "2", name: "punk6529.eth", avatar: "P", bio: "NFT collector & thought leader", followers: 890000, isVerified: true },
  { id: "3", name: "cobie.eth", avatar: "C", bio: "Crypto trader & analyst", followers: 720000, isVerified: true },
  { id: "4", name: "0xSisyphus", avatar: "S", bio: "DeFi researcher", followers: 340000, isVerified: false },
];

const mockMoments: MomentPost[] = [
  {
    id: "1",
    author: { name: "vitalik.eth", avatar: "V", isVerified: true, handle: "0x71C7...3a9b" },
    content: "Excited about the latest Ethereum upgrade! The transition to full danksharding is progressing well. Layer 2 fees are about to drop significantly. 🚀\n\nThis is a huge milestone for the ecosystem.",
    timestamp: "2h ago",
    likes: 12400,
    comments: 892,
    reposts: 3200,
    isLiked: false,
    isBookmarked: false,
    tags: ["#Ethereum", "#Danksharding"],
  },
  {
    id: "2",
    author: { name: "defi_whale.eth", avatar: "🐋", isVerified: true, handle: "0xA3F2...8c1d" },
    content: "Just spotted a massive $ETH accumulation by a new whale wallet. 15,000 ETH purchased in the last 24 hours. On-chain data doesn't lie. 👀\n\nSmart money is loading up.",
    timestamp: "4h ago",
    likes: 5670,
    comments: 423,
    reposts: 1890,
    isLiked: true,
    isBookmarked: false,
    tags: ["#OnChain", "#WhaleAlert"],
  },
  {
    id: "3",
    author: { name: "nft_artist.eth", avatar: "🎨", isVerified: false, handle: "0xB9E4...2f7a" },
    content: "Just minted my new generative art collection on-chain. Each piece is fully stored on Ethereum — no IPFS dependency. True digital permanence. ✨\n\nLink in bio for early access.",
    timestamp: "6h ago",
    likes: 2340,
    comments: 187,
    reposts: 560,
    isLiked: false,
    isBookmarked: true,
    tags: ["#NFT", "#GenerativeArt", "#OnChainArt"],
  },
  {
    id: "4",
    author: { name: "trader_pro.eth", avatar: "📊", isVerified: true, handle: "0xD5C1...9e3b" },
    content: "My copy trading strategy hit 340% ROI this quarter. Key insight: focus on BTC/ETH pairs during high volatility windows, use tight stop losses.\n\nFull breakdown thread below 🧵",
    timestamp: "8h ago",
    likes: 8920,
    comments: 1240,
    reposts: 4100,
    isLiked: false,
    isBookmarked: false,
    tags: ["#Trading", "#CopyTrading", "#Alpha"],
  },
  {
    id: "5",
    author: { name: "solana_dev.sol", avatar: "◎", isVerified: true, handle: "0xF8A2...1b4c" },
    content: "Solana just processed 65,000 TPS in the latest stress test without a single hiccup. The network reliability improvements are real.\n\nBuilding on Solana has never been better. 🔥",
    timestamp: "12h ago",
    likes: 4560,
    comments: 367,
    reposts: 1230,
    isLiked: false,
    isBookmarked: false,
    tags: ["#Solana", "#L1"],
  },
];

/* ─── Component ─── */
export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"moments" | "communities" | "users">("moments");
  const [moments, setMoments] = useState(mockMoments);
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState("");
  const { t } = useI18n();

  const categories = ["All", "NFT", "DeFi", "L1", "Dev", "AI"];

  const filteredCommunities = mockCommunities.filter(
    (c) =>
      (activeCategory === "All" || c.category === activeCategory) &&
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatNum = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const toggleLike = (id: string) => {
    setMoments((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, isLiked: !m.isLiked, likes: m.isLiked ? m.likes - 1 : m.likes + 1 }
          : m
      )
    );
  };

  const toggleBookmark = (id: string) => {
    setMoments((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, isBookmarked: !m.isBookmarked } : m
      )
    );
    toast("Bookmark updated");
  };

  const handlePublish = () => {
    if (!composeText.trim()) return;
    const newPost: MomentPost = {
      id: Date.now().toString(),
      author: { name: "me.eth", avatar: "🦊", isVerified: false, handle: "0x71C7...3a9b" },
      content: composeText,
      timestamp: "Just now",
      likes: 0,
      comments: 0,
      reposts: 0,
      isLiked: false,
      isBookmarked: false,
    };
    setMoments((prev) => [newPost, ...prev]);
    setComposeText("");
    setShowCompose(false);
    toast("Post published! 🎉");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-2 h-14">
          <Globe size={20} className="text-neon-cyan" />
          <h1 className="text-lg font-semibold font-display">{t("discover.title")}</h1>
        </div>

        {/* Search */}
        <div className="relative pb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-[calc(50%+6px)] text-muted-foreground" />
          <input
            type="text"
            placeholder={t("discover.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
          />
        </div>

        {/* Tabs: Moments / Communities / Users */}
        <div className="flex gap-0 pb-0">
          {(["moments", "communities", "users"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab
                  ? "border-neon-cyan text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {tab === "moments" ? (t("discover.moments") || "Moments") : tab === "communities" ? t("discover.communities") : t("discover.users")}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* ─── Moments Tab ─── */}
        {activeTab === "moments" && (
          <div className="pb-4">
            {/* Compose button */}
            <div className="px-4 py-3">
              <button
                onClick={() => setShowCompose(true)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card/50 border border-border/20 hover:border-neon-cyan/30 transition-all"
              >
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarFallback className="bg-neon-cyan/15 text-neon-cyan text-sm">🦊</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">{t("discover.whatsOnMind") || "What's on your mind?"}</span>
                <Image size={18} className="ml-auto text-muted-foreground" />
              </button>
            </div>

            {/* Moments Feed */}
            <div className="space-y-0">
              {moments.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-4 py-4 border-b border-border/10"
                >
                  {/* Author row */}
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-secondary text-base">{post.author.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold font-display truncate">{post.author.name}</span>
                        {post.author.isVerified && (
                          <Star size={12} className="text-neon-cyan fill-neon-cyan shrink-0" />
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono ml-1">{post.author.handle}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{post.timestamp}</span>

                      {/* Content */}
                      <p className="text-sm text-foreground mt-2 leading-relaxed whitespace-pre-line">{post.content}</p>

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {post.tags.map((tag) => (
                            <span key={tag} className="text-[11px] text-neon-cyan/80 hover:text-neon-cyan cursor-pointer">{tag}</span>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 mt-3 -ml-2">
                        <button
                          onClick={() => toast("Comments coming soon")}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all"
                        >
                          <MessageSquare size={15} />
                          <span className="text-[11px]">{formatNum(post.comments)}</span>
                        </button>
                        <button
                          onClick={() => toast("Repost coming soon")}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-neon-green hover:bg-neon-green/5 transition-all"
                        >
                          <Repeat2 size={15} />
                          <span className="text-[11px]">{formatNum(post.reposts)}</span>
                        </button>
                        <button
                          onClick={() => toggleLike(post.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                            post.isLiked
                              ? "text-neon-red"
                              : "text-muted-foreground hover:text-neon-red hover:bg-neon-red/5"
                          }`}
                        >
                          <Heart size={15} className={post.isLiked ? "fill-neon-red" : ""} />
                          <span className="text-[11px]">{formatNum(post.likes)}</span>
                        </button>
                        <button
                          onClick={() => toggleBookmark(post.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                            post.isBookmarked
                              ? "text-neon-purple"
                              : "text-muted-foreground hover:text-neon-purple hover:bg-neon-purple/5"
                          }`}
                        >
                          <Bookmark size={15} className={post.isBookmarked ? "fill-neon-purple" : ""} />
                        </button>
                        <button
                          onClick={() => { navigator.clipboard.writeText(post.content); toast("Copied to clipboard"); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all ml-auto"
                        >
                          <Share2 size={15} />
                        </button>
                      </div>
                    </div>
                    <button className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        )}

        {/* ─── Communities Tab ─── */}
        {activeTab === "communities" && (
          <>
            <div className="flex gap-2 px-4 py-3 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                      : "bg-secondary/40 text-muted-foreground border border-border/20 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="px-4 space-y-3 pb-4">
              {filteredCommunities.map((community, index) => (
                <motion.div
                  key={community.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="p-3.5 rounded-2xl bg-card/50 border border-border/20"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className={`w-12 h-12 shrink-0 ${community.isTokenGated ? "ring-2 ring-neon-purple/40" : ""}`}>
                      <AvatarFallback className="bg-secondary text-lg">{community.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold font-display truncate">{community.name}</span>
                        {community.isHot && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-neon-red/15 text-neon-red font-medium">HOT</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{community.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Users size={10} />
                          {community.members.toLocaleString()} {t("discover.members")}
                        </span>
                        {community.isTokenGated && (
                          <span className="text-[11px] text-neon-purple flex items-center gap-1">
                            <Lock size={10} />
                            {community.gateToken}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toast("Coming soon")}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan text-xs font-medium border border-neon-cyan/20 hover:bg-neon-cyan/25 transition-colors"
                    >
                      {t("discover.join")}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* ─── Users Tab ─── */}
        {activeTab === "users" && (
          <div className="px-4 py-3 space-y-3">
            {mockUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/50 border border-border/20"
              >
                <Avatar className="w-12 h-12 shrink-0">
                  <AvatarFallback className="bg-secondary text-lg font-display">{user.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold font-display truncate">{user.name}</span>
                    {user.isVerified && (
                      <Star size={12} className="text-neon-cyan fill-neon-cyan shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.bio}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatNum(user.followers)} followers
                  </p>
                </div>
                <button
                  onClick={() => toast("Coming soon")}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan text-xs font-medium border border-neon-cyan/20 hover:bg-neon-cyan/25 transition-colors"
                >
                  {t("discover.follow")}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Compose Modal ─── */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowCompose(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card border-t border-border/30 rounded-t-3xl p-4 space-y-4"
            >
              {/* Compose header */}
              <div className="flex items-center justify-between">
                <button onClick={() => setShowCompose(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
                <h3 className="text-sm font-semibold font-display">{t("discover.newPost") || "New Post"}</h3>
                <button
                  onClick={handlePublish}
                  disabled={!composeText.trim()}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    composeText.trim()
                      ? "bg-neon-cyan text-background hover:opacity-90"
                      : "bg-secondary/40 text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {t("discover.publish") || "Publish"}
                </button>
              </div>

              {/* Compose body */}
              <div className="flex gap-3">
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarFallback className="bg-neon-cyan/15 text-neon-cyan text-sm">🦊</AvatarFallback>
                </Avatar>
                <textarea
                  autoFocus
                  value={composeText}
                  onChange={(e) => setComposeText(e.target.value)}
                  placeholder={t("discover.whatsOnMind") || "What's on your mind?"}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[120px]"
                  maxLength={500}
                />
              </div>

              {/* Compose toolbar */}
              <div className="flex items-center justify-between border-t border-border/20 pt-3">
                <div className="flex gap-2">
                  <button onClick={() => toast("Image upload coming soon")} className="p-2 rounded-lg text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all">
                    <Image size={18} />
                  </button>
                </div>
                <span className={`text-[10px] font-mono ${composeText.length > 450 ? "text-neon-red" : "text-muted-foreground"}`}>
                  {composeText.length}/500
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
