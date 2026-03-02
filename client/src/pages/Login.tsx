/**
 * Login — 应用内登录/注册页面
 * 支持邮箱/密码登录 + 注册，以及 Manus OAuth 备用登录
 * Cyberpunk Noir 风格：网格背景 + 浮动粒子 + 霓虹光晕动效
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

type Mode = "login" | "register";

// ── Animated canvas background ────────────────────────────────────────────────
function CyberpunkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;

    // Particles
    const PARTICLE_COUNT = 40;
    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      r: number; alpha: number;
      color: string;
    }
    let particles: Particle[] = [];

    const COLORS = ["#00d4ff", "#a855f7", "#00ff88", "#ff3366"];

    function resize() {
      w = canvas!.width = window.innerWidth;
      h = canvas!.height = window.innerHeight;
    }

    function initParticles() {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    }

    let t = 0;
    function draw() {
      ctx!.clearRect(0, 0, w, h);

      // ── Grid ──────────────────────────────────────────────────────────────
      const GRID = 48;
      ctx!.strokeStyle = "rgba(0,212,255,0.04)";
      ctx!.lineWidth = 1;
      for (let x = 0; x < w; x += GRID) {
        ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke();
      }
      for (let y = 0; y < h; y += GRID) {
        ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke();
      }

      // ── Animated scan line ────────────────────────────────────────────────
      const scanY = ((t * 0.4) % (h + 60)) - 30;
      const scanGrad = ctx!.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      scanGrad.addColorStop(0, "rgba(0,212,255,0)");
      scanGrad.addColorStop(0.5, "rgba(0,212,255,0.06)");
      scanGrad.addColorStop(1, "rgba(0,212,255,0)");
      ctx!.fillStyle = scanGrad;
      ctx!.fillRect(0, scanY - 20, w, 40);

      // ── Floating particles ────────────────────────────────────────────────
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, "0");
        ctx!.fill();
      }

      // ── Pulsing corner accents ─────────────────────────────────────────────
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.02);
      const cornerSize = 32;
      const corners = [
        [0, 0, 1, 1],
        [w, 0, -1, 1],
        [0, h, 1, -1],
        [w, h, -1, -1],
      ] as const;
      ctx!.strokeStyle = `rgba(0,212,255,${0.15 + pulse * 0.1})`;
      ctx!.lineWidth = 1.5;
      for (const [cx, cy, dx, dy] of corners) {
        ctx!.beginPath();
        ctx!.moveTo(cx + dx * cornerSize, cy);
        ctx!.lineTo(cx, cy);
        ctx!.lineTo(cx, cy + dy * cornerSize);
        ctx!.stroke();
      }

      t++;
      animId = requestAnimationFrame(draw);
    }

    resize();
    initParticles();
    draw();

    window.addEventListener("resize", () => { resize(); initParticles(); });
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ── Main Login Component ───────────────────────────────────────────────────────
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
    <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Animated cyberpunk canvas background */}
      <CyberpunkBackground />

      {/* Static radial glow blobs */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-[#00d4ff]/8 blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-[#a855f7]/8 blur-[100px]" />
        <div className="absolute top-2/3 left-1/4 w-[300px] h-[300px] rounded-full bg-[#00ff88]/5 blur-[80px]" />
      </div>

      {/* Back button */}
      <button
        onClick={() => setLocation("/")}
        className="absolute top-6 left-4 flex items-center gap-2 text-sm text-[#00d4ff]/60 hover:text-[#00d4ff] transition-colors"
        style={{ zIndex: 10 }}
      >
        <ArrowLeft size={16} />
        返回首页
      </button>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-8"
        style={{ zIndex: 10 }}
      >
        {/* Glowing icon */}
        <div className="relative mb-3">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#a855f7] blur-xl opacity-50 scale-110" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center shadow-2xl">
            <MessageCircle size={28} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-wide">NexusChat</h1>
        <p className="text-sm text-[#00d4ff]/60 mt-1 font-mono tracking-wider">Web3 社交 · AI 投研 · 链上交易</p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full max-w-sm relative"
        style={{ zIndex: 10 }}
      >
        {/* Card border glow */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#00d4ff]/20 via-transparent to-[#a855f7]/20 pointer-events-none" />
        <div className="relative rounded-2xl bg-[#0a0f1e]/80 backdrop-blur-xl border border-white/5 p-6 shadow-2xl">

          {/* Tab switcher */}
          <div className="flex rounded-xl bg-white/5 border border-white/5 p-1 mb-6">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrors({}); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? "bg-gradient-to-r from-[#00d4ff]/20 to-[#a855f7]/20 text-white border border-[#00d4ff]/30 shadow-sm shadow-[#00d4ff]/10"
                    : "text-white/40 hover:text-white/70"
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
                    <label className="text-xs text-[#00d4ff]/60 font-medium font-mono">昵称</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="你的显示名称"
                        className={`w-full h-11 pl-9 pr-4 rounded-xl bg-white/5 border text-sm text-white placeholder:text-white/20 outline-none focus:border-[#00d4ff]/50 focus:bg-white/8 transition-all ${
                          errors.name ? "border-red-500/60" : "border-white/10"
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
              <label className="text-xs text-[#00d4ff]/60 font-medium font-mono">邮箱</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className={`w-full h-11 pl-9 pr-4 rounded-xl bg-white/5 border text-sm text-white placeholder:text-white/20 outline-none focus:border-[#00d4ff]/50 focus:bg-white/8 transition-all ${
                    errors.email ? "border-red-500/60" : "border-white/10"
                  }`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs text-[#00d4ff]/60 font-medium font-mono">密码</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "至少 8 位" : "输入密码"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className={`w-full h-11 pl-9 pr-10 rounded-xl bg-white/5 border text-sm text-white placeholder:text-white/20 outline-none focus:border-[#00d4ff]/50 focus:bg-white/8 transition-all ${
                    errors.password ? "border-red-500/60" : "border-white/10"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
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
              className="relative w-full h-12 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 overflow-hidden group"
            >
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#00d4ff] to-[#a855f7]" />
              {/* Hover shimmer */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
              {/* Glow */}
              <div className="absolute inset-0 shadow-lg shadow-[#00d4ff]/30 rounded-xl" />
              <span className="relative">
                {isPending ? (
                  <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> 处理中...</span>
                ) : (
                  mode === "login" ? "登录" : "创建账号"
                )}
              </span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30 font-mono">或</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Manus OAuth */}
          <a
            href={getLoginUrl(returnPath)}
            className="flex items-center justify-center gap-2.5 w-full h-11 rounded-xl border border-[#a855f7]/20 bg-[#a855f7]/5 text-sm text-white/70 hover:text-white hover:bg-[#a855f7]/10 hover:border-[#a855f7]/40 transition-all"
          >
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center">
              <MessageCircle size={11} className="text-white" />
            </div>
            使用 Manus 账号登录
          </a>

          <p className="text-center text-[11px] text-white/20 mt-5 leading-relaxed font-mono">
            继续即表示你同意我们的
            <span className="text-[#00d4ff]/60 cursor-pointer hover:text-[#00d4ff] transition-colors"> 服务条款 </span>
            和
            <span className="text-[#00d4ff]/60 cursor-pointer hover:text-[#00d4ff] transition-colors"> 隐私政策</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
