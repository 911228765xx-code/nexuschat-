/**
 * ErrorBoundary — 错误边界组件
 * 支持两种模式：
 *   - page: 页面级降级（默认），显示友好提示 + 重试按钮，不影响其他页面
 *   - app:  应用级降级，全屏显示，用于最外层兜底
 */
import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw, Home, WifiOff, ServerCrash } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** 降级模式：page（页面级，默认）| app（全局兜底） */
  mode?: "page" | "app";
  /** 自定义回退 UI */
  fallback?: ReactNode;
  /** 页面标题，用于错误提示 */
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

function getErrorType(error: Error | null) {
  if (!error) return "unknown";
  const msg = error.message.toLowerCase();
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) return "network";
  if (msg.includes("chunk") || msg.includes("loading") || msg.includes("import")) return "chunk";
  if (msg.includes("10001") || msg.includes("unauthorized") || msg.includes("login")) return "auth";
  return "runtime";
}

type ErrorInfo = { icon: typeof WifiOff; title: string; desc: string; action: string };

const ERROR_MESSAGES: Record<string, ErrorInfo> = {
  network: {
    icon: WifiOff,
    title: "网络连接异常",
    desc: "无法连接到服务器，请检查网络后重试",
    action: "重新连接",
  },
  chunk: {
    icon: RefreshCw,
    title: "页面资源加载失败",
    desc: "部分资源未能加载，可能是版本更新导致，请刷新页面",
    action: "刷新页面",
  },
  auth: {
    icon: AlertTriangle,
    title: "登录状态已过期",
    desc: "请重新登录后继续使用",
    action: "重新登录",
  },
  runtime: {
    icon: ServerCrash,
    title: "页面遇到了问题",
    desc: "发生了意外错误，请尝试重新加载此页面",
    action: "重新加载",
  },
  unknown: {
    icon: AlertTriangle,
    title: "出现了未知错误",
    desc: "请稍后重试，如问题持续请联系支持",
    action: "重试",
  },
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error.message, info.componentStack?.slice(0, 200));
  }

  handleRetry = () => {
    const errorType = getErrorType(this.state.error);
    if (errorType === "chunk" || errorType === "auth") {
      window.location.reload();
    } else {
      this.setState((s) => ({ hasError: false, error: null, errorCount: s.errorCount + 1 }));
    }
  };

  handleGoHome = () => {
    window.location.href = "/app/chat";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const errorType = getErrorType(this.state.error);
    const info = ERROR_MESSAGES[errorType];
    const Icon = info.icon;
    const isAppMode = this.props.mode === "app";

    if (isAppMode) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-6">
              <Icon size={28} className="text-destructive" />
            </div>
            <h2 className="text-lg font-bold font-display mb-2">{info.title}</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{info.desc}</p>
            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <RefreshCw size={14} />
                {info.action}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Page-level fallback — compact, inline
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-6 py-12 text-center">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center mb-4",
          errorType === "network"
            ? "bg-amber-500/10 border border-amber-500/20"
            : "bg-destructive/10 border border-destructive/20"
        )}>
          <Icon size={24} className={errorType === "network" ? "text-amber-500" : "text-destructive"} />
        </div>
        <h3 className="text-base font-semibold font-display mb-1.5">
          {this.props.pageName ? `${this.props.pageName}加载失败` : info.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">{info.desc}</p>
        <div className="flex gap-2.5">
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary/60 border border-border/30 text-sm font-medium hover:bg-secondary/80 active:scale-[0.98] transition-all"
          >
            <RefreshCw size={13} />
            {info.action}
          </button>
          <button
            onClick={this.handleGoHome}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-sm font-medium hover:bg-[#00d4ff]/15 active:scale-[0.98] transition-all"
          >
            <Home size={13} />
            返回首页
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
