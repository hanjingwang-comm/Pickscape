import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
type Vec = [number, number, number];
function assembly(name: string) {
  const root = new T.Group();
  root.name = name;
  const add = (
    name: string,
    g: T.BufferGeometry,
    m: T.Material,
    p: Vec = [0, 0, 0],
  ) => {
    const mesh = new T.Mesh(g, m);
    mesh.name = name;
    mesh.position.fromArray(p);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const box = (name: string, size: Vec, p: Vec, m: T.Material, r = 0.015) =>
    add(name, new RoundedBoxGeometry(...size, 2, r), m, p);
  const rod = (name: string, a: Vec, b: Vec, r: number, m: T.Material) => {
    const v = new T.Vector3(...b).sub(new T.Vector3(...a));
    const g = new T.CylinderGeometry(r, r, v.length(), 10);
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        v.normalize(),
      ),
    );
    return add(
      name,
      g,
      m,
      new T.Vector3(...a)
        .add(new T.Vector3(...b))
        .multiplyScalar(0.5)
        .toArray() as Vec,
    );
  };
  const finish = () => {
    root.updateMatrixWorld(true);
    const buckets = new Map<
      T.Material,
      { g: T.BufferGeometry[]; names: Set<string> }
    >();
    for (const child of [...root.children]) {
      const mesh = child as T.Mesh;
      const m = mesh.material as T.Material;
      let g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
      g.deleteAttribute("uv");
      if (g.index) {
        const n = g.toNonIndexed();
        g.dispose();
        g = n;
      }
      if (!buckets.has(m)) buckets.set(m, { g: [], names: new Set() });
      buckets.get(m)!.g.push(g);
      buckets.get(m)!.names.add(mesh.name);
      mesh.geometry.dispose();
      root.remove(mesh);
    }
    for (const [m, parts] of buckets) {
      add([...parts.names].join(" · "), mergeGeometries(parts.g)!, m);
      parts.g.forEach((g) => g.dispose());
    }
    const minY = new T.Box3().setFromObject(root).min.y;
    root.children.forEach((c) => (c as T.Mesh).geometry.translate(0, -minY, 0));
    root.userData.approximation =
      "根据用户照片近似重建；背面、尺寸和细部为推测";
    return root;
  };
  return { root, add, box, rod, finish };
}
const mat = (color: string, roughness = 0.8) =>
  new T.MeshStandardMaterial({ color, roughness });

export function createBarTableModel() {
  const b = assembly("胡桃木吧台桌"),
    wood = mat("#805538", 0.66),
    edge = mat("#66432e", 0.72),
    dark = mat("#222522", 0.55),
    grain = mat("#946b47", 0.76);
  // Cabinet and overhanging worktop form one movable L-shaped bar, with open knee room.
  b.box("柜体", [1.15, 1.02, 0.68], [-0.72, 0.53, 0.12], edge);
  b.box("侧封板", [0.045, 1.05, 0.72], [-1.31, 0.525, 0.12], wood);
  for (let i = 0; i < 3; i++)
    b.box(
      "抽屉面板",
      [1.1, 0.318, 0.028],
      [-0.72, 0.185 + i * 0.33, 0.478],
      wood,
      0.006,
    );
  b.box("后侧台面", [1.4, 0.065, 0.78], [-0.66, 1.075, 0.12], wood, 0.009);
  b.box("延伸吧台面", [2.62, 0.065, 0.55], [0, 1.11, -0.32], wood, 0.01);
  for (const z of [-0.53, -0.11])
    b.box("黑钢支腿", [0.033, 1.08, 0.033], [1.21, 0.54, z], dark, 0.003);
  b.rod("横向脚踏", [-0.2, 0.29, -0.11], [1.21, 0.29, -0.11], 0.015, dark);
  // Fine, shallow wood-grain curves stay part of the exportable mesh.
  for (let i = 0; i < 32; i++) {
    const z = -0.575 + i * 0.016;
    const pts = Array.from(
      { length: 20 },
      (_, j) =>
        new T.Vector3(
          -1.27 + (j * 2.54) / 19,
          1.143,
          z + Math.sin(j * 0.8 + i) * 0.004,
        ),
    );
    b.add(
      "木纹",
      new T.TubeGeometry(new T.CatmullRomCurve3(pts), 22, 0.0011, 3, false),
      grain,
    );
  }
  return b.finish();
}
export function createBarStoolModel() {
  const b = assembly("灰绒高脚椅"),
    metal = mat("#292b28", 0.48),
    fabric = mat("#777c77", 0.96),
    seam = mat("#646b65", 0.98);
  b.box("软包坐垫", [0.5, 0.09, 0.47], [0, 0.75, 0], fabric, 0.045);
  for (const x of [-1, 1])
    for (const z of [-1, 1])
      b.rod(
        "外撇钢腿",
        [x * 0.28, 0.012, z * 0.27],
        [x * 0.18, 0.72, z * 0.17],
        0.014,
        metal,
      );
  for (const x of [-1, 1])
    b.rod(
      "侧脚踏",
      [x * 0.24, 0.3, -0.235],
      [x * 0.24, 0.3, 0.235],
      0.012,
      metal,
    );
  b.rod("前脚踏", [-0.24, 0.3, 0.235], [0.24, 0.3, 0.235], 0.014, metal);
  b.rod("后横撑", [-0.22, 0.43, -0.21], [0.22, 0.43, -0.21], 0.01, metal);
  for (const x of [-0.17, 0.17])
    b.rod("靠背支撑", [x, 0.68, -0.15], [x, 1.02, -0.21], 0.012, metal);
  const back = new RoundedBoxGeometry(0.5, 0.37, 0.07, 4, 0.032);
  const pos = back.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i);
    pos.setXYZ(i, x * (1 - y * 0.24), y, pos.getZ(i) + x * x * 0.7 - y * 0.15);
  }
  back.computeVertexNormals();
  b.add("弧面软包靠背", back, fabric, [0, 0.98, -0.2]);
  const pts = Array.from({ length: 17 }, (_, i) => {
    const x = -0.215 + (i * 0.43) / 16;
    return new T.Vector3(x, 1.147, -0.195 + x * x * 0.7);
  });
  b.add(
    "靠背缝线",
    new T.TubeGeometry(new T.CatmullRomCurve3(pts), 20, 0.002, 4, false),
    seam,
  );
  return b.finish();
}

// Fenestrations are actual holes, and the split edges remain visible from both sides.
export function monsteraLeafGeometry(length = 0.7, width = 0.48) {
  const shape = new T.Shape();
  shape.moveTo(0, 0);
  const edge: [[number, number], ...Array<[number, number]>] = [
    [0.25, 0.07],
    [0.75, 0.14],
    [1, 0.26],
    [0.97, 0.34],
    [0.35, 0.37],
    [0.97, 0.43],
    [1, 0.53],
    [0.32, 0.54],
    [0.89, 0.63],
    [0.76, 0.73],
    [0.25, 0.7],
    [0.62, 0.81],
    [0.43, 0.9],
    [0.13, 0.84],
    [0, 1],
  ];
  const outline = [[0,0],...edge,...edge.slice(0,-1).reverse().map(([x,y])=>[-x,y])].map(([x,y])=>new T.Vector2(x*width/2,y*length));
  const startPoint=outline[outline.length-1].clone().lerp(outline[0],.5);
  shape.moveTo(startPoint.x,startPoint.y);
  outline.forEach((point,i)=>{const next=point.clone().lerp(outline[(i+1)%outline.length],.5);shape.quadraticCurveTo(point.x,point.y,next.x,next.y)});
  shape.closePath();
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const hole = new T.Path();
      hole.absellipse(
        side * width * (0.1 - i * 0.012),
        length * (0.24 + i * 0.13),
        width * 0.027,
        length * 0.034,
        0,
        Math.PI * 2,
        true,
        side * 0.35,
      );
      shape.holes.push(hole);
    }
  const g = new T.ShapeGeometry(shape, 10);
  const a = g.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const x = a.getX(i),
      y = a.getY(i) / length;
    a.setZ(
      i,
      0.09 * Math.sin(y * Math.PI) -
        0.11 * y * y +
        Math.abs(x) * 0.2 * Math.sin(y * 14),
    );
  }
  g.computeVertexNormals();
  return g;
}
export function createMonsteraModel() {
  const b = assembly("龟背竹盆栽"),
    pot = mat("#c5c7bf", 0.94),
    soil = mat("#48463a"),
    stem = mat("#56713c", 0.75),
    roots = mat("#716047", 0.95);
  const leaves = ["#315d30", "#44713a", "#507e41"].map(
    (c) =>
      new T.MeshStandardMaterial({
        color: c,
        roughness: 0.46,
        side: T.DoubleSide,
      }),
  );
  const profile: [[number, number], ...Array<[number, number]>] = [
    [0, 0],
    [0.18, 0],
    [0.195, 0.025],
    [0.215, 0.39],
    [0.205, 0.405],
    [0.185, 0.395],
    [0.17, 0.08],
  ];
  // Open concrete planter, with visible soil below its rim.
  b.add(
    "水泥花盆",
    new T.LatheGeometry(
      profile.map((p) => new T.Vector2(...p)),
      40,
    ),
    pot,
  );
  b.add(
    "盆土",
    new T.CylinderGeometry(0.183, 0.183, 0.025, 32),
    soil,
    [0, 0.366, 0],
  );
  const trunk = [
    new T.Vector3(0.04, 0.37, 0),
    new T.Vector3(0.015, 0.67, 0.01),
    new T.Vector3(-0.12, 1.04, 0.01),
    new T.Vector3(-0.02, 1.43, -0.02),
  ];
  const trunkCurve=new T.CatmullRomCurve3(trunk);
  b.add(
    "主茎",
    new T.TubeGeometry(trunkCurve, 24, 0.026, 10, false),
    stem,
  );
  for (let i = 0; i < 7; i++) {
    const t=.14+i*.1, point=trunkCurve.getPointAt(t);
    b.add(
      "茎节",
      new T.TorusGeometry(0.027, 0.004, 5, 12).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),trunkCurve.getTangentAt(t))),
      roots,
      point.toArray() as Vec,
    );
  }
  const specs: [number, number, number, number][] = [
    [-2.6, 1.18, 0.76, 0.59],
    [-0.5, 1.0, 0.72, 0.53],
    [1.0, 1.29, 0.66, 0.52],
    [2.6, 1.4, 0.73, 0.54],
    [-1.2, 1.54, 0.64, 0.48],
    [0.15, 1.47, 0.56, 0.41],
  ];
  specs.forEach(([yaw, y, len, w], i) => {
    const start = trunkCurve.getPointAt(.38+i*.09).toArray() as Vec,
      end: Vec = [Math.cos(yaw) * 0.22, y, Math.sin(yaw) * 0.22];
    const mid = new T.Vector3(...start).lerp(new T.Vector3(...end), 0.6);
    mid.y += 0.06;
    b.add(
      "叶柄",
      new T.TubeGeometry(
        new T.CatmullRomCurve3([
          new T.Vector3(...start),
          mid,
          new T.Vector3(...end),
        ]),
        12,
        0.009,
        7,
        false,
      ),
      stem,
    );
    const leaf = monsteraLeafGeometry(len, w);
    leaf.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        new T.Vector3(
          Math.cos(yaw),
          i === 4 ? 0.55 : 0.15,
          Math.sin(yaw),
        ).normalize(),
      ),
    );
    b.add("开孔裂叶", leaf, leaves[i % 3], end);
  });
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    const pts = [
      new T.Vector3(-0.08, 0.86 + i * 0.045, 0),
      new T.Vector3(Math.cos(a) * 0.12, 0.58, Math.sin(a) * 0.1),
      new T.Vector3(Math.cos(a) * 0.14, 0.38, Math.sin(a) * 0.13),
    ];
    b.add(
      "气生根",
      new T.TubeGeometry(new T.CatmullRomCurve3(pts), 15, 0.004, 6, false),
      roots,
    );
  }
  return b.finish();
}
