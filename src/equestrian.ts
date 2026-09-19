import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
type V = [number, number, number];
/** Reference-inspired static sculpture. +X is the horse's forward direction. */
export function createEquestrianModel(
  stage: "structure" | "complete" = "complete",
) {
  const root = new T.Group();
  root.name = "金色骑马雕像";
  const gold = new T.MeshStandardMaterial({
    color: "#dab651",
    metalness: 0.78,
    roughness: 0.3,
  });
  const relief = new T.MeshStandardMaterial({
    color: "#bb9135",
    metalness: 0.73,
    roughness: 0.38,
  });
  const gleam = new T.MeshStandardMaterial({
    color: "#e8c871",
    metalness: 0.8,
    roughness: 0.25,
  });
  const stone = new T.MeshStandardMaterial({
    color: "#303832",
    roughness: 0.72,
  });
  const dark = new T.MeshStandardMaterial({
    color: "#58451e",
    metalness: 0.5,
    roughness: 0.5,
  });
  const buckets = new Map<string, { m: T.Material; g: T.BufferGeometry[] }>();
  const add = (name: string, g: T.BufferGeometry, m: T.Material = gold) => {
    g.deleteAttribute("uv");
    if (g.index) {
      const copy = g.toNonIndexed();
      g.dispose();
      g = copy;
    }
    const region = /基座/.test(name)
      ? "石基座"
      : /骑士|头部|面部|鼻梁|下巴|肩甲|手臂|握缰手|颈部|靴尖|胸前|铆钉|眼眉/.test(
            name,
          )
        ? "骑士"
        : /鬃|缰绳|颊带|胸带|流苏|马镫|马鞍/.test(name)
          ? "马具与鬃毛"
          : "马匹";
    const key = region + ":" + m.uuid;
    if (!buckets.has(key)) buckets.set(key, { m, g: [] });
    buckets.get(key)!.g.push(g);
  };
  const ball = (name: string, p: V, s: V, m: T.Material = gold, tilt = 0) =>
    add(
      name,
      new T.SphereGeometry(1, 20, 12)
        .scale(...s)
        .rotateZ(tilt)
        .translate(...p),
      m,
    );
  // Tapered continuous sections follow a centerline, rather than detached joints.
  const sweep = (
    name: string,
    points: V[],
    radii: number[],
    m: T.Material = gold,
    segments = 18,
    sides = 12,
    flat = 1,
  ) => {
    const c = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
      frames = c.computeFrenetFrames(segments, false);
    const positions: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const u = i / segments,
        at = c.getPointAt(u),
        ri = u * (radii.length - 1),
        lo = Math.min(radii.length - 2, Math.floor(ri)),
        radius = T.MathUtils.lerp(radii[lo], radii[lo + 1], ri - lo);
      for (let j = 0; j <= sides; j++) {
        const angle = (j / sides) * Math.PI * 2;
        const v = at
          .clone()
          .addScaledVector(frames.normals[i], Math.cos(angle) * radius)
          .addScaledVector(
            frames.binormals[i],
            Math.sin(angle) * radius * flat,
          );
        positions.push(...v.toArray());
      }
    }
    for (let i = 0; i < segments; i++)
      for (let j = 0; j < sides; j++) {
        const a = i * (sides + 1) + j,
          b = a + sides + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    for (const end of [0, segments]) {
      const center = positions.length / 3;
      positions.push(...c.getPointAt(end / segments).toArray());
      for (let j = 0; j < sides; j++) {
        const a = end * (sides + 1) + j;
        indices.push(center, ...(end === 0 ? [a + 1, a] : [a, a + 1]));
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    add(name, g, m);
  };
  const line = (
    name: string,
    p: V[],
    r = 0.008,
    m: T.Material = gleam,
    segments = 18,
  ) => sweep(name, p, [r, r], m, segments, 6);
  add(
    "深色石基座",
    new RoundedBoxGeometry(3.45, 0.16, 1.12, 2, 0.018).translate(-0.2, 0.08, 0),
    stone,
  );
  add(
    "基座上沿",
    new T.BoxGeometry(3.49, 0.026, 1.16).translate(-0.2, 0.173, 0),
    stone,
  );
  ball("马躯干", [-0.24, 1.01, 0], [0.7, 0.37, 0.285], gold, 0.17);
  ball("马臀", [-0.72, 0.99, 0], [0.36, 0.35, 0.29]);
  ball("马胸", [0.3, 1.13, 0], [0.32, 0.41, 0.29], gold, -0.17);
  sweep(
    "昂起的马颈",
    [
      [0.3, 1.18, 0],
      [0.47, 1.48, 0],
      [0.54, 1.77, 0],
      [0.68, 1.96, 0],
    ],
    [0.27, 0.255, 0.17, 0.105],
    gold,
    28,
    20,
    0.83,
  );
  ball("马头", [0.78, 1.91, 0], [0.22, 0.165, 0.135], gold, -0.65);
  sweep(
    "马面鼻梁",
    [
      [0.78, 1.96, 0],
      [0.91, 1.81, 0],
      [1.01, 1.65, 0],
    ],
    [0.14, 0.112, 0.09],
    gold,
    16,
    16,
    0.9,
  );
  ball("马鼻", [1.005, 1.655, 0], [0.112, 0.072, 0.107]);
  for (const z of [-0.105, 0.105]) {
    sweep(
      "马耳",
      [
        [0.65, 2.005, z * 0.75],
        [0.63, 2.16, z],
        [0.68, 2.18, z],
      ],
      [0.055, 0.036, 0.003],
      gold,
      12,
      10,
      0.55,
    );
    const side = z > 0 ? 1 : -1;
    const front = side > 0 ? 0 : -0.1;
    sweep(
      "扬起前腿",
      [
        [0.35, 1.14, side * 0.2],
        [0.64, 1.14, side * 0.25],
        [0.92 + front, 1.31, side * 0.28],
        [1.06 + front, 1.26, side * 0.28],
        [1.15 + front, 1.01, side * 0.28],
      ],
      [0.12, 0.105, 0.065, 0.05, 0.035],
      gold,
      24,
      12,
    );
    ball(
      "前蹄",
      [1.14 + front, 0.965, side * 0.28],
      [0.085, 0.075, 0.06],
      relief,
      0.4,
    );
    sweep(
      "支撑后腿",
      [
        [-0.67, 0.9, side * 0.19],
        [-0.46, 0.69, side * 0.26],
        [-0.74, 0.35, side * 0.27],
        [-0.6, 0.235, side * 0.28],
        [-0.36, 0.225, side * 0.28],
      ],
      [0.17, 0.14, 0.065, 0.047, 0.036],
      gold,
      24,
      14,
    );
    ball("落地后蹄", [-0.31, 0.224, side * 0.28], [0.13, 0.038, 0.075], gold);
  }
  sweep(
    "垂落马尾",
    [
      [-0.98, 1.1, 0],
      [-1.12, 0.95, 0],
      [-1.22, 0.52, 0],
      [-1.51, 0.235, 0.02],
      [-1.77, 0.21, 0.03],
    ],
    [0.095, 0.1, 0.085, 0.075, 0.008],
    relief,
    32,
    14,
  );
  // The rider sits in the saddle, with both thighs following the horse's flanks.
  ball("马鞍", [-0.18, 1.375, 0], [0.41, 0.075, 0.28], relief, 0.12);
  ball("骑士髋部", [-0.22, 1.46, 0], [0.2, 0.13, 0.22]);
  sweep(
    "骑士铠甲",
    [
      [-0.24, 1.47, 0],
      [-0.27, 1.66, 0],
      [-0.31, 1.9, 0],
      [-0.33, 2.02, 0],
    ],
    [0.15, 0.17, 0.205, 0.13],
    gold,
    22,
    16,
    0.8,
  );
  sweep(
    "颈部",
    [
      [-0.32, 2.0, 0],
      [-0.3, 2.13, 0],
    ],
    [0.075, 0.068],
    gold,
    8,
    12,
  );
  ball("头部", [-0.29, 2.23, 0], [0.105, 0.147, 0.09]);
  ball("面部", [-0.218, 2.228, 0], [0.045, 0.093, 0.072]);
  sweep(
    "鼻梁",
    [
      [-0.19, 2.26, 0],
      [-0.15, 2.23, 0],
      [-0.19, 2.21, 0],
    ],
    [0.018, 0.024, 0.013],
    gleam,
    8,
    8,
  );
  ball("下巴", [-0.206, 2.151, 0], [0.043, 0.029, 0.051]);
  for (const side of [-1, 1]) {
    const z = side * 0.2;
    sweep(
      "骑士大腿",
      [
        [-0.19, 1.49, z],
        [0.06, 1.4, z * 1.3],
        [0.25, 1.21, z * 1.45],
      ],
      [0.115, 0.105, 0.078],
      gold,
      16,
      12,
    );
    sweep(
      "骑士长靴",
      [
        [0.25, 1.22, z * 1.45],
        [0.3, 1.04, z * 1.63],
        [0.43, 0.93, z * 1.72],
      ],
      [0.073, 0.063, 0.047],
      relief,
      16,
      12,
    );
    ball("靴尖", [0.5, 0.94, z * 1.72], [0.13, 0.035, 0.06], gold, 0.12);
    ball("肩甲", [-0.31, 1.955, z * 0.85], [0.14, 0.12, 0.1]);
    sweep(
      "持缰手臂",
      [
        [-0.27, 1.92, z],
        [-0.18, 1.7, z * 1.15],
        [0.1, 1.62, z * 1.3],
        [0.29, 1.65, z * 1.2],
      ],
      [0.075, 0.065, 0.052, 0.043],
      gold,
      20,
      12,
    );
    ball("握缰手", [0.32, 1.65, z * 1.2], [0.06, 0.045, 0.04]);
  }
  if (stage === "complete") {
    for (const side of [-1, 1]) {
      ball("马眼", [0.817, 1.943, side * 0.119], [0.018, 0.014, 0.009], dark);
      ball(
        "鼻孔",
        [1.06, 1.68, side * 0.074],
        [0.024, 0.016, 0.008],
        dark,
        -0.4,
      );
      line(
        "马嘴",
        [
          [1.082, 1.635, side * 0.045],
          [1.02, 1.622, side * 0.096],
          [0.966, 1.64, side * 0.099],
        ],
        0.003,
        relief,
        10,
      );
      line(
        "颊带",
        [
          [0.72, 2.016, side * 0.11],
          [0.87, 1.86, side * 0.13],
          [1.015, 1.685, side * 0.109],
        ],
        0.01,
        relief,
      );
      line(
        "缰绳",
        [
          [0.33, 1.65, side * 0.24],
          [0.58, 1.6, side * 0.26],
          [0.87, 1.72, side * 0.15],
          [1.01, 1.7, side * 0.11],
        ],
        0.009,
        gleam,
        24,
      );
      line(
        "胸带",
        [
          [0.42, 1.57, side * 0.21],
          [0.61, 1.32, side * 0.21],
          [0.47, 1.1, side * 0.29],
        ],
        0.014,
        relief,
      );
      line(
        "马镫",
        [
          [0.25, 1.23, side * 0.33],
          [0.35, 0.915, side * 0.38],
          [0.57, 0.915, side * 0.39],
          [0.38, 1.13, side * 0.35],
        ],
        0.01,
        gleam,
      );
      line(
        "眼眉",
        [
          [-0.2, 2.269, side * 0.055],
          [-0.18, 2.27, side * 0.047],
        ],
        0.004,
        relief,
        6,
      );
      for (let i = 0; i < 9; i++) {
        const x = -0.49 + i * 0.071;
        line(
          "鞍毯流苏",
          [
            [x, 1.34, side * 0.23],
            [x - 0.035, 1.22, side * 0.3],
            [x - 0.06, 1.18, side * 0.29],
          ],
          0.012,
          relief,
          8,
        );
      }
    }
    // Sculpted curls and separate flowing ridges supply highlights without textures.
    for (let i = 0; i < 16; i++) {
      const z = (i / 15 - 0.5) * 0.15;
      line(
        "鬃毛",
        [
          [0.67, 2.075, z],
          [0.43, 1.91, z * 1.2],
          [0.36, 1.7, z * 1.5],
          [0.28, 1.49, z * 1.7],
        ],
        0.015,
        i % 3 === 0 ? gleam : relief,
        20,
      );
    }
    for (let i = 0; i < 11; i++) {
      const z = (i / 10 - 0.5) * 0.13;
      line(
        "尾鬃",
        [
          [-1.01, 1.12, z],
          [-1.15, 0.87, z * 1.1],
          [-1.29, 0.46, z * 1.4],
          [-1.63, 0.22, z * 1.5],
        ],
        0.014,
        i % 3 === 0 ? gleam : gold,
        24,
      );
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      line(
        "骑士卷发",
        [
          [-0.32 + Math.cos(a) * 0.075, 2.32, Math.sin(a) * 0.077],
          [-0.38 + Math.cos(a) * 0.085, 2.23, Math.sin(a) * 0.105],
          [-0.39 + Math.cos(a) * 0.08, 2.08, Math.sin(a) * 0.105],
        ],
        0.022,
        relief,
        12,
      );
    }
    line(
      "胸前绶带",
      [
        [-0.3, 2.0, 0.15],
        [-0.12, 1.84, 0.145],
        [-0.11, 1.68, 0.11],
        [-0.18, 1.52, 0.11],
      ],
      0.027,
      gleam,
      18,
    );
    for (let i = 0; i < 7; i++)
      ball(
        "甲胄铆钉",
        [-0.11, 1.63 + i * 0.044, 0.085],
        [0.009, 0.009, 0.009],
        gleam,
      );
  }
  for (const [key, { m, g }] of buckets) {
    const geometry = mergeGeometries(g)!;
    g.forEach((part) => part.dispose());
    const mesh = new T.Mesh(geometry, m);
    mesh.name = key.split(":")[0];
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  root.userData.approximation =
    "参考照片的金色骑马雕像近似重建；人物面部、铠甲细节及背面为简化推测，静态整体物件";
  return root;
}
