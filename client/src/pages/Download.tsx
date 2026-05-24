/**
 * Download — NexusChat 下载页面
 * 双平台（Android / iOS）下载入口 + 二维码 + 安装说明
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Smartphone, Apple, Download, CheckCircle, ArrowLeft, ExternalLink, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";

// EAS Build v2.0.0 — React Native 原生版（构建 a1ef835f，2026-05-24）
const ANDROID_APK_URL =
  "https://expo.dev/artifacts/eas/kZNdJbHikx7FaBZxdh8Qw6.apk";
const QR_ANDROID =
  "/manus-storage/qr_android_new_5475e711.png";
const QR_IOS =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663385790517/fYL7bQEV8tj27K63dbYKsc/qr-ios_1d857524.png";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function DownloadPage() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"android" | "ios">("android");

  const androidSteps = [
    "点击下方「下载 Android APK」按钮，下载 APK 安装包",
    "在手机「设置 → 安全」中开启「允许安装未知来源应用」",
    "点击 APK 文件，按提示完成安装",
    "安装完成后在桌面找到 NexusChat 图标，点击启动",
  ];

  const iosSteps = [
    "使用 Safari 浏览器打开 nexuschat.best",
    "点击底部工具栏中间的「分享」按钮（方框加箭头图标）",
    "在弹出菜单中向下滚动，点击「添加到主屏幕」",
    "点击右上角「添加」，App 图标即出现在桌面",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-background [backdrop-filter:none]">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">返回首页</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center">
              <Download size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm">NexusChat 下载</span>
          </div>
          <Button
            onClick={() => setLocation("/app/chat")}
            size="sm"
            className="bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/25 text-sm h-8 px-3"
            variant="outline"
          >
            进入 Web 版
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-12 px-4 text-center">
        <motion.div {...fadeUp}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-sm font-medium mb-6">
            <QrCode size={12} />
            扫码或点击下载
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            下载 <span className="bg-gradient-to-r from-[#00d4ff] to-[#a855f7] bg-clip-text text-transparent">NexusChat</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            支持 Android 和 iOS，随时随地掌控 Web3 资产、AI 投研与加密社交
          </p>
        </motion.div>
      </section>

      {/* Platform Tabs */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        {/* Tab Switcher */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-10"
        >
          <div className="flex rounded-xl border border-border/30 bg-card/30 p-2 gap-2">
            <button
              onClick={() => setActiveTab("android")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "android"
                  ? "bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone size={16} />
              Android
            </button>
            <button
              onClick={() => setActiveTab("ios")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "ios"
                  ? "bg-[#a855f7]/15 text-[#a855f7] border border-[#a855f7]/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Apple size={16} />
              iOS
            </button>
          </div>
        </motion.div>

        {/* Android Panel */}
        {activeTab === "android" && (
          <motion.div
            key="android"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
          >
            {/* QR Code Card */}
            <div className="rounded-2xl border border-[#00d4ff]/20 bg-gradient-to-br from-[#00d4ff]/10 to-transparent p-6 flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">扫码下载 Android APK</p>
              <div className="rounded-xl overflow-hidden border border-[#00d4ff]/20 p-2 bg-[#0d1117]">
                <img
                  src={QR_ANDROID}
                  alt="Android 下载二维码"
                  className="w-48 h-48 object-contain"
                  loading="lazy"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                使用手机扫描二维码<br />直接下载 APK 安装包
              </p>
              <Button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = ANDROID_APK_URL;
                  link.download = "NexusChat-v2.0.0-android.apk";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="w-full bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/25"
                variant="outline"
              >
                <Download size={15} className="mr-2" />
                下载 Android APK v2.0.0
              </Button>
              <p className="text-sm text-muted-foreground/60 text-center">
                版本 v2.0.0 · 需要 Android 8.0+ · React Native 原生版
              </p>
            </div>

            {/* Install Steps */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">安装步骤</h3>
              <div className="space-y-3">
                {androidSteps.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-[#00d4ff]/15 border border-[#00d4ff]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#00d4ff] text-sm font-bold">{i + 1}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>

              {/* Note */}
              <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-sm text-amber-400/80 leading-relaxed">
                  <strong className="text-amber-400">安全提示：</strong>
                  安装完成后建议在设置中关闭「允许安装未知来源应用」以保护设备安全。NexusChat APK 为官方发布版本，不含任何恶意代码。
                </p>
              </div>

              {/* Web fallback */}
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">也可直接使用 Web 版，无需安装：</p>
                <Button
                  onClick={() => setLocation("/app/chat")}
                  variant="outline"
                  size="sm"
                  className="border-border/30 text-muted-foreground hover:text-foreground text-sm h-8 bg-transparent"
                >
                  <ExternalLink size={12} className="mr-1.5" />
                  打开 Web 版
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* iOS Panel */}
        {activeTab === "ios" && (
          <motion.div
            key="ios"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
          >
            {/* QR Code Card */}
            <div className="rounded-2xl border border-[#a855f7]/20 bg-gradient-to-br from-[#a855f7]/10 to-transparent p-6 flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Safari 扫码打开</p>
              <div className="rounded-xl overflow-hidden border border-[#a855f7]/20 p-2 bg-[#0d1117]">
                <img
                  src={QR_IOS}
                  alt="iOS 安装二维码"
                  className="w-48 h-48 object-contain"
                  loading="lazy"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                使用 iPhone Safari 扫描二维码<br />然后按步骤添加到主屏幕
              </p>
              <Button
                onClick={() => window.open("https://www.nexuschat.best", "_blank")}
                className="w-full bg-[#a855f7]/15 text-[#a855f7] border border-[#a855f7]/30 hover:bg-[#a855f7]/25"
                variant="outline"
              >
                <ExternalLink size={15} className="mr-2" />
                在 Safari 中打开
              </Button>
              <p className="text-sm text-muted-foreground/60 text-center">
                需要 iOS 14.0+ · 使用 Safari 浏览器
              </p>
            </div>

            {/* Install Steps */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground">添加到主屏幕</h3>
              <div className="space-y-3">
                {iosSteps.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#a855f7] text-sm font-bold">{i + 1}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>

              {/* Checkmarks */}
              <div className="mt-6 space-y-2">
                {[
                  "全屏显示，无浏览器地址栏",
                  "图标出现在桌面，像原生 App 一样打开",
                  "支持离线缓存，网络不佳时仍可使用",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-[#a855f7] flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>

              {/* Note */}
              <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <p className="text-sm text-blue-400/80 leading-relaxed">
                  <strong className="text-blue-400">注意：</strong>
                  iOS 的「添加到主屏幕」功能仅在 <strong>Safari</strong> 浏览器中可用，Chrome 或其他浏览器不支持此操作。
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            已有账号？直接进入 Web 版体验全部功能
          </p>
          <Button
            onClick={() => setLocation("/app/chat")}
            className="bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white hover:opacity-90 h-11 px-8 text-sm font-semibold"
          >
            立即体验 Web 版
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
