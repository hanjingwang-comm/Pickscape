import { isFloorCovering, floorTransform } from "./placement";
import { gardenPropCatalog, type GardenProp } from "./gardenProps";
import { mountedWall, wallCenter } from "./walls";
import { seedScene, upgradeProject } from "./furnishings";
import { create } from "zustand";
import {
  defaultDesign,
  defaultCamera,
  uid,
  type Project,
  type Instance,
  type Design,
  type CameraState,
  type Asset,
  type Photo,
  type V3,
} from "./types";
export interface Snapshot {
  instances: Instance[];
  design: Design;
  sceneKits?: Project["sceneKits"];
  gardenBedsEditable?: boolean;
  gardenPergolaEditable?: boolean;
  sceneDesigns?: Project["sceneDesigns"];
}
const copyProject = (p: Project): Project => ({
  ...p,
  photos: p.photos.map((x) => ({ ...x })),
  assets: p.assets.map((x) => ({ ...x })),
  instances: p.instances.map((i) => ({
    ...i,
    position: [...i.position],
    rotation: [...i.rotation],
  })),
  design: { ...p.design },
  camera: structuredClone(p.camera),
  sceneKits: [...(p.sceneKits || [])],
  sceneDesigns: structuredClone(p.sceneDesigns || {}),
});
const snapshot = (p: Project): Snapshot =>
  structuredClone({
    instances: p.instances,
    design: p.design,
    sceneKits: p.sceneKits,
    gardenBedsEditable: p.gardenBedsEditable,
    gardenPergolaEditable: p.gardenPergolaEditable,
    sceneDesigns: p.sceneDesigns,
  });
export interface AppState {
  project: Project | null;
  resolvePlacement:
    ((id: string | null, position: V3, patch?: Partial<Instance>) => V3) | null;
  settle: (id: string) => void;
  selected: string | null;
  draggingItem: string | null;
  mode: "select" | "move" | "rotate" | "scale";
  snap: boolean;
  past: Snapshot[];
  future: Snapshot[];
  revision: number;
  saving: "loading" | "saved" | "saving" | "error";
  saveError: string;
  cameraRequest: number;
  load: (p: Project) => void;
  change: (fn: (p: Project) => void) => void;
  updateMeta: (fn: (p: Project) => void) => void;
  add: (id: string, position?: V3) => void;
  addWisteria: () => void;
  addPond: () => void;
  addGardenProp: (kind: GardenProp) => void;
  placeItem: (id: string, position?: V3) => void;
  transform: (id: string, patch: Partial<Instance>) => void;
  checkpoint: () => void;
  liveTransform: (id: string, patch: Partial<Instance>) => void;
  commit: () => void;
  remove: () => void;
  duplicate: () => void;
  lock: () => void;
  undo: () => void;
  redo: () => void;
  design: (patch: Partial<Design>) => void;
  camera: (c: CameraState) => void;
  select: (id: string | null) => void;
  setMode: (m: AppState["mode"]) => void;
  addPhoto: (p: Photo, a: Asset) => void;
}
export const useApp = create<AppState>((set, get) => ({
  project: null,
  resolvePlacement: null,
  settle: (id) => {
    const item = get().project?.instances.find((i) => i.id === id);
    if (!item || item.stowed || item.locked || !get().resolvePlacement) return;
    get().transform(id, {
      position: get().resolvePlacement!(id, item.position),
    });
  },
  selected: null,
  draggingItem: null,
  mode: "select",
  snap: true,
  past: [],
  future: [],
  revision: 0,
  saving: "loading",
  saveError: "",
  cameraRequest: 0,
  load: (p) =>
    set({
      project: upgradeProject(p),
      selected: null,
      past: [],
      future: [],
      saving: "saved",
      revision: get().revision + 1,
      cameraRequest: get().cameraRequest + 1,
    }),
  change: (fn) => {
    const p = get().project;
    if (!p) return;
    const next = copyProject(p);
    fn(next);
    next.updatedAt = Date.now();
    set({
      project: next,
      past: [...get().past, snapshot(p)].slice(-60),
      future: [],
      revision: get().revision + 1,
      saving: "saving",
    });
  },
  updateMeta: (fn) => {
    const p = get().project;
    if (!p) return;
    const next = copyProject(p);
    fn(next);
    next.updatedAt = Date.now();
    set({ project: next, revision: get().revision + 1, saving: "saving" });
  },
  add: (assetId, position) => {
    const asset = get().project?.assets.find(
      (a) => a.id === assetId && a.status === "ready",
    );
    if (!asset) return;
    position ??=
      asset.placement === "wall" && get().project!.design.scene === "gallery"
        ? [0, 0.7, -3]
        : [0, 0, 0];
    if (asset.placement !== "wall")
      position = get().resolvePlacement?.(null, position) || position;
    const id = uid();
    get().change((p) =>
      p.instances.push({
        id,
        assetId,
        ...(asset.placement === "wall" ? { wall: "back" as const } : {}),
        scene: p.design.scene,
        settleOnLoad: true,
        position,
        rotation: [0, 0, 0],
        scale: 1,
        locked: false,
      }),
    );
    set({ selected: id });
  },
  addWisteria: () => {
    if (!get().project) return;
    const id = uid();
    get().change((p) =>
      p.instances.push({
        id,
        assetId: "",
        fixture: "wisteria",
        name: "紫藤花树",
        notes:
          "根据提供的照片近似重建：弯曲枝干、垂落紫藤花穗与嫩绿复叶。背面和尺寸为推测。",
        stowed: true,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: 1,
        locked: false,
      }),
    );
    set({ selected: id, mode: "select" });
  },
  addGardenProp: (kind) => {
    const entry = gardenPropCatalog.find((entry) => entry.kind === kind);
    if (!get().project || !entry) return;
    const id = uid();
    get().change((p) =>
      p.instances.push({
        id,
        assetId: "",
        fixture: kind,
        ...(kind === "gearClock" ? { wall: "back" as const } : {}),
        name: entry.name,
        notes: entry.note,
        stowed: true,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: 1,
        locked: false,
      }),
    );
    set({ selected: id, mode: "select" });
  },
  addPond: () => {
    if (!get().project) return;
    const id = uid();
    get().change((p) =>
      p.instances.push({
        id,
        assetId: "",
        fixture: "pond",
        name: "鸢尾石岸池塘",
        notes:
          "根据参考照片制作的庭院小池塘：不规则石岸、蓝绿池水与紫色鸢尾。浅池底座、背面与尺寸为推测；可自由放置。",
        stowed: true,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: 1,
        locked: false,
      }),
    );
    set({ selected: id, mode: "select" });
  },
  placeItem: (id, position) => {
    const item = get().project?.instances.find((i) => i.id === id);
    if (!item || !item.stowed || item.locked) return;
    const mount = mountedWall(item, get().project!.design);
    position ??=
      item.fixture === "gearClock" && mount ? wallCenter(mount) : [0, 0, 0];
    position = get().resolvePlacement?.(id, position) || position;
    get().change((p) => {
      const target = p.instances.find((i) => i.id === id)!;
      Object.assign(target, {
        stowed: false,
        settleOnLoad: true,
        scene: p.design.scene,
        position: [...position],
      });
    });
    set({ selected: id, mode: "select" });
  },
  select: (selected) => set({ selected }),
  setMode: (mode) => set({ mode }),
  transform: (id, patch) => {
    const original = get().project?.instances.find((i) => i.id === id);
    if (original?.locked) return;
    if (original) patch = floorTransform(original, patch);
    if (
      original &&
      !original.stowed &&
      (isFloorCovering(original) ||
        mountedWall({ ...original, ...patch }, get().project!.design) ||
        patch.rotation ||
        patch.scale !== undefined ||
        (patch.position &&
          patch.position[1] === original.position[1] &&
          (patch.position[0] !== original.position[0] ||
            patch.position[2] !== original.position[2])))
    ) {
      patch = {
        ...patch,
        position:
          get().resolvePlacement?.(
            id,
            patch.position || original.position,
            patch,
          ) ||
          patch.position ||
          original.position,
      };
    }
    get().change((p) => {
      const i = p.instances.find((i) => i.id === id);
      if (i) Object.assign(i, patch);
    });
  },
  checkpoint: () => {
    const p = get().project;
    if (p) set({ past: [...get().past, snapshot(p)].slice(-60), future: [] });
  },
  liveTransform: (id, patch) => {
    const p = get().project;
    if (!p || p.instances.find((i) => i.id === id)?.locked) return;
    const original = p.instances.find((i) => i.id === id);
    if (original) patch = floorTransform(original, patch);
    if (
      original &&
      !original.stowed &&
      (isFloorCovering(original) ||
        mountedWall({ ...original, ...patch }, p.design))
    ) {
      patch = {
        ...patch,
        position:
          get().resolvePlacement?.(
            id,
            patch.position || original.position,
            patch,
          ) ||
          patch.position ||
          original.position,
      };
    }
    set({
      project: {
        ...p,
        instances: p.instances.map((i) =>
          i.id === id ? { ...i, ...patch } : i,
        ),
      },
    });
  },
  commit: () => set({ revision: get().revision + 1, saving: "saving" }),
  remove: () => {
    const id = get().selected;
    if (!id || get().project?.instances.find((i) => i.id === id)?.locked)
      return;
    get().change((p) => {
      p.instances = p.instances.filter((i) => i.id !== id);
    });
    set({ selected: null });
  },
  duplicate: () => {
    const original = get().project?.instances.find(
      (i) => i.id === get().selected,
    );
    if (!original) return;
    const id = uid();
    get().change((p) =>
      p.instances.push({
        ...structuredClone(original),
        id,
        locked: false,
        settleOnLoad: true,
        position: [
          original.position[0] + 0.4,
          original.position[1],
          original.position[2] + 0.4,
        ],
      }),
    );
    set({ selected: id });
  },
  lock: () => {
    const id = get().selected;
    get().change((p) => {
      const i = p.instances.find((i) => i.id === id);
      if (i) i.locked = !i.locked;
    });
  },
  undo: () => {
    const { past, project, future } = get();
    if (!past.length || !project) return;
    set({
      project: { ...project, ...structuredClone(past[past.length - 1]) },
      past: past.slice(0, -1),
      future: [snapshot(project), ...future],
      selected: null,
      revision: get().revision + 1,
      saving: "saving",
    });
  },
  redo: () => {
    const { past, project, future } = get();
    if (!future.length || !project) return;
    set({
      project: { ...project, ...structuredClone(future[0]) },
      past: [...past, snapshot(project)],
      future: future.slice(1),
      selected: null,
      revision: get().revision + 1,
      saving: "saving",
    });
  },
  design: (patch) =>
    get().change((p) => {
      if (patch.scene && patch.scene !== p.design.scene) {
        p.sceneDesigns = {
          ...p.sceneDesigns,
          [p.design.scene]: { ...p.design },
        };
        p.design = {
          ...defaultDesign,
          scene: patch.scene,
          ...(p.sceneDesigns[patch.scene] || {}),
          ...patch,
        };
        seedScene(p, patch.scene);
        set({ selected: null, mode: "select" });
      } else p.design = { ...p.design, ...patch };
    }),
  camera: (camera) =>
    get().updateMeta((p) => {
      p.camera = camera;
    }),
  addPhoto: (photo, asset) =>
    get().updateMeta((p) => {
      p.photos.push(photo);
      p.assets.push(asset);
    }),
}));
export const emptyProject = (): Project => ({
  version: 1,
  id: uid(),
  name: "我的拾境空间",
  photos: [],
  assets: [],
  instances: [],
  design: { ...defaultDesign },
  camera: structuredClone(defaultCamera),
  updatedAt: Date.now(),
});
