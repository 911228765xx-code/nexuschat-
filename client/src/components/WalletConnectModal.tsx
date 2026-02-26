import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";

interface WalletOption {
  name: string;
  icon: string;
  color: string;
  popular?: boolean;
}

const wallets: WalletOption[] = [
  { name: "MetaMask", icon: "🦊", color: "#E2761B", popular: true },
  { name: "WalletConnect", icon: "🔗", color: "#3B99FC", popular: true },
  { name: "Coinbase Wallet", icon: "🔵", color: "#0052FF", popular: true },
  { name: "Trust Wallet", icon: "🛡️", color: "#3375BB" },
  { name: "Phantom", icon: "👻", color: "#AB9FF2" },
  { name: "OKX Wallet", icon: "⭕", color: "#000000" },
  { name: "Rabby", icon: "🐰", color: "#7C3AED" },
  { name: "Rainbow", icon: "🌈", color: "#001E59" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function WalletConnectModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<string | null>(null);

  if (!open) return null;

  const handleConnect = (name: string) => {
    setConnecting(name);
    setTimeout(() => {
      setConnecting(null);
      setConnected(name);
      setTimeout(() => {
        onClose();
        setConnected(null);
      }, 1500);
    }, 2000);
  };

  const popular = wallets.filter(w => w.popular);
  const more = wallets.filter(w => !w.popular);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-[#0f1629]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <div>
            <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">{t("wallet.title")}</h2>
            <p className="text-sm text-gray-400 mt-1">{t("wallet.desc")}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Popular */}
        <div className="px-6 pt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{t("wallet.popular")}</p>
          <div className="grid grid-cols-3 gap-3">
            {popular.map((w) => (
              <button
                key={w.name}
                onClick={() => handleConnect(w.name)}
                disabled={!!connecting || !!connected}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-[#00d4ff]/30 hover:bg-white/10 transition-all group disabled:opacity-50"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{w.icon}</span>
                <span className="text-xs text-gray-300 font-medium">{w.name}</span>
                {connecting === w.name && (
                  <span className="text-[10px] text-[#00d4ff] animate-pulse">{t("wallet.connecting")}</span>
                )}
                {connected === w.name && (
                  <span className="text-[10px] text-green-400">✓ {t("wallet.connected")}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* More */}
        <div className="px-6 pt-5 pb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{t("wallet.more")}</p>
          <div className="space-y-2">
            {more.map((w) => (
              <button
                key={w.name}
                onClick={() => handleConnect(w.name)}
                disabled={!!connecting || !!connected}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#00d4ff]/30 hover:bg-white/10 transition-all disabled:opacity-50"
              >
                <span className="text-2xl">{w.icon}</span>
                <span className="text-sm text-gray-300 font-medium flex-1 text-left">{w.name}</span>
                {connecting === w.name && (
                  <span className="text-xs text-[#00d4ff] animate-pulse">{t("wallet.connecting")}</span>
                )}
                {connected === w.name && (
                  <span className="text-xs text-green-400">✓ {t("wallet.connected")}</span>
                )}
                {connecting !== w.name && connected !== w.name && (
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00d4ff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#a855f7]/10 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}
