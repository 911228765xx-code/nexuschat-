import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import { Scene } from "@babylonjs/core/scene";

export type IslandPlotVisual = {
  slotIndex: number;
  cropKey: string | null;
  state: "empty" | "growing" | "ready";
  progress: number;
};

type PlotNode = {
  soil: Mesh;
  crop: Mesh;
  highlight: Mesh;
  soilMaterial: StandardMaterial;
  cropMaterial: StandardMaterial;
  highlightMaterial: StandardMaterial;
};

const CROP_COLORS: Record<string, Color3> = {
  wheat: Color3.FromHexString("#F5C75D"),
  tomato: Color3.FromHexString("#EF7068"),
  moonberry: Color3.FromHexString("#9B8CFF"),
};

export class IslandWorld {
  readonly scene: Scene;
  private readonly plotNodes = new Map<number, PlotNode>();
  private selectedSlot: number | null = null;

  constructor(engine: Engine, canvas: HTMLCanvasElement, onPlotSelect: (slotIndex: number) => void) {
    this.scene = new Scene(engine);
    this.scene.clearColor = new Color4(0.055, 0.11, 0.16, 1);

    const camera = new ArcRotateCamera("island-camera", -Math.PI / 2, 1.05, 12, new Vector3(0, 0, 0), this.scene);
    camera.lowerRadiusLimit = 9;
    camera.upperRadiusLimit = 14;
    camera.lowerBetaLimit = 0.75;
    camera.upperBetaLimit = 1.25;
    camera.wheelPrecision = 60;
    camera.panningSensibility = 0;
    camera.attachControl(canvas, true);

    const light = new HemisphericLight("island-light", new Vector3(0.4, 1, -0.2), this.scene);
    light.intensity = 1.15;
    light.groundColor = Color3.FromHexString("#1E5060");

    this.createEnvironment();
    this.createPlots();

    this.scene.onPointerObservable.add((info) => {
      if (info.type !== PointerEventTypes.POINTERPICK || !info.pickInfo?.hit) return;
      const slotIndex = Number(info.pickInfo.pickedMesh?.metadata?.islandPlotSlot);
      if (!Number.isInteger(slotIndex)) return;
      onPlotSelect(slotIndex);
    });
  }

  update(plots: IslandPlotVisual[], selectedSlot: number | null) {
    this.selectedSlot = selectedSlot;
    for (const plot of plots) {
      const node = this.plotNodes.get(plot.slotIndex);
      if (!node) continue;
      const cropColor = CROP_COLORS[plot.cropKey ?? ""] ?? Color3.FromHexString("#8BBE56");
      node.soilMaterial.diffuseColor = plot.state === "empty" ? Color3.FromHexString("#B86E3F") : Color3.FromHexString("#93522F");
      node.crop.isVisible = plot.state !== "empty";
      node.cropMaterial.diffuseColor = cropColor;
      node.cropMaterial.emissiveColor = plot.state === "ready" ? cropColor.scale(0.25) : Color3.Black();
      const size = plot.state === "ready" ? 0.72 : 0.35 + Math.max(0.12, plot.progress) * 0.32;
      node.crop.scaling.set(size, size, size);
      const isSelected = this.selectedSlot === plot.slotIndex;
      node.highlight.isVisible = isSelected || plot.state === "ready";
      node.highlightMaterial.emissiveColor = isSelected
        ? Color3.FromHexString("#37E2FF")
        : Color3.FromHexString("#F8D66D");
      node.highlightMaterial.alpha = isSelected ? 0.72 : 0.38;
    }
  }

  dispose() {
    this.scene.dispose();
  }

  private createEnvironment() {
    const water = MeshBuilder.CreateGround("water", { width: 18, height: 14, subdivisions: 1 }, this.scene);
    water.position.y = -0.48;
    const waterMaterial = new StandardMaterial("water-material", this.scene);
    waterMaterial.diffuseColor = Color3.FromHexString("#1C8FB3");
    waterMaterial.emissiveColor = Color3.FromHexString("#0C536D").scale(0.24);
    water.material = waterMaterial;

    const island = MeshBuilder.CreateCylinder("island", { diameter: 10.6, height: 0.5, tessellation: 12 }, this.scene);
    island.position.y = -0.22;
    island.scaling.z = 0.72;
    const islandMaterial = new StandardMaterial("island-material", this.scene);
    islandMaterial.diffuseColor = Color3.FromHexString("#6CAA55");
    island.material = islandMaterial;

    const path = MeshBuilder.CreateGround("path", { width: 2.1, height: 7 }, this.scene);
    path.position = new Vector3(-0.15, 0.04, 0.4);
    const pathMaterial = new StandardMaterial("path-material", this.scene);
    pathMaterial.diffuseColor = Color3.FromHexString("#F2C982");
    path.material = pathMaterial;

    this.createHouse("farm-house", new Vector3(-0.6, 0.32, -2.5), Color3.FromHexString("#F4D3A0"), Color3.FromHexString("#CE6D59"));
    this.createHouse("market", new Vector3(3.15, 0.32, 0.9), Color3.FromHexString("#F0C477"), Color3.FromHexString("#3EAAB2"));
    this.createHouse("pet-cottage", new Vector3(1.45, 0.32, 3.0), Color3.FromHexString("#D9B784"), Color3.FromHexString("#9A70DD"));
    this.createWorkshop();
    this.createTrees();
  }

  private createHouse(name: string, position: Vector3, baseColor: Color3, roofColor: Color3) {
    const body = MeshBuilder.CreateBox(`${name}-body`, { width: 1.25, height: 0.9, depth: 1.05 }, this.scene);
    body.position = position;
    const bodyMaterial = new StandardMaterial(`${name}-body-material`, this.scene);
    bodyMaterial.diffuseColor = baseColor;
    body.material = bodyMaterial;

    const roof = MeshBuilder.CreateCylinder(`${name}-roof`, { diameterTop: 0, diameterBottom: 1.75, height: 0.72, tessellation: 4 }, this.scene);
    roof.position = position.add(new Vector3(0, 0.78, 0));
    roof.rotation.y = Math.PI / 4;
    const roofMaterial = new StandardMaterial(`${name}-roof-material`, this.scene);
    roofMaterial.diffuseColor = roofColor;
    roof.material = roofMaterial;
  }

  private createWorkshop() {
    const deck = MeshBuilder.CreateBox("workshop-deck", { width: 2.15, height: 0.25, depth: 1.35 }, this.scene);
    deck.position = new Vector3(-3.25, 0.04, 2.65);
    const deckMaterial = new StandardMaterial("workshop-deck-material", this.scene);
    deckMaterial.diffuseColor = Color3.FromHexString("#B77C4A");
    deck.material = deckMaterial;
    const beacon = MeshBuilder.CreateCylinder("workshop-beacon", { diameter: 0.5, height: 1.25, tessellation: 6 }, this.scene);
    beacon.position = new Vector3(-3.25, 0.75, 2.65);
    const beaconMaterial = new StandardMaterial("workshop-beacon-material", this.scene);
    beaconMaterial.diffuseColor = Color3.FromHexString("#57DCEB");
    beaconMaterial.emissiveColor = Color3.FromHexString("#2CA7CE").scale(0.45);
    beacon.material = beaconMaterial;
  }

  private createTrees() {
    const treePositions = [new Vector3(-4.05, 0.68, -1.8), new Vector3(3.9, 0.68, -2.45), new Vector3(3.6, 0.68, 3.35)];
    treePositions.forEach((position, index) => {
      const trunk = MeshBuilder.CreateCylinder(`tree-trunk-${index}`, { diameter: 0.24, height: 1.1, tessellation: 6 }, this.scene);
      trunk.position = position;
      const trunkMaterial = new StandardMaterial(`tree-trunk-material-${index}`, this.scene);
      trunkMaterial.diffuseColor = Color3.FromHexString("#80513A");
      trunk.material = trunkMaterial;
      const crown = MeshBuilder.CreateSphere(`tree-crown-${index}`, { diameter: 1.15, segments: 8 }, this.scene);
      crown.position = position.add(new Vector3(0, 0.75, 0));
      const crownMaterial = new StandardMaterial(`tree-crown-material-${index}`, this.scene);
      crownMaterial.diffuseColor = Color3.FromHexString(index === 1 ? "#4B9E68" : "#6FC05F");
      crown.material = crownMaterial;
    });
  }

  private createPlots() {
    const positions = [
      new Vector3(-3.25, 0.13, -1.65), new Vector3(-1.9, 0.13, -1.65), new Vector3(-0.55, 0.13, -1.65),
      new Vector3(-3.25, 0.13, -0.35), new Vector3(-1.9, 0.13, -0.35), new Vector3(-0.55, 0.13, -0.35),
    ];
    positions.forEach((position, slotIndex) => {
      const soil = MeshBuilder.CreateBox(`plot-${slotIndex}`, { width: 1.08, height: 0.12, depth: 1.08 }, this.scene);
      soil.position = position;
      soil.metadata = { islandPlotSlot: slotIndex };
      const soilMaterial = new StandardMaterial(`plot-soil-${slotIndex}`, this.scene);
      soilMaterial.diffuseColor = Color3.FromHexString("#B86E3F");
      soil.material = soilMaterial;

      const crop = MeshBuilder.CreateSphere(`crop-${slotIndex}`, { diameter: 1, segments: 8 }, this.scene);
      crop.position = position.add(new Vector3(0, 0.42, 0));
      crop.metadata = { islandPlotSlot: slotIndex };
      const cropMaterial = new StandardMaterial(`plot-crop-${slotIndex}`, this.scene);
      crop.material = cropMaterial;
      crop.isVisible = false;

      const highlight = MeshBuilder.CreateTorus(`plot-highlight-${slotIndex}`, { diameter: 1.23, thickness: 0.045, tessellation: 24 }, this.scene);
      highlight.position = position.add(new Vector3(0, 0.12, 0));
      highlight.rotation.x = Math.PI / 2;
      highlight.metadata = { islandPlotSlot: slotIndex };
      const highlightMaterial = new StandardMaterial(`plot-highlight-material-${slotIndex}`, this.scene);
      highlightMaterial.diffuseColor = Color3.FromHexString("#37E2FF");
      highlightMaterial.emissiveColor = Color3.FromHexString("#37E2FF");
      highlightMaterial.alpha = 0.7;
      highlight.material = highlightMaterial;
      highlight.isVisible = false;

      this.plotNodes.set(slotIndex, { soil, crop, highlight, soilMaterial, cropMaterial, highlightMaterial });
    });
  }
}
