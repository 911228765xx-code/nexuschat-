/**
 * Download — App 下载页面
 * 版本号/下载地址【动态】读自 appVersion.checkVersion(后台「版本发布」改一次,这里自动跟随,不再写死旧包)。
 * - Android:大按钮走固定短链 /apk(服务端 302/流式中转,大陆可直连),附直链复制。
 * - 微信/QQ 内置浏览器拦截 APK 下载 → 全屏引导「右上角···在浏览器打开」。
 * - 二维码动态生成,指向本页(微信扫码也安全,进页再引导)。
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Smartphone, Apple, Download, CheckCircle, ArrowLeft, ExternalLink, QrCode, Copy, Check,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

/** 站点根(兼容自定义域/直连源站):二维码与复制直链都基于当前访问域名 */
const ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://nexuschat.best";
// 对外只发【下载页】链接:裸 /apk 直链走整包请求会中 32MiB 链路上限、下到 SPA 装不上;
// 下载页走分块下载,人人可用。
const PAGE_LINK = `${ORIGIN}/download`;

const isWeChat = typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);
const isQQ = typeof navigator !== "undefined" && /\bQQ\/|QQBrowser/i.test(navigator.userAgent);
const inAppBrowser = isWeChat || isQQ;

interface VersionInfo { latestVersion: string; releaseNotes: string; directUrl: string }

export default function DownloadPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"android" | "ios">(
    typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "ios" : "android",
  );
  const [ver, setVer] = useState<VersionInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [guideOpen, setGuideOpen] = useState(inAppBrowser); // 微信/QQ 打开即引导
  const [dlProgress, setDlProgress] = useState<number | null>(null); // 下载进度 0..1;null=未在下载
  // 邀请短链 /i/CODE 会 302 到 /download?ref=CODE。旧版本这里直接丢了 ref → 装完 App 不知道填啥码,
  // 推荐关系断掉("邀请链接无效")。这里接住并展示,引导装后手动填(sideload 无 Play 安装来源,web/native 存储不通,展示+手填是可靠路径)。
  // 群邀请码 g{id}t{token} / 用户名片码 u{id} 不当推荐码展示——它们走下面的个性化横幅(查群名/用户名)
  const [inviteRef] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const r = (new URLSearchParams(window.location.search).get("ref") || "").replace(/[^0-9A-Za-z]/g, "").slice(0, 30);
    if (/^g\d+t[0-9a-fA-F]+$/.test(r) || /^u\d+$/.test(r)) return "";
    return r.toUpperCase();
  });
  const [refCopied, setRefCopied] = useState(false);
  // 从群/用户二维码扫来:显示"邀请你加入群聊「XXX」"/"XXX 邀请你加为好友",提高下载转化
  const [inviteTarget, setInviteTarget] = useState<{ type: "group" | "user"; name: string; avatar: string | null; memberCount?: number } | null>(null);
  useEffect(() => {
    const raw = (new URLSearchParams(window.location.search).get("ref") || "").replace(/[^0-9A-Za-z]/g, "").slice(0, 30);
    const g = raw.match(/^g(\d+)t[0-9a-fA-F]+$/);
    const u = raw.match(/^u(\d+)$/);
    if (g) {
      const input = encodeURIComponent(JSON.stringify({ 0: { json: { groupId: Number(g[1]) } } }));
      fetch(`/api/trpc/chat.getGroupInfo?batch=1&input=${input}`).then((r) => r.json()).then((d) => {
        const j = d?.[0]?.result?.data?.json;
        if (j?.name) setInviteTarget({ type: "group", name: j.name, avatar: j.avatar ?? null, memberCount: j.memberCount });
      }).catch(() => {});
    } else if (u) {
      const input = encodeURIComponent(JSON.stringify({ 0: { json: { userId: Number(u[1]) } } }));
      fetch(`/api/trpc/user.getPublicCard?batch=1&input=${input}`).then((r) => r.json()).then((d) => {
        const j = d?.[0]?.result?.data?.json;
        if (j?.name) setInviteTarget({ type: "user", name: j.name, avatar: j.avatar ?? null });
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    // 公开端点,免登录:拿最新版本号 + 更新日志(与 App 内检查更新同一数据源)
    const input = encodeURIComponent(JSON.stringify({ 0: { json: { currentVersion: "0.0.0", platform: "android" } } }));
    fetch(`/api/trpc/appVersion.checkVersion?batch=1&input=${input}`)
      .then((r) => r.json())
      .then((d) => {
        const j = d?.[0]?.result?.data?.json;
        if (j?.latestVersion) setVer({ latestVersion: j.latestVersion, releaseNotes: j.releaseNotes ?? "", directUrl: j.directUrl ?? "" });
      })
      .catch(() => {});
  }, []);

  async function copyLink() {
    try {
      // 复制【下载页】链接而非裸 /apk:裸直链丢下载器/微信会走整包请求 → 中 32MiB 链路上限 →
      // 下到 SPA 网页装不上。下载页会走分块下载,人人可用。
      await navigator.clipboard.writeText(PAGE_LINK);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 剪贴板不可用(部分内置浏览器):选中输入框由用户手动复制
      const el = document.getElementById("apk-link-input") as HTMLInputElement | null;
      el?.select();
    }
  }

  async function copyRef() {
    try {
      await navigator.clipboard.writeText(inviteRef);
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 1800);
    } catch { /* 剪贴板不可用则忽略,用户可手抄横幅上的码 */ }
  }

  async function onDownloadClick(e: React.MouseEvent) {
    e.preventDefault();
    if (inAppBrowser) { setGuideOpen(true); return; } // 微信/QQ 拦 APK:引导去系统浏览器
    if (dlProgress !== null) return; // 正在下

    // 托管链路(平台边缘→Cloud Run)对带 Content-Length 的响应有 32MiB 上限:整包或无界 Range
    // 会被掐 → 边缘兜底吐回 SPA 网页 → 存成 .apk 装不上(「解析包出现问题」)。
    // 分块下载:每块 8MB(<32MiB)、明确上下界、逐块拼成完整 APK。
    // 每块字节数严格校验(SPA 兜底页不可能恰好等于请求区间长度),污染块立即中止而非默默拼进去。
    try {
      setDlProgress(0);
      const CHUNK = 8 * 1024 * 1024;
      const parts: BlobPart[] = [];
      let start = 0;
      let total = 0;
      for (;;) {
        const end = total > 0 ? Math.min(start + CHUNK - 1, total - 1) : start + CHUNK - 1;
        const res = await fetch("/apk", { headers: { Range: `bytes=${start}-${end}` } });
        if (res.status !== 206) throw new Error(`no partial (${res.status})`);
        if (!total) {
          const cr = res.headers.get("content-range"); // "bytes s-e/TOTAL"
          total = cr ? Number(cr.split("/")[1]) : 0;
        }
        if (!total || !Number.isFinite(total)) throw new Error("no total length");
        const buf = new Uint8Array(await res.arrayBuffer());
        // 完整性防线:拿回字节数必须正好等于请求区间(边缘吐 SPA 页时长度必然对不上)
        if (buf.length !== end - start + 1) throw new Error(`chunk ${start}-${end} got ${buf.length}`);
        parts.push(buf);
        start += buf.length;
        setDlProgress(Math.min(0.999, start / total));
        if (start >= total) break;
      }
      const blob = new Blob(parts, { type: "application/vnd.android.package-archive" });
      // 最终总长校验:任何缺斤少两都不落地(宁可报错重试,绝不给用户一个装不上的残包)
      if (blob.size !== total) throw new Error(`blob ${blob.size} != ${total}`);
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `AIChat${ver ? `-v${ver.latestVersion}` : ""}.apk`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
      setDlProgress(null);
    } catch {
      setDlProgress(null);
      // 分块失败(内存不足/浏览器不支持 fetch Range/网络中断)→ 退到【绕平台边缘】的整包直链:
      // directUrl 是 expo.dev 等外部直链,不经本边缘,不受 32MiB 上限,任何浏览器都能整包下完。
      // 绝不退回 /apk 裸链(走本边缘,整包必中上限吐 SPA、装不上)。
      if (ver?.directUrl) {
        window.location.href = ver.directUrl;
      } else {
        alert("下载未完成，请检查网络后重新点击下载按钮。");
      }
    }
  }

  const versionLabel = ver ? `v${ver.latestVersion}` : "";
  const androidSteps = [
    "点击下方「下载 Android 版」按钮，下载 APK 安装包",
    "在手机「设置 → 安全」中开启「允许安装未知来源应用」",
    "点击 APK 文件，按提示完成安装",
    "安装完成后在桌面找到 AIChat 图标，点击启动",
  ];
  const iosSteps = [
    "使用 Safari 浏览器打开 nexuschat.best",
    "点击底部工具栏中间的「分享」按钮（方框加箭头图标）",
    "在弹出菜单中向下滚动，点击「添加到主屏幕」",
    "点击右上角「添加」，App 图标即出现在桌面",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* 微信/QQ 内置浏览器引导蒙层 */}
      {guideOpen && inAppBrowser && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex flex-col items-center px-8 pt-8"
          onClick={() => setGuideOpen(false)}
        >
          <div className="self-end text-5xl leading-none select-none" aria-hidden>↗</div>
          <div className="mt-6 max-w-xs text-center">
            <p className="text-white text-lg font-bold leading-relaxed">
              {isWeChat ? "微信" : "QQ"}内无法直接下载安装包
            </p>
            <p className="text-white/85 text-sm mt-3 leading-relaxed">
              请点击右上角 <span className="inline-block px-2 rounded bg-white/20 font-bold">···</span> 菜单
              <br />选择「<strong>在浏览器打开</strong>」后再下载
            </p>
            <p className="text-white/50 text-xs mt-6">点击任意处关闭提示</p>
          </div>
        </div>
      )}

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
            <span className="font-bold text-sm">AIChat 下载</span>
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
            扫码或点击下载 {versionLabel && <span className="font-bold">{versionLabel}</span>}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            下载 <span className="bg-gradient-to-r from-[#00d4ff] to-[#a855f7] bg-clip-text text-transparent">AIChat</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            AI 智能体 · 加密社交 · Web3 资产，一个 App 全搞定
          </p>
        </motion.div>
      </section>

      {/* 群/用户邀请个性化横幅:从群/用户二维码扫来,显示要加入的群名或对方名片,提高下载转化 */}
      {inviteTarget && (
        <section className="px-4 -mt-6 mb-2">
          <div className="max-w-md mx-auto rounded-2xl border border-[#00d4ff]/30 bg-[#00d4ff]/10 p-4 flex items-center gap-4">
            {inviteTarget.avatar ? (
              <img src={inviteTarget.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center text-white text-xl font-bold shrink-0">
                {inviteTarget.name.slice(0, 1)}
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">{inviteTarget.type === "group" ? "邀请你加入群聊" : "邀请你加为好友"}</p>
              <p className="text-lg font-bold truncate">{inviteTarget.name}</p>
              {inviteTarget.type === "group" && inviteTarget.memberCount != null && (
                <p className="text-xs text-muted-foreground">{inviteTarget.memberCount} 名成员</p>
              )}
            </div>
          </div>
          <p className="max-w-md mx-auto text-center text-xs text-muted-foreground mt-2">
            下载 App 并登录后，{inviteTarget.type === "group" ? "自动加入该群" : "打开 TA 的名片"}
          </p>
        </section>
      )}

      {/* 邀请码横幅:从 /i/CODE 短链进来时展示邀请人的码,引导装后手动填(否则 ref 丢失=邀请无效) */}
      {inviteRef && (
        <section className="px-4 -mt-6 mb-2">
          <div className="max-w-md mx-auto rounded-2xl border border-[#a855f7]/30 bg-[#a855f7]/10 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              🎁 好友邀请你加入！安装后在 App「我的 → 邀请好友」填入下方邀请码，双方各得 AC 奖励
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl font-black tracking-[0.2em] bg-gradient-to-r from-[#00d4ff] to-[#a855f7] bg-clip-text text-transparent">
                {inviteRef}
              </span>
              <button
                onClick={copyRef}
                className="flex items-center gap-1 rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 text-sm hover:bg-white/20 transition-colors"
              >
                {refCopied ? <Check size={14} /> : <Copy size={14} />}
                {refCopied ? "已复制" : "复制"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Platform Tabs */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
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
            {/* 下载卡:大按钮 + 动态二维码 + 直链复制 */}
            <div className="rounded-2xl border border-[#00d4ff]/20 bg-gradient-to-br from-[#00d4ff]/10 to-transparent p-6 flex flex-col items-center gap-4">
              <a
                href="/apk"
                onClick={onDownloadClick}
                aria-disabled={dlProgress !== null}
                className="relative w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white text-base font-bold hover:opacity-90 transition-opacity overflow-hidden"
              >
                {dlProgress !== null && (
                  <span
                    className="absolute left-0 top-0 bottom-0 bg-white/25 transition-[width] duration-200"
                    style={{ width: `${Math.round(dlProgress * 100)}%` }}
                  />
                )}
                <span className="relative inline-flex items-center gap-2">
                  <Download size={18} />
                  {dlProgress !== null
                    ? `下载中 ${Math.round(dlProgress * 100)}%`
                    : `下载 Android 版${versionLabel ? ` ${versionLabel}` : ""}`}
                </span>
              </a>

              {/* 直链(复制发给好友/下载器) */}
              <div className="w-full flex items-center gap-2">
                <input
                  id="apk-link-input"
                  readOnly
                  value={PAGE_LINK}
                  className="flex-1 h-9 rounded-lg bg-[#0d1117] border border-border/30 px-3 text-xs text-muted-foreground"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  onClick={copyLink}
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 border-[#00d4ff]/30 text-[#00d4ff] bg-transparent hover:bg-[#00d4ff]/10"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span className="ml-1 text-xs">{copied ? "已复制" : "复制"}</span>
                </Button>
              </div>

              {/* 备用整包直链:分块下不动/浏览器不支持时的明路。走 expo.dev(绕平台边缘,不受 32MiB 上限,
                  能整包下完),海外 CDN 稍慢但装得上。仅在后台配了外部直链时显示。 */}
              {ver?.directUrl && (
                <a
                  href={ver.directUrl}
                  className="text-xs text-muted-foreground/70 underline hover:text-[#00d4ff] transition-colors"
                >
                  下载慢或失败？点这里用备用线路下载
                </a>
              )}

              <div className="rounded-xl overflow-hidden border border-[#00d4ff]/20 p-3 bg-white">
                <QRCodeSVG value={PAGE_LINK} size={168} level="M" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                手机扫码打开本页下载<br />（微信扫码后请选「在浏览器打开」）
              </p>
              <p className="text-sm text-muted-foreground/60 text-center">
                {versionLabel ? `版本 ${versionLabel} · ` : ""}需要 Android 8.0+ · 官方原生版
              </p>
            </div>

            {/* 安装步骤 + 更新日志 */}
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

              {ver?.releaseNotes ? (
                <div className="mt-4 p-4 rounded-xl bg-card/40 border border-border/30 max-h-44 overflow-y-auto">
                  <p className="text-xs font-semibold text-foreground mb-2">更新内容（{versionLabel}）</p>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{ver.releaseNotes}</p>
                </div>
              ) : null}

              <div className="mt-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-sm text-amber-400/80 leading-relaxed">
                  <strong className="text-amber-400">安全提示：</strong>
                  安装完成后建议在设置中关闭「允许安装未知来源应用」。本页下载的 APK 为官方发布版本。
                </p>
              </div>

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
              <div className="rounded-xl overflow-hidden border border-[#a855f7]/20 p-3 bg-white">
                <QRCodeSVG value={ORIGIN} size={168} level="M" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                使用 iPhone Safari 扫描二维码<br />然后按步骤添加到主屏幕
              </p>
              <Button
                onClick={() => window.open(ORIGIN, "_blank")}
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
