/*
 * Discover — 发现页面
 * 三个Tab：动态（朋友圈） / 社群 / 推荐用户
 * 增强互动：点赞动画、评论输入框与评论列表
 * Cyberpunk Noir风格
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Users, Lock, Star, Globe, Heart, MessageSquare, Share2, Image, Send, MoreHorizontal, Repeat2, Bookmark, X, AtSign, Smile } from "lucide-react";
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

interface Comment {
  id: string;
  author: { name: string; avatar: string; };
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
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
  commentList: Comment[];
  showComments: boolean;
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

const mockComments: Record<string, Comment[]> = {
  "1": [
    { id: "c1", author: { name: "alice.eth", avatar: "A" }, content: "This is huge! Can't wait for the full rollout 🔥", timestamp: "1h ago", likes: 42, isLiked: false },
    { id: "c2", author: { name: "bob_trader", avatar: "B" }, content: "L2 fees dropping will bring so many new users to DeFi", timestamp: "1h ago", likes: 18, isLiked: true },
    { id: "c3", author: { name: "defi_dev.eth", avatar: "D" }, content: "Already testing on Holesky. The blob transactions are working great!", timestamp: "45m ago", likes: 8, isLiked: false },
  ],
  "2": [
    { id: "c4", author: { name: "crypto_analyst", avatar: "C" }, content: "Which wallet? Can you share the address?", timestamp: "3h ago", likes: 15, isLiked: false },
    { id: "c5", author: { name: "on_chain_sleuth", avatar: "O" }, content: "I tracked it too. Multiple wallets, all funded from the same source.", timestamp: "2h ago", likes: 31, isLiked: false },
  ],
  "3": [
    { id: "c6", author: { name: "art_collector", avatar: "🎭" }, content: "Beautiful work! Just minted #42. The generative patterns are mesmerizing.", timestamp: "5h ago", likes: 7, isLiked: false },
  ],
  "4": [
    { id: "c7", author: { name: "newbie_trader", avatar: "N" }, content: "What exchange do you use for copy trading?", timestamp: "7h ago", likes: 5, isLiked: false },
    { id: "c8", author: { name: "risk_manager", avatar: "R" }, content: "340% ROI is impressive but what's the max drawdown?", timestamp: "6h ago", likes: 22, isLiked: false },
    { id: "c9", author: { name: "trader_pro.eth", avatar: "📊" }, content: "@risk_manager Max drawdown was 12%. I use strict position sizing.", timestamp: "5h ago", likes: 35, isLiked: true },
  ],
  "5": [
    { id: "c10", author: { name: "sol_builder", avatar: "◎" }, content: "The Firedancer client is a game changer for reliability!", timestamp: "10h ago", likes: 11, isLiked: false },
  ],
};

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
    commentList: mockComments["1"] || [],
    showComments: false,
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
    commentList: mockComments["2"] || [],
    showComments: false,
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
    commentList: mockComments["3"] || [],
    showComments: false,
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
    commentList: mockComments["4"] || [],
    showComments: false,
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
    commentList: mockComments["5"] || [],
    showComments: false,
  },
];

/* ─── Like Animation Particles ─── */
function LikeParticles({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
          animate={{
            opacity: 0,
            scale: 0,
            x: (Math.random() - 0.5) * 40,
            y: -20 - Math.random() * 30,
          }}
          transition={{ duration: 0.6, delay: i * 0.05 }}
          className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: i % 2 === 0 ? "#ff4d6a" : "#ff8fa3" }}
        />
      ))}
    </div>
  );
}

/* ─── Extra Mock Data Generator ─── */
const extraAuthors = [
  { name: "whale_watcher.eth", avatar: "🐋", isVerified: true, handle: "0xC4D2...7f1a" },
  { name: "nft_degen.eth", avatar: "🎭", isVerified: false, handle: "0xE8B1...3c9d" },
  { name: "yield_farmer", avatar: "🌾", isVerified: true, handle: "0xA1F3...8e2b" },
  { name: "alpha_hunter.sol", avatar: "🎯", isVerified: true, handle: "0xD7C5...1a4f" },
  { name: "mev_bot.eth", avatar: "🤖", isVerified: false, handle: "0xB2E4...6d8c" },
  { name: "dao_governor", avatar: "🏛️", isVerified: true, handle: "0xF9A6...2b7e" },
  { name: "layer2_maxi", avatar: "⚡", isVerified: false, handle: "0x3C8D...9f1a" },
  { name: "defi_scientist", avatar: "🧪", isVerified: true, handle: "0x7E2B...4c6d" },
  { name: "crypto_punk.eth", avatar: "👾", isVerified: true, handle: "0x1A5F...8e3b" },
  { name: "zk_researcher", avatar: "🔐", isVerified: false, handle: "0x6D9C...2a7f" },
];

const extraContents = [
  "Just deployed a new lending protocol on Arbitrum. APY optimization through dynamic interest rate curves. Early depositors getting 15% boost. 🏦\n\nAudit by Trail of Bits complete.",
  "The merge between AI agents and DeFi is happening faster than expected. Autonomous trading bots now manage $2B+ in TVL across chains. 🤖💰",
  "Hot take: L2s will eventually settle on a shared sequencer model. Decentralization at the base layer, efficiency at the execution layer. The endgame is clear.",
  "New governance proposal for our DAO: allocate 5% of treasury to public goods funding. If you hold tokens, please vote! Every voice matters. 🗳️",
  "Just bridged 50 ETH to zkSync Era. The UX improvements in the latest update are incredible — feels like using a native L1. Zero-knowledge proofs FTW! ⚡",
  "Unpopular opinion: Most NFT collections will go to zero, but the technology itself will revolutionize digital ownership. Focus on utility, not speculation.",
  "Breaking: Major CEX just listed our token! 6 months of building in silence, and now the market is finally noticing. LFG! 🚀\n\nFundamentals always win.",
  "Deep dive into Eigenlayer restaking economics: the risk-reward profile is asymmetric in favor of early restakers. Here's my analysis thread 🧵",
  "Built a MEV protection system using Flashbots. Saved users $1.2M in the first week alone. Open-sourcing the code next month. 🛡️",
  "The next bull run will be driven by RWA tokenization. Real estate, bonds, commodities — all on-chain. Traditional finance is not ready for this disruption.",
  "Attended ETHDenver and the energy was unreal. Met 50+ builders working on privacy-preserving DeFi. The future of finance is private by default. 🏔️",
  "Staking rewards just hit 8.2% APR on our validator. Running since the Beacon Chain genesis — 847 days of perfect uptime. Consistency is key. ✅",
  "New research paper: 'Optimal AMM Design for Concentrated Liquidity'. Found that dynamic fee tiers can reduce IL by up to 40%. Link in bio. 📊",
  "The intersection of gaming and DeFi is massively underexplored. Imagine earning yield while playing — not through ponzinomics, but real economic activity.",
  "Just completed my first ZK circuit! Proving that I'm over 18 without revealing my age. Privacy is a fundamental right, and ZK makes it possible. 🔒",
];

const extraTags = [
  ["#DeFi", "#Arbitrum"], ["#AI", "#Trading"], ["#L2", "#Sequencer"],
  ["#DAO", "#Governance"], ["#zkSync", "#ZKProofs"], ["#NFT", "#DigitalOwnership"],
  ["#CEX", "#Listing"], ["#Eigenlayer", "#Restaking"], ["#MEV", "#Flashbots"],
  ["#RWA", "#Tokenization"], ["#ETHDenver", "#Privacy"], ["#Staking", "#Validator"],
  ["#AMM", "#Research"], ["#Gaming", "#GameFi"], ["#ZK", "#Privacy"],
];

function generateMorePosts(page: number, pageSize: number = 5): MomentPost[] {
  return Array.from({ length: pageSize }, (_, i) => {
    const idx = (page * pageSize + i) % extraContents.length;
    const authorIdx = (page * pageSize + i) % extraAuthors.length;
    const timeHours = 12 + page * 6 + i * 2;
    return {
      id: `gen-${page}-${i}`,
      author: extraAuthors[authorIdx],
      content: extraContents[idx],
      timestamp: `${timeHours}h ago`,
      likes: Math.floor(Math.random() * 8000) + 200,
      comments: Math.floor(Math.random() * 500) + 10,
      reposts: Math.floor(Math.random() * 2000) + 50,
      isLiked: Math.random() > 0.7,
      isBookmarked: Math.random() > 0.85,
      tags: extraTags[idx],
      commentList: [],
      showComments: false,
    };
  });
}

/* ─── Component ─── */
export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"moments" | "communities" | "users">("moments");
  const [moments, setMoments] = useState(mockMoments);
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [commentInputId, setCommentInputId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [likeAnimations, setLikeAnimations] = useState<Record<string, boolean>>({});
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const commentInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [composeImages, setComposeImages] = useState<string[]>([]);
  const { t } = useI18n();

  // ─── Infinite Scroll State ───
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const MAX_PAGES = 6; // Total ~35 posts

  // ─── Intersection Observer for infinite scroll ───
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    // Simulate network delay
    setTimeout(() => {
      const nextPage = page + 1;
      if (nextPage >= MAX_PAGES) {
        setHasMore(false);
      } else {
        const newPosts = generateMorePosts(nextPage);
        setMoments(prev => [...prev, ...newPosts]);
        setPage(nextPage);
      }
      setIsLoadingMore(false);
    }, 800 + Math.random() * 600);
  }, [isLoadingMore, hasMore, page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && activeTab === "moments") {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );
    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [handleLoadMore, activeTab]);

  // ─── Pull to refresh ───
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setMoments(mockMoments);
      setPage(0);
      setHasMore(true);
      setIsRefreshing(false);
      toast(t("discover.refreshed") || "Feed refreshed!");
    }, 1000);
  }, [t]);

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

  useEffect(() => {
    if (commentInputId && commentInputRef.current) {
      commentInputRef.current.focus();
    }
  }, [commentInputId]);

  const toggleLike = (id: string) => {
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        if (!m.isLiked) {
          // Trigger particle animation
          setLikeAnimations((a) => ({ ...a, [id]: true }));
          setTimeout(() => setLikeAnimations((a) => ({ ...a, [id]: false })), 700);
        }
        return { ...m, isLiked: !m.isLiked, likes: m.isLiked ? m.likes - 1 : m.likes + 1 };
      })
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

  const toggleComments = (id: string) => {
    setMoments((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, showComments: !m.showComments } : m
      )
    );
    // If opening comments, also open the comment input
    const post = moments.find((m) => m.id === id);
    if (post && !post.showComments) {
      setCommentInputId(id);
    } else {
      setCommentInputId(null);
    }
  };

  const openCommentInput = (id: string) => {
    // Ensure comments are visible
    setMoments((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, showComments: true } : m
      )
    );
    setCommentInputId(id);
    setCommentText("");
  };

  const submitComment = (postId: string) => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: `new-${Date.now()}`,
      author: { name: "me.eth", avatar: "🦊" },
      content: commentText,
      timestamp: t("discover.justNow") || "Just now",
      likes: 0,
      isLiked: false,
    };
    setMoments((prev) =>
      prev.map((m) =>
        m.id === postId
          ? { ...m, commentList: [...m.commentList, newComment], comments: m.comments + 1 }
          : m
      )
    );
    setCommentText("");
    toast(t("discover.commentSent") || "Comment posted! 💬");
  };

  const toggleCommentLike = (postId: string, commentId: string) => {
    setMoments((prev) =>
      prev.map((m) =>
        m.id === postId
          ? {
              ...m,
              commentList: m.commentList.map((c) =>
                c.id === commentId
                  ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
                  : c
              ),
            }
          : m
      )
    );
  };

  const handlePublish = () => {
    if (!composeText.trim()) return;
    const newPost: MomentPost = {
      id: Date.now().toString(),
      author: { name: "me.eth", avatar: "🦊", isVerified: false, handle: "0x71C7...3a9b" },
      content: composeText,
      timestamp: t("discover.justNow") || "Just now",
      likes: 0,
      comments: 0,
      reposts: 0,
      isLiked: false,
      isBookmarked: false,
      commentList: [],
      showComments: false,
    };
    setMoments((prev) => [newPost, ...prev]);
    setComposeText("");
    setShowCompose(false);
    toast(t("discover.postPublished") || "Post published! 🎉");
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

            {/* Pull to refresh indicator */}
            {isRefreshing && (
              <div className="flex items-center justify-center py-4 gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full"
                />
                <span className="text-xs text-muted-foreground">{t("discover.refreshing") || "Refreshing..."}</span>
              </div>
            )}

            {/* Moments Feed */}
            <div className="space-y-0">
              {moments.map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.3) }}
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
                        {/* Comment button */}
                        <button
                          onClick={() => openCommentInput(post.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all"
                        >
                          <MessageSquare size={15} />
                          <span className="text-[11px]">{formatNum(post.comments)}</span>
                        </button>
                        {/* Repost button */}
                        <button
                          onClick={() => {
                            setMoments(prev => prev.map(m => m.id === post.id ? { ...m, reposts: m.reposts + 1 } : m));
                            toast.success(t("discover.reposted") || "Reposted to your timeline");
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-neon-green hover:bg-neon-green/5 transition-all"
                        >
                          <Repeat2 size={15} />
                          <span className="text-[11px]">{formatNum(post.reposts)}</span>
                        </button>
                        {/* Like button with animation */}
                        <div className="relative">
                          <button
                            onClick={() => toggleLike(post.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
                              post.isLiked
                                ? "text-neon-red"
                                : "text-muted-foreground hover:text-neon-red hover:bg-neon-red/5"
                            }`}
                          >
                            <motion.div
                              animate={post.isLiked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                            >
                              <Heart size={15} className={post.isLiked ? "fill-neon-red" : ""} />
                            </motion.div>
                            <span className="text-[11px]">{formatNum(post.likes)}</span>
                          </button>
                          <LikeParticles show={likeAnimations[post.id] || false} />
                        </div>
                        {/* Bookmark */}
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
                        {/* Share */}
                        <button
                          onClick={() => { navigator.clipboard.writeText(post.content); toast(t("discover.copied") || "Copied to clipboard"); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all ml-auto"
                        >
                          <Share2 size={15} />
                        </button>
                      </div>

                      {/* ─── Comments Section ─── */}
                      <AnimatePresence>
                        {post.showComments && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-border/10 space-y-3">
                              {/* Comment list */}
                              {post.commentList.length > 0 ? (
                                post.commentList.map((comment) => (
                                  <div key={comment.id} className="flex gap-2.5 group">
                                    <Avatar className="w-7 h-7 shrink-0">
                                      <AvatarFallback className="bg-secondary/60 text-[10px]">{comment.author.avatar}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-xs font-semibold text-foreground">{comment.author.name}</span>
                                        <span className="text-[9px] text-muted-foreground">{comment.timestamp}</span>
                                      </div>
                                      <p className="text-xs text-foreground/90 mt-0.5 leading-relaxed">{comment.content}</p>
                                      <div className="flex items-center gap-3 mt-1">
                                        <button
                                          onClick={() => toggleCommentLike(post.id, comment.id)}
                                          className={`flex items-center gap-1 text-[10px] transition-colors ${
                                            comment.isLiked ? "text-neon-red" : "text-muted-foreground hover:text-neon-red"
                                          }`}
                                        >
                                          <Heart size={10} className={comment.isLiked ? "fill-neon-red" : ""} />
                                          {comment.likes > 0 && <span>{comment.likes}</span>}
                                        </button>
                                        <button
                                          onClick={() => { setCommentText(`@${comment.author.name} `); setCommentInputId(post.id); }}
                                          className="text-[10px] text-muted-foreground hover:text-neon-cyan transition-colors"
                                        >
                                          {t("discover.reply") || "Reply"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">{t("discover.noComments") || "No comments yet. Be the first!"}</p>
                              )}

                              {/* View more comments link */}
                              {post.comments > post.commentList.length && (
                                <button className="text-[11px] text-neon-cyan hover:underline">
                                  {t("discover.viewMore") || `View all ${post.comments} comments`}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ─── Comment Input ─── */}
                      <AnimatePresence>
                        {commentInputId === post.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-2 mt-3 pt-2">
                              <Avatar className="w-7 h-7 shrink-0">
                                <AvatarFallback className="bg-neon-cyan/15 text-neon-cyan text-[10px]">🦊</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 flex items-center gap-1.5 bg-secondary/40 rounded-full px-3 py-1.5 border border-border/20 focus-within:border-neon-cyan/30 transition-colors">
                                <input
                                  ref={commentInputRef}
                                  type="text"
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") submitComment(post.id); }}
                                  placeholder={t("discover.writeComment") || "Write a comment..."}
                                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                                />
                                <button
                                  onClick={() => { setCommentText(commentText + "@"); }}
                                  className="p-0.5 text-muted-foreground hover:text-neon-cyan transition-colors"
                                >
                                  <AtSign size={13} />
                                </button>
                              </div>
                              <button
                                onClick={() => submitComment(post.id)}
                                disabled={!commentText.trim()}
                                className={`p-1.5 rounded-full transition-all ${
                                  commentText.trim()
                                    ? "bg-neon-cyan text-background hover:opacity-90"
                                    : "bg-secondary/40 text-muted-foreground cursor-not-allowed"
                                }`}
                              >
                                <Send size={13} />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button className="shrink-0 p-1 text-muted-foreground hover:text-foreground">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>

            {/* ─── Load More / Infinite Scroll Trigger ─── */}
            <div ref={loadMoreRef} className="py-6">
              {isLoadingMore && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [-3, 3, -3] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                        className="w-2 h-2 rounded-full bg-neon-cyan/60"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{t("discover.loadingMore") || "Loading more posts..."}</span>
                </div>
              )}
              {!hasMore && moments.length > 5 && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="w-12 h-px bg-border/40" />
                  <span className="text-xs text-muted-foreground">{t("discover.noMorePosts") || "You've reached the end"}</span>
                  <button
                    onClick={handleRefresh}
                    className="text-xs text-neon-cyan hover:underline mt-1"
                  >
                    {t("discover.backToTop") || "Back to top"}
                  </button>
                </div>
              )}
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
                      onClick={() => {
                        setJoinedCommunities(prev => {
                          const next = new Set(prev);
                          if (next.has(community.id)) next.delete(community.id); else next.add(community.id);
                          return next;
                        });
                        toast.success(joinedCommunities.has(community.id) ? (t("discover.leftCommunity") || "Left community") : (t("discover.joinedCommunity") || "Joined!"));
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        joinedCommunities.has(community.id)
                          ? "bg-secondary/60 text-muted-foreground border-border/30 hover:bg-secondary/80"
                          : "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/20 hover:bg-neon-cyan/25"
                      }`}
                    >
                      {joinedCommunities.has(community.id) ? (t("discover.joined") || "Joined") : t("discover.join")}
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
                  onClick={() => {
                    setFollowedUsers(prev => {
                      const next = new Set(prev);
                      if (next.has(user.id)) next.delete(user.id); else next.add(user.id);
                      return next;
                    });
                    toast.success(followedUsers.has(user.id) ? (t("discover.unfollowed") || "Unfollowed") : (t("discover.followed") || "Followed!"));
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    followedUsers.has(user.id)
                      ? "bg-secondary/60 text-muted-foreground border-border/30 hover:bg-secondary/80"
                      : "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/20 hover:bg-neon-cyan/25"
                  }`}
                >
                  {followedUsers.has(user.id) ? (t("discover.following") || "Following") : t("discover.follow")}
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
                  <button onClick={() => imageUploadRef.current?.click()} className="p-2 rounded-lg text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all">
                    <Image size={18} />
                  </button>
                  <input
                    ref={imageUploadRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        Array.from(files).forEach(f => {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) setComposeImages(prev => [...prev, ev.target!.result as string]);
                          };
                          reader.readAsDataURL(f);
                        });
                      }
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                  {composeImages.length > 0 && (
                    <div className="flex gap-1 ml-2">
                      {composeImages.map((img, i) => (
                        <div key={i} className="relative w-8 h-8 rounded overflow-hidden">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => setComposeImages(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                            <X size={8} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
