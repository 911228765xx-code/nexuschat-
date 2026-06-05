/**
 * PostDetail — 帖子详情页
 * 完整评论流 + 引用/转发功能
 * Cyberpunk Noir: 深色背景 + 霓虹强调色
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { focusOnMount } from "@/lib/focusOnMount";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft, Heart, MessageSquare, Repeat2, Share2, Bookmark,
  Star, MoreHorizontal, Send, AtSign, X, Quote, ChevronDown,
  CheckCircle2, Copy, ExternalLink, BarChart3, TrendingUp, TrendingDown, Minus, FileText
} from "lucide-react";
import LightMarkdown from "@/components/LightMarkdown";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

// Default empty post for loading state
const emptyPost: PostData = {
  id: "0",
  author: { name: "Loading...", avatar: "", isVerified: false, handle: "" },
  content: "",
  timestamp: "",
  likes: 0,
  comments: 0,
  reposts: 0,
  isLiked: false,
  isBookmarked: false,
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
      className="fixed inset-0 z-50 bg-black/60 [backdrop-filter:none] flex items-end"
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
                <p className="text-sm text-muted-foreground">Share to your timeline instantly</p>
              </div>
            </button>
            <button
              onClick={() => setMode("quote")}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
            >
              <Quote size={20} className="text-neon-cyan" />
              <div className="text-left">
                <p className="text-sm font-medium">Quote Post</p>
                <p className="text-sm text-muted-foreground">Add your own commentary</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setMode("choose")} className="p-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft size={18} />
              </button>
              <h3 className="text-sm font-semibold font-display flex-1 text-center">Quote Post</h3>
              <button
                onClick={() => { if (quoteText.trim()) { onQuote(quoteText); onClose(); } }}
                disabled={!quoteText.trim()}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
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
                ref={focusOnMount}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="Add your commentary..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[80px]"
                maxLength={280}
              />
            </div>
            {/* Quoted post preview */}
            <div className="rounded-xl border border-border/30 p-3 bg-secondary/20">
              <div className="flex items-center gap-2.5 mb-2.5">
                <Avatar className="w-5 h-5">
                  {post.author.avatar?.startsWith("http") && <AvatarImage src={post.author.avatar} alt={post.author.name} className="object-cover" />}
                  <AvatarFallback className="bg-secondary text-xs">{post.author.avatar?.startsWith("http") ? post.author.name?.slice(0,2).toUpperCase() : post.author.avatar}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{post.author.name}</span>
                {post.author.isVerified && <Star size={10} className="text-neon-cyan fill-neon-cyan" />}
                <span className="text-sm text-muted-foreground">{post.author.handle}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">{post.content}</p>
            </div>
            <div className="flex justify-end">
              <span className={`text-sm font-mono ${quoteText.length > 250 ? "text-neon-red" : "text-muted-foreground"}`}>
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

  // Always use empty defaults, real data loaded from backend
  const postData = emptyPost;
  const initialComments: Comment[] = [];

  const [post, setPost] = useState<PostData>(postData);
  const [comments, setComments] = useState<Comment[]>(initialComments);

  // tRPC: load real post data
  const { data: serverPost } = trpc.posts.getById.useQuery(
    { postId: numericPostId },
    { enabled: isNumericId }
  );

  // Extract reportId from server post
  const reportId = serverPost?.reportId ?? null;

  // tRPC: load full report if post has reportId
  const { data: reportData, isLoading: reportLoading } = trpc.research.getReportPublic.useQuery(
    { reportId: reportId! },
    { enabled: !!reportId }
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

  const repostMutation = trpc.posts.repost.useMutation({
    onSuccess: () => {
      setPost(p => ({ ...p, reposts: p.reposts + 1 }));
      toast.success("Reposted to your timeline");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to repost");
    },
  });

  const quotePostMutation = trpc.posts.quotePost.useMutation({
    onSuccess: () => {
      setPost(p => ({ ...p, reposts: p.reposts + 1 }));
      toast.success("Quote posted!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to quote post");
    },
  });

  const handleRepost = () => {
    if (!isNumericId) return;
    repostMutation.mutate({ postId: numericPostId });
  };

  const handleQuote = (text: string) => {
    if (!isNumericId) return;
    quotePostMutation.mutate({ postId: numericPostId, comment: text });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b border-border/30 px-4 pt-[env(safe-area-inset-top)]">
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
              {post.author.avatar?.startsWith("http") && <AvatarImage src={post.author.avatar} alt={post.author.name} className="object-cover" />}
              <AvatarFallback className="bg-secondary text-xl">{post.author.avatar?.startsWith("http") ? post.author.name?.slice(0,2).toUpperCase() : post.author.avatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold font-display">{post.author.name}</span>
                {post.author.isVerified && (
                  <CheckCircle2 size={16} className="text-neon-cyan fill-neon-cyan/20 shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground font-mono">{post.author.handle}</p>
              {post.author.bio && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{post.author.bio}</p>
              )}
              {post.author.followers && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {formatNum(post.author.followers)} followers
                </p>
              )}
            </div>
            <button
              onClick={() => toast.success("Following!")}
              className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/25 transition-colors"
            >
              Follow
            </button>
          </div>

          {/* Full content */}
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line mb-3">{post.content}</p>

          {/* ─── Embedded Research Report ─── */}
          {reportId && (
            <div className="my-4 rounded-2xl border border-neon-cyan/20 bg-gradient-to-br from-neon-cyan/5 via-card to-[#a855f7]/5 overflow-hidden">
              {/* Report Header */}
              <div className="px-4 py-3 border-b border-border/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neon-cyan/15 flex items-center justify-center">
                    <BarChart3 size={16} className="text-neon-cyan" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-display">
                        {reportData?.tokenSymbol?.toUpperCase() || 'AI'} Research Report
                      </span>
                      {reportData?.sentiment && (
                        <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${
                          reportData.sentiment === 'bullish' ? 'bg-green-500/15 text-green-400' :
                          reportData.sentiment === 'bearish' ? 'bg-red-500/15 text-red-400' :
                          'bg-yellow-500/15 text-yellow-400'
                        }`}>
                          {reportData.sentiment === 'bullish' ? '看多' : reportData.sentiment === 'bearish' ? '看空' : '中性'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI Research Report
                      {reportData?.priceAtReport ? ` · Price: $${reportData.priceAtReport}` : ''}
                    </p>
                  </div>
                </div>
                {reportData?.sentiment && (
                  <div className="flex items-center gap-2">
                    {reportData.sentiment === 'bullish' ? <TrendingUp size={16} className="text-green-400" /> :
                     reportData.sentiment === 'bearish' ? <TrendingDown size={16} className="text-red-400" /> :
                     <Minus size={16} className="text-yellow-400" />}
                  </div>
                )}
              </div>

              {/* Report Body */}
              <div className="px-4 py-3">
                {reportLoading ? (
                  <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                    <FileText size={16} className="animate-pulse" />
                    <span className="text-sm">Loading report...</span>
                  </div>
                ) : reportData?.reportContent ? (
                  <div className="prose prose-invert prose-sm max-w-none [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-2.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_ul]:text-sm [&_ol]:text-sm [&_li]:mb-0.5 [&_table]:text-sm [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_blockquote]:border-neon-cyan/30 [&_blockquote]:text-sm [&_strong]:text-neon-cyan">
                    <LightMarkdown>{reportData.reportContent}</LightMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Report content unavailable</p>
                )}
              </div>

              {/* Report Footer */}
              {reportData?.riskLevel && (
                <div className="px-4 py-2 border-t border-border/10 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Risk Level</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                    reportData.riskLevel === 'high' ? 'bg-red-500/15 text-red-400' :
                    reportData.riskLevel === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-green-500/15 text-green-400'
                  }`}>
                    {reportData.riskLevel === 'high' ? '高风险' : reportData.riskLevel === 'medium' ? '中等风险' : '低风险'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mb-3">
              {post.tags.map((tag) => (
                <span key={tag} className="text-[13px] text-neon-cyan/80 hover:text-neon-cyan cursor-pointer transition-colors">{tag}</span>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <p className="text-[13px] text-muted-foreground mb-4">{post.timestamp}</p>

          {/* Stats row */}
          <div className="flex items-center gap-4 py-3 border-y border-border/10 text-sm">
            <span>
              <span className="font-bold">{formatNum(post.reposts)}</span>
              <span className="text-muted-foreground ml-1 text-sm">Reposts</span>
            </span>
            <span>
              <span className="font-bold">{formatNum(post.likes)}</span>
              <span className="text-muted-foreground ml-1 text-sm">Likes</span>
            </span>
            <span>
              <span className="font-bold">{formatNum(post.comments)}</span>
              <span className="text-muted-foreground ml-1 text-sm">Comments</span>
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-around py-2">
            <button
              onClick={() => commentInputRef.current?.focus()}
              className="flex items-center gap-2.5 p-2 rounded-lg text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all"
            >
              <MessageSquare size={20} />
            </button>
            <button
              onClick={() => setShowRepostModal(true)}
              className="flex items-center gap-2.5 p-2 rounded-lg text-muted-foreground hover:text-neon-green hover:bg-neon-green/5 transition-all"
            >
              <Repeat2 size={20} />
            </button>
            <button
              onClick={toggleLike}
              className={`flex items-center gap-2.5 p-2 rounded-lg transition-all ${
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
              className={`flex items-center gap-2.5 p-2 rounded-lg transition-all ${
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
              className="flex items-center gap-2.5 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="pb-24">
          <div className="px-4 py-2 flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{comments.length} comments</span>
            <div className="h-px flex-1 bg-border/10" />
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
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
                    {comment.author.avatar?.startsWith("http") && <AvatarImage src={comment.author.avatar} alt={comment.author.name} className="object-cover" />}
                    <AvatarFallback className="bg-secondary text-sm">{comment.author.avatar?.startsWith("http") ? comment.author.name?.slice(0,2).toUpperCase() : comment.author.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-sm font-semibold font-display">{comment.author.name}</span>
                      {comment.author.isVerified && (
                        <CheckCircle2 size={12} className="text-neon-cyan fill-neon-cyan/20 shrink-0" />
                      )}
                      <span className="text-sm text-muted-foreground">{comment.timestamp}</span>
                    </div>

                    {/* Quoted post in comment */}
                    {comment.quotedPost && (
                      <div className="mb-2 p-2 rounded-lg border border-border/20 bg-secondary/20">
                        <p className="text-sm text-neon-cyan font-medium mb-0.5">@{comment.quotedPost.author}</p>
                        <p className="text-[13px] text-muted-foreground line-clamp-2">{comment.quotedPost.content}</p>
                      </div>
                    )}

                    <p className="text-sm text-foreground leading-relaxed">{comment.content}</p>

                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => toggleCommentLike(comment.id)}
                        className={`flex items-center gap-2 text-sm transition-colors ${
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
                        className="text-sm text-muted-foreground hover:text-neon-cyan transition-colors"
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
            <span className="text-[13px] text-neon-cyan flex-1">Replying to @{replyTo.author.name}</span>
            <button onClick={() => { setReplyTo(null); setCommentText(""); }} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-neon-cyan/15 text-neon-cyan text-xs">🦊</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex items-center gap-2.5 bg-secondary/40 rounded-full px-3 py-2 border border-border/20 focus-within:border-neon-cyan/30 transition-colors">
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
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
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
