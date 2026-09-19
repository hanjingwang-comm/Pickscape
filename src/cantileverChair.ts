import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
type V = [number, number, number];

// Round only the bends: the long straight runs must stay straight steel tubes.
function bentTube(points: V[], radius = 0.013, bend = 0.045) {
  const p = points.map((v) => new T.Vector3(...v));
  const path = new T.CurvePath<T.Vector3>();
  let start = p[0];
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.min(
      bend,
      p[i].distanceTo(p[i - 1]) * 0.42,
      p[i].distanceTo(p[i + 1]) * 0.42,
    );
    const enter = p[i]
      .clone()
      .add(p[i - 1].clone().sub(p[i]).normalize().multiplyScalar(d));
    const leave = p[i]
      .clone()
      .add(p[i + 1].clone().sub(p[i]).normalize().multiplyScalar(d));
    path.add(new T.LineCurve3(start, enter));
    path.add(new T.QuadraticBezierCurve3(enter, p[i], leave));
    start = leave;
  }
  path.add(new T.LineCurve3(start, p[p.length - 1]));
  return new T.TubeGeometry(path, points.length * 14, radius, 12, false);
}
function sling() {
  const positions: number[] = [],
    indices: number[] = [];
  const nx = 24,
    nz = 24,
    layer = (nx + 1) * (nz + 1);
  for (let side = 0; side < 2; side++)
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const u = (i / nx) * 2 - 1,
          v = (j / nz) * 2 - 1;
        positions.push(
          u * 0.255,
          0.486 - 0.026 * (1 - u * u) * (1 - v * v) - side * 0.012,
          v * 0.248 + 0.015,
        );
      }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i,
        b = a + 1,
        c = a + nx + 1,
        d = c + 1;
      indices.push(
        a,
        c,
        b,
        b,
        c,
        d,
        a + layer,
        b + layer,
        c + layer,
        b + layer,
        d + layer,
        c + layer,
      );
    }
  const edge: number[] = [];
  for (let i = 0; i <= nx; i++) edge.push(i);
  for (let j = 1; j <= nz; j++) edge.push(j * (nx + 1) + nx);
  for (let i = nx - 1; i >= 0; i--) edge.push(nz * (nx + 1) + i);
  for (let j = nz - 1; j > 0; j--) edge.push(j * (nx + 1));
  for (let i = 0; i < edge.length; i++) {
    const a = edge[i],
      b = edge[(i + 1) % edge.length];
    indices.push(a, b, a + layer, b, b + layer, a + layer);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function createCantileverChairModel(
  stage: "structure" | "complete" = "complete",
) {
  const root = new T.Group();
  root.name = "黑皮镀铬悬臂椅";
  const chrome = new T.MeshStandardMaterial({
    color: "#c8cdd0",
    metalness: 1,
    roughness: 0.19,
  });
  const leather = new T.MeshStandardMaterial({
    color: "#171c20",
    roughness: 0.48,
  });
  const edges = new T.MeshStandardMaterial({
    color: "#303536",
    roughness: 0.63,
  });
  const rubber = new T.MeshStandardMaterial({
    color: "#252527",
    roughness: 0.88,
  });
  const groups = new Map<string, { g: T.BufferGeometry[]; m: T.Material }>();
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
    if (!groups.has(name)) groups.set(name, { g: [], m });
    groups.get(name)!.g.push(g);
  };
  const pad = (
    name: string,
    size: V,
    p: V,
    material: T.Material,
    r: V = [0, 0, 0],
    round = 0.008,
  ) => add(name, new RoundedBoxGeometry(...size, 3, round), material, p, r);
  for (const sign of [-1, 1]) {
    const x = sign * 0.291;
    add(
      "镀铬连续悬臂管",
      bentTube(
        [
          [x, 0.024, -0.303],
          [x, 0.024, 0.325],
          [x, 0.696, 0.325],
          [x, 0.696, -0.24],
          [x, 0.479, -0.24],
          [x, 0.479, 0.257],
        ],
        0.013,
        0.062,
      ),
      chrome,
    );
    add(
      "后倾靠背支撑管",
      bentTube(
        [
          [sign * 0.247, 0.482, -0.223],
          [sign * 0.247, 0.613, -0.232],
          [sign * 0.247, 0.948, -0.292],
        ],
        0.011,
        0.025,
      ),
      chrome,
    );
    if (stage === "complete") {
      pad(
        "黑皮扶手包覆",
        [0.039, 0.023, 0.4],
        [x, 0.71, 0.03],
        leather,
        [0, 0, 0],
        0.009,
      );
      for (const z of [-0.205, 0.245])
        pad(
          "防滑接触垫",
          [0.041, 0.016, 0.066],
          [x, 0.008, z],
          rubber,
          [0, 0, 0],
          0.006,
        );
      for (const y of [0.534, 0.676])
        add("圆头紧固件", new T.SphereGeometry(0.009, 12, 8), chrome, [
          sign * 0.303,
          y,
          -0.24,
        ]);
    }
  }
  add(
    "底座圆角横连管",
    bentTube(
      [
        [-0.291, 0.024, -0.22],
        [-0.291, 0.024, -0.327],
        [0.291, 0.024, -0.327],
        [0.291, 0.024, -0.22],
      ],
      0.013,
      0.06,
    ),
    chrome,
  );
  add(
    "座面前横撑",
    bentTube(
      [
        [-0.291, 0.479, 0.257],
        [0.291, 0.479, 0.257],
      ],
      0.011,
    ),
    chrome,
  );
  add("皮革悬吊座面", sling(), leather);
  pad(
    "薄皮革后倾靠背",
    [0.51, 0.337, 0.034],
    [0, 0.784, -0.265],
    leather,
    [-0.17, 0, 0],
    0.013,
  );
  if (stage === "complete") {
    add(
      "座面包边",
      bentTube(
        [
          [-0.25, 0.487, -0.224],
          [-0.25, 0.487, 0.259],
          [0.25, 0.487, 0.259],
          [0.25, 0.487, -0.224],
        ],
        0.0023,
        0.015,
      ),
      edges,
    );
    const back = new T.Matrix4()
      .makeRotationX(-0.17)
      .setPosition(0, 0.784, -0.265);
    const seam = bentTube(
      [
        [-0.244, -0.15, 0.018],
        [-0.244, 0.15, 0.018],
        [0.244, 0.15, 0.018],
        [0.244, -0.15, 0.018],
      ],
      0.0014,
      0.01,
    );
    seam.applyMatrix4(back);
    add("靠背细缝线", seam, edges);
  }
  for (const [name, bucket] of groups) {
    const mesh = new T.Mesh(mergeGeometries(bucket.g)!, bucket.m);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    bucket.g.forEach((g) => g.dispose());
  }
  if (stage === "structure") {
    edges.dispose();
    rubber.dispose();
  }
  const min = new T.Box3().setFromObject(root).min.y;
  root.children.forEach((o) => (o as T.Mesh).geometry.translate(0, -min, 0));
  root.userData.approximation =
    "按参考照片近似重建；背面、连接结构和尺寸为推测";
  return root;
}
