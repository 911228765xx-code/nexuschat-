/*
 * Discover — 发现页面
 * 热门社群、推荐用户、代币门控群
 */
import { useState } from "react";
import { Search, Users, Lock, TrendingUp, Star, Zap, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";

interface Community {
  id: string;
  name: string;
  avatar: string;
  members: number;
  description: string;
  isTokenGated: boolean;
  gateToken?: string;
  category: string;
  isHot?: boolean;
}

interface TrendingUser {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  followers: number;
  isVerified: boolean;
}

const mockCommunities: Community[] = [
  { id: "1", name: "BAYC Holders 🐵", avatar: "🐵", members: 8432, description: "Bored Ape Yacht Club official holders community", isTokenGated: true, gateToken: "BAYC NFT", category: "NFT", isHot: true },
  { id: "2", name: "DeFi Alpha Club 🔒", avatar: "🔑", members: 3210, description: "Professional DeFi strategy sharing & discussion", isTokenGated: true, gateToken: "≥100 UNI", category: "DeFi", isHot: true },
  { id: "3", name: "ETH Developers", avatar: "⟠", members: 12500, description: "Ethereum developer community", isTokenGated: false, category: "Dev" },
  { id: "4", name: "Solana Ecosystem", avatar: "◎", members: 9800, description: "Solana ecosystem projects & alpha sharing", isTokenGated: false, category: "L1" },
  { id: "5", name: "AI x Crypto", avatar: "🤖", members: 5600, description: "Exploring the intersection of AI and crypto", isTokenGated: false, category: "AI", isHot: true },
  { id: "6", name: "Azuki Holders", avatar: "⛩️", members: 4200, description: "Azuki NFT holders exclusive community", isTokenGated: true, gateToken: "Azuki NFT", category: "NFT" },
];

const mockUsers: TrendingUser[] = [
  { id: "1", name: "vitalik.eth", avatar: "V", bio: "Ethereum co-founder", followers: 5200000, isVerified: true },
  { id: "2", name: "punk6529.eth", avatar: "P", bio: "NFT collector & thought leader", followers: 890000, isVerified: true },
  { id: "3", name: "cobie.eth", avatar: "C", bio: "Crypto trader & analyst", followers: 720000, isVerified: true },
  { id: "4", name: "0xSisyphus", avatar: "S", bio: "DeFi researcher", followers: 340000, isVerified: false },
];

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"communities" | "users">("communities");
  const { t } = useI18n();

  const categories = ["All", "NFT", "DeFi", "L1", "Dev", "AI"];

  const filteredCommunities = mockCommunities.filter(
    (c) =>
      (activeCategory === "All" || c.category === activeCategory) &&
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFollowers = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-2 h-14">
          <Globe size={20} className="text-neon-cyan" />
          <h1 className="text-lg font-semibold font-display">{t("discover.title")}</h1>
        </div>

        {/* Search */}
        <div className="relative pb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-[calc(50%+6px)] text-muted-foreground" />
          <input
            type="text"
            placeholder={t("discover.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-0 pb-0">
          {(["communities", "users"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab
                  ? "border-neon-cyan text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {tab === "communities" ? t("discover.communities") : t("discover.users")}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "communities" ? (
          <>
            {/* Category Filter */}
            <div className="flex gap-2 px-4 py-3 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeCategory === cat
                      ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                      : "bg-secondary/40 text-muted-foreground border border-border/20 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Communities List */}
            <div className="px-4 space-y-3 pb-4">
              {filteredCommunities.map((community, index) => (
                <motion.div
                  key={community.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="p-3.5 rounded-2xl bg-card/50 border border-border/20"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className={`w-12 h-12 shrink-0 ${community.isTokenGated ? "ring-2 ring-neon-purple/40" : ""}`}>
                      <AvatarFallback className="bg-secondary text-lg">{community.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold font-display truncate">{community.name}</span>
                        {community.isHot && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-neon-red/15 text-neon-red font-medium">HOT</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{community.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Users size={10} />
                          {community.members.toLocaleString()} {t("discover.members")}
                        </span>
                        {community.isTokenGated && (
                          <span className="text-[11px] text-neon-purple flex items-center gap-1">
                            <Lock size={10} />
                            {community.gateToken}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toast("Coming soon")}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan text-xs font-medium border border-neon-cyan/20 hover:bg-neon-cyan/25 transition-colors"
                    >
                      {t("discover.join")}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          /* Users List */
          <div className="px-4 py-3 space-y-3">
            {mockUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/50 border border-border/20"
              >
                <Avatar className="w-12 h-12 shrink-0">
                  <AvatarFallback className="bg-secondary text-lg font-display">{user.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold font-display truncate">{user.name}</span>
                    {user.isVerified && (
                      <Star size={12} className="text-neon-cyan fill-neon-cyan shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.bio}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatFollowers(user.followers)} followers
                  </p>
                </div>
                <button
                  onClick={() => toast("Coming soon")}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-neon-cyan/15 text-neon-cyan text-xs font-medium border border-neon-cyan/20 hover:bg-neon-cyan/25 transition-colors"
                >
                  {t("discover.follow")}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
