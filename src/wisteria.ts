import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Photo-inspired, approximate tree. Dimensions and hidden branches are inferred.
 * Geometry is baked into a few meshes so picking, support bounds and GLB backups
 * use the same real geometry. No per-blossom draw calls or uploaded code.
 */
export function createWisteriaModel(
  stage: "structure" | "flowers" | "complete" = "complete",
) {
  const root = new T.Group();
  root.name = "紫藤花树";
  root.userData.approximation = "单张照片近似重建；背面与尺寸为推测";
  let seed = 71829;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const wood: T.BufferGeometry[] = [],
    stems: T.BufferGeometry[] = [];
  const flowers: T.BufferGeometry[] = [],
    leaves: T.BufferGeometry[] = [];
  const bark = new T.Color("#655143"),
    twig = new T.Color("#6f7050");
  const lilac = ["#8070b3", "#9986c9", "#b6a3e0", "#c7b7e8", "#a090cd"].map(
    (c) => new T.Color(c),
  );
  const green = ["#8c9b53", "#a3ad65", "#708342", "#b6b879"].map(
    (c) => new T.Color(c),
  );
  const colorize = (g: T.BufferGeometry, color: T.Color, variation = 0) => {
    const p = g.getAttribute("position"),
      colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const shade =
        1 +
        variation * Math.sin(p.getX(i) * 31 + p.getY(i) * 7 + p.getZ(i) * 23);
      colors.set([color.r * shade, color.g * shade, color.b * shade], i * 3);
    }
    g.setAttribute("color", new T.BufferAttribute(colors, 3));
    g.deleteAttribute("uv");
    return g;
  };
  type Point = [number, number, number];
  const curve = (points: Point[]) =>
    new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
  const branch = (
    path: T.CatmullRomCurve3,
    radius: number,
    end: number,
    target = wood,
    segments = 20,
  ) => {
    const sides = radius > 0.1 ? 12 : 6;
    const g = new T.TubeGeometry(path, segments, 1, sides, false);
    const p = g.getAttribute("position");
    for (let i = 0; i <= segments; i++) {
      const t = i / segments,
        center = path.getPointAt(t);
      const r = T.MathUtils.lerp(radius, end, t);
      for (let j = 0; j <= sides; j++) {
        const n = i * (sides + 1) + j;
        const v = new T.Vector3().fromBufferAttribute(p, n).sub(center);
        const ridge =
          radius > 0.07
            ? 1 + 0.08 * Math.sin((j / sides) * Math.PI * 10 + t * 9)
            : 1;
        v.multiplyScalar(r * ridge).add(center);
        p.setXYZ(n, v.x, Math.max(0, v.y), v.z);
      }
    }
    g.computeVertexNormals();
    target.push(colorize(g, target === wood ? bark : twig, 0.14));
    return path;
  };
  const trunk = branch(
    curve([
      [0, 0, 0],
      [0.18, 0.55, 0.03],
      [-0.06, 1.13, 0.02],
      [-0.42, 1.74, -0.06],
      [-0.68, 2.14, 0],
    ]),
    0.23,
    0.08,
  );
  // Root flares share the ground-level trunk base.
  for (let n = 0; n < 5; n++) {
    const a = (n * Math.PI * 2) / 5 + 0.3;
    branch(
      curve([
        [0, 0.16, 0],
        [Math.cos(a) * 0.23, 0.075, Math.sin(a) * 0.23],
        [Math.cos(a) * 0.48, 0.008, Math.sin(a) * 0.48],
      ]),
      0.1,
      0.008,
      wood,
      8,
    );
  }
  const boughs: T.CatmullRomCurve3[] = [];
  for (let n = 0; n < 8; n++) {
    const a = n * 2.39996;
    const start = trunk.getPointAt(0.64 + (n % 3) * 0.11);
    const extent = 1.3 + random() * 0.55;
    const end = new T.Vector3(
      -0.5 + Math.cos(a) * extent,
      2.28 + random() * 0.34,
      Math.sin(a) * extent * 0.78,
    );
    const middle = start
      .clone()
      .lerp(end, 0.53)
      .add(new T.Vector3(0, 0.19, 0));
    boughs.push(
      branch(new T.CatmullRomCurve3([start, middle, end]), 0.075, 0.012),
    );
  }
  // Secondary fans have explicit starts on the primary branches.
  const tips: T.Vector3[] = [];
  for (let n = 0; n < boughs.length; n++) {
    const b = boughs[n];
    for (let k = 0; k < 5; k++) {
      const start = b.getPointAt(0.26 + k * 0.155);
      const a = n * 2.39996 + (k % 2 ? 1.05 : -1.05);
      const length = 0.36 + random() * 0.3;
      const end = start
        .clone()
        .add(
          new T.Vector3(
            Math.cos(a) * length,
            0.02 + random() * 0.19,
            Math.sin(a) * length,
          ),
        );
      const mid = start
        .clone()
        .lerp(end, 0.5)
        .add(new T.Vector3(0, 0.08, 0));
      const path = branch(
        new T.CatmullRomCurve3([start, mid, end]),
        0.02,
        0.003,
        wood,
        8,
      );
      for (let j = 0; j < 5; j++) tips.push(path.getPointAt(0.16 + j * 0.2));
    }
  }
  const buildMesh = (
    parts: T.BufferGeometry[],
    name: string,
    material: T.Material,
  ) => {
    if (!parts.length) {
      material.dispose();
      return;
    }
    const g = mergeGeometries(parts, false)!;
    parts.forEach((p) => p.dispose());
    g.computeBoundingBox();
    g.computeBoundingSphere();
    const mesh = new T.Mesh(g, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.partId = name;
    root.add(mesh);
  };
  buildMesh(
    wood,
    "弯曲树干与分枝",
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 }),
  );
  if (stage === "structure") return root;

  // Cupped, two-sided petal: the fold catches light instead of reading as a sphere.
  const petal = new T.BufferGeometry();
  petal.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      [
        0, 0, 0, -0.65, 0.32, 0.12, -0.8, 0.7, 0.3, 0, 1, 0.34, 0.8, 0.7, 0.3,
        0.65, 0.32, 0.12, 0, 0.52, -0.1,
      ],
      3,
    ),
  );
  petal.setIndex([0, 1, 6, 1, 2, 6, 2, 3, 6, 3, 4, 6, 4, 5, 6, 5, 0, 6]);
  petal.computeVertexNormals();
  const matrix = new T.Matrix4(),
    q = new T.Quaternion(),
    euler = new T.Euler();
  const addPetal = (
    origin: T.Vector3,
    size: T.Vector3,
    angles: T.Euler,
    color: T.Color,
    target: T.BufferGeometry[],
  ) => {
    const g = petal.clone();
    matrix.compose(origin, q.setFromEuler(angles), size);
    g.applyMatrix4(matrix);
    target.push(colorize(g, color));
  };
  for (let n = 0; n < tips.length; n++) {
    const tip = tips[n];
    const length = 0.38 + random() * 0.5;
    const sway = (random() - 0.5) * 0.1;
    const bottom = tip.clone().add(new T.Vector3(sway, -length, 0.02));
    branch(
      new T.CatmullRomCurve3([tip, tip.clone().lerp(bottom, 0.5), bottom]),
      0.004,
      0.001,
      stems,
      5,
    );
    const tiers = 10;
    for (let j = 0; j < tiers; j++) {
      const t = j / (tiers - 1),
        width = 0.108 * Math.pow(1 - t, 0.65) + 0.016;
      const angle = j * 2.39996 + n * 1.7;
      for (let k = 0; k < 3; k++) {
        const a = angle + (k * Math.PI * 2) / 3;
        const origin = tip
          .clone()
          .add(
            new T.Vector3(
              sway * t + Math.cos(a) * width * 0.36,
              -t * length,
              Math.sin(a) * width * 0.36,
            ),
          );
        const c = lilac[Math.floor(random() * lilac.length)];
        addPetal(
          origin,
          new T.Vector3(width, 0.12 * (1 - t * 0.72), width * 0.65),
          euler.set(0.55 + random() * 0.3, a, Math.PI * 0.87),
          c,
          flowers,
        );
      }
    }
  }
  if (stage === "complete") {
    for (let n = 0; n < tips.length; n += 5) {
      const start = tips[n],
        a = random() * Math.PI * 2;
      const end = start
        .clone()
        .add(
          new T.Vector3(
            Math.cos(a) * 0.38,
            0.2 + random() * 0.16,
            Math.sin(a) * 0.38,
          ),
        );
      const path = branch(
        new T.CatmullRomCurve3([
          start,
          start
            .clone()
            .lerp(end, 0.6)
            .add(new T.Vector3(0, 0.08, 0)),
          end,
        ]),
        0.005,
        0.001,
        stems,
        6,
      );
      for (let j = 0; j < 5; j++) {
        const anchor = path.getPointAt(0.2 + j * 0.16);
        for (const side of [-1, 1]) {
          const c = green[Math.floor(random() * green.length)];
          addPetal(
            anchor,
            new T.Vector3(0.053, 0.17 - j * 0.012, 0.032),
            euler.set(0.8, a + side * 1.15, side * 0.9),
            c,
            leaves,
          );
        }
      }
    }
  }
  petal.dispose();
  buildMesh(
    stems,
    "花穗与复叶细茎",
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
  );
  buildMesh(
    flowers,
    "垂落紫藤花穗",
    new T.MeshStandardMaterial({
      vertexColors: true,
      side: T.DoubleSide,
      roughness: 0.8,
    }),
  );
  buildMesh(
    leaves,
    "嫩绿复叶",
    new T.MeshStandardMaterial({
      vertexColors: true,
      side: T.DoubleSide,
      roughness: 0.65,
    }),
  );
  root.userData.racemes = tips.length;
  return root;
}
