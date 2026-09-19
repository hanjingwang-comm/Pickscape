import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Movable ornamental pond inspired by the supplied garden photo.
 * A shallow raised basin keeps water above existing floors without cutting them.
 * Hidden sides, plant distribution and dimensions are approximate.
 */
export function createPondModel() {
  const root = new T.Group();
  root.name = "鸢尾石岸池塘";
  root.userData.approximation = "照片近似重建；浅池底座、背面与尺寸为推测";
  let seed = 42173;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const rocks: T.BufferGeometry[] = [],
    plants: T.BufferGeometry[] = [],
    flowers: T.BufferGeometry[] = [];
  const colors = (g: T.BufferGeometry, c: T.Color, variation = 0) => {
    const p = g.attributes.position,
      a = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const k =
        1 +
        variation * Math.sin(p.getX(i) * 37 + p.getY(i) * 17 + p.getZ(i) * 29);
      a.set([c.r * k, c.g * k, c.b * k], i * 3);
    }
    g.setAttribute("color", new T.BufferAttribute(a, 3));
    g.deleteAttribute("uv");
    if (!g.index) return g;
    const expanded = g.toNonIndexed();
    g.dispose();
    return expanded;
  };
  const mesh = (g: T.BufferGeometry, m: T.Material, name: string) => {
    const o = new T.Mesh(g, m);
    o.name = name;
    o.castShadow = true;
    o.receiveShadow = true;
    root.add(o);
    return o;
  };
  const merge = (parts: T.BufferGeometry[], m: T.Material, name: string) => {
    const g = mergeGeometries(parts, false)!;
    parts.forEach((p) => p.dispose());
    mesh(g, m, name);
  };
  const outline = (a: number, scale = 1) => {
    const r = 1 + 0.075 * Math.sin(3 * a + 0.4) + 0.045 * Math.cos(5 * a);
    return new T.Vector3(
      Math.cos(a) * 1.38 * r * scale,
      0,
      Math.sin(a) * 0.93 * r * scale,
    );
  };
  const shape = new T.Shape();
  for (let i = 0; i < 64; i++) {
    const p = outline((i / 64) * Math.PI * 2, 1.035);
    if (i === 0) shape.moveTo(p.x, -p.z);
    else shape.lineTo(p.x, -p.z);
  }
  shape.closePath();
  const basin = new T.ExtrudeGeometry(shape, {
    depth: 0.13,
    bevelEnabled: false,
    steps: 1,
  });
  basin.rotateX(-Math.PI / 2);
  mesh(
    basin,
    new T.MeshStandardMaterial({ color: "#6f705b", roughness: 1 }),
    "浅池底座",
  );
  // Flat triangulated water with variation in its own surface, no external images.
  const vertices: number[] = [],
    hues: number[] = [];
  const centerColor = new T.Color("#198f9f"),
    edgeColor = new T.Color("#176974");
  for (let i = 0; i < 96; i++) {
    const a = outline((i / 96) * Math.PI * 2, 0.98),
      b = outline(((i + 1) / 96) * Math.PI * 2, 0.98);
    for (const [p, c] of [
      [new T.Vector3(0, 0.139, 0), centerColor],
      [b, edgeColor],
      [a, edgeColor],
    ] as const) {
      vertices.push(p.x, 0.139, p.z);
      hues.push(c.r, c.g, c.b);
    }
  }
  const water = new T.BufferGeometry();
  water.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  water.setAttribute("color", new T.Float32BufferAttribute(hues, 3));
  water.computeVertexNormals();
  const surface = mesh(
    water,
    new T.MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.2,
      metalness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    }),
    "蓝绿池水",
  );
  surface.castShadow = false;
  const stones = ["#a99d87", "#c4b69b", "#8b897d", "#d5cbb7", "#b4a48a"].map(
    (c) => new T.Color(c),
  );
  const stone = (center: T.Vector3, size: T.Vector3, angle: number) => {
    const g = new T.IcosahedronGeometry(1, 1),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new T.Vector3().fromBufferAttribute(p, i);
      const k = 1 + 0.17 * Math.sin(v.x * 9 + v.z * 11 + v.y * 5);
      v.multiplyScalar(k);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.scale(size.x, size.y, size.z);
    g.rotateY(angle);
    g.translate(center.x, center.y, center.z);
    g.computeVertexNormals();
    rocks.push(colors(g, stones[Math.floor(random() * stones.length)], 0.12));
  };
  for (let n = 0; n < 34; n++) {
    const a = (n / 34) * Math.PI * 2,
      p = outline(a, 1.02);
    const h = 0.07 + random() * 0.12;
    p.y = 0.1 + h * 0.55;
    stone(
      p,
      new T.Vector3(0.17 + random() * 0.11, h, 0.13 + random() * 0.1),
      a + random(),
    );
    for (let k = 0; k < 2; k++) {
      const q = outline(a + (k - 0.5) * 0.07, 1.16 + random() * 0.06);
      q.y = 0.04;
      stone(
        q,
        new T.Vector3(0.04 + random() * 0.05, 0.035, 0.04 + random() * 0.04),
        a,
      );
    }
  }
  // Larger natural accents at the back corners.
  for (const a of [3.65, 5.55]) {
    const p = outline(a, 1.03);
    p.y = 0.21;
    stone(p, new T.Vector3(0.25, 0.27, 0.22), a);
  }
  const greens = ["#546f35", "#71893e", "#83994a", "#435f34"].map(
    (c) => new T.Color(c),
  );
  const purples = ["#775197", "#9271b4", "#b19acb"].map((c) => new T.Color(c));
  const ribbon = (
    points: T.Vector3[],
    width: number,
    color: T.Color,
    target: T.BufferGeometry[],
  ) => {
    const path = new T.CatmullRomCurve3(points),
      p: number[] = [],
      ix: number[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8,
        v = path.getPoint(t),
        w = width * Math.sin(Math.PI * t) * 0.5;
      p.push(
        v.x - w,
        v.y,
        v.z,
        v.x,
        v.y + width * 0.12 * Math.sin(Math.PI * t),
        v.z + 0.012,
        v.x + w,
        v.y,
        v.z,
      );
      if (i < 8) {
        const o = i * 3;
        ix.push(
          o,
          o + 3,
          o + 1,
          o + 1,
          o + 3,
          o + 4,
          o + 1,
          o + 4,
          o + 2,
          o + 2,
          o + 4,
          o + 5,
        );
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    target.push(colors(g, color));
  };
  // Irises occupy only the rear shore, leaving the blue water visible.
  for (let n = 0; n < 8; n++) {
    const a = 3.5 + n * 0.3,
      base = outline(a, 1.18);
    base.y = 0.055;
    for (let k = 0; k < 7; k++) {
      const h = 0.4 + random() * 0.52,
        dir = random() * Math.PI * 2;
      const end = base
        .clone()
        .add(new T.Vector3(Math.cos(dir) * 0.25, h, Math.sin(dir) * 0.19));
      ribbon(
        [
          base,
          base
            .clone()
            .lerp(end, 0.5)
            .add(new T.Vector3(0, 0.06, 0)),
          end,
        ],
        0.07 + random() * 0.055,
        greens[Math.floor(random() * greens.length)],
        plants,
      );
    }
    const top = base
      .clone()
      .add(
        new T.Vector3(
          (random() - 0.5) * 0.1,
          0.87 + random() * 0.36,
          (random() - 0.5) * 0.1,
        ),
      );
    const path = new T.CatmullRomCurve3([
      base,
      base.clone().lerp(top, 0.5),
      top,
    ]);
    plants.push(
      colors(new T.TubeGeometry(path, 6, 0.009, 5, false), greens[0]),
    );
    for (let k = 0; k < 3; k++) {
      const angle = (k * Math.PI * 2) / 3 + n,
        dir = new T.Vector3(Math.cos(angle), 0, Math.sin(angle));
      // Three upright standards and three arched, drooping falls.
      ribbon(
        [
          top,
          top
            .clone()
            .addScaledVector(dir, 0.075)
            .add(new T.Vector3(0, 0.12, 0)),
          top.clone().add(new T.Vector3(0, 0.22, 0)),
        ],
        0.16,
        purples[(k + n) % 3],
        flowers,
      );
      ribbon(
        [
          top,
          top
            .clone()
            .addScaledVector(dir, 0.14)
            .add(new T.Vector3(0, 0.015, 0)),
          top
            .clone()
            .addScaledVector(dir, 0.15)
            .add(new T.Vector3(0, -0.17, 0)),
        ],
        0.13,
        purples[(k + n + 1) % 3],
        flowers,
      );
      ribbon(
        [
          top,
          top.clone().addScaledVector(dir, 0.08),
          top
            .clone()
            .addScaledVector(dir, 0.12)
            .add(new T.Vector3(0, -0.08, 0)),
        ],
        0.024,
        new T.Color("#d7b65d"),
        flowers,
      );
    }
  }
  merge(
    rocks,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 }),
    "不规则石岸与卵石",
  );
  merge(
    plants,
    new T.MeshStandardMaterial({
      vertexColors: true,
      side: T.DoubleSide,
      roughness: 0.76,
    }),
    "鸢尾剑形叶与花茎",
  );
  merge(
    flowers,
    new T.MeshStandardMaterial({
      vertexColors: true,
      side: T.DoubleSide,
      roughness: 0.83,
    }),
    "紫色鸢尾花",
  );
  // Subtle surface ripples are exported as geometry together with the pool.
  const ripples: T.BufferGeometry[] = [];
  for (let n = 0; n < 5; n++) {
    const pts: T.Vector3[] = [],
      cx = (random() - 0.5) * 1.1,
      cz = (random() - 0.5) * 0.7;
    for (let k = 0; k <= 20; k++) {
      const a = (k / 20) * Math.PI * 1.25;
      pts.push(
        new T.Vector3(
          cx + Math.cos(a) * (0.12 + n * 0.027),
          0.142,
          cz + Math.sin(a) * (0.08 + n * 0.018),
        ),
      );
    }
    ripples.push(
      new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, 0.0018, 3, false),
    );
  }
  merge(
    ripples,
    new T.MeshStandardMaterial({
      color: "#71b7ba",
      transparent: true,
      opacity: 0.3,
      roughness: 0.28,
    }),
    "静水涟漪",
  );
  const bounds = new T.Box3().setFromObject(root);
  root.children.forEach((c) => (c.position.y -= bounds.min.y));
  return root;
}
