/*
 * CreateGroup — 创建群聊页面
 * 联系人选择、群名/头像设置、Token门控权限管理
 */
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, Search, Check, Camera, Shield, Lock, Users,
  X, ChevronRight, Sparkles, Crown, Coins, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

interface Contact {
  id: string;
  name: string;
  avatar: string;
  address: string;
  isOnline: boolean;
  group?: string;
}

interface TokenGate {
  enabled: boolean;
  tokenType: "ERC20" | "ERC721" | "ERC1155";
  contractAddress: string;
  minAmount: string;
  tokenName: string;
}

const AVATAR_EMOJIS = ["🚀", "💎", "🔥", "🐵", "🦊", "🐋", "⚡", "🌊", "🎯", "🏆", "🎮", "🌈"];

// mockContacts removed — real data loaded from backend via contacts.listFriends + user.searchUsers

type Step = "select" | "configure" | "permissions";

export default function CreateGroup() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();

  const [step, setStep] = useState<Step>("select");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("🚀");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [groupDesc, setGroupDesc] = useState("");
  const [tokenGate, setTokenGate] = useState<TokenGate>({
    enabled: false,
    tokenType: "ERC20",
    contractAddress: "",
    minAmount: "",
    tokenName: "",
  });
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [allowInvite, setAllowInvite] = useState(true);
  const [muteNewMembers, setMuteNewMembers] = useState(false);  // ─── Load real contacts from backend ────────────────────────────────────────
  const { isAuthenticated } = useAuth();
  const { data: friendsData } = trpc.contacts.listFriends.useQuery(undefined, { enabled: isAuthenticated, staleTime: 60_000 }); const [debouncedSearch, setDebouncedSearch] = useState("");
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const { data: searchResults } = trpc.user.searchUsers.useQuery(
    { query: debouncedSearch },
    { enabled: debouncedSearch.length >= 1, staleTime: 15_000 }
  );

  // Merge friends + search results into Contact[] format
  const realContacts: Contact[] = useMemo(() => {
    const friendContacts: Contact[] = (friendsData ?? []).map(f => ({
      id: String(f.userId),
      name: f.displayName,
      avatar: f.avatar ?? f.displayName.charAt(0).toUpperCase(),
      address: "",
      isOnline: false,
      group: "Friends",
    }));
    if (!debouncedSearch || !searchResults) return friendContacts;
    // Merge search results, avoiding duplicates
    const friendIds = new Set(friendContacts.map(c => c.id));
    const searchContacts: Contact[] = searchResults
      .filter(u => !friendIds.has(String(u.id)))
      .map(u => ({
        id: String(u.id),
        name: u.name,
        avatar: u.avatar ?? u.name.charAt(0).toUpperCase(),
        address: "",
        isOnline: false,
        group: "Search Results",
      }));
    return [...friendContacts, ...searchContacts];
  }, [friendsData, searchResults, debouncedSearch]);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return realContacts;
    const q = search.toLowerCase();
    return realContacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    );
  }, [search, realContacts]);

  const groupedContacts = useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    filteredContacts.forEach((c) => {
      const g = c.group || "Other";
      if (!groups[g]) groups[g] = [];
      groups[g].push(c);
    });
    return groups;
  }, [filteredContacts]);

  const toggleContact = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAdmin = (id: string) => {
    setAdminIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const createGroupMutation = trpc.chat.createGroup.useMutation({
    onSuccess: (data) => {
      toast.success(t("group.created") || "Group created successfully!");
      setLocation(`/app/group/${data.groupId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create group");
    },
  });

  const handleCreate = () => {
    if (!groupName.trim()) {
      toast.error(t("group.nameRequired") || "Group name is required");
      return;
    }
    if (selected.length < 2) {
      toast.error(t("group.minMembers") || "Select at least 2 members");
      return;
    }
    createGroupMutation.mutate({
      name: groupName.trim(),
      description: groupDesc.trim() || undefined,
      isPublic: !tokenGate.enabled,
      isTokenGated: tokenGate.enabled,
      tokenGateAmount: tokenGate.enabled ? tokenGate.minAmount : undefined,
      tokenGateContract: tokenGate.enabled ? tokenGate.contractAddress : undefined,
    });
  };

  const selectedContacts = realContacts.filter((c) => selected.includes(c.id));

  const stepTitles: Record<Step, string> = {
    select: t("group.selectMembers") || "Select Members",
    configure: t("group.configure") || "Configure Group",
    permissions: t("group.permissions") || "Permissions",
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-3 h-14">
          <button
            onClick={() => {
              if (step === "select") setLocation("/app/chat");
              else if (step === "configure") setStep("select");
              else setStep("configure");
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold font-display">{t("group.createTitle") || "New Group"}</h1>
            <p className="text-sm text-muted-foreground">{stepTitles[step]}</p>
          </div>
          {step === "select" && selected.length >= 2 && (
            <button
              onClick={() => setStep("configure")}
              className="px-4 py-1.5 rounded-xl bg-neon-cyan/20 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 transition-colors"
            >
              {t("group.next") || "Next"} ({selected.length})
            </button>
          )}
          {step === "configure" && (
            <button
              onClick={() => setStep("permissions")}
              className="px-4 py-1.5 rounded-xl bg-neon-cyan/20 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 transition-colors"
            >
              {t("group.next") || "Next"}
            </button>
          )}
          {step === "permissions" && (
            <button
              onClick={handleCreate}
              disabled={createGroupMutation.isPending}
              className="px-4 py-1.5 rounded-xl bg-neon-cyan text-background text-sm font-bold hover:bg-neon-cyan/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createGroupMutation.isPending ? "Creating..." : (t("group.create") || "Create")}
            </button>
          )}
        </div>

        {/* Step Indicator */}
        <div className="flex gap-2.5 pb-3">
          {(["select", "configure", "permissions"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                i <= ["select", "configure", "permissions"].indexOf(step)
                  ? "bg-neon-cyan"
                  : "bg-secondary/40"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Step 1: Select Members */}
      <AnimatePresence mode="wait">
        {step === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto"
          >
            {/* Search */}
            <div className="px-4 py-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("group.searchContacts") || "Search contacts..."}
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-secondary/40 border border-border/30 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 transition-all"
                />
              </div>
            </div>

            {/* Selected chips */}
            {selected.length > 0 && (
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  {selectedContacts.map((c) => (
                    <motion.button
                      key={c.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      onClick={() => toggleContact(c.id)}
                      className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 hover:bg-neon-cyan/20 transition-colors"
                    >
                      <Avatar className="w-5 h-5">
                        {c.avatar?.startsWith("http") && <AvatarImage src={c.avatar} alt={c.name} className="object-cover" />}
                        <AvatarFallback className="text-xs bg-secondary">{c.avatar?.startsWith("http") ? c.name?.slice(0,2).toUpperCase() : c.avatar}</AvatarFallback>
                      </Avatar>
                      <span className="text-[13px] text-neon-cyan font-medium">{c.name.split(".")[0]}</span>
                      <X size={10} className="text-neon-cyan/60" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Contact List */}
            {Object.entries(groupedContacts).map(([group, contacts]) => (
              <div key={group}>
                <div className="px-4 py-1.5">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{group}</span>
                </div>
                {contacts.map((contact) => {
                  const isSelected = selected.includes(contact.id);
                  return (
                    <button
                      key={contact.id}
                      onClick={() => toggleContact(contact.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors ${
                        isSelected ? "bg-neon-cyan/[0.04]" : ""
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          {contact.avatar?.startsWith("http") && <AvatarImage src={contact.avatar} alt={contact.name} className="object-cover" />}
                          <AvatarFallback className="bg-secondary text-sm font-display">{contact.avatar?.startsWith("http") ? contact.name?.slice(0,2).toUpperCase() : contact.avatar}</AvatarFallback>
                        </Avatar>
                        {contact.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-green border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{contact.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{contact.address}</p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-neon-cyan border-neon-cyan"
                            : "border-border/50 hover:border-neon-cyan/40"
                        }`}
                      >
                        {isSelected && <Check size={12} className="text-background" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="h-20" />
          </motion.div>
        )}

        {/* Step 2: Configure Group */}
        {step === "configure" && (
          <motion.div
            key="configure"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-5"
          >
            {/* Group Avatar & Name */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border-2 border-dashed border-neon-cyan/40 flex items-center justify-center text-3xl hover:border-neon-cyan/60 transition-all"
                >
                  {groupAvatar}
                </button>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-neon-cyan flex items-center justify-center">
                  <Camera size={12} className="text-background" />
                </div>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={t("group.namePlaceholder") || "Group name"}
                  className="w-full h-12 px-4 rounded-xl bg-secondary/40 border border-border/30 text-base font-display placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 transition-all"
                  maxLength={30}
                />
                <p className="text-sm text-muted-foreground mt-2 px-2">{groupName.length}/30</p>
              </div>
            </div>

            {/* Avatar Picker */}
            <AnimatePresence>
              {showAvatarPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-6 gap-2 p-3 rounded-xl bg-secondary/20 border border-border/20">
                    {AVATAR_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setGroupAvatar(emoji);
                          setShowAvatarPicker(false);
                        }}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center text-2xl hover:bg-secondary/60 transition-all ${
                          groupAvatar === emoji ? "bg-neon-cyan/20 ring-2 ring-neon-cyan/40" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Description */}
            <div>
              <label className="text-sm text-muted-foreground mb-2.5 block px-2">
                {t("group.description") || "Description"} ({t("group.optional") || "optional"})
              </label>
              <textarea
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder={t("group.descPlaceholder") || "What's this group about?"}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-secondary/40 border border-border/30 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 transition-all resize-none"
                maxLength={200}
              />
              <p className="text-sm text-muted-foreground mt-2 px-2">{groupDesc.length}/200</p>
            </div>

            {/* Members Preview */}
            <div>
              <div className="flex items-center justify-between mb-2 px-2">
                <span className="text-sm text-muted-foreground">
                  {t("group.members") || "Members"} ({selected.length})
                </span>
                <button
                  onClick={() => setStep("select")}
                  className="text-sm text-neon-cyan hover:underline"
                >
                  {t("group.edit") || "Edit"}
                </button>
              </div>
              <div className="flex -space-x-2">
                {selectedContacts.slice(0, 8).map((c) => (
                  <Avatar key={c.id} className="w-9 h-9 border-2 border-background">
                    {c.avatar?.startsWith("http") && <AvatarImage src={c.avatar} alt={c.name} className="object-cover" />}
                    <AvatarFallback className="bg-secondary text-xs font-display">{c.avatar?.startsWith("http") ? c.name?.slice(0,2).toUpperCase() : c.avatar}</AvatarFallback>
                  </Avatar>
                ))}
                {selected.length > 8 && (
                  <div className="w-9 h-9 rounded-full bg-secondary/60 border-2 border-background flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">+{selected.length - 8}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Token Gate Toggle */}
            <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden">
              <button
                onClick={() => setTokenGate((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className="w-full flex items-center gap-3 px-4 py-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                  <Lock size={18} className="text-neon-purple" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{t("group.tokenGate") || "Token Gate"}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("group.tokenGateDesc") || "Require token ownership to join"}
                  </p>
                </div>
                <div
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                    tokenGate.enabled
                      ? "bg-neon-purple/30 border border-neon-purple/40"
                      : "bg-secondary border border-border"
                  }`}
                >
                  <motion.div
                    layout
                    className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-colors ${
                      tokenGate.enabled ? "bg-neon-purple" : "bg-muted-foreground"
                    }`}
                    animate={{ left: tokenGate.enabled ? "calc(100% - 22px)" : "2px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </button>

              {/* Token Gate Config */}
              <AnimatePresence>
                {tokenGate.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-border/10 pt-3">
                      {/* Token Type */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-2.5 block">Token Standard</label>
                        <div className="flex gap-2">
                          {(["ERC20", "ERC721", "ERC1155"] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => setTokenGate((prev) => ({ ...prev, tokenType: type }))}
                              className={`flex-1 py-2 rounded-lg text-[13px] font-mono font-medium transition-all ${
                                tokenGate.tokenType === type
                                  ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30"
                                  : "bg-secondary/30 text-muted-foreground border border-border/20 hover:bg-secondary/50"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Contract Address */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-2.5 block">Contract Address</label>
                        <input
                          type="text"
                          value={tokenGate.contractAddress}
                          onChange={(e) => setTokenGate((prev) => ({ ...prev, contractAddress: e.target.value }))}
                          placeholder="0x..."
                          className="w-full h-10 px-3 rounded-lg bg-secondary/40 border border-border/30 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50 transition-all"
                        />
                      </div>

                      {/* Token Name */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-2.5 block">Token Name</label>
                        <input
                          type="text"
                          value={tokenGate.tokenName}
                          onChange={(e) => setTokenGate((prev) => ({ ...prev, tokenName: e.target.value }))}
                          placeholder="e.g. BAYC, APE, UNI"
                          className="w-full h-10 px-3 rounded-lg bg-secondary/40 border border-border/30 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50 transition-all"
                        />
                      </div>

                      {/* Min Amount */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-2.5 block">
                          {tokenGate.tokenType === "ERC20" ? "Minimum Balance" : "Minimum Holdings"}
                        </label>
                        <input
                          type="number"
                          value={tokenGate.minAmount}
                          onChange={(e) => setTokenGate((prev) => ({ ...prev, minAmount: e.target.value }))}
                          placeholder={tokenGate.tokenType === "ERC20" ? "100" : "1"}
                          className="w-full h-10 px-3 rounded-lg bg-secondary/40 border border-border/30 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50 transition-all"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="h-10" />
          </motion.div>
        )}

        {/* Step 3: Permissions */}
        {step === "permissions" && (
          <motion.div
            key="permissions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-5"
          >
            {/* Group Preview Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-neon-cyan/10 via-card to-neon-purple/10 border border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center text-2xl">
                  {groupAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold font-display truncate">{groupName || "Unnamed Group"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selected.length} {t("group.members") || "members"} · {tokenGate.enabled ? "🔒 Token Gated" : "🌐 Open"}
                  </p>
                </div>
              </div>
              {groupDesc && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{groupDesc}</p>
              )}
            </div>

            {/* Admin Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-2">
                <Crown size={14} className="text-amber-400" />
                <span className="text-sm font-medium">{t("group.selectAdmins") || "Select Admins"}</span>
              </div>
              <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden divide-y divide-border/10">
                {/* Creator (always admin) */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="w-9 h-9 ring-2 ring-amber-400/40">
                    <AvatarFallback className="bg-secondary text-sm">🦊</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">cryptowhale.eth</p>
                    <p className="text-sm text-amber-400">{t("group.creator") || "Creator"}</p>
                  </div>
                  <Crown size={14} className="text-amber-400" />
                </div>
                {selectedContacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleAdmin(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors"
                  >
                    <Avatar className="w-9 h-9">
                      {c.avatar?.startsWith("http") && <AvatarImage src={c.avatar} alt={c.name} className="object-cover" />}
                      <AvatarFallback className="bg-secondary text-sm font-display">{c.avatar?.startsWith("http") ? c.name?.slice(0,2).toUpperCase() : c.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{c.address}</p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        adminIds.includes(c.id)
                          ? "bg-amber-400 border-amber-400"
                          : "border-border/50 hover:border-amber-400/40"
                      }`}
                    >
                      {adminIds.includes(c.id) && <Crown size={10} className="text-background" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Group Rules */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-2">
                <Shield size={14} className="text-neon-cyan" />
                <span className="text-sm font-medium">{t("group.rules") || "Group Rules"}</span>
              </div>
              <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden divide-y divide-border/10">
                {/* Allow member invite */}
                <button
                  onClick={() => setAllowInvite(!allowInvite)}
                  className="w-full flex items-center gap-3 px-4 py-3.5"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center">
                    <Users size={16} className="text-neon-cyan" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm">{t("group.allowInvite") || "Members Can Invite"}</p>
                    <p className="text-sm text-muted-foreground">{t("group.allowInviteDesc") || "Allow members to add new people"}</p>
                  </div>
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                      allowInvite
                        ? "bg-neon-cyan/30 border border-neon-cyan/40"
                        : "bg-secondary border border-border"
                    }`}
                  >
                    <motion.div
                      layout
                      className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-colors ${
                        allowInvite ? "bg-neon-cyan" : "bg-muted-foreground"
                      }`}
                      animate={{ left: allowInvite ? "calc(100% - 22px)" : "2px" }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </button>

                {/* Mute new members */}
                <button
                  onClick={() => setMuteNewMembers(!muteNewMembers)}
                  className="w-full flex items-center gap-3 px-4 py-3.5"
                >
                  <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center">
                    <Sparkles size={16} className="text-neon-purple" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm">{t("group.muteNew") || "Mute New Members"}</p>
                    <p className="text-sm text-muted-foreground">{t("group.muteNewDesc") || "New members can't send messages for 24h"}</p>
                  </div>
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                      muteNewMembers
                        ? "bg-neon-purple/30 border border-neon-purple/40"
                        : "bg-secondary border border-border"
                    }`}
                  >
                    <motion.div
                      layout
                      className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-colors ${
                        muteNewMembers ? "bg-neon-purple" : "bg-muted-foreground"
                      }`}
                      animate={{ left: muteNewMembers ? "calc(100% - 22px)" : "2px" }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </button>
              </div>
            </div>

            {/* Token Gate Summary */}
            {tokenGate.enabled && (
              <div className="p-3.5 rounded-2xl bg-neon-purple/5 border border-neon-purple/20">
                <div className="flex items-center gap-2 mb-2">
                  <Coins size={14} className="text-neon-purple" />
                  <span className="text-sm font-medium text-neon-purple">Token Gate Active</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[13px] text-muted-foreground">
                    Standard: <span className="text-foreground font-mono">{tokenGate.tokenType}</span>
                  </p>
                  {tokenGate.tokenName && (
                    <p className="text-[13px] text-muted-foreground">
                      Token: <span className="text-foreground">{tokenGate.tokenName}</span>
                    </p>
                  )}
                  {tokenGate.minAmount && (
                    <p className="text-[13px] text-muted-foreground">
                      Min: <span className="text-foreground font-mono">{tokenGate.minAmount}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="h-10" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
