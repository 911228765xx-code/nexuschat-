/*
 * AppLayout — Cyberpunk Noir mobile-first layout
 * Bottom tab navigation with glassmorphism effect
 * 5 tabs: Chat / Discover / Research / Trading / Profile
 */
import { useLocation, Link } from "wouter";
import { MessageCircle, Compass, Brain, TrendingUp, User } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

const tabs = [
  { path: "/app/chat", label: "消息", icon: MessageCircle },
  { path: "/app/discover", label: "发现", icon: Compass },
  { path: "/app/research", label: "投研", icon: Brain },
  { path: "/app/trading", label: "跟单", icon: TrendingUp },
  { path: "/app/profile", label: "我的", icon: User },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="glass border-t border-border/50 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive =
              location === tab.path ||
              (tab.path === "/app/chat" && location.startsWith("/app/chat/"));
            const Icon = tab.icon;

            return (
              <Link key={tab.path} href={tab.path}>
                <button className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-colors">
                  {isActive && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-neon-cyan"
                      style={{
                        boxShadow: "0 0 8px oklch(0.82 0.15 195 / 0.6)",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    size={22}
                    className={
                      isActive
                        ? "text-neon-cyan drop-shadow-[0_0_6px_oklch(0.82_0.15_195/0.5)]"
                        : "text-muted-foreground"
                    }
                  />
                  <span
                    className={`text-[10px] font-medium ${
                      isActive ? "text-neon-cyan" : "text-muted-foreground"
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
