/**
 * Login — 应用内登录/注册页面
 * 支持邮箱/密码登录 + 注册，以及 Manus OAuth 备用登录
 * Cyberpunk Noir 风格，与整体设计保持一致
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

type Mode = "login" | "register";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get returnPath from URL query params
  const returnPath = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("returnTo") || params.get("returnPath");
      if (r && r.startsWith("/") && !r.startsWith("//")) return r;
    } catch { /* ignore */ }
    return "/app/chat";
  })();

  const utils = trpc.useUtils();

  const loginMutation = trpc.emailAuth.login.useMutation({
    onSuccess: async () => {
      toast.success("登录成功，欢迎回来！");
      await utils.auth.me.invalidate();
      setLocation(returnPath);
    },
    onError: (err) => {
      toast.error(err.message || "登录失败，请重试");
    },
  });

  const registerMutation = trpc.emailAuth.register.useMutation({
    onSuccess: async () => {
      toast.success("注册成功，欢迎加入 NexusChat！");
      await utils.auth.me.invalidate();
      setLocation(returnPath);
    },
    onError: (err) => {
      toast.error(err.message || "注册失败，请重试");
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = "请输入邮箱";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "邮箱格式不正确";
    if (!password) newErrors.password = "请输入密码";
    else if (password.length < 8) newErrors.password = "密码至少 8 位";
    if (mode === "register" && !name.trim()) newErrors.name = "请输入昵称";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, name });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#00d4ff]/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#a855f7]/5 blur-3xl" />
      </div>

      {/* Back button */}
      <button
        onClick={() => setLocation("/")}
        className="absolute top-6 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        返回首页
      </button>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#00d4ff]/20 mb-3">
          <MessageCircle size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">NexusChat</h1>
        <p className="text-sm text-muted-foreground mt-1">Web3 社交 · AI 投研 · 链上交易</p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full max-w-sm"
      >
        {/* Tab switcher */}
        <div className="flex rounded-xl bg-card/60 border border-border/20 p-1 mb-6">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setErrors({}); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m
                  ? "bg-gradient-to-r from-[#00d4ff]/20 to-[#a855f7]/20 text-foreground border border-[#00d4ff]/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === "register" && (
              <motion.div
                key="name-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">昵称</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="你的显示名称"
                      className={`w-full h-11 pl-9 pr-4 rounded-xl bg-card/60 border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#00d4ff]/50 transition-colors ${
                        errors.name ? "border-red-500/60" : "border-border/30"
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">邮箱</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                className={`w-full h-11 pl-9 pr-4 rounded-xl bg-card/60 border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#00d4ff]/50 transition-colors ${
                  errors.email ? "border-red-500/60" : "border-border/30"
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">密码</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "至少 8 位" : "输入密码"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className={`w-full h-11 pl-9 pr-10 rounded-xl bg-card/60 border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#00d4ff]/50 transition-colors ${
                  errors.password ? "border-red-500/60" : "border-border/30"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[#00d4ff]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isPending ? (
              <><Loader2 size={16} className="animate-spin" /> 处理中...</>
            ) : (
              mode === "login" ? "登录" : "创建账号"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-xs text-muted-foreground">或</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>

        {/* Manus OAuth */}
        <a
          href={getLoginUrl(returnPath)}
          className="flex items-center justify-center gap-2.5 w-full h-11 rounded-xl border border-border/30 bg-card/40 text-sm text-foreground hover:bg-card/60 hover:border-[#a855f7]/30 transition-all"
        >
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center">
            <MessageCircle size={11} className="text-white" />
          </div>
          使用 Manus 账号登录
        </a>

        <p className="text-center text-[11px] text-muted-foreground mt-5 leading-relaxed">
          继续即表示你同意我们的
          <span className="text-[#00d4ff]/80 cursor-pointer hover:text-[#00d4ff]"> 服务条款 </span>
          和
          <span className="text-[#00d4ff]/80 cursor-pointer hover:text-[#00d4ff]"> 隐私政策</span>
        </p>
      </motion.div>
    </div>
  );
}
