import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Asset } from "./types";
const material = (color: string, roughness = 0.5, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
function mesh(
  g: THREE.BufferGeometry,
  m: THREE.Material,
  position: number[] = [0, 0, 0],
  name = "part",
) {
  const o = new THREE.Mesh(g, m);
  o.position.set(...(position as [number, number, number]));
  o.name = name;
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}
function box(size: number[], pos: number[], m: THREE.Material, name: string) {
  return mesh(
    new RoundedBoxGeometry(size[0], size[1], size[2], 3, 0.025),
    m,
    pos,
    name,
  );
}
function lathe(points: number[][], m: THREE.Material, name: string) {
  return mesh(
    new THREE.LatheGeometry(
      points.map((p) => new THREE.Vector2(...(p as [number, number]))),
      64,
    ),
    m,
    [0, 0, 0],
    name,
  );
}
export function createMug() {
  const root = new THREE.Group(),
    m = material("#aaa695", 0.26);
  root.name = "陶瓷杯";
  root.add(
    lathe(
      [
        [0, 0.018],
        [0.14, 0.018],
        [0.166, 0.027],
        [0.171, 0.05],
        [0.171, 0.46],
        [0.169, 0.477],
        [0.159, 0.482],
        [0.15, 0.473],
        [0.15, 0.065],
        [0.135, 0.052],
        [0, 0.052],
      ],
      m,
      "cup-shell",
    ),
  );
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.16, 0.395, 0),
    new THREE.Vector3(0.255, 0.398, 0),
    new THREE.Vector3(0.294, 0.32, 0),
    new THREE.Vector3(0.282, 0.22, 0),
    new THREE.Vector3(0.17, 0.135, 0),
  ]);
  root.add(
    mesh(
      new THREE.TubeGeometry(curve, 48, 0.025, 12, false),
      m,
      [0, 0, 0],
      "handle",
    ),
  );
  return root;
}
export function createLamp() {
  const root = new THREE.Group();
  root.name = "白瓷台灯";
  const brass = material("#9a895b", 0.3, 0.72),
    cream = material("#f4eee4", 0.24);
  root.add(
    lathe(
      [
        [0, 0],
        [0.245, 0],
        [0.257, 0.016],
        [0.257, 0.042],
        [0.248, 0.055],
        [0, 0.055],
      ],
      brass,
      "base",
    ),
  );
  root.add(
    mesh(
      new THREE.CylinderGeometry(0.022, 0.025, 0.68, 24),
      brass,
      [0, 0.39, 0],
      "stem",
    ),
  );
  const shade = lathe(
    [
      [0.43, 0.69],
      [0.43, 0.73],
      [0.426, 0.8],
      [0.4, 0.88],
      [0.35, 0.94],
      [0.27, 0.976],
      [0.15, 0.985],
      [0.15, 0.972],
      [0.27, 0.961],
      [0.34, 0.925],
      [0.386, 0.867],
      [0.414, 0.79],
      [0.417, 0.69],
    ],
    cream,
    "shade",
  );
  root.add(shade);
  root.add(
    mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.012, 48),
      brass,
      [0, 0.99, 0],
      "top-cap",
    ),
  );
  const bulb = material("#fff8db", 0.4);
  (bulb as THREE.MeshStandardMaterial).emissive.set("#ead5a6");
  root.add(
    mesh(new THREE.SphereGeometry(0.06, 20, 16), bulb, [0, 0.73, 0], "bulb"),
  );
  const cord = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.04, -0.18),
    new THREE.Vector3(0.1, 0.025, -0.3),
    new THREE.Vector3(0.16, 0.025, -0.44),
  ]);
  root.add(
    mesh(
      new THREE.TubeGeometry(cord, 16, 0.007, 6, false),
      material("#c6bdac"),
      [0, 0, 0],
      "cord",
    ),
  );
  return root;
}
export function createChair() {
  const root = new THREE.Group();
  root.name = "木椅";
  const wood = material("#aa8b61", 0.66),
    wear = material("#ac8170", 0.75);
  root.add(box([0.82, 0.075, 0.8], [0, 0.77, 0], wood, "seat"));
  root.add(box([0.82, 0.11, 0.055], [0, 0.72, 0.37], wear, "front-apron"));
  for (const x of [-0.355, 0.355])
    for (const z of [-0.32, 0.32]) {
      const leg = box(
        [0.072, 0.75, 0.072],
        [x, 0.375, z],
        wood,
        `leg-${x}-${z}`,
      );
      leg.rotation.z = -x * 0.08;
      root.add(leg);
      if (z > 0)
        for (let k = 0; k < 3; k++)
          root.add(
            box(
              [0.078, 0.009, 0.078],
              [x, 0.57 + k * 0.019, z],
              wood,
              "leg-groove",
            ),
          );
    }
  for (const x of [-0.35, 0.35]) {
    const post = box([0.07, 0.96, 0.07], [x, 1.17, -0.38], wood, "back-post");
    post.rotation.x = -0.09;
    root.add(post);
    root.add(box([0.05, 0.055, 0.69], [x, 0.36, 0], wood, "side-stretcher"));
  }
  root.add(box([0.71, 0.06, 0.05], [0, 1.08, -0.375], wood, "lower-back-rail"));
  for (let k = 0; k < 9; k++) {
    const slat = box(
      [0.014, 0.49, 0.027],
      [(k - 4) * 0.061, 1.34, -0.4],
      wood,
      "back-splat-" + k,
    );
    slat.rotation.x = -0.09;
    root.add(slat);
  }
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.44, 1.58, -0.4),
    new THREE.Vector3(0, 1.62, -0.45),
    new THREE.Vector3(0.44, 1.58, -0.4),
  ]);
  root.add(
    mesh(
      new THREE.TubeGeometry(curve, 28, 0.05, 12, false),
      wear,
      [0, 0, 0],
      "curved-top-rail",
    ),
  );
  root.add(box([0.7, 0.055, 0.05], [0, 0.37, 0.29], wood, "front-stretcher"));
  return root;
}

const factories = { mug: createMug, lamp: createLamp, chair: createChair };
export function modelFor(asset: Asset) {
  return asset.kind === "glb" ? null : factories[asset.kind]();
}
export function inspectGlb(buffer: ArrayBuffer) {
  if (buffer.byteLength < 20 || buffer.byteLength > 50 * 1024 * 1024)
    throw new Error("模型须为不超过 50 MB 的 GLB 文件。");
  const v = new DataView(buffer);
  if (
    v.getUint32(0, true) !== 0x46546c67 ||
    v.getUint32(4, true) !== 2 ||
    v.getUint32(8, true) !== buffer.byteLength
  )
    throw new Error("文件不是有效的 GLB 2.0。");
  const len = v.getUint32(12, true);
  if (v.getUint32(16, true) !== 0x4e4f534a || 20 + len > buffer.byteLength)
    throw new Error("GLB 模型结构无效。");
  const j = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 20, len)),
  );
  for (const a of [...(j.buffers || []), ...(j.images || [])])
    if (a.uri && !a.uri.startsWith("data:"))
      throw new Error("请导入自包含 GLB，模型不能引用外部文件。");
  if (
    (j.extensionsRequired || []).some((e: string) =>
      [
        "KHR_draco_mesh_compression",
        "EXT_meshopt_compression",
        "KHR_texture_basisu",
      ].includes(e),
    )
  )
    throw new Error("请导出不含 Draco、Meshopt 或 KTX 压缩的 GLB。");
  return j;
}
export async function parseModel(blob: Blob, preserveScale = false) {
  const buffer = await blob.arrayBuffer();
  inspectGlb(buffer);
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (!url.startsWith("blob:") && !url.startsWith("data:"))
      throw new Error("禁止模型加载外部文件");
    return url;
  });
  const gltf = await new GLTFLoader(manager).parseAsync(buffer, "");
  const root = gltf.scene;
  let triangles = 0;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      triangles +=
        (o.geometry.index?.count ||
          o.geometry.attributes.position?.count ||
          0) / 3;
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  if (!triangles || triangles > 1_000_000) {
    disposeModel(root);
    throw new Error("模型为空或过于复杂，请使用少于 100 万三角面的模型。");
  }
  const bounds = new THREE.Box3().setFromObject(root),
    size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.length()) || size.length() < 0.00001) {
    disposeModel(root);
    throw new Error("模型尺寸无效。");
  }
  if (preserveScale) return root;
  const scale = 1.6 / Math.max(size.x, size.y, size.z),
    center = bounds.getCenter(new THREE.Vector3());
  root.scale.multiplyScalar(scale);
  root.position.set(
    -center.x * scale,
    -bounds.min.y * scale,
    -center.z * scale,
  );
  const outer = new THREE.Group();
  outer.add(root);
  return outer;
}
export function disposeModel(root: THREE.Object3D) {
  const gs = new Set<THREE.BufferGeometry>(),
    ms = new Set<THREE.Material>(),
    ts = new Set<THREE.Texture>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      gs.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        ms.add(m);
        for (const v of Object.values(m))
          if (v instanceof THREE.Texture) ts.add(v);
      }
    }
  });
  gs.forEach((g) => g.dispose());
  ms.forEach((m) => m.dispose());
  ts.forEach((t) => t.dispose());
}
