/**
 * ResetPassword — 重置密码页面
 * 从 URL ?token= 读取 token → 验证有效性 → 用户输入新密码 → 完成重置并自动登录
 * 纯实色背景，无 backdrop-filter，Android Chrome 兼容
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle, MessageCircle } from "lucide-react";
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
    padding: "11px 40px 11px 38px",
    outline: "none",
    fontFamily: "system-ui, -apple-system, sans-serif",
    WebkitAppearance: "none" as const,
    appearance: "none" as const,
    boxSizing: "border-box" as const,
  }),
  eyeBtn: {
    position: "absolute" as const,
    right: "12px",
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.3)",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
  },
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
  statusBox: (color: string) => ({
    background: `rgba(${color}, 0.06)`,
    border: `1px solid rgba(${color}, 0.2)`,
    borderRadius: "14px",
    padding: "20px 16px",
    textAlign: "center" as const,
  }),
  statusTitle: (color: string) => ({
    color: `rgb(${color})`,
    fontSize: "15px",
    fontWeight: 600,
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  }),
  statusDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: "13px",
    lineHeight: 1.5,
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
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
    width: "100%",
  },
};

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [status, setStatus] = useState<"idle" | "success" | "invalid">("idle");

  // Extract token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
    if (!t) setStatus("invalid");
  }, []);

  // Verify token validity
  const { data: tokenCheck, isLoading: isVerifying } = trpc.emailAuth.verifyResetToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  useEffect(() => {
    if (!isVerifying && tokenCheck && !tokenCheck.valid) {
      setStatus("invalid");
    }
  }, [tokenCheck, isVerifying]);

  const resetPassword = trpc.emailAuth.resetPassword.useMutation({
    onSuccess: () => {
      setStatus("success");
      toast.success("密码已重置，即将跳转...");
      setTimeout(() => setLocation("/app/chat"), 2000);
    },
    onError: (err) => {
      toast.error(err.message || "重置失败，请重试");
    },
  });

  const validate = () => {
    const newErrors: typeof errors = {};
    if (password.length < 8) newErrors.password = "密码至少 8 位";
    if (password !== confirmPassword) newErrors.confirm = "两次输入的密码不一致";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    resetPassword.mutate({ token, newPassword: password });
  };

  const isLoading = isVerifying || !token;

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <MessageCircle size={24} color="white" />
        </div>

        <h1 style={S.title}>重置密码</h1>
        <p style={S.subtitle}>
          {status === "success"
            ? "密码已成功重置"
            : status === "invalid"
            ? "链接无效或已过期"
            : "请输入新密码"}
        </p>

        {isLoading && status === "idle" && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#00d4ff", margin: "0 auto" }} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginTop: "12px", fontFamily: "system-ui" }}>
              验证链接中...
            </p>
          </div>
        )}

        {status === "invalid" && (
          <div style={S.statusBox("255,51,102")}>
            <div style={S.statusTitle("255,51,102")}>
              <XCircle size={16} />
              链接无效或已过期
            </div>
            <p style={S.statusDesc}>
              该重置链接已失效（有效期 1 小时）。请重新申请密码重置。
            </p>
          </div>
        )}

        {status === "success" && (
          <div style={S.statusBox("0,212,255")}>
            <div style={S.statusTitle("0,212,255")}>
              <CheckCircle2 size={16} />
              密码重置成功
            </div>
            <p style={S.statusDesc}>
              正在跳转到主页...
            </p>
          </div>
        )}

        {status === "idle" && !isLoading && tokenCheck?.valid && (
          <form onSubmit={handleSubmit}>
            <div style={S.fieldWrap}>
              <label style={S.label}>新密码</label>
              <div style={S.inputWrap}>
                <span style={S.iconLeft}><Lock size={14} /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })); }}
                  placeholder="至少 8 位"
                  autoComplete="new-password"
                  style={S.input(!!errors.password)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={S.eyeBtn}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p style={S.errorText}>{errors.password}</p>}
            </div>

            <div style={S.fieldWrap}>
              <label style={S.label}>确认新密码</label>
              <div style={S.inputWrap}>
                <span style={S.iconLeft}><Lock size={14} /></span>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirm: undefined })); }}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                  style={S.input(!!errors.confirm)}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={S.eyeBtn}>
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.confirm && <p style={S.errorText}>{errors.confirm}</p>}
            </div>

            <button
              type="submit"
              disabled={resetPassword.isPending}
              style={S.submitBtn(resetPassword.isPending)}
            >
              {resetPassword.isPending ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  重置中...
                </>
              ) : "确认重置密码"}
            </button>
          </form>
        )}

        <button style={S.backLink} onClick={() => setLocation("/login")}>
          返回登录
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="password"]:focus, input[type="text"]:focus {
          border-color: rgba(0,212,255,0.5) !important;
          box-shadow: 0 0 0 2px rgba(0,212,255,0.1) !important;
        }
      `}</style>
    </div>
  );
}
