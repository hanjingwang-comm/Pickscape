import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type GardenProp =
  | "broadleafTree"
  | "swing"
  | "fountain"
  | "pebblePath"
  | "tulips"
  | "poppies"
  | "monstera"
  | "barTable"
  | "barStool"
  | "equestrian"
  | "blueCocktail"
  | "layeredMartini"
  | "limeHighball"
  | "creamSofa"
  | "gearClock"
  | "driftwoodLamp"
  | "highCoffeeTable"
  | "lowCoffeeTable"
  | "loungeChair"
  | "vintageFlowerStand"
  | "bauhausDisplay"
  | "blueBorderRug"
  | "blueModularSofa"
  | "cantileverChair"
  | "dottedFloorLamp"
  | "campingChair"
  | "rectangularKoiPond";
export type PropStage = "structure" | "complete";
export const gardenPropCatalog = [
  {
    kind: "broadleafTree",
    name: "舒展阔叶大树",
    note: "粗壮暗色树干、外露根盘、横向伸展枝杈与层叠绿叶树冠；依据照片近似重建，整树可移动。",
    reference: new URL(
      "./assets/references/broadleaf-tree/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "campingChair",
    name: "卡其布兜露营椅",
    note: "卡其色下陷布兜、侧翼开口、黑色包边与交叉管架；按照片近似重建，可独立摆放。",
    reference: new URL(
      "./assets/references/camp-pond/chair.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "rectangularKoiPond",
    name: "方形锦鲤景观鱼池",
    note: "长方形浅池、木饰面、后侧高低水槽、跌水口、双涌泉与锦鲤；按照片近似重建，水景与鱼为静态造型，整池移动。",
    reference: new URL(
      "./assets/references/camp-pond/pond.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "dottedFloorLamp",
    name: "圆点灯罩串珠落地灯",
    note: "黑底三排暖白圆点灯罩、五颗深木圆珠、细黑灯杆和薄圆盘底座；依参考照片近似重建，灯罩带暖色发光材质。",
    reference: new URL(
      "./assets/references/dotted-lamp/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "cantileverChair",
    name: "黑皮镀铬悬臂椅",
    note: "黑色薄皮革座背、微后倾靠背与镀铬弯管悬臂底座；依照片近似重建，背面连接和尺寸为推测。",
    reference: new URL(
      "./assets/references/cantilever-chair/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "blueBorderRug",
    name: "红白边框蓝色地毯",
    note: "蓝色绒面中心、米白宽边、红白细条纹与外圈红色色块；按照片近似重建的独立薄地毯，可自由摆放。",
    reference: new URL(
      "./assets/references/blue-living/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "blueModularSofa",
    name: "深蓝模块布艺沙发",
    note: "左窄右宽的深蓝圆角座块、分段靠背、格纹方枕与条纹长枕；按照片近似重建，抱枕随沙发整体移动。",
    reference: new URL(
      "./assets/references/blue-living/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "vintageFlowerStand",
    name: "复古垂藤花架",
    note: "暖棕波形木架、多层陶瓷花器、瓶插花束与垂落绿藤；按照片近似重建，陈列物随花架整体移动。",
    reference: new URL(
      "./assets/references/display-shelves/flower.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "bauhausDisplay",
    name: "包豪斯模块展示架",
    note: "银灰细杆层板与底柜，配书籍、几何唱片封面、蓝色音箱和播放器；按照片近似重建为独立可移动物件，陈列物随架整体移动。",
    reference: new URL(
      "./assets/references/display-shelves/bauhaus.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "highCoffeeTable",
    name: "黑面高圆茶几",
    note: "黑色薄台面、胡桃木圆鼓围板与黑钢圆环底座；按照片近似重建，可与白面低圆茶几组合，桌面可承放物品。",
    reference: new URL(
      "./assets/references/lounge/tables.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "lowCoffeeTable",
    name: "白面低圆茶几",
    note: "白色薄台面、胡桃木圆鼓围板与黑钢圆环底座；按照片近似重建，可独立移动与高款错落组合。",
    reference: new URL(
      "./assets/references/lounge/tables.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "loungeChair",
    name: "奶油软包懒人沙发",
    note: "奶油色厚软包、双扣头枕、环抱扶手、深色蛋形外壳与喇叭圆底座；按照片近似重建，背面与尺寸为推测。",
    reference: new URL(
      "./assets/references/lounge/chair.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "gearClock",
    name: "镂空齿轮挂钟",
    note: "黑铁圆环、金色罗马数字、镂空齿轮与双指针；按照片近似重建的静态装饰钟，可沿墙移动。",
    reference: new URL(
      "./assets/references/clock-lamp/clock.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "driftwoodLamp",
    name: "原木叶纹落地灯",
    note: "扭转原木根干、透空分叉与暖色叶纹圆筒灯罩；按照片近似重建，灯罩呈暖光，背面及尺寸为推测。",
    reference: new URL(
      "./assets/references/clock-lamp/lamp.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "swing",
    name: "双座秋千",
    note: "A 字支架与红黄双座；按照片近似重建，绳索、背面连接与尺寸为推测。静态庭院物件。",
    reference: new URL(
      "./assets/references/garden-props/swing/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "fountain",
    name: "石雕许愿池",
    note: "双层花瓣水盘、石雕人物装饰与环池繁花；白、粉、淡紫和黄色花丛与许愿池一同移动。雕刻简化，水流为静态几何。",
    reference: new URL(
      "./assets/references/garden-props/fountain/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "pebblePath",
    name: "鹅卵石小路",
    note: "提取参考图的石铺路面，保留灰白与暖黄石色。S 形蜿蜒路段，约 3.8 空间单位长，可复制组合；石块分布与厚度为推测。",
    reference: new URL(
      "./assets/references/garden-props/pebblePath/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "tulips",
    name: "紫色郁金香花丛",
    note: "深紫与玫紫色杯状郁金香、宽叶及低矮碎花；按用户照片近似重建，整丛可移动、旋转和复制。",
    reference: new URL(
      "./assets/references/garden-props/tulips/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "poppies",
    name: "虞美人花丛",
    note: "红、橙、金黄与杏粉色薄瓣花朵，搭配细茎、花蕾和种荚；按用户照片近似重建，整丛可移动、旋转和复制。",
    reference: new URL(
      "./assets/references/garden-props/poppies/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "monstera",
    name: "龟背竹盆栽",
    note: "开孔裂叶、气生根与水泥花盆；根据照片近似重建。",
    reference: new URL(
      "./assets/references/interior-props/monstera.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "barTable",
    name: "胡桃木吧台桌",
    note: "木质柜体、外伸吧台面与黑钢支腿；近似重建，桌椅可分别摆放。",
    reference: new URL(
      "./assets/references/interior-props/bar.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "barStool",
    name: "灰绒高脚椅",
    note: "灰色软包弧形靠背、黑钢外撇椅腿与脚踏；近似重建，可复制搭配吧台。",
    reference: new URL(
      "./assets/references/interior-props/bar.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "equestrian",
    name: "金色骑马雕像",
    note: "扬起前蹄的金色骏马、骑士、缰绳与深色石座；按照片近似重建，人物及衣甲雕刻简化，静态整体物件。",
    reference: new URL(
      "./assets/references/equestrian/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "blueCocktail",
    name: "蓝色樱桃鸡尾酒",
    note: "蓝色酒液、飓风杯、碎冰与双樱桃；照片近似重建，可独立放置于桌面。",
    reference: new URL(
      "./assets/references/cocktails/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "layeredMartini",
    name: "分层马天尼",
    note: "锥形高脚杯、琥珀与莓紫双色酒液、金色浆果签；照片近似重建。",
    reference: new URL(
      "./assets/references/cocktails/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "limeHighball",
    name: "青柠高球鸡尾酒",
    note: "紫色酒液、厚底直筒杯、青柠切片与金属吸管；照片近似重建。",
    reference: new URL(
      "./assets/references/cocktails/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "creamSofa",
    name: "奶油白弧形转角沙发",
    note: "分段奶油白软包、右侧贵妃榻、米褐与焦糖抱枕和垂毯；按照片近似重建，整体可移动、旋转和复制。",
    reference: new URL(
      "./assets/references/cream-sofa/reference.png",
      import.meta.url,
    ).href,
  },
] as const;

type Vec = [number, number, number];
// Bake transforms and merge only within each semantic assembly/material.
// Every factory call owns its geometry and materials; no shared mutable models.
function builder(name: string) {
  const root = new T.Group();
  root.name = name;
  const buckets = new Map<
    string,
    { material: T.Material; geometries: T.BufferGeometry[] }
  >();
  const add = (
    part: string,
    geometry: T.BufferGeometry,
    material: T.Material,
    position: Vec = [0, 0, 0],
    scale: Vec = [1, 1, 1],
  ) => {
    geometry.scale(...scale).translate(...position);
    geometry.deleteAttribute("uv");
    if (geometry.index) {
      const expanded = geometry.toNonIndexed();
      geometry.dispose();
      geometry = expanded;
    }
    const key = part + ":" + material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material, geometries: [] });
    buckets.get(key)!.geometries.push(geometry);
  };
  const ball = (part: string, p: Vec, size: Vec, m: T.Material) =>
    add(
      part,
      new T.SphereGeometry(
        1,
        Math.max(...size) < 0.025 ? 6 : Math.max(...size) < 0.07 ? 8 : 14,
        Math.max(...size) < 0.025 ? 4 : Math.max(...size) < 0.07 ? 6 : 10,
      ),
      m,
      p,
      size,
    );
  const rod = (
    part: string,
    from: Vec,
    to: Vec,
    radius: number,
    m: T.Material,
    segments = 12,
  ) => {
    const a = new T.Vector3(...from),
      b = new T.Vector3(...to),
      direction = b.clone().sub(a);
    const g = new T.CylinderGeometry(
      radius,
      radius,
      direction.length(),
      segments,
    );
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        direction.normalize(),
      ),
    );
    add(part, g, m, a.add(b).multiplyScalar(0.5).toArray() as Vec);
  };
  const tube = (
    part: string,
    points: Vec[],
    radius: number,
    m: T.Material,
    segments = 24,
  ) =>
    add(
      part,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        segments,
        radius,
        6,
        false,
      ),
      m,
    );
  const lathe = (
    part: string,
    profile: [number, number][],
    m: T.Material,
    y = 0,
  ) =>
    add(
      part,
      new T.LatheGeometry(
        profile.map((p) => new T.Vector2(...p)),
        48,
      ),
      m,
      [0, y, 0],
    );
  const torus = (
    part: string,
    r: number,
    t: number,
    y: number,
    m: T.Material,
  ) =>
    add(
      part,
      new T.TorusGeometry(r, t, t < 0.02 ? 4 : 8, t < 0.02 ? 32 : 64).rotateX(
        Math.PI / 2,
      ),
      m,
      [0, y, 0],
    );
  const finish = () => {
    for (const [key, { material, geometries }] of buckets) {
      const geometry = mergeGeometries(geometries, false)!;
      geometries.forEach((g) => g.dispose());
      const mesh = new T.Mesh(geometry, material);
      mesh.name = key.split(":")[0];
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    }
    root.userData.approximation =
      "根据用户照片近似重建；隐藏面、尺寸和微小细节为推测";
    return root;
  };
  return { root, add, ball, rod, tube, lathe, torus, finish };
}
const material = (color: string, roughness = 0.8, metalness = 0) =>
  new T.MeshStandardMaterial({ color, roughness, metalness });

// Curved surfaces have real depth, including when viewed from behind or above.
function petalSurface(
  sample: (u: number, v: number) => Vec,
  rows = 8,
  cols = 8,
) {
  const positions: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= rows; row++)
    for (let col = 0; col <= cols; col++)
      positions.push(...sample(row / rows, (col / cols) * 2 - 1));
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const a = row * (cols + 1) + col,
        c = a + cols + 1;
      indices.push(a, c, a + 1, a + 1, c, c + 1);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function flowerBed(kind: "tulips" | "poppies", stage: PropStage) {
  const tulip = kind === "tulips",
    b = builder(tulip ? "紫色郁金香花丛" : "虞美人花丛");
  let seed = tulip ? 8317 : 29103;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const greens = ["#42662b", "#648239", "#315537"].map((c) =>
    material(c, 0.82),
  );
  const petals = (
    tulip
      ? ["#7c155d", "#a41e79", "#590e4e", "#bd308c"]
      : ["#e6391d", "#f17c22", "#efb72e", "#eca58a"]
  ).map((c) => material(c, tulip ? 0.57 : 0.85));
  [...greens, ...petals].forEach((m) => (m.side = T.DoubleSide));
  const center = material(tulip ? "#d8b04b" : "#403824"),
    pollen = material("#d7ab4b");
  b.add(
    "薄土基底",
    new T.CylinderGeometry(1, 1, 0.022, 48),
    material("#4e4930"),
    [0, 0.011, 0],
    [1.02, 1, 0.72],
  );
  const count = tulip ? 29 : 37;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.39996 + random() * 0.3,
      radius = Math.sqrt((i + 0.5) / count);
    const x = Math.cos(angle) * radius * 0.88,
      z = Math.sin(angle) * radius * 0.6;
    const height = (tulip ? 0.53 : 0.42) + random() * (tulip ? 0.32 : 0.66);
    const leanX = (random() - 0.5) * 0.16,
      leanZ = (random() - 0.5) * 0.16;
    const tip: Vec = [x + leanX, height, z + leanZ],
      green = greens[i % greens.length];
    const bud = !tulip && i % 7 === 0;
    b.tube(
      "花茎",
      [[x, 0.023, z], [x + leanX * 0.4, height * 0.6, z + leanZ * 0.4], tip],
      tulip ? 0.009 : 0.0045,
      green,
      9,
    );
    for (let leaf = 0; leaf < (tulip ? 4 : 5); leaf++) {
      const yaw = angle + leaf * 2.38;
      const length = tulip ? 0.32 + random() * 0.2 : 0.13 + random() * 0.1;
      const geometry = petalSurface(
        (u, v) => {
          const w = Math.sin(Math.PI * u) * (tulip ? 0.065 : 0.021) * v;
          const serration = tulip
            ? 1
            : 0.65 + 0.35 * Math.cos(u * Math.PI * 12);
          return [w * serration, Math.sin(u * 1.85) * length, u * length * 0.8];
        },
        9,
        2,
      ).rotateY(yaw);
      b.add(tulip ? "宽披针叶" : "细裂叶", geometry, green, [
        x,
        0.035 + leaf * (tulip ? 0.027 : 0.044),
        z,
      ]);
    }
    if (bud) {
      b.tube(
        "弯垂花蕾梗",
        [
          tip,
          [tip[0] + 0.05, height + 0.055, tip[2]],
          [tip[0] + 0.09, height + 0.012, tip[2]],
        ],
        0.0045,
        green,
        8,
      );
      b.ball(
        "绿色花蕾",
        [tip[0] + 0.09, height, tip[2]],
        [0.028, 0.037, 0.025],
        green,
      );
      continue;
    }
    const flowerScale = 0.8 + random() * 0.32;
    const yaw = random() * Math.PI * 2,
      tilt = (random() - 0.5) * (tulip ? 0.24 : 0.7);
    if (stage === "structure") {
      b.ball(
        "花冠体量",
        [tip[0], tip[1] + (tulip ? 0.075 : 0.02), tip[2]],
        tulip ? [0.07, 0.1, 0.07] : [0.12, 0.035, 0.12],
        petals[i % 4],
      );
      continue;
    }
    for (let p = 0; p < (tulip ? 6 : 5); p++) {
      const phase = (p * Math.PI * 2) / (tulip ? 6 : 5);
      const g = petalSurface(
        (u, v) => {
          if (tulip) {
            // Six overlapping rounded petals form a deep, open cup.
            const a = phase + v * 0.64;
            const r = 0.019 + 0.067 * Math.sin(u * 2.0) + (p % 2) * 0.005;
            return [
              Math.sin(a) * r,
              u * 0.18 - Math.pow(Math.abs(v), 2) * u * 0.025,
              Math.cos(a) * r,
            ];
          }
          const a = phase + v * 0.83;
          const r = 0.009 + u * (0.116 - 0.016 * v * v);
          const ripple = Math.sin(v * 13 + p) * 0.009 * u * u;
          return [
            Math.sin(a) * r,
            0.062 * u * u + ripple - 0.012 * v * v * u,
            Math.cos(a) * r,
          ];
        },
        8,
        8,
      )
        .scale(flowerScale, flowerScale, flowerScale)
        .rotateX(tilt)
        .rotateY(yaw);
      b.add(
        tulip ? "杯状花瓣" : "皱褶薄花瓣",
        g,
        petals[(i + (tulip && p % 3 === 0 ? 1 : 0)) % 4],
        tip,
      );
    }
    b.ball(
      "花心",
      [tip[0], tip[1] + 0.012, tip[2]],
      [0.023, 0.015, 0.023],
      center,
    );
    if (!tulip)
      for (let stamen = 0; stamen < 12; stamen++) {
        const a = (stamen * Math.PI) / 6;
        b.ball(
          "花药",
          [
            tip[0] + Math.sin(a) * 0.028,
            tip[1] + 0.023,
            tip[2] + Math.cos(a) * 0.028,
          ],
          [0.004, 0.005, 0.004],
          pollen,
        );
      }
  }
  if (stage === "complete") {
    const groundPetals = material(tulip ? "#b175c4" : "#738149");
    groundPetals.side = T.DoubleSide;
    for (let i = 0; i < 72; i++) {
      const a = random() * Math.PI * 2,
        r = Math.sqrt(random());
      const x = Math.cos(a) * r * 0.98,
        z = Math.sin(a) * r * 0.66;
      const y = 0.035 + random() * 0.065;
      for (let leaf = 0; leaf < 3; leaf++)
        b.add(
          "地被叶",
          petalSurface(
            (u, v) => [Math.sin(u * Math.PI) * v * 0.028, u * 0.018, u * 0.075],
            4,
            2,
          ).rotateY(a + leaf * 2.1),
          greens[i % 3],
          [x, 0.024, z],
        );
      if (tulip && i % 2 === 0) {
        b.rod("碎花茎", [x, 0.025, z], [x, y, z], 0.0025, greens[0], 5);
        for (let p = 0; p < 5; p++)
          b.add(
            "紫色碎花",
            petalSurface(
              (u, v) => [
                Math.sin(u * Math.PI) * v * 0.014,
                u * 0.012,
                u * 0.03,
              ],
              4,
              2,
            ).rotateY((p * Math.PI * 2) / 5),
            groundPetals,
            [x, y, z],
          );
      }
      if (!tulip && i % 12 === 0) {
        const h = 0.43 + random() * 0.27;
        b.rod("种荚茎", [x, 0.023, z], [x, h, z], 0.004, greens[0], 6);
        b.ball("种荚", [x, h, z], [0.022, 0.031, 0.022], greens[1]);
        b.add("种荚冠", new T.CylinderGeometry(0.026, 0.02, 0.005, 8), center, [
          x,
          h + 0.031,
          z,
        ]);
      }
    }
  }
  return b.finish();
}

export const createTulipsModel = (stage: PropStage = "complete") =>
  flowerBed("tulips", stage);
export const createPoppiesModel = (stage: PropStage = "complete") =>
  flowerBed("poppies", stage);

export function createSwingModel(stage: PropStage = "complete") {
  const b = builder("双座秋千"),
    wood = material("#755233", 0.73),
    fittings = material("#4b493b", 0.45, 0.65),
    rope = material("#76766a", 0.94);
  const seats = [material("#be4939", 0.48), material("#d2b845", 0.48)];
  for (const x of [-1.65, 1.65]) {
    for (const z of [-0.88, 0.88])
      b.rod("A字支架", [x, 0.055, z], [x, 2.7, 0], 0.085, wood);
    b.rod("侧向横撑", [x, 0.98, -0.58], [x, 0.98, 0.58], 0.055, wood);
  }
  b.rod("顶部横梁", [-1.87, 2.73, 0], [1.87, 2.73, 0], 0.105, wood, 20);
  for (const [index, x] of [-0.72, 0.72].entries()) {
    // A shallow U cross-section, extruded front-to-back, keeps seats visibly hollow.
    const shape = new T.Shape();
    shape.moveTo(-0.39, 0.2);
    shape.bezierCurveTo(-0.35, -0.02, -0.26, -0.08, 0, -0.08);
    shape.bezierCurveTo(0.26, -0.08, 0.35, -0.02, 0.39, 0.2);
    shape.lineTo(0.33, 0.21);
    shape.bezierCurveTo(0.28, 0.03, 0.22, -0.015, 0, -0.015);
    shape.bezierCurveTo(-0.22, -0.015, -0.28, 0.03, -0.33, 0.21);
    shape.closePath();
    const seat = new T.ExtrudeGeometry(shape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.018,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 12,
    });
    b.add(index ? "黄色座椅" : "红色座椅", seat, seats[index], [
      x,
      0.66,
      -0.17,
    ]);
    for (const side of [-1, 1])
      b.rod(
        "悬挂绳索",
        [x + side * 0.34, 0.86, 0],
        [x + side * 0.38, 2.66, 0],
        0.018,
        rope,
        8,
      );
  }
  if (stage === "complete") {
    for (const x of [-1.65, 1.65])
      for (const z of [-0.88, 0.88]) {
        b.add(
          "落地脚盘",
          new T.CylinderGeometry(0.135, 0.14, 0.035, 16),
          fittings,
          [x, 0.0175, z],
        );
        for (const dx of [-0.065, 0.065])
          b.ball(
            "地脚螺栓",
            [x + dx, 0.045, z],
            [0.018, 0.012, 0.018],
            fittings,
          );
      }
    for (const x of [-1.1, -0.34, 0.34, 1.1]) {
      b.add(
        "横梁抱箍",
        new T.TorusGeometry(0.111, 0.019, 6, 16).rotateY(Math.PI / 2),
        fittings,
        [x, 2.73, 0],
      );
      b.add("悬挂连接环", new T.TorusGeometry(0.044, 0.012, 6, 14), fittings, [
        x,
        2.595,
        0,
      ]);
    }
    for (const x of [-1.65, 1.65])
      for (const z of [-0.54, 0.54])
        b.ball(
          "横撑铆钉",
          [x + 0.075, 0.98, z],
          [0.016, 0.025, 0.025],
          fittings,
        );
  }
  return b.finish();
}

export function createFountainModel(stage: PropStage = "complete") {
  const b = builder("石雕许愿池"),
    stone = material("#ded8bb", 0.9),
    aged = material("#b9b597", 0.98);
  const water = new T.MeshPhysicalMaterial({
    color: "#89b9b0",
    roughness: 0.22,
    metalness: 0.06,
    clearcoat: 0.85,
  });
  const flow = new T.MeshPhysicalMaterial({
    color: "#d9eee5",
    roughness: 0.19,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
  });
  b.lathe(
    "环形蓄水池",
    [
      [0, 0],
      [1.25, 0],
      [1.3, 0.06],
      [1.3, 0.18],
      [1.24, 0.25],
      [1.12, 0.25],
      [1.08, 0.17],
      [1.08, 0.08],
      [0, 0.08],
    ],
    stone,
  );
  b.torus("池口滚边", 1.19, 0.068, 0.24, stone);
  b.add(
    "池底水面",
    new T.CircleGeometry(1.1, 64).rotateX(-Math.PI / 2),
    water,
    [0, 0.16, 0],
  );
  b.lathe(
    "下层雕花立柱",
    [
      [0, 0.06],
      [0.35, 0.06],
      [0.37, 0.15],
      [0.28, 0.23],
      [0.2, 0.46],
      [0.18, 0.77],
      [0.29, 0.87],
      [0.31, 0.92],
      [0, 0.92],
    ],
    stone,
  );
  const bowl = (name: string, r: number, y: number) =>
    b.lathe(
      name,
      [
        [0, 0],
        [r * 0.3, 0],
        [r * 0.4, 0.06],
        [r * 0.65, 0.11],
        [r * 0.88, 0.22],
        [r, 0.31],
        [r, 0.36],
        [r * 0.94, 0.38],
        [r * 0.87, 0.31],
        [r * 0.7, 0.23],
        [r * 0.36, 0.16],
        [0, 0.16],
      ],
      stone,
      y,
    );
  bowl("下层花瓣水盘", 0.85, 0.82);
  b.add(
    "下盘水面",
    new T.CircleGeometry(0.74, 48).rotateX(-Math.PI / 2),
    water,
    [0, 1.13, 0],
  );
  b.lathe(
    "上层立柱",
    [
      [0, 1],
      [0.23, 1],
      [0.23, 1.19],
      [0.15, 1.26],
      [0.12, 1.49],
      [0.2, 1.56],
      [0, 1.56],
    ],
    stone,
  );
  bowl("上层花瓣水盘", 0.58, 1.5);
  b.add(
    "上盘水面",
    new T.CircleGeometry(0.49, 48).rotateX(-Math.PI / 2),
    water,
    [0, 1.8, 0],
  );
  b.lathe(
    "雕像基座",
    [
      [0, 1.7],
      [0.21, 1.7],
      [0.22, 1.91],
      [0.15, 1.98],
      [0.12, 2.02],
      [0, 2.02],
    ],
    stone,
  );
  // Simplified connected stone figures: seated bodies, bent knees, arms and urn.
  const figure = (x: number, y: number, z: number, s: number, turn: number) => {
    const p = (a: number, c: number, d: number): Vec => [
      x + s * (a * Math.cos(turn) + d * Math.sin(turn)),
      y + s * c,
      z + s * (-a * Math.sin(turn) + d * Math.cos(turn)),
    ];
    const ball = (at: Vec, dim: Vec) =>
      b.ball("人物石雕", p(...at), dim.map((v) => v * s) as Vec, stone);
    ball([0, 0.26, 0], [0.105, 0.19, 0.075]);
    ball([0, 0.5, 0.008], [0.085, 0.098, 0.081]);
    ball([0, 0.4, 0], [0.046, 0.058, 0.043]);
    ball([-0.057, 0.075, 0.065], [0.068, 0.095, 0.1]);
    ball([0.07, 0.09, 0.06], [0.06, 0.11, 0.085]);
    b.tube(
      "人物石雕",
      [p(-0.07, 0.13, 0.07), p(-0.12, 0.04, 0.14), p(-0.1, -0.08, 0.19)],
      0.036 * s,
      stone,
    );
    b.tube(
      "人物石雕",
      [p(0.07, 0.13, 0.07), p(0.14, 0.06, 0.12), p(0.13, -0.075, 0.18)],
      0.035 * s,
      stone,
    );
    b.tube(
      "人物石雕",
      [p(-0.08, 0.36, 0), p(-0.15, 0.27, 0.08), p(-0.08, 0.23, 0.17)],
      0.031 * s,
      stone,
    );
    b.tube(
      "人物石雕",
      [p(0.08, 0.36, 0), p(0.15, 0.31, 0.09), p(0.06, 0.25, 0.18)],
      0.031 * s,
      stone,
    );
    if (stage === "complete") {
      for (let k = 0; k < 13; k++) {
        const a = k * 2.4;
        ball(
          [
            Math.cos(a) * 0.065,
            0.55 + Math.sin(k * 1.6) * 0.035,
            Math.sin(a) * 0.064,
          ],
          [0.032, 0.031, 0.03],
        );
      }
      ball([0, 0.49, 0.08], [0.018, 0.025, 0.017]);
      ball([-0.1, -0.08, 0.2], [0.038, 0.025, 0.064]);
      ball([0.13, -0.075, 0.19], [0.036, 0.025, 0.06]);
    }
  };
  b.ball("雕像承托石", [-0.075, 2.075, -0.055], [0.14, 0.17, 0.12], stone);
  figure(-0.055, 2.09, -0.02, 1.2, -0.28);
  figure(0.14, 1.92, 0.12, 0.72, 0.4);
  b.lathe(
    "雕像抱持水罐",
    [
      [0, 0],
      [0.08, 0],
      [0.12, 0.1],
      [0.105, 0.2],
      [0.07, 0.24],
      [0.1, 0.26],
      [0.1, 0.28],
      [0.06, 0.28],
      [0.05, 0.24],
    ],
    stone,
    2.11,
  );
  if (stage === "complete") {
    for (const [r, y, count] of [
      [0.85, 0.82, 28],
      [0.58, 1.5, 24],
    ]) {
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2,
          point = (radius: number, h: number): Vec => [
            Math.cos(a) * radius,
            y + h,
            Math.sin(a) * radius,
          ];
        b.tube(
          "花瓣浮雕",
          [
            point(r * 0.37, 0.035),
            point(r * 0.62, 0.09),
            point(r * 0.84, 0.19),
            point(r * 0.98, 0.32),
          ],
          0.015,
          stone,
          12,
        );
        b.ball("波浪盘沿", point(r * 0.97, 0.33), [0.033, 0.047, 0.033], stone);
        if (k % 2 === 0) {
          const floor = y > 1 ? 1.14 : 0.17;
          b.tube(
            "垂落水线",
            [
              point(r, 0.33),
              point(r * 1.035, 0.24),
              [Math.cos(a) * r * 1.055, floor, Math.sin(a) * r * 1.055],
            ],
            0.0055,
            flow,
            12,
          );
          for (let n = 0; n < 3; n++)
            b.ball(
              "水滴",
              [
                Math.cos(a) * r * 1.055,
                floor + ((y + 0.27 - floor) * (n + 0.3)) / 3,
                Math.sin(a) * r * 1.055,
              ],
              [0.008, 0.012, 0.008],
              flow,
            );
        }
      }
    }
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      b.tube(
        "柱身叶饰",
        [
          [Math.cos(a) * 0.31, 0.2, Math.sin(a) * 0.31],
          [Math.cos(a) * 0.26, 0.36, Math.sin(a) * 0.26],
          [Math.cos(a) * 0.19, 0.59, Math.sin(a) * 0.19],
        ],
        0.012,
        aged,
        12,
      );
    }
    for (const [r, y] of [
      [0.33, 0.19],
      [0.28, 0.87],
      [0.22, 1.22],
      [0.19, 1.56],
    ])
      b.torus("立柱雕线", r, 0.014, y, aged);
    for (let k = 0; k < 7; k++)
      b.torus("池水涟漪", 0.4 + k * 0.1, 0.0025, 0.164, flow);
    // A few coins sit below the water, making the wishing-pool use legible.
    const bronze = material("#a69a56", 0.42, 0.6);
    for (let k = 0; k < 9; k++) {
      const a = k * 2.4,
        r = 0.47 + (k % 4) * 0.14;
      b.add(
        "许愿硬币",
        new T.CylinderGeometry(0.022, 0.022, 0.006, 12),
        bronze,
        [Math.cos(a) * r, 0.09, Math.sin(a) * r],
      );
    }
  }
  if (stage === "complete") {
    const greens = [material("#456d3e", 0.95), material("#809654", 0.96)];
    const petals = ["#f4edd9", "#df91aa", "#aea1d7", "#e8c458"].map((c) =>
      material(c, 0.78),
    );
    const pollen = material("#bc963b", 0.85);
    [...greens, ...petals].forEach((m) => (m.side = T.DoubleSide));
    let seed = 76312;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const blade = (length: number, width: number) => {
      const points = [
        [0, 0.02, length * 0.45],
        [0, 0, 0],
        [-width * 0.5, 0.02, length * 0.3],
        [-width * 0.45, 0.035, length * 0.75],
        [0, 0.025, length],
        [width * 0.45, 0.035, length * 0.75],
        [width * 0.5, 0.02, length * 0.3],
      ];
      const geometry = new T.BufferGeometry();
      geometry.setAttribute(
        "position",
        new T.Float32BufferAttribute(points.flat(), 3),
      );
      geometry.setIndex(
        Array.from({ length: 6 }, (_, k) => [
          0,
          k + 1,
          ((k + 1) % 6) + 1,
        ]).flat(),
      );
      geometry.computeVertexNormals();
      return geometry;
    };
    for (let cluster = 0; cluster < 24; cluster++) {
      const angle = (cluster / 24) * Math.PI * 2,
        radius = 1.46 + random() * 0.15;
      const x = Math.cos(angle) * radius,
        z = Math.sin(angle) * radius;
      // Dense foliage grows from ground level. Taller rear flowers leave the front pool rim visible.
      for (let leaf = 0; leaf < 13; leaf++) {
        const g = blade(0.22 + random() * 0.24, 0.08 + random() * 0.055);
        g.rotateX(-0.25 - random() * 0.9).rotateY(random() * Math.PI * 2);
        b.add("环池绿叶", g, greens[leaf % 2], [
          x + (random() - 0.5) * 0.22,
          0.025 + random() * 0.055,
          z + (random() - 0.5) * 0.22,
        ]);
      }
      for (let flower = 0; flower < 6; flower++) {
        const fx = x + (random() - 0.5) * 0.28,
          fz = z + (random() - 0.5) * 0.28;
        const height = 0.24 + random() * 0.23 + (z < 0 ? 0.16 : 0);
        b.rod(
          "环池绿叶",
          [fx, 0.035, fz],
          [fx, height, fz],
          0.009,
          greens[0],
          5,
        );
        for (let leaf = 0; leaf < 3; leaf++) {
          const g = blade(0.16 + random() * 0.12, 0.065);
          g.rotateX(-0.45).rotateY(random() * Math.PI * 2);
          b.add("环池绿叶", g, greens[leaf % 2], [
            fx,
            (height * (leaf + 1)) / 5,
            fz,
          ]);
        }
        const color = petals[(cluster + (flower % 2)) % 4],
          petalsCount = cluster % 3 === 0 ? 8 : 6;
        const length = 0.08 + random() * 0.055;
        for (let petal = 0; petal < petalsCount; petal++) {
          const g = blade(length, length * 0.8);
          g.rotateY((petal / petalsCount) * Math.PI * 2 + cluster);
          b.add("环池花朵", g, color, [fx, height, fz]);
        }
        b.add(
          "花蕊",
          new T.SphereGeometry(1, 6, 4),
          pollen,
          [fx, height + 0.018, fz],
          [0.025, 0.019, 0.025],
        );
      }
    }
  }
  return b.finish();
}

export function createPebblePathModel(stage: PropStage = "complete") {
  const b = builder("鹅卵石小路"),
    grout = material("#777967", 1);
  const palette = [
    "#c9c4af",
    "#aeb4b0",
    "#d4c5a1",
    "#b6aa8d",
    "#e0d8c4",
    "#a2a69b",
  ].map((c) => material(c, 0.96));
  const length = 3.8,
    width = 1.05;
  const centerline = (t: number) => 0.62 * Math.sin(t * Math.PI * 2);
  const base = new T.Shape();
  for (let side = 0; side < 2; side++)
    for (let k = 0; k <= 64; k++) {
      const t = side === 0 ? k / 64 : 1 - k / 64;
      const x = centerline(t) + (side === 0 ? -width / 2 : width / 2),
        z = (t - 0.5) * length;
      if (side === 0 && k === 0) base.moveTo(x, -z);
      else base.lineTo(x, -z);
    }
  base.closePath();
  const bed = new T.ExtrudeGeometry(base, {
    depth: 0.022,
    bevelEnabled: false,
    steps: 1,
  });
  bed.rotateX(-Math.PI / 2);
  b.add("蜿蜒路段基底", bed, grout);
  let seed = 50213;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const cols = 5,
    rows = 22;
  const nodes = Array.from({ length: rows + 1 }, (_, row) =>
    Array.from(
      { length: cols + 1 },
      (_, col) =>
        new T.Vector2(
          centerline(row / rows) -
            width / 2 +
            (col * width) / cols +
            (col === 0 || col === cols ? 0 : (random() - 0.5) * 0.075),
          -length / 2 +
            (row * length) / rows +
            (row === 0 || row === rows ? 0 : (random() - 0.5) * 0.055),
        ),
    ),
  );
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const corners = [
        nodes[row][col],
        nodes[row][col + 1],
        nodes[row + 1][col + 1],
        nodes[row + 1][col],
      ];
      const center = corners
        .reduce((v, p) => v.add(p), new T.Vector2())
        .multiplyScalar(0.25);
      const shape = new T.Shape();
      const inset = corners.map((p) => p.clone().lerp(center, 0.18));
      const outline = inset.flatMap((p, k) => [
        p.clone().lerp(inset[(k + 3) % 4], 0.18),
        p.clone().lerp(inset[(k + 1) % 4], 0.18),
      ]);
      outline.forEach((p, k) => {
        if (k === 0) shape.moveTo(p.x, -p.y);
        else shape.lineTo(p.x, -p.y);
      });
      shape.closePath();
      const g = new T.ExtrudeGeometry(shape, {
        depth: 0.035 + random() * 0.018,
        bevelEnabled: stage === "complete",
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
        steps: 1,
      });
      g.rotateX(-Math.PI / 2);
      b.add(
        "不规则石铺路面",
        g,
        palette[Math.floor(random() * palette.length)],
        [0, 0.026, 0],
      );
    }
  return b.finish();
}
