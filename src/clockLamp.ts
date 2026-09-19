import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
type V = [number, number, number];
type Stage = "structure" | "complete";

// Own and merge geometry within semantic parts; every instance remains independent.
function builder(name: string) {
  const root = new T.Group();
  root.name = name;
  const buckets = new Map<
    string,
    { material: T.Material; geometries: T.BufferGeometry[] }
  >();
  const add = (
    name: string,
    geometry: T.BufferGeometry,
    material: T.Material,
  ) => {
    geometry.deleteAttribute("uv");
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flat;
    }
    const key = name + material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material, geometries: [] });
    buckets.get(key)!.geometries.push(geometry);
  };
  const done = () => {
    for (const [key, b] of buckets) {
      const geometry = mergeGeometries(b.geometries)!;
      b.geometries.forEach((g) => g.dispose());
      const mesh = new T.Mesh(geometry, b.material);
      mesh.name = key.slice(0, -b.material.uuid.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    }
    root.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(root);
    root.children.forEach((child) => {
      child.position.y -= bounds.min.y;
    });
    root.updateMatrixWorld(true);
    return root;
  };
  return { add, done };
}
const metal = (color: string, metalness = 0.65, roughness = 0.48) =>
  new T.MeshStandardMaterial({ color, metalness, roughness });
function extrude(shape: T.Shape, depth: number) {
  return new T.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0015,
    bevelSize: 0.0015,
    bevelSegments: 1,
    curveSegments: 40,
    steps: 1,
  });
}
function circleHole(x: number, y: number, r: number) {
  const p = new T.Path();
  p.absarc(x, y, r, 0, Math.PI * 2, true);
  return p;
}
function ring(outer: number, inner: number, depth: number) {
  const shape = new T.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  shape.holes.push(circleHole(0, 0, inner));
  return extrude(shape, depth);
}
function beam(a: V, b: V, width: number, depth = width) {
  const start = new T.Vector3(...a),
    end = new T.Vector3(...b),
    delta = end.clone().sub(start);
  return new T.BoxGeometry(width, delta.length(), depth).applyMatrix4(
    new T.Matrix4().compose(
      start.add(end).multiplyScalar(0.5),
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        delta.normalize(),
      ),
      new T.Vector3(1, 1, 1),
    ),
  );
}
export function createGearClockModel(stage: Stage = "complete") {
  const { add, done } = builder("镂空齿轮挂钟");
  const iron = metal("#262c2b", 0.7, 0.45),
    brass = metal("#c8ac68", 0.64, 0.46),
    edge = metal("#9d803f", 0.7, 0.5);
  add("黑铁外圆环", ring(0.65, 0.625, 0.044), iron);
  add("内侧圆环", ring(0.397, 0.382, 0.036).translate(0, 0, 0.007), iron);
  const numerals = [
    "XII",
    "I",
    "II",
    "III",
    "IV",
    "V",
    "VI",
    "VII",
    "VIII",
    "IX",
    "X",
    "XI",
  ];
  for (let n = 0; n < 12; n++) {
    const a = (-n * Math.PI) / 6;
    const transform = new T.Matrix4().makeRotationZ(a);
    const digit = numerals[n],
      spacing = 0.061;
    // The numeral cap-height spans the annular gap; serif strokes connect to both rings.
    for (let j = 0; j < digit.length; j++) {
      const x = (j - (digit.length - 1) / 2) * spacing;
      const line = (
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        w = 0.022,
      ) =>
        add(
          "黄铜罗马数字",
          beam(
            [x + x1 * 1.6, y1, 0.058],
            [x + x2 * 1.6, y2, 0.058],
            w,
            0.024,
          ).applyMatrix4(transform),
          brass,
        );
      const lo = 0.416,
        hi = 0.616;
      if (digit[j] === "I") line(0, lo, 0, hi);
      if (digit[j] === "V") {
        line(-0.014, hi, 0, lo);
        line(0, lo, 0.014, hi);
      }
      if (digit[j] === "X") {
        line(-0.014, hi, 0.014, lo);
        line(0.014, hi, -0.014, lo);
      }
      line(-0.02, lo, 0.02, lo, 0.011);
      line(-0.02, hi, 0.02, hi, 0.011);
    }
  }
  if (stage === "structure") {
    edge.dispose();
    return done();
  }
  function gear(
    name: string,
    x: number,
    y: number,
    r: number,
    teeth: number,
    holes: number,
  ) {
    const shape = new T.Shape();
    for (let i = 0; i < teeth * 4; i++) {
      const a = (i / (teeth * 4)) * Math.PI * 2,
        radius = r * (i % 4 === 0 || i % 4 === 3 ? 0.86 : 1);
      const px = Math.cos(a) * radius,
        py = Math.sin(a) * radius;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();
    shape.holes.push(circleHole(0, 0, r * 0.115));
    for (let i = 0; i < holes; i++) {
      const a = (i * Math.PI * 2) / holes;
      if (holes === 6)
        shape.holes.push(
          circleHole(Math.cos(a) * r * 0.47, Math.sin(a) * r * 0.47, r * 0.13),
        );
      else {
        const hole = new T.Path();
        const a0 = a + 0.16,
          a1 = a + (Math.PI * 2) / holes - 0.16;
        hole.absarc(0, 0, r * 0.65, a0, a1, false);
        hole.lineTo(Math.cos(a1) * r * 0.28, Math.sin(a1) * r * 0.28);
        hole.absarc(0, 0, r * 0.28, a1, a0, true);
        hole.closePath();
        shape.holes.push(hole);
      }
    }
    add(name, extrude(shape, 0.027).translate(x, y, 0.025), brass);
    add(
      name + "轮毂",
      ring(r * 0.21, r * 0.09, 0.018).translate(x, y, 0.054),
      edge,
    );
    add("背部支架", beam([0, 0, 0.005], [x, y, 0.005], 0.027, 0.025), iron);
  }
  gear("下方大齿轮", -0.108, -0.105, 0.215, 32, 3);
  gear("右侧齿轮", 0.218, -0.098, 0.143, 28, 4);
  gear("顶部齿轮", 0.018, 0.23, 0.153, 30, 6);
  function hand(name: string, length: number, angle: number) {
    const shape = new T.Shape();
    shape.moveTo(-0.012, -0.1);
    shape.lineTo(0.012, -0.1);
    shape.lineTo(0.012, length * 0.52);
    shape.bezierCurveTo(0.075, length * 0.67, 0.02, length * 0.81, 0, length);
    shape.bezierCurveTo(
      -0.02,
      length * 0.81,
      -0.075,
      length * 0.67,
      -0.012,
      length * 0.52,
    );
    shape.closePath();
    add(
      name,
      extrude(shape, 0.008).rotateZ(angle).translate(0, 0, 0.098),
      iron,
    );
  }
  hand("时针", 0.31, 0.82);
  hand("分针", 0.46, -1.07);
  add(
    "中心轴帽",
    new T.SphereGeometry(0.03, 20, 12).scale(1, 1, 0.4).translate(0, 0, 0.124),
    brass,
  );
  // Shallow clockwork enclosure behind the openwork dial.
  add(
    "背部机芯盒",
    new T.BoxGeometry(0.115, 0.11, 0.025).translate(0, 0, -0.014),
    iron,
  );
  return done();
}

// A tapered, closed sweep with wood-colour bands baked into vertices (portable GLB).
function driftwood(points: V[], radii: number[], phase: number) {
  const curve = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
  const segments = 64,
    sides = 14,
    frames = curve.computeFrenetFrames(segments, false);
  const vertices: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const dark = new T.Color("#654022"),
    light = new T.Color("#b38449");
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      p = curve.getPointAt(t),
      u = t * (radii.length - 1),
      r = T.MathUtils.lerp(
        radii[Math.floor(u)],
        radii[Math.min(radii.length - 1, Math.floor(u) + 1)],
        u % 1,
      );
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2,
        ridge =
          1 +
          0.1 * Math.sin(a * 5 + t * 8 + phase) +
          0.045 * Math.sin(a * 9 - t * 15);
      const v = p
        .clone()
        .addScaledVector(frames.normals[i], Math.cos(a) * r * ridge)
        .addScaledVector(frames.binormals[i], Math.sin(a) * r * ridge * 0.8);
      vertices.push(v.x, v.y, v.z);
      const tone =
        0.48 +
        0.24 * Math.sin(a * 5 + t * 5 + phase) +
        0.15 * Math.sin(a * 11 + t * 19);
      const c = dark.clone().lerp(light, T.MathUtils.clamp(tone, 0, 1));
      colors.push(c.r, c.g, c.b);
      if (i < segments && j < sides) {
        const k = i * (sides + 1) + j;
        indices.push(
          k,
          k + 1,
          k + sides + 1,
          k + 1,
          k + sides + 2,
          k + sides + 1,
        );
      }
    }
  }
  // Frenet basis uses N x B = tangent; outward winding is checked with ray tests.
  for (const end of [0, segments]) {
    const c = curve.getPointAt(end / segments),
      idx = vertices.length / 3;
    vertices.push(c.x, c.y, c.z);
    colors.push(dark.r, dark.g, dark.b);
    for (let j = 0; j < sides; j++) {
      const k = end * (sides + 1) + j;
      if (end === 0) indices.push(idx, k + 1, k);
      else indices.push(idx, k, k + 1);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
export function createDriftwoodLampModel(stage: Stage = "complete") {
  const { add, done } = builder("原木叶纹落地灯");
  const wood = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.84,
  });
  const shade = new T.MeshStandardMaterial({
    color: "#d9b578",
    roughness: 0.95,
    side: T.DoubleSide,
    emissive: "#ffd083",
    emissiveIntensity: 0.22,
  });
  const pattern = metal("#553c20", 0, 0.94),
    rim = metal("#80603b", 0.1, 0.75);
  const bulb = new T.MeshStandardMaterial({
    color: "#fff1bb",
    emissive: "#ffcf80",
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });
  const branches: { p: V[]; r: number[] }[] = [
    {
      p: [
        [-0.13, 0.045, 0.1],
        [-0.06, 0.36, 0.1],
        [0.09, 0.77, -0.035],
        [-0.09, 1.14, -0.015],
        [-0.025, 1.51, 0],
      ],
      r: [0.105, 0.07, 0.075, 0.098, 0.061],
    },
    {
      p: [
        [0.14, 0.045, 0.02],
        [0.075, 0.33, -0.03],
        [-0.1, 0.66, -0.045],
        [0.04, 1.08, 0.045],
        [-0.02, 1.51, 0],
      ],
      r: [0.08, 0.068, 0.045, 0.06, 0.035],
    },
    {
      p: [
        [-0.035, 0.03, -0.13],
        [0.03, 0.38, -0.085],
        [0.135, 0.68, 0.005],
        [0.105, 0.94, 0.035],
        [0.015, 1.27, 0],
      ],
      r: [0.09, 0.045, 0.035, 0.037, 0.03],
    },
    {
      p: [
        [-0.13, 0.2, 0.1],
        [-0.145, 0.55, 0.09],
        [0.055, 0.93, 0.1],
        [-0.075, 1.26, 0.045],
      ],
      r: [0.03, 0.023, 0.022, 0.034],
    },
  ];
  branches.forEach((b, i) =>
    add("扭转原木根干", driftwood(b.p, b.r, i * 1.7), wood),
  );
  // Drum shade starts just above the joined trunk; the cavity remains open at both ends.
  add(
    "暖色圆筒灯罩",
    new T.CylinderGeometry(0.31, 0.315, 0.43, 64, 1, true).translate(0, 1.7, 0),
    shade,
  );
  for (const y of [1.485, 1.915])
    add(
      "灯罩包边",
      new T.TorusGeometry(0.312, 0.007, 6, 64)
        .rotateX(Math.PI / 2)
        .translate(0, y, 0),
      rim,
    );
  add(
    "灯泡支杆",
    new T.CylinderGeometry(0.012, 0.014, 0.19, 12).translate(0, 1.525, 0),
    rim,
  );
  add(
    "暖光灯泡",
    new T.SphereGeometry(0.044, 16, 12).translate(0, 1.645, 0),
    bulb,
  );
  for (let j = 0; j < 3; j++) {
    const a = (j * Math.PI * 2) / 3;
    add(
      "灯罩内撑",
      beam(
        [0, 1.51, 0],
        [Math.cos(a) * 0.306, 1.51, Math.sin(a) * 0.306],
        0.006,
      ),
      rim,
    );
  }
  if (stage !== "complete") pattern.dispose();
  if (stage === "complete") {
    // Repeating curved leaf midribs and side veins wrap all the way round the drum.
    const surface = (a: number, y: number): V => {
      const r = 0.316 - ((y - 1.485) / 0.43) * 0.005;
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    };
    const stroke = (points: V[], r = 0.0018) =>
      add(
        "叶脉灯罩花纹",
        new T.TubeGeometry(
          new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
          7,
          r,
          3,
          false,
        ),
        pattern,
      );
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI * 2) / 24,
        sway = (i % 2 ? 1 : -1) * 0.075;
      stroke(
        [surface(a, 1.493), surface(a + sway, 1.68), surface(a, 1.906)],
        0.0024,
      );
      for (let j = 0; j < 10; j++)
        for (const sign of [-1, 1]) {
          const y = 1.515 + j * 0.034,
            center = a + sway * Math.sin(((y - 1.493) / 0.413) * Math.PI);
          stroke([
            surface(center, y),
            surface(center + sign * 0.045, y + 0.025),
            surface(center + sign * 0.112, y + 0.047),
          ]);
        }
    }
  }
  return done();
}

/** A separate portable prop: all dots are curved geometry, not external textures. */
export function createDottedFloorLampModel(stage: Stage = "complete") {
  const { add, done } = builder("圆点灯罩串珠落地灯");
  const iron = metal("#252523", 0.45, 0.53);
  const cloth = new T.MeshStandardMaterial({
    color: "#181b18",
    roughness: 0.91,
    side: T.DoubleSide,
  });
  const warm = new T.MeshStandardMaterial({
    color: "#fff1cb",
    emissive: "#ffdda0",
    emissiveIntensity: 0.62,
    roughness: 0.86,
    side: T.DoubleSide,
  });
  const bead = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.56,
  });
  const profile: [number, number][] = [
    [0, 0],
    [0.138, 0],
    [0.163, 0.006],
    [0.169, 0.014],
    [0.163, 0.025],
    [0.144, 0.031],
    [0, 0.031],
  ];
  add(
    "薄圆盘底座",
    new T.LatheGeometry(
      profile.map((p) => new T.Vector2(...p)),
      64,
    ),
    iron,
  );
  add(
    "黑色细灯杆",
    new T.CylinderGeometry(0.011, 0.012, 1.56, 20).translate(0, 0.8, 0),
    iron,
  );
  for (let n = 0; n < 5; n++) {
    const g = new T.SphereGeometry(0.0495, 32, 20);
    const pos = g.attributes.position;
    const colors: number[] = [];
    const base = new T.Color(n === 4 ? "#675334" : "#3c382e");
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k),
        y = pos.getY(k),
        z = pos.getZ(k);
      const grain =
        1 + 0.045 * Math.sin(y * 1200 + Math.sin(Math.atan2(z, x) * 3) * 3);
      const c = base.clone().multiplyScalar(grain);
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    add("五颗深木圆珠", g.translate(0, 1.14 + n * 0.101, 0), bead);
  }
  const shadeY = 1.758,
    radius = 0.232,
    height = 0.294;
  add(
    "黑色圆筒灯罩",
    new T.CylinderGeometry(radius, radius, height, 96, 1, true).translate(
      0,
      shadeY,
      0,
    ),
    cloth,
  );
  for (const y of [shadeY - height / 2, shadeY + height / 2])
    add(
      "灯罩上下包边",
      new T.TorusGeometry(radius, 0.004, 8, 96)
        .rotateX(Math.PI / 2)
        .translate(0, y, 0),
      iron,
    );
  if (stage === "complete") {
    // Wrap circular patches around the cylinder without flat cards or depth fighting.
    for (let row = 0; row < 3; row++)
      for (let column = 0; column < 18; column++) {
        const angle = (column / 18) * Math.PI * 2,
          cy = shadeY + (row - 1) * 0.091;
        const positions: number[] = [],
          normals: number[] = [],
          indices: number[] = [];
        const put = (u: number, v: number) => {
          const a = angle + u / radius,
            r = radius + 0.0007;
          positions.push(Math.sin(a) * r, cy + v, Math.cos(a) * r);
          normals.push(Math.sin(a), 0, Math.cos(a));
        };
        put(0, 0);
        for (let ring = 1; ring <= 4; ring++)
          for (let k = 0; k < 40; k++) {
            const a = (k / 40) * Math.PI * 2;
            put(
              ((0.0338 * ring) / 4) * Math.cos(a),
              ((0.039 * ring) / 4) * Math.sin(a),
            );
          }
        for (let k = 0; k < 40; k++) {
          const next = (k + 1) % 40;
          indices.push(0, 1 + k, 1 + next);
          for (let ring = 0; ring < 3; ring++) {
            const a = 1 + ring * 40 + k,
              b = 1 + ring * 40 + next;
            indices.push(a, a + 40, b, b, a + 40, b + 40);
          }
        }
        const g = new T.BufferGeometry();
        g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
        g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
        g.setIndex(indices);
        add("三排暖白圆点", g, warm);
      }
    add(
      "内侧柔光底片",
      new T.CircleGeometry(0.224, 64)
        .rotateX(Math.PI / 2)
        .translate(0, shadeY - height / 2 + 0.008, 0),
      warm,
    );
    add(
      "暖色灯泡",
      new T.SphereGeometry(0.035, 20, 14).translate(0, 1.715, 0),
      warm,
    );
    for (let n = 0; n < 3; n++) {
      const a = (n / 3) * Math.PI * 2;
      add(
        "灯罩内撑",
        beam(
          [0, 1.66, 0],
          [Math.sin(a) * 0.228, 1.66, Math.cos(a) * 0.228],
          0.004,
        ),
        iron,
      );
    }
  } else warm.dispose();
  const root = done();
  root.userData.approximation =
    "依照片近似重建，背面、灯罩内部和尺寸为推测；灯罩使用暖色发光材质";
  const dots = root.getObjectByName("三排暖白圆点");
  if (dots) dots.receiveShadow = false;
  root.userData.beadCount = 5;
  return root;
}
