/**
 * LoginPromptCard — 未登录引导卡
 * 在需要登录的页面中显示，引导用户登录以解锁完整功能
 */
import { LogIn, Sparkles, Shield, Zap } from "lucide-react";
import { getLoginUrl } from "@/const";

interface LoginPromptCardProps {
  /** 页面名称，用于个性化提示 */
  pageName?: string;
  /** 功能亮点列表（最多3条） */
  features?: string[];
  /** 是否紧凑模式（嵌入页面中段） */
  compact?: boolean;
}

const DEFAULT_FEATURES = [
  "查看真实钱包资产与代币余额",
  "同步跟单策略与收益记录",
  "解锁完整社交与消息功能",
];

export default function LoginPromptCard({
  pageName,
  features = DEFAULT_FEATURES,
  compact = false,
}: LoginPromptCardProps) {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  if (compact) {
    return (
      <div className="mx-4 my-3 p-4 rounded-2xl bg-gradient-to-r from-[#00d4ff]/10 to-[#a855f7]/10 border border-[#00d4ff]/20 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center flex-shrink-0">
          <LogIn size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            登录后查看{pageName ? `${pageName}完整数据` : "完整功能"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">连接 Manus 账号，数据实时同步</p>
        </div>
        <button
          onClick={handleLogin}
          className="flex-shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white text-xs font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
        >
          立即登录
        </button>
      </div>
    );
  }

  const icons = [Sparkles, Shield, Zap];

  return (
    <div className="mx-4 mt-4 p-5 rounded-2xl bg-gradient-to-br from-[#00d4ff]/10 via-[#a855f7]/8 to-[#00ff88]/5 border border-[#00d4ff]/20">
      <div className="flex flex-col items-center text-center gap-4">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#00d4ff]/20">
          <LogIn size={28} className="text-white" />
        </div>

        {/* Title */}
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">
            登录后解锁{pageName ? `${pageName}` : "完整功能"}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            使用 Manus 账号登录，数据实时同步，多设备无缝访问
          </p>
        </div>

        {/* Feature list */}
        <div className="w-full space-y-2">
          {features.slice(0, 3).map((feat, i) => {
            const Icon = icons[i] ?? Sparkles;
            return (
              <div
                key={feat}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background/40 border border-border/20"
              >
                <div className="w-7 h-7 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center flex-shrink-0">
                  <Icon size={13} className="text-[#00d4ff]" />
                </div>
                <span className="text-xs text-foreground/80">{feat}</span>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <button
          onClick={handleLogin}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[#00d4ff]/20"
        >
          立即登录
        </button>

        <p className="text-[10px] text-muted-foreground">
          安全登录 · 无需密码 · 支持 Web3 钱包
        </p>
      </div>
    </div>
  );
}
