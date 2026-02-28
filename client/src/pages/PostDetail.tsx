/**
 * PostDetail — 帖子详情页
 * 完整评论流 + 引用/转发功能
 * Cyberpunk Noir: 深色背景 + 霓虹强调色
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft, Heart, MessageSquare, Repeat2, Share2, Bookmark,
  Star, MoreHorizontal, Send, AtSign, X, Quote, ChevronDown,
  CheckCircle2, Copy, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

/* ─── Types ─── */
interface Comment {
  id: string;
  author: { name: string; avatar: string; isVerified?: boolean };
  content: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
  quotedPost?: { author: string; content: string };
}

interface PostData {
  id: string;
  author: { name: string; avatar: string; isVerified: boolean; handle: string; bio?: string; followers?: number };
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
const mockPostsData: Record<string, PostData> = {
  "1": {
    id: "1",
    author: { name: "vitalik.eth", avatar: "V", isVerified: true, handle: "0x71C7...3a9b", bio: "Ethereum co-founder. Building the future of decentralized internet.", followers: 5200000 },
    content: "Excited about the latest Ethereum upgrade! The transition to full danksharding is progressing well. Layer 2 fees are about to drop significantly. 🚀\n\nThis is a huge milestone for the ecosystem. The blob transactions introduced in EIP-4844 have already reduced L2 fees by 10x. Full danksharding will take this even further.\n\nKey benefits:\n• L2 fees drop to near-zero\n• Throughput increases 100x\n• Decentralization maintained\n\nThe future of Ethereum is bright. We're building something that will last for generations.",
    timestamp: "2h ago",
    likes: 12400,
    comments: 892,
    reposts: 3200,
    isLiked: false,
    isBookmarked: false,
    tags: ["#Ethereum", "#Danksharding", "#L2", "#EIP4844"],
  },
  "2": {
    id: "2",
    author: { name: "defi_whale.eth", avatar: "🐋", isVerified: true, handle: "0xA3F2...8c1d", bio: "On-chain analyst. Following whale wallets since 2017.", followers: 340000 },
    content: "Just spotted a massive $ETH accumulation by a new whale wallet. 15,000 ETH purchased in the last 24 hours. On-chain data doesn't lie. 👀\n\nSmart money is loading up.\n\nWallet: 0x7f3a...9b2c\nTotal ETH: 15,247\nAvg buy price: $3,420\nSource: Multiple CEX withdrawals\n\nThis pattern matches the accumulation behavior we saw before the 2021 bull run. Worth watching closely.",
    timestamp: "4h ago",
    likes: 5670,
    comments: 423,
    reposts: 1890,
    isLiked: true,
    isBookmarked: false,
    tags: ["#OnChain", "#WhaleAlert", "#ETH"],
  },
  "3": {
    id: "3",
    author: { name: "nft_artist.eth", avatar: "🎨", isVerified: false, handle: "0xB9E4...2f7a", bio: "Generative artist. All work stored fully on-chain.", followers: 45000 },
    content: "Just minted my new generative art collection on-chain. Each piece is fully stored on Ethereum — no IPFS dependency. True digital permanence. ✨\n\nLink in bio for early access.\n\nCollection: 'Quantum Fragments'\n• 256 unique pieces\n• Fully on-chain SVG\n• No external dependencies\n• Mint price: 0.05 ETH\n\nEach piece is generated from a unique seed derived from the minter's wallet address. No two pieces are alike.",
    timestamp: "6h ago",
    likes: 2340,
    comments: 187,
    reposts: 560,
    isLiked: false,
    isBookmarked: true,
    tags: ["#NFT", "#GenerativeArt", "#OnChainArt"],
  },
  "4": {
    id: "4",
    author: { name: "trader_pro.eth", avatar: "📊", isVerified: true, handle: "0xD5C1...9e3b", bio: "Professional trader. 5 years in crypto. Sharing alpha.", followers: 890000 },
    content: "My copy trading strategy hit 340% ROI this quarter. Key insight: focus on BTC/ETH pairs during high volatility windows, use tight stop losses.\n\nFull breakdown thread below 🧵\n\n1/ The core strategy: Enter during high volatility windows (ATR > 2x 20-period average). This filters out noise and captures real momentum moves.\n\n2/ Position sizing: Never risk more than 2% of portfolio per trade. This sounds conservative but it's what keeps you in the game long-term.\n\n3/ Stop losses: Set at 1.5x ATR below entry. This gives the trade room to breathe while limiting downside.\n\n4/ Take profits: Scale out at 1:2 and 1:3 risk/reward. Never let a winner turn into a loser.",
    timestamp: "8h ago",
    likes: 8920,
    comments: 1240,
    reposts: 4100,
    isLiked: false,
    isBookmarked: false,
    tags: ["#Trading", "#CopyTrading", "#Alpha", "#BTC", "#ETH"],
  },
  "5": {
    id: "5",
    author: { name: "solana_dev.sol", avatar: "◎", isVerified: true, handle: "0xF8A2...1b4c", bio: "Solana core contributor. Building fast.", followers: 120000 },
    content: "Solana just processed 65,000 TPS in the latest stress test without a single hiccup. The network reliability improvements are real.\n\nBuilding on Solana has never been better. 🔥\n\nKey improvements in the latest release:\n• Turbine block propagation 3x faster\n• QUIC networking reduces packet loss by 80%\n• Firedancer client adds redundancy\n• Stake-weighted QoS prevents spam\n\nThe days of network outages are behind us. Solana is ready for mainstream adoption.",
    timestamp: "12h ago",
    likes: 4560,
    comments: 367,
    reposts: 1230,
    isLiked: false,
    isBookmarked: false,
    tags: ["#Solana", "#L1", "#TPS"],
  },
};

const mockCommentsData: Record<string, Comment[]> = {
  "1": [
    {
      id: "c1",
      author: { name: "alice.eth", avatar: "A", isVerified: false },
      content: "This is huge! Can't wait for the full rollout 🔥 The L2 ecosystem is going to explode once fees drop to near-zero.",
      timestamp: "1h ago",
      likes: 42,
      isLiked: false,
    },
    {
      id: "c2",
      author: { name: "bob_trader", avatar: "B", isVerified: true },
      content: "L2 fees dropping will bring so many new users to DeFi. We're talking about onboarding the next billion users.",
      timestamp: "1h ago",
      likes: 18,
      isLiked: true,
      quotedPost: { author: "vitalik.eth", content: "Layer 2 fees are about to drop significantly. 🚀" },
    },
    {
      id: "c3",
      author: { name: "defi_dev.eth", avatar: "D", isVerified: false },
      content: "Already testing on Holesky. The blob transactions are working great! Deployed a new rollup yesterday and the cost savings are insane.",
      timestamp: "45m ago",
      likes: 8,
      isLiked: false,
    },
    {
      id: "c4",
      author: { name: "crypto_researcher", avatar: "C", isVerified: true },
      content: "The technical implementation is elegant. Using KZG commitments for data availability is a brilliant solution to the scalability trilemma.",
      timestamp: "30m ago",
      likes: 31,
      isLiked: false,
    },
    {
      id: "c5",
      author: { name: "layer2_maxi", avatar: "⚡", isVerified: false },
      content: "Been building on Optimism for 2 years. The difference in UX with cheaper fees is night and day. Users actually stay when gas isn't $50.",
      timestamp: "20m ago",
      likes: 15,
      isLiked: false,
    },
    {
      id: "c6",
      author: { name: "zk_researcher", avatar: "🔐", isVerified: true },
      content: "The path to full danksharding via PeerDAS is clever. Distributing data availability sampling across the P2P network without requiring every node to download all blobs.",
      timestamp: "15m ago",
      likes: 27,
      isLiked: false,
    },
  ],
  "2": [
    {
      id: "c7",
      author: { name: "crypto_analyst", avatar: "C", isVerified: false },
      content: "Which wallet? Can you share the address? I want to track it on Etherscan.",
      timestamp: "3h ago",
      likes: 15,
      isLiked: false,
    },
    {
      id: "c8",
      author: { name: "on_chain_sleuth", avatar: "O", isVerified: true },
      content: "I tracked it too. Multiple wallets, all funded from the same source. This looks like institutional accumulation, not retail.",
      timestamp: "2h ago",
      likes: 31,
      isLiked: false,
    },
    {
      id: "c9",
      author: { name: "defi_whale.eth", avatar: "🐋", isVerified: true },
      content: "Wallet address: 0x7f3a...9b2c. You can track it on Nansen or Arkham. The pattern is clear — this is a new institutional player entering the market.",
      timestamp: "1h ago",
      likes: 89,
      isLiked: false,
    },
  ],
  "3": [
    {
      id: "c10",
      author: { name: "art_collector", avatar: "🎭", isVerified: false },
      content: "Beautiful work! Just minted #42. The generative patterns are mesmerizing. The way the colors shift based on the seed is incredible.",
      timestamp: "5h ago",
      likes: 7,
      isLiked: false,
    },
    {
      id: "c11",
      author: { name: "nft_degen.eth", avatar: "🎨", isVerified: false },
      content: "Fully on-chain is the only way. IPFS is a centralization risk. Love that you're doing it right.",
      timestamp: "4h ago",
      likes: 12,
      isLiked: false,
    },
  ],
  "4": [
    {
      id: "c12",
      author: { name: "newbie_trader", avatar: "N", isVerified: false },
      content: "What exchange do you use for copy trading? Is this available on Binance or do you use a DEX?",
      timestamp: "7h ago",
      likes: 5,
      isLiked: false,
    },
    {
      id: "c13",
      author: { name: "risk_manager", avatar: "R", isVerified: true },
      content: "340% ROI is impressive but what's the max drawdown? Risk-adjusted returns matter more than raw returns.",
      timestamp: "6h ago",
      likes: 22,
      isLiked: false,
    },
    {
      id: "c14",
      author: { name: "trader_pro.eth", avatar: "📊", isVerified: true },
      content: "@risk_manager Max drawdown was 12%. I use strict position sizing — never more than 2% risk per trade. The key is surviving long enough to compound.",
      timestamp: "5h ago",
      likes: 35,
      isLiked: true,
    },
    {
      id: "c15",
      author: { name: "quant_dev.eth", avatar: "🤖", isVerified: false },
      content: "Have you backtested this strategy? What's the Sharpe ratio? Would love to see the full stats.",
      timestamp: "4h ago",
      likes: 18,
      isLiked: false,
    },
  ],
  "5": [
    {
      id: "c16",
      author: { name: "sol_builder", avatar: "◎", isVerified: false },
      content: "The Firedancer client is a game changer for reliability! Having a second independent implementation removes the single point of failure.",
      timestamp: "10h ago",
      likes: 11,
      isLiked: false,
    },
    {
      id: "c17",
      author: { name: "eth_maxi", avatar: "⟠", isVerified: false },
      content: "Impressive numbers but let's see how it holds up under real mainnet conditions with full DeFi activity.",
      timestamp: "9h ago",
      likes: 8,
      isLiked: false,
    },
    {
      id: "c18",
      author: { name: "solana_dev.sol", avatar: "◎", isVerified: true },
      content: "@eth_maxi Fair point. The stress test was under controlled conditions. Real mainnet is always the true test. We're confident but staying humble.",
      timestamp: "8h ago",
      likes: 24,
      isLiked: false,
    },
  ],
};

/* ─── Repost/Quote Modal ─── */
function RepostModal({
  post,
  onClose,
  onRepost,
  onQuote,
}: {
  post: PostData;
  onClose: () => void;
  onRepost: () => void;
  onQuote: (text: string) => void;
}) {
  const [mode, setMode] = useState<"choose" | "quote">("choose");
  const [quoteText, setQuoteText] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-card border-t border-border/30 rounded-t-3xl p-4"
      >
        {mode === "choose" ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold font-display text-center mb-4">Repost</h3>
            <button
              onClick={() => { onRepost(); onClose(); }}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
            >
              <Repeat2 size={20} className="text-neon-green" />
              <div className="text-left">
                <p className="text-sm font-medium">Repost</p>
                <p className="text-xs text-muted-foreground">Share to your timeline instantly</p>
              </div>
            </button>
            <button
              onClick={() => setMode("quote")}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
            >
              <Quote size={20} className="text-neon-cyan" />
              <div className="text-left">
                <p className="text-sm font-medium">Quote Post</p>
                <p className="text-xs text-muted-foreground">Add your own commentary</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setMode("choose")} className="p-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft size={18} />
              </button>
              <h3 className="text-sm font-semibold font-display flex-1 text-center">Quote Post</h3>
              <button
                onClick={() => { if (quoteText.trim()) { onQuote(quoteText); onClose(); } }}
                disabled={!quoteText.trim()}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  quoteText.trim() ? "bg-neon-cyan text-background" : "bg-secondary/40 text-muted-foreground cursor-not-allowed"
                }`}
              >
                Post
              </button>
            </div>
            {/* Quote compose area */}
            <div className="flex gap-2">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="bg-neon-cyan/15 text-neon-cyan text-xs">🦊</AvatarFallback>
              </Avatar>
              <textarea
                autoFocus
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Add your commentary..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[80px]"
                maxLength={280}
              />
            </div>
            {/* Quoted post preview */}
            <div className="rounded-xl border border-border/30 p-3 bg-secondary/20">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="bg-secondary text-[9px]">{post.author.avatar}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{post.author.name}</span>
                {post.author.isVerified && <Star size={10} className="text-neon-cyan fill-neon-cyan" />}
                <span className="text-[10px] text-muted-foreground">{post.author.handle}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">{post.content}</p>
            </div>
            <div className="flex justify-end">
              <span className={`text-[10px] font-mono ${quoteText.length > 250 ? "text-neon-red" : "text-muted-foreground"}`}>
                {quoteText.length}/280
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { t } = useI18n();

  const postId = id || "1";
  const numericPostId = parseInt(postId, 10);
  const isNumericId = !isNaN(numericPostId);
  const { user } = useAuth();

  // Fallback to mock data for non-numeric IDs (demo mode)
  const postData = mockPostsData[postId] || mockPostsData["1"];
  const initialComments = mockCommentsData[postId] || mockCommentsData["1"] || [];

  const [post, setPost] = useState<PostData>(postData);
  const [comments, setComments] = useState<Comment[]>(initialComments);

  // tRPC: load real post data
  const { data: serverPost } = trpc.posts.getById.useQuery(
    { postId: numericPostId },
    { enabled: isNumericId }
  );

  // tRPC: load real comments
  const { data: serverComments } = trpc.posts.getComments.useQuery(
    { postId: numericPostId, limit: 50 },
    { enabled: isNumericId, refetchInterval: 30000 }
  );

  // Merge server post into local state
  useEffect(() => {
    if (!serverPost) return;
    setPost({
      id: String(serverPost.id),
      author: {
        name: serverPost.authorName ?? "Anonymous",
        handle: serverPost.authorUsername ? `@${serverPost.authorUsername}` : "@anon",
        avatar: serverPost.authorAvatar ?? "🦊",
        isVerified: false,
        followers: 0,
      },
      content: serverPost.content,
      timestamp: new Date(serverPost.createdAt).toLocaleString("zh-CN"),
      likes: serverPost.likeCount,
      comments: serverPost.commentCount,
      reposts: serverPost.shareCount,
      isLiked: serverPost.isLiked,
      isBookmarked: false,
      images: serverPost.mediaUrls.length > 0 ? serverPost.mediaUrls : undefined,
      tags: serverPost.tags,
    });
  }, [serverPost]);

  // Merge server comments into local state
  useEffect(() => {
    if (!serverComments || serverComments.length === 0) return;
    const mapped: Comment[] = serverComments.map((c) => ({
      id: String(c.id),
      author: {
        name: c.authorName ?? "Anonymous",
        avatar: c.authorAvatar ?? "🦊",
        isVerified: false,
      },
      content: c.content,
      timestamp: new Date(c.createdAt).toLocaleString("zh-CN"),
      likes: 0,
      isLiked: false,
    }));
    setComments(mapped);
  }, [serverComments]);

  // tRPC mutations
  const toggleLikeMutation = trpc.posts.toggleLike.useMutation();
  const addCommentMutation = trpc.posts.addComment.useMutation();
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    commentInputRef.current?.focus();
  }, [replyTo]);

  const formatNum = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const toggleLike = () => {
    // Optimistic update
    setPost(p => ({ ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }));
    // Persist to backend
    if (isNumericId) {
      toggleLikeMutation.mutate({ postId: numericPostId });
    }
  };

  const toggleBookmark = () => {
    setPost(p => ({ ...p, isBookmarked: !p.isBookmarked }));
    toast(post.isBookmarked ? "Removed from bookmarks" : "Saved to bookmarks");
  };

  const toggleCommentLike = (commentId: string) => {
    setComments(prev => prev.map(c =>
      c.id === commentId ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 } : c
    ));
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    const content = replyTo ? `@${replyTo.author.name} ${commentText}` : commentText;
    // Optimistic update
    const newComment: Comment = {
      id: `new-${Date.now()}`,
      author: { name: user?.name ?? "me.eth", avatar: user?.avatar ?? "🦊", isVerified: false },
      content,
      timestamp: "Just now",
      likes: 0,
      isLiked: false,
    };
    setComments(prev => [...prev, newComment]);
    setPost(p => ({ ...p, comments: p.comments + 1 }));
    // Persist to backend
    if (isNumericId) {
      addCommentMutation.mutate({ postId: numericPostId, content });
    }
    setCommentText("");
    setReplyTo(null);
    toast("Comment posted! 💬");
  };

  const handleRepost = () => {
    setPost(p => ({ ...p, reposts: p.reposts + 1 }));
    toast.success("Reposted to your timeline");
  };

  const handleQuote = (text: string) => {
    setPost(p => ({ ...p, reposts: p.reposts + 1 }));
    toast.success(`Quote posted: "${text.slice(0, 30)}..."`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b border-border/30 px-4">
        <div className="flex items-center gap-3 h-14">
          <button
            onClick={() => setLocation("/app/discover")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold font-display flex-1">Post</h1>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
          >
            <MoreHorizontal size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* More Menu */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setShowMoreMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              className="fixed top-14 right-4 z-50 w-48 rounded-2xl bg-card border border-border/40 shadow-2xl overflow-hidden py-1"
            >
              {[
                { icon: Copy, label: "Copy link", action: () => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); setShowMoreMenu(false); } },
                { icon: ExternalLink, label: "Open in browser", action: () => { toast.info("Opening in browser..."); setShowMoreMenu(false); } },
                { icon: X, label: "Not interested", action: () => { toast("Post hidden"); setShowMoreMenu(false); setLocation("/app/discover"); } },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                >
                  <item.icon size={15} className="text-muted-foreground" />
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Post Content */}
        <div className="px-4 py-4 border-b border-border/10">
          {/* Author */}
          <div className="flex items-start gap-3 mb-4">
            <Avatar className="w-12 h-12 shrink-0">
              <AvatarFallback className="bg-secondary text-xl">{post.author.avatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold font-display">{post.author.name}</span>
                {post.author.isVerified && (
                  <CheckCircle2 size={16} className="text-neon-cyan fill-neon-cyan/20 shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono">{post.author.handle}</p>
              {post.author.bio && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{post.author.bio}</p>
              )}
              {post.author.followers && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatNum(post.author.followers)} followers
                </p>
              )}
            </div>
            <button
              onClick={() => toast.success("Following!")}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/25 transition-colors"
            >
              Follow
            </button>
          </div>

          {/* Full content */}
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mb-3">{post.content}</p>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.map((tag) => (
                <span key={tag} className="text-[11px] text-neon-cyan/80 hover:text-neon-cyan cursor-pointer transition-colors">{tag}</span>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className="text-[11px] text-muted-foreground mb-4">{post.timestamp}</p>

          {/* Stats row */}
          <div className="flex items-center gap-4 py-3 border-y border-border/10 text-sm">
            <span>
              <span className="font-bold">{formatNum(post.reposts)}</span>
              <span className="text-muted-foreground ml-1 text-xs">Reposts</span>
            </span>
            <span>
              <span className="font-bold">{formatNum(post.likes)}</span>
              <span className="text-muted-foreground ml-1 text-xs">Likes</span>
            </span>
            <span>
              <span className="font-bold">{formatNum(post.comments)}</span>
              <span className="text-muted-foreground ml-1 text-xs">Comments</span>
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-around py-2">
            <button
              onClick={() => commentInputRef.current?.focus()}
              className="flex items-center gap-1.5 p-2 rounded-lg text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all"
            >
              <MessageSquare size={20} />
            </button>
            <button
              onClick={() => setShowRepostModal(true)}
              className="flex items-center gap-1.5 p-2 rounded-lg text-muted-foreground hover:text-neon-green hover:bg-neon-green/5 transition-all"
            >
              <Repeat2 size={20} />
            </button>
            <button
              onClick={toggleLike}
              className={`flex items-center gap-1.5 p-2 rounded-lg transition-all ${
                post.isLiked ? "text-neon-red" : "text-muted-foreground hover:text-neon-red hover:bg-neon-red/5"
              }`}
            >
              <motion.div
                animate={post.isLiked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Heart size={20} className={post.isLiked ? "fill-neon-red" : ""} />
              </motion.div>
            </button>
            <button
              onClick={toggleBookmark}
              className={`flex items-center gap-1.5 p-2 rounded-lg transition-all ${
                post.isBookmarked ? "text-neon-purple" : "text-muted-foreground hover:text-neon-purple hover:bg-neon-purple/5"
              }`}
            >
              <Bookmark size={20} className={post.isBookmarked ? "fill-neon-purple" : ""} />
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: `Post by ${post.author.name}`, text: post.content, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied!");
                }
              }}
              className="flex items-center gap-1.5 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="pb-24">
          <div className="px-4 py-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{comments.length} comments</span>
            <div className="h-px flex-1 bg-border/10" />
            <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown size={12} />
              Latest
            </button>
          </div>

          <div className="space-y-0">
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="px-4 py-3 border-b border-border/10"
              >
                <div className="flex gap-3">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="bg-secondary text-sm">{comment.author.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-semibold font-display">{comment.author.name}</span>
                      {comment.author.isVerified && (
                        <CheckCircle2 size={12} className="text-neon-cyan fill-neon-cyan/20 shrink-0" />
                      )}
                      <span className="text-[10px] text-muted-foreground">{comment.timestamp}</span>
                    </div>

                    {/* Quoted post in comment */}
                    {comment.quotedPost && (
                      <div className="mb-2 p-2 rounded-lg border border-border/20 bg-secondary/20">
                        <p className="text-[10px] text-neon-cyan font-medium mb-0.5">@{comment.quotedPost.author}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{comment.quotedPost.content}</p>
                      </div>
                    )}

                    <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>

                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => toggleCommentLike(comment.id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          comment.isLiked ? "text-neon-red" : "text-muted-foreground hover:text-neon-red"
                        }`}
                      >
                        <Heart size={12} className={comment.isLiked ? "fill-neon-red" : ""} />
                        {comment.likes > 0 && <span>{comment.likes}</span>}
                      </button>
                      <button
                        onClick={() => {
                          setReplyTo(comment);
                          setCommentText(`@${comment.author.name} `);
                          commentInputRef.current?.focus();
                        }}
                        className="text-xs text-muted-foreground hover:text-neon-cyan transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Comment Input — Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-border/30 px-4 py-3 pb-[env(safe-area-inset-bottom)]">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-secondary/30 border-l-2 border-neon-cyan/40">
            <span className="text-[11px] text-neon-cyan flex-1">Replying to @{replyTo.author.name}</span>
            <button onClick={() => { setReplyTo(null); setCommentText(""); }} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-neon-cyan/15 text-neon-cyan text-xs">🦊</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex items-center gap-1.5 bg-secondary/40 rounded-full px-3 py-2 border border-border/20 focus-within:border-neon-cyan/30 transition-colors">
            <input
              ref={commentInputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
              placeholder="Write a comment..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              onClick={() => setCommentText(prev => prev + "@")}
              className="p-0.5 text-muted-foreground hover:text-neon-cyan transition-colors"
            >
              <AtSign size={14} />
            </button>
          </div>
          <button
            onClick={submitComment}
            disabled={!commentText.trim()}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
              commentText.trim() ? "bg-neon-cyan text-background hover:opacity-90" : "bg-secondary/40 text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* Repost Modal */}
      <AnimatePresence>
        {showRepostModal && (
          <RepostModal
            post={post}
            onClose={() => setShowRepostModal(false)}
            onRepost={handleRepost}
            onQuote={handleQuote}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
