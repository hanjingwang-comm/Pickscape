import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
type V = [number, number, number];
type Stage = "structure" | "complete";
function assembly(name: string) {
  const root = new T.Group();
  root.name = name;
  const buckets = new Map<
    string,
    { name: string; material: T.Material; geometries: T.BufferGeometry[] }
  >();
  const add = (
    name: string,
    geometry: T.BufferGeometry,
    material: T.Material,
    p: V = [0, 0, 0],
    rotation: V = [0, 0, 0],
  ) => {
    geometry.applyMatrix4(
      new T.Matrix4().compose(
        new T.Vector3(...p),
        new T.Quaternion().setFromEuler(new T.Euler(...rotation)),
        new T.Vector3(1, 1, 1),
      ),
    );
    geometry.deleteAttribute("uv");
    if (geometry.index) {
      const g = geometry.toNonIndexed();
      geometry.dispose();
      geometry = g;
    }
    const key = name + material.uuid;
    if (!buckets.has(key)) buckets.set(key, { name, material, geometries: [] });
    buckets.get(key)!.geometries.push(geometry);
  };
  const finish = () => {
    for (const b of buckets.values()) {
      const mesh = new T.Mesh(mergeGeometries(b.geometries)!, b.material);
      mesh.name = b.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      b.geometries.forEach((g) => g.dispose());
    }
    root.updateMatrixWorld(true);
    const min = new T.Box3().setFromObject(root).min.y;
    root.children.forEach((o) => (o as T.Mesh).geometry.translate(0, -min, 0));
    root.userData.approximation =
      "按用户参考照片近似重建，背面、尺寸和内部结构为推测";
    return root;
  };
  return { add, finish };
}
const material = (color: string, roughness = 0.8, metalness = 0) =>
  new T.MeshStandardMaterial({ color, roughness, metalness });
const lathe = (points: [number, number][], segments = 64) =>
  new T.LatheGeometry(
    points.map((p) => new T.Vector2(...p)),
    segments,
  );

/** Two independent members of a nesting-table pair; tops are real horizontal surfaces. */
export function createRoundCoffeeTableModel(
  kind: "highCoffeeTable" | "lowCoffeeTable",
  stage: Stage = "complete",
) {
  const high = kind === "highCoffeeTable",
    radius = high ? 0.61 : 0.64,
    height = high ? 0.62 : 0.4;
  const b = assembly(high ? "黑面高圆茶几" : "白面低圆茶几");
  const steel = material("#252727", 0.58, 0.6),
    top = material(high ? "#323437" : "#e6e5e2", high ? 0.5 : 0.32),
    wood = material("#73513e", 0.79);
  wood.vertexColors = true;
  const drumTop = height - 0.025,
    drumBottom = drumTop - 0.19;
  b.add(
    "黑钢圆环底座",
    new T.TorusGeometry(radius - 0.052, 0.014, 8, 64),
    steel,
    [0, 0.014, 0],
    [Math.PI / 2, 0, 0],
  );
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    b.add(
      "黑钢支腿",
      new T.BoxGeometry(0.027, drumBottom - 0.01, 0.027),
      steel,
      [
        Math.cos(a) * (radius - 0.052),
        (0.01 + drumBottom) / 2,
        Math.sin(a) * (radius - 0.052),
      ],
      [0, -a, 0],
    );
  }
  const drum = new T.CylinderGeometry(
    radius - 0.012,
    radius - 0.012,
    0.19,
    96,
    20,
  );
  const pos = drum.attributes.position,
    colors: number[] = [];
  const pale = new T.Color("#8c6950"),
    deep = new T.Color("#553829");
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getZ(i), pos.getX(i)),
      y = pos.getY(i);
    const grain =
      0.53 +
      0.11 * Math.sin(y * 780 + Math.sin(a * 7) * 1.8) +
      0.1 * Math.sin(y * 190 + a * 3) +
      0.06 * Math.sin(a * 36);
    const c = deep.clone().lerp(pale, stage === "complete" ? grain : 0.55);
    colors.push(c.r, c.g, c.b);
  }
  drum.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  // Vertex colors already contain the wood albedo.
  wood.color.set("#ffffff");
  b.add("胡桃木圆鼓围板", drum, wood, [0, (drumTop + drumBottom) / 2, 0]);
  b.add(
    high ? "黑色薄台面" : "白色薄台面",
    lathe([
      [0, height - 0.026],
      [radius - 0.006, height - 0.026],
      [radius, height - 0.021],
      [radius, height - 0.005],
      [radius - 0.006, height],
      [0, height],
    ]),
    top,
  );
  if (stage === "complete") {
    const seam = material("#4a352b", 0.93);
    for (const a of [-0.5, 0.5]) {
      const r = radius - 0.0105;
      b.add(
        "弧形抽屉接缝",
        new T.CylinderGeometry(0.0015, 0.0015, 0.182, 5),
        seam,
        [Math.sin(a) * r, (drumTop + drumBottom) / 2, Math.cos(a) * r],
      );
    }
    b.add(
      "围板底缘",
      new T.TorusGeometry(radius - 0.012, 0.002, 5, 96),
      seam,
      [0, drumBottom + 0.003, 0],
      [Math.PI / 2, 0, 0],
    );
  }
  return b.finish();
}
export const createHighCoffeeTableModel = (stage: Stage = "complete") =>
  createRoundCoffeeTableModel("highCoffeeTable", stage);
export const createLowCoffeeTableModel = (stage: Stage = "complete") =>
  createRoundCoffeeTableModel("lowCoffeeTable", stage);

const signed = (v: number, power: number) =>
  Math.sign(v) * Math.pow(Math.abs(v), power);
/** Dense closed pillow with real button depressions and radial fabric gathering. */
function pillow(size: V, tufts: [number, number][], detailed: boolean) {
  const geometry = new T.SphereGeometry(1, 56, 36),
    a = geometry.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const nx = a.getX(i),
      ny = a.getY(i),
      nz = a.getZ(i);
    const x = (signed(nx, 0.61) * size[0]) / 2,
      y = (signed(ny, 0.65) * size[1]) / 2;
    let z = (signed(nz, 0.78) * size[2]) / 2;
    if (nz > 0 && detailed) {
      for (const [tx, ty] of tufts) {
        const dx = x - tx,
          dy = y - ty,
          r = Math.hypot(dx, dy),
          angle = Math.atan2(dy, dx);
        z -= size[2] * 0.36 * Math.exp((-r * r) / 0.0045) * Math.pow(nz, 0.25);
        z +=
          0.005 *
          Math.sin(angle * 19 + r * 62) *
          Math.exp(-r * 7) *
          Math.min(1, r / 0.024) *
          Math.pow(nz, 0.2);
      }
      const edge = Math.max(
        Math.abs(x) / (size[0] / 2),
        Math.abs(y) / (size[1] / 2),
      );
      z +=
        0.0045 *
        Math.sin(x * 180 + y * 64) *
        Math.pow(edge, 7) *
        Math.pow(nz, 0.3);
    }
    a.setXYZ(i, x, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}
export function createLoungeChairModel(stage: Stage = "complete") {
  const b = assembly("奶油软包懒人沙发"),
    cloth = material("#e6deca", 0.99),
    seam = material("#c9bda4", 0.96),
    shell = material("#2a2924", 0.7),
    base = material("#272722", 0.48, 0.65);
  const detailed = stage === "complete";
  b.add(
    "喇叭形圆底座",
    lathe([
      [0, 0],
      [0.32, 0],
      [0.36, 0.015],
      [0.358, 0.029],
      [0.32, 0.055],
      [0.23, 0.085],
      [0.13, 0.115],
      [0.075, 0.18],
      [0.065, 0.31],
      [0, 0.31],
    ]),
    base,
  );
  // Continuous egg-shaped bucket. A closed double surface curves from the seat to the back.
  const profile = new T.CatmullRomCurve3([
    new T.Vector3(0, 0.38, 0.73),
    new T.Vector3(0, 0.32, 0.55),
    new T.Vector3(0, 0.315, 0.18),
    new T.Vector3(0, 0.43, -0.12),
    new T.Vector3(0, 0.7, -0.345),
    new T.Vector3(0, 1.0, -0.47),
    new T.Vector3(0, 1.17, -0.425),
    new T.Vector3(0, 1.17, -0.4),
  ]);
  const widths = new T.CatmullRomCurve3(
    [0, 0.44, 0.505, 0.46, 0.48, 0.48, 0.32, 0].map(
      (x) => new T.Vector3(x, 0, 0),
    ),
  );
  const vertices: number[] = [],
    indices: number[] = [],
    rows = 56,
    cols = 40;
  for (let side = 0; side < 2; side++)
    for (let row = 0; row <= rows; row++)
      for (let col = 0; col <= cols; col++) {
        const t = row / rows,
          u = (col / cols) * 2 - 1,
          p = profile.getPoint(t),
          tangent = profile.getTangent(t);
        const normal = new T.Vector3(0, -tangent.z, tangent.y).normalize();
        p.x = u * Math.max(0, widths.getPoint(t).x);
        p.addScaledVector(
          normal,
          0.09 * u * u * Math.min(1, Math.max(0, widths.getPoint(t).x) / 0.3) -
            (side ? 0.045 : 0),
        );
        vertices.push(...p.toArray());
      }
  const stride = cols + 1,
    offset = (rows + 1) * stride;
  for (let side = 0; side < 2; side++)
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const a = side * offset + row * stride + col,
          c = a + stride;
        if (side === 0) indices.push(a, a + 1, c, a + 1, c + 1, c);
        else indices.push(a, c, a + 1, a + 1, c, c + 1);
      }
  for (let row = 0; row < rows; row++)
    for (const col of [0, cols]) {
      const a = row * stride + col,
        c = a + stride;
      if (col === 0) indices.push(a, c, a + offset, c, c + offset, a + offset);
      else indices.push(a, a + offset, c, c, a + offset, c + offset);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  b.add("深色蛋形承托壳", g, shell);
  const pad = (
    name: string,
    size: V,
    p: V,
    rotation: V,
    tufts: [number, number][],
    piped = false,
  ) => {
    b.add(name, pillow(size, tufts, detailed), cloth, p, rotation);
    if (detailed && piped) {
      const points = Array.from({ length: 81 }, (_, i) => {
        const a = (i / 80) * Math.PI * 2;
        return new T.Vector3(
          (signed(Math.cos(a), 0.61) * size[0]) / 2,
          (signed(Math.sin(a), 0.65) * size[1]) / 2,
          0.005,
        );
      });
      b.add(
        "软包滚边",
        new T.TubeGeometry(
          new T.CatmullRomCurve3(points, true),
          88,
          0.0025,
          5,
          true,
        ),
        seam,
        p,
        rotation,
      );
    }
    if (detailed)
      for (const [x, y] of tufts) {
        const button = new T.SphereGeometry(0.012, 12, 8)
          .scale(1, 1, 0.38)
          .translate(x, y, size[2] * 0.13);
        b.add("包布凹扣", button, cloth, p, rotation);
      }
  };
  pad(
    "双扣厚头枕",
    [1.0, 0.46, 0.26],
    [0, 0.984, -0.325],
    [-0.3, 0, 0],
    [
      [-0.205, 0.005],
      [0.205, 0.005],
    ],
    true,
  );
  pad(
    "凹陷腰靠",
    [0.89, 0.46, 0.25],
    [0, 0.675, -0.14],
    [-0.51, 0, 0],
    [
      [-0.15, 0.025],
      [0.15, 0.025],
    ],
    true,
  );
  pad(
    "宽厚下陷座垫",
    [0.96, 0.85, 0.24],
    [0, 0.465, 0.31],
    [-Math.PI / 2, 0, 0],
    [
      [-0.18, -0.1],
      [0.18, -0.1],
    ],
    true,
  );
  for (const sign of [-1, 1])
    pad(
      "环抱软扶手",
      [0.25, 0.73, 0.26],
      [sign * 0.427, 0.589, 0.24],
      [-1.0, sign * 0.2, -sign * 0.27],
      [],
      true,
    );
  if (!detailed) seam.dispose();
  return b.finish();
}
