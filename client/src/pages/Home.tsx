/*
 * Home — NexusChat 产品落地页
 * Cyberpunk Noir: 深色背景 + 霓虹强调色 + 毛玻璃效果
 * 多语言支持 + 钱包连接弹窗
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { useState, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { MessageCircle, Brain, TrendingUp, Wallet, Shield, Zap, Lock, Globe, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
// Lazy-load WalletConnectModal — avoids pulling wagmi into the Home chunk
const WalletConnectModal = lazy(() => import("@/components/WalletConnectModal"));

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

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const [walletOpen, setWalletOpen] = useState(false);

  const features = [
    {
      icon: MessageCircle, titleKey: "feat.1t", descKey: "feat.1d", img: CHAT_IMG,
      color: "from-[#00d4ff]/20 to-[#00d4ff]/5", borderColor: "border-[#00d4ff]/20", iconColor: "text-[#00d4ff]",
    },
    {
      icon: Brain, titleKey: "feat.2t", descKey: "feat.2d", img: RESEARCH_IMG,
      color: "from-[#a855f7]/20 to-[#a855f7]/5", borderColor: "border-[#a855f7]/20", iconColor: "text-[#a855f7]",
    },
    {
      icon: TrendingUp, titleKey: "feat.3t", descKey: "feat.3d", img: TRADING_IMG,
      color: "from-[#00ff88]/20 to-[#00ff88]/5", borderColor: "border-[#00ff88]/20", iconColor: "text-[#00ff88]",
    },
    {
      icon: Wallet, titleKey: "feat.4t", descKey: "feat.4d", img: WALLET_IMG,
      color: "from-[#00d4ff]/15 via-[#a855f7]/10 to-[#00d4ff]/5", borderColor: "border-[#a855f7]/15", iconColor: "text-[#a855f7]",
    },
  ];

  const painPoints = [
    { icon: Globe, titleKey: "pain.1t", descKey: "pain.1d" },
    { icon: Lock, titleKey: "pain.2t", descKey: "pain.2d" },
    { icon: Brain, titleKey: "pain.3t", descKey: "pain.3d" },
    { icon: Zap, titleKey: "pain.4t", descKey: "pain.4d" },
  ];

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
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button
              onClick={() => setWalletOpen(true)}
              className="bg-[#a855f7]/15 text-[#a855f7] border border-[#a855f7]/30 hover:bg-[#a855f7]/25 text-sm h-9 px-3 hidden sm:flex"
              variant="outline"
            >
              <Wallet size={14} className="mr-1.5" />
              {t("nav.connectWallet")}
            </Button>
            <Button
              onClick={() => setLocation("/app/chat")}
              className="bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/25 text-sm h-9 px-4"
              variant="outline"
            >
              {t("nav.enterApp")}
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
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
              {t("home.badge")}
            </span>
          </motion.div>
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display leading-tight mb-6"
          >
            {t("home.title1")}
            <br />
            <span className="text-gradient">{t("home.title2")}</span>
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed"
          >
            {t("home.desc")}
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
              {t("home.cta")}
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button
              variant="outline"
              className="border-border/40 text-foreground hover:bg-secondary/40 h-12 px-8 text-base bg-transparent"
            >
              {t("home.learnMore")}
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-3 gap-4 mt-16 max-w-md mx-auto"
          >
            {[
              { value: t("home.stat1v"), label: t("home.stat1l") },
              { value: t("home.stat2v"), label: t("home.stat2l") },
              { value: t("home.stat3v"), label: t("home.stat3l") },
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
              {t("pain.subtitle")}
              <span className="text-[#ff3366]"> {t("pain.title")}</span>
            </h2>
            <p className="text-muted-foreground">{t("pain.solve")}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {painPoints.map((point, i) => {
              const Icon = point.icon;
              return (
                <motion.div
                  key={point.titleKey}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="p-5 rounded-2xl bg-card/50 border border-border/20 hover:border-[#ff3366]/20 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#ff3366]/10 flex items-center justify-center mb-3 group-hover:bg-[#ff3366]/15 transition-colors">
                    <Icon size={20} className="text-[#ff3366]" />
                  </div>
                  <h3 className="text-base font-semibold font-display mb-1.5">{t(point.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(point.descKey)}</p>
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
              {t("feat.title")}
            </h2>
            <p className="text-muted-foreground">{t("feat.subtitle")}</p>
          </motion.div>

          <div className="space-y-8">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.titleKey}
                  {...fadeUp}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className={`rounded-2xl border ${feat.borderColor} bg-gradient-to-br ${feat.color} overflow-hidden`}
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-background/40 flex items-center justify-center">
                        <Icon size={22} className={feat.iconColor} />
                      </div>
                      <h3 className="text-xl font-bold font-display">{t(feat.titleKey)}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-lg">
                      {t(feat.descKey)}
                    </p>
                    <div className="rounded-xl overflow-hidden border border-border/10 max-w-sm">
                      <img
                        src={feat.img}
                        alt={t(feat.titleKey)}
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
            <h2 className="text-2xl sm:text-3xl font-bold font-display mb-3">{t("phil.title")}</h2>
            <p className="text-muted-foreground">{t("phil.subtitle")}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { num: "01", titleKey: "phil.1t", descKey: "phil.1d", icon: Shield },
              { num: "02", titleKey: "phil.2t", descKey: "phil.2d", icon: Sparkles },
              { num: "03", titleKey: "phil.3t", descKey: "phil.3d", icon: Zap },
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
                  <h3 className="text-lg font-bold font-display mb-2">{t(item.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
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
            {t("cta.title")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            {t("cta.desc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => setLocation("/app/chat")}
              className="bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white hover:opacity-90 h-12 px-10 text-base font-semibold glow-cyan"
            >
              {t("cta.button")}
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button
              onClick={() => setWalletOpen(true)}
              variant="outline"
              className="border-[#a855f7]/30 text-[#a855f7] hover:bg-[#a855f7]/10 h-12 px-8 text-base bg-transparent"
            >
              <Wallet size={18} className="mr-2" />
              {t("nav.connectWallet")}
            </Button>
          </div>
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
            {t("footer.text")}
          </p>
        </div>
      </footer>

      {/* Wallet Connect Modal — lazy loaded, only renders when walletOpen */}
      {walletOpen && (
        <Suspense fallback={null}>
          <WalletConnectModal open={walletOpen} onClose={() => setWalletOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
