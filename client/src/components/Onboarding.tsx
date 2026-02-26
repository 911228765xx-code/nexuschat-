/*
 * Onboarding — 新用户引导流程
 * 5步引导：欢迎 → 钱包教育 → 连接钱包 → 设置Profile → 加入社群
 * Cyberpunk Noir风格，全屏覆盖
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, User, Users, ArrowRight, ArrowLeft, Check, Sparkles,
  Shield, Zap, Key, Lock, Eye, Globe, BookOpen, AlertTriangle,
  ChevronDown, ChevronUp,
} from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  { id: 0, icon: Sparkles, color: "neon-cyan" },
  { id: 1, icon: BookOpen, color: "neon-green" },
  { id: 2, icon: Wallet, color: "neon-purple" },
  { id: 3, icon: User, color: "neon-cyan" },
  { id: 4, icon: Users, color: "neon-green" },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [walletConnected, setWalletConnected] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const avatars = ["🦊", "🐻", "🦁", "🐺", "🦅", "🐲", "🦈", "🐙"];

  const recommendedGroups = [
    { id: "1", name: "NexusChat Official", members: "12.4K", icon: "🌐" },
    { id: "2", name: "DeFi Alpha", members: "8.7K", icon: "💎" },
    { id: "3", name: "NFT Collectors", members: "5.2K", icon: "🎨" },
    { id: "4", name: "BTC Maximalists", members: "15.1K", icon: "₿" },
    { id: "5", name: "ETH Developers", members: "9.3K", icon: "⟠" },
    { id: "6", name: "Trading Signals", members: "6.8K", icon: "📊" },
  ];

  const walletFaqs = [
    {
      q: "What is a crypto wallet?",
      a: "A crypto wallet is like a digital bank account that only you control. It stores your private keys — the passwords that prove you own your digital assets. Unlike a bank, no company or government can freeze your wallet.",
      icon: Wallet,
    },
    {
      q: "What are private keys and seed phrases?",
      a: "Your private key is a secret code that unlocks your wallet. A seed phrase (12 or 24 words) is a human-readable backup of your private key. NEVER share them with anyone. If someone has your seed phrase, they have full control of your assets.",
      icon: Key,
    },
    {
      q: "Is it safe? What if I lose my phone?",
      a: "Your assets live on the blockchain, not on your phone. As long as you have your seed phrase backed up safely (written on paper, stored offline), you can recover your wallet on any device. Hardware wallets (like Ledger) add an extra layer of security.",
      icon: Shield,
    },
    {
      q: "What can I do with a wallet?",
      a: "Send and receive crypto, interact with DeFi protocols, collect NFTs, vote in DAOs, sign in to Web3 apps (like NexusChat!) — all without creating an account. Your wallet IS your account.",
      icon: Globe,
    },
  ];

  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const canProceed = () => {
    if (step === 2) return walletConnected;
    if (step === 3) return nickname.trim().length > 0;
    return true;
  };

  const totalSteps = STEPS.length;

  const next = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else {
      localStorage.setItem("nexuschat_onboarded", "true");
      onComplete();
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Progress bar */}
      <div className="px-6 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="flex gap-1.5">
          {STEPS.map((s) => (
            <div key={s.id} className="flex-1 h-1 rounded-full overflow-hidden bg-secondary/40">
              <motion.div
                className={`h-full rounded-full ${
                  s.id < step
                    ? "bg-neon-green"
                    : s.id === step
                    ? "bg-neon-cyan"
                    : "bg-transparent"
                }`}
                initial={{ width: "0%" }}
                animate={{ width: s.id <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            {step + 1} / {totalSteps}
          </span>
          <button
            onClick={() => {
              localStorage.setItem("nexuschat_onboarded", "true");
              onComplete();
            }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm text-center space-y-8"
            >
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-neon-cyan/20 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-neon-cyan/10 flex items-center justify-center">
                  <Sparkles size={40} className="text-neon-cyan" />
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-bold font-display">
                  Welcome to{" "}
                  <span className="bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
                    NexusChat
                  </span>
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The Web3-native social platform where your wallet is your identity.
                  Chat securely, research with AI, and trade automatically.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Shield, label: "E2E Encrypted", color: "text-neon-green" },
                  { icon: Zap, label: "AI Research", color: "text-neon-purple" },
                  { icon: Wallet, label: "Non-Custodial", color: "text-neon-cyan" },
                ].map((f) => (
                  <div key={f.label} className="p-3 rounded-xl bg-secondary/30 border border-border/20 space-y-2">
                    <f.icon size={20} className={`${f.color} mx-auto`} />
                    <p className="text-[10px] text-muted-foreground">{f.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 1: Wallet Education */}
          {step === 1 && (
            <motion.div
              key="education"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-neon-green/15 border border-neon-green/20 flex items-center justify-center mx-auto mb-3">
                  <BookOpen size={28} className="text-neon-green" />
                </div>
                <h2 className="text-2xl font-bold font-display">What is a Wallet?</h2>
                <p className="text-sm text-muted-foreground">
                  New to Web3? No worries. Here's everything you need to know in 60 seconds.
                </p>
              </div>

              {/* Visual explainer */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-neon-cyan/5 to-neon-purple/5 border border-border/20 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-cyan/15 flex items-center justify-center shrink-0">
                    <Lock size={18} className="text-neon-cyan" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">You Own Your Data</p>
                    <p className="text-[10px] text-muted-foreground">No company controls your account. You hold the keys.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center shrink-0">
                    <Eye size={18} className="text-neon-purple" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">Transparent & Verifiable</p>
                    <p className="text-[10px] text-muted-foreground">All transactions are recorded on the blockchain, publicly auditable.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neon-green/15 flex items-center justify-center shrink-0">
                    <Globe size={18} className="text-neon-green" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">One Wallet, All Apps</p>
                    <p className="text-[10px] text-muted-foreground">Use the same wallet across thousands of Web3 apps. No more passwords.</p>
                  </div>
                </div>
              </div>

              {/* FAQ accordion */}
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {walletFaqs.map((faq, i) => {
                  const isOpen = expandedFaq === i;
                  const FaqIcon = faq.icon;
                  return (
                    <div key={i} className="rounded-xl border border-border/20 overflow-hidden">
                      <button
                        onClick={() => setExpandedFaq(isOpen ? null : i)}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/20 transition-colors"
                      >
                        <FaqIcon size={16} className="text-neon-cyan shrink-0" />
                        <span className="flex-1 text-xs font-medium">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp size={14} className="text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                        )}
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="px-3 pb-3 text-[11px] text-muted-foreground leading-relaxed border-t border-border/10 pt-2 mx-3">
                              {faq.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Safety reminder */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neon-red/5 border border-neon-red/20">
                <AlertTriangle size={16} className="text-neon-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-neon-red">Golden Rule</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    NEVER share your seed phrase or private key with anyone — not even NexusChat. We will never ask for it.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Connect Wallet */}
          {step === 2 && (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-neon-purple/15 border border-neon-purple/20 flex items-center justify-center mx-auto mb-4">
                  <Wallet size={28} className="text-neon-purple" />
                </div>
                <h2 className="text-2xl font-bold font-display">Connect Your Wallet</h2>
                <p className="text-sm text-muted-foreground">
                  Your wallet address becomes your identity. No email, no phone number needed.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { name: "MetaMask", icon: "🦊", popular: true },
                  { name: "WalletConnect", icon: "🔗", popular: true },
                  { name: "Coinbase Wallet", icon: "🔵", popular: true },
                  { name: "Phantom", icon: "👻", popular: false },
                ].map((w) => (
                  <button
                    key={w.name}
                    onClick={() => setWalletConnected(true)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                      walletConnected
                        ? "border-neon-green/40 bg-neon-green/5"
                        : "border-border/30 bg-secondary/30 hover:border-neon-purple/40 hover:bg-neon-purple/5"
                    }`}
                  >
                    <span className="text-2xl">{w.icon}</span>
                    <span className="flex-1 text-left text-sm font-medium">{w.name}</span>
                    {w.popular && !walletConnected && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan font-mono">Popular</span>
                    )}
                    {walletConnected ? (
                      <Check size={16} className="text-neon-green" />
                    ) : (
                      <ArrowRight size={14} className="text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>

              {walletConnected && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-neon-green/5 border border-neon-green/20 text-center"
                >
                  <p className="text-xs text-neon-green font-mono">
                    ✓ Connected: 0x71C7...3a9b
                  </p>
                </motion.div>
              )}

              {/* Don't have a wallet? */}
              <div className="text-center">
                <button
                  onClick={() => setStep(1)}
                  className="text-[11px] text-neon-cyan hover:underline"
                >
                  Don't have a wallet? Learn how to create one →
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Set Profile */}
          {step === 3 && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-neon-cyan/15 border border-neon-cyan/20 flex items-center justify-center mx-auto mb-4">
                  <User size={28} className="text-neon-cyan" />
                </div>
                <h2 className="text-2xl font-bold font-display">Set Up Your Profile</h2>
                <p className="text-sm text-muted-foreground">
                  Choose an avatar and nickname. You can change these anytime.
                </p>
              </div>

              {/* Avatar selection */}
              <div className="space-y-3">
                <label className="text-xs text-muted-foreground font-medium">Choose Avatar</label>
                <div className="grid grid-cols-4 gap-3">
                  {avatars.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedAvatar(i)}
                      className={`w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${
                        selectedAvatar === i
                          ? "bg-neon-cyan/15 border-2 border-neon-cyan scale-105"
                          : "bg-secondary/40 border border-border/20 hover:border-neon-cyan/30"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nickname */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. cryptowhale"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
                />
                {nickname && (
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Display: {avatars[selectedAvatar]} {nickname}.eth
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 4: Join Communities */}
          {step === 4 && (
            <motion.div
              key="communities"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-neon-green/15 border border-neon-green/20 flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-neon-green" />
                </div>
                <h2 className="text-2xl font-bold font-display">Join Communities</h2>
                <p className="text-sm text-muted-foreground">
                  Follow communities that interest you. Get the latest alpha.
                </p>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {recommendedGroups.map((g) => {
                  const isSelected = selectedGroups.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGroup(g.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "border-neon-green/40 bg-neon-green/5"
                          : "border-border/20 bg-secondary/30 hover:border-neon-green/30"
                      }`}
                    >
                      <span className="text-2xl w-10 h-10 rounded-xl bg-secondary/60 flex items-center justify-center shrink-0">
                        {g.icon}
                      </span>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{g.name}</p>
                        <p className="text-[10px] text-muted-foreground">{g.members} members</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isSelected ? "bg-neon-green" : "border border-border/40"
                      }`}>
                        {isSelected && <Check size={14} className="text-background" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedGroups.length > 0 && (
                <p className="text-xs text-neon-green text-center font-mono">
                  {selectedGroups.length} communities selected
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={prev}
              className="w-12 h-12 rounded-xl border border-border/30 bg-secondary/30 flex items-center justify-center hover:bg-secondary/50 transition-colors"
            >
              <ArrowLeft size={18} className="text-muted-foreground" />
            </button>
          )}
          <button
            onClick={next}
            disabled={!canProceed()}
            className={`flex-1 h-12 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
              canProceed()
                ? "bg-gradient-to-r from-neon-cyan to-neon-purple text-background hover:opacity-90"
                : "bg-secondary/40 text-muted-foreground cursor-not-allowed"
            }`}
          >
            {step === totalSteps - 1 ? (
              <>
                <Sparkles size={16} />
                Start Exploring
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
