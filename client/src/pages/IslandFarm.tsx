import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Backpack, Box, Coins, Hammer, Leaf, LockKeyhole, Map, PawPrint, Settings, ShieldCheck, Sparkles, Sprout, Store, Timer, Wheat } from "lucide-react";
import { toast } from "sonner";
import { GameCanvas } from "@/components/island/GameCanvas";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const cropChoices = [
  { key: "wheat" as const, label: "金穗小麦", icon: "🌾", tone: "#E6A93A" },
  { key: "tomato" as const, label: "珊瑚番茄", icon: "🍅", tone: "#DB694B" },
  { key: "moonberry" as const, label: "星辉浆果", icon: "🫐", tone: "#7865CF" },
];

type FarmPlotUi = {
  slotIndex: number;
  cropKey: string | null;
  plantedAt: string | null;
  readyAt: string | null;
  state?: "empty" | "growing" | "ready";
  progress?: number;
};

function createDemoFarmState() {
  const now = Date.now();
  return {
    farm: { id: 0, userId: 0, name: "晨曦小岛", level: 12, workshopLevel: 1, itEarned: 18, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() },
    crops: {
      wheat: { label: "金穗小麦", growMinutes: 1, yield: 3, itReward: 4, color: "#e6a93a" },
      tomato: { label: "珊瑚番茄", growMinutes: 2, yield: 2, itReward: 6, color: "#db694b" },
      moonberry: { label: "星辉浆果", growMinutes: 3, yield: 1, itReward: 10, color: "#7865cf" },
    },
    plots: Array.from({ length: 6 }, (_, slotIndex) => ({
      id: slotIndex + 1,
      farmId: 0,
      slotIndex,
      cropKey: slotIndex === 0 ? "wheat" : slotIndex === 1 ? "tomato" : null,
      plantedAt: slotIndex === 0 ? new Date(now - 61_000).toISOString() : slotIndex === 1 ? new Date(now - 30_000).toISOString() : null,
      readyAt: slotIndex === 0 ? new Date(now - 1_000).toISOString() : slotIndex === 1 ? new Date(now + 90_000).toISOString() : null,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      state: slotIndex === 0 ? "ready" : slotIndex === 1 ? "growing" : "empty",
      progress: slotIndex === 1 ? 0.5 : 0,
    })),
    inventory: { wheat: 8, tomato: 4, moonberry: 1, seed_wheat: 12, seed_tomato: 8, seed_moonberry: 4, sunrise_crate: 1 },
    pets: [
      { id: 1, farmId: 0, petKey: "fox", level: 1, affection: 12, explorationCount: 2, lastCaredAt: null, lastExploredAt: null, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() },
      { id: 2, farmId: 0, petKey: "chick", level: 1, affection: 7, explorationCount: 1, lastCaredAt: null, lastExploredAt: null, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() },
    ],
    orders: [
      { orderKey: "wheat_parcel", label: "码头粮食订单", cropKey: "wheat", requiredQuantity: 6, itReward: 16, seedRewardKey: "seed_tomato", seedRewardQuantity: 2, status: "available" },
      { orderKey: "tomato_basket", label: "商店鲜果订单", cropKey: "tomato", requiredQuantity: 4, itReward: 24, seedRewardKey: "seed_moonberry", seedRewardQuantity: 1, status: "available" },
      { orderKey: "moonberry_lantern", label: "港湾浆果订单", cropKey: "moonberry", requiredQuantity: 2, itReward: 20, seedRewardKey: "seed_wheat", seedRewardQuantity: 2, status: "available" },
    ],
    recipes: {
      sunrise_crate: { label: "晨曦补给箱", inputs: { wheat: 3, tomato: 2 }, outputKey: "sunrise_crate", outputQuantity: 1, itReward: 8, requiredWorkshopLevel: 1 },
      moonlit_seedling: { label: "月辉苗箱", inputs: { moonberry: 2, wheat: 2 }, outputKey: "seed_moonberry", outputQuantity: 3, itReward: 10, requiredWorkshopLevel: 2 },
    },
    economy: {
      it: 216,
      bit: 1280,
      bitSettlement: "BIT 是岛屿未来市场的统一结算货币；首期市场与兑换尚未开放。",
      itRole: "IT 是不可交易的贡献与资格指标，由服务端验证的种植、收获、建设与照料行为获得。",
      boundaries: { settlementCurrency: "BIT", bitMarketEnabled: false, bitConversionEnabled: false, automaticBitRewardsEnabled: false, itTransferable: false, itRole: "contribution_and_access" },
    },
  };
}

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function HudIcon({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#e8c87d] bg-gradient-to-b from-[#fff7d3] to-[#e5ba62] text-[#70421f] shadow-[0_3px_0_#9a642d,0_7px_14px_rgba(0,0,0,.22)] transition active:translate-y-0.5 active:shadow-[0_1px_0_#9a642d] sm:h-11 sm:w-11">
      {children}
    </button>
  );
}

export default function IslandFarm() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const isDemo = import.meta.env.DEV && new URLSearchParams(window.location.search).get("demo") === "1";
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<(typeof cropChoices)[number]["key"]>("wheat");
  const [clock, setClock] = useState(Date.now());
  const [demoState, setDemoState] = useState(createDemoFarmState);
  const { data: liveData, isLoading, error } = trpc.islandFarm.getState.useQuery(undefined, { refetchInterval: 30_000, enabled: !isDemo });
  const data = (isDemo ? demoState : liveData) as any;

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const updateState = (next: NonNullable<typeof data>) => {
    utils.islandFarm.getState.setData(undefined, next);
  };
  const plant = trpc.islandFarm.plant.useMutation({ onSuccess: updateState, onError: (e) => toast.error(e.message) });
  const harvest = trpc.islandFarm.harvest.useMutation({ onSuccess: updateState, onError: (e) => toast.error(e.message) });
  const upgradeWorkshop = trpc.islandFarm.upgradeWorkshop.useMutation({ onSuccess: updateState, onError: (e) => toast.error(e.message) });
  const carePet = trpc.islandFarm.carePet.useMutation({ onSuccess: updateState, onError: (e) => toast.error(e.message) });
  const exploreWithPet = trpc.islandFarm.exploreWithPet.useMutation({ onSuccess: updateState, onError: (e) => toast.error(e.message) });
  const claimDailyOrder = trpc.islandFarm.claimDailyOrder.useMutation({ onSuccess: updateState, onError: (e) => toast.error(e.message) });
  const craftWorkshop = trpc.islandFarm.craftWorkshop.useMutation({ onSuccess: updateState, onError: (e) => toast.error(e.message) });
  const { data: liveGroupProgress } = trpc.islandFarm.getGroupIslandProgress.useQuery(undefined, { enabled: !isDemo });
  const contributeToGroup = trpc.islandFarm.contributeToGroupIsland.useMutation({ onSuccess: (next) => { updateState(next); void utils.islandFarm.getGroupIslandProgress.invalidate(); }, onError: (e) => toast.error(e.message) });

  const displayPlots = useMemo(() => (data?.plots ?? []).map((plot: FarmPlotUi) => {
    const readyAt = plot.readyAt ? new Date(plot.readyAt).getTime() : 0;
    const plantedAt = plot.plantedAt ? new Date(plot.plantedAt).getTime() : 0;
    const state = !plot.cropKey ? "empty" as const : readyAt <= clock ? "ready" as const : "growing" as const;
    const progress = !plot.cropKey || !readyAt || !plantedAt ? 0 : Math.min(1, Math.max(0, (clock - plantedAt) / (readyAt - plantedAt)));
    return { ...plot, state, progress };
  }), [clock, data?.plots]);
  const selectedPlot = displayPlots.find((plot: FarmPlotUi) => plot.slotIndex === selectedSlot) ?? null;
  const nextWorkshopCost = data ? { wheat: (data.farm.workshopLevel + 1) * 4, tomato: (data.farm.workshopLevel + 1) * 2 } : null;

  const handlePrimaryAction = () => {
    if (!selectedPlot) return toast.message("先点击岛上的一块农田");
    if (isDemo) {
      setDemoState((previous) => {
        const plots = previous.plots.map((plot) => {
          if (plot.slotIndex !== selectedPlot.slotIndex) return plot;
          if (!plot.cropKey) return { ...plot, cropKey: selectedCrop, plantedAt: new Date().toISOString(), readyAt: new Date(Date.now() + 60_000).toISOString() };
          if (new Date(plot.readyAt ?? 0).getTime() <= Date.now()) return { ...plot, cropKey: null, plantedAt: null, readyAt: null };
          return plot;
        });
        const harvested = selectedPlot.state === "ready";
        const harvestedCrop = (selectedPlot.cropKey ?? "wheat") as keyof typeof previous.inventory;
        return { ...previous, plots, inventory: harvested ? { ...previous.inventory, [harvestedCrop]: (previous.inventory[harvestedCrop] ?? 0) + 3 } : previous.inventory, economy: harvested ? { ...previous.economy, it: previous.economy.it + 4 } : previous.economy };
      });
      toast.success(selectedPlot.state === "ready" ? "收获完成，获得 IT 贡献" : "作物已经种下");
      return;
    }
    if (selectedPlot.state === "empty") return plant.mutate({ slotIndex: selectedPlot.slotIndex, cropKey: selectedCrop });
    if (selectedPlot.state === "ready") return harvest.mutate({ slotIndex: selectedPlot.slotIndex });
    return toast.message("作物还在生长中", { description: selectedPlot.readyAt ? `预计 ${formatTime(new Date(selectedPlot.readyAt).getTime() - clock)} 后成熟` : undefined });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#0b4773] px-4 pt-6 text-amber-50"><div className="h-10 w-40 animate-pulse rounded-2xl bg-white/25" /><div className="mt-5 aspect-[16/10] animate-pulse rounded-[30px] bg-white/20" /></div>;
  }
  if (!isDemo && (error || !data)) {
    return <div className="min-h-screen bg-[#0b4773] px-6 pt-20 text-center text-amber-50"><p>{error?.message ?? "岛屿暂时无法加载"}</p><Button className="mt-5 bg-[#e6a93a] text-[#53321b]" onClick={() => window.location.reload()}>重新进入岛屿</Button></div>;
  }

  const plotStatus = selectedPlot?.state === "ready" ? "可以收获啦" : selectedPlot?.state === "growing" && selectedPlot.readyAt ? `${formatTime(new Date(selectedPlot.readyAt).getTime() - clock)} 后成熟` : "点击一块农田开始经营";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#2b9fd1_0%,#0a4a78_54%,#063554_100%)] pb-28 text-[#3f2a18]">
      <main className="mx-auto max-w-6xl px-3 pt-[calc(env(safe-area-inset-top)+10px)] sm:px-5 sm:pt-5">
        <section className="mx-auto max-w-5xl">
          <GameCanvas plots={displayPlots} selectedSlot={selectedSlot} onPlotSelect={setSelectedSlot} overlay={
            <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
              <div className="flex items-center gap-2">
                <HudIcon label="返回发现页" onClick={() => setLocation("/app/discover")}><ArrowLeft size={18} /></HudIcon>
                <div className="flex items-center gap-2 rounded-2xl border-2 border-[#e5c373] bg-[#1f8555]/90 py-1.5 pl-1.5 pr-3 text-white shadow-[0_3px_0_#23653a,0_7px_14px_rgba(0,0,0,.24)] sm:pr-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/70 bg-[radial-gradient(circle_at_35%_28%,#fff3ce,#d87b45_45%,#873b31)] text-xs font-black sm:h-10 sm:w-10">岛</span>
                  <span className="min-w-0"><span className="block text-[10px] font-bold text-[#f8df92]">Lv.{data.farm.level}</span><span className="block max-w-[70px] truncate text-xs font-black sm:max-w-[120px] sm:text-sm">{data.farm.name}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="hidden items-center gap-1.5 rounded-xl border-2 border-[#d5b660] bg-[#654326]/95 px-2.5 py-2 text-xs font-black text-[#fff2bd] shadow-[0_3px_0_#402617] sm:flex"><Coins size={15} className="text-[#ffd04d]" /> {data.economy.bit.toLocaleString()} BIT</div>
                <div className="hidden items-center gap-1.5 rounded-xl border-2 border-[#a5d483] bg-[#497c3a]/95 px-2.5 py-2 text-xs font-black text-white shadow-[0_3px_0_#31582c] sm:flex"><Leaf size={15} className="text-[#e7ff9d]" /> {data.economy.it.toLocaleString()} IT</div>
                <HudIcon label="打开背包" onClick={() => toast.message("背包已在岛屿下方展开") }><Backpack size={18} /></HudIcon>
                <HudIcon label="查看岛屿地图" onClick={() => toast.message("你正在晨曦小岛") }><Map size={18} /></HudIcon>
                <HudIcon label="岛屿设置" onClick={() => toast.message("岛屿设置将在后续版本开放") }><Settings size={18} /></HudIcon>
              </div>
            </div>
          } />
          <div className="-mt-1 flex items-center justify-between rounded-b-3xl border-x border-b border-[#e4c573]/45 bg-[#0c5a87]/85 px-3 py-2 text-xs font-bold text-[#e8f8ff] shadow-lg backdrop-blur-sm sm:px-5">
            <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-[#ffe37a]" /> 晨曦小岛 · 农田经营中</span>
            <span className="flex items-center gap-1.5"><Coins size={14} className="text-[#ffd04d] sm:hidden" /><span className="sm:hidden">{data.economy.bit.toLocaleString()} BIT</span><Leaf size={14} className="text-[#e7ff9d]" /> {data.economy.it.toLocaleString()} IT</span>
          </div>
        </section>

        <section className="mx-auto mt-4 grid max-w-5xl gap-3 lg:grid-cols-[1.55fr_.9fr]">
          <div className="rounded-[28px] border-2 border-[#d7b86c] bg-[linear-gradient(135deg,#fff6d4,#f2d79a)] p-4 shadow-[0_5px_0_#8e5b30,0_17px_30px_rgba(3,32,50,.22)]">
            <div className="flex items-start justify-between gap-3">
              <div><p className="flex items-center gap-2 text-base font-black text-[#70421f]"><Sprout size={20} className="text-[#4e8a37]" /> {selectedPlot ? `第 ${selectedPlot.slotIndex + 1} 块农田` : "农田管理"}</p><p className="mt-1 text-xs font-semibold text-[#8b6840]">{plotStatus}</p></div>
              <span className="rounded-full bg-[#8cb456] px-3 py-1.5 text-xs font-black text-white shadow-[0_2px_0_#557e32]">{selectedPlot?.state === "ready" ? "可收获" : selectedPlot?.state === "growing" ? "生长中" : "待种植"}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2.5">{cropChoices.map((crop) => <button key={crop.key} onClick={() => setSelectedCrop(crop.key)} className={`rounded-2xl border-2 p-2.5 text-left transition active:translate-y-0.5 ${selectedCrop === crop.key ? "border-[#a56a35] bg-[#fff9e6] shadow-[0_3px_0_#b77d44]" : "border-[#dfc17b] bg-[#f7e9b5] hover:bg-[#fff6d4]"}`}><span className="text-2xl">{crop.icon}</span><p className="mt-1 text-xs font-black text-[#674221]">{crop.label}</p><p className="mt-0.5 text-[10px] font-bold text-[#9c7145]">种子 {data.inventory[`seed_${crop.key}`] ?? 0} · +{data.crops[crop.key].itReward} IT</p></button>)}</div>
            <Button onClick={handlePrimaryAction} disabled={!selectedPlot || plant.isPending || harvest.isPending} className="mt-4 h-12 w-full rounded-2xl border-2 border-[#e5c16d] bg-[linear-gradient(180deg,#9fd451,#619b34)] text-base font-black text-white shadow-[0_4px_0_#3d6d29] hover:brightness-105 active:translate-y-0.5 active:shadow-[0_2px_0_#3d6d29]">{selectedPlot?.state === "ready" ? "收获作物 · 领取 IT" : selectedPlot?.state === "growing" ? "等待作物成熟" : "种植选中的作物"}</Button>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[26px] border-2 border-[#a77642] bg-[linear-gradient(145deg,#8d5b32,#5f3924)] p-4 text-[#fff0c1] shadow-[0_5px_0_#3e2419,0_16px_28px_rgba(3,24,35,.24)]"><div className="flex items-center gap-2"><Hammer size={20} className="text-[#ffdb75]" /><div><p className="text-sm font-black">码头工坊 Lv.{data.farm.workshopLevel}</p><p className="text-[11px] font-semibold text-[#f1d39c]">解锁群岛订单与高级配方</p></div></div><div className="mt-4 flex items-center justify-between gap-2 text-xs font-bold"><span>需 {nextWorkshopCost?.wheat} 🌾 · {nextWorkshopCost?.tomato} 🍅</span><Button size="sm" onClick={() => isDemo ? setDemoState((previous) => ({ ...previous, farm: { ...previous.farm, workshopLevel: previous.farm.workshopLevel + 1 }, economy: { ...previous.economy, it: previous.economy.it + 12 } })) : upgradeWorkshop.mutate()} disabled={!isDemo && upgradeWorkshop.isPending} className="rounded-xl border border-[#ffe5a2] bg-[#eaa548] text-[#63381f] hover:bg-[#f5bd64]">升级</Button></div></div>
            <div className="rounded-[26px] border-2 border-[#a9cd89] bg-[linear-gradient(145deg,#e8f3c7,#c0d99d)] p-4 text-[#4d592f] shadow-[0_5px_0_#76965a,0_16px_28px_rgba(3,24,35,.18)]"><div className="flex items-center gap-2"><Box size={20} className="text-[#668344]" /><div><p className="text-sm font-black">作物背包</p><p className="text-[11px] font-semibold text-[#718258]">生产素材可用于建设和订单</p></div></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-black">{cropChoices.map((crop) => <span key={crop.key} className="rounded-xl border border-[#a5c381] bg-[#f5f8db] px-2.5 py-2">{crop.icon} {data.inventory[crop.key] ?? 0}</span>)}</div></div>
          </div>
        </section>

        <section className="mx-auto mt-4 grid max-w-5xl gap-3 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[28px] border-2 border-[#6ca9be] bg-[linear-gradient(135deg,#dff5fc,#a8d8e7)] p-4 shadow-[0_5px_0_#4b8aa0,0_16px_26px_rgba(3,24,35,.18)]"><div className="flex items-center justify-between"><div><p className="text-sm font-black text-[#25566b]">今日码头订单</p><p className="text-[11px] font-semibold text-[#457789]">交付作物，补充下一轮经营种子</p></div><Store size={20} className="text-[#2f7894]" /></div>          <div className="mt-3 grid gap-2 sm:grid-cols-3">{(data.orders ?? []).map((order: any) => <div key={order.orderKey} className="rounded-2xl border border-[#8fc0d0] bg-white/85 p-3"><p className="text-xs font-black text-[#315f72]">{order.label}</p><p className="mt-1 text-[11px] font-bold text-[#648596]">交付 {order.requiredQuantity} {data.crops[order.cropKey]?.label ?? order.cropKey}</p><p className="mt-1 text-[10px] font-black text-[#4d8d65]">＋{order.itReward} IT · {order.seedRewardQuantity} 枚种子</p><Button size="sm" disabled={order.status === "claimed" || (!isDemo && claimDailyOrder.isPending)} onClick={() => isDemo ? toast.success("订单已登记，演示模式不扣除库存") : claimDailyOrder.mutate({ orderKey: order.orderKey })} className="mt-2 h-8 rounded-xl bg-[#4a8a67] text-xs text-white hover:bg-[#5ca378]">{order.status === "claimed" ? "今日已完成" : "交付订单"}</Button></div>)}</div></div>
          <div className="grid gap-3">{Object.entries(data.recipes ?? { sunrise_crate: { label: "晨曦补给箱", inputs: { wheat: 3, tomato: 2 }, outputKey: "sunrise_crate", outputQuantity: 1, itReward: 8, requiredWorkshopLevel: 1 } }).map(([recipeKey, recipe]: any) => {
            const locked = data.farm.workshopLevel < (recipe.requiredWorkshopLevel ?? 1);
            return <div key={recipeKey} className="rounded-[28px] border-2 border-[#a77642] bg-[linear-gradient(145deg,#8d5b32,#5f3924)] p-4 text-[#fff0c1] shadow-[0_5px_0_#3e2419,0_16px_28px_rgba(3,24,35,.24)]"><div className="flex items-center gap-2"><Hammer size={20} className="text-[#ffdb75]" /><div><p className="text-sm font-black">{recipe.label}{locked ? ` · Lv.${recipe.requiredWorkshopLevel}` : ""}</p><p className="text-[11px] font-semibold text-[#f1d39c]">{Object.entries(recipe.inputs ?? {}).map(([k, v]) => `${v} ${k}`).join(" + ")} · ＋{recipe.itReward} IT</p></div></div><Button onClick={() => isDemo ? toast.success(`制作${recipe.label}`) : craftWorkshop.mutate({ recipeKey })} disabled={locked || (!isDemo && craftWorkshop.isPending)} className="mt-4 h-10 w-full rounded-xl border border-[#ffe5a2] bg-[#4d8a50] text-sm font-black text-[#fff9de] hover:bg-[#609f60]">{locked ? "升级工坊后解锁" : `制作${recipe.label} · +${recipe.itReward} IT`}</Button></div>;
          })}</div>
        </section>

        <section className="mx-auto mt-4 grid max-w-5xl gap-3 md:grid-cols-[1.05fr_.95fr]">
          <div className="rounded-[28px] border-2 border-[#d5a775] bg-[linear-gradient(135deg,#f9e6bd,#e9bc77)] p-4 shadow-[0_5px_0_#a77243,0_16px_26px_rgba(3,24,35,.18)]"><div className="flex items-center justify-between"><div><p className="text-sm font-black text-[#734624]">伙伴探索</p><p className="text-[11px] font-semibold text-[#986541]">亲密度达到 2 后可带回专长种子与 IT</p></div><PawPrint size={20} className="text-[#b66049]" /></div><div className="mt-3 grid grid-cols-2 gap-2">{data.pets.map((pet: any) => <div key={pet.petKey} className="rounded-2xl border border-[#e1af72] bg-[#fff4d3] p-2.5"><p className="text-xs font-black text-[#71431f]">{pet.petKey === "fox" ? "🦊 小狐" : "🐥 小鸡"}</p><p className="mt-1 text-[10px] font-semibold text-[#9d6d43]">亲密 {pet.affection} · 专长 {pet.specialty?.specialty ?? (pet.petKey === "fox" ? "番茄种" : "小麦种")}</p><Button size="sm" disabled={!isDemo && (exploreWithPet.isPending || pet.exploreReady === false)} onClick={() => isDemo ? toast.success("伙伴带回了补给种子") : exploreWithPet.mutate({ petKey: pet.petKey })} className="mt-2 h-8 w-full rounded-xl bg-[#bd7043] text-xs text-white hover:bg-[#d18250]">{pet.exploreReady === false ? "探索冷却中" : "派去探索"}</Button></div>)}</div></div>
          <div className="rounded-[28px] border-2 border-[#7eb9c8] bg-[linear-gradient(135deg,#e8fbff,#b9e4ec)] p-4 shadow-[0_5px_0_#508b9b,0_16px_26px_rgba(3,24,35,.18)]"><div className="flex items-center justify-between"><div><p className="text-sm font-black text-[#235b6d]">群岛协作</p><p className="text-[11px] font-semibold text-[#4d7d8d]">群成员每天可贡献 1 个补给箱</p></div><Map size={20} className="text-[#2c7790]" /></div><div className="mt-3 space-y-2">{(isDemo ? [] : liveGroupProgress?.groups ?? []).map((group: any) => <div key={group.id} className="rounded-2xl border border-[#9bcbd5] bg-white/85 p-2.5"><p className="text-xs font-black text-[#315f72]">{group.visual?.icon ?? "⛵"} {group.name}</p><p className="mt-1 text-[10px] font-semibold text-[#648596]">{group.visual?.label ?? "共建中"} {group.visual?.percent ?? Math.min(100, Math.round(group.totalContribution / group.dailyGoal * 100))}% · {group.participantCount} 位岛主</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#d7eef3]"><div className="h-full rounded-full bg-[#398090]" style={{ width: `${group.visual?.percent ?? Math.min(100, Math.round(group.totalContribution / group.dailyGoal * 100))}%` }} /></div><Button size="sm" disabled={group.myContribution > 0 || contributeToGroup.isPending} onClick={() => contributeToGroup.mutate({ groupId: group.id })} className="mt-2 h-8 rounded-xl bg-[#398090] text-xs text-white hover:bg-[#4d98a8]">{group.myContribution > 0 ? "已贡献" : "贡献 1 个补给箱"}</Button></div>)}{(isDemo || !liveGroupProgress?.groups.length) && <p className="rounded-2xl bg-white/70 p-3 text-center text-[11px] font-semibold text-[#5d8190]">加入聊天群后，在这里与伙伴共建群岛。</p>}</div><p className="mt-3 text-[10px] font-bold text-[#4d7d8d]">仅记录游戏内 IT 贡献；不产生 BIT、兑换或市场交易。</p></div>
        </section>

        <section className="mx-auto mt-4 grid max-w-5xl gap-3 md:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[28px] border-2 border-[#d6b55e] bg-[linear-gradient(135deg,#fdf0be,#f2c76d)] p-4 shadow-[0_5px_0_#966339,0_16px_26px_rgba(3,24,35,.2)]"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><PawPrint size={20} className="text-[#b66049]" /><div><p className="text-sm font-black text-[#6f4027]">岛屿伙伴</p><p className="text-[11px] font-semibold text-[#9b6742]">照料宠物，获得 IT 贡献</p></div></div><span className="rounded-full bg-[#d98d58] px-2.5 py-1 text-[10px] font-black text-white">萌宠养成</span></div><div className="mt-3 grid grid-cols-2 gap-2.5">{data.pets.map((pet: any) => { const isFox = pet.petKey === "fox"; return <button key={pet.id} onClick={() => isDemo ? setDemoState((previous) => ({ ...previous, pets: previous.pets.map((item) => item.id === pet.id ? { ...item, affection: Math.min(99, item.affection + 1) } : item), economy: { ...previous.economy, it: previous.economy.it + 3 } })) : carePet.mutate({ petKey: isFox ? "fox" : "chick" })} disabled={!isDemo && carePet.isPending} className="flex items-center gap-2 rounded-2xl border-2 border-[#ddad65] bg-[#fff4d0] p-2.5 text-left text-[#70421f] transition active:translate-y-0.5"><span className="text-3xl">{isFox ? "🦊" : "🐥"}</span><span><span className="block text-xs font-black">{isFox ? "小狐" : "小鸡"}</span><span className="block text-[10px] font-semibold text-[#9b6b43]">亲密度 {pet.affection}/99 · +3 IT</span></span></button>; })}</div></div>
          <div className="rounded-[28px] border-2 border-[#a58bdf] bg-[linear-gradient(135deg,#3f2d7f,#1f245d)] p-4 text-[#f3edff] shadow-[0_5px_0_#1c1b52,0_16px_26px_rgba(3,24,35,.24)]"><div className="flex gap-2.5"><LockKeyhole className="mt-0.5 shrink-0 text-[#cbb9ff]" size={20} /><div><p className="text-sm font-black">BIT 岛屿经济</p><p className="mt-1 text-[11px] leading-5 text-[#ded4ff]">BIT 将作为岛屿资产与未来玩家市场的统一结算货币。IT 是真实游戏贡献和资格，不提供兑换或收益承诺。</p><div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[#bdf5ff]"><ShieldCheck size={14} /> 所有收获与 IT 贡献由服务端结算</div></div></div></div>
        </section>
      </main>
    </div>
  );
}
