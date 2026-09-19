// Preserve custom project names; only translate the former default brand name.
export const projectDisplayName = (name: string) =>
  name.replace(/^我的异度空间(?=(?: · 导入)*$)/, "我的拾境空间");
export type V3 = [number, number, number];
export type SceneName = "blank" | "living" | "gallery" | "garden";
export interface Design {
  scene: SceneName;
  width?: number;
  depth?: number;
  floor: "wood" | "herringbone" | "terrazzo" | "checker";
  wall: "plain" | "linen" | "stripes" | "botanical";
  color: string;
  textureScale: number;
  time: "morning" | "noon" | "evening";
  intensity: number;
  softness: number;
}
export interface Photo {
  referenceKey?: string;
  id: string;
  name: string;
  blob: Blob;
  thumb: Blob;
  source?: { author: string; url: string; license: string };
  example: boolean;
}
export interface Generation {
  id: string;
  state: "active" | "paused" | "failed" | "uncertain";
  step: "submit" | "poll" | "download";
  progress?: number;
  message?: string;
}
export interface Asset {
  generation?: Generation;
  generatedBy?: "Meshy";
  id: string;
  photoId: string;
  name: string;
  kind: "mug" | "lamp" | "chair" | "glb";
  model?: Blob;
  preserveScale?: boolean;
  placement?: "wall";
  status: "ready" | "pending";
}
export interface Instance {
  id: string;
  assetId: string;
  fixture?: import("./furnishings").FixtureKind;
  fixtureModel?: Blob;
  scene?: SceneName;
  name?: string;
  notes?: string;
  stowed?: boolean;
  settleOnLoad?: boolean;
  wall?: import("./walls").WallId | "free";
  position: V3;
  rotation: V3;
  scale: number;
  locked: boolean;
}
export interface CameraState {
  position: V3;
  target: V3;
}
export interface Project {
  version: 1;
  id: string;
  name: string;
  photos: Photo[];
  assets: Asset[];
  instances: Instance[];
  design: Design;
  sceneKits?: SceneName[];
  gardenBedsEditable?: boolean;
  gardenPergolaEditable?: boolean;
  sceneDesigns?: Partial<Record<SceneName, Design>>;
  camera: CameraState;
  updatedAt: number;
}
export const defaultDesign: Design = {
  scene: "gallery",
  floor: "herringbone",
  wall: "plain",
  color: "#edece3",
  textureScale: 1,
  time: "evening",
  intensity: 1,
  softness: 3,
};
export const defaultCamera: CameraState = {
  position: [8, 7, 10],
  target: [0, 0.8, 0],
};
export const scenes: { id: SceneName; name: string }[] = [
  { id: "blank", name: "空白" },
  { id: "living", name: "客厅" },
  { id: "gallery", name: "画廊" },
  { id: "garden", name: "花园" },
];
export const uid = () => crypto.randomUUID();
export const sourceList = [
  {
    id: "mug",
    name: "陶瓷杯",
    author: "Debby Hudson",
    url: "https://unsplash.com/photos/NiQjjEnfS-c",
  },
  {
    id: "lamp",
    name: "白瓷台灯",
    author: "Evan Marvell",
    url: "https://unsplash.com/photos/L3dZoRESfmM",
  },
  {
    id: "chair",
    name: "木椅",
    author: "Ksenia Chernaya",
    url: "https://www.pexels.com/photo/11112728/",
  },
] as const;
