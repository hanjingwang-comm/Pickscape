import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
type V = [number, number, number];
/** One movable sectional: segmented upholstery, rounded right chaise, loose cushions. */
export function createCreamSofaModel(
  stage: "structure" | "complete" = "complete",
) {
  const root = new T.Group();
  root.name = "奶油白弧形转角沙发";
  const cloth = new T.MeshStandardMaterial({
    color: "#e9e3d5",
    roughness: 0.98,
  });
  const seam = new T.MeshStandardMaterial({ color: "#d8d0bf", roughness: 1 });
  const under = new T.MeshStandardMaterial({
    color: "#625d51",
    roughness: 0.85,
  });
  const taupe = new T.MeshStandardMaterial({
    color: "#bba28e",
    roughness: 0.99,
  });
  const ochre = new T.MeshStandardMaterial({
    color: "#96602b",
    roughness: 0.92,
  });
  const beige = new T.MeshStandardMaterial({
    color: "#ccb493",
    roughness: 1,
    side: T.DoubleSide,
  });
  const buckets = new Map<string, { m: T.Material; g: T.BufferGeometry[] }>();
  const add = (name: string, g: T.BufferGeometry, m: T.Material) => {
    g.deleteAttribute("uv");
    if (g.index) {
      const c = g.toNonIndexed();
      g.dispose();
      g = c;
    }
    const key = name + ":" + m.uuid;
    if (!buckets.has(key)) buckets.set(key, { m, g: [] });
    buckets.get(key)!.g.push(g);
  };
  const soft = (
    name: string,
    size: V,
    p: V,
    r: number,
    m = cloth,
    rotation: V = [0, 0, 0],
  ) => {
    const g = new RoundedBoxGeometry(...size, 5, r);
    g.applyMatrix4(
      new T.Matrix4().compose(
        new T.Vector3(...p),
        new T.Quaternion().setFromEuler(new T.Euler(...rotation)),
        new T.Vector3(1, 1, 1),
      ),
    );
    add(name, g, m);
  };
  const piping = (name: string, points: V[], m = seam, r = 0.003) =>
    add(
      name,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        40,
        r,
        5,
        false,
      ),
      m,
    );
  // Recessed feet keep the soft upholstery near the floor, with a small contact shadow.
  for (const x of [-1.55, 0.25, 1.38])
    for (const z of [-0.6, 0.17])
      soft("隐藏底脚", [0.13, 0.06, 0.13], [x, 0.03, z], 0.025, under);
  for (const x of [0.88, 1.45])
    soft("贵妃榻底脚", [0.13, 0.06, 0.13], [x, 0.03, 1.02], 0.025, under);
  soft("左侧承托底座", [2.4, 0.2, 0.95], [-0.55, 0.145, -0.23], 0.09);
  soft("右侧圆角贵妃榻", [1.17, 0.38, 1.98], [1.13, 0.24, 0.29], 0.19);
  for (let i = 0; i < 4; i++) {
    const x = -1.44 + i * 0.6;
    soft("分段坐垫", [0.594, 0.25, 0.88], [x, 0.315, -0.235], 0.11);
  }
  // The slight curve across the rear and around the right corner follows the reference silhouette.
  for (let i = 0; i < 7; i++) {
    const x = -1.43 + i * 0.435,
      z = -0.659 + Math.pow((i - 3) / 3, 2) * 0.045;
    soft(
      "竖向软包靠背",
      [0.433, 0.63, 0.33],
      [x, 0.65, z],
      0.15,
      cloth,
      [-0.1, 0, 0],
    );
  }
  soft("左侧圆弧扶手", [0.31, 0.65, 0.98], [-1.83, 0.455, -0.245], 0.154);
  soft(
    "右侧弧形靠背",
    [0.33, 0.63, 0.9],
    [1.59, 0.635, -0.295],
    0.16,
    cloth,
    [0, 0.07, 0],
  );
  if (stage === "complete") {
    const pillow = (
      name: string,
      p: V,
      size: V,
      m: T.Material,
      rotation: V,
    ) => {
      const g = new RoundedBoxGeometry(...size, 5, Math.min(...size) * 0.44);
      const a = g.attributes.position;
      // Softly bulged faces and slightly pinched corners, rather than rigid rectangular pads.
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i),
          y = a.getY(i),
          z = a.getZ(i);
        const u = x / (size[0] / 2),
          v = y / (size[1] / 2);
        const bulge = 0.026 * Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v);
        a.setZ(i, z + Math.sign(z) * bulge);
      }
      g.computeVertexNormals();
      g.applyMatrix4(
        new T.Matrix4().compose(
          new T.Vector3(...p),
          new T.Quaternion().setFromEuler(new T.Euler(...rotation)),
          new T.Vector3(1, 1, 1),
        ),
      );
      add(name, g, m);
    };
    pillow(
      "米褐抱枕",
      [-1.34, 0.63, -0.38],
      [0.39, 0.4, 0.14],
      taupe,
      [-0.2, 0.08, -0.18],
    );
    pillow(
      "奶油抱枕",
      [-1.6, 0.58, -0.22],
      [0.32, 0.33, 0.13],
      cloth,
      [-0.17, 0.15, 0.13],
    );
    pillow(
      "焦糖抱枕",
      [0.18, 0.59, -0.37],
      [0.44, 0.28, 0.13],
      ochre,
      [-0.22, 0, 0.11],
    );
    pillow(
      "转角米褐抱枕",
      [0.96, 0.65, -0.35],
      [0.43, 0.45, 0.16],
      taupe,
      [-0.29, -0.15, -0.18],
    );
    pillow(
      "转角奶油抱枕",
      [0.65, 0.61, -0.37],
      [0.34, 0.36, 0.15],
      cloth,
      [-0.25, 0.08, 0.2],
    );
    pillow(
      "贵妃榻平放抱枕",
      [1.15, 0.47, 0.34],
      [0.51, 0.15, 0.36],
      ochre,
      [0, -0.1, 0.03],
    );
    // Drape a narrow throw over the chaise, following its seat and rounded front.
    const pos: number[] = [],
      index: number[] = [];
    const rows = 32,
      cols = 12;
    const drape = new T.CatmullRomCurve3([
      new T.Vector3(0, 0.455, 0.14),
      new T.Vector3(0, 0.455, 0.65),
      new T.Vector3(0, 0.451, 1.07),
      new T.Vector3(0, 0.42, 1.23),
      new T.Vector3(0, 0.28, 1.305),
      new T.Vector3(0, 0.065, 1.305),
    ]);
    for (let i = 0; i <= rows; i++) {
      const t = i / rows,
        c = drape.getPoint(t);
      for (let j = 0; j <= cols; j++) {
        const u = j / cols;
        pos.push(
          0.74 + u * 0.33,
          c.y + 0.007 * Math.sin(u * 30 + t * 4),
          c.z + 0.008 * Math.cos(u * 23),
        );
      }
    }
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) {
        const a = i * (cols + 1) + j,
          b = a + cols + 1;
        index.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const blanket = new T.BufferGeometry();
    blanket.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
    blanket.setIndex(index);
    blanket.computeVertexNormals();
    add("米色垂毯", blanket, beige);
    for (let i = 0; i < 14; i++)
      piping(
        "毯边流苏",
        [
          [0.746 + i * 0.024, 0.066, 1.305],
          [0.746 + i * 0.024, 0.035, 1.31],
          [0.75 + i * 0.024, 0.022, 1.305],
        ],
        beige,
        0.0016,
      );
    // Fine upholstery seams remain geometry in the portable GLB.
    piping(
      "贵妃榻缝线",
      [
        [0.64, 0.295, 1.17],
        [0.75, 0.29, 1.254],
        [1.13, 0.29, 1.279],
        [1.52, 0.29, 1.254],
        [1.66, 0.295, 1.14],
      ],
      seam,
      0.002,
    );
  }
  for (const [key, { m, g }] of buckets) {
    const mesh = new T.Mesh(mergeGeometries(g)!, m);
    g.forEach((p) => p.dispose());
    mesh.name = key.split(":")[0];
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  root.userData.approximation =
    "按用户照片近似重建；奶油白软包转角沙发与右侧贵妃榻，抱枕和垂毯随整体移动；隐藏背面、织物与尺寸为推测";
  return root;
}
