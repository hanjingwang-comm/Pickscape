import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
type V = [number, number, number];
type Stage = "structure" | "complete";
const mat = (color: string, roughness = 0.8, metalness = 0) =>
  new T.MeshStandardMaterial({ color, roughness, metalness });
function builder(name: string) {
  const root = new T.Group();
  root.name = name;
  const buckets = new Map<
    T.Material,
    { parts: Set<string>; geometries: T.BufferGeometry[] }
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
    if (!buckets.has(m)) buckets.set(m, { parts: new Set(), geometries: [] });
    const bucket = buckets.get(m)!;
    bucket.parts.add(name);
    bucket.geometries.push(g);
  };
  const box = (
    name: string,
    size: V,
    p: V,
    m: T.Material,
    r: V = [0, 0, 0],
    round = 0,
  ) =>
    add(
      name,
      round
        ? new RoundedBoxGeometry(...size, 2, round)
        : new T.BoxGeometry(...size),
      m,
      p,
      r,
    );
  const tube = (
    name: string,
    points: V[],
    radius: number,
    m: T.Material,
    segments = 20,
  ) =>
    add(
      name,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        segments,
        radius,
        5,
        false,
      ),
      m,
    );
  const finish = () => {
    for (const [m, b] of buckets) {
      const mesh = new T.Mesh(mergeGeometries(b.geometries)!, m);
      mesh.name = [...b.parts].join(" · ");
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      b.geometries.forEach((g) => g.dispose());
    }
    root.updateMatrixWorld(true);
    const min = new T.Box3().setFromObject(root).min.y;
    root.children.forEach((o) => (o as T.Mesh).geometry.translate(0, -min, 0));
    root.userData.approximation = "按用户照片近似重建，架上装饰随架整体移动";
    return root;
  };
  return { add, box, tube, finish };
}
function vessel(radius: number, height: number, style: number) {
  const profiles = [
    [
      [0, 0],
      [0.7, 0],
      [1, 0.15],
      [0.95, 0.62],
      [0.65, 0.9],
      [0.65, 1],
      [0.55, 1],
      [0.55, 0.87],
      [0.8, 0.6],
      [0.8, 0.17],
      [0, 0.12],
    ],
    [
      [0, 0],
      [0.6, 0],
      [0.95, 0.15],
      [1, 0.4],
      [0.45, 0.7],
      [0.3, 0.96],
      [0.36, 1],
      [0.24, 1],
      [0.22, 0.76],
      [0.65, 0.4],
      [0.55, 0.17],
      [0, 0.12],
    ],
    [
      [0, 0],
      [0.8, 0],
      [1, 0.82],
      [1, 1],
      [0.87, 1],
      [0.85, 0.86],
      [0.7, 0.13],
      [0, 0.13],
    ],
  ];
  return new T.LatheGeometry(
    profiles[style % 3].map(([r, y]) => new T.Vector2(r * radius, y * height)),
    24,
  );
}
function leaf(length: number, width: number) {
  const shape = new T.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(
    -width * 0.8,
    length * 0.15,
    -width * 0.65,
    length * 0.64,
    0,
    length,
  );
  shape.bezierCurveTo(
    width * 0.65,
    length * 0.64,
    width * 0.8,
    length * 0.15,
    0,
    0,
  );
  const g = new T.ShapeGeometry(shape, 5),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setZ(
      i,
      Math.sin((p.getY(i) / length) * Math.PI) * length * 0.13 -
        Math.abs(p.getX(i)) * 0.25,
    );
  g.computeVertexNormals();
  return g;
}
export function createVintageFlowerStandModel(stage: Stage = "complete") {
  const b = builder("复古垂藤花架"),
    wood = mat("#875330", 0.8),
    edge = mat("#62391f", 0.85),
    grain = mat("#aa7950", 0.9);
  // Open shelves, with solid scalloped side stanchions and a projecting crown.
  for (const y of [0.11, 0.72, 1.36, 2.12])
    b.box("实木层板", [2.12, 0.055, 0.48], [0, y, 0], wood, [0, 0, 0], 0.012);
  b.box("顶部宽檐", [2.29, 0.065, 0.56], [0, 2.18, 0], wood, [0, 0, 0], 0.015);
  b.box("顶部线脚", [2.2, 0.043, 0.51], [0, 2.125, 0], edge, [0, 0, 0], 0.01);
  for (const sign of [-1, 1]) {
    const shape = new T.Shape();
    shape.moveTo(-0.1, 0);
    shape.lineTo(0.1, 0);
    for (let k = 0; k <= 48; k++) {
      const y = (k / 48) * 2.12,
        x = 0.07 + 0.027 * Math.cos(y * 11) + 0.017 * Math.sin(y * 19);
      shape.lineTo(x, y);
    }
    shape.lineTo(-0.1, 2.12);
    shape.closePath();
    const g = new T.ExtrudeGeometry(shape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 1,
      steps: 1,
    });
    if (sign < 0) g.rotateY(Math.PI);
    b.add("波形木侧柱", g, wood, [sign * 0.94, 0.025, sign < 0 ? 0.15 : -0.15]);
    b.box("后立柱", [0.065, 2.14, 0.06], [sign * 0.98, 1.07, -0.2], edge);
    if (stage === "complete")
      for (let i = 0; i < 5; i++)
        b.tube(
          "纵向木纹",
          [
            [sign * 0.94 - 0.06 + i * 0.027, 0.12, 0.16],
            [sign * 0.94 - 0.068 + i * 0.027, 0.9, 0.164],
            [sign * 0.94 - 0.05 + i * 0.027, 1.65, 0.16],
            [sign * 0.94 - 0.06 + i * 0.027, 2.06, 0.16],
          ],
          0.0015,
          grain,
          16,
        );
  }
  if (stage === "structure") {
    grain.dispose();
    return b.finish();
  }
  const cream = mat("#e0d9c2", 0.45),
    blue = mat("#304e67", 0.32),
    green = mat("#386557", 0.4),
    ochre = mat("#c29b48", 0.57),
    terra = mat("#995a3c", 0.8),
    stem = mat("#647145", 0.92),
    soil = mat("#443a28", 1);
  const leaves = [
    mat("#42653a", 0.86),
    mat("#719446", 0.86),
    mat("#8ca750", 0.9),
  ];
  leaves.forEach((m) => (m.side = T.DoubleSide));
  const blooms = [
    mat("#dbd1b8", 0.92),
    mat("#a883b3", 0.92),
    mat("#ad7573", 0.92),
  ];
  const vase = (
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    m: T.Material,
    style = 0,
  ) => {
    b.add("釉陶花器", vessel(r, h, style), m, [x, y, z]);
    if (style === 2)
      b.add(
        "盆土",
        new T.CylinderGeometry(r * 0.84, r * 0.84, 0.008, 18),
        soil,
        [x, y + h * 0.83, z],
      );
  };
  // Top pots carry trailing foliage; the remaining shelves retain some open space.
  vase(-0.72, 2.217, 0, 0.16, 0.28, terra, 2);
  vase(-0.24, 2.217, -0.035, 0.13, 0.37, cream, 1);
  vase(0.17, 2.217, 0, 0.16, 0.27, ochre);
  vase(0.67, 2.217, -0.01, 0.15, 0.33, blue, 2);
  for (const [row, y] of [1.3875, 0.7475, 0.1375].entries())
    for (let j = 0; j < 5; j++) {
      const x = -0.7 + j * 0.34,
        h = 0.16 + ((j * 7 + row * 3) % 5) * 0.028,
        r = 0.064 + ((j + row) % 3) * 0.013;
      vase(
        x,
        y,
        -0.045,
        r,
        h,
        [cream, green, blue, terra, ochre][(j + row) % 5],
        (j + row) % 3,
      );
      if (j % 2 === 0) {
        for (let k = 0; k < 9; k++) {
          const a = k * 2.4 + row,
            top: V = [
              x + Math.cos(a) * 0.09,
              y + h + 0.14 + (k % 3) * 0.05,
              -0.045 + Math.sin(a) * 0.065,
            ];
          b.tube(
            "花束细茎",
            [
              [x, y + h * 0.6, -0.045],
              [x + Math.cos(a) * 0.025, y + h + 0.08, -0.045],
              top,
            ],
            0.0025,
            stem,
            8,
          );
          for (let q = 0; q < 5; q++) {
            const angle = (q * Math.PI * 2) / 5;
            b.add(
              "瓶插花朵",
              new T.SphereGeometry(0.02, 6, 4).scale(1, 0.55, 1.5),
              blooms[(row + j) % 3],
              [
                top[0] + Math.cos(angle) * 0.025,
                top[1],
                top[2] + Math.sin(angle) * 0.025,
              ],
              [0, -angle, 0],
            );
          }
        }
      }
    }
  // An airy top bouquet and branching leaves give the crown its asymmetric outline.
  for (let j = 0; j < 11; j++) {
    const a = j * 2.4,
      top: V = [
        0.67 + Math.cos(a) * (0.1 + (j % 3) * 0.045),
        2.71 + (j % 4) * 0.055,
        -0.01 + Math.sin(a) * 0.12,
      ];
    b.tube(
      "顶层花枝",
      [[0.67, 2.47, -0.01], [0.67 + Math.cos(a) * 0.04, 2.62, -0.01], top],
      0.003,
      stem,
      10,
    );
    for (let q = 0; q < 7; q++) {
      const angle = (q * Math.PI * 2) / 7;
      b.add(
        "顶层花簇",
        new T.SphereGeometry(0.027, 7, 5).scale(1, 0.6, 1.3),
        blooms[j % 3],
        [
          top[0] + Math.cos(angle) * 0.034,
          top[1],
          top[2] + Math.sin(angle) * 0.034,
        ],
        [0, angle, 0],
      );
    }
    b.add(
      "花枝绿叶",
      leaf(0.13, 0.07),
      leaves[j % 3],
      [top[0] * 0.5 + 0.335, 2.64, top[2] * 0.5],
      [0.2, a, 0.6],
    );
  }
  // Small blue motifs read as ceramic decoration without copying unrelated picture content.
  for (let j = 0; j < 10; j++) {
    const a = (j * Math.PI * 2) / 10;
    b.add(
      "青花瓷点纹",
      new T.SphereGeometry(0.011, 6, 4).scale(1, 1, 0.25),
      blue,
      [
        -0.24 + Math.sin(a) * 0.112,
        2.35 + (j % 2) * 0.055,
        -0.035 + Math.cos(a) * 0.112,
      ],
      [0, a, 0],
    );
  }
  const paths: V[][] = [
    [
      [-0.72, 2.46, 0.02],
      [-0.76, 2.18, 0.26],
      [-0.5, 1.94, 0.31],
      [-0.57, 1.65, 0.3],
      [-0.36, 1.44, 0.32],
    ],
    [
      [-0.72, 2.43, 0.03],
      [-0.45, 2.23, 0.27],
      [-0.12, 2.03, 0.3],
      [0.25, 2.08, 0.29],
      [0.51, 1.9, 0.3],
    ],
    [
      [0.68, 2.49, 0],
      [0.83, 2.22, 0.27],
      [0.77, 1.94, 0.32],
      [0.92, 1.59, 0.33],
      [0.73, 1.28, 0.34],
    ],
    [
      [0.68, 2.47, 0],
      [0.43, 2.22, 0.24],
      [0.29, 1.99, 0.29],
      [0.18, 1.7, 0.34],
    ],
    [
      [-0.72, 0.92, 0],
      [-0.93, 0.86, 0.27],
      [-1.02, 0.56, 0.29],
      [-0.85, 0.29, 0.33],
    ],
    [
      [-0.69, 0.89, 0],
      [-0.5, 1.13, 0.04],
      [-0.4, 1.24, 0.04],
    ],
  ];
  for (const [v, points] of paths.entries()) {
    b.tube("垂落藤蔓", points, 0.004, stem, 30);
    const curve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...p)),
    );
    for (let j = 0; j < 15; j++) {
      const t = 0.08 + (j / 16) * 0.9,
        p = curve.getPoint(t),
        sign = j % 2 ? 1 : -1,
        l = 0.12 + (j % 3) * 0.02;
      const tip = p.clone().add(new T.Vector3(sign * 0.045, 0.015, 0.009));
      b.tube("叶柄", [p.toArray() as V, tip.toArray() as V], 0.002, stem, 3);
      b.add(
        "心形藤叶",
        leaf(l, l * 0.65),
        leaves[(j + v) % 3],
        tip.toArray() as V,
        [0.18 * (j % 3), sign * 0.35, sign * (0.9 + (j % 3) * 0.3)],
      );
    }
  }
  return b.finish();
}
export function createBauhausDisplayModel(stage: Stage = "complete") {
  const b = builder("包豪斯模块展示架"),
    silver = mat("#a9aeac", 0.46, 0.72),
    edge = mat("#d0d3cc", 0.4, 0.65),
    dark = mat("#333a3b", 0.65, 0.2);
  // Freestanding interpretation of the reference's wall system: cabinet and rear rails carry the shelves.
  b.box("银灰底柜", [2.36, 0.39, 0.43], [0, 0.275, 0], silver);
  for (const x of [-1.09, 1.09])
    for (const z of [-0.15, 0.15])
      b.box("短柜脚", [0.03, 0.08, 0.03], [x, 0.04, z], dark);
  for (const x of [-1.13, -0.37, 0.39, 1.13])
    b.box("细金属竖杆", [0.023, 2.12, 0.024], [x, 1.12, -0.18], edge);
  for (const y of [0.49, 0.96, 1.39, 1.82, 2.2]) {
    b.box("薄金属层板", [2.45, 0.025, 0.42], [0, y, 0], silver);
    b.box("层板前沿", [2.45, 0.012, 0.015], [0, y - 0.004, 0.211], edge);
    for (const x of [-1.13, -0.37, 0.39, 1.13])
      b.box("短托臂", [0.018, 0.032, 0.37], [x, y - 0.028, -0.005], edge);
  }
  for (const x of [-0.785, 0, 0.785]) {
    b.box("柜门面", [0.778, 0.36, 0.012], [x, 0.28, 0.222], edge);
    b.box("柜门短拉手", [0.1, 0.013, 0.018], [x + 0.23, 0.415, 0.235], dark);
  }
  if (stage === "structure") return b.finish();
  const paper = mat("#dbd4bc", 0.97),
    blue = mat("#367181", 0.6),
    ink = mat("#222b30", 0.65),
    red = mat("#a24638", 0.85),
    yellow = mat("#c19e48", 0.86),
    sage = mat("#78918a", 0.86),
    white = mat("#e6e1d2", 0.88);
  const colors = [white, sage, red, blue, yellow, dark];
  function book(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    m: T.Material,
    angle = 0,
  ) {
    b.box("书籍封面", [width, height, 0.15], [x, y + height / 2, z], m, [
      0,
      0,
      angle,
    ]);
    b.box(
      "书脊标签",
      [width * 0.6, 0.013, 0.003],
      [x, y + height * 0.74, z + 0.077],
      paper,
      [0, 0, angle],
    );
  }
  for (const [row, y] of [2.213, 1.8325, 1.4025].entries())
    for (let j = 0; j < (row === 0 ? 28 : 15); j++) {
      const x = -1.08 + j * 0.042,
        h = 0.17 + ((j * 13 + row * 7) % 7) * 0.017;
      book(x, y, -0.035, 0.033, h, colors[(j * 7 + row) % colors.length]);
    }
  // Albums face forward in a stepped right-hand display; geometric covers are inferred.
  for (let row = 0; row < 3; row++)
    for (let j = 0; j < 3; j++) {
      const x = 0.29 + j * 0.31,
        y = 1.4025 + row * 0.408;
      b.box(
        "唱片封套",
        [0.27, 0.29, 0.018],
        [x, y + 0.145, -0.065],
        colors[(j + row * 2) % 6],
      );
      b.add(
        "封面圆形构成",
        new T.CircleGeometry(0.061, 20),
        colors[(j + row + 3) % 6],
        [x + 0.027, y + 0.17, -0.054],
      );
      const tri = new T.Shape();
      tri.moveTo(-0.07, 0);
      tri.lineTo(0.07, 0);
      tri.lineTo(0, 0.14);
      tri.closePath();
      b.add(
        "封面三角构成",
        new T.ShapeGeometry(tri),
        colors[(j + row + 1) % 6],
        [x - 0.025, y + 0.027, -0.052],
      );
    }
  // Pair of blue speakers, cones oriented toward +Z.
  for (const x of [-0.91, 0.91]) {
    b.box(
      "蓝色音箱箱体",
      [0.28, 0.39, 0.23],
      [x, 0.6975, 0.035],
      blue,
      [0, 0, 0],
      0.009,
    );
    for (const [cy, r] of [
      [0.64, 0.086],
      [0.795, 0.041],
    ]) {
      b.add("扬声器圆环", new T.TorusGeometry(r, 0.008, 6, 28), ink, [
        x,
        cy,
        0.159,
      ]);
      b.add(
        "扬声器振膜",
        new T.ConeGeometry(r * 0.88, 0.022, 28),
        dark,
        [x, cy, 0.155],
        [Math.PI / 2, 0, 0],
      );
      b.add(
        "扬声器防尘帽",
        new T.SphereGeometry(r * 0.28, 12, 8).scale(1, 1, 0.4),
        ink,
        [x, cy, 0.167],
      );
    }
  }
  b.box("播放器机身", [0.56, 0.1, 0.26], [0.16, 0.5525, 0.015], dark);
  b.box("播放器银色面板", [0.55, 0.086, 0.009], [0.16, 0.5525, 0.15], silver);
  b.box("播放器显示窗", [0.15, 0.035, 0.005], [0.03, 0.56, 0.157], ink);
  for (const x of [0.3, 0.36])
    b.add(
      "播放器旋钮",
      new T.CylinderGeometry(0.018, 0.018, 0.012, 16),
      edge,
      [x, 0.555, 0.16],
      [Math.PI / 2, 0, 0],
    );
  for (let j = 0; j < 7; j++)
    book(
      -0.56 + j * 0.051,
      0.503,
      0.01,
      0.038,
      0.25 + (j % 3) * 0.016,
      colors[j % 6],
      -0.1,
    );
  // Compact sculptural vases and a planter break up the rows of books.
  b.add("白色陶瓶", vessel(0.09, 0.21, 1), white, [-0.68, 0.973, -0.015]);
  b.add("黄陶花器", vessel(0.07, 0.16, 0), yellow, [-0.34, 0.973, -0.015]);
  b.add("小盆栽花盆", vessel(0.075, 0.1, 2), white, [-1.05, 1.8325, 0.07]);
  const foliage = mat("#587d4d", 0.92);
  foliage.side = T.DoubleSide;
  for (let i = 0; i < 12; i++) {
    const a = i * 2.4;
    b.add(
      "盆栽叶片",
      leaf(0.14, 0.075),
      foliage,
      [-1.05, 1.92, 0.07],
      [Math.sin(a) * 0.65, a, Math.cos(a) * 0.65],
    );
  }
  return b.finish();
}
