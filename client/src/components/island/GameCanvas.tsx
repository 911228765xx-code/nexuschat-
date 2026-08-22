import type { ReactNode } from "react";
import type { IslandPlotVisual } from "@/game/island/IslandWorld";

type GameCanvasProps = {
  plots: IslandPlotVisual[];
  selectedSlot: number | null;
  onPlotSelect: (slotIndex: number) => void;
  overlay?: ReactNode;
};

// The webdev storage proxy currently returns 502 for generated image keys because
// its upstream download URL returns 403. This public CDN object is the verified
// delivery fallback for the authored scene until that platform proxy is repaired.
const ISLAND_SCENE_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663385790517/ZuzwazzrpFzTccud.png";

const plotAreas = [
  { slotIndex: 0, left: "24%", top: "49%" },
  { slotIndex: 1, left: "35%", top: "48%" },
  { slotIndex: 2, left: "46%", top: "47%" },
  { slotIndex: 3, left: "24%", top: "63%" },
  { slotIndex: 4, left: "35%", top: "62%" },
  { slotIndex: 5, left: "46%", top: "61%" },
] as const;

function getPlotVisual(plot?: IslandPlotVisual) {
  if (plot?.state === "ready") {
    return {
      symbol: "✦",
      label: "作物已成熟",
      className: "border-amber-100/90 bg-amber-300/15 shadow-[0_0_0_2px_rgba(255,219,119,.32),0_0_24px_rgba(255,206,91,.65)]",
    };
  }
  if (plot?.state === "growing") {
    return {
      symbol: "🌱",
      label: "作物生长中",
      className: "border-emerald-100/75 bg-emerald-200/10 shadow-[0_0_0_2px_rgba(131,235,167,.2)]",
    };
  }
  return {
    symbol: "+",
    label: "空闲农田",
    className: "border-transparent bg-transparent hover:border-white/75 hover:bg-white/10",
  };
}

/**
 * The production world is intentionally a 2D authored scene. Game state remains
 * server-backed; only the visual layer and touch hit mapping live in this component.
 */
export function GameCanvas({ plots, selectedSlot, onPlotSelect, overlay }: GameCanvasProps) {
  return (
    <div
      className="relative aspect-[16/10] min-h-[310px] w-full overflow-hidden rounded-[30px] border border-white/45 bg-[#159dd1] shadow-[0_18px_44px_rgba(7,36,72,.32)] sm:aspect-video sm:min-h-[430px]"
      data-testid="island-2d-world"
    >
      <img
        src={ISLAND_SCENE_URL}
        alt="斜俯视岛屿农场，包含农田、码头、商店、宠物小屋和水晶祭坛"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#083f75]/18 via-transparent to-[#06284b]/24" />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/45 bg-[#062c4d]/75 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white shadow-lg backdrop-blur-sm sm:bottom-4 sm:left-4">
        轻触农田开始经营
      </div>
      <div className="pointer-events-none absolute right-[10%] top-[24%] rounded-xl border border-violet-100/60 bg-[#4c2c8c]/55 px-2 py-1 text-[10px] font-bold tracking-wide text-violet-50 shadow-lg backdrop-blur-sm">
        BIT 水晶台
      </div>
      <div className="pointer-events-none absolute right-[18%] top-[52%] rounded-xl border border-amber-100/60 bg-[#7b401f]/65 px-2 py-1 text-[10px] font-bold tracking-wide text-amber-50 shadow-lg backdrop-blur-sm">
        岛屿商店
      </div>
      {overlay}
      {plotAreas.map((area) => {
        const plot = plots.find((item) => item.slotIndex === area.slotIndex);
        const visual = getPlotVisual(plot);
        const isActive = selectedSlot === area.slotIndex;
        return (
          <button
            key={area.slotIndex}
            type="button"
            aria-label={`选择农田 ${area.slotIndex + 1}，${visual.label}`}
            aria-pressed={isActive}
            data-testid={`farm-plot-${area.slotIndex}`}
            onClick={() => onPlotSelect(area.slotIndex)}
            className={`absolute flex h-[16%] w-[12%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[18px] border-2 text-xl font-black transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/75 ${isActive ? "scale-105 border-cyan-100 bg-cyan-100/20 shadow-[0_0_0_3px_rgba(65,239,255,.5),0_0_30px_rgba(50,214,255,.55)]" : visual.className}`}
            style={{ left: area.left, top: area.top }}
          >
            <span className={plot?.state === "empty" ? "opacity-0 transition hover:opacity-100" : "drop-shadow-[0_2px_2px_rgba(0,0,0,.45)]"}>{visual.symbol}</span>
          </button>
        );
      })}
    </div>
  );
}
