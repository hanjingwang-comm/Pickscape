import { createBroadleafTreeModel } from "./broadleafTree";
import {
  createCampingChairModel,
  createRectangularKoiPondModel,
} from "./campPond";
import { createCantileverChairModel } from "./cantileverChair";
import {
  createBlueBorderRugModel,
  createBlueModularSofaModel,
} from "./blueLiving";
import {
  createVintageFlowerStandModel,
  createBauhausDisplayModel,
} from "./displayShelves";
import {
  createHighCoffeeTableModel,
  createLowCoffeeTableModel,
  createLoungeChairModel,
} from "./loungeProps";
import {
  createDottedFloorLampModel,
  createGearClockModel,
  createDriftwoodLampModel,
} from "./clockLamp";
import { createCreamSofaModel } from "./creamSofa";
import { createCocktailModel } from "./cocktails";
import { createEquestrianModel } from "./equestrian";
import {
  createMonsteraModel,
  createBarTableModel,
  createBarStoolModel,
} from "./interiorProps";
import {
  createSwingModel,
  createFountainModel,
  createPebblePathModel,
  createTulipsModel,
  createPoppiesModel,
} from "./gardenProps";
import { createPondModel } from "./pond";
import { createWisteriaModel } from "./wisteria";
import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  uid,
  projectDisplayName,
  type Instance,
  type Project,
  type SceneName,
  type V3,
} from "./types";
export const fixtureKinds = [
  "broadleafTree",
  "sofa",
  "table",
  "rug",
  "shelf",
  "plinth",
  "podium",
  "art",
  "plant",
  "bench",
  "planter",
  "gardenBed",
  "pergola",
  "wisteria",
  "pond",
  "swing",
  "fountain",
  "pebblePath",
  "tulips",
  "poppies",
  "monstera",
  "barTable",
  "barStool",
  "equestrian",
  "blueCocktail",
  "layeredMartini",
  "limeHighball",
  "creamSofa",
  "gearClock",
  "driftwoodLamp",
  "highCoffeeTable",
  "lowCoffeeTable",
  "loungeChair",
  "vintageFlowerStand",
  "bauhausDisplay",
  "blueBorderRug",
  "blueModularSofa",
  "cantileverChair",
  "dottedFloorLamp",
  "campingChair",
  "rectangularKoiPond",
] as const;
export type FixtureKind = (typeof fixtureKinds)[number];
export function furnishing(kind: FixtureKind) {
  if (kind === "broadleafTree") return createBroadleafTreeModel();
  if (kind === "campingChair") return createCampingChairModel();
  if (kind === "rectangularKoiPond") return createRectangularKoiPondModel();
  if (kind === "dottedFloorLamp") return createDottedFloorLampModel();
  if (kind === "cantileverChair") return createCantileverChairModel();
  if (kind === "blueBorderRug") return createBlueBorderRugModel();
  if (kind === "blueModularSofa") return createBlueModularSofaModel();
  if (kind === "vintageFlowerStand") return createVintageFlowerStandModel();
  if (kind === "bauhausDisplay") return createBauhausDisplayModel();
  if (kind === "highCoffeeTable") return createHighCoffeeTableModel();
  if (kind === "lowCoffeeTable") return createLowCoffeeTableModel();
  if (kind === "loungeChair") return createLoungeChairModel();
  if (kind === "gearClock") return createGearClockModel();
  if (kind === "driftwoodLamp") return createDriftwoodLampModel();
  if (kind === "creamSofa") return createCreamSofaModel();
  if (
    kind === "blueCocktail" ||
    kind === "layeredMartini" ||
    kind === "limeHighball"
  )
    return createCocktailModel(kind);
  if (kind === "equestrian") return createEquestrianModel();
  if (kind === "monstera") return createMonsteraModel();
  if (kind === "barTable") return createBarTableModel();
  if (kind === "barStool") return createBarStoolModel();
  if (kind === "pergola") {
    const root = new T.Group();
    root.name = "木质花架";
    const timber = new T.MeshStandardMaterial({
      color: "#af9470",
      roughness: 0.88,
    });
    const rafters = new T.MeshStandardMaterial({
      color: "#baa07c",
      roughness: 0.88,
    });
    const beam = (name: string, size: V3, position: V3, material = timber) => {
      const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
      mesh.name = name;
      mesh.position.fromArray(position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    };
    // Local origin is the base midpoint of the former fixed garden structure.
    for (const x of [-1.5, 1.5]) beam("立柱", [0.12, 2.6, 0.12], [x, 1.3, 0]);
    beam("横梁", [3.5, 0.13, 0.16], [0, 2.57, 0]);
    for (let k = 0; k < 9; k++)
      beam(
        "顶棚木条",
        [0.08, 0.12, 1.6],
        [-1.5 + k * 0.38, 2.65, 0.5],
        rafters,
      );
    return root;
  }
  if (kind === "swing") return createSwingModel();
  if (kind === "fountain") return createFountainModel();
  if (kind === "tulips") return createTulipsModel();
  if (kind === "poppies") return createPoppiesModel();
  if (kind === "pebblePath") return createPebblePathModel();
  if (kind === "pond") return createPondModel();
  if (kind === "wisteria") return createWisteriaModel();
  const root = new T.Group();
  const mats = Object.fromEntries(
    Object.entries({
      wood: "#ac8962",
      fabric: "#b1b59b",
      cream: "#e6dfcf",
      dark: "#575b45",
      leaf: "#73815c",
      clay: "#ba8b70",
      paper: "#e7dfcc",
      bed: "#a18f72",
      soil: "#6e7653",
      herb: "#748359",
      flower: "#bbb89a",
      rose: "#b28473",
    }).map(([k, color]) => [
      k,
      new T.MeshStandardMaterial({ color, roughness: 0.86 }),
    ]),
  );
  const add = (g: T.BufferGeometry, p: V3, m = "wood") => {
    const mesh = new T.Mesh(g, mats[m]);
    mesh.position.fromArray(p);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const box = (s: V3, p: V3, m = "wood", r = 0.015) =>
    add(new RoundedBoxGeometry(...s, 2, r), p, m);
  const cyl = (r: number, h: number, p: V3, m = "wood") =>
    add(new T.CylinderGeometry(r, r, h, 32), p, m);
  if (kind === "sofa") {
    box([2.9, 0.25, 1.05], [0, 0.3, 0], "wood");
    for (const x of [-1.3, 1.3]) {
      box([0.2, 0.62, 1.05], [x, 0.66, 0], "fabric", 0.07);
      for (const z of [-0.38, 0.38])
        box([0.08, 0.25, 0.08], [x, 0.125, z], "dark");
    }
    for (const x of [-0.8, 0, 0.8]) {
      box([0.77, 0.25, 0.8], [x, 0.54, 0.05], "cream", 0.07);
      const b = box([0.78, 0.66, 0.23], [x, 0.92, -0.4], "fabric", 0.08);
      b.rotation.x = -0.08;
    }
    const cushion = box([0.5, 0.45, 0.18], [-0.9, 0.85, -0.16], "rose", 0.08);
    cushion.rotation.z = 0.18;
  } else if (kind === "table") {
    box([1.7, 0.12, 1.05], [0, 0.5, 0], "wood", 0.06);
    for (const x of [-0.65, 0.65])
      for (const z of [-0.32, 0.32]) box([0.1, 0.46, 0.1], [x, 0.23, z]);
  } else if (kind === "rug") {
    box([3.5, 0.025, 2.5], [0, 0.014, 0], "cream", 0.01);
    for (const x of [-1.58, 1.58])
      box([0.06, 0.004, 2.35], [x, 0.029, 0], "rose", 0.001);
    for (let n = 0; n < 30; n++)
      for (const z of [-1.28, 1.28])
        box(
          [0.014, 0.008, 0.09],
          [-1.65 + n * 0.113, 0.013, z],
          "cream",
          0.001,
        );
  } else if (kind === "shelf") {
    for (const x of [-0.7, 0.7]) box([0.08, 1.8, 0.4], [x, 0.9, 0]);
    for (const y of [0.08, 0.65, 1.23, 1.78]) box([1.48, 0.06, 0.4], [0, y, 0]);
    for (let n = 0; n < 7; n++)
      box(
        [0.09, 0.35 + (n % 3) * 0.035, 0.25],
        [-0.48 + n * 0.12, 0.85 + (n % 3) * 0.018, 0],
        n % 2 ? "fabric" : "rose",
      );
    cyl(0.12, 0.32, [0.4, 1.42, 0], "cream");
  } else if (kind === "plinth") cyl(0.42, 0.9, [0, 0.45, 0], "cream");
  else if (kind === "podium") box([1.5, 0.35, 1.2], [0, 0.175, 0], "cream");
  else if (kind === "art") {
    box([1.2, 1.55, 0.065], [0, 0.8, 0], "wood");
    box([1.07, 1.42, 0.025], [0, 0.8, 0.048], "paper");
    const sun = add(
      new T.CircleGeometry(0.28, 48),
      [-0.13, 1.02, 0.064],
      "rose",
    );
    sun.castShadow = false;
    box([0.76, 0.13, 0.015], [0.04, 0.44, 0.069], "fabric");
    box([0.07, 0.6, 0.015], [0.29, 0.77, 0.07], "dark");
  } else if (kind === "plant" || kind === "planter") {
    const large = kind === "planter";
    cyl(
      large ? 0.45 : 0.24,
      large ? 0.42 : 0.4,
      [0, large ? 0.21 : 0.2, 0],
      "clay",
    );
    cyl(large ? 0.42 : 0.22, 0.018, [0, large ? 0.427 : 0.407, 0], "dark");
    for (let k = 0; k < (large ? 9 : 5); k++) {
      const angle = k * 2.4,
        h = (large ? 0.7 : 1.15) + (k % 3) * 0.14,
        x = Math.sin(angle) * 0.2,
        z = Math.cos(angle) * 0.2;
      cyl(0.016, h, [x, h / 2 + 0.4, z], "wood");
      for (let j = 0; j < 3; j++) {
        const leaf = add(
          new T.SphereGeometry(1, 12, 8),
          [
            x + Math.sin(angle + j) * 0.12,
            0.5 + h * (0.65 + j * 0.12),
            z + Math.cos(angle + j) * 0.12,
          ],
          "leaf",
        );
        leaf.scale.set(0.2, 0.095, 0.1);
        leaf.rotation.z = angle + j;
      }
    }
  } else if (kind === "gardenBed") {
    add(new T.BoxGeometry(0.48, 0.28, 5.8), [0, 0.14, 0], "bed");
    add(new T.BoxGeometry(0.4, 0.035, 5.6), [0, 0.29, 0], "soil");
    for (let k = 0; k < 24; k++)
      add(
        new T.IcosahedronGeometry(0.16, 1),
        [Math.sin(k * 3) * 0.09, 0.37 + (k % 3) * 0.025, -2.6 + k * 0.23],
        k % 4 ? "herb" : "flower",
      );
  } else if (kind === "bench") {
    for (let n = 0; n < 4; n++)
      box([1.9, 0.07, 0.11], [0, 0.5, -0.22 + n * 0.145]);
    for (const x of [-0.72, 0.72])
      for (const z of [-0.2, 0.2])
        box([0.08, 0.48, 0.08], [x, 0.24, z], "dark");
    for (const x of [-0.8, 0.8])
      box([0.065, 0.65, 0.065], [x, 0.8, -0.3], "dark");
    for (let n = 0; n < 3; n++)
      box([1.9, 0.13, 0.06], [0, 0.75 + n * 0.17, -0.3]);
  }
  return root;
}
// A persisted migration flag prevents removed or stowed beds reappearing on reload.
function ensureGardenBeds(p: Project) {
  if (p.gardenBedsEditable) return;
  for (const [n, x] of [-2.9, 2.9].entries())
    p.instances.push({
      id: uid(),
      assetId: "",
      fixture: "gardenBed",
      name: n === 0 ? "长条花池 · 左" : "长条花池 · 右",
      scene: "garden",
      position: [x, 0, -0.1],
      rotation: [0, 0, 0],
      scale: 1,
      locked: false,
    });
  p.gardenBedsEditable = true;
}
function ensureGardenPergola(p: Project) {
  if (p.gardenPergolaEditable) return;
  if (!p.instances.some((item) => item.fixture === "pergola"))
    p.instances.push({
      id: uid(),
      assetId: "",
      fixture: "pergola",
      name: "木质花架",
      scene: "garden",
      position: [-1.3, 0, -2.7],
      rotation: [0, 0, 0],
      scale: 1,
      locked: false,
    });
  // Remember migration even after moving, stowing or deleting the object.
  p.gardenPergolaEditable = true;
}
export function seedScene(p: Project, scene: SceneName) {
  if (scene === "garden") {
    ensureGardenBeds(p);
    ensureGardenPergola(p);
  }
  if (p.sceneKits?.includes(scene)) return;
  p.sceneKits = [...(p.sceneKits || []), scene];
  const put = (
    fixture: FixtureKind,
    name: string,
    position: V3,
    rotation: V3 = [0, 0, 0],
    scale = 1,
  ) =>
    p.instances.push({
      id: uid(),
      assetId: "",
      fixture,
      name,
      scene,
      position,
      rotation,
      scale,
      locked: false,
    });
  if (scene === "living") {
    put("rug", "织边地毯", [0, 0, 0.3]);
    put("sofa", "鼠尾草布艺沙发", [0, 0, -1.95]);
    put("table", "橡木茶几", [0, 0, 0.1]);
    put("shelf", "书架", [-2.65, 0, -1.7], [0, Math.PI / 2, 0]);
    put("plant", "陶盆绿植", [2.35, 0, -2.35]);
  } else if (scene === "gallery") {
    put("plinth", "圆形展台", [-1.7, 0, -0.2]);
    put("podium", "方形展台", [0, 0, 0.5]);
    put("art", "构成 · 01", [-1.8, 0.6, -3]);
    put("art", "构成 · 02", [0.35, 0.6, -3], [0, 0, 0], 0.8);
    put("plinth", "雕塑展台", [2, 0, -1.5]);
  } else if (scene === "garden") {
    put("bench", "花园长椅", [-1.3, 0, -1.8], [0, 0.12, 0]);
    put("plant", "橄榄树", [2.2, 0, -2.25], [0, 0, 0], 1.5);
    put("planter", "香草花盆", [-2.5, 0, 1.9]);
    put("planter", "庭院花盆", [2.35, 0, 1.5], [0, 0, 0], 1.2);
  }
}
export const inScene = (i: Instance, scene: SceneName) =>
  !i.scene || i.scene === scene;
export function inventoryFor(project: Project) {
  return {
    placed: project.instances.filter(
      (item) => !item.stowed && inScene(item, project.design.scene),
    ),
    stored: project.instances.filter((item) => !!item.stowed),
    elsewhere: project.instances.filter(
      (item) => !item.stowed && !inScene(item, project.design.scene),
    ),
  };
}
export function upgradeProject(p: Project) {
  p = { ...p, name: projectDisplayName(p.name) };
  if (!p.sceneKits) {
    p = {
      ...p,
      instances: p.instances.map((i) => ({ ...i, scene: p.design.scene })),
      sceneKits: [],
    };
  }
  if (p.sceneKits?.includes("garden")) {
    ensureGardenBeds(p);
    ensureGardenPergola(p);
  }
  seedScene(p, p.design.scene);
  return p;
}
