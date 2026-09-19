import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
export type CocktailKind = "blueCocktail" | "layeredMartini" | "limeHighball";
type V = [number, number, number];
export function createCocktailModel(
  kind: CocktailKind,
  stage: "structure" | "complete" = "complete",
) {
  const root = new T.Group();
  root.name = {
    blueCocktail: "蓝色樱桃鸡尾酒",
    layeredMartini: "分层马天尼",
    limeHighball: "青柠高球鸡尾酒",
  }[kind];
  const glass = new T.MeshPhysicalMaterial({
    color: "#dfeff3",
    roughness: 0.075,
    metalness: 0,
    transparent: true,
    opacity: 0.32,
    transmission: 0.4,
    thickness: 0.005,
    ior: 1.45,
    depthWrite: false,
    side: T.DoubleSide,
  });
  const rim = new T.MeshPhysicalMaterial({
    color: "#f2f7f5",
    roughness: 0.12,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    metalness: 0.12,
  });
  const ice = new T.MeshPhysicalMaterial({
    color: "#d3eef3",
    roughness: 0.19,
    transparent: true,
    opacity: 0.68,
    transmission: 0.2,
    thickness: 0.02,
    depthWrite: false,
  });
  const metal = new T.MeshStandardMaterial({
    color: "#d5b257",
    metalness: 0.8,
    roughness: 0.25,
  });
  const liquid = (color: string) =>
    new T.MeshPhysicalMaterial({
      color,
      roughness: 0.22,
      metalness: 0,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
  const buckets = new Map<string, { m: T.Material; g: T.BufferGeometry[] }>();
  const add = (name: string, g: T.BufferGeometry, m: T.Material) => {
    g.deleteAttribute("uv");
    if (g.index) {
      const copy = g.toNonIndexed();
      g.dispose();
      g = copy;
    }
    const key = name + ":" + m.uuid;
    if (!buckets.has(key)) buckets.set(key, { m, g: [] });
    buckets.get(key)!.g.push(g);
  };
  const lathe = (name: string, profile: [number, number][], m: T.Material) =>
    add(
      name,
      new T.LatheGeometry(
        profile.map((p) => new T.Vector2(...p)),
        56,
      ),
      m,
    );
  const ball = (name: string, p: V, s: V, m: T.Material) =>
    add(name, new T.SphereGeometry(1, 16, 10).scale(...s).translate(...p), m);
  const tube = (name: string, points: V[], r: number, m: T.Material) =>
    add(
      name,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        20,
        r,
        7,
        false,
      ),
      m,
    );
  const ring = (name: string, r: number, y: number, m = rim) =>
    add(
      name,
      new T.TorusGeometry(r, 0.0018, 6, 56)
        .rotateX(Math.PI / 2)
        .translate(0, y, 0),
      m,
    );
  let seed = 7121;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const iceCubes = (count: number, y: number, radius: number) => {
    for (let i = 0; i < count; i++) {
      const angle = i * 2.4,
        r = Math.sqrt(random()) * radius,
        size = 0.014 + random() * 0.015;
      const g = new RoundedBoxGeometry(size, size, size, 1, 0.002);
      g.rotateX(random())
        .rotateY(random() * 3)
        .rotateZ(random())
        .translate(
          Math.cos(angle) * r,
          y + random() * 0.018,
          Math.sin(angle) * r,
        );
      add("碎冰", g, ice);
    }
  };
  if (kind === "blueCocktail") {
    // Continuous hollow hurricane bowl and its slender stem.
    lathe(
      "透明飓风杯",
      [
        [0, 0],
        [0.055, 0],
        [0.057, 0.004],
        [0.043, 0.007],
        [0.009, 0.009],
        [0.005, 0.022],
        [0.005, 0.082],
        [0.015, 0.096],
        [0.035, 0.113],
        [0.056, 0.14],
        [0.071, 0.18],
        [0.072, 0.214],
        [0.064, 0.27],
        [0.051, 0.34],
        [0.051, 0.397],
        [0.056, 0.432],
        [0.053, 0.432],
        [0.048, 0.397],
        [0.048, 0.34],
        [0.061, 0.27],
        [0.069, 0.214],
        [0.068, 0.18],
        [0.053, 0.141],
        [0.032, 0.117],
        [0.012, 0.104],
        [0, 0.104],
      ],
      glass,
    );
    lathe(
      "蓝色酒液",
      [
        [0, 0.11],
        [0.03, 0.12],
        [0.052, 0.144],
        [0.067, 0.182],
        [0.068, 0.214],
        [0.06, 0.27],
        [0.047, 0.34],
        [0.047, 0.398],
        [0.049, 0.412],
        [0, 0.412],
      ],
      liquid("#05b9cf"),
    );
    ring("杯口", 0.0545, 0.432);
    ring("杯脚边缘", 0.054, 0.003);
    if (stage === "complete") {
      iceCubes(17, 0.416, 0.042);
      const cherry = new T.MeshPhysicalMaterial({
        color: "#b8071e",
        roughness: 0.23,
        clearcoat: 0.6,
      });
      const stalk = new T.MeshStandardMaterial({
        color: "#873329",
        roughness: 0.58,
      });
      ball("红樱桃", [-0.012, 0.459, 0], [0.017, 0.018, 0.017], cherry);
      ball("红樱桃", [0.016, 0.439, 0.008], [0.015, 0.016, 0.015], cherry);
      tube(
        "樱桃梗",
        [
          [-0.012, 0.473, 0],
          [-0.031, 0.503, 0],
          [-0.009, 0.537, 0],
          [0.008, 0.548, 0],
        ],
        0.0011,
        stalk,
      );
      tube(
        "樱桃梗",
        [
          [0.016, 0.452, 0.008],
          [0.002, 0.47, 0.003],
          [-0.012, 0.473, 0],
        ],
        0.0009,
        stalk,
      );
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4;
        ball(
          "杯壁水珠",
          [Math.cos(a) * 0.066, 0.17 + random() * 0.11, Math.sin(a) * 0.066],
          [0.0018, 0.0026, 0.0018],
          rim,
        );
      }
    }
  } else if (kind === "layeredMartini") {
    lathe(
      "透明马天尼杯",
      [
        [0, 0],
        [0.064, 0],
        [0.067, 0.004],
        [0.049, 0.008],
        [0.009, 0.009],
        [0.005, 0.03],
        [0.005, 0.163],
        [0.008, 0.19],
        [0.015, 0.199],
        [0.104, 0.337],
        [0.101, 0.338],
        [0.012, 0.204],
        [0, 0.204],
      ],
      glass,
    );
    lathe(
      "琥珀色下层",
      [
        [0, 0.207],
        [0.012, 0.207],
        [0.049, 0.264],
        [0, 0.264],
      ],
      liquid("#c68a16"),
    );
    lathe(
      "莓紫色上层",
      [
        [0, 0.264],
        [0.049, 0.264],
        [0.09, 0.327],
        [0, 0.327],
      ],
      liquid("#a12a6c"),
    );
    ring("杯口", 0.102, 0.338);
    ring("杯脚边缘", 0.064, 0.003);
    if (stage === "complete") {
      tube(
        "金色果签",
        [
          [-0.111, 0.342, 0.005],
          [0.078, 0.342, 0.005],
        ],
        0.0017,
        metal,
      );
      const berry = new T.MeshPhysicalMaterial({
        color: "#211529",
        roughness: 0.25,
        clearcoat: 0.5,
      });
      for (let i = 0; i < 4; i++)
        ball(
          "深色浆果",
          [-0.058 + i * 0.024, 0.347, 0.005],
          [0.011, 0.012, 0.011],
          berry,
        );
      ball("签尾金珠", [-0.092, 0.342, 0.005], [0.006, 0.006, 0.006], metal);
      const leaf = new T.Shape();
      leaf.moveTo(0, 0);
      leaf.quadraticCurveTo(0.018, 0.014, 0.035, 0);
      leaf.quadraticCurveTo(0.018, -0.013, 0, 0);
      const lm = new T.MeshStandardMaterial({
        color: "#71842e",
        side: T.DoubleSide,
        roughness: 0.75,
      });
      add(
        "装饰小叶",
        new T.ShapeGeometry(leaf)
          .rotateX(-Math.PI / 2)
          .translate(-0.045, 0.349, 0.01),
        lm,
      );
    }
  } else {
    lathe(
      "透明高球杯",
      [
        [0, 0],
        [0.051, 0],
        [0.053, 0.008],
        [0.056, 0.29],
        [0.053, 0.294],
        [0.051, 0.29],
        [0.048, 0.034],
        [0, 0.034],
      ],
      glass,
    );
    lathe(
      "紫色高球酒液",
      [
        [0, 0.036],
        [0.046, 0.036],
        [0.049, 0.271],
        [0, 0.271],
      ],
      liquid("#592747"),
    );
    ring("杯口", 0.0545, 0.292);
    ring("厚杯底", 0.0505, 0.009);
    if (stage === "complete") {
      iceCubes(11, 0.272, 0.038);
      const strawPoints: V[] = [
        [0.018, 0.047, -0.009],
        [0.03, 0.23, -0.009],
        [0.071, 0.386, -0.009],
      ];
      tube("金属吸管", strawPoints, 0.0023, metal);
      const peel = new T.MeshStandardMaterial({
          color: "#769631",
          roughness: 0.63,
        }),
        pith = new T.MeshStandardMaterial({ color: "#e4d99a", roughness: 0.8 }),
        flesh = new T.MeshPhysicalMaterial({
          color: "#acb854",
          roughness: 0.48,
          transparent: true,
          opacity: 0.94,
          side: T.DoubleSide,
        });
      const center: V = [-0.022, 0.29, 0.046];
      add(
        "青柠外皮",
        new T.CylinderGeometry(0.039, 0.039, 0.008, 40)
          .rotateX(Math.PI / 2)
          .translate(...center),
        peel,
      );
      add(
        "青柠白瓤",
        new T.CylinderGeometry(0.035, 0.035, 0.0085, 40)
          .rotateX(Math.PI / 2)
          .translate(...center),
        pith,
      );
      for (const side of [-1, 1])
        for (let i = 0; i < 9; i++) {
          const wedge = new T.Shape();
          const a = (i * Math.PI * 2) / 9 + 0.025,
            end = ((i + 1) * Math.PI * 2) / 9 - 0.025;
          wedge.moveTo(Math.cos(a) * 0.004, Math.sin(a) * 0.004);
          wedge.lineTo(Math.cos(a) * 0.032, Math.sin(a) * 0.032);
          wedge.absarc(0, 0, 0.032, a, end, false);
          wedge.lineTo(Math.cos(end) * 0.004, Math.sin(end) * 0.004);
          wedge.closePath();
          add(
            "青柠果肉",
            new T.ShapeGeometry(wedge, 8).translate(
              center[0],
              center[1],
              center[2] + side * 0.0046,
            ),
            flesh,
          );
        }
      tube(
        "杯内青柠皮",
        [
          [0.019, 0.05, 0.029],
          [-0.022, 0.145, 0.028],
          [0.006, 0.212, 0.029],
        ],
        0.003,
        peel,
      );
    }
  }
  for (const [key, { m, g }] of buckets) {
    const geometry = mergeGeometries(g)!;
    g.forEach((part) => part.dispose());
    const mesh = new T.Mesh(geometry, m);
    mesh.name = key.split(":")[0];
    mesh.castShadow = !m.transparent;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  root.userData.approximation =
    "按参考照片近似重建；杯型、配色与装饰保留，液体及冰块为静态几何";
  return root;
}
export const createBlueCocktailModel = (
  stage: "structure" | "complete" = "complete",
) => createCocktailModel("blueCocktail", stage);
export const createLayeredMartiniModel = (
  stage: "structure" | "complete" = "complete",
) => createCocktailModel("layeredMartini", stage);
export const createLimeHighballModel = (
  stage: "structure" | "complete" = "complete",
) => createCocktailModel("limeHighball", stage);
