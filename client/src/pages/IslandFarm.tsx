import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Box, Coins, Hammer, Leaf, LockKeyhole, PawPrint, ShieldCheck, Sprout, Store, Timer, Wheat } from "lucide-react";
import { toast } from "sonner";
import { GameCanvas } from "@/components/island/GameCanvas";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const ART_URL = "/manus-storage/island-farm-reference_7519565a.png";
const cropChoices = [
  { key: "wheat" as const, label: "金穗小麦", icon: "🌾", tone: "#F6C95D" },
  { key: "tomato" as const, label: "珊瑚番茄", icon: "🍅", tone: "#EF7068" },
  { key: "moonberry" as const, label: "星辉浆果", icon: "🫐", tone: "#9B8CFF" },
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
    farm: { id: 0, userId: 0, name: "演示晨曦小岛", level: 1, workshopLevel: 1, itEarned: 18, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() },
    crops: {
      wheat: { label: "金穗小麦", growMinutes: 1, yield: 3, itReward: 4, color: "#f8c860" },
      tomato: { label: "珊瑚番茄", growMinutes: 2, yield: 2, itReward: 6, color: "#ef6a62" },
      moonberry: { label: "星辉浆果", growMinutes: 3, yield: 1, itReward: 10, color: "#8e7cff" },
    },
    plots: Array.from({ length: 6 }, (_, slotIndex) => ({
      id: slotIndex + 1,
      farmId: 0,
      slotIndex,
      cropKey: slotIndex === 0 ? "wheat" : slotIndex === 1 ? "tomato" : null,
      plantedAt: slotIndex === 0 ? new Date(now - 61_000).toISOString() : slotIndex === 1 ? new Date(now - 30_000).toISOString() : null,
      readyAt: slotIndex === 0 ? new Date(now - 1_000).toISOString() : slotIndex === 1 ? new Date(now + 90_000).toISOString() : null,
      createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), state: slotIndex === 0 ? "ready" : slotIndex === 1 ? "growing" : "empty", progress: slotIndex === 1 ? 0.5 : 0,
    })),
    inventory: { wheat: 8, tomato: 4, moonberry: 1 },
    pets: [
      { id: 1, farmId: 0, petKey: "fox", level: 1, affection: 12, lastCaredAt: null, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() },
      { id: 2, farmId: 0, petKey: "chick", level: 1, affection: 7, lastCaredAt: null, createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() },
    ],
    economy: { it: 216, bit: 1280, bitSettlement: "BIT 是岛屿未来市场的统一结算货币；首期市场与兑换尚未开放。", itRole: "IT 是不可交易的贡献与资格指标，由服务端验证的种植、收获、建设与照料行为获得。", boundaries: { settlementCurrency: "BIT", bitMarketEnabled: false, bitConversionEnabled: false, automaticBitRewardsEnabled: false, itTransferable: false, itRole: "contribution_and_access" } },
  };
}

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
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
      toast.success(selectedPlot.state === "ready" ? "演示：收获完成，获得 IT" : "演示：作物已种下");
      return;
    }
    if (selectedPlot.state === "empty") return plant.mutate({ slotIndex: selectedPlot.slotIndex, cropKey: selectedCrop });
    if (selectedPlot.state === "ready") return harvest.mutate({ slotIndex: selectedPlot.slotIndex });
    return toast.message("作物还在生长中", { description: selectedPlot.readyAt ? `预计 ${formatTime(new Date(selectedPlot.readyAt).getTime() - clock)} 后成熟` : undefined });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#07121d] px-4 pt-6 text-slate-200"><div className="h-8 w-36 animate-pulse rounded-full bg-white/10" /><div className="mt-5 h-[430px] animate-pulse rounded-[28px] bg-white/5" /></div>;
  }
  if (!isDemo && (error || !data)) {
    return <div className="min-h-screen bg-[#07121d] px-6 pt-20 text-center text-slate-200"><p>{error?.message ?? "岛屿暂时无法加载"}</p><Button className="mt-5" onClick={() => window.location.reload()}>重新进入岛屿</Button></div>;
  }

  return (
    <div className="min-h-screen bg-[#07121d] pb-8 text-white">
      <div className="relative isolate overflow-hidden border-b border-white/10 px-4 pb-5 pt-[calc(env(safe-area-inset-top)+14px)]">
        <img src={ART_URL} alt="岛屿农场视觉场景" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#082238]/80 via-[#07121d]/90 to-[#07121d]" />
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button onClick={() => setLocation("/app/discover")} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white active:scale-95" aria-label="返回发现页"><ArrowLeft size={20} /></button>
          <div className="text-center"><p className="text-xs font-medium tracking-[0.22em] text-cyan-200/70">BITCHAT WORLD</p><h1 className="mt-0.5 text-lg font-bold">{data.farm.name}</h1></div>
          <div className="flex h-10 items-center gap-1.5 rounded-2xl border border-[#b98aff]/30 bg-[#241c3d]/80 px-3 text-sm font-semibold text-[#ddd1ff]"><Coins size={16} /> {data.economy.bit.toLocaleString()} BIT</div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 pt-5">
        <section className="rounded-[28px] border border-cyan-200/10 bg-[#0b1b28] p-2 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
          <GameCanvas plots={displayPlots} selectedSlot={selectedSlot} onPlotSelect={setSelectedSlot} />
          <div className="flex items-center justify-between px-3 pb-2 pt-1 text-xs text-cyan-100/65"><span className="flex items-center gap-1.5"><Sprout size={14} /> 点击农田开始经营</span><span>工坊 Lv.{data.farm.workshopLevel}</span></div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-amber-200/10 bg-[#1a2631] p-4"><div className="flex items-center gap-2 text-[#f8d36c]"><Wheat size={17} /><span className="text-xs font-semibold tracking-wide">贡献 IT</span></div><p className="mt-2 text-2xl font-bold">{data.economy.it.toLocaleString()}</p><p className="mt-1 text-xs leading-5 text-slate-400">种植、收获、建设和照料宠物获得</p></div>
          <div className="rounded-3xl border border-violet-300/10 bg-[#1a2631] p-4"><div className="flex items-center gap-2 text-[#c7b5ff]"><Store size={17} /><span className="text-xs font-semibold tracking-wide">BIT 市场</span></div><p className="mt-2 text-lg font-bold">筹备中</p><p className="mt-1 text-xs leading-5 text-slate-400">未来所有岛屿资产以 BIT 统一结算</p></div>
        </section>

        <section className="mt-4 rounded-3xl border border-white/10 bg-[#101f2c] p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{selectedPlot ? `农田 ${selectedPlot.slotIndex + 1}` : "选择一块农田"}</p><p className="mt-1 text-xs text-slate-400">{selectedPlot?.state === "ready" ? "作物已成熟，可以收获" : selectedPlot?.state === "growing" && selectedPlot.readyAt ? `成长中 · ${formatTime(new Date(selectedPlot.readyAt).getTime() - clock)} 后成熟` : "空地可以种下第一批作物"}</p></div><div className="rounded-xl bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">{selectedPlot?.state === "ready" ? "可收获" : selectedPlot?.state === "growing" ? "生长中" : "待种植"}</div></div>
          <div className="mt-4 grid grid-cols-3 gap-2">{cropChoices.map((crop) => <button key={crop.key} onClick={() => setSelectedCrop(crop.key)} className={`rounded-2xl border p-2 text-left active:scale-[0.98] ${selectedCrop === crop.key ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"}`}><span className="text-lg">{crop.icon}</span><p className="mt-1 text-xs font-medium">{crop.label}</p><p className="mt-0.5 text-[10px] text-slate-400">{data.crops[crop.key].growMinutes} 分钟</p></button>)}</div>
          <Button onClick={handlePrimaryAction} disabled={!selectedPlot || plant.isPending || harvest.isPending} className="mt-4 h-12 w-full rounded-2xl bg-gradient-to-r from-[#20bcc8] to-[#6379ed] text-base font-bold text-white hover:opacity-95">{selectedPlot?.state === "ready" ? "收获作物 + IT" : selectedPlot?.state === "growing" ? "等待作物成熟" : "种植选中的作物"}</Button>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#101f2c] p-4"><div className="flex items-center gap-2"><Hammer size={18} className="text-orange-300" /><div><p className="text-sm font-bold">码头工坊 Lv.{data.farm.workshopLevel}</p><p className="text-xs text-slate-400">升级后将开放群岛订单与高级配方</p></div></div><div className="mt-4 flex items-center justify-between text-xs text-slate-300"><span>需要 {nextWorkshopCost?.wheat} 🌾 · {nextWorkshopCost?.tomato} 🍅</span><Button size="sm" onClick={() => isDemo ? setDemoState((previous) => ({ ...previous, farm: { ...previous.farm, workshopLevel: previous.farm.workshopLevel + 1 }, economy: { ...previous.economy, it: previous.economy.it + 12 } })) : upgradeWorkshop.mutate()} disabled={!isDemo && upgradeWorkshop.isPending} className="rounded-xl bg-orange-400/15 text-orange-200 hover:bg-orange-400/25">升级</Button></div></div>
          <div className="rounded-3xl border border-white/10 bg-[#101f2c] p-4"><div className="flex items-center gap-2"><Box size={18} className="text-emerald-300" /><div><p className="text-sm font-bold">作物背包</p><p className="text-xs text-slate-400">农产品将用于工坊建设与后续市场</p></div></div><div className="mt-4 flex gap-2 text-xs">{cropChoices.map((crop) => <span key={crop.key} className="rounded-xl bg-white/5 px-2.5 py-2">{crop.icon} {data.inventory[crop.key] ?? 0}</span>)}</div></div>
        </section>

        <section className="mt-4 rounded-3xl border border-white/10 bg-[#101f2c] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><PawPrint size={18} className="text-pink-300" /><div><p className="text-sm font-bold">岛屿伙伴</p><p className="text-xs text-slate-400">照料宠物获得 IT 贡献，10 分钟冷却</p></div></div><span className="text-xs text-pink-200">萌宠养成</span></div><div className="mt-4 grid grid-cols-2 gap-3">{data.pets.map((pet: any) => { const isFox = pet.petKey === "fox"; return <button key={pet.id} onClick={() => isDemo ? setDemoState((previous) => ({ ...previous, pets: previous.pets.map((item) => item.id === pet.id ? { ...item, affection: Math.min(99, item.affection + 1) } : item), economy: { ...previous.economy, it: previous.economy.it + 3 } })) : carePet.mutate({ petKey: isFox ? "fox" : "chick" })} disabled={!isDemo && carePet.isPending} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left active:scale-[0.98]"><span className="text-3xl">{isFox ? "🦊" : "🐥"}</span><span><span className="block text-sm font-semibold">{isFox ? "小狐" : "小鸡"}</span><span className="mt-0.5 block text-xs text-slate-400">亲密度 {pet.affection}/99</span></span></button>; })}</div></section>

        <section className="mt-4 rounded-3xl border border-violet-300/15 bg-gradient-to-br from-[#191d3e] to-[#101f2c] p-4"><div className="flex gap-3"><LockKeyhole className="mt-0.5 shrink-0 text-[#c5b8ff]" size={18} /><div><p className="text-sm font-bold text-[#e1dbff]">BIT 原生结算的安全边界</p><p className="mt-1 text-xs leading-5 text-slate-300">{data.economy.bitSettlement} IT 只代表真实游戏贡献和资格，不提供兑换或收益承诺。玩家市场、宠物/岛屿交易与治理功能将在独立风控和合规设计完成后开放。</p><div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#aeeeff]"><ShieldCheck size={14} /> 首期所有收获与 IT 贡献均由服务端结算</div></div></div></section>
      </main>
    </div>
  );
}
