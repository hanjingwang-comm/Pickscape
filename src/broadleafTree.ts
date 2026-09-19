import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** A photo-inspired mature tree. Hidden branches and scale are inferred. */
export function createBroadleafTreeModel(
  stage: "structure" | "complete" = "complete",
) {
  const root = new T.Group();
  root.name = "舒展阔叶大树";
  root.userData.approximation = "依据照片近似重建；背面枝干、树冠和尺寸为推测";
  let seed = 591334;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let leafSeed = 8391;
  const leafRand = () => {
    leafSeed = (Math.imul(leafSeed, 1664525) + 1013904223) >>> 0;
    return leafSeed / 4294967296;
  };
  const wood: T.BufferGeometry[] = [];
  const foliage: T.BufferGeometry[][] = [[], [], []];
  const bark = new T.Color("#403c2c");
  const greens = ["#49682a", "#658234", "#819348"].map((c) => new T.Color(c));
  const colorize = (g: T.BufferGeometry, c: T.Color) => {
    const p = g.getAttribute("position");
    const colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const shade =
        0.9 + 0.14 * Math.sin(p.getX(i) * 49 + p.getY(i) * 23 + p.getZ(i) * 31);
      colors.set([c.r * shade, c.g * shade, c.b * shade], i * 3);
    }
    g.setAttribute("color", new T.BufferAttribute(colors, 3));
    g.deleteAttribute("uv");
    return g;
  };
  const limb = (
    points: T.Vector3[],
    start: number,
    end: number,
    segments = 16,
  ) => {
    const path = new T.CatmullRomCurve3(points);
    const sides = start > 0.12 ? 16 : start > 0.04 ? 9 : 5;
    const g = new T.TubeGeometry(path, segments, 1, sides, false);
    const p = g.getAttribute("position");
    for (let i = 0; i <= segments; i++) {
      const t = i / segments,
        center = path.getPointAt(t);
      const r = T.MathUtils.lerp(start, end, Math.pow(t, 0.75));
      for (let j = 0; j <= sides; j++) {
        const index = i * (sides + 1) + j;
        const angle = (j / sides) * Math.PI * 2;
        const ridge =
          1 +
          0.09 * Math.sin(angle * 7 + t * 2) +
          0.035 * Math.cos(angle * 13 - t * 9);
        const v = new T.Vector3()
          .fromBufferAttribute(p, index)
          .sub(center)
          .multiplyScalar(r * ridge)
          .add(center);
        p.setXYZ(index, v.x, Math.max(0, v.y), v.z);
      }
    }
    g.computeVertexNormals();
    wood.push(colorize(g, bark));
    return path;
  };
  const v = (x: number, y: number, z: number) => new T.Vector3(x, y, z);
  limb(
    [
      v(0, 0.02, 0),
      v(0.04, 0.58, 0.03),
      v(-0.04, 1.1, 0),
      v(0.12, 1.65, -0.02),
      v(0.02, 2.25, 0.04),
      v(0.14, 2.63, 0),
    ],
    0.28,
    0.025,
    30,
  );
  for (let i = 0; i < 9; i++) {
    const a = (i * Math.PI * 2) / 9;
    limb(
      [
        v(0.02, 0.33, 0),
        v(Math.cos(a) * 0.23, 0.08, Math.sin(a) * 0.23),
        v(Math.cos(a) * 0.52, 0.003, Math.sin(a) * 0.52),
      ],
      0.12,
      0.005,
      10,
    );
  }
  // Low, spreading boughs with branchlets attached to their actual parent curve.
  for (let i = 0; i < 12; i++) {
    const a = i * 2.39996;
    const y = 1.12 + (i % 4) * 0.26;
    const reach = 1.65 + rand() * 0.42 - (i % 4) * 0.1;
    const tip = v(
      Math.cos(a) * reach,
      2.18 + (i % 4) * 0.17 + rand() * 0.12,
      Math.sin(a) * reach * 0.87,
    );
    const b = limb(
      [
        v(0.02, y, 0),
        v(Math.cos(a) * 0.48, y + 0.12, Math.sin(a) * 0.42),
        v(Math.cos(a) * reach * 0.73, tip.y - 0.32, Math.sin(a) * reach * 0.66),
        tip,
      ],
      0.115 - (i % 4) * 0.012,
      0.012,
      20,
    );
    for (let j = 0; j < 6; j++) {
      const start = b.getPointAt(0.27 + j * 0.13);
      const heading = a + (j % 2 ? 1.0 : -1.0);
      const length = 0.38 + rand() * 0.28;
      const end = start
        .clone()
        .add(
          v(
            Math.cos(heading) * length,
            0.15 + rand() * 0.15,
            Math.sin(heading) * length,
          ),
        );
      const twig = limb(
        [
          start,
          start
            .clone()
            .lerp(end, 0.5)
            .add(v(0, 0.045, 0)),
          end,
        ],
        0.024,
        0.0025,
        8,
      );
      if (stage === "structure") continue;
      for (let k = 0; k < 44; k++) {
        const anchor = twig.getPointAt(0.25 + leafRand() * 0.75);
        const theta = leafRand() * Math.PI * 2;
        const radius = Math.sqrt(leafRand()) * 0.36;
        const center = anchor.add(
          v(
            Math.cos(theta) * radius,
            (leafRand() - 0.38) * 0.35,
            Math.sin(theta) * radius,
          ),
        );
        const lengthLeaf = 0.075 + leafRand() * 0.055;
        const width = lengthLeaf * (0.42 + leafRand() * 0.16);
        // Eight-sided folded leaf: individually oriented, opaque geometry; no billboards.
        const coords = [
          0,
          0,
          0,
          0,
          0,
          -lengthLeaf,
          width * 0.75,
          0.009,
          -lengthLeaf * 0.55,
          width,
          0.005,
          0,
          width * 0.62,
          0,
          lengthLeaf * 0.62,
          0,
          -0.006,
          lengthLeaf,
          -width * 0.62,
          0,
          lengthLeaf * 0.62,
          -width,
          0.005,
          0,
          -width * 0.75,
          0.009,
          -lengthLeaf * 0.55,
        ];
        const index: number[] = [];
        for (let q = 1; q <= 8; q++) index.push(0, q, q === 8 ? 1 : q + 1);
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(coords, 3));
        g.setIndex(index);
        g.rotateX((leafRand() - 0.5) * 1.3);
        g.rotateZ((leafRand() - 0.5) * 1.0);
        g.rotateY(leafRand() * Math.PI * 2);
        g.translate(center.x, center.y, center.z);
        g.computeVertexNormals();
        const shade = k % 3;
        foliage[shade].push(colorize(g, greens[shade]));
      }
    }
  }
  const merge = (parts: T.BufferGeometry[], name: string, leaves = false) => {
    if (!parts.length) return;
    const geometry = mergeGeometries(parts, false)!;
    parts.forEach((g) => g.dispose());
    const material = new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: leaves ? 0.85 : 1,
      side: leaves ? T.DoubleSide : T.FrontSide,
    });
    const mesh = new T.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  merge(wood, "根盘、粗树干与横向枝杈");
  foliage.forEach((parts, i) => merge(parts, `分层阔叶树冠 ${i + 1}`, true));
  // Keep a consistent editor-sized asset; all dimensions scale together.
  const bounds = new T.Box3().setFromObject(root);
  const scale = 2.95 / bounds.max.y;
  for (const child of root.children)
    (child as T.Mesh).geometry.scale(scale, scale, scale);
  return root;
}
