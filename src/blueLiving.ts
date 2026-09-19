import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
type V = [number, number, number];
type Stage = "structure" | "complete";
const fabric = (color: string) =>
  new T.MeshStandardMaterial({ color, roughness: 0.98 });
function builder(name: string) {
  const root = new T.Group();
  root.name = name;
  const buckets = new Map<
    T.Material,
    { names: Set<string>; gs: T.BufferGeometry[] }
  >();
  const add = (
    name: string,
    g: T.BufferGeometry,
    m: T.Material,
    p: V = [0, 0, 0],
    r: V = [0, 0, 0],
  ) => {
    g.applyMatrix4(
      new T.Matrix4().compose(
        new T.Vector3(...p),
        new T.Quaternion().setFromEuler(new T.Euler(...r)),
        new T.Vector3(1, 1, 1),
      ),
    );
    g.deleteAttribute("uv");
    if (g.index) {
      const flat = g.toNonIndexed();
      g.dispose();
      g = flat;
    }
    if (!buckets.has(m)) buckets.set(m, { names: new Set(), gs: [] });
    buckets.get(m)!.names.add(name);
    buckets.get(m)!.gs.push(g);
  };
  const box = (
    name: string,
    size: V,
    p: V,
    m: T.Material,
    radius = 0,
    r: V = [0, 0, 0],
  ) =>
    add(
      name,
      radius
        ? new RoundedBoxGeometry(...size, 4, radius)
        : new T.BoxGeometry(...size),
      m,
      p,
      r,
    );
  const finish = () => {
    for (const [m, b] of buckets) {
      const mesh = new T.Mesh(mergeGeometries(b.gs)!, m);
      mesh.name = [...b.names].join(" · ");
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      b.gs.forEach((g) => g.dispose());
    }
    root.updateMatrixWorld(true);
    const min = new T.Box3().setFromObject(root).min.y;
    root.children.forEach((o) => (o as T.Mesh).geometry.translate(0, -min, 0));
    root.userData.approximation = "按用户照片近似重建；背面、尺寸与细部为推测";
    return root;
  };
  return { add, box, finish };
}
export function createBlueBorderRugModel(stage: Stage = "complete") {
  const b = builder("红白边框蓝色地毯"),
    cream = fabric("#e5d7b9"),
    red = fabric("#a82a27"),
    blue = fabric("#185784");
  b.box("米白织物基底", [3.4, 0.012, 2.6], [0, 0.006, 0], cream);
  b.box("蓝色绒面中心", [2.85, 0.004, 1.98], [0, 0.014, 0], blue);
  for (const x of [-1.595, 1.595])
    b.box("红色长边", [0.135, 0.003, 2.41], [x, 0.0135, 0], red);
  for (const z of [-1.215, 1.215])
    for (let i = 0; i < 9; i++)
      b.box(
        "红色分段边框",
        [0.294, 0.003, 0.128],
        [-1.424 + i * 0.356, 0.0135, z],
        red,
      );
  if (stage === "complete") {
    for (const z of [-1.058, 1.058])
      for (let i = 0; i < 83; i++)
        b.box(
          "内圈红白细条纹",
          [0.013, 0.002, 0.11],
          [-1.45 + i * 0.035, 0.013, z],
          red,
        );
    for (const x of [-1.487, 1.487])
      for (let i = 0; i < 57; i++)
        b.box(
          "内圈红白细条纹",
          [0.095, 0.002, 0.013],
          [x, 0.013, -0.98 + i * 0.035],
          red,
        );
    // Shallow weave is real geometry and stays portable without texture URLs.
    const thread = fabric("#205c87");
    for (let i = 0; i < 100; i++)
      b.box(
        "蓝色细织纹",
        [2.81, 0.0005, 0.0013],
        [0, 0.01625, -0.965 + i * 0.0195],
        thread,
      );
    for (const x of [-1.691, 1.691])
      b.box("锁边线", [0.003, 0.002, 2.57], [x, 0.012, 0], cream);
  }
  return b.finish();
}
export function createBlueModularSofaModel(stage: Stage = "complete") {
  const b = builder("深蓝模块布艺沙发"),
    cloth = fabric("#164364"),
    side = fabric("#143650"),
    rib = fabric("#245171"),
    feet = fabric("#26292b");
  for (const x of [-1.12, 1.07])
    for (const z of [-0.32, 0.22])
      b.box("隐藏底脚", [0.09, 0.035, 0.09], [x, 0.0175, z], feet, 0.01);
  b.box("左侧窄座块", [0.83, 0.46, 0.94], [-0.87, 0.265, -0.08], cloth, 0.115);
  b.box("右侧宽座块", [1.66, 0.46, 1.1], [0.415, 0.265, 0.0], cloth, 0.12);
  b.box("左分段靠背", [0.85, 0.79, 0.22], [-0.87, 0.44, -0.46], side, 0.055);
  b.box("右分段靠背", [1.6, 0.79, 0.22], [0.385, 0.44, -0.46], cloth, 0.055);
  b.box("右高扶手", [0.2, 0.83, 1.13], [1.31, 0.445, -0.015], side, 0.042);
  b.box("左侧低扶手", [0.13, 0.63, 0.71], [-1.31, 0.35, -0.205], side, 0.038);
  if (stage === "structure") {
    rib.dispose();
    return b.finish();
  }
  // Waterfall ribbing follows the small module's top and rounded front edge.
  for (let i = 0; i < 16; i++) {
    const x = -1.235 + i * 0.049;
    b.add(
      "左座纵向压纹",
      new T.TubeGeometry(
        new T.CatmullRomCurve3([
          new T.Vector3(x, 0.496, -0.32),
          new T.Vector3(x, 0.496, 0.22),
          new T.Vector3(x, 0.48, 0.31),
          new T.Vector3(x, 0.42, 0.385),
          new T.Vector3(x, 0.29, 0.393),
          new T.Vector3(x, 0.09, 0.393),
        ]),
        28,
        0.0027,
        5,
        false,
      ),
      rib,
    );
  }
  // Checker pillow: curved patches are baked onto the same rounded pillow surface.
  const tan = fabric("#b49e7a"),
    brown = fabric("#474335"),
    ivory = fabric("#d5c8a7");
  const pillowPosition: V = [-0.85, 0.665, -0.22],
    rotation: V = [-0.2, 0.08, -0.11];
  b.box("格纹方枕", [0.39, 0.4, 0.11], pillowPosition, tan, 0.05, rotation);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      const x = -0.146 + col * 0.0973,
        y = -0.15 + row * 0.1;
      const patch = new T.PlaneGeometry(0.095, 0.098, 5, 5),
        p = patch.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i) + x,
          py = p.getY(i) + y;
        // RoundedBox corner surface recedes at the perimeter.
        const ex = Math.max(0, Math.abs(px) - 0.145),
          ey = Math.max(0, Math.abs(py) - 0.15);
        const z =
          0.006 + Math.sqrt(Math.max(0.0001, 0.05 * 0.05 - ex * ex - ey * ey));
        p.setXYZ(i, px, py, z + 0.001);
      }
      patch.computeVertexNormals();
      b.add(
        "方枕棋盘格",
        patch,
        (row + col) % 2 ? brown : ivory,
        pillowPosition,
        rotation,
      );
    }
  const red = fabric("#9f4631"),
    white = fabric("#d9c5a1"),
    stripeBlue = fabric("#3b5c6d");
  // Horizontal bolster with individually modelled stripe segments and rounded end caps.
  const center: V = [0.56, 0.58, -0.21],
    length = 0.8,
    radius = 0.09;
  for (let i = 0; i < 36; i++) {
    const g = new T.CylinderGeometry(
      radius,
      radius,
      length / 36 + 0.0003,
      24,
      1,
      true,
    ).rotateZ(Math.PI / 2);
    b.add("条纹圆柱长枕", g, [white, red, white, stripeBlue][i % 4], [
      center[0] - length / 2 + ((i + 0.5) * length) / 36,
      center[1],
      center[2],
    ]);
  }
  for (const sign of [-1, 1])
    b.add(
      "长枕包边端头",
      new T.SphereGeometry(radius, 20, 12).scale(0.25, 1, 1),
      white,
      [center[0] + (sign * length) / 2, center[1], center[2]],
    );
  return b.finish();
}
