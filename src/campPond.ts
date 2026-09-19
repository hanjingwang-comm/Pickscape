import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
type V = [number, number, number];
type Stage = "structure" | "complete";
function builder(name: string) {
  const root = new T.Group();
  root.name = name;
  const buckets = new Map<
    string,
    { name: string; g: T.BufferGeometry[]; m: T.Material }
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
    const id = name + m.uuid;
    if (!buckets.has(id)) buckets.set(id, { name, g: [], m });
    buckets.get(id)!.g.push(g);
  };
  const box = (name: string, size: V, p: V, m: T.Material, bevel = 0.006) =>
    add(name, new RoundedBoxGeometry(...size, 2, bevel), m, p);
  const tube = (
    name: string,
    points: V[],
    radius: number,
    m: T.Material,
    segments = 24,
  ) =>
    add(
      name,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        segments,
        radius,
        8,
        false,
      ),
      m,
    );
  const beam = (name: string, a: V, b: V, r: number, m: T.Material) => {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b);
    const g = new T.CylinderGeometry(r, r, start.distanceTo(end), 12);
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        end.clone().sub(start).normalize(),
      ),
    );
    g.translate(...(start.add(end).multiplyScalar(0.5).toArray() as V));
    add(name, g, m);
  };
  const finish = () => {
    for (const b of buckets.values()) {
      const mesh = new T.Mesh(mergeGeometries(b.g)!, b.m);
      mesh.name = b.name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      b.g.forEach((g) => g.dispose());
    }
    const min = new T.Box3().setFromObject(root).min.y;
    root.children.forEach((o) => (o as T.Mesh).geometry.translate(0, -min, 0));
    root.userData.approximation = "照片近似重建，背面、尺寸与内部构造为推测";
    return root;
  };
  return { add, box, tube, beam, finish };
}
const mat = (color: string, roughness = 0.8, metalness = 0) =>
  new T.MeshStandardMaterial({ color, roughness, metalness });
function fabricPoint(u: number, t: number): V {
  const width =
    0.312 +
    0.066 * t -
    0.018 * (Math.exp(-t * t * 800) + Math.exp(-(1 - t) * (1 - t) * 800));
  const y =
    0.49 -
    0.102 * Math.sin(Math.PI * t) +
    0.5 * t * t +
    0.3 * Math.pow(Math.abs(u), 3) * Math.sin(Math.PI * t) -
    0.055 * (1 - u * u) * Math.pow(1 - t, 4) -
    0.025 * Math.pow(Math.abs(u), 8) * Math.pow(t, 8);
  const fold =
    0.004 *
    Math.sin(u * 24 + t * 7) *
    Math.sin(Math.PI * t) *
    Math.pow(Math.abs(u), 2);
  return [u * width, y + fold, 0.31 - 0.625 * t];
}
export function createCampingChairModel(stage: Stage = "complete") {
  const b = builder("卡其布兜露营椅"),
    steel = mat("#202324", 0.52, 0.5),
    rubber = mat("#262727", 0.98),
    edge = mat("#303231", 0.91);
  const cloth = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    side: T.DoubleSide,
  });
  const seam = mat("#8d7953", 0.98);
  for (const sign of [-1, 1]) {
    const front: V = [sign * 0.222, 0.225, 0.135],
      back: V = [sign * 0.222, 0.245, -0.135];
    b.beam("交叉支撑杆", front, fabricPoint(sign, 1), 0.013, steel);
    b.beam("交叉支撑杆", back, fabricPoint(sign, 0), 0.014, steel);
    b.beam("外张椅脚", front, [sign * 0.292, 0.025, 0.3], 0.015, steel);
    b.beam("外张椅脚", back, [sign * 0.29, 0.025, -0.28], 0.015, steel);
    for (const hub of [front, back])
      b.add("折叠连接件", new T.SphereGeometry(0.034, 16, 10), rubber, hub);
    for (const z of [0.3, -0.28])
      b.add(
        "橡胶脚套",
        new T.CapsuleGeometry(0.023, 0.039, 4, 12),
        rubber,
        [sign * 0.292, 0.043, z],
        [sign * 0.12, 0, sign * 0.08],
      );
  }
  b.beam(
    "横向连接杆",
    [-0.222, 0.225, 0.135],
    [0.222, 0.225, 0.135],
    0.014,
    steel,
  );
  b.beam(
    "横向连接杆",
    [-0.222, 0.245, -0.135],
    [0.222, 0.245, -0.135],
    0.013,
    steel,
  );
  const shape = new T.Shape();
  shape.moveTo(-1, 0);
  shape.lineTo(1, 0);
  shape.lineTo(1, 1);
  shape.lineTo(-1, 1);
  shape.closePath();
  for (const sign of [-1, 1]) {
    const hole = new T.Path();
    hole.moveTo(sign * 0.73, 0.24);
    hole.lineTo(sign * 0.72, 0.48);
    hole.lineTo(sign * 0.94, 0.27);
    hole.closePath();
    shape.holes.push(hole);
  }
  const flat = new T.ShapeGeometry(shape),
    src = flat.attributes.position,
    idx = flat.index!;
  const positions: number[] = [],
    colors: number[] = [],
    normals: number[] = [];
  const base = new T.Color("#9b8255");
  const emit = (u: number, t: number) => {
    const p = new T.Vector3(...fabricPoint(u, t));
    positions.push(...p.toArray());
    const du = new T.Vector3(...fabricPoint(u + 0.0001, t)).sub(p);
    const dt = new T.Vector3(...fabricPoint(u, t + 0.0001)).sub(p);
    normals.push(...du.cross(dt).normalize().toArray());
    const k =
      1 + 0.022 * Math.sin(u * 61 + t * 90) + 0.026 * Math.cos(u * 17 + t * 24);
    colors.push(base.r * k, base.g * k, base.b * k);
  };
  // Tessellate the already-cut cloth: hole edges stay continuous, not grid stair steps.
  for (let f = 0; f < idx.count; f += 3) {
    const a = new T.Vector2(src.getX(idx.getX(f)), src.getY(idx.getX(f)));
    const b = new T.Vector2(
      src.getX(idx.getX(f + 1)),
      src.getY(idx.getX(f + 1)),
    ).sub(a);
    const c = new T.Vector2(
      src.getX(idx.getX(f + 2)),
      src.getY(idx.getX(f + 2)),
    ).sub(a);
    const vertex = (i: number, j: number) =>
      emit(
        a.x + (b.x * i) / 16 + (c.x * j) / 16,
        a.y + (b.y * i) / 16 + (c.y * j) / 16,
      );
    for (let i = 0; i < 16; i++)
      for (let j = 0; j < 16 - i; j++) {
        vertex(i, j);
        vertex(i + 1, j);
        vertex(i, j + 1);
        if (i + j < 15) {
          vertex(i + 1, j);
          vertex(i + 1, j + 1);
          vertex(i, j + 1);
        }
      }
  }
  flat.dispose();
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  b.add("连续下陷卡其布兜", g, cloth);
  for (const side of [-1, 1])
    b.tube(
      "黑色包边",
      Array.from({ length: 40 }, (_, i) => fabricPoint(side, i / 39)),
      0.007,
      edge,
      48,
    );
  for (const t of [0, 1])
    b.tube(
      "黑色包边",
      Array.from({ length: 40 }, (_, i) => fabricPoint((i / 39) * 2 - 1, t)),
      0.007,
      edge,
      48,
    );
  if (stage === "complete") {
    for (const side of [-1, 1])
      b.tube(
        "压线缝迹",
        Array.from({ length: 34 }, (_, i) => {
          const p = fabricPoint(side * 0.69, 0.12 + (i / 33) * 0.87);
          p[1] += 0.002;
          return p;
        }),
        0.0014,
        seam,
        40,
      );
    for (const u of [-1, 1])
      for (const t of [0, 1]) {
        const center = fabricPoint(u * 0.93, t === 0 ? 0.035 : 0.96);
        b.add(
          "角部加固布",
          new T.SphereGeometry(1, 16, 10).scale(0.025, 0.004, 0.024),
          seam,
          center,
        );
      }
    const p = fabricPoint(0, 0.87);
    p[1] += 0.004;
    b.box("深色无字织标", [0.035, 0.004, 0.036], p, edge, 0.001);
  } else seam.dispose();
  return b.finish();
}
function waterSurface(w: number, d: number, y: number) {
  const g = new T.PlaneGeometry(w, d, 64, 40).rotateX(-Math.PI / 2),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setY(
      i,
      y +
        0.0014 *
          Math.sin(p.getX(i) * 31 + p.getZ(i) * 17) *
          Math.cos(p.getZ(i) * 23),
    );
  g.computeVertexNormals();
  return g;
}
export function createRectangularKoiPondModel(stage: Stage = "complete") {
  const b = builder("方形锦鲤景观鱼池"),
    stone = mat("#e0dfd4", 0.87),
    inside = mat("#172b2c", 0.64),
    wood = mat("#967149", 0.85),
    line = mat("#655039", 0.97),
    metal = mat("#858e8c", 0.26, 0.85);
  const water = new T.MeshStandardMaterial({
    color: "#244646",
    roughness: 0.22,
    metalness: 0.34,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: T.DoubleSide,
  });
  const fall = new T.MeshStandardMaterial({
    color: "#bbdfdd",
    roughness: 0.18,
    metalness: 0.15,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    side: T.DoubleSide,
  });
  const foam = new T.MeshStandardMaterial({
    color: "#fff7d9",
    emissive: "#f7d99d",
    emissiveIntensity: 0.22,
    roughness: 0.4,
  });
  b.box("深色浅池底", [3.06, 0.12, 1.96], [0, 0.06, 0], inside);
  b.box("木饰面正面池壁", [3.1, 0.31, 0.09], [0, 0.155, 0.985], wood);
  for (const x of [-1.505, 1.505])
    b.box("白色池壁与压顶", [0.09, 0.33, 1.98], [x, 0.165, 0], stone);
  b.box("白色池壁与压顶", [3.1, 0.33, 0.08], [0, 0.165, -0.97], stone);
  b.box("白色池壁与压顶", [3.1, 0.035, 0.13], [0, 0.329, 0.974], stone);
  b.add("主池水面", waterSurface(2.92, 1.81, 0.264), water, [0, 0, 0.016]);
  b.box("后侧抬高水槽", [2.58, 0.41, 0.44], [-0.02, 0.205, -0.68], stone);
  b.box("后侧黑色槽底", [2.43, 0.025, 0.32], [-0.02, 0.408, -0.68], inside);
  b.add("高槽水面", waterSurface(2.42, 0.3, 0.428), water, [-0.02, 0, -0.68]);
  b.box("中央白色分水台", [1.1, 0.12, 0.43], [-0.21, 0.425, -0.54], stone);
  for (const x of [0.39, 1.3])
    b.box("跌水接水槽", [0.075, 0.54, 0.48], [x, 0.27, -0.67], stone);
  for (const z of [-0.89, -0.45])
    b.box("跌水接水槽", [0.96, 0.54, 0.065], [0.845, 0.27, z], stone);
  b.box("跌水槽内底", [0.82, 0.035, 0.34], [0.845, 0.465, -0.67], inside);
  b.add(
    "跌水槽水面",
    waterSurface(0.81, 0.32, 0.493),
    water,
    [0.845, 0, -0.67],
  );
  b.box("银色跌水口", [0.36, 0.036, 0.12], [0.845, 0.955, -0.814], metal);
  b.box("银色跌水背板", [0.28, 0.43, 0.025], [0.845, 0.74, -0.86], metal);
  if (stage === "complete") {
    for (let i = 0; i < 6; i++)
      b.box(
        "木饰面水平拼缝",
        [3.1, 0.006, 0.003],
        [0, 0.032 + i * 0.048, 1.032],
        line,
        0.001,
      );
    // Curved falling sheet from the upper metal lip to the raised receiving basin.
    const pos: number[] = [],
      ix: number[] = [];
    for (let j = 0; j <= 24; j++)
      for (let i = 0; i <= 16; i++) {
        const t = j / 24,
          u = (i / 16) * 2 - 1;
        pos.push(
          0.845 + u * (0.16 - 0.035 * t),
          0.937 - 0.435 * t,
          -0.763 + 0.14 * t + 0.004 * Math.sin(i * 3 + j * 1.8),
        );
      }
    for (let j = 0; j < 24; j++)
      for (let i = 0; i < 16; i++) {
        const a = j * 17 + i;
        ix.push(a, a + 17, a + 1, a + 1, a + 17, a + 18);
      }
    const sheet = new T.BufferGeometry();
    sheet.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    sheet.setIndex(ix);
    sheet.computeVertexNormals();
    b.add("银口跌水水帘", sheet, fall);
    for (const x of [-0.68, 0.64]) {
      b.add("涌泉灯座", new T.CylinderGeometry(0.06, 0.075, 0.025, 24), metal, [
        x,
        0.255,
        0.12,
      ]);
      b.add(
        "涌泉暖灯",
        new T.SphereGeometry(0.026, 14, 10).scale(1, 0.5, 1),
        foam,
        [x, 0.283, 0.12],
      );
      b.tube(
        "涌泉水柱",
        [
          [x, 0.282, 0.12],
          [x + 0.008, 0.37, 0.12],
          [x, 0.49, 0.124],
          [x - 0.01, 0.51, 0.128],
        ],
        0.009,
        fall,
        20,
      );
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        b.tube(
          "涌泉水柱",
          [
            [x, 0.455, 0.12],
            [x + Math.sin(a) * 0.045, 0.48, 0.12 + Math.cos(a) * 0.045],
            [x + Math.sin(a) * 0.115, 0.269, 0.12 + Math.cos(a) * 0.115],
          ],
          0.0038,
          fall,
          16,
        );
        b.add("涌泉细水滴", new T.SphereGeometry(0.006, 8, 6), foam, [
          x + Math.sin(a) * 0.08,
          0.39 + (i % 3) * 0.014,
          0.12 + Math.cos(a) * 0.08,
        ]);
      }
      for (let i = 0; i < 3; i++)
        b.add(
          "水面细涟漪",
          new T.TorusGeometry(0.125 + i * 0.055, 0.0015, 5, 40).rotateX(
            Math.PI / 2,
          ),
          fall,
          [x, 0.269 + i * 0.0006, 0.12],
        );
    }
    const koi = new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.43,
        side: T.DoubleSide,
      }),
      eyes = mat("#171919", 0.31);
    const fish: [[number, number], number][] = [
      [[-1.07, 0.5], 0.7],
      [[-0.86, -0.16], -1.0],
      [[-0.23, 0.57], 0.2],
      [[0.29, 0.38], -0.4],
      [[0.98, 0.39], 2.7],
      [[1.12, -0.11], 0.5],
      [[0.04, -0.18], 1.8],
    ];
    fish.forEach(([[x, z], angle], index) => {
      const body = new T.SphereGeometry(1, 20, 12).scale(0.112, 0.022, 0.036);
      const p = body.attributes.position,
        colors: number[] = [];
      for (let i = 0; i < p.count; i++) {
        const white =
          Math.sin(p.getX(i) * 52 + index) * Math.cos(p.getZ(i) * 83 + index) >
          0.0;
        const c = new T.Color(
          white ? "#f2e6c9" : index % 2 ? "#d84c25" : "#e59a28",
        );
        colors.push(c.r, c.g, c.b);
      }
      body.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
      b.add("红白橙锦鲤", body, koi, [x, 0.232, z], [0, angle, 0]);
      const tail = new T.BufferGeometry();
      tail.setAttribute(
        "position",
        new T.Float32BufferAttribute(
          [
            -0.09, 0, 0, -0.175, 0, 0.047, -0.145, 0, 0, -0.09, 0, 0, -0.145, 0,
            0, -0.175, 0, -0.047,
          ],
          3,
        ),
      );
      tail.computeVertexNormals();
      const tc = new T.Color("#e66c30");
      tail.setAttribute(
        "color",
        new T.Float32BufferAttribute(
          Array.from({ length: 6 }, () => [tc.r, tc.g, tc.b]).flat(),
          3,
        ),
      );
      b.add("红白橙锦鲤", tail, koi, [x, 0.232, z], [0, angle, 0]);
      for (const sign of [-1, 1]) {
        const point = new T.Vector3(0.079, 0.013, sign * 0.02)
          .applyAxisAngle(new T.Vector3(0, 1, 0), angle)
          .add(new T.Vector3(x, 0.232, z));
        b.add(
          "锦鲤眼睛",
          new T.SphereGeometry(0.0035, 8, 6),
          eyes,
          point.toArray() as V,
        );
      }
    });
    const leaf = mat("#426640", 0.93);
    leaf.side = T.DoubleSide;
    for (const side of [-1, 1]) {
      b.box(
        "池边小花槽",
        [0.23, 0.34, 0.44],
        [side * 1.39, 0.17, -0.65],
        stone,
      );
      b.box(
        "花槽土面",
        [0.17, 0.012, 0.36],
        [side * 1.39, 0.347, -0.65],
        inside,
      );
      for (let i = 0; i < 15; i++) {
        const a = i * 2.3999,
          h = 0.18 + (i % 5) * 0.037,
          vertices: number[] = [];
        for (let j = 0; j <= 8; j++) {
          const t = j / 8,
            r = 0.18 * t * t;
          for (const sign of [-1, 1]) {
            const w = 0.014 * Math.sin(Math.PI * t) * sign;
            vertices.push(
              side * 1.39 + Math.sin(a) * r + Math.cos(a) * w,
              0.35 + h * Math.sin(t * 1.2),
              -0.65 + Math.cos(a) * r - Math.sin(a) * w,
            );
          }
        }
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
        const ids: number[] = [];
        for (let j = 0; j < 8; j++) {
          const k = j * 2;
          ids.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
        g.setIndex(ids);
        g.computeVertexNormals();
        b.add("池畔绿叶", g, leaf);
      }
    }
  } else {
    line.dispose();
    fall.dispose();
    foam.dispose();
  }
  const root = b.finish();
  root.userData.staticWater = true;
  for (const name of [
    "主池水面",
    "高槽水面",
    "跌水槽水面",
    "银口跌水水帘",
    "涌泉水柱",
    "水面细涟漪",
  ]) {
    const mesh = root.getObjectByName(name);
    if (mesh) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = 1;
    }
  }
  return root;
}
