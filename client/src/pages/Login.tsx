/**
 * Login — 应用内登录/注册页面
 * 最大移动端兼容性版本：
 * - 无 canvas、无 framer-motion
 * - 无 backdrop-blur / backdrop-filter（Android Chrome 已知渲染 bug）
 * - 无 blur-[Npx] CSS filter（同上）
 * - 纯实色背景，inline style 确保所有 Android/iOS 浏览器正常渲染
 */
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { TURNSTILE_SITE_KEY } from "@/const";

type Mode = "login" | "register";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileRef = useRef<TurnstileInstance>(null);

  // Get returnPath from URL query params
  const returnPath = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get("returnTo") || params.get("returnPath");
      if (r && r.startsWith("/") && !r.startsWith("//")) return r;
    } catch { /* ignore */ }
    return "/app/chat";
  })();

  const loginMutation = trpc.emailAuth.login.useMutation({
    onSuccess: () => {
      toast.success("登录成功，欢迎回来！");
      window.location.href = returnPath;
    },
    onError: (err) => {
      toast.error(err.message || "登录失败，请重试");
    },
  });

  const registerMutation = trpc.emailAuth.register.useMutation({
    onSuccess: () => {
      toast.success("注册成功，欢迎加入比特AI！");
      window.location.href = returnPath;
    },
    onError: (err) => {
      toast.error(err.message || "注册失败，请重试");
    },
  });

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = "请输入邮箱";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "邮箱格式不正确";
    if (!password) newErrors.password = "请输入密码";
    else if (password.length < 6) newErrors.password = "密码至少 6 位";
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
      registerMutation.mutate(
        { email, password, name, turnstileToken: turnstileToken || undefined },
        {
          onError: () => {
            // Reset Turnstile on error so user can retry
            turnstileRef.current?.reset();
            setTurnstileToken("");
          },
        }
      );
    }
  };

  // ─── Inline styles (avoids Tailwind class purging issues and CSS filter bugs) ──
  const S = {
    page: {
      minHeight: "100dvh",
      backgroundColor: "#050810",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      position: "relative" as const,
    },
    backBtn: {
      position: "absolute" as const,
      top: "20px",
      left: "16px",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "13px",
      color: "rgba(0,212,255,0.7)",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "8px 4px",
      zIndex: 10,
    },
    logoWrap: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      marginBottom: "28px",
    },
    logoIcon: {
      width: "56px",
      height: "56px",
      borderRadius: "16px",
      background: "linear-gradient(135deg, #00d4ff, #a855f7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "12px",
    },
    logoTitle: {
      fontSize: "22px",
      fontWeight: 700,
      color: "#ffffff",
      margin: 0,
      letterSpacing: "-0.3px",
    },
    logoSub: {
      fontSize: "11px",
      color: "rgba(0,212,255,0.6)",
      marginTop: "4px",
      fontFamily: "monospace",
      letterSpacing: "1px",
    },
    card: {
      width: "100%",
      maxWidth: "360px",
      // Solid background — NO backdrop-blur (Android Chrome rendering bug)
      backgroundColor: "#0d1225",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "20px",
      padding: "24px",
    },
    tabRow: {
      display: "flex",
      backgroundColor: "rgba(255,255,255,0.05)",
      borderRadius: "12px",
      padding: "4px",
      marginBottom: "24px",
      gap: "4px",
    },
    tabActive: {
      flex: 1,
      padding: "9px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: 600,
      border: "1px solid rgba(0,212,255,0.3)",
      cursor: "pointer",
      backgroundColor: "rgba(0,212,255,0.12)",
      color: "#ffffff",
    },
    tabInactive: {
      flex: 1,
      padding: "9px",
      borderRadius: "8px",
      fontSize: "14px",
      fontWeight: 500,
      border: "1px solid transparent",
      cursor: "pointer",
      backgroundColor: "transparent",
      color: "rgba(255,255,255,0.4)",
    },
    fieldWrap: {
      marginBottom: "16px",
    },
    label: {
      display: "block",
      fontSize: "11px",
      color: "rgba(0,212,255,0.6)",
      marginBottom: "6px",
      fontFamily: "monospace",
      letterSpacing: "0.5px",
    },
    inputWrap: {
      position: "relative" as const,
    },
    input: (hasError: boolean) => ({
      width: "100%",
      height: "44px",
      paddingLeft: "36px",
      paddingRight: "16px",
      backgroundColor: "rgba(255,255,255,0.05)",
      border: `1px solid ${hasError ? "#f87171" : "rgba(255,255,255,0.1)"}`,
      borderRadius: "12px",
      color: "#ffffff",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box" as const,
      fontFamily: "inherit",
    }),
    inputWithEye: (hasError: boolean) => ({
      width: "100%",
      height: "44px",
      paddingLeft: "36px",
      paddingRight: "44px",
      backgroundColor: "rgba(255,255,255,0.05)",
      border: `1px solid ${hasError ? "#f87171" : "rgba(255,255,255,0.1)"}`,
      borderRadius: "12px",
      color: "#ffffff",
      fontSize: "14px",
      outline: "none",
      boxSizing: "border-box" as const,
      fontFamily: "inherit",
    }),
    iconLeft: {
      position: "absolute" as const,
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "rgba(255,255,255,0.3)",
      pointerEvents: "none" as const,
    },
    eyeBtn: {
      position: "absolute" as const,
      right: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "rgba(255,255,255,0.3)",
      padding: "4px",
      display: "flex",
      alignItems: "center",
    },
    errorText: {
      fontSize: "11px",
      color: "#f87171",
      marginTop: "4px",
    },
    submitBtn: (disabled: boolean) => ({
      width: "100%",
      height: "48px",
      background: disabled
        ? "rgba(0,212,255,0.25)"
        : "linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)",
      border: "none",
      borderRadius: "12px",
      color: "#ffffff",
      fontSize: "15px",
      fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      marginTop: "8px",
      opacity: disabled ? 0.7 : 1,
    }),
    divider: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      margin: "20px 0",
    },
    dividerLine: {
      flex: 1,
      height: "1px",
      backgroundColor: "rgba(255,255,255,0.08)",
    },
    dividerText: {
      fontSize: "12px",
      color: "rgba(255,255,255,0.25)",
      fontFamily: "monospace",
    },
    oauthBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      width: "100%",
      height: "44px",
      backgroundColor: "rgba(168,85,247,0.08)",
      border: "1px solid rgba(168,85,247,0.2)",
      borderRadius: "12px",
      color: "rgba(255,255,255,0.7)",
      fontSize: "14px",
      textDecoration: "none",
      boxSizing: "border-box" as const,
    },
    terms: {
      fontSize: "11px",
      color: "rgba(255,255,255,0.2)",
      textAlign: "center" as const,
      marginTop: "16px",
      lineHeight: 1.6,
      fontFamily: "monospace",
    },
    termsLink: {
      color: "rgba(0,212,255,0.5)",
      textDecoration: "none",
    },
  };

  return (
    <div style={S.page}>
      {/* Back button */}
      <button onClick={() => setLocation("/")} style={S.backBtn}>
        <ArrowLeft size={15} />
        返回首页
      </button>

      {/* Logo */}
      <div style={S.logoWrap}>
        <div style={S.logoIcon}>
          <MessageCircle size={28} color="white" />
        </div>
        <h1 style={S.logoTitle}>比特AI</h1>
        <p style={S.logoSub}>让AI社交成为生活习惯 · 澳洲 AFT 集团</p>
      </div>

      {/* Card — solid background, NO backdrop-blur */}
      <div style={S.card}>

        {/* Tab switcher */}
        <div style={S.tabRow}>
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setErrors({}); }}
              style={mode === m ? S.tabActive : S.tabInactive}
            >
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Name field (register only) */}
          {mode === "register" && (
            <div style={S.fieldWrap}>
              <label style={S.label}>昵称</label>
              <div style={S.inputWrap}>
                <span style={S.iconLeft}><User size={14} /></span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="你的显示名称"
                  autoComplete="nickname"
                  style={S.input(!!errors.name)}
                />
              </div>
              {errors.name && <p style={S.errorText}>{errors.name}</p>}
            </div>
          )}

          {/* Email */}
          <div style={S.fieldWrap}>
            <label style={S.label}>邮箱</label>
            <div style={S.inputWrap}>
              <span style={S.iconLeft}><Mail size={14} /></span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                style={S.input(!!errors.email)}
              />
            </div>
            {errors.email && <p style={S.errorText}>{errors.email}</p>}
          </div>

          {/* Password */}
          <div style={S.fieldWrap}>
            <label style={S.label}>密码</label>
            <div style={S.inputWrap}>
              <span style={S.iconLeft}><Lock size={14} /></span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "至少 6 位" : "输入密码"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                style={S.inputWithEye(!!errors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={S.eyeBtn}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && <p style={S.errorText}>{errors.password}</p>}
          </div>

          {/* Forgot password link — login mode only */}
          {mode === "login" && (
            <div style={{ textAlign: "right", marginBottom: "4px" }}>
              <button
                type="button"
                onClick={() => setLocation("/forgot-password")}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(0,212,255,0.6)",
                  fontSize: "12px",
                  cursor: "pointer",
                  padding: "2px 0",
                  fontFamily: "inherit",
                }}
              >
                忘记密码？
              </button>
            </div>
          )}

          {/* Cloudflare Turnstile — register mode only, only shown if site key is configured */}
          {mode === "register" && TURNSTILE_SITE_KEY && (
            <div style={{ marginBottom: "12px", display: "flex", justifyContent: "center" }}>
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken("")}
                onError={() => setTurnstileToken("")}
                options={{ theme: "dark", size: "normal" }}
              />
            </div>
          )}
          {/* Submit */}
          <button type="submit" disabled={isPending} style={S.submitBtn(isPending)}>
            {isPending ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                {mode === "login" ? "登录中..." : "注册中..."}
              </>
            ) : (
              mode === "login" ? "登录" : "创建账号"
            )}
          </button>
        </form>

        {/* Terms */}
        <p style={S.terms}>
          继续即表示你同意我们的{" "}
          <a href="/terms" style={S.termsLink}>服务条款</a>
          {" "}和{" "}
          <a href="/privacy" style={S.termsLink}>隐私政策</a>
        </p>
      </div>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="email"], input[type="password"], input[type="text"] {
          -webkit-appearance: none;
          appearance: none;
        }
        input[type="email"]:focus, input[type="password"]:focus, input[type="text"]:focus {
          border-color: rgba(0,212,255,0.5) !important;
          box-shadow: 0 0 0 2px rgba(0,212,255,0.1);
        }
      `}</style>
    </div>
  );
}
