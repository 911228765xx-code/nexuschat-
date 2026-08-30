/*
 * Bitchat 官网首页 — 深海蓝产品站
 * 只替换公开首页；登录、下载、App 路由、API 与数据库保持原样。
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  AppWindow, ArrowRight, Bot, Building2, Compass, Download, FileText,
  Grid2X2, MessageCircle, Search, Send, ShieldCheck, Sparkles, Star,
  Users, type LucideIcon,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/contexts/I18nContext";

const LOGO =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663385790517/fYL7bQEV8tj27K63dbYKsc/icon-192_44c1362d.png";

const copy = {
  "zh-CN": {
    product: "产品", agents: "AI智能体", value: "价值网络", about: "关于我们",
    enter: "进入网页版", download: "下载 App",
    heroA: "会聊天，", heroB: "更会思考的社交平台",
    heroDesc: "即时通讯、社区运营与AI智能体，合成一体化数字社交空间。",
    productTitle: "把沟通、社区与智能体放在一起",
    productDesc: "从一条消息，到一个持续生长的社区，再到随时在线的AI协作伙伴。",
    messaging: "即时通讯", messagingDesc: "私信、群聊、语音与文件，通知未读可追踪，沟通顺滑可靠",
    community: "社区与广场", communityDesc: "动态广场、兴趣社区、语音房连麦，一键发现与加入",
    agent: "智能体中心", agentDesc: "8 个智能体 24 小时在线，替你研究、判断、运营",
    report: "深度研报", reportDesc: "项目尽调、合约安全与赛道研判，一键生成",
    valueTitle: "让每一次真实参与都有价值",
    itTitle: "IT 社交积分", itDesc: "把日常参与沉淀为可见权益",
    bitTitle: "BIT 应用价值", bitDesc: "让权益进入可消费、可结算的应用场景",
    trustTitle: "安全、可靠、长期在线", trustDesc: "消息、通知与文件状态清晰可追踪，让每一次沟通都有稳定体验。",
    companyTitle: "来自澳洲 AFT 集团的技术实践",
    companyDesc: "澳洲 AFT 集团成立于 2017 年，总部位于澳大利亚悉尼。比特AI社交是集团旗下 AI×Social 产品。",
    closing: "开始你的 AI 社交", footer: "© 2026 澳洲AFT集团 · 比特AI社交（Bitchat）",
    messages: "消息", search: "搜索群聊或联系人", group: "AI社交群", members: "128 位成员",
    insight: "刚整理好一份行业洞察，供大家参考", saved: "非常全面，已收藏",
    summary: "AI助手 已根据讨论生成要点总结", input: "输入消息…",
  },
  "zh-TW": {
    product: "產品", agents: "AI智能體", value: "價值網絡", about: "關於我們",
    enter: "進入網頁版", download: "下載 App",
    heroA: "會聊天，", heroB: "更會思考的社交平台",
    heroDesc: "即時通訊、社群運營與AI智能體，合成一體化數字社交空間。",
    productTitle: "把溝通、社群與智能體放在一起",
    productDesc: "從一條消息，到一個持續成長的社群，再到隨時在線的AI協作夥伴。",
    messaging: "即時通訊", messagingDesc: "私信、群聊、語音與文件，通知未讀可追蹤，溝通順滑可靠",
    community: "社群與廣場", communityDesc: "動態廣場、興趣社群、語音房連麥，一鍵發現與加入",
    agent: "智能體中心", agentDesc: "8 個智能體 24 小時在線，替你研究、判斷、運營",
    report: "深度研報", reportDesc: "項目盡調、合約安全與賽道研判，一鍵生成",
    valueTitle: "讓每一次真實參與都有價值",
    itTitle: "IT 社交積分", itDesc: "把日常參與沉澱為可見權益",
    bitTitle: "BIT 應用價值", bitDesc: "讓權益進入可消費、可結算的應用場景",
    trustTitle: "安全、可靠、長期在線", trustDesc: "消息、通知與文件狀態清晰可追蹤，讓每一次溝通都有穩定體驗。",
    companyTitle: "來自澳洲 AFT 集團的技術實踐",
    companyDesc: "澳洲 AFT 集團成立於 2017 年，總部位於澳大利亞雪梨。比特AI社交是集團旗下 AI×Social 產品。",
    closing: "開始你的 AI 社交", footer: "© 2026 澳洲AFT集團 · 比特AI社交（Bitchat）",
    messages: "消息", search: "搜索群聊或聯絡人", group: "AI社交群", members: "128 位成員",
    insight: "剛整理好一份行業洞察，供大家參考", saved: "非常全面，已收藏",
    summary: "AI助手 已根據討論生成要點總結", input: "輸入消息…",
  },
  en: {
    product: "Product", agents: "AI Agents", value: "Value Network", about: "About",
    enter: "Enter Web App", download: "Download App",
    heroA: "A social platform ", heroB: "that thinks with you",
    heroDesc: "Messaging, community operations, and AI agents in one integrated social space.",
    productTitle: "Messaging, community, and agents — together",
    productDesc: "From one message to a growing community and always-on AI collaborators.",
    messaging: "Messaging", messagingDesc: "DMs, groups, voice, and files with reliable unread and notification states",
    community: "Community & feed", communityDesc: "A public feed, interest communities, and voice rooms in one place",
    agent: "Agent center", agentDesc: "Eight agents online around the clock to research, judge, and operate",
    report: "Research reports", reportDesc: "Project diligence, contract safety, and sector views in one tap",
    valueTitle: "Make every real contribution valuable",
    itTitle: "IT social points", itDesc: "Turn everyday participation into visible rights",
    bitTitle: "BIT application value", bitDesc: "Bring rights into spendable and settled product experiences",
    trustTitle: "Safe, reliable, always online", trustDesc: "Messages, notifications, and files stay clear and traceable for a stable experience.",
    companyTitle: "Built through AFT Group's technology practice",
    companyDesc: "AFT Group was founded in 2017 and is headquartered in Sydney, Australia. Bitchat is the group's AI×Social product.",
    closing: "Start your AI social experience", footer: "© 2026 AFT Group · Bitchat",
    messages: "Messages", search: "Search groups or contacts", group: "AI Social Group", members: "128 members",
    insight: "I organized an industry brief for the group", saved: "Comprehensive — saved",
    summary: "AI Assistant generated a discussion summary", input: "Message…",
  },
} as const;

type HomeCopy = { [K in keyof typeof copy["zh-CN"]]: string };

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-48px" },
  transition: { duration: 0.55 },
};

function PrimaryButton({ children, secondary, onClick }: { children: ReactNode; secondary?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`h-14 min-w-[176px] rounded-xl px-6 inline-flex items-center justify-center gap-2 text-[15px] font-bold transition-all active:scale-[.98] ${
        secondary
          ? "border border-[#2E75D7] bg-[#061126]/80 text-[#69B7FF] hover:bg-[#0B1B37]"
          : "border border-[#4CA3FF] bg-gradient-to-r from-[#2378FF] to-[#22BDF4] text-white shadow-[0_12px_38px_rgba(35,120,255,.24)] hover:brightness-110"
      }`}
    >
      {children}
    </button>
  );
}

function ConversationRow({ initials, name, preview, active }: { initials: string; name: string; preview: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl px-2.5 py-2.5 ${active ? "border border-[#2C7EFF] bg-[#123267]/55" : "border border-transparent"}`}>
      <div className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-[11px] font-extrabold text-white ${active ? "bg-gradient-to-br from-[#2378FF] to-[#31CBFF]" : "bg-[#2B3F6C]"}`}>{initials}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-bold text-[#F5F8FF]">{name}</p>
        <p className="mt-0.5 truncate text-[9px] text-[#70809B]">{preview}</p>
      </div>
      {active && <span className="h-[18px] min-w-[18px] rounded-full bg-[#2378FF] px-1 text-center text-[8px] font-extrabold leading-[18px] text-white">12</span>}
    </div>
  );
}

function ProductStage({ c, compact = false }: { c: HomeCopy; compact?: boolean }) {
  return (
    <div className={`grid overflow-hidden rounded-[18px] border border-[#2D6CC4] bg-[#051024] shadow-[0_30px_100px_rgba(14,71,170,.20)] ${compact ? "h-[430px]" : "h-[510px]"} grid-cols-[138px_1fr] lg:grid-cols-[58px_230px_1fr]`}>
      <div className="hidden border-r border-[#183661] bg-[#050D1E] py-5 lg:flex flex-col items-center gap-5">
        <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-[#22A8FF] to-[#24D8F4] text-[#061020]"><MessageCircle size={18} fill="currentColor" /></div>
        {[MessageCircle, Grid2X2, Compass, Users].map((Icon, i) => (
          <div key={i} className={`grid h-9 w-9 place-items-center rounded-[10px] ${i === 0 ? "border-l-2 border-[#2378FF] bg-[#2378FF]/15 text-[#50B8FF]" : "text-[#61718D]"}`}><Icon size={17} /></div>
        ))}
      </div>

      <div className="border-r border-[#183661] bg-[#071327] p-3 lg:p-3.5">
        <div className="mb-3 flex items-center justify-between"><span className="text-[15px] font-extrabold text-white">{c.messages}</span><AppWindow size={16} className="text-[#3892FF]" /></div>
        <div className="mb-2.5 flex h-8 items-center gap-1.5 rounded-lg bg-[#0C1B34] px-2 text-[9px] text-[#61718D]"><Search size={12} /><span className="truncate">{c.search}</span></div>
        <ConversationRow initials="AI" name={c.group} preview="[图片]" active />
        <ConversationRow initials="B" name="Bitchat Official" preview="[视频]" />
        <ConversationRow initials="研" name="AI Research" preview="研报已更新" />
        {!compact && <ConversationRow initials="产" name="Product Lab" preview="最近更新了文档" />}
      </div>

      <div className="min-w-0 bg-[#051124] flex flex-col">
        <div className="h-[62px] border-b border-[#183661] px-4 flex items-center justify-between">
          <div><p className="text-[12px] font-extrabold text-white">{c.group}</p><p className="mt-0.5 text-[8px] text-[#70809B]">{c.members}</p></div>
          <div className="flex gap-3 text-[#7F8DA5]"><Search size={15} /><MessageCircle size={15} /></div>
        </div>
        <div className="min-h-0 flex-1 p-4 flex flex-col gap-3">
          <div className="max-w-[72%] rounded-xl rounded-tl-sm bg-[#12223D] px-3 py-2 text-[10px] leading-4 text-[#D9E4F5]">{c.insight}</div>
          <div className="w-[62%] rounded-xl border border-[#183661] bg-[#0B1A32] p-2.5 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#2CA5FF]/15"><FileText size={18} className="text-[#54B9FF]" /></div>
            <div><p className="text-[9px] font-bold text-white">AI Industry Insight.pdf</p><p className="text-[8px] text-[#70809B]">1.8 MB</p></div>
          </div>
          <div className="ml-auto rounded-xl rounded-tr-sm bg-[#2378FF] px-3 py-2 text-[9px] font-semibold text-white">{c.saved}</div>
          <div className="mt-auto flex items-center gap-2 rounded-xl border border-[#2464AC] bg-[#2471DA]/10 p-2.5 text-[9px] text-[#BBD8F5]"><Sparkles size={15} className="shrink-0 text-[#48C6FF]" />{c.summary}</div>
        </div>
        <div className="mx-3 mb-3 flex h-11 items-center rounded-xl border border-[#183661] pl-3 pr-1.5 text-[9px] text-[#70809B]"><span className="flex-1">{c.input}</span><span className="grid h-8 w-8 place-items-center rounded-full bg-[#2378FF] text-white"><Send size={14} /></span></div>
      </div>
    </div>
  );
}

function FeatureRail({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <motion.div {...fadeUp} className="min-h-[164px]">
      <div className="mb-4 grid h-13 w-13 place-items-center rounded-2xl border border-[#183661] bg-[#112C52]/55 text-[#48B6FF]"><Icon size={23} /></div>
      <h3 className="text-xl font-extrabold text-white">{title}</h3>
      <p className="mt-2.5 text-[13px] leading-6 text-[#A9B7CF]">{desc}</p>
    </motion.div>
  );
}

function ValueOrbit({ title, desc, violet }: { title: string; desc: string; violet?: boolean }) {
  return (
    <motion.div
      {...fadeUp}
      className={`relative grid aspect-square w-full max-w-[350px] place-items-center overflow-hidden rounded-full border ${violet ? "border-[#765EFF]/50 bg-[#291C5D]/20" : "border-[#26A0FF]/50 bg-[#0A2245]/25"}`}
    >
      <div className={`absolute inset-[9%] rounded-full border ${violet ? "border-[#7C5FFF]/25" : "border-[#2BB9FF]/25"}`} />
      <div className={`absolute inset-[18%] rounded-full border ${violet ? "border-[#7C5FFF]/20" : "border-[#2BB9FF]/20"}`} />
      <div className="relative z-10 flex flex-col items-center px-10 text-center">
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-full border border-[#183661] bg-[#07172D]">
          {violet ? <Grid2X2 size={26} className="text-[#8F7CFF]" /> : <Star size={27} className="text-[#45C8FF]" />}
        </div>
        <h3 className="text-[24px] font-extrabold text-white">{title}</h3>
        <p className="mt-3 text-[13px] leading-6 text-[#A9B7CF]">{desc}</p>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { locale } = useI18n();
  const c: HomeCopy = locale === "zh-CN" ? copy["zh-CN"] : locale === "zh-TW" ? copy["zh-TW"] : copy.en;

  useEffect(() => {
    if (!loading && user) setLocation("/app/chat");
  }, [loading, user, setLocation]);

  const enterApp = () => {
    if (user) setLocation("/app/chat");
    else window.location.href = "/login?returnTo=%2Fapp%2Fchat";
  };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const heroWord = c.heroB.includes("思考") ? "思考" : "thinks";
  const [heroBefore, heroAfter] = c.heroB.split(heroWord);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#030A19] text-white selection:bg-[#2378FF]/40">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#183661]/70 bg-[#030A19]/95 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-4 sm:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5">
            <img src={LOGO} alt="Bitchat" className="h-10 w-10 rounded-xl" />
            <span className="text-xl font-extrabold tracking-tight">Bitchat</span>
          </button>
          <div className="hidden items-center gap-9 lg:flex">
            <button onClick={() => scrollTo("product")} className="text-sm font-semibold text-[#A9B7CF] hover:text-white">{c.product}</button>
            <button onClick={() => scrollTo("product")} className="text-sm font-semibold text-[#A9B7CF] hover:text-white">{c.agents}</button>
            <button onClick={() => scrollTo("value")} className="text-sm font-semibold text-[#A9B7CF] hover:text-white">{c.value}</button>
            <button onClick={() => scrollTo("about")} className="text-sm font-semibold text-[#A9B7CF] hover:text-white">{c.about}</button>
          </div>
          <div className="flex items-center gap-2.5">
            <LanguageSwitcher />
            <button onClick={enterApp} className="h-10 rounded-xl border border-[#2378FF] px-4 text-sm font-bold text-[#7CC5FF] transition-colors hover:bg-[#2378FF]/10">{c.enter}</button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative mx-auto flex min-h-[810px] max-w-[1320px] flex-col items-center px-4 pb-16 pt-32 sm:px-8 lg:flex-row lg:pt-24">
          <div className="pointer-events-none absolute left-[4%] top-[24%] h-80 w-80 rounded-full bg-[#1E64FF]/10 blur-3xl" />
          <motion.div {...fadeUp} className="relative z-10 w-full pt-10 lg:w-[45%] lg:pr-8">
            <h1 className="text-[43px] font-black leading-[1.28] tracking-[-1.7px] sm:text-[58px] sm:tracking-[-2.2px]">
              {c.heroA}<br className="hidden lg:block" />{heroBefore}<span className="text-[#3DA2FF]">{heroWord}</span>{heroAfter}
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-8 text-[#A9B7CF]">{c.heroDesc}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton onClick={enterApp}>{c.enter}<ArrowRight size={18} /></PrimaryButton>
              <PrimaryButton secondary onClick={() => setLocation("/download")}><Download size={18} />{c.download}</PrimaryButton>
            </div>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.65, delay: 0.08 }} className="relative mt-16 w-full lg:mt-0 lg:w-[55%] lg:[transform:perspective(1400px)_rotateY(-3deg)]">
            <ProductStage c={c} />
          </motion.div>
        </section>

        <section id="product" className="scroll-mt-20 border-t border-[#183661]/60 px-4 py-24 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-[1320px]">
            <motion.div {...fadeUp} className="text-center">
              <h2 className="text-3xl font-black tracking-[-1px] text-white sm:text-[44px]">{c.productTitle}</h2>
              <p className="mt-4 text-[16px] text-[#A9B7CF]">{c.productDesc}</p>
            </motion.div>
            <div className="mt-14 grid items-center gap-8 lg:grid-cols-[230px_1fr_230px]">
              <div className="order-2 grid gap-10 sm:grid-cols-2 lg:order-1 lg:grid-cols-1 lg:gap-16">
                <FeatureRail icon={MessageCircle} title={c.messaging} desc={c.messagingDesc} />
                <FeatureRail icon={Users} title={c.community} desc={c.communityDesc} />
              </div>
              <motion.div {...fadeUp} className="order-1 lg:order-2"><ProductStage c={c} compact /></motion.div>
              <div className="order-3 grid gap-10 sm:grid-cols-2 lg:grid-cols-1 lg:gap-16">
                <FeatureRail icon={Bot} title={c.agent} desc={c.agentDesc} />
                <FeatureRail icon={FileText} title={c.report} desc={c.reportDesc} />
              </div>
            </div>
          </div>
        </section>

        <section id="value" className="scroll-mt-20 border-t border-[#183661]/60 px-4 py-24 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-[1320px]">
            <motion.h2 {...fadeUp} className="text-center text-3xl font-black tracking-[-1px] text-white sm:text-[44px]">{c.valueTitle}</motion.h2>
            <div className="mt-14 grid items-center gap-12 lg:grid-cols-[1fr_330px]">
              <div className="flex flex-col items-center justify-center sm:flex-row sm:-space-x-6">
                <ValueOrbit title={c.itTitle} desc={c.itDesc} />
                <ValueOrbit title={c.bitTitle} desc={c.bitDesc} violet />
              </div>
              <motion.div {...fadeUp} className="border-t border-[#183661] pt-8 text-center lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0 lg:text-left">
                <ShieldCheck size={38} className="mx-auto text-[#3989FF] lg:mx-0" />
                <h3 className="mt-5 text-[24px] font-extrabold text-white">{c.trustTitle}</h3>
                <div className="mx-auto my-5 h-0.5 w-10 bg-[#28CBFF] lg:mx-0" />
                <p className="text-[14px] leading-7 text-[#A9B7CF]">{c.trustDesc}</p>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-20 px-4 pb-24 sm:px-8">
          <motion.div {...fadeUp} className="relative mx-auto flex max-w-[1320px] flex-col items-start gap-6 overflow-hidden rounded-[20px] border border-[#183661] bg-[#061225] px-7 py-9 sm:px-12 lg:flex-row lg:items-center">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#2878FF]/10 text-[#3E8DFF]"><Building2 size={34} /></div>
            <div className="relative z-10 max-w-3xl">
              <h2 className="text-2xl font-extrabold text-white sm:text-[27px]">{c.companyTitle}</h2>
              <p className="mt-3 text-[14px] leading-7 text-[#A9B7CF]">{c.companyDesc}</p>
            </div>
            <div className="pointer-events-none absolute right-[-3%] top-1/2 h-px w-[40%] -rotate-6 bg-gradient-to-r from-transparent via-[#2BAAFF]/70 to-transparent" />
          </motion.div>
        </section>

        <section className="relative min-h-[450px] overflow-hidden border-t border-[#183661]/40 bg-[#020715] px-4 pt-24 text-center sm:px-8">
          <div className="pointer-events-none absolute bottom-[-420px] left-1/2 h-[720px] w-[1200px] -translate-x-1/2 rounded-full border-[24px] border-[#1D79FF]/20 bg-[#0E55D2]/10" />
          <motion.div {...fadeUp} className="relative z-10">
            <h2 className="text-3xl font-black tracking-[-1px] text-white sm:text-[46px]">{c.closing}</h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryButton onClick={enterApp}><AppWindow size={18} />{c.enter}<ArrowRight size={18} /></PrimaryButton>
              <PrimaryButton secondary onClick={() => setLocation("/download")}><Download size={18} />{c.download}</PrimaryButton>
            </div>
            <p className="mt-20 text-xs text-[#70809B]">{c.footer}</p>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
