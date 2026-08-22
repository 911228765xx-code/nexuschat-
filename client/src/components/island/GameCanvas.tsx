import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { IslandWorld, type IslandPlotVisual } from "@/game/island/IslandWorld";

type GameCanvasProps = {
  plots: IslandPlotVisual[];
  selectedSlot: number | null;
  onPlotSelect: (slotIndex: number) => void;
};

export function GameCanvas({ plots, selectedSlot, onPlotSelect }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<IslandWorld | null>(null);
  const onSelectRef = useRef(onPlotSelect);

  useEffect(() => {
    onSelectRef.current = onPlotSelect;
  }, [onPlotSelect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || worldRef.current) return;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    const world = new IslandWorld(engine, canvas, (slotIndex) => onSelectRef.current(slotIndex));
    worldRef.current = world;
    engine.runRenderLoop(() => world.scene.render());
    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.stopRenderLoop();
      world.dispose();
      engine.dispose();
      worldRef.current = null;
    };
  }, []);

  useEffect(() => {
    worldRef.current?.update(plots, selectedSlot);
  }, [plots, selectedSlot]);

  const hitboxes = [
    { slotIndex: 0, left: "20%", top: "38%" }, { slotIndex: 1, left: "37%", top: "38%" }, { slotIndex: 2, left: "54%", top: "38%" },
    { slotIndex: 3, left: "20%", top: "56%" }, { slotIndex: 4, left: "37%", top: "56%" }, { slotIndex: 5, left: "54%", top: "56%" },
  ];

  return (
    <div className="relative h-[330px] w-full sm:h-[430px]">
      <canvas
        ref={canvasRef}
        aria-label="可交互岛屿农场地图"
        className="h-full w-full touch-none rounded-[28px] outline-none"
      />
      {hitboxes.map((hitbox) => {
        const plot = plots.find((item) => item.slotIndex === hitbox.slotIndex);
        return (
          <button
            key={hitbox.slotIndex}
            type="button"
            aria-label={`选择农田 ${hitbox.slotIndex + 1}${plot?.state === "ready" ? "，作物已成熟" : plot?.state === "growing" ? "，作物生长中" : "，空地"}`}
            onClick={() => onPlotSelect(hitbox.slotIndex)}
            className={`absolute h-[17%] w-[15%] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 transition ${selectedSlot === hitbox.slotIndex ? "border-cyan-200/85 bg-cyan-200/10" : "border-transparent bg-transparent focus:border-cyan-200/85 focus:bg-cyan-200/10"}`}
            style={{ left: hitbox.left, top: hitbox.top }}
          />
        );
      })}
    </div>
  );
}
