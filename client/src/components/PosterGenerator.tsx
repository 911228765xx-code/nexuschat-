/*
 * PosterGenerator — Canvas海报生成器组件
 * 支持4种风格模板选择、用户信息自定义、QR码生成、一键保存/分享
 * Design: Cyberpunk dark theme with neon accents
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import {
  X, Download, Share2, ChevronLeft, ChevronRight,
  Sparkles, Copy, Check, Palette, Type, Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";

// ==================== Template Definitions ====================

interface PosterTemplate {
  id: string;
  name: string;
  nameKey: string;
  bgImage: string;
  // Overlay gradient for text readability
  overlay: string;
  // Color scheme
  accentColor: string;
  accentColorHex: string;
  secondaryColor: string;
  secondaryColorHex: string;
  textColor: string;
  subtitleColor: string;
  // Badge/tag style
  tagBg: string;
  tagText: string;
  // Card background
  cardBg: string;
  cardBorder: string;
  // QR code colors
  qrFg: string;
  qrBg: string;
}

const POSTER_TEMPLATES: PosterTemplate[] = [
  {
    id: "cyber",
    name: "Cyberpunk",
    nameKey: "poster.templateCyber",
    bgImage: "https://private-us-east-1.manuscdn.com/sessionFile/RE5PzJwx2WNaNMZmPGIOOK/sandbox/5kd09llsjlGxgR6R7uBohJ-img-1_1772170200000_na1fn_cG9zdGVyLWJnLWN5YmVy.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUkU1UHpKd3gyV05hTk1abVBHSU9PSy9zYW5kYm94LzVrZDA5bGxzamxHeGdSNlI3dUJvaEotaW1nLTFfMTc3MjE3MDIwMDAwMF9uYTFmbl9jRzl6ZEdWeUxXSm5MV041WW1WeS5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=JayMKjS3QC5OPQYIe2eDx6GRbo-OYlsrDN-penKVoSodbbWvv-O43~Kozmv8vJn-uhSxCQIjRhcc8Qig928cxhqB~LtENAkxGVSLA~YY8q62vmywLk2gNzHupjQTn6h-60Dcj4vvYhGKj1yyFfpiLcDCh5ZEYQz0z2bqfQGU3Y5A3uxtLk~HUGNuxQxUhGoKq-jC6Z~FFpf9ztdnD9vIfLRsSyeQULiZurpO6UkDviqDG-adcaec6TC95LheMOBg78htAE2775vtjPHaQHsMCZ0pcWFrwwEpagqAuk7UKNekcy9T0m62ZCwQY6uVU5j9U0hzsqAtrz4gAnWZiI-HGg__",
    overlay: "linear-gradient(180deg, rgba(5,15,30,0.85) 0%, rgba(5,15,30,0.6) 40%, rgba(5,15,30,0.85) 100%)",
    accentColor: "#00ffaa",
    accentColorHex: "#00ffaa",
    secondaryColor: "#00d4ff",
    secondaryColorHex: "#00d4ff",
    textColor: "#ffffff",
    subtitleColor: "#94a3b8",
    tagBg: "rgba(0,255,170,0.15)",
    tagText: "#00ffaa",
    cardBg: "rgba(0,255,170,0.08)",
    cardBorder: "rgba(0,255,170,0.2)",
    qrFg: "#00ffaa",
    qrBg: "#0a1628",
  },
  {
    id: "galaxy",
    name: "Galaxy",
    nameKey: "poster.templateGalaxy",
    bgImage: "https://private-us-east-1.manuscdn.com/sessionFile/RE5PzJwx2WNaNMZmPGIOOK/sandbox/5kd09llsjlGxgR6R7uBohJ-img-2_1772170185000_na1fn_cG9zdGVyLWJnLWdhbGF4eQ.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUkU1UHpKd3gyV05hTk1abVBHSU9PSy9zYW5kYm94LzVrZDA5bGxzamxHeGdSNlI3dUJvaEotaW1nLTJfMTc3MjE3MDE4NTAwMF9uYTFmbl9jRzl6ZEdWeUxXSm5MV2RoYkdGNGVRLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=GHn9QhLR8TQTRQilMadFvxCKW19NZHLhBhxZnyedEo2vXryOFDRgWE8xuXHFcCAgSGhSv6mNVzVwmAnjDtz6n9BwYHdZBZqo2tiBTGCobyqicv3twwZVcT9d~JXQUpVk62zBggPwXw~VPiyZfg0D5eebN~AgsQX8QSlpZxWbA56USe1EvXu1ky~iXg4XkiHN0YULiz9SrwM62TYnn~90131G0o4afBYh4Y63hpv-zhlvLbqeUb3CDEz8G-7zuwfckOiGu2G3G4xIdwGHNHETKj6lsyj29Y0GSz5Nu7YM00Ta~rtxTuktT361F-BcZAC7q75trComn~llJwX0zBFx1Q__",
    overlay: "linear-gradient(180deg, rgba(15,5,35,0.85) 0%, rgba(15,5,35,0.5) 40%, rgba(15,5,35,0.85) 100%)",
    accentColor: "#c084fc",
    accentColorHex: "#c084fc",
    secondaryColor: "#67e8f9",
    secondaryColorHex: "#67e8f9",
    textColor: "#ffffff",
    subtitleColor: "#a5b4c8",
    tagBg: "rgba(192,132,252,0.15)",
    tagText: "#c084fc",
    cardBg: "rgba(192,132,252,0.08)",
    cardBorder: "rgba(192,132,252,0.2)",
    qrFg: "#c084fc",
    qrBg: "#0f0523",
  },
  {
    id: "defi",
    name: "DeFi Gold",
    nameKey: "poster.templateDefi",
    bgImage: "https://private-us-east-1.manuscdn.com/sessionFile/RE5PzJwx2WNaNMZmPGIOOK/sandbox/5kd09llsjlGxgR6R7uBohJ-img-3_1772170189000_na1fn_cG9zdGVyLWJnLWRlZmk.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUkU1UHpKd3gyV05hTk1abVBHSU9PSy9zYW5kYm94LzVrZDA5bGxzamxHeGdSNlI3dUJvaEotaW1nLTNfMTc3MjE3MDE4OTAwMF9uYTFmbl9jRzl6ZEdWeUxXSm5MV1JsWm1rLnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=kOUyf7sCkAtClsOMEx08uCJzApvFk~2nosIh4YJTBobA3RUSjlWM3xxqayx13mfe74VlM5W4dtEH6jpSBMM3-ex4jtErGGKC73vBT6Fi54SLbxQHf23t2GchN3SkqzFSy63jfqpc84-xLkb~YqxXPYCHmRfmFnXp9Z4-CGoN~2hyAlAjNvQjfKTe1hp9EmhsQLudDZWivpkhenkj96FGilV4fv4ktk-590FAxhw9SwdTgYp3jlNEFAjVnFy5zIPVKz5UY6zNfh~xhS8Ph69NusQY82Z1AxOxzzJNHWirsdPrVuVOzNh~Fk~Q~G3xGEpSVN1XlbWs-T7eFlhZszgpgQ__",
    overlay: "linear-gradient(180deg, rgba(10,5,0,0.88) 0%, rgba(10,5,0,0.55) 40%, rgba(10,5,0,0.88) 100%)",
    accentColor: "#f59e0b",
    accentColorHex: "#f59e0b",
    secondaryColor: "#fbbf24",
    secondaryColorHex: "#fbbf24",
    textColor: "#ffffff",
    subtitleColor: "#b8a080",
    tagBg: "rgba(245,158,11,0.15)",
    tagText: "#f59e0b",
    cardBg: "rgba(245,158,11,0.08)",
    cardBorder: "rgba(245,158,11,0.2)",
    qrFg: "#f59e0b",
    qrBg: "#0a0500",
  },
  {
    id: "minimal",
    name: "Minimal",
    nameKey: "poster.templateMinimal",
    bgImage: "https://private-us-east-1.manuscdn.com/sessionFile/RE5PzJwx2WNaNMZmPGIOOK/sandbox/5kd09llsjlGxgR6R7uBohJ-img-4_1772170197000_na1fn_cG9zdGVyLWJnLW1pbmltYWw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUkU1UHpKd3gyV05hTk1abVBHSU9PSy9zYW5kYm94LzVrZDA5bGxzamxHeGdSNlI3dUJvaEotaW1nLTRfMTc3MjE3MDE5NzAwMF9uYTFmbl9jRzl6ZEdWeUxXSm5MVzFwYm1sdFlXdy5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=vGdAETbN~ZH9x9TerfiMZCSAr-YGdE7aWYbyh~6nfo5NdzHaIaSihhhgZsf0TKZ7NFoiOICll4zopPPvNUpbTlp5Co73nYTcIpVywUnrQS9I3Fw52000v5UP7jUmKlo7AszgC4hoBM0rPMQnUCyHsq622gO0XIobP1PSyRwhf9wRnYmzAk45r5SbILRP3vfVMgM9C53CyroYIFr7HQRvthvzBD5SDRHgy3rjXsrzijsryIlzV1FwVtYuj5kyP7qj44rbpRqGWKJR1Ouwy~lDekggeTbWFn9NlDgJ4xR3NcCg-noAJCBzX4vMWX2v~VyDzbK7BkOX1sfd5061cB1iXQ__",
    overlay: "linear-gradient(180deg, rgba(5,5,5,0.9) 0%, rgba(5,5,5,0.6) 40%, rgba(5,5,5,0.9) 100%)",
    accentColor: "#34d399",
    accentColorHex: "#34d399",
    secondaryColor: "#a3e635",
    secondaryColorHex: "#a3e635",
    textColor: "#f0f0f0",
    subtitleColor: "#888888",
    tagBg: "rgba(52,211,153,0.12)",
    tagText: "#34d399",
    cardBg: "rgba(52,211,153,0.06)",
    cardBorder: "rgba(52,211,153,0.15)",
    qrFg: "#34d399",
    qrBg: "#050505",
  },
];

// ==================== Props ====================

interface PosterGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
  inviteLink: string;
  userName: string;
  userAvatar: string;
  totalInvited: number;
  totalRewards: number;
}

// ==================== Component ====================

export default function PosterGenerator({
  isOpen,
  onClose,
  inviteCode,
  inviteLink,
  userName,
  userAvatar,
  totalInvited,
  totalRewards,
}: PosterGeneratorProps) {
  const { t } = useI18n();
  const posterRef = useRef<HTMLDivElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customSlogan, setCustomSlogan] = useState("");
  const [showCustomize, setShowCustomize] = useState(false);

  const template = POSTER_TEMPLATES[selectedTemplate];

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setIsExporting(false);
    }
  }, [isOpen]);

  const handlePrevTemplate = useCallback(() => {
    setSelectedTemplate((prev) => (prev - 1 + POSTER_TEMPLATES.length) % POSTER_TEMPLATES.length);
  }, []);

  const handleNextTemplate = useCallback(() => {
    setSelectedTemplate((prev) => (prev + 1) % POSTER_TEMPLATES.length);
  }, []);

  const handleSavePoster = useCallback(async () => {
    if (!posterRef.current || isExporting) return;
    setIsExporting(true);
    try {
      // Wait for images to load
      const images = posterRef.current.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) resolve();
              else {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              }
            })
        )
      );

      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `nexuschat-invite-${template.id}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      toast.success(t("poster.savedSuccess"));
    } catch (err) {
      console.error("Export failed:", err);
      toast.error(t("poster.savedFailed"));
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, template.id, t]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success(t("invite.linkCopied"));
    setTimeout(() => setCopied(false), 2000);
  }, [inviteLink, t]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "NexusChat",
          text: t("poster.shareText") + " " + inviteCode,
          url: inviteLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  }, [inviteCode, inviteLink, t, handleCopyLink]);

  const sloganText = customSlogan || t("poster.defaultSlogan");

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-black/85 [backdrop-filter:none]"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col h-full max-h-full"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 shrink-0">
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
              >
                <X size={20} className="text-white/80" />
              </button>
              <h2 className="text-sm font-semibold text-white font-display">{t("poster.title")}</h2>
              <button
                onClick={() => setShowCustomize(!showCustomize)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                  showCustomize ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                <Palette size={18} className="text-white/80" />
              </button>
            </div>

            {/* Customization Panel (collapsible) */}
            <AnimatePresence>
              {showCustomize && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-black/40 border-b border-white/10 shrink-0"
                >
                  <div className="px-4 py-3 space-y-3">
                    {/* Custom Slogan */}
                    <div>
                      <label className="flex items-center gap-2.5 text-sm text-white/50 mb-2.5">
                        <Type size={10} />
                        {t("poster.customSlogan")}
                      </label>
                      <input
                        type="text"
                        value={customSlogan}
                        onChange={(e) => setCustomSlogan(e.target.value)}
                        placeholder={t("poster.defaultSlogan")}
                        maxLength={40}
                        className="w-full px-3 py-2 rounded-lg bg-white/8 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 transition-colors"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Poster Preview Area */}
            <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-4">
              <div className="w-full max-w-[340px]">
                {/* The actual poster content for export */}
                <div
                  ref={posterRef}
                  className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
                  style={{ aspectRatio: "9/16" }}
                >
                  {/* Background Image */}
                  <img
                    src={template.bgImage}
                    alt=""
                    crossOrigin="anonymous"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {/* Overlay */}
                  <div
                    className="absolute inset-0"
                    style={{ background: template.overlay }}
                  />

                  {/* Content Layer */}
                  <div className="relative z-10 flex flex-col h-full p-6 justify-between">
                    {/* Top: Brand */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                          style={{ background: template.tagBg, border: `1px solid ${template.cardBorder}` }}
                        >
                          🔗
                        </div>
                        <span
                          className="text-sm font-bold tracking-wide"
                          style={{ color: template.textColor, fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          NexusChat
                        </span>
                      </div>
                      <div
                        className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm font-medium mt-2"
                        style={{ background: template.tagBg, color: template.tagText, border: `1px solid ${template.cardBorder}` }}
                      >
                        <Sparkles size={8} />
                        Web3 Social Platform
                      </div>
                    </div>

                    {/* Middle: User Info + Slogan */}
                    <div className="flex-1 flex flex-col items-center justify-center -mt-4">
                      {/* Avatar */}
                      <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4 shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${template.accentColor}22, ${template.secondaryColor}22)`,
                          border: `2px solid ${template.accentColor}44`,
                        }}
                      >
                        {userAvatar}
                      </div>

                      {/* Name */}
                      <h3
                        className="text-xl font-bold mb-2"
                        style={{ color: template.textColor, fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {userName}
                      </h3>
                      <p
                        className="text-sm mb-5"
                        style={{ color: template.subtitleColor }}
                      >
                        {t("poster.invitesYou")}
                      </p>

                      {/* Slogan */}
                      <p
                        className="text-center text-sm font-medium leading-relaxed px-2 mb-5"
                        style={{ color: template.accentColor, fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        "{sloganText}"
                      </p>

                      {/* Stats Row */}
                      <div
                        className="flex gap-4 px-4 py-3 rounded-xl"
                        style={{ background: template.cardBg, border: `1px solid ${template.cardBorder}` }}
                      >
                        <div className="text-center">
                          <p
                            className="text-lg font-bold font-mono"
                            style={{ color: template.accentColor }}
                          >
                            {totalInvited}
                          </p>
                          <p className="text-sm" style={{ color: template.subtitleColor }}>
                            {t("poster.invited")}
                          </p>
                        </div>
                        <div className="w-px" style={{ background: template.cardBorder }} />
                        <div className="text-center">
                          <p
                            className="text-lg font-bold font-mono"
                            style={{ color: template.secondaryColor }}
                          >
                            {totalRewards.toLocaleString()}
                          </p>
                          <p className="text-sm" style={{ color: template.subtitleColor }}>
                            NP {t("poster.earned")}
                          </p>
                        </div>
                        <div className="w-px" style={{ background: template.cardBorder }} />
                        <div className="text-center">
                          <p
                            className="text-lg font-bold font-mono"
                            style={{ color: template.accentColor }}
                          >
                            +500
                          </p>
                          <p className="text-sm" style={{ color: template.subtitleColor }}>
                            NP {t("poster.bonus")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Invite Code + QR */}
                    <div>
                      {/* Invite Code */}
                      <div
                        className="p-3 rounded-xl mb-3 text-center"
                        style={{ background: template.cardBg, border: `1px solid ${template.cardBorder}` }}
                      >
                        <p className="text-sm mb-2" style={{ color: template.subtitleColor }}>
                          {t("poster.inviteCode")}
                        </p>
                        <p
                          className="text-base font-bold font-mono tracking-widest"
                          style={{ color: template.accentColor }}
                        >
                          {inviteCode}
                        </p>
                      </div>

                      {/* QR Code + CTA */}
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <p className="text-sm mb-2" style={{ color: template.subtitleColor }}>
                            {t("poster.scanToJoin")}
                          </p>
                          <p className="text-sm leading-relaxed" style={{ color: template.subtitleColor }}>
                            {t("poster.joinDesc")}
                          </p>
                        </div>
                        <div
                          className="p-2 rounded-xl shrink-0"
                          style={{ background: template.qrBg, border: `1px solid ${template.cardBorder}` }}
                        >
                          <QRCodeCanvas
                            value={inviteLink}
                            size={72}
                            fgColor={template.qrFg}
                            bgColor={template.qrBg}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Selector */}
            <div className="shrink-0 bg-black/60 border-t border-white/10">
              <div className="px-4 py-3">
                {/* Template thumbnails */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={handlePrevTemplate}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors shrink-0"
                  >
                    <ChevronLeft size={16} className="text-white/60" />
                  </button>

                  <div className="flex-1 flex gap-2 justify-center">
                    {POSTER_TEMPLATES.map((tmpl, i) => (
                      <button
                        key={tmpl.id}
                        onClick={() => setSelectedTemplate(i)}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden transition-all ${
                          i === selectedTemplate
                            ? "ring-2 ring-offset-1 ring-offset-black scale-105"
                            : "opacity-50 hover:opacity-80"
                        }`}
                        style={{
                          outlineColor: i === selectedTemplate ? tmpl.accentColor : undefined,
                          boxShadow: i === selectedTemplate ? `0 0 0 2px black, 0 0 0 4px ${tmpl.accentColor}` : undefined,
                        }}
                      >
                        <img
                          src={tmpl.bgImage}
                          alt={tmpl.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30" />
                        <span className="absolute bottom-0.5 left-0 right-0 text-center text-[7px] font-medium text-white/90">
                          {t(tmpl.nameKey)}
                        </span>
                        {i === selectedTemplate && (
                          <motion.div
                            layoutId="template-indicator"
                            className="absolute inset-0 rounded-xl"
                            style={{ border: `2px solid ${tmpl.accentColor}` }}
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleNextTemplate}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors shrink-0"
                  >
                    <ChevronRight size={16} className="text-white/60" />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
                    style={{
                      background: template.cardBg,
                      color: template.secondaryColor,
                      border: `1px solid ${template.cardBorder}`,
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? t("poster.copied") : t("invite.copyLink")}
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
                    style={{
                      background: template.cardBg,
                      color: template.accentColor,
                      border: `1px solid ${template.cardBorder}`,
                    }}
                  >
                    <Share2 size={16} />
                    {t("poster.share")}
                  </button>
                  <button
                    onClick={handleSavePoster}
                    disabled={isExporting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${template.accentColor}30, ${template.secondaryColor}30)`,
                      color: template.accentColor,
                      border: `1px solid ${template.accentColor}40`,
                    }}
                  >
                    <Download size={16} />
                    {isExporting ? t("poster.exporting") : t("poster.save")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
