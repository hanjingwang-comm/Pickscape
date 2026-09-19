import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { useApp, emptyProject } from "./store";
import { inspectGlb } from "./models";
import {
  exportProject,
  validateProject,
  saveProject,
  readProject,
} from "./storage";
import { unzipSync, strFromU8 } from "fflate";
function fixture() {
  const p = emptyProject();
  p.sceneKits = ["blank", "living", "gallery", "garden"];
  p.gardenBedsEditable = true;
  p.gardenPergolaEditable = true;
  p.photos.push({
    id: "p",
    name: "杯",
    blob: new Blob(["original"], { type: "image/jpeg" }),
    thumb: new Blob(["thumb"], { type: "image/webp" }),
    example: false,
  });
  p.assets.push({
    id: "a",
    photoId: "p",
    name: "杯",
    kind: "mug",
    status: "ready",
  });
  return p;
}
beforeEach(() => useApp.getState().load(fixture()));
describe("Editor history and independence", () => {
  it("duplicates independently; lock blocks movement and deletion; undo restores lock", () => {
    let s = useApp.getState();
    s.add("a");
    const first = useApp.getState().selected!;
    s.duplicate();
    const second = useApp.getState().selected!;
    s.transform(second, { position: [2, 0, 1] });
    expect(
      useApp.getState().project!.instances.find((i) => i.id === first)!
        .position,
    ).toEqual([0, 0, 0]);
    s.lock();
    s.transform(second, { position: [99, 0, 0] });
    s.remove();
    expect(useApp.getState().project!.instances).toHaveLength(2);
    expect(useApp.getState().project!.instances[1].position).toEqual([2, 0, 1]);
    s.undo();
    expect(useApp.getState().project!.instances[1].locked).toBe(false);
    s.redo();
    expect(useApp.getState().project!.instances[1].locked).toBe(true);
  });
  it("continuous drag commits one history step", () => {
    const s = useApp.getState();
    s.add("a");
    const id = useApp.getState().selected!,
      n = useApp.getState().past.length;
    s.checkpoint();
    for (let i = 0; i < 20; i++) s.liveTransform(id, { position: [i, 0, 0] });
    s.commit();
    expect(useApp.getState().past).toHaveLength(n + 1);
    s.undo();
    expect(useApp.getState().project!.instances[0].position).toEqual([0, 0, 0]);
  });
  it("environment changes preserve assets and are undoable", () => {
    const s = useApp.getState();
    s.add("a", [1, 2, 3]);
    s.design({
      floor: "checker",
      time: "morning",
      wall: "stripes",
      scene: "garden",
    });
    expect(useApp.getState().project!.instances[0].position).toEqual([1, 2, 3]);
    s.undo();
    expect(useApp.getState().project!.design.floor).toBe("herringbone");
  });
  it("pending assets cannot be placed", () => {
    useApp.getState().updateMeta((p) => (p.assets[0].status = "pending"));
    useApp.getState().add("a");
    expect(useApp.getState().project!.instances).toHaveLength(0);
  });
  it("preserves Blob identity during transforms", () => {
    const blob = useApp.getState().project!.photos[0].blob;
    useApp.getState().add("a");
    expect(useApp.getState().project!.photos[0].blob).toBe(blob);
  });
});
describe("Persistence and portable archive", () => {
  it("keeps source and binary files in the archive", async () => {
    const p = fixture();
    p.assets[0].status = "pending";
    const blob = await exportProject(p),
      files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const json = JSON.parse(strFromU8(files["project.json"]));
    expect(strFromU8(files[json.photos[0].blob])).toBe("original");
    expect(strFromU8(files[json.photos[0].thumb])).toBe("thumb");
    expect(json.version).toBe(1);
  });
  it("IndexedDB stores blobs and design", async () => {
    const p = fixture();
    p.design.wall = "botanical";
    await saveProject(p);
    const restored = await readProject(p.id);
    expect(restored!.design.wall).toBe("botanical");
    expect(await restored!.photos[0].blob.text()).toBe("original");
  });
  it("rejects dangling assets, NaN transforms, invalid design and duplicate ids", () => {
    const p = fixture();
    expect(() => validateProject(p)).not.toThrow();
    p.design.intensity = NaN;
    expect(() => validateProject(p)).toThrow();
    p.design.intensity = 1;
    p.assets[0].photoId = "missing";
    expect(() => validateProject(p)).toThrow();
  });
});
describe("GLB boundary", () => {
  it("rejects invalid and external resources before loading", () => {
    expect(() => inspectGlb(new ArrayBuffer(5))).toThrow();
    let json = JSON.stringify({
      asset: { version: "2.0" },
      buffers: [{ uri: "https://example.com/steal.bin" }],
    });
    while (json.length % 4) json += " ";
    const b = new ArrayBuffer(20 + json.length),
      v = new DataView(b);
    v.setUint32(0, 0x46546c67, true);
    v.setUint32(4, 2, true);
    v.setUint32(8, b.byteLength, true);
    v.setUint32(12, json.length, true);
    v.setUint32(16, 0x4e4f534a, true);
    new Uint8Array(b, 20).set(new TextEncoder().encode(json));
    expect(() => inspectGlb(b)).toThrow("自包含");
  });
});

describe("Scene rooms and item collection", () => {
  it("keeps each scene kit distinct, preserves item edits, and does not duplicate kits", () => {
    const p = fixture();
    p.sceneKits = [];
    useApp.getState().load(p);
    const s = useApp.getState();
    const galleryIds = s.project!.instances.map((i) => i.id);
    s.design({ scene: "living" });
    const sofa = useApp
      .getState()
      .project!.instances.find((i) => i.fixture === "sofa")!;
    expect(sofa.scene).toBe("living");
    s.transform(sofa.id, { name: "阅读沙发", notes: "窗边", stowed: true });
    s.design({ scene: "garden" });
    expect(
      useApp.getState().project!.instances.some((i) => i.fixture === "bench"),
    ).toBe(true);
    s.design({ scene: "living" });
    expect(
      useApp.getState().project!.instances.filter((i) => i.fixture === "sofa"),
    ).toHaveLength(1);
    expect(
      useApp.getState().project!.instances.find((i) => i.id === sofa.id)
        ?.stowed,
    ).toBe(true);
    s.transform(sofa.id, { stowed: false });
    s.undo();
    expect(
      useApp.getState().project!.instances.find((i) => i.id === sofa.id)
        ?.stowed,
    ).toBe(true);
    expect(
      galleryIds.every((id) =>
        useApp.getState().project!.instances.some((i) => i.id === id),
      ),
    ).toBe(true);
  });
  it("preserves per-room design and validates new metadata", () => {
    const s = useApp.getState();
    s.design({ wall: "stripes", time: "morning" });
    s.design({ scene: "living" });
    s.design({ wall: "botanical", time: "noon" });
    s.design({ scene: "gallery" });
    expect(useApp.getState().project!.design.wall).toBe("stripes");
    expect(useApp.getState().project!.design.time).toBe("morning");
    s.add("a");
    const i = useApp.getState().project!.instances.at(-1)!;
    s.transform(i.id, { notes: "收藏", name: "我的杯子", stowed: true });
    expect(() => validateProject(useApp.getState().project)).not.toThrow();
    s.select(i.id);
    s.lock();
    s.transform(i.id, { stowed: false });
    expect(useApp.getState().project!.instances.at(-1)?.stowed).toBe(true);
  });
});

describe("Shared collected items", () => {
  it("moves a furnished object freely across every scene, preserves metadata, and undoes placement", () => {
    const p = fixture();
    p.sceneKits = [];
    useApp.getState().load(p);
    const s = useApp.getState(),
      item = useApp
        .getState()
        .project!.instances.find((i) => i.fixture === "plinth")!;
    s.transform(item.id, {
      stowed: true,
      name: "旅行展台",
      notes: "随处摆放",
      scale: 1.3,
    });
    for (const scene of ["living", "garden", "blank", "gallery"] as const) {
      s.design({ scene });
      const before = structuredClone(
        useApp.getState().project!.instances.find((i) => i.id === item.id),
      );
      s.placeItem(item.id, [1.2, 0, -0.7]);
      const placed = useApp
        .getState()
        .project!.instances.find((i) => i.id === item.id)!;
      expect(placed).toMatchObject({
        scene,
        stowed: false,
        position: [1.2, 0, -0.7],
        name: "旅行展台",
        notes: "随处摆放",
        scale: 1.3,
      });
      expect(
        useApp.getState().project!.instances.filter((i) => i.id === item.id),
      ).toHaveLength(1);
      s.undo();
      expect(
        useApp.getState().project!.instances.find((i) => i.id === item.id),
      ).toEqual(before);
      s.redo();
      s.transform(item.id, { stowed: true });
    }
  });
  it("shares photo items too and respects locks", () => {
    const s = useApp.getState();
    s.add("a");
    const id = useApp.getState().selected!;
    s.transform(id, { stowed: true });
    s.design({ scene: "garden" });
    s.placeItem(id);
    expect(
      useApp.getState().project!.instances.find((i) => i.id === id),
    ).toMatchObject({ scene: "garden", stowed: false });
    s.transform(id, { stowed: true });
    s.lock();
    const before = useApp.getState().past.length;
    s.placeItem(id);
    expect(
      useApp.getState().project!.instances.find((i) => i.id === id)?.stowed,
    ).toBe(true);
    expect(useApp.getState().past.length).toBe(before);
  });
});

describe("Surface-aware placement", () => {
  it("uses real table faces, transformed height, and the moving object's bottom", async () => {
    const T = await import("three");
    const { furnishing } = await import("./furnishings");
    const { createLamp, disposeModel } = await import("./models");
    const { supportedPosition, supportHeight } = await import("./placement");
    const table = furnishing("table"),
      lamp = createLamp();
    table.position.set(1, 0.2, -1);
    table.scale.setScalar(1.4);
    table.rotation.y = 0.6;
    lamp.position.set(1, 0, -1);
    const roots = [table, lamp];
    const top = 0.2 + 0.56 * 1.4;
    expect(supportHeight(roots, 1, -1, lamp)).toBeCloseTo(top, 5);
    const placed = supportedPosition(roots, [1, 0, -1], lamp);
    lamp.position.fromArray(placed);
    lamp.updateMatrixWorld(true);
    expect(new T.Box3().setFromObject(lamp).min.y).toBeCloseTo(top, 5);
    expect(supportHeight(roots, 8, 8, lamp)).toBe(0);
    const ground = supportedPosition(roots, [8, 0, 8], lamp);
    lamp.position.fromArray(ground);
    lamp.updateMatrixWorld(true);
    expect(new T.Box3().setFromObject(lamp).min.y).toBeCloseTo(0, 5);
    lamp.rotation.x = 0.4;
    lamp.scale.setScalar(1.5);
    const tilted = supportedPosition(roots, [1, 0, -1], lamp);
    lamp.position.fromArray(tilted);
    lamp.updateMatrixWorld(true);
    expect(new T.Box3().setFromObject(lamp).min.y).toBeCloseTo(top, 5);
    disposeModel(table);
    disposeModel(lamp);
  });
  it("does not turn empty space between table legs into an invisible surface", async () => {
    const T = await import("three");
    const { supportHeight, pointerSurface } = await import("./placement");
    const root = new T.Group();
    for (const x of [-1, 1]) {
      const m = new T.Mesh(
        new T.BoxGeometry(0.1, 1, 0.1),
        new T.MeshBasicMaterial(),
      );
      m.position.set(x, 0.5, 0);
      root.add(m);
    }
    expect(supportHeight([root], 0, 0)).toBe(0);
    const ray = new T.Raycaster(
      new T.Vector3(1, 5, 0),
      new T.Vector3(0, -1, 0),
    );
    expect(pointerSurface([root], ray)?.[1]).toBeCloseTo(1);
    root.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        (o.material as T.Material).dispose();
      }
    });
  });
});

describe("Wall-mounted gallery paintings", () => {
  it("keeps the whole rotated/scaled frame in front of every wall and within its edges", async () => {
    const T = await import("three");
    const { furnishing } = await import("./furnishings");
    const { disposeModel } = await import("./models");
    const { wallPosition } = await import("./placement");
    const { galleryWalls, wallFace, wallGap } = await import("./walls");
    const root = furnishing("art");
    for (const wall of galleryWalls) {
      for (const scale of [0.55, 1, 1.25]) {
        const rotation: [number, number, number] = [
          0.12,
          wall.rotation[1] + 0.13,
          0.18,
        ];
        const position = wallPosition(wall, [9, -4, -8], root, {
          rotation,
          scale,
        });
        root.position.fromArray(position);
        root.rotation.set(...rotation);
        root.scale.setScalar(scale);
        root.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(root);
        const depth =
          wall.sign === 1
            ? box.min.getComponent(wall.axis)
            : box.max.getComponent(wall.axis);
        expect(wall.sign * (depth - wallFace(wall))).toBeCloseTo(wallGap, 5);
        for (const axis of [1, wall.axis === 0 ? 2 : 0]) {
          expect(box.min.getComponent(axis)).toBeGreaterThanOrEqual(
            wall.position[axis] - wall.size[axis] / 2 + wallGap - 0.00001,
          );
          expect(box.max.getComponent(axis)).toBeLessThanOrEqual(
            wall.position[axis] + wall.size[axis] / 2 - wallGap + 0.00001,
          );
        }
      }
    }
    disposeModel(root);
  });
  it("maps pointer movement to the vertical plane instead of the floor", async () => {
    const T = await import("three");
    const { movementPlane } = await import("./placement");
    const { galleryWalls } = await import("./walls");
    const plane = movementPlane([0, 0.6, -3], galleryWalls[0]);
    const hit = (x: number, y: number) =>
      new T.Ray(
        new T.Vector3(4, 5, 8),
        new T.Vector3(x - 4, y - 5, -11).normalize(),
      ).intersectPlane(plane, new T.Vector3())!;
    const a = hit(-1, 1),
      b = hit(0.5, 1.8);
    expect(b.x - a.x).toBeCloseTo(1.5);
    expect(b.y - a.y).toBeCloseTo(0.8);
    expect(b.z).toBeCloseTo(a.z);
  });
  it("constrains live and numeric moves, undoes a drag once, and retains mounting on restore", async () => {
    const { furnishing } = await import("./furnishings");
    const { disposeModel } = await import("./models");
    const { wallPosition } = await import("./placement");
    const { mountedWall } = await import("./walls");
    const p = fixture();
    p.instances.push({
      id: "painting",
      assetId: "",
      fixture: "art",
      scene: "gallery",
      position: [-1, 0.6, -3],
      rotation: [0, 0, 0],
      scale: 1,
      locked: false,
    });
    const root = furnishing("art");
    useApp.getState().load(p);
    useApp.setState({
      resolvePlacement: (id, position, patch) => {
        const project = useApp.getState().project!;
        const original = project.instances.find((i) => i.id === id)!;
        const item = { ...original, ...patch };
        const wall = mountedWall(item, project.design.scene);
        return wall ? wallPosition(wall, position, root, item) : position;
      },
    });
    const s = useApp.getState(),
      current = () => useApp.getState().project!.instances[0];
    try {
      s.transform("painting", { position: [-1, 0.8, -5] });
      const initial = [...current().position];
      expect(initial[2]).toBeGreaterThan(-3.055);
      const count = useApp.getState().past.length;
      s.checkpoint();
      for (let n = 0; n < 10; n++)
        s.liveTransform("painting", {
          position: [-1 + n * 0.05, 0.8 + n * 0.03, -6],
        });
      s.commit();
      expect(current().position[1]).toBeCloseTo(1.07);
      expect(current().position[2]).toBeCloseTo(initial[2]);
      expect(useApp.getState().past.length).toBe(count + 1);
      s.undo();
      expect(current().position).toEqual(initial);
      s.redo();
      s.transform("painting", { wall: "free" });
      s.transform("painting", { position: [0, 0.9, 0] });
      expect(current().position).toEqual([0, 0.9, 0]);
      s.transform("painting", { wall: "back" });
      s.transform("painting", { stowed: true });
      s.design({ scene: "garden" });
      s.placeItem("painting", [1, 0, 1]);
      expect(current().position).toEqual([1, 0, 1]);
      s.transform("painting", { stowed: true });
      s.design({ scene: "gallery" });
      s.placeItem("painting", [0, 0.7, -8]);
      expect(current().wall).toBe("back");
      expect(current().position[2]).toBeCloseTo(initial[2]);
      s.select("painting");
      s.lock();
      const locked = [...current().position];
      s.liveTransform("painting", { position: [0, 0, -8] });
      expect(current().position).toEqual(locked);
      expect(() => validateProject(useApp.getState().project)).not.toThrow();
      const invalid = structuredClone(useApp.getState().project!);
      (invalid.instances[0] as any).wall = "unknown";
      expect(() => validateProject(invalid)).toThrow();
      await saveProject(useApp.getState().project!);
      const restored = await readProject(p.id);
      expect(restored!.instances[0].wall).toBe("back");
    } finally {
      useApp.setState({ resolvePlacement: null });
      disposeModel(root);
    }
  });
});

describe("Editable garden beds", () => {
  beforeEach(() => {
    // Node lacks FileReader; use real Blob bytes for the browser GLB export path.
    vi.stubGlobal(
      "FileReader",
      class {
        result: ArrayBuffer | null = null;
        onloadend: (() => void) | null = null;
        async readAsArrayBuffer(blob: Blob) {
          this.result = await blob.arrayBuffer();
          this.onloadend?.();
        }
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  it("migrates existing gardens once and preserves edits, stowing and cross-scene placement", async () => {
    const p = fixture();
    delete p.gardenBedsEditable;
    useApp.getState().load(p);
    const s = useApp.getState();
    const beds = s.project!.instances.filter((i) => i.fixture === "gardenBed");
    expect(beds).toHaveLength(2);
    const [left, right] = beds;
    s.transform(left.id, { position: [-1, 0, 1], name: "窗边花池" });
    s.undo();
    expect(
      useApp.getState().project!.instances.find((i) => i.id === left.id)
        ?.position,
    ).toEqual([-2.9, 0, -0.1]);
    s.redo();
    s.transform(left.id, { stowed: true });
    s.design({ scene: "living" });
    s.placeItem(left.id, [1, 0, 1]);
    s.select(right.id);
    s.remove();
    const saved = useApp.getState().project!;
    validateProject(saved);
    await saveProject(saved);
    useApp.getState().load((await readProject(saved.id))!);
    const restored = useApp.getState().project!;
    expect(
      restored.instances.filter((i) => i.fixture === "gardenBed"),
    ).toHaveLength(1);
    expect(restored.instances.find((i) => i.id === left.id)).toMatchObject({
      name: "窗边花池",
      scene: "living",
      stowed: false,
      position: [1, 0, 1],
    });
    const archive = unzipSync(
      new Uint8Array(await (await exportProject(restored)).arrayBuffer()),
    );
    const manifest = JSON.parse(strFromU8(archive["project.json"]));
    expect(manifest.gardenBedsEditable).toBe(true);
    const bed = manifest.instances.find(
      (i: { id: string }) => i.id === left.id,
    );
    expect(archive[bed.fixtureModel].byteLength).toBeGreaterThan(100);
  });
  it("seeds fresh gardens and supports undoing the first visit without duplicates", () => {
    useApp.getState().load(emptyProject());
    const s = useApp.getState();
    s.design({ scene: "garden" });
    expect(
      useApp
        .getState()
        .project!.instances.filter((i) => i.fixture === "gardenBed"),
    ).toHaveLength(2);
    s.undo();
    expect(useApp.getState().project!.gardenBedsEditable).toBeUndefined();
    s.design({ scene: "garden" });
    expect(
      useApp
        .getState()
        .project!.instances.filter((i) => i.fixture === "gardenBed"),
    ).toHaveLength(2);
  });
});

describe("Wisteria object", () => {
  it("adds independent stowed trees, places across rooms and persists edits", async () => {
    const s = useApp.getState();
    s.addWisteria();
    const first = useApp.getState().selected!;
    s.addWisteria();
    const second = useApp.getState().selected!;
    s.design({ scene: "garden" });
    s.placeItem(first, [-1, 0, 1]);
    s.transform(first, { name: "庭院紫藤", scale: 0.8 });
    expect(
      useApp.getState().project!.instances.find((i) => i.id === second),
    ).toMatchObject({ stowed: true, scale: 1 });
    s.transform(first, { stowed: true });
    s.design({ scene: "gallery" });
    s.placeItem(first, [0, 0, 1]);
    s.undo();
    expect(
      useApp.getState().project!.instances.find((i) => i.id === first)?.stowed,
    ).toBe(true);
    s.redo();
    const p = useApp.getState().project!;
    validateProject(p);
    await saveProject(p);
    expect(
      (await readProject(p.id))!.instances.find((i) => i.id === first),
    ).toMatchObject({
      fixture: "wisteria",
      name: "庭院紫藤",
      scene: "gallery",
      scale: 0.8,
      stowed: false,
    });
  });
  it("has deterministic, ground-aligned real geometry within its browser budget and exports self-contained GLB", async () => {
    const { furnishing } = await import("./furnishings");
    const { Box3, Mesh, Vector3 } = await import("three");
    const { disposeModel } = await import("./models");
    const root = furnishing("wisteria"),
      copy = furnishing("wisteria");
    try {
      const bounds = new Box3().setFromObject(root);
      expect(bounds.min.y).toBeCloseTo(0, 5);
      const size = bounds.getSize(new Vector3());
      expect(size.x).toBeGreaterThan(size.y);
      let triangles = 0;
      root.traverse((o) => {
        if (o instanceof Mesh) {
          triangles +=
            (o.geometry.index?.count || o.geometry.attributes.position.count) /
            3;
          expect(
            Array.from(o.geometry.attributes.position.array).every(
              Number.isFinite,
            ),
          ).toBe(true);
        }
      });
      expect(triangles).toBeLessThanOrEqual(60000);
      expect(root.children).toHaveLength(4);
      expect(
        (root.children[2] as InstanceType<typeof Mesh>).geometry.attributes
          .position.array,
      ).toEqual(
        (copy.children[2] as InstanceType<typeof Mesh>).geometry.attributes
          .position.array,
      );
      vi.stubGlobal(
        "FileReader",
        class {
          result: ArrayBuffer | null = null;
          onloadend: (() => void) | null = null;
          async readAsArrayBuffer(b: Blob) {
            this.result = await b.arrayBuffer();
            this.onloadend?.();
          }
        },
      );
      useApp.getState().addWisteria();
      const zip = unzipSync(
        new Uint8Array(
          await (await exportProject(useApp.getState().project!)).arrayBuffer(),
        ),
      );
      const manifest = JSON.parse(strFromU8(zip["project.json"]));
      const model = zip[manifest.instances[0].fixtureModel];
      expect(() =>
        inspectGlb(
          model.buffer.slice(
            model.byteOffset,
            model.byteOffset + model.byteLength,
          ) as ArrayBuffer,
        ),
      ).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
      disposeModel(root);
      disposeModel(copy);
    }
  });
});

describe("Framed image paintings", () => {
  it("preserves the image ratio and keeps the entire frame in front of gallery walls", async () => {
    const { createPaintingModel } = await import("./painting");
    const { Texture, Mesh, Box3 } = await import("three");
    const { galleryWalls } = await import("./walls");
    const { wallPosition } = await import("./placement");
    const { disposeModel } = await import("./models");
    for (const ratio of [164 / 148, 0.6, 2]) {
      const root = createPaintingModel(new Texture(), ratio);
      const picture = root.getObjectByName("原始画面") as InstanceType<
        typeof Mesh
      >;
      picture.geometry.computeBoundingBox();
      const b = picture.geometry.boundingBox!;
      expect((b.max.x - b.min.x) / (b.max.y - b.min.y)).toBeCloseTo(ratio, 5);
      expect(new Box3().setFromObject(root).min.y).toBeCloseTo(0);
      const wall = galleryWalls[0];
      root.position.fromArray(wallPosition(wall, [0, 0.7, -8], root));
      expect(new Box3().setFromObject(root).min.z).toBeGreaterThan(-3.055);
      disposeModel(root);
    }
  });
  it("carries wall movement from the asset to independent instances and backups", async () => {
    const p = fixture();
    p.assets[0] = {
      ...p.assets[0],
      kind: "glb",
      model: new Blob(["embedded painting model"]),
      placement: "wall",
      preserveScale: true,
    };
    useApp.getState().load(p);
    const s = useApp.getState();
    s.add("a");
    const first = useApp.getState().selected!;
    const { mountedWall } = await import("./walls");
    expect(
      mountedWall(useApp.getState().project!.instances[0], "gallery")?.id,
    ).toBe("back");
    s.add("a");
    const second = useApp.getState().selected!;
    s.transform(first, { wall: "left", stowed: true });
    expect(
      useApp.getState().project!.instances.find((i) => i.id === second)?.wall,
    ).toBe("back");
    const project = useApp.getState().project!;
    validateProject(project);
    const zip = unzipSync(
      new Uint8Array(await (await exportProject(project)).arrayBuffer()),
    );
    const manifest = JSON.parse(strFromU8(zip["project.json"]));
    expect(manifest.assets[0].placement).toBe("wall");
    expect(strFromU8(zip[manifest.assets[0].model])).toBe(
      "embedded painting model",
    );
    expect(strFromU8(zip[manifest.photos[0].blob])).toBe("original");
    await saveProject(project);
    expect(
      (await readProject(project.id))!.instances.find((i) => i.id === first)
        ?.wall,
    ).toBe("left");
    expect(() =>
      validateProject({
        ...project,
        assets: [{ ...project.assets[0], placement: "invalid" }],
      }),
    ).toThrow();
  });
});

describe("Movable iris pond", () => {
  it("keeps water above the base, has finite bounded geometry, and exports as a portable object", async () => {
    const { furnishing } = await import("./furnishings");
    const { Box3, Mesh } = await import("three");
    const { disposeModel } = await import("./models");
    const root = furnishing("pond");
    try {
      expect(new Box3().setFromObject(root).min.y).toBeCloseTo(0, 5);
      const water = root.getObjectByName("蓝绿池水")!;
      const basin = root.getObjectByName("浅池底座")!;
      expect(new Box3().setFromObject(water).min.y).toBeGreaterThan(
        new Box3().setFromObject(basin).max.y,
      );
      expect(
        (water as InstanceType<typeof Mesh>).geometry.attributes.normal.getY(0),
      ).toBeGreaterThan(0.9);
      let triangles = 0;
      root.traverse((o) => {
        if (o instanceof Mesh) {
          triangles +=
            (o.geometry.index?.count || o.geometry.attributes.position.count) /
            3;
          expect(
            Array.from(o.geometry.attributes.position.array).every(
              Number.isFinite,
            ),
          ).toBe(true);
        }
      });
      expect(triangles).toBeLessThan(20000);
      expect(root.children).toHaveLength(6);
      const s = useApp.getState();
      s.addPond();
      const first = useApp.getState().selected!;
      s.addPond();
      const second = useApp.getState().selected!;
      s.design({ scene: "garden" });
      s.placeItem(first, [1, 0, 1]);
      s.transform(first, { scale: 0.8 });
      expect(
        useApp.getState().project!.instances.find((i) => i.id === second),
      ).toMatchObject({ stowed: true, scale: 1 });
      s.transform(first, { stowed: true });
      s.design({ scene: "blank" });
      s.placeItem(first, [-1, 0, 0]);
      s.undo();
      expect(
        useApp.getState().project!.instances.find((i) => i.id === first)
          ?.stowed,
      ).toBe(true);
      s.redo();
      const p = useApp.getState().project!;
      validateProject(p);
      await saveProject(p);
      expect(
        (await readProject(p.id))!.instances.find((i) => i.id === first),
      ).toMatchObject({ fixture: "pond", scene: "blank", scale: 0.8 });
      vi.stubGlobal(
        "FileReader",
        class {
          result: ArrayBuffer | null = null;
          onloadend: (() => void) | null = null;
          async readAsArrayBuffer(b: Blob) {
            this.result = await b.arrayBuffer();
            this.onloadend?.();
          }
        },
      );
      const zip = unzipSync(
        new Uint8Array(await (await exportProject(p)).arrayBuffer()),
      );
      const m = JSON.parse(strFromU8(zip["project.json"]));
      const bytes =
        zip[
          m.instances.find((i: { id: string }) => i.id === first).fixtureModel
        ];
      expect(() =>
        inspectGlb(
          bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
          ) as ArrayBuffer,
        ),
      ).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
      disposeModel(root);
    }
  });
});

describe("Per-scene space expansion", () => {
  it("keeps objects fixed, isolates all four scenes, and supports undo/redo", async () => {
    const { spaceBounds } = await import("./space");
    const s = useApp.getState();
    s.add("a", [1, 0, 2]);
    const original = structuredClone(useApp.getState().project!.instances);
    const names = ["blank", "living", "gallery", "garden"] as const;
    for (const [index, scene] of names.entries()) {
      s.design({ scene });
      expect(spaceBounds(useApp.getState().project!.design).width).toBe(6.4);
      const width = 8 + index * 1.6;
      s.design({ width, depth: 9.6 });
      expect(useApp.getState().project!.instances).toEqual(original);
      s.undo();
      expect(spaceBounds(useApp.getState().project!.design).width).toBe(6.4);
      s.redo();
      expect(useApp.getState().project!.design.width).toBe(width);
    }
    for (const [index, scene] of names.entries()) {
      s.design({ scene });
      expect(useApp.getState().project!.design.width).toBe(8 + index * 1.6);
      expect(useApp.getState().project!.design.depth).toBe(9.6);
    }
  });
  it("opens new placement area and wall surface without moving existing mounts", async () => {
    const { insideSpace, spaceCamera } = await import("./space");
    const { wallsForDesign, wallFace } = await import("./walls");
    const { wallPosition } = await import("./placement");
    const T = await import("three");
    const d = useApp.getState().project!.design;
    const enlarged = { ...d, width: 12.8, depth: 9.6 };
    expect(insideSpace([8, 0, 5], d)).toBe(false);
    expect(insideSpace([8, 0, 5], enlarged)).toBe(true);
    expect(insideSpace([-4, 0, 0], enlarged)).toBe(false);
    const oldWalls = wallsForDesign(d),
      nextWalls = wallsForDesign(enlarged);
    const painting = new T.Mesh(new T.BoxGeometry(0.8, 1, 0.08));
    painting.position.set(0, 1.4, -3);
    for (let i = 0; i < 3; i++)
      expect(wallFace(nextWalls[i])).toBe(wallFace(oldWalls[i]));
    expect(wallPosition(nextWalls[0], [0, 1.4, -3], painting)).toEqual(
      wallPosition(oldWalls[0], [0, 1.4, -3], painting),
    );
    expect(wallPosition(nextWalls[0], [8, 1.4, -3], painting)[0]).toBe(8);
    expect(wallPosition(oldWalls[0], [8, 1.4, -3], painting)[0]).toBeLessThan(
      3.2,
    );
    expect(spaceCamera(enlarged).target[0]).toBeCloseTo(3.2);
    expect(spaceCamera(enlarged).target[2]).toBeCloseTo(1.6);
    expect(spaceCamera(enlarged, true).position[1]).toBe(22);
    painting.geometry.dispose();
    painting.material.dispose();
  });
  it("persists dimensions in IndexedDB and a portable backup, accepting old projects", async () => {
    const p = fixture();
    p.assets = [];
    p.photos = [];
    expect(() => validateProject(p)).not.toThrow();
    p.design.width = 9.6;
    p.design.depth = 12.8;
    p.sceneDesigns = { garden: { ...p.design, scene: "garden", width: 19.2 } };
    await saveProject(p);
    const restored = (await readProject(p.id))!;
    expect(restored.design.width).toBe(9.6);
    expect(restored.sceneDesigns!.garden!.width).toBe(19.2);
    const zip = unzipSync(
      new Uint8Array(await (await exportProject(restored)).arrayBuffer()),
    );
    const manifest = JSON.parse(strFromU8(zip["project.json"]));
    expect(manifest.design.depth).toBe(12.8);
    expect(manifest.sceneDesigns.garden.width).toBe(19.2);
  });
  it("rejects invalid dimensions in both active and saved scenes", () => {
    for (const value of [0, 6.3, 20, NaN, Infinity, "8", null]) {
      const p = fixture();
      (p.design as unknown as Record<string, unknown>).width = value;
      expect(() => validateProject(p)).toThrow();
      const q = fixture();
      q.sceneDesigns = { garden: { ...p.design, scene: "garden" } };
      expect(() => validateProject(q)).toThrow();
    }
  });
});

describe("Placement-game rotation", () => {
  it("turns a tilted pond upright on its support without changing its location or scale", async () => {
    const T = await import("three");
    const { furnishing } = await import("./furnishings");
    const { supportedPosition, uprightRotation, draggedYaw } =
      await import("./placement");
    const s = useApp.getState();
    s.addPond();
    const id = useApp.getState().selected!;
    s.placeItem(id, [-0.4, 0, 1]);
    s.transform(id, {
      rotation: [1.16, -1.39, 1.09],
      position: [-0.4, 0.31, 1],
      scale: 1.2,
    });
    const before = structuredClone(
      useApp.getState().project!.instances.find((i) => i.id === id)!,
    );
    const root = furnishing("pond");
    root.position.fromArray(before.position);
    root.rotation.set(...before.rotation);
    root.scale.setScalar(before.scale);
    useApp.setState({
      resolvePlacement: (_id, position, patch) =>
        supportedPosition([root], position, root, patch),
    });
    const count = useApp.getState().past.length;
    s.checkpoint();
    for (let n = 1; n <= 8; n++) {
      const rotation = uprightRotation(
        draggedYaw(before.rotation[1], 0, n * 0.1, true),
      );
      const position = supportedPosition([root], before.position, root, {
        rotation,
      });
      s.liveTransform(id, { rotation, position });
      const item = useApp
        .getState()
        .project!.instances.find((i) => i.id === id)!;
      expect(item.rotation[0]).toBe(0);
      expect(item.rotation[2]).toBe(0);
      expect(item.position[0]).toBe(before.position[0]);
      expect(item.position[2]).toBe(before.position[2]);
      root.position.fromArray(item.position);
      root.rotation.set(...item.rotation);
      expect(new T.Box3().setFromObject(root).min.y).toBeCloseTo(0, 5);
    }
    s.commit();
    expect(useApp.getState().past.length).toBe(count + 1);
    expect(
      useApp.getState().project!.instances.find((i) => i.id === id)!.scale,
    ).toBe(1.2);
    s.undo();
    expect(
      useApp.getState().project!.instances.find((i) => i.id === id),
    ).toEqual(before);
    s.redo();
    expect(
      useApp.getState().project!.instances.find((i) => i.id === id)!
        .rotation[0],
    ).toBe(0);
    const { disposeModel } = await import("./models");
    disposeModel(root);
    useApp.setState({ resolvePlacement: null });
  });
  it("crosses the angle seam smoothly and supports optional 15-degree snapping", async () => {
    const { draggedYaw } = await import("./placement");
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    expect(draggedYaw(0, radians(179), radians(-179), false)).toBeCloseTo(
      radians(2),
    );
    expect(draggedYaw(0, radians(-179), radians(179), false)).toBeCloseTo(
      radians(-2),
    );
    expect(draggedYaw(0, 0, radians(22), true)).toBeCloseTo(radians(15));
    expect(draggedYaw(0, 0, radians(22), false)).toBeCloseTo(radians(22));
  });
});

describe("Garden reference props", () => {
  it.each([
    "broadleafTree",
    "swing",
    "fountain",
    "pebblePath",
    "tulips",
    "poppies",
    "monstera",
    "barTable",
    "barStool",
    "equestrian",
    "blueCocktail",
    "layeredMartini",
    "limeHighball",
    "creamSofa",
    "gearClock",
    "driftwoodLamp",
    "highCoffeeTable",
    "lowCoffeeTable",
    "loungeChair",
    "vintageFlowerStand",
    "bauhausDisplay",
    "blueBorderRug",
    "blueModularSofa",
    "cantileverChair",
    "dottedFloorLamp",
    "campingChair",
    "rectangularKoiPond",
  ] as const)(
    "%s has grounded, finite, independent geometry and a portable model",
    async (kind) => {
      const { furnishing } = await import("./furnishings");
      const { Box3, Mesh } = await import("three");
      const { disposeModel } = await import("./models");
      const root = furnishing(kind),
        copy = furnishing(kind);
      try {
        const box = new Box3().setFromObject(root);
        expect(box.min.y).toBeCloseTo(0, 5);
        expect(box.max.y).toBeLessThan(3.1);
        let triangles = 0;
        root.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          expect(object.name.length).toBeGreaterThan(0);
          triangles +=
            (object.geometry.index?.count ??
              object.geometry.attributes.position.count) / 3;
          for (const value of object.geometry.attributes.position.array)
            expect(Number.isFinite(value)).toBe(true);
        });
        expect(triangles).toBeGreaterThan(1000);
        expect(triangles).toBeLessThan(60000);
        expect(root.children.length).toBeLessThan(30);
        expect((root.children[0] as Mesh).geometry).not.toBe(
          (copy.children[0] as Mesh).geometry,
        );
        expect((root.children[0] as Mesh).material).not.toBe(
          (copy.children[0] as Mesh).material,
        );
        if (kind === "pebblePath") {
          expect(box.max.z - box.min.z).toBeCloseTo(3.8, 4);
          expect(box.max.x - box.min.x).toBeCloseTo(2.29, 4);
          expect(box.max.y).toBeLessThan(0.1);
        }
        if (kind === "pebblePath") {
          const { Raycaster, Vector3 } = await import("three");
          const hits = (x: number, z: number) =>
            new Raycaster(
              new Vector3(x, 1, z),
              new Vector3(0, -1, 0),
            ).intersectObject(root, true).length;
          expect(hits(0.62, -0.95)).toBeGreaterThan(0);
          expect(hits(-0.62, -0.95)).toBe(0);
          expect(hits(-0.62, 0.95)).toBeGreaterThan(0);
          expect(hits(0.62, 0.95)).toBe(0);
        }
        if (kind === "fountain") {
          const blooms = root.children.filter(
            (child) => child.name === "环池花朵",
          );
          expect(blooms.length).toBe(4);
          const flowerBounds = new Box3();
          blooms.forEach((child) =>
            flowerBounds.union(new Box3().setFromObject(child)),
          );
          expect(flowerBounds.min.x).toBeLessThan(-1.3);
          expect(flowerBounds.max.x).toBeGreaterThan(1.3);
          expect(flowerBounds.min.z).toBeLessThan(-1.3);
          expect(flowerBounds.max.z).toBeGreaterThan(1.3);
          expect(flowerBounds.min.y).toBeGreaterThan(0.1);
          expect(flowerBounds.max.y).toBeLessThan(0.9);
        }
        const p = emptyProject();
        p.sceneKits = ["blank", "living", "gallery", "garden"];
        p.gardenBedsEditable = true;
        p.gardenPergolaEditable = true;
        useApp.getState().load(p);
        const s = useApp.getState();
        s.addGardenProp(kind);
        const first = useApp.getState().selected!;
        s.addGardenProp(kind);
        const second = useApp.getState().selected!;
        s.placeItem(first, [1, 0, 1]);
        s.transform(first, {
          scale: 0.8,
          rotation: [0, Math.PI / 2, 0],
          name: "我的庭院物件",
        });
        expect(
          useApp.getState().project!.instances.find((i) => i.id === second),
        ).toMatchObject({ stowed: true, scale: 1, rotation: [0, 0, 0] });
        for (const scene of ["blank", "living", "gallery", "garden"] as const) {
          s.transform(first, { stowed: true });
          s.design({ scene });
          s.placeItem(first, [1, 0, 1]);
          expect(
            useApp.getState().project!.instances.find((i) => i.id === first)
              ?.scene,
          ).toBe(scene);
        }
        s.undo();
        expect(
          useApp.getState().project!.instances.find((i) => i.id === first)
            ?.stowed,
        ).toBe(true);
        s.redo();
        const saved = useApp.getState().project!;
        validateProject(saved);
        await saveProject(saved);
        expect(
          (await readProject(saved.id))!.instances.find((i) => i.id === first),
        ).toMatchObject({
          name: "我的庭院物件",
          fixture: kind,
          scale: 0.8,
          stowed: false,
        });
        vi.stubGlobal(
          "FileReader",
          class {
            result: ArrayBuffer | null = null;
            onloadend: (() => void) | null = null;
            async readAsArrayBuffer(blob: Blob) {
              this.result = await blob.arrayBuffer();
              this.onloadend?.();
            }
          },
        );
        const zip = unzipSync(
          new Uint8Array(await (await exportProject(saved)).arrayBuffer()),
        );
        const manifest = JSON.parse(strFromU8(zip["project.json"]));
        const bytes =
          zip[
            manifest.instances.find((i: { id: string }) => i.id === first)
              .fixtureModel
          ];
        expect(bytes.byteLength).toBeGreaterThan(1000);
        expect(() =>
          inspectGlb(
            bytes.buffer.slice(
              bytes.byteOffset,
              bytes.byteOffset + bytes.byteLength,
            ) as ArrayBuffer,
          ),
        ).not.toThrow();
      } finally {
        vi.unstubAllGlobals();
        disposeModel(root);
        disposeModel(copy);
      }
    },
  );
});

describe("Movable garden pergola", () => {
  it("migrates once at the original location and preserves stowing, cross-scene placement and removal", async () => {
    const p = fixture();
    delete p.gardenPergolaEditable;
    const original = structuredClone(p.instances);
    const s = useApp.getState();
    s.load(p);
    const pergolas = useApp
      .getState()
      .project!.instances.filter((i) => i.fixture === "pergola");
    expect(pergolas).toHaveLength(1);
    const item = pergolas[0];
    expect(item.position).toEqual([-1.3, 0, -2.7]);
    expect(
      useApp
        .getState()
        .project!.instances.filter((i) => i.fixture !== "pergola"),
    ).toEqual(original);
    s.transform(item.id, {
      position: [1, 0, 1],
      rotation: [0, Math.PI / 2, 0],
      scale: 0.8,
    });
    s.undo();
    expect(
      useApp.getState().project!.instances.find((i) => i.id === item.id)
        ?.position,
    ).toEqual([-1.3, 0, -2.7]);
    s.redo();
    s.transform(item.id, { stowed: true });
    s.load(useApp.getState().project!);
    expect(
      useApp
        .getState()
        .project!.instances.filter((i) => i.fixture === "pergola"),
    ).toHaveLength(1);
    expect(
      useApp.getState().project!.instances.find((i) => i.id === item.id)
        ?.stowed,
    ).toBe(true);
    s.design({ scene: "living" });
    s.placeItem(item.id, [0, 0, 1]);
    const saved = useApp.getState().project!;
    validateProject(saved);
    await saveProject(saved);
    const restored = (await readProject(saved.id))!;
    expect(restored.gardenPergolaEditable).toBe(true);
    expect(restored.instances.find((i) => i.id === item.id)).toMatchObject({
      scene: "living",
      scale: 0.8,
      stowed: false,
    });
    vi.stubGlobal(
      "FileReader",
      class {
        result: ArrayBuffer | null = null;
        onloadend: (() => void) | null = null;
        async readAsArrayBuffer(b: Blob) {
          this.result = await b.arrayBuffer();
          this.onloadend?.();
        }
      },
    );
    try {
      const archive = unzipSync(
        new Uint8Array(await (await exportProject(restored)).arrayBuffer()),
      );
      const manifest = JSON.parse(strFromU8(archive["project.json"]));
      expect(manifest.gardenPergolaEditable).toBe(true);
      expect(
        archive[
          manifest.instances.find((i: { id: string }) => i.id === item.id)
            .fixtureModel
        ].byteLength,
      ).toBeGreaterThan(1000);
    } finally {
      vi.unstubAllGlobals();
    }
    s.select(item.id);
    s.remove();
    s.design({ scene: "garden" });
    s.load(useApp.getState().project!);
    expect(
      useApp.getState().project!.instances.some((i) => i.fixture === "pergola"),
    ).toBe(false);
    const invalid = fixture();
    (invalid as unknown as Record<string, unknown>).gardenPergolaEditable =
      "yes";
    expect(() => validateProject(invalid)).toThrow();
  });
  it("matches the former fixed geometry and undoing a first garden visit restores the migration state", async () => {
    const { furnishing } = await import("./furnishings");
    const { Box3 } = await import("three");
    const { disposeModel } = await import("./models");
    const root = furnishing("pergola");
    root.position.set(-1.3, 0, -2.7);
    const bounds = new Box3().setFromObject(root);
    expect(root.children).toHaveLength(12);
    [-3.05, 0, -3].forEach((n, i) =>
      expect(bounds.min.getComponent(i)).toBeCloseTo(n, 5),
    );
    [0.45, 2.71, -1.4].forEach((n, i) =>
      expect(bounds.max.getComponent(i)).toBeCloseTo(n, 5),
    );
    disposeModel(root);
    const s = useApp.getState();
    s.load(emptyProject());
    s.design({ scene: "garden" });
    expect(
      useApp
        .getState()
        .project!.instances.filter((i) => i.fixture === "pergola"),
    ).toHaveLength(1);
    s.undo();
    expect(useApp.getState().project!.gardenPergolaEditable).toBeUndefined();
    s.redo();
    expect(
      useApp
        .getState()
        .project!.instances.filter((i) => i.fixture === "pergola"),
    ).toHaveLength(1);
  });
});

it("renders the equestrian neck with outward-facing surfaces from both sides", async () => {
  const { createEquestrianModel } = await import("./equestrian");
  const { Raycaster, Vector3 } = await import("three");
  const { disposeModel } = await import("./models");
  const root = createEquestrianModel("structure");
  try {
    root.updateMatrixWorld(true);
    for (const side of [-1, 1]) {
      const hits = new Raycaster(
        new Vector3(0.52, 1.65, side * 3),
        new Vector3(0, 0, -side),
      ).intersectObject(root, true);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].point.z * side).toBeGreaterThan(0.08);
    }
  } finally {
    disposeModel(root);
  }
});

it("places each cocktail base on the bar worktop without sinking or lifting", async () => {
  const { createCocktailModel } = await import("./cocktails");
  const { createBarTableModel } = await import("./interiorProps");
  const { supportedPosition } = await import("./placement");
  const { disposeModel } = await import("./models");
  const bar = createBarTableModel();
  try {
    for (const kind of [
      "blueCocktail",
      "layeredMartini",
      "limeHighball",
    ] as const) {
      const drink = createCocktailModel(kind);
      try {
        const position = supportedPosition([bar], [0.7, 0, -0.3], drink);
        expect(position[0]).toBe(0.7);
        expect(position[2]).toBe(-0.3);
        expect(position[1]).toBeGreaterThan(1.14);
        expect(position[1]).toBeLessThan(1.15);
      } finally {
        disposeModel(drink);
      }
    }
  } finally {
    disposeModel(bar);
  }
});

it("fits every thumbnail inside its frame for wide, tall and wall-mounted objects", async () => {
  const { thumbnailCamera } = await import("./ModelThumbnail");
  const { Box3, Vector3 } = await import("three");
  for (const [width, height, depth] of [
    [4, 0.05, 1],
    [0.12, 0.6, 0.12],
    [1, 1.4, 0.02],
    [3.5, 1, 2],
  ]) {
    const bounds = new Box3(
      new Vector3(3, -2, 8),
      new Vector3(3 + width, -2 + height, 8 + depth),
    );
    for (const wall of [false, true]) {
      const camera = thumbnailCamera(bounds, wall);
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const projected = new Vector3(x, y, z).project(camera);
            expect(Math.abs(projected.x)).toBeLessThan(0.85);
            expect(Math.abs(projected.y)).toBeLessThan(0.85);
            expect(Math.abs(projected.z)).toBeLessThan(1);
          }
    }
  }
});

it("keeps the clock in front of real living-room and gallery walls, away from the window", async () => {
  const T = await import("three");
  const { furnishing } = await import("./furnishings");
  const { wallsForDesign, mountedWall, wallFace, wallGap } =
    await import("./walls");
  const { wallPosition } = await import("./placement");
  const { disposeModel } = await import("./models");
  const clock = furnishing("gearClock");
  try {
    const p = emptyProject();
    useApp.getState().load(p);
    useApp.getState().addGardenProp("gearClock");
    const item = useApp
      .getState()
      .project!.instances.find((i) => i.id === useApp.getState().selected)!;
    expect(item.wall).toBe("back");
    for (const scene of ["living", "gallery"] as const) {
      const design = { ...p.design, scene };
      for (const surface of wallsForDesign(design)) {
        const transform = {
          ...item,
          rotation: [...surface.rotation] as [number, number, number],
        };
        const position = wallPosition(surface, [-8, 10, -9], clock, transform);
        const box = new T.Box3()
          .setFromObject(clock)
          .applyMatrix4(
            new T.Matrix4().compose(
              new T.Vector3(...position),
              new T.Quaternion().setFromEuler(
                new T.Euler(...transform.rotation),
              ),
              new T.Vector3(1, 1, 1),
            ),
          );
        const edge =
          surface.sign === 1
            ? box.min.getComponent(surface.axis)
            : box.max.getComponent(surface.axis);
        expect(surface.sign * (edge - wallFace(surface))).toBeCloseTo(
          wallGap,
          5,
        );
        for (const axis of [1, surface.axis === 0 ? 2 : 0]) {
          expect(box.min.getComponent(axis)).toBeGreaterThanOrEqual(
            surface.position[axis] - surface.size[axis] / 2 - 1e-5,
          );
          expect(box.max.getComponent(axis)).toBeLessThanOrEqual(
            surface.position[axis] + surface.size[axis] / 2 + 1e-5,
          );
        }
        expect(mountedWall({ ...item, wall: surface.id }, design)?.id).toBe(
          surface.id,
        );
      }
      expect(mountedWall({ ...item, wall: "free" }, design)).toBeUndefined();
    }
    expect(mountedWall(item, "garden")).toBeUndefined();
    expect(
      wallsForDesign({ ...p.design, scene: "living" })[0].position[0],
    ).toBeGreaterThan(0.5);
  } finally {
    disposeModel(clock);
  }
});

it("supports cups on both round coffee tables, including transformed instances", async () => {
  const T = await import("three");
  const { furnishing } = await import("./furnishings");
  const { createBlueCocktailModel } = await import("./cocktails");
  const { supportedPosition, supportHeight } = await import("./placement");
  const { disposeModel } = await import("./models");
  for (const [kind, height] of [
    ["highCoffeeTable", 0.62],
    ["lowCoffeeTable", 0.4],
  ] as const) {
    const table = furnishing(kind),
      cup = createBlueCocktailModel();
    try {
      expect(supportHeight([table], 0, 0)).toBeCloseTo(height, 5);
      expect(supportHeight([table], 0.3, 0.2)).toBeCloseTo(height, 5);
      expect(supportHeight([table], 0.8, 0.8)).toBe(0);
      table.scale.setScalar(0.8);
      table.rotation.y = 0.71;
      table.position.set(1, 0.2, 2);
      const point = supportedPosition([table], [1.1, 0, 2.1], cup);
      cup.position.fromArray(point);
      cup.updateMatrixWorld(true);
      expect(new T.Box3().setFromObject(cup).min.y).toBeCloseTo(
        0.2 + height * 0.8,
        5,
      );
    } finally {
      disposeModel(table);
      disposeModel(cup);
    }
  }
});

it("keeps the patterned rug thin and supports the blue sofa immediately above it", async () => {
  const T = await import("three");
  const { furnishing } = await import("./furnishings");
  const { supportedPosition, supportHeight } = await import("./placement");
  const { disposeModel } = await import("./models");
  const rug = furnishing("blueBorderRug"),
    sofa = furnishing("blueModularSofa");
  try {
    const bounds = new T.Box3().setFromObject(rug);
    expect(bounds.min.y).toBeCloseTo(0, 6);
    expect(bounds.max.y).toBeLessThan(0.02);
    expect(bounds.max.x - bounds.min.x).toBeCloseTo(3.4, 4);
    expect(bounds.max.z - bounds.min.z).toBeCloseTo(2.6, 4);
    const y = supportHeight([rug], 0, 0);
    sofa.position.fromArray(supportedPosition([rug], [0, 0, 0], sofa));
    expect(new T.Box3().setFromObject(sofa).min.y).toBeCloseTo(y, 5);
    expect(y).toBeGreaterThan(0.012);
    expect(y).toBeLessThan(0.02);
  } finally {
    disposeModel(rug);
    disposeModel(sofa);
  }
});

it("keeps both rugs on the floor beneath furniture during placement and transforms", async () => {
  const T = await import("three");
  const { furnishing } = await import("./furnishings");
  const { floorPosition, floorTransform, isFloorCovering, supportedPosition } =
    await import("./placement");
  const { disposeModel } = await import("./models");
  const table = furnishing("highCoffeeTable");
  for (const fixture of ["rug", "blueBorderRug"] as const) {
    const root = furnishing(fixture);
    const item = {
      id: fixture,
      assetId: "",
      fixture,
      position: [0, 2, 0],
      rotation: [0.4, 0.6, -0.3],
      scale: 1,
      locked: false,
    } as import("./types").Instance;
    try {
      expect(isFloorCovering(item)).toBe(true);
      root.position.fromArray(item.position);
      root.rotation.set(...item.rotation);
      const patch = floorTransform(item, {
        rotation: [0.8, 1.2, 0.4],
        scale: 1.7,
      });
      const position = floorPosition([0.2, 4, 0.1], root, patch);
      root.rotation.set(...patch.rotation!);
      root.scale.setScalar(patch.scale!);
      root.position.fromArray(position);
      expect(position[0]).toBe(0.2);
      expect(position[2]).toBe(0.1);
      expect(new T.Box3().setFromObject(root).min.y).toBeCloseTo(0, 6);
      expect(patch.rotation).toEqual([0, 1.2, 0]);
      // The same location still supports ordinary objects on the tabletop.
      const cup = furnishing("plant");
      try {
        expect(
          supportedPosition([table, root], [0, 0, 0], cup)[1],
        ).toBeGreaterThan(0.6);
      } finally {
        disposeModel(cup);
      }
    } finally {
      disposeModel(root);
    }
  }
  disposeModel(table);
});

it("applies the floor constraint to numeric and live rug edits, with undo and independent copies", async () => {
  const { isFloorCovering } = await import("./placement");
  const p = emptyProject();
  p.instances = [
    {
      id: "rug",
      assetId: "",
      fixture: "blueBorderRug",
      scene: p.design.scene,
      position: [1, 0, 2],
      rotation: [0, 0, 0],
      scale: 1,
      locked: false,
    },
  ];
  useApp.getState().load(p);
  useApp.setState({
    resolvePlacement: (id, position) => [
      position[0],
      isFloorCovering(
        useApp.getState().project!.instances.find((i) => i.id === id),
      )
        ? 0
        : 2,
      position[2],
    ],
  });
  try {
    useApp
      .getState()
      .transform("rug", { position: [2, 3, 4], rotation: [1, 0.6, 2] });
    let rug = useApp.getState().project!.instances.find((i) => i.id === "rug")!;
    expect(rug.position).toEqual([2, 0, 4]);
    expect(rug.rotation).toEqual([0, 0.6, 0]);
    useApp.getState().undo();
    expect(
      useApp.getState().project!.instances.find((i) => i.id === "rug")!
        .position,
    ).toEqual([1, 0, 2]);
    useApp
      .getState()
      .liveTransform("rug", { position: [3, 5, 6], rotation: [1, 0.8, 1] });
    rug = useApp.getState().project!.instances.find((i) => i.id === "rug")!;
    expect(rug.position).toEqual([3, 0, 6]);
    expect(rug.rotation).toEqual([0, 0.8, 0]);
    useApp.getState().select("rug");
    useApp.getState().duplicate();
    useApp
      .getState()
      .transform(useApp.getState().selected!, { position: [-1, 8, -2] });
    expect(
      useApp.getState().project!.instances.find((i) => i.id === "rug")!
        .position,
    ).toEqual([3, 0, 6]);
    expect(
      useApp
        .getState()
        .project!.instances.find((i) => i.id === useApp.getState().selected)!
        .position,
    ).toEqual([-1, 0, -2]);
  } finally {
    useApp.setState({ resolvePlacement: null });
  }
});

describe("Pickscape brand compatibility", () => {
  it("renames legacy defaults while preserving custom project names and saved content", async () => {
    const { projectDisplayName } = await import("./types");
    expect(projectDisplayName("我的异度空间 · 导入")).toBe(
      "我的拾境空间 · 导入",
    );
    expect(projectDisplayName("我的异度空间收藏展")).toBe("我的异度空间收藏展");
    const original = fixture();
    original.name = "我的异度空间";
    original.camera.position = [6, 5, 4];
    useApp.getState().load(original);
    const migrated = useApp.getState().project!;
    expect(migrated.name).toBe("我的拾境空间");
    expect(migrated.id).toBe(original.id);
    expect(migrated.photos).toEqual(original.photos);
    expect(migrated.camera).toEqual(original.camera);
    await saveProject(migrated);
    expect((await readProject(migrated.id))?.name).toBe("我的拾境空间");
  });
});

describe("Object inventory and original photo collection", () => {
  it("keeps placed copies, stowed copies and other scenes separate through placement and undo", async () => {
    const { inventoryFor } = await import("./furnishings");
    const state = useApp.getState();
    state.add("a");
    const placedId = useApp.getState().selected!;
    state.duplicate();
    const storedId = useApp.getState().selected!;
    state.transform(storedId, { stowed: true });
    state.add("a");
    const otherId = useApp.getState().selected!;
    state.transform(otherId, { scene: "garden" });
    let groups = inventoryFor(useApp.getState().project!);
    expect(groups.placed.map((i) => i.id)).toEqual([placedId]);
    expect(groups.stored.map((i) => i.id)).toEqual([storedId]);
    expect(groups.elsewhere.map((i) => i.id)).toEqual([otherId]);
    state.placeItem(storedId);
    groups = inventoryFor(useApp.getState().project!);
    expect(groups.placed.map((i) => i.id)).toEqual([placedId, storedId]);
    expect(groups.stored).toEqual([]);
    state.undo();
    expect(
      inventoryFor(useApp.getState().project!).stored.map((i) => i.id),
    ).toEqual([storedId]);
    state.design({ scene: "garden" });
    expect(
      inventoryFor(useApp.getState().project!).placed.map((i) => i.id),
    ).toEqual([otherId]);
  });
  it("adds every reference once, groups shared originals, and preserves uploads and backup photos", async () => {
    const { referenceCollection, loadReferencePhotos } =
      await import("./collection");
    const load = vi.fn(async () => ({
      blob: new Blob(["original"], { type: "image/png" }),
      thumb: new Blob(["thumb"], { type: "image/webp" }),
    }));
    const p = fixture();
    const original = p.photos[0];
    const result = await loadReferencePhotos(p.photos, load);
    expect(result.failures).toBe(0);
    expect(result.photos).toHaveLength(referenceCollection.length);
    expect(
      referenceCollection.find((entry) =>
        entry.items.some((item) => item.kind === "blueCocktail"),
      )!.items,
    ).toHaveLength(3);
    p.photos.push(...result.photos);
    expect(p.photos[0]).toBe(original);
    load.mockClear();
    expect((await loadReferencePhotos(p.photos, load)).photos).toEqual([]);
    expect(load).not.toHaveBeenCalled();
    validateProject(p);
    await saveProject(p);
    expect((await readProject(p.id))!.photos.map((photo) => photo.id)).toEqual(
      p.photos.map((photo) => photo.id),
    );
    p.assets[0].status = "pending";
    const zip = unzipSync(
      new Uint8Array(await (await exportProject(p)).arrayBuffer()),
    );
    const manifest = JSON.parse(strFromU8(zip["project.json"]));
    expect(manifest.photos).toHaveLength(p.photos.length);
    expect(manifest.photos.at(-1).referenceKey).toBe(
      p.photos.at(-1)!.referenceKey,
    );
  });
  it("retains successful photos after a failed load and retries only missing originals", async () => {
    const { referenceCollection, loadReferencePhotos } =
      await import("./collection");
    const load = vi.fn(async (url: string) => {
      if (url === referenceCollection[0].url) throw new Error("offline");
      return { blob: new Blob([url]), thumb: new Blob([url]) };
    });
    const first = await loadReferencePhotos([], load);
    expect(first.failures).toBe(1);
    expect(first.photos).toHaveLength(referenceCollection.length - 1);
    load.mockClear();
    await loadReferencePhotos(first.photos, load);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
