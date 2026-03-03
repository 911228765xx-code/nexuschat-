/*
 * Discover — 发现页面
 * 三个Tab：动态（朋友圈） / 社群 / 推荐用户
 * 增强互动：点赞动画、评论输入框与评论列表
 * Cyberpunk Noir风格
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, Users, Lock, Star, Globe, Heart, MessageSquare, Share2, Image, Send, MoreHorizontal, Repeat2, Bookmark, X, AtSign, Smile, Quote, Loader2, BarChart3, TrendingUp, ExternalLink, Sparkles, LogIn } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

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
  reportId?: number | null;
  authorId?: number | null;
}

/* ─── Mock Data ─── */
// Mock communities removed — now using real data from chat.listGroups

// All mock data removed — now using real data from backend

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

// Extra mock data generators removed — now using real backend pagination



/* ─── Component ─── */
export default function Discover() {
  // ─── i18n MUST be declared first — used inside useMemo/useMutation below ───
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"moments" | "communities" | "users">("moments");
  const [moments, setMoments] = useState<MomentPost[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { isAuthenticated } = useAuth();
  const [composeText, setComposeText] = useState("");
  const [commentInputId, setCommentInputId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [likeAnimations, setLikeAnimations] = useState<Record<string, boolean>>({});
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  // ─── tRPC: Real groups from backend ───
  const { data: groupsData, refetch: refetchGroups } = trpc.chat.listGroups.useQuery(
    { limit: 30 },
    { staleTime: 30_000 }
  );
  const joinGroupMutation = trpc.chat.joinGroup.useMutation({
    onSuccess: (result, vars) => {
      refetchGroups();
      const id = String(vars.groupId);
      setJoinedCommunities(prev => { const n = new Set(prev); n.add(id); return n; });
      if (result.alreadyMember) {
        toast(t("discover.alreadyMember") || "Already a member");
      } else {
        toast.success(t("discover.joinedCommunity") || "Joined!");
      }
    },
    onError: (err) => { if (!err.message.includes("10001")) toast.error("Join failed: " + err.message); },
  });
  // Map real groups to Community shape
  const realCommunities: Community[] = useMemo(() => {
    if (!groupsData || groupsData.length === 0) return [];
    return groupsData.map(g => ({
      id: String(g.id),
      name: g.name,
      avatar: g.avatar ?? g.name.charAt(0).toUpperCase(),
      members: g.memberCount,
      description: g.description ?? "",
      isTokenGated: g.isTokenGated,
      gateToken: g.tokenGateAmount && g.tokenGateAmount !== "0" ? `≥${g.tokenGateAmount}` : undefined,
      category: t("discover.community") || "Community",
      isHot: g.memberCount > 100,
    }));
  }, [groupsData]);

  // ─── Search history (localStorage) ───
  const HISTORY_KEY = "nexuschat_search_history";
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as string[];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((h) => h !== trimmed);
      const next = [trimmed, ...filtered].slice(0, 5);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setSearchHistory((prev) => {
      const next = prev.filter((h) => h !== query);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(HISTORY_KEY);
    setSearchHistory([]);
  }, []);

  // ─── Debounced search query ───
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchQuery.trim();
      setDebouncedQuery(trimmed);
      if (trimmed.length >= 2) addToHistory(trimmed);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, addToHistory]);

  // ─── tRPC: Search posts ───
  const { data: searchData, isFetching: isSearching } = trpc.posts.search.useQuery(
    { query: debouncedQuery, limit: 30 },
    {
      enabled: debouncedQuery.length >= 2,
      staleTime: 10_000,
    }
  );

  // Map search results to MomentPost format
  const searchResults: MomentPost[] = useMemo(() => {
    if (!searchData?.posts) return [];
    return searchData.posts.map((p) => ({
      id: String(p.id),
      author: {
        name: p.authorName ?? (t("discover.anonymous") || "Anonymous"),
        avatar: p.authorAvatar ?? "👤",
        isVerified: false,
        handle: p.authorUsername ? `@${p.authorUsername}` : (p.authorWallet ? `${p.authorWallet.slice(0, 6)}...${p.authorWallet.slice(-4)}` : "unknown"),
      },
      content: p.content,
      images: p.mediaUrls && p.mediaUrls.length > 0 ? p.mediaUrls : undefined,
      tags: p.tags ?? [],
      timestamp: new Date(p.createdAt).toLocaleDateString("zh-CN"),
      likes: p.likeCount,
      comments: p.commentCount,
      reposts: p.shareCount,
      isLiked: p.isLiked,
      isBookmarked: false,
      commentList: [],
      showComments: false,
    }));
  }, [searchData]);

  // ─── tRPC: Leaderboard users (replaces mockUsers) ───
  const { data: leaderboardData } = trpc.user.leaderboard.useQuery(
    { limit: 20 },
    { staleTime: 60_000 }
  );
  const realUsers: TrendingUser[] = useMemo(() => {
    if (!leaderboardData || leaderboardData.length === 0) return [];
    return leaderboardData.map((u) => ({
      id: String(u.id),
      name: u.displayName,
      avatar: u.avatar ?? u.displayName.charAt(0).toUpperCase(),
      bio: u.walletAddress ? `${u.shortAddress ?? ""} · ${u.npPoints ?? 0} NP` : `${u.npPoints ?? 0} NP`,
      followers: u.npPoints ?? 0,
      isVerified: (u.npPoints ?? 0) >= 1000,
    }));
  }, [leaderboardData]);

  // ─── tRPC: Follow/Unfollow ───
  const followMutation = trpc.follow.follow.useMutation({
    onSuccess: (_, vars) => {
      setFollowedUsers(prev => { const n = new Set(prev); n.add(String(vars.targetUserId)); return n; });
      toast.success(t("discover.followed") || "Followed!");
    },
    onError: (err) => { if (!err.message.includes("10001")) toast.error("Follow failed: " + err.message); },
  });
  const unfollowMutation = trpc.follow.unfollow.useMutation({
    onSuccess: (_, vars) => {
      setFollowedUsers(prev => { const n = new Set(prev); n.delete(String(vars.targetUserId)); return n; });
      toast.success(t("discover.unfollowed") || "Unfollowed");
    },
    onError: (err) => { if (!err.message.includes("10001")) toast.error("Unfollow failed: " + err.message); },
  });
  const commentInputRef = useRef<HTMLInputElement>(null);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [composeImages, setComposeImages] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const [repostMenuPostId, setRepostMenuPostId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // ─── tRPC: Repost mutation ───
  const repostMutation = trpc.posts.repost.useMutation({
    onSuccess: () => {
      if (repostMenuPostId) {
        setMoments(prev => prev.map(m => m.id === repostMenuPostId ? { ...m, reposts: m.reposts + 1 } : m));
      }
      toast.success(t("discover.reposted") || "Reposted to your timeline");
      setRepostMenuPostId(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to repost");
      setRepostMenuPostId(null);
    },
  });

  // ─── tRPC: Upload media mutation ───
  const [uploadingImages, setUploadingImages] = useState(false);
  const uploadMedia = trpc.posts.uploadMedia.useMutation({
    onError: (err) => {
      if (!err.message.includes("10001")) {
        toast.error("图片上传失败: " + err.message);
      }
    },
  });

  // ─── Pagination State ───
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // ─── tRPC: Fetch posts from backend (with pagination) ───
  const PAGE_SIZE = 20;
  const { data: serverPostsData, isLoading: postsLoading } = trpc.posts.list.useQuery(
    { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { staleTime: 10_000, refetchOnWindowFocus: false }
  );

  // Map server posts to MomentPost format
  const mapServerPost = useCallback((p: NonNullable<typeof serverPostsData>["posts"][number]): MomentPost => ({
    id: String(p.id),
    author: {
      name: p.authorName ?? "Anonymous",
      avatar: p.authorAvatar ?? "👤",
      isVerified: false,
      handle: p.authorUsername ? `@${p.authorUsername}` : (p.authorWallet ? `${p.authorWallet.slice(0, 6)}...${p.authorWallet.slice(-4)}` : "unknown"),
    },
    content: p.content,
    images: p.mediaUrls && p.mediaUrls.length > 0 ? p.mediaUrls : undefined,
    tags: p.tags ?? [],
    timestamp: new Date(p.createdAt).toLocaleDateString("zh-CN"),
    likes: p.likeCount,
    comments: p.commentCount,
    reposts: p.shareCount,
    isLiked: p.isLiked,
    isBookmarked: false,
    commentList: [],
    showComments: false,
    reportId: (p as any).reportId ?? null,
    authorId: p.authorId ?? null,
  }), []);

  // Merge server posts into moments (append on page change, replace on page 0)
  useEffect(() => {
    if (!serverPostsData?.posts) return;
    const serverMapped = serverPostsData.posts.map(mapServerPost);
    if (!serverPostsData.hasMore) setHasMore(false);
    setMoments((prev) => {
      if (page === 0) {
        // First page: replace all (keep local optimistic)
        const localOnly = prev.filter((m) => Number(m.id) > 1_700_000_000_000);
        return [...serverMapped, ...localOnly];
      } else {
        // Subsequent pages: append, dedup by id
        const existingIds = new Set(prev.map((m) => m.id));
        const newPosts = serverMapped.filter((m) => !existingIds.has(m.id));
        return [...prev, ...newPosts];
      }
    });
    setIsLoadingMore(false);
  }, [serverPostsData, page, mapServerPost]);

  // ─── tRPC: Create post mutation ───
  const createPost = trpc.posts.create.useMutation({
    onSuccess: (data) => {
      // Prepend real post to feed (optimistic already done)
      utils.posts.list.invalidate();
    },
    onError: (err) => {
      if (!err.message.includes("10001")) {
        toast.error("发布失败: " + err.message);
      }
    },
  });

  // ─── tRPC: Toggle like mutation ───
  const toggleLikeMutation = trpc.posts.toggleLike.useMutation({
    onError: (err) => {
      if (!err.message.includes("10001")) {
        console.warn("[Discover] like failed:", err.message);
      }
    },
  });

  // ─── tRPC: Add comment mutation ───
  const addCommentMutation = trpc.posts.addComment.useMutation({
    onError: (err) => {
      if (!err.message.includes("10001")) {
        toast.error("评论失败: " + err.message);
      }
    },
  });

  // ─── tRPC: Delete post mutation ───
  const deletePostMutation = trpc.posts.delete.useMutation({
    onSuccess: (_, vars) => {
      setMoments((prev) => prev.filter((m) => m.id !== String(vars.postId)));
      utils.posts.list.invalidate();
      toast.success("帖子已删除");
    },
    onError: (err) => {
      toast.error("删除失败: " + err.message);
    },
  });

  // ─── Current user (for ownership check) ───
  const { data: meData } = trpc.auth.me.useQuery();

  // ─── Post options menu state ───
  const [optionsMenuPostId, setOptionsMenuPostId] = useState<string | null>(null);

  // ─── Infinite Scroll State (remaining) ───
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ─── Intersection Observer for infinite scroll ───
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, [isLoadingMore, hasMore]);

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
      utils.posts.list.invalidate();
      setPage(0);
      setHasMore(true);
      setIsRefreshing(false);
      toast(t("discover.refreshed") || "Feed refreshed!");
    }, 1000);
  }, [t]);

  // Use real communities from backend
  const displayCommunities = realCommunities;
  const categories = ["All", ...Array.from(new Set(displayCommunities.map(c => c.category).filter(Boolean)))];
  // Show empty state hint when no groups exist yet
  const hasNoCommunities = displayCommunities.length === 0;

  const filteredCommunities = displayCommunities.filter(
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

  const requireLogin = (action: () => void) => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    action();
  };

  const toggleLike = (id: string) => {
    if (!isAuthenticated) { setShowLoginPrompt(true); return; }
    // Optimistic UI update
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        if (!m.isLiked) {
          setLikeAnimations((a) => ({ ...a, [id]: true }));
          setTimeout(() => setLikeAnimations((a) => ({ ...a, [id]: false })), 700);
        }
        return { ...m, isLiked: !m.isLiked, likes: m.isLiked ? m.likes - 1 : m.likes + 1 };
      })
    );
    // Persist to backend (numeric IDs only)
    const numId = parseInt(id, 10);
    if (!isNaN(numId)) {
      toggleLikeMutation.mutate({ postId: numId });
    }
  };

  const toggleBookmark = (id: string) => {
    if (!isAuthenticated) { setShowLoginPrompt(true); return; }
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
    if (!isAuthenticated) { setShowLoginPrompt(true); return; }
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
    if (!isAuthenticated) { setShowLoginPrompt(true); return; }
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: `new-${Date.now()}`,
      author: { name: "me.eth", avatar: "🦊" },
      content: commentText,
      timestamp: t("discover.justNow") || "Just now",
      likes: 0,
      isLiked: false,
    };
    // Optimistic UI update
    setMoments((prev) =>
      prev.map((m) =>
        m.id === postId
          ? { ...m, commentList: [...m.commentList, newComment], comments: m.comments + 1 }
          : m
      )
    );
    setCommentText("");
    toast(t("discover.commentSent") || "Comment posted! 💬");
    // Persist to backend
    const numId = parseInt(postId, 10);
    if (!isNaN(numId)) {
      addCommentMutation.mutate({ postId: numId, content: commentText });
    }
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

  const handlePublish = async () => {
    if (!composeText.trim()) return;

    // Upload images to S3 first (if any)
    let uploadedUrls: string[] = [];
    if (composeImages.length > 0) {
      setUploadingImages(true);
      try {
        const uploads = await Promise.all(
          composeImages.map(async (dataUrl) => {
            // Extract base64 data and mime type from data URL
            const [header, base64Data] = dataUrl.split(",");
            const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
            const ext = mimeType.split("/")[1] ?? "jpg";
            const result = await uploadMedia.mutateAsync({
              fileData: base64Data,
              fileName: `photo.${ext}`,
              mimeType,
            });
            return result.url;
          })
        );
        uploadedUrls = uploads;
      } catch (err) {
        setUploadingImages(false);
        return; // Stop if upload fails
      }
      setUploadingImages(false);
    }

    const newPost: MomentPost = {
      id: `optimistic-${Date.now()}`,
      author: {
        name: meData?.username || (meData?.walletAddress ? `${meData.walletAddress.slice(0, 6)}...${meData.walletAddress.slice(-4)}` : "me.eth"),
        avatar: meData?.avatar || "🦊",
        isVerified: false,
        handle: meData?.walletAddress ? `${meData.walletAddress.slice(0, 6)}...${meData.walletAddress.slice(-4)}` : "0x71C7...3a9b",
      },
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
    // Optimistic UI update
    setMoments((prev) => [newPost, ...prev]);
    setComposeText("");
    setComposeImages([]);
    setShowCompose(false);
    toast(t("discover.postPublished") || "Post published! 🎉");
    // Persist to backend with real S3 URLs
    createPost.mutate({
      content: composeText,
      mediaUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      tags: composeText.match(/#(\w+)/g)?.map((t) => t.slice(1)) ?? [],
    });
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
          {isSearching
            ? <Loader2 size={15} className="absolute left-3 top-[18px] -translate-y-1/2 text-neon-cyan animate-spin pointer-events-none" />
            : <Search size={16} className="absolute left-3 top-[18px] -translate-y-1/2 text-muted-foreground pointer-events-none" />
          }
          <input
            type="text"
            placeholder={t("discover.search") || "Search posts, tags..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pr-8 rounded-xl bg-secondary/60 border border-border/30 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
            style={{ paddingLeft: '2.25rem' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-[18px] -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search History Panel — shown when input focused and no query */}
        {searchQuery === "" && searchHistory.length > 0 && (
          <div className="pb-2 border-b border-border/20">
            <div className="flex items-center justify-between px-4 pt-1 pb-1">
              <span className="text-[11px] text-muted-foreground font-medium">Recent Searches</span>
              <button
                onClick={clearHistory}
                className="text-[11px] text-muted-foreground/60 hover:text-neon-cyan transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-col">
              {searchHistory.map((h) => (
                <div
                  key={h}
                  className="flex items-center gap-2 px-4 py-1.5 hover:bg-secondary/30 transition-colors"
                >
                  <Search size={12} className="text-muted-foreground/50 shrink-0" />
                  <button
                    className="flex-1 text-left text-sm text-foreground/80 truncate"
                    onClick={() => setSearchQuery(h)}
                  >
                    {h}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFromHistory(h); }}
                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
        {/* ─── Search Results Overlay ─── */}
        {debouncedQuery.length >= 2 && (
          <div className="pb-4">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {isSearching
                  ? "Searching..."
                  : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for “${debouncedQuery}”`
                }
              </span>
              {!isSearching && searchResults.length > 0 && (
                <span className="text-[10px] text-neon-cyan/70">Backend search</span>
              )}
            </div>
            {isSearching ? (
              <div className="flex items-center justify-center py-12 gap-2">
                <Loader2 size={20} className="text-neon-cyan animate-spin" />
                <span className="text-sm text-muted-foreground">Searching posts...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Search size={36} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No posts found for “{debouncedQuery}”</p>
                <p className="text-xs text-muted-foreground/60">Try different keywords or hashtags</p>
              </div>
            ) : (
              <div className="space-y-0">
                {searchResults.map((post) => (
                  <article
                    key={post.id}
                    className="px-4 py-4 border-b border-border/10 cursor-pointer hover:bg-secondary/20 transition-colors active:bg-secondary/40"
                    onClick={() => setLocation(`/app/post/${post.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 shrink-0">
                        {post.author.avatar?.startsWith("http") && <AvatarImage src={post.author.avatar} alt={post.author.name} className="object-cover" />}
                        <AvatarFallback className="bg-secondary text-base">{post.author.avatar?.startsWith("http") ? post.author.name?.slice(0,2).toUpperCase() : post.author.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm font-semibold font-display truncate">{post.author.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate">{post.author.handle}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground/50 shrink-0">{post.timestamp}</span>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line line-clamp-3">{post.content}</p>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {post.tags.map((tag) => (
                              <span key={tag} className="text-[11px] text-neon-cyan/80">#{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                          <span className="flex items-center gap-1 text-xs"><Heart size={12} /> {post.likes}</span>
                          <span className="flex items-center gap-1 text-xs"><MessageSquare size={12} /> {post.comments}</span>
                          <span className="flex items-center gap-1 text-xs"><Repeat2 size={12} /> {post.reposts}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Moments Tab ─── */}
        {activeTab === "moments" && debouncedQuery.length < 2 && (
          <div className="pb-4">
            {/* Compose button */}
            <div className="px-4 py-3">
              <button
                onClick={() => requireLogin(() => setShowCompose(true))}
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

            {/* Moments Feed Skeleton */}
            {postsLoading && moments.length === 0 && (
              <div className="space-y-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="px-4 py-4 border-b border-border/10">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/60 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <div className="h-3.5 w-24 bg-secondary/60 animate-pulse rounded" />
                          <div className="h-3.5 w-16 bg-secondary/40 animate-pulse rounded" />
                        </div>
                        <div className="h-3 w-full bg-secondary/50 animate-pulse rounded" />
                        <div className="h-3 w-4/5 bg-secondary/40 animate-pulse rounded" />
                        <div className="h-3 w-3/5 bg-secondary/30 animate-pulse rounded" />
                        <div className="flex gap-6 pt-1">
                          <div className="h-3 w-12 bg-secondary/40 animate-pulse rounded" />
                          <div className="h-3 w-12 bg-secondary/40 animate-pulse rounded" />
                          <div className="h-3 w-12 bg-secondary/40 animate-pulse rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                      {post.author.avatar?.startsWith("http") && <AvatarImage src={post.author.avatar} alt={post.author.name} className="object-cover" />}
                      <AvatarFallback className="bg-secondary text-base">{post.author.avatar?.startsWith("http") ? post.author.name?.slice(0,2).toUpperCase() : post.author.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-semibold font-display truncate">{post.author.name}</span>
                          {post.author.isVerified && (
                            <Star size={12} className="text-neon-cyan fill-neon-cyan shrink-0" />
                          )}
                          <span className="text-[10px] text-muted-foreground font-mono truncate">{post.author.handle}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground/50">{post.timestamp}</span>
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOptionsMenuPostId(optionsMenuPostId === post.id ? null : post.id); }}
                              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                            >
                              <MoreHorizontal size={15} />
                            </button>
                            <AnimatePresence>
                              {optionsMenuPostId === post.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute right-0 top-7 z-50 min-w-[120px] rounded-xl bg-card border border-border/30 shadow-xl overflow-hidden"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {meData && post.authorId != null && String(meData.id) === String(post.authorId) ? (
                                    <button
                                      onClick={() => {
                                        setOptionsMenuPostId(null);
                                        deletePostMutation.mutate({ postId: Number(post.id) });
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                      <X size={13} />
                                      删除帖子
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => { setOptionsMenuPostId(null); toast("举报功能即将上线"); }}
                                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary/40 transition-colors"
                                    >
                                      <Share2 size={13} />
                                      举报
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      {/* Content — clickable to open detail */}
                      <p
                        className="text-sm text-foreground mt-2 leading-relaxed whitespace-pre-line cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setLocation(`/app/post/${post.id}`)}
                      >{post.content}</p>

                      {/* Report Card */}
                      {post.reportId && (
                        <div
                          onClick={() => setLocation(`/app/post/${post.id}`)}
                          className="mt-3 rounded-xl bg-gradient-to-br from-[#0a0f1e] to-[#131b35] border border-[#a855f7]/20 p-3.5 cursor-pointer hover:border-[#a855f7]/40 transition-all group"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center">
                              <BarChart3 size={12} className="text-white" />
                            </div>
                            <span className="text-xs font-bold text-white font-['Space_Grotesk']">AI 投研报告</span>
                            <Sparkles size={10} className="text-[#a855f7]" />
                            <span className="ml-auto text-[10px] text-[#00d4ff] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              查看完整报告 <ExternalLink size={9} />
                            </span>
                          </div>
                          {post.tags && post.tags.includes("投研报告") && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {post.tags.filter(t => t !== "投研报告").map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[#a855f7]/15 text-[#a855f7]">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Media images grid */}
                      {post.images && post.images.length > 0 && (
                        <div className={`mt-2.5 rounded-xl overflow-hidden grid gap-0.5 ${
                          post.images.length === 1 ? 'grid-cols-1' :
                          post.images.length === 2 ? 'grid-cols-2' :
                          post.images.length === 3 ? 'grid-cols-2' :
                          'grid-cols-2'
                        }`}>
                          {post.images.slice(0, 4).map((imgUrl, idx) => (
                            <div
                              key={idx}
                              className={`relative overflow-hidden bg-secondary/40 ${
                                post.images!.length === 1 ? 'aspect-video' :
                                post.images!.length === 3 && idx === 0 ? 'row-span-2 aspect-square' :
                                'aspect-square'
                              }`}
                            >
                              <img
                                src={imgUrl}
                                alt={`帖子图片 ${idx + 1}`}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(imgUrl, '_blank')}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                              {/* Show +N overlay for 4th image if more than 4 */}
                              {idx === 3 && post.images!.length > 4 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">+{post.images!.length - 4}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

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
                        {/* Repost button — opens repost/quote bottom sheet */}
                        <button
                          onClick={() => setRepostMenuPostId(post.id)}
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
                                      {comment.author.avatar?.startsWith("http") && <AvatarImage src={comment.author.avatar} alt={comment.author.name} className="object-cover" />}
                                      <AvatarFallback className="bg-secondary/60 text-[10px]">{comment.author.avatar?.startsWith("http") ? comment.author.name?.slice(0,2).toUpperCase() : comment.author.avatar}</AvatarFallback>
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
        {activeTab === "communities" && debouncedQuery.length < 2 && (
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
                      {community.avatar?.startsWith("http") && <AvatarImage src={community.avatar} alt={community.name} className="object-cover" />}
                      <AvatarFallback className="bg-secondary text-lg">{community.avatar?.startsWith("http") ? community.name?.slice(0,2).toUpperCase() : community.avatar}</AvatarFallback>
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
                        if (!isAuthenticated && !joinedCommunities.has(community.id)) { setShowLoginPrompt(true); return; }
                        const numId = parseInt(community.id, 10);
                        if (!isNaN(numId)) {
                          if (!joinedCommunities.has(community.id)) {
                            joinGroupMutation.mutate({ groupId: numId });
                          } else {
                            setLocation(`/app/group/${community.id}`);
                          }
                        }
                      }}
                      disabled={joinGroupMutation.isPending}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        joinedCommunities.has(community.id)
                          ? "bg-secondary/60 text-muted-foreground border-border/30 hover:bg-secondary/80"
                          : "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/20 hover:bg-neon-cyan/25"
                      }`}
                    >
                      {joinGroupMutation.isPending && !joinedCommunities.has(community.id)
                        ? <Loader2 size={12} className="animate-spin" />
                        : joinedCommunities.has(community.id) ? (t("discover.joined") || "Joined") : t("discover.join")
                      }
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {/* ─── Users Tab ─── */}
        {activeTab === "users" && debouncedQuery.length < 2 && (
          <div className="px-4 py-3 space-y-3">
            {realUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/50 border border-border/20"
              >
                <Avatar className="w-12 h-12 shrink-0">
                  {user.avatar?.startsWith("http") && <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />}
                  <AvatarFallback className="bg-secondary text-lg font-display">{user.avatar?.startsWith("http") ? user.name?.slice(0,2).toUpperCase() : user.avatar}</AvatarFallback>
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
                    if (!isAuthenticated) { setShowLoginPrompt(true); return; }
                    const numId = parseInt(user.id, 10);
                    if (!isNaN(numId)) {
                      if (followedUsers.has(user.id)) {
                        unfollowMutation.mutate({ targetUserId: numId });
                      } else {
                        followMutation.mutate({ targetUserId: numId });
                      }
                    } else {
                      // Fallback for mock users with non-numeric IDs
                      setFollowedUsers(prev => {
                        const next = new Set(prev);
                        if (next.has(user.id)) next.delete(user.id); else next.add(user.id);
                        return next;
                      });
                      toast.success(followedUsers.has(user.id) ? (t("discover.unfollowed") || "Unfollowed") : (t("discover.followed") || "Followed!"));
                    }
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

      {/* ─── Repost / Quote Bottom Sheet ─── */}
      <AnimatePresence>
        {repostMenuPostId && (() => {
          const targetPost = moments.find(m => m.id === repostMenuPostId);
          if (!targetPost) return null;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 [backdrop-filter:none] flex items-end"
              onClick={() => setRepostMenuPostId(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-card border-t border-border/30 rounded-t-3xl p-4 space-y-2"
              >
                <h3 className="text-sm font-semibold font-display text-center mb-3">Share Post</h3>
                <button
                  onClick={() => {
                    const numId = parseInt(repostMenuPostId!, 10);
                    if (!isNaN(numId)) {
                      repostMutation.mutate({ postId: numId });
                    } else {
                      setRepostMenuPostId(null);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
                >
                  <Repeat2 size={20} className="text-neon-green" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Repost</p>
                    <p className="text-xs text-muted-foreground">Share instantly to your timeline</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setRepostMenuPostId(null);
                    setLocation(`/app/post/${repostMenuPostId}`);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
                >
                  <Quote size={20} className="text-neon-cyan" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Quote Post</p>
                    <p className="text-xs text-muted-foreground">Add your own commentary</p>
                  </div>
                </button>
                <button
                  onClick={() => setRepostMenuPostId(null)}
                  className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ─── Login Prompt Modal ─── */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 [backdrop-filter:none] flex items-end justify-center"
            onClick={() => setShowLoginPrompt(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card border-t border-border/30 rounded-t-3xl p-6 space-y-5"
            >
              {/* Close button */}
              <div className="flex items-center justify-between">
                <button onClick={() => setShowLoginPrompt(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
                <div className="w-8 h-1 rounded-full bg-border mx-auto" />
                <div className="w-7" />
              </div>

              {/* Icon + Title */}
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#00d4ff]/20">
                  <LogIn size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">登录后参与互动</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    使用 Manus 账号登录，发帖、点赞、评论，与社区共建 Web3 生态
                  </p>
                </div>
              </div>

              {/* Feature list */}
              <div className="space-y-2">
                {[
                  { icon: "💬", text: "发布动态，分享你的 Web3 见解" },
                  { icon: "❤️", text: "点赞、评论，与社区成员互动" },
                  { icon: "🔖", text: "收藏精彩内容，随时回顾" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-background/40 border border-border/20">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs text-foreground/80">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => { window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`; }}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[#00d4ff]/20"
              >
                立即登录
              </button>
              <p className="text-center text-[10px] text-muted-foreground pb-2">
                安全登录 · 无需密码 · 支持 Web3 钱包
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Compose Modal ─── */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 [backdrop-filter:none] flex items-end justify-center"
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
                  disabled={!composeText.trim() || uploadingImages}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                    composeText.trim() && !uploadingImages
                      ? "bg-neon-cyan text-background hover:opacity-90"
                      : "bg-secondary/40 text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {uploadingImages && <Loader2 size={12} className="animate-spin" />}
                  {uploadingImages ? "上传中..." : (t("discover.publish") || "Publish")}
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
