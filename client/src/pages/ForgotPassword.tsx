/**
 * ForgotPassword — 忘记密码页面
 * 用户输入邮箱 → 生成重置链接 → 显示链接供用户直接使用
 * 纯实色背景，无 backdrop-filter，Android Chrome 兼容
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Mail, ArrowLeft, Loader2, CheckCircle2, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const S = {
  page: {
    minHeight: "100dvh",
    background: "#0a0a0f",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    paddingTop: "calc(env(safe-area-inset-top) + 24px)",
    paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
  },
  card: {
    width: "100%",
    maxWidth: "360px",
    background: "#12121a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "28px 24px",
  },
  logo: {
    width: "52px",
    height: "52px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #00d4ff, #a855f7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  title: {
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: 700,
    textAlign: "center" as const,
    marginBottom: "6px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  subtitle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: "13px",
    textAlign: "center" as const,
    marginBottom: "24px",
    lineHeight: 1.5,
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  fieldWrap: { marginBottom: "16px" },
  label: {
    display: "block",
    color: "rgba(255,255,255,0.6)",
    fontSize: "12px",
    marginBottom: "6px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  inputWrap: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
  },
  iconLeft: {
    position: "absolute" as const,
    left: "12px",
    color: "rgba(255,255,255,0.3)",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none" as const,
  },
  input: (hasError: boolean) => ({
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${hasError ? "rgba(255,51,102,0.5)" : "rgba(255,255,255,0.1)"}`,
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "14px",
    padding: "11px 12px 11px 38px",
    outline: "none",
    fontFamily: "system-ui, -apple-system, sans-serif",
    WebkitAppearance: "none" as const,
    appearance: "none" as const,
    boxSizing: "border-box" as const,
    width_: "100%",
  }),
  errorText: {
    color: "rgba(255,51,102,0.8)",
    fontSize: "11px",
    marginTop: "4px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  submitBtn: (disabled: boolean) => ({
    width: "100%",
    background: disabled
      ? "rgba(0,212,255,0.3)"
      : "linear-gradient(135deg, #00d4ff, #a855f7)",
    border: "none",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 600,
    padding: "13px",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    marginTop: "8px",
  }),
  backLink: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "rgba(255,255,255,0.45)",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "20px",
    justifyContent: "center" as const,
    fontFamily: "system-ui, -apple-system, sans-serif",
    background: "none",
    border: "none",
    padding: 0,
  },
  successBox: {
    background: "rgba(0,212,255,0.06)",
    border: "1px solid rgba(0,212,255,0.2)",
    borderRadius: "14px",
    padding: "16px",
    marginTop: "8px",
  },
  successTitle: {
    color: "#00d4ff",
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  successDesc: {
    color: "rgba(255,255,255,0.55)",
    fontSize: "12px",
    lineHeight: 1.6,
    marginBottom: "12px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  resetUrlBox: {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    padding: "10px 12px",
    fontSize: "11px",
    color: "rgba(255,255,255,0.5)",
    wordBreak: "break-all" as const,
    fontFamily: "monospace",
    marginBottom: "10px",
  },
  actionRow: {
    display: "flex",
    gap: "8px",
  },
  actionBtn: (accent: string) => ({
    flex: 1,
    background: `rgba(${accent}, 0.1)`,
    border: `1px solid rgba(${accent}, 0.25)`,
    borderRadius: "10px",
    color: `rgb(${accent})`,
    fontSize: "12px",
    fontWeight: 500,
    padding: "8px 10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  }),
};

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const requestReset = trpc.emailAuth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    },
    onError: (err) => {
      toast.error(err.message || "请求失败，请稍后重试");
    },
  });

  const validate = () => {
    if (!email.trim()) {
      setEmailError("请输入邮箱地址");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("请输入有效的邮箱地址");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    requestReset.mutate({
      email: email.trim(),
      origin: window.location.origin,
    });
  };

  const copyLink = () => {
    if (!resetUrl) return;
    navigator.clipboard.writeText(resetUrl).then(() => {
      toast.success("重置链接已复制");
    });
  };

  const openLink = () => {
    if (!resetUrl) return;
    window.location.href = resetUrl;
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Logo */}
        <div style={S.logo}>
          <MessageCircle size={24} color="white" />
        </div>

        <h1 style={S.title}>忘记密码</h1>
        <p style={S.subtitle}>
          {resetUrl
            ? "重置链接已生成，请点击下方按钮直接重置"
            : "输入注册邮箱，获取密码重置链接"}
        </p>

        {!resetUrl ? (
          <form onSubmit={handleSubmit}>
            <div style={S.fieldWrap}>
              <label style={S.label}>邮箱</label>
              <div style={S.inputWrap}>
                <span style={S.iconLeft}><Mail size={14} /></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  placeholder="your@email.com"
                  autoComplete="email"
                  style={{ ...S.input(!!emailError), width: "100%" }}
                />
              </div>
              {emailError && <p style={S.errorText}>{emailError}</p>}
            </div>

            <button
              type="submit"
              disabled={requestReset.isPending}
              style={S.submitBtn(requestReset.isPending)}
            >
              {requestReset.isPending ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  生成重置链接...
                </>
              ) : "获取重置链接"}
            </button>
          </form>
        ) : (
          <div style={S.successBox}>
            <div style={S.successTitle}>
              <CheckCircle2 size={15} />
              重置链接已生成
            </div>
            <p style={S.successDesc}>
              链接有效期 1 小时。点击"直接重置"跳转到密码重置页面，或复制链接在浏览器中打开。
            </p>
            <div style={S.resetUrlBox}>{resetUrl}</div>
            <div style={S.actionRow}>
              <button style={S.actionBtn("0,212,255")} onClick={openLink}>
                <ExternalLink size={12} />
                直接重置
              </button>
              <button style={S.actionBtn("168,85,247")} onClick={copyLink}>
                <Copy size={12} />
                复制链接
              </button>
            </div>
          </div>
        )}

        <button style={S.backLink} onClick={() => setLocation("/login")}>
          <ArrowLeft size={13} />
          返回登录
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="email"]:focus {
          border-color: rgba(0,212,255,0.5) !important;
          box-shadow: 0 0 0 2px rgba(0,212,255,0.1) !important;
        }
      `}</style>
    </div>
  );
}
