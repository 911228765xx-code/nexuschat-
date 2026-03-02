/*
 * EditProfile — 个人资料编辑页
 * 头像上传、ENS绑定、Bio编辑、社交链接管理
 */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Camera, Check, X, Link as LinkIcon, Globe, Copy,
  Shield, Sparkles, ExternalLink, Plus, Trash2, Save, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string;
}

const SOCIAL_PLATFORMS = [
  { name: "Twitter / X", icon: "𝕏", prefix: "https://x.com/" },
  { name: "GitHub", icon: "⌨️", prefix: "https://github.com/" },
  { name: "Farcaster", icon: "🟣", prefix: "https://warpcast.com/" },
  { name: "Lens", icon: "🌿", prefix: "https://hey.xyz/u/" },
  { name: "Mirror", icon: "✍️", prefix: "https://mirror.xyz/" },
  { name: "Website", icon: "🌐", prefix: "https://" },
];

const AVATAR_OPTIONS = ["🦊", "🐋", "🦁", "🐺", "🦅", "🐉", "🦄", "🐵", "🐼", "🦈", "🐙", "🦋"];

const NFT_AVATARS = [
  { id: "1", name: "BAYC #4291", collection: "Bored Ape YC", emoji: "🐵" },
  { id: "2", name: "CryptoPunk #7523", collection: "CryptoPunks", emoji: "👾" },
  { id: "3", name: "Azuki #2891", collection: "Azuki", emoji: "🎌" },
  { id: "4", name: "Doodle #6914", collection: "Doodles", emoji: "🎨" },
];

export default function EditProfile() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("🦊");
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarTab, setAvatarTab] = useState<"emoji" | "nft">("emoji");
  const [ensName, setEnsName] = useState("");
  const [ensVerified, setEnsVerified] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [showAddSocial, setShowAddSocial] = useState(false);
  const [newSocialPlatform, setNewSocialPlatform] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const { isAuthenticated } = useAuth();
  // ─── tRPC: load real profile (protectedProcedure) ──────────────────────────────────
  const { data: profileData, isLoading: profileLoading } = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Populate form from real data
  useEffect(() => {
    if (profileData) {
      setDisplayName(profileData.name ?? "");
      setBio(profileData.bio ?? "");
      setAvatar(profileData.avatar ?? "🦊");
      setEnsName(profileData.username ?? "");
    }
  }, [profileData]);

    // ─── tRPC: upload avatar to S3 ────────────────────────────────────────────
  const uploadAvatarMutation = trpc.user.uploadAvatar.useMutation({
    onError: (err) => {
      if (!err.message.includes("10001")) toast.error("头像上传失败: " + err.message);
    },
  });

  // ─── tRPC: update profile ─────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const updateProfile = trpc.user.updateProfile.useMutation({ onSuccess: () => {
      utils.user.getProfile.invalidate();
      toast.success(t("editProfile.saved") || "Profile saved successfully!");
      setHasChanges(false);
      setTimeout(() => setLocation("/app/profile"), 500);
    },
    onError: (err) => {
      if (err.message.includes("10001")) {
        toast.error("请先登录后再编辑资料");
      } else {
        toast.error("保存失败: " + err.message);
      }
    },
  });

  const markChanged = () => { if (!hasChanges) setHasChanges(true); };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Validate size (max 4MB for avatar)
    if (file.size > 4 * 1024 * 1024) {
      toast.error("头像图片不能超过 4MB");
      return;
    }

    // Read as base64 for preview + upload
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      // Show local preview immediately
      setAvatarImage(dataUrl);
      setShowAvatarPicker(false);
      markChanged();

      // Upload to S3 in background
      try {
        setUploadingAvatar(true);
        const [header, base64Data] = dataUrl.split(",");
        const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
        const ext = mimeType.split("/")[1] ?? "jpg";
        const result = await uploadAvatarMutation.mutateAsync({
          fileData: base64Data,
          mimeType,
        });
        // Replace local preview with CDN URL
        setAvatarImage(result.url);
        toast.success("头像已上传，请保存资料生效");
      } catch {
        // Keep local preview even if upload fails
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const selectEmojiAvatar = (emoji: string) => {
    setAvatar(emoji);
    setAvatarImage(null);
    setShowAvatarPicker(false);
    markChanged();
  };

  const selectNftAvatar = (nft: typeof NFT_AVATARS[0]) => {
    setAvatar(nft.emoji);
    setAvatarImage(null);
    setShowAvatarPicker(false);
    markChanged();
    toast.success(`NFT avatar set: ${nft.name}`);
  };

  const addSocialLink = () => {
    if (!newSocialPlatform || !newSocialUrl.trim()) {
      toast.error("Please select a platform and enter URL");
      return;
    }
    const platform = SOCIAL_PLATFORMS.find(p => p.name === newSocialPlatform);
    setSocialLinks(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        platform: newSocialPlatform,
        url: newSocialUrl,
        icon: platform?.icon || "🔗",
      },
    ]);
    setNewSocialPlatform("");
    setNewSocialUrl("");
    setShowAddSocial(false);
    markChanged();
  };

  const removeSocialLink = (id: string) => {
    setSocialLinks(prev => prev.filter(l => l.id !== id));
    markChanged();
  };

  const handleSave = () => {
    updateProfile.mutate({
      name: displayName || undefined,
      username: ensName || undefined,
      bio: bio || undefined,
      avatar: avatarImage ?? avatar,
    });
  };

  const handleVerifyENS = () => {
    toast.success(t("editProfile.ensVerified") || "ENS verified!");
    setEnsVerified(true);
    markChanged();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-3 h-14">
          <button
            onClick={() => setLocation("/app/profile")}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 text-base font-semibold font-display">
            {t("editProfile.title") || "Edit Profile"}
          </h1>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
              hasChanges
                ? "bg-neon-cyan text-background hover:bg-neon-cyan/90"
                : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Save size={14} />
            {t("editProfile.save") || "Save"}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-6">
          <div className="relative">
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="relative group"
            >
              <Avatar className="w-24 h-24 ring-2 ring-neon-cyan/40">
                {avatarImage ? (
                  <img src={avatarImage} alt="avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="bg-secondary text-4xl">{avatar}</AvatarFallback>
                )}
              </Avatar>
              {uploadingAvatar ? (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                  <Loader2 size={24} className="text-neon-cyan animate-spin" />
                </div>
              ) : (
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera size={24} className="text-white" />
                </div>
              )}
            </button>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-neon-cyan flex items-center justify-center shadow-lg shadow-neon-cyan/30">
              <Camera size={14} className="text-background" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">{t("editProfile.tapToChange") || "Tap to change avatar"}</p>
        </div>

        {/* Avatar Picker */}
        <AnimatePresence>
          {showAvatarPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mx-4 mb-4"
            >
              <div className="rounded-2xl bg-card/80 border border-border/30 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-border/20">
                  <button
                    onClick={() => setAvatarTab("emoji")}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                      avatarTab === "emoji"
                        ? "text-neon-cyan border-b-2 border-neon-cyan"
                        : "text-muted-foreground"
                    }`}
                  >
                    Emoji
                  </button>
                  <button
                    onClick={() => setAvatarTab("nft")}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                      avatarTab === "nft"
                        ? "text-neon-purple border-b-2 border-neon-purple"
                        : "text-muted-foreground"
                    }`}
                  >
                    NFT Avatar
                  </button>
                </div>

                {avatarTab === "emoji" ? (
                  <div className="p-3">
                    <div className="grid grid-cols-6 gap-2">
                      {AVATAR_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => selectEmojiAvatar(emoji)}
                          className={`aspect-square rounded-xl flex items-center justify-center text-2xl hover:bg-secondary/60 transition-all ${
                            avatar === emoji && !avatarImage ? "bg-neon-cyan/20 ring-2 ring-neon-cyan/40" : ""
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full mt-3 py-2.5 rounded-xl border border-dashed border-neon-cyan/30 text-xs text-neon-cyan hover:bg-neon-cyan/5 transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera size={14} />
                      {t("editProfile.uploadPhoto") || "Upload Photo"}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {NFT_AVATARS.map((nft) => (
                      <button
                        key={nft.id}
                        onClick={() => selectNftAvatar(nft)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/40 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 flex items-center justify-center text-2xl">
                          {nft.emoji}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{nft.name}</p>
                          <p className="text-[10px] text-muted-foreground">{nft.collection}</p>
                        </div>
                        <ExternalLink size={14} className="text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />

        {/* Form Fields */}
        <div className="px-4 space-y-5 pb-8">
          {/* Display Name */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block px-1">
              {t("editProfile.displayName") || "Display Name"}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); markChanged(); }}
              placeholder="Your display name"
              className="w-full h-12 px-4 rounded-xl bg-secondary/40 border border-border/30 text-base font-display placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 transition-all"
              maxLength={30}
            />
            <p className="text-[10px] text-muted-foreground mt-1 px-1">{displayName.length}/30</p>
          </div>

          {/* ENS Binding */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block px-1">
              {t("editProfile.ensBinding") || "ENS Name"}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={ensName}
                  onChange={(e) => { setEnsName(e.target.value); setEnsVerified(false); markChanged(); }}
                  placeholder="yourname.eth"
                  className="w-full h-12 px-4 pr-10 rounded-xl bg-secondary/40 border border-border/30 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 transition-all"
                />
                {ensVerified && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 rounded-full bg-neon-green/20 flex items-center justify-center">
                      <Check size={12} className="text-neon-green" />
                    </div>
                  </div>
                )}
              </div>
              {!ensVerified && (
                <button
                  onClick={handleVerifyENS}
                  className="px-4 h-12 rounded-xl bg-neon-cyan/20 text-neon-cyan text-xs font-medium hover:bg-neon-cyan/30 transition-colors whitespace-nowrap"
                >
                  {t("editProfile.verify") || "Verify"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 px-1">
              <Shield size={10} className="text-neon-cyan" />
              <p className="text-[10px] text-muted-foreground">
                {t("editProfile.ensNote") || "Verified ENS names are shown as your identity"}
              </p>
            </div>
          </div>

          {/* Wallet Address */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block px-1">
              {t("editProfile.walletAddress") || "Wallet Address"}
            </label>
            <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-secondary/20 border border-border/20">
              <span className="flex-1 text-sm font-mono text-muted-foreground truncate">
                0x71C7656EC7ab88b098defB751B7401B5f6d8976F
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
                  toast.success("Address copied!");
                }}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
              >
                <Copy size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block px-1">
              {t("editProfile.bio") || "Bio"}
            </label>
            <textarea
              value={bio}
              onChange={(e) => { setBio(e.target.value); markChanged(); }}
              placeholder={t("editProfile.bioPlaceholder") || "Tell the world about yourself..."}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-secondary/40 border border-border/30 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 transition-all resize-none"
              maxLength={200}
            />
            <p className="text-[10px] text-muted-foreground mt-1 px-1">{bio.length}/200</p>
          </div>

          {/* Social Links */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <label className="text-xs text-muted-foreground">
                {t("editProfile.socialLinks") || "Social Links"}
              </label>
              <button
                onClick={() => setShowAddSocial(!showAddSocial)}
                className="text-[10px] text-neon-cyan hover:underline flex items-center gap-1"
              >
                <Plus size={10} />
                {t("editProfile.addLink") || "Add Link"}
              </button>
            </div>

            {/* Existing links */}
            <div className="space-y-2">
              {socialLinks.map((link) => (
                <motion.div
                  key={link.id}
                  layout
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-card/50 border border-border/20"
                >
                  <span className="text-lg">{link.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">{link.platform}</p>
                    <p className="text-xs text-foreground truncate font-mono">{link.url}</p>
                  </div>
                  <button
                    onClick={() => removeSocialLink(link.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 size={13} className="text-destructive/60" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Add new social link */}
            <AnimatePresence>
              {showAddSocial && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="p-3.5 rounded-xl bg-card/80 border border-neon-cyan/20 space-y-3">
                    {/* Platform selector */}
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1.5 block">Platform</label>
                      <div className="flex flex-wrap gap-1.5">
                        {SOCIAL_PLATFORMS.filter(p => !socialLinks.find(l => l.platform === p.name)).map((p) => (
                          <button
                            key={p.name}
                            onClick={() => {
                              setNewSocialPlatform(p.name);
                              setNewSocialUrl(p.prefix);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
                              newSocialPlatform === p.name
                                ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                                : "bg-secondary/30 text-muted-foreground border border-border/20 hover:bg-secondary/50"
                            }`}
                          >
                            <span>{p.icon}</span>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* URL input */}
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1.5 block">URL</label>
                      <input
                        type="url"
                        value={newSocialUrl}
                        onChange={(e) => setNewSocialUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full h-10 px-3 rounded-lg bg-secondary/40 border border-border/30 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 transition-all"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowAddSocial(false); setNewSocialPlatform(""); setNewSocialUrl(""); }}
                        className="flex-1 py-2 rounded-lg bg-secondary/30 text-xs text-muted-foreground hover:bg-secondary/50 transition-colors"
                      >
                        {t("editProfile.cancel") || "Cancel"}
                      </button>
                      <button
                        onClick={addSocialLink}
                        className="flex-1 py-2 rounded-lg bg-neon-cyan/20 text-xs text-neon-cyan font-medium hover:bg-neon-cyan/30 transition-colors"
                      >
                        {t("editProfile.add") || "Add"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* SBT & Badges */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block px-1">
              {t("editProfile.badges") || "Badges & SBTs"}
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "Genesis Member", color: "neon-purple", icon: "🏆" },
                { name: "SBT Holder", color: "neon-cyan", icon: "🔒" },
                { name: "Early Adopter", color: "neon-green", icon: "🌱" },
                { name: "DeFi Expert", color: "amber-400", icon: "💰" },
              ].map((badge) => (
                <div
                  key={badge.name}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-${badge.color}/10 border border-${badge.color}/20`}
                >
                  <span className="text-xs">{badge.icon}</span>
                  <span className={`text-[10px] font-medium text-${badge.color}`}>{badge.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Settings */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block px-1">
              {t("editProfile.privacy") || "Privacy"}
            </label>
            <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden divide-y divide-border/10">
              {[
                { label: t("editProfile.showWallet") || "Show Wallet Balance", desc: t("editProfile.showWalletDesc") || "Others can see your portfolio value", defaultOn: false },
                { label: t("editProfile.showActivity") || "Show Activity Status", desc: t("editProfile.showActivityDesc") || "Others can see when you're online", defaultOn: true },
                { label: t("editProfile.showNFTs") || "Show NFT Collection", desc: t("editProfile.showNFTsDesc") || "Display your NFTs on your profile", defaultOn: true },
              ].map((item, i) => {
                const [on, setOn] = useState(item.defaultOn);
                return (
                  <button
                    key={i}
                    onClick={() => { setOn(!on); markChanged(); }}
                    className="w-full flex items-center gap-3 px-4 py-3"
                  >
                    <div className="flex-1 text-left">
                      <p className="text-sm">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <div
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                        on
                          ? "bg-neon-cyan/30 border border-neon-cyan/40"
                          : "bg-secondary border border-border"
                      }`}
                    >
                      <motion.div
                        layout
                        className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-colors ${
                          on ? "bg-neon-cyan" : "bg-muted-foreground"
                        }`}
                        animate={{ left: on ? "calc(100% - 22px)" : "2px" }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-10" />
        </div>
      </div>
    </div>
  );
}
