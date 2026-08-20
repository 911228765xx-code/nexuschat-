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

const APK_MIME = "application/vnd.android.package-archive";
/** OPFS 里的临时落盘文件名：固定名字，才能在每次重试前把上次的残留和写锁清掉 */
const OPFS_NAME = "bitchat-download.apk";

const isWeChat = typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);
const isQQ = typeof navigator !== "undefined" && /\bQQ\/|QQBrowser/i.test(navigator.userAgent);
const inAppBrowser = isWeChat || isQQ;

interface VersionInfo { latestVersion: string; releaseNotes: string; directUrl: string }

function readInviteCode(): string {
  if (typeof window === "undefined") return "";
  return (new URLSearchParams(window.location.search).get("ref") || "")
    .replace(/[^0-9A-Za-z]/g, "")
    .slice(0, 30);
}

/** directUrl 必须是真实外部文件源，不能再次跳回本站下载入口。 */
function usableDirectUrl(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const target = new URL(value, ORIGIN);
    const path = target.pathname.replace(/\/+$/, "") || "/";
    if (target.origin === ORIGIN && ["/apk", "/download", "/download/apk"].includes(path)) return "";
    return target.href;
  } catch {
    return "";
  }
}

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
  const [rawInviteCode] = useState(readInviteCode);
  const [inviteRef] = useState<string>(() => {
    if (/^g\d+t[0-9a-fA-F]+$/.test(rawInviteCode) || /^u\d+$/.test(rawInviteCode)) return "";
    return rawInviteCode.toUpperCase();
  });
  const [refCopied, setRefCopied] = useState(false);
  // 邀请流(扫群/用户二维码进来):同步判定,页面直接按"转化优先"紧凑布局渲染,不等接口、不跳版。
  // 压缩 hero、隐藏手机上无意义的大二维码/更新日志/Web版引导,让邀请卡+下载按钮进第一屏。
  const [inviteFlowCode] = useState<string>(() =>
    /^g\d+t[0-9a-fA-F]+$/.test(rawInviteCode) || /^u\d+$/.test(rawInviteCode) ? rawInviteCode : "",
  );
  const isInviteFlow = Boolean(inviteFlowCode);
  const continueInAppUrl = inviteFlowCode ? `nexuschat://i/${inviteFlowCode}` : "";
  // 从群/用户二维码扫来:显示"邀请你加入群聊「XXX」"/"XXX 邀请你加为好友",提高下载转化
  const [inviteTarget, setInviteTarget] = useState<{ type: "group" | "user"; name: string; avatar: string | null; memberCount?: number } | null>(null);
  useEffect(() => {
    const raw = rawInviteCode;
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
  }, [rawInviteCode]);

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

  function openInSystemBrowser() {
    // 微信/QQ 内置浏览器拦 APK；尽量跳到系统 Chrome/默认浏览器再下
    const target = `${ORIGIN}/download${rawInviteCode ? `?ref=${encodeURIComponent(rawInviteCode)}` : ""}`;
    const hostPath = target.replace(/^https?:\/\//, "");
    const intent = `intent://${hostPath}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(target)};end`;
    window.location.href = /Android/i.test(navigator.userAgent) ? intent : target;
  }

  async function saveApkBlob(blob: Blob, filename: string) {
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objUrl), 60_000);
  }

  /**
   * 分块拉取整包并返回可下载的 Blob。
   * 托管链路对单次响应约有 32MiB 上限（整包 /apk 恒 500 吐 HTML），所以只能按 4MB 有界 Range 取；
   * 每块严格校验 Content-Range 与字节数——边缘兜底的 SPA 网页不可能恰好等于请求区间长度，残包不落地。
   */
  async function fetchApkChunked(): Promise<Blob> {
    const CHUNK = 4 * 1024 * 1024;
    let start = 0;
    let total = 0;
    // Chrome Android 支持 OPFS：边下边写盘，避免 180MB 全扛在 JS 内存里被系统杀掉
    const root = typeof navigator !== "undefined" && navigator.storage && "getDirectory" in navigator.storage
      ? await navigator.storage.getDirectory().catch(() => null)
      : null;
    // 先删上一次的残留：一是不白占用户 180MB，二是上次异常留下的写锁会让本次 createWritable 失败
    if (root) await root.removeEntry(OPFS_NAME).catch(() => {});
    const fileHandle = root
      ? await root.getFileHandle(OPFS_NAME, { create: true }).catch(() => null)
      : null;
    const writable = fileHandle
      ? await fileHandle.createWritable().catch(() => null)
      : null;
    const parts: BlobPart[] = [];

    try {
      for (;;) {
        const end = total > 0 ? Math.min(start + CHUNK - 1, total - 1) : start + CHUNK - 1;
        const apkPath = `/apk?v=${encodeURIComponent(ver?.latestVersion || "1")}`;
        let res: globalThis.Response | null = null;
        let lastErr = "";
        for (let tryN = 0; tryN < 3; tryN++) {
          try {
            res = await fetch(apkPath, { headers: { Range: `bytes=${start}-${end}` }, cache: "no-store" });
            if (res.status === 206) break;
            lastErr = `no partial (${res.status})`;
            res = null;
          } catch (e) {
            lastErr = e instanceof Error ? e.message : "network";
            res = null;
          }
          if (tryN < 2) await new Promise((r) => setTimeout(r, 500 * (tryN + 1)));
        }
        if (!res || res.status !== 206) throw new Error(lastErr || "no partial");
        const type = res.headers.get("content-type")?.toLowerCase() ?? "";
        if (type.includes("text/html")) throw new Error("received html");
        const cr = res.headers.get("content-range"); // "bytes s-e/TOTAL"
        const range = cr?.match(/^bytes\s+(\d+)-(\d+)\/(\d+)$/i);
        if (!range) throw new Error("invalid content-range");
        const returnedStart = Number(range[1]);
        const returnedEnd = Number(range[2]);
        const returnedTotal = Number(range[3]);
        if (returnedStart !== start || !Number.isFinite(returnedTotal) || !returnedTotal) {
          throw new Error("mismatched content-range");
        }
        if (!total) total = returnedTotal;
        if (total !== returnedTotal) throw new Error("total length changed");
        // 按固定块长请求可能越过文件尾（末块 / 小于一块的包）：允许服务端把上界收窄到 total-1
        const expectedEnd = Math.min(end, total - 1);
        if (returnedEnd !== expectedEnd) throw new Error("mismatched content-range");
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.length !== expectedEnd - start + 1) throw new Error(`chunk ${start}-${expectedEnd} got ${buf.length}`);
        if (start === 0 && (buf[0] !== 0x50 || buf[1] !== 0x4b)) throw new Error("not an apk/zip");
        if (writable) await writable.write(buf);
        else parts.push(buf);
        start += buf.length;
        setDlProgress(Math.min(0.999, start / total));
        if (start >= total) break;
      }

      if (writable && fileHandle) {
        await writable.close();
        const file = await fileHandle.getFile();
        if (file.size !== total) throw new Error(`opfs ${file.size} != ${total}`);
        return file;
      }
      const blob = new Blob(parts, { type: APK_MIME });
      if (blob.size !== total) throw new Error(`blob ${blob.size} != ${total}`);
      return blob;
    } catch (err) {
      // 中途失败必须 abort：没关闭的 writable 会一直占着 OPFS 文件的写锁，
      // 下次重试拿不到 writable 就会退回「180MB 全进内存」，手机上基本必崩。
      if (writable) await writable.abort().catch(() => {});
      throw err;
    }
  }

  async function onDownloadClick(e: React.MouseEvent) {
    e.preventDefault();
    if (inAppBrowser) { setGuideOpen(true); return; } // 微信/QQ 拦 APK:引导去系统浏览器
    if (dlProgress !== null) return; // 正在下

    const filename = `Bitchat${ver ? `-v${ver.latestVersion}` : ""}.apk`;
    try {
      setDlProgress(0);
      await saveApkBlob(await fetchApkChunked(), filename);
      setDlProgress(null);
    } catch {
      setDlProgress(null);
      alert("下载未完成。请用系统浏览器（Chrome / 自带浏览器）打开本页，连上 Wi‑Fi 后重试，勿在微信内下载。");
    }
  }

  const versionLabel = ver ? `v${ver.latestVersion}` : "";
  const safeDirectUrl = usableDirectUrl(ver?.directUrl);
  const androidSteps = isInviteFlow
    ? [
        "点击下方「下载 Android 版」按钮，下载 APK 安装包",
        "点击 APK 文件，按提示完成安装",
        "安装完成后返回这个下载页面",
        "点击「打开 Bitchat 继续」完成加群或查看名片",
      ]
    : [
        "点击下方「下载 Android 版」按钮，下载 APK 安装包",
        "在手机「设置 → 安全」中开启「允许安装未知来源应用」",
        "点击 APK 文件，按提示完成安装",
        "安装完成后在桌面找到 Bitchat 图标，点击启动",
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
        <div className="fixed inset-0 z-[100] bg-black/85 flex flex-col items-center px-8 pt-8">
          <div className="self-end text-5xl leading-none select-none" aria-hidden>↗</div>
          <div className="mt-6 max-w-xs text-center">
            <p className="text-white text-lg font-bold leading-relaxed">
              {isWeChat ? "微信" : "QQ"}内无法直接下载安装包
            </p>
            <p className="text-white/85 text-sm mt-3 leading-relaxed">
              请点击右上角 <span className="inline-block px-2 rounded bg-white/20 font-bold">···</span> 菜单
              <br />选择「<strong>在浏览器打开</strong>」后再下载
            </p>
            <button
              type="button"
              onClick={openInSystemBrowser}
              className="mt-6 w-full rounded-xl bg-[#00d4ff] px-4 py-3 text-sm font-bold text-black"
            >
              尝试用系统浏览器打开
            </button>
            <button
              type="button"
              onClick={() => { void copyLink(); }}
              className="mt-3 w-full rounded-xl border border-white/30 px-4 py-3 text-sm font-semibold text-white"
            >
              复制下载页链接
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="mt-6 text-white/50 text-xs"
            >
              关闭提示
            </button>
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
            <span className="font-bold text-sm">Bitchat 下载</span>
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

      {/* Hero:邀请流压缩(徽标/口号让位,邀请卡+下载按钮要进手机第一屏) */}
      <section className={`${isInviteFlow ? "pt-24 pb-5" : "pt-28 pb-12"} px-4 text-center`}>
        <motion.div {...fadeUp}>
          {!isInviteFlow && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-sm font-medium mb-6">
              <QrCode size={12} />
              扫码或点击下载 {versionLabel && <span className="font-bold">{versionLabel}</span>}
            </div>
          )}
          <h1 className={`${isInviteFlow ? "text-2xl" : "text-3xl sm:text-4xl"} font-bold mb-3`}>
            下载 <span className="bg-gradient-to-r from-[#00d4ff] to-[#a855f7] bg-clip-text text-transparent">Bitchat</span>
          </h1>
          {!isInviteFlow && (
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              澳洲 AFT 集团旗下 · 让AI社交成为生活习惯
            </p>
          )}
        </motion.div>
      </section>

      {/* 群/用户邀请个性化卡片:从群/用户二维码扫来,显示要加入的群名或对方名片,提高下载转化。
          未拿到数据前(接口在途/群已删)显示通用文案占位,布局不跳。 */}
      {isInviteFlow && (
        <section className="px-4 mb-4">
          <motion.div {...fadeUp} className="max-w-md mx-auto rounded-2xl border border-[#00d4ff]/30 bg-gradient-to-br from-[#00d4ff]/10 to-[#a855f7]/5 overflow-hidden">
            <div className="p-4 flex items-center gap-4">
              {inviteTarget?.avatar ? (
                <img src={inviteTarget.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center text-white text-xl font-bold shrink-0">
                  {(inviteTarget?.name || "友").slice(0, 1)}
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {inviteTarget ? (inviteTarget.type === "group" ? "邀请你加入群聊" : "邀请你加为好友") : "好友邀请你加入"}
                </p>
                <p className="text-lg font-bold truncate">{inviteTarget?.name || "Bitchat"}</p>
                {inviteTarget?.type === "group" && inviteTarget.memberCount != null && (
                  <p className="text-xs text-muted-foreground">{inviteTarget.memberCount} 名成员</p>
                )}
              </div>
            </div>
            <div className="px-4 py-3 bg-white/[0.03] border-t border-white/10 text-center">
              <p className="text-xs text-muted-foreground mb-2">
                已安装可直接打开；首次安装请下载完成后返回本页继续
              </p>
              <a
                href={continueInAppUrl}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00d4ff]/15 border border-[#00d4ff]/35 px-4 py-2 text-sm font-semibold text-[#00d4ff] hover:bg-[#00d4ff]/25 transition-colors"
              >
                <ExternalLink size={15} />
                打开 Bitchat {inviteTarget?.type === "user" ? "查看名片" : "继续加群"}
              </a>
            </div>
          </motion.div>
        </section>
      )}

      {/* 邀请码横幅:从 /i/CODE 短链进来时展示邀请人的码,引导装后手动填(否则 ref 丢失=邀请无效) */}
      {inviteRef && (
        <section className="px-4 -mt-6 mb-2">
          <div className="max-w-md mx-auto rounded-2xl border border-[#a855f7]/30 bg-[#a855f7]/10 p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              🎁 好友邀请你加入！安装后在 App「我的 → 邀请好友」填入下方邀请码，双方各得 IT 奖励
            </p>
            <div className="flex min-w-0 flex-col items-center justify-center gap-3 sm:flex-row">
              <span className="max-w-full break-all text-center text-xl font-black leading-relaxed tracking-[0.12em] bg-gradient-to-r from-[#00d4ff] to-[#a855f7] bg-clip-text text-transparent sm:text-2xl sm:tracking-[0.2em]">
                {inviteRef}
              </span>
              <button
                onClick={copyRef}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 text-sm hover:bg-white/20 transition-colors"
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
          className={`flex justify-center ${isInviteFlow ? "mb-6" : "mb-10"}`}
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
                href="/download"
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
              <p className="text-[11px] text-muted-foreground/80 text-center leading-relaxed">
                安装包约 180MB，请用 Wi‑Fi · 勿在微信内直接下载
                {inAppBrowser ? " · 请先点右上角用浏览器打开" : ""}
              </p>

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
              {safeDirectUrl && (
                <a
                  href={safeDirectUrl}
                  className="text-xs text-muted-foreground/70 underline hover:text-[#00d4ff] transition-colors"
                >
                  海外备用线路（国内可能打不开）
                </a>
              )}

              {/* 二维码只在桌面显示:手机用户已经在手机上,给他看"用手机扫这个码"没有意义还占一整屏 */}
              <div className="hidden md:block rounded-xl overflow-hidden border border-[#00d4ff]/20 p-3 bg-white">
                <QRCodeSVG value={PAGE_LINK} size={168} level="M" />
              </div>
              <p className="hidden md:block text-sm text-muted-foreground text-center">
                手机扫码打开本页下载<br />（微信扫码后请选「在浏览器打开」）
              </p>
              <p className="text-xs md:text-sm text-muted-foreground/60 text-center">
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

              {/* 更新日志对扫码拉新的人没有价值(还常是旧版本文案),邀请流不展示 */}
              {!isInviteFlow && ver?.releaseNotes ? (
                <div className="mt-4 p-4 rounded-xl bg-card/40 border border-border/30 max-h-44 overflow-y-auto">
                  <p className="text-xs font-semibold text-foreground mb-2">更新内容（{versionLabel}）</p>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{ver.releaseNotes}</p>
                </div>
              ) : null}

              <div className="mt-4 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs leading-relaxed text-amber-400/80">
                  <strong className="text-amber-400">安全提示：</strong>
                  安装完成后建议在设置中关闭「允许安装未知来源应用」。本页下载的 APK 为官方发布版本。
                </p>
              </div>

              {/* 邀请流不引导去 Web 版:自动进群/名片只在 App 深链里生效,分流到 Web 会断掉 */}
              {!isInviteFlow && (
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
              )}
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

        {/* Bottom CTA:邀请流不放"体验 Web 版"大按钮——和下载按钮抢视觉重心,还会把要进群的人带离 App 路径 */}
        {!isInviteFlow && (
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
        )}
      </section>
    </div>
  );
}
