/*
 * Home — NexusChat 产品落地页
 * Cyberpunk Noir: 深色背景 + 霓虹强调色 + 毛玻璃效果
 * 展示产品定位、核心功能、痛点解决、设计理念
 */
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { MessageCircle, Brain, TrendingUp, Wallet, Shield, Zap, Lock, Users, ArrowRight, ChevronRight, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const HERO_BG = "https://private-us-east-1.manuscdn.com/sessionFile/RE5PzJwx2WNaNMZmPGIOOK/sandbox/pEIImHAuSk3yRLYcRBP9Xk-img-1_1772143409000_na1fn_aGVyby1iZw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUkU1UHpKd3gyV05hTk1abVBHSU9PSy9zYW5kYm94L3BFSUltSEF1U2szeVJMWWNSQlA5WGstaW1nLTFfMTc3MjE0MzQwOTAwMF9uYTFmbl9hR1Z5YnkxaVp3LnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=YNWq2UYomZlpXHDO99M1B1U0andZ-fjmtJEK-90bzIzIVNVs~FJnfuaKVsJrayXYNQbwaTPopKxcYI9gAiqKUbeKlcEwtR45jROrIxL3ju5fToQqs9rc1GHn59ZYTSIi8uOWphC7DGE3qkzMVfyGZZcDUSOSq1flIaXMmktLwEvfg8mKIIJ5J2N5jBCkZWNIepZ7nivfF7dHNCboGiOItE8b1TLZqvJktJenCanwa7dkAc8k5VXPjq7CTODFXAJWzVvSmYRS6besGetLo6dMzU99InBBQnr2V2wTOSh0sjPx4Dkj6x0u9R87xAwiQ2eCYvwHxG0prqnGP8u-Eh8vZg__";
const CHAT_IMG = "https://private-us-east-1.manuscdn.com/sessionFile/RE5PzJwx2WNaNMZmPGIOOK/sandbox/pEIImHAuSk3yRLYcRBP9Xk-img-2_1772143383000_na1fn_Y2hhdC1pbGx1c3RyYXRpb24.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUkU1UHpKd3gyV05hTk1abVBHSU9PSy9zYW5kYm94L3BFSUltSEF1U2szeVJMWWNSQlA5WGstaW1nLTJfMTc3MjE0MzM4MzAwMF9uYTFmbl9ZMmhoZEMxcGJHeDFjM1J5WVhScGIyNC5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=FHRKYkhNty2zDXjg1cHlEAkHz7eGD-GN1Z4lLE5xfRkeso63kr10-y5xNKxQezI6ZONOWIs950ieEJIgcXoKGO8tFG2oaVWHgbuRZyhzRZhPDbNA465WARidd4HDUXRopVswmafbkMrdr7mgeHr8RG301qV3pAeZ6wa0skZ~xIQ2zS3AX8wE0S4Xy3yulJov00rYw5nvvwPClXYqnT8t9du36uoZ6QfKx0VROAAddIglgtLwtxTkqqPccgwi65i~UDQK9iFTeFnSPmeH-jrcJzyA4SoNrxPwWJ1AzPwWnpH-JCD7T1TpmmtMsP-dt-Ct1dYPrlaZnuvh5pnV3Ewphg__";
const RESEARCH_IMG = "https://private-us-east-1.manuscdn.com/sessionFile/RE5PzJwx2WNaNMZmPGIOOK/sandbox/pEIImHAuSk3yRLYcRBP9Xk-img-3_1772143392000_na1fn_cmVzZWFyY2gtaWxsdXN0cmF0aW9u.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUkU1UHpKd3gyV05hTk1abVBHSU9PSy9zYW5kYm94L3BFSUltSEF1U2szeVJMWWNSQlA5WGstaW1nLTNfMTc3MjE0MzM5MjAwMF9uYTFmbl9jbVZ6WldGeVkyZ3RhV3hzZFhOMGNtRjBhVzl1LnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=CprsnGu3hBji8nacd2wHfGUrr9c5eX2eFjgo~-~ftIptVJ5lsW2V1n7XK4ABGN32UprjzqqO4OpfNFU0Gle~3qYMeXdaXxhJzqjIOXKudc9kPBslne0U2YBzVb5lfdo0a0Suw2t1jecRydwbvqOhfZ702BjpsLbWMYsOhWYThArQbiVje-pvEQlrl0o7KpSnv-wCKZh0QpWwMUo-v0k8TOmV8DUxn3QbmE6TOS~zGSgRBWycvP-07EEfB41ykEBYWOKOpXLioW0qNgW7I5guqWBFaQZFI7CydrIryaYqlCdcjr7Z~x7gZGzjFv7A9GRlfkUsIgPmq404DUVt7zO1fA__";
const TRADING_IMG = "https://private-us-east-1.manuscdn.com/sessionFile/RE5PzJwx2WNaNMZmPGIOOK/sandbox/pEIImHAuSk3yRLYcRBP9Xk-img-4_1772143400000_na1fn_dHJhZGluZy1pbGx1c3RyYXRpb24.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUkU1UHpKd3gyV05hTk1abVBHSU9PSy9zYW5kYm94L3BFSUltSEF1U2szeVJMWWNSQlA5WGstaW1nLTRfMTc3MjE0MzQwMDAwMF9uYTFmbl9kSEpoWkdsdVp5MXBiR3gxYzNSeVlYUnBiMjQucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=dpAguH4Qg-tISDgTSBOSZrWH7A1HtxYxBM5ihIg~QoEHNrqwTExOUVzRnqszaYBUe6T4PXB3BFxtdS2p5BZuUw3ZxyGq~z3uDP0Iqc6uGE4jGyoI3YelVNB7ac36Ae3L8bWRkNd-LQM1n4QgBOQfs2J2pFVFr447urFMR2DImvgpYutrob53d~C62KdfedlrVM-XwVhvlazGyuA38BvriMfLFd-vQiPi6-X4YNW8RTbrRXlTB2amxd2MxP~jqV8vPZThK3F3645d3GLzjw-zdduqraNPK1MDweS24fbAgcB2QIqSz~PIM0o07sTt2FVH1~D7epkqDm-Y4JMwHC-JxA__";
const WALLET_IMG = "https://private-us-east-1.manuscdn.com/sessionFile/RE5PzJwx2WNaNMZmPGIOOK/sandbox/pEIImHAuSk3yRLYcRBP9Xk-img-5_1772143400000_na1fn_d2FsbGV0LWlsbHVzdHJhdGlvbg.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvUkU1UHpKd3gyV05hTk1abVBHSU9PSy9zYW5kYm94L3BFSUltSEF1U2szeVJMWWNSQlA5WGstaW1nLTVfMTc3MjE0MzQwMDAwMF9uYTFmbl9kMkZzYkdWMExXbHNiSFZ6ZEhKaGRHbHZiZy5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=fD9aYn8PihCQyQ0wDLvBpAElP70vFB9JVbLRYsYledVMNV-dYRKfl3D-C4RrNq9lazSREbrg9adpcIn7Ya-4wg8x5PN-vwMjys5JAl~1d1W46yxigzbviIUE1DulzRduq2WOSUqDOuZ5SSb8TscG4tqDrprWwhNP4kVU4Z3ultP8sikBytdf5ljmuSGUJ3Lwfe36qs-9Z4JsqQDEPJboByui9wyHiM3Db6d3wa0Cbs54MowIXIsC6iYmiRCf~tu5l7rP-yGUJS~kvGYbIl3w5PXZreVHzmRLStFb8A-1kfH4QdlyMn~~1LcX43HKTjYnh1o-KZFaDXkWUQ4rUyo2zQ__";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6 },
};

const features = [
  {
    icon: MessageCircle,
    title: "Web3 原生聊天",
    desc: "钱包地址即账号，端到端加密通讯。支持代币门控群聊——只有持有指定 NFT 或代币的用户才能进入，为每个社区打造专属私密空间。",
    img: CHAT_IMG,
    color: "from-[#00d4ff]/20 to-[#00d4ff]/5",
    borderColor: "border-[#00d4ff]/20",
    iconColor: "text-[#00d4ff]",
  },
  {
    icon: Brain,
    title: "AI 投研机器人",
    desc: "输入代币名称，10秒内自动聚合 CoinGecko、DefiLlama、链上数据等多维信息，由 AI 生成专业投研报告。在聊天中输入 /research ETH 即可触发。",
    img: RESEARCH_IMG,
    color: "from-[#a855f7]/20 to-[#a855f7]/5",
    borderColor: "border-[#a855f7]/20",
    iconColor: "text-[#a855f7]",
  },
  {
    icon: TrendingUp,
    title: "极简信号跟单",
    desc: "连接您的交易所 API，订阅 TradingView 信号源，自动执行交易。资产始终在您自己的账户中，平台不托管任何资金。四层风控保护，安全透明。",
    img: TRADING_IMG,
    color: "from-[#00ff88]/20 to-[#00ff88]/5",
    borderColor: "border-[#00ff88]/20",
    iconColor: "text-[#00ff88]",
  },
  {
    icon: Wallet,
    title: "Web3 钱包连接",
    desc: "一键连接 MetaMask、WalletConnect 等主流钱包。钱包即身份，无需注册、无需密码。支持 NFT 头像展示和链上身份验证。",
    img: WALLET_IMG,
    color: "from-[#00d4ff]/15 via-[#a855f7]/10 to-[#00d4ff]/5",
    borderColor: "border-[#a855f7]/15",
    iconColor: "text-[#a855f7]",
  },
];

const painPoints = [
  { icon: Globe, title: "工具碎片化", desc: "聊天用 Discord，行情看 CoinGecko，交易去交易所——每天在 5+ 个 App 之间来回切换" },
  { icon: Lock, title: "隐私无保障", desc: "中心化平台掌控您的数据和社交关系，随时可能封号、审查、泄露" },
  { icon: Brain, title: "投研门槛高", desc: "链上数据分散在各处，普通用户难以快速获取和理解关键信息" },
  { icon: Zap, title: "交易时机难把握", desc: "发现机会到执行交易之间的延迟，让无数 Alpha 从指间溜走" },
];

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center">
              <MessageCircle size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold font-display">NexusChat</span>
          </div>
          <Button
            onClick={() => setLocation("/app/chat")}
            className="bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/25 text-sm h-9 px-4"
            variant="outline"
          >
            进入 App
            <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={HERO_BG} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div {...fadeUp}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-xs font-medium mb-6">
              <Sparkles size={12} />
              Web3 原生社交平台
            </span>
          </motion.div>
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight mb-6"
          >
            在加密世界中
            <br />
            <span className="text-gradient">安全对话，智能投资</span>
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed"
          >
            NexusChat 将去中心化通讯、AI 投研机器人和自动化跟单工具融为一体。
            钱包即身份，聊天即交易，一个 App 掌控 Web3 全场景。
          </motion.p>
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={() => setLocation("/app/chat")}
              className="bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white hover:opacity-90 h-12 px-8 text-base font-semibold glow-cyan"
            >
              立即体验
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button
              variant="outline"
              className="border-border/40 text-foreground hover:bg-secondary/40 h-12 px-8 text-base bg-transparent"
            >
              了解更多
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-3 gap-4 mt-16 max-w-md mx-auto"
          >
            {[
              { value: "E2E", label: "端到端加密" },
              { value: "10s", label: "AI 投研生成" },
              { value: "$0", label: "平台托管资金" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold font-display text-gradient">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold font-display mb-3">
              Web3 用户的
              <span className="text-[#ff3366]"> 四大痛点</span>
            </h2>
            <p className="text-muted-foreground">这些问题，我们逐一解决</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {painPoints.map((point, i) => {
              const Icon = point.icon;
              return (
                <motion.div
                  key={point.title}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="p-5 rounded-2xl bg-card/50 border border-border/20 hover:border-[#ff3366]/20 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#ff3366]/10 flex items-center justify-center mb-3 group-hover:bg-[#ff3366]/15 transition-colors">
                    <Icon size={20} className="text-[#ff3366]" />
                  </div>
                  <h3 className="text-base font-semibold font-display mb-1.5">{point.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{point.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold font-display mb-3">
              四大核心功能
            </h2>
            <p className="text-muted-foreground">一个 App，掌控 Web3 全场景</p>
          </motion.div>

          <div className="space-y-8">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  {...fadeUp}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className={`rounded-2xl border ${feat.borderColor} bg-gradient-to-br ${feat.color} overflow-hidden`}
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl bg-background/40 flex items-center justify-center`}>
                        <Icon size={22} className={feat.iconColor} />
                      </div>
                      <h3 className="text-xl font-bold font-display">{feat.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-lg">
                      {feat.desc}
                    </p>
                    <div className="rounded-xl overflow-hidden border border-border/10 max-w-sm">
                      <img
                        src={feat.img}
                        alt={feat.title}
                        className="w-full h-48 object-cover opacity-80"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Design Philosophy */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold font-display mb-3">设计理念</h2>
            <p className="text-muted-foreground">我们相信的三个核心价值</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { num: "01", title: "身份自主", desc: "您的钱包就是您的身份。没有中心化注册，没有手机号绑定，没有任何人可以冻结您的账户。", icon: Shield },
              { num: "02", title: "信息平权", desc: "AI 投研让每个人都能获得专业级的市场分析，不再是少数人的特权。", icon: Sparkles },
              { num: "03", title: "极简体验", desc: "复杂的区块链技术应该隐藏在简洁的界面之下。我们追求的是让 Web3 像 Web2 一样易用。", icon: Zap },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.num}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="p-6 rounded-2xl bg-card/50 border border-border/20 relative overflow-hidden"
                >
                  <span className="absolute top-4 right-4 text-5xl font-bold font-display text-border/30">{item.num}</span>
                  <Icon size={24} className="text-[#00d4ff] mb-4" />
                  <h3 className="text-lg font-bold font-display mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <motion.div
          {...fadeUp}
          className="max-w-2xl mx-auto text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#00d4ff]/10 via-card to-[#a855f7]/10 border border-border/20"
        >
          <h2 className="text-2xl sm:text-3xl font-bold font-display mb-4">
            准备好进入 Web3 社交新时代了吗？
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            连接您的钱包，开始安全对话、智能投研、自动跟单。
            一切从一个 App 开始。
          </p>
          <Button
            onClick={() => setLocation("/app/chat")}
            className="bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white hover:opacity-90 h-12 px-10 text-base font-semibold glow-cyan"
          >
            立即体验 NexusChat
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center">
              <MessageCircle size={12} className="text-white" />
            </div>
            <span className="text-sm font-display font-semibold">NexusChat</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for Web3. Powered by decentralization.
          </p>
        </div>
      </footer>
    </div>
  );
}
