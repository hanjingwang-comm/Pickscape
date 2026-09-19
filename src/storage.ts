import { baseSpaceSize, maxSpaceSize } from "./space";
import { fixtureKinds, furnishing } from "./furnishings";
import { openDB } from "idb";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { emptyProject } from "./store";
import { sourceList, uid, type Project } from "./types";
import { parseModel, disposeModel, modelFor } from "./models";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
const db = () =>
  openDB("yidu-studio", 1, {
    upgrade(db) {
      db.createObjectStore("projects", { keyPath: "id" });
      db.createObjectStore("settings");
    },
  });
export async function saveProject(p: Project) {
  const d = await db();
  const t = d.transaction(["projects", "settings"], "readwrite");
  await t.objectStore("projects").put(p);
  await t.objectStore("settings").put(p.id, "active");
  await t.done;
}
export async function listProjects(): Promise<Project[]> {
  return (await db()).getAll("projects");
}
export async function readProject(id: string): Promise<Project | undefined> {
  return (await db()).get("projects", id);
}
export async function initialProject() {
  const d = await db(),
    id = await d.get("settings", "active");
  if (id) {
    const p = await d.get("projects", id);
    if (p) return p as Project;
  }
  const p = emptyProject();
  for (const s of sourceList) {
    const res = await fetch(`/assets/${s.id}.jpg`);
    if (!res.ok) throw new Error("示例照片未能加载，请刷新重试。");
    const blob = await res.blob();
    p.photos.push({
      id: s.id,
      name: s.name,
      blob,
      thumb: await thumbnail(blob),
      example: true,
      source: {
        author: s.author,
        url: s.url,
        license: s.id === "chair" ? "Pexels License" : "Unsplash License",
      },
    });
    p.assets.push({
      id: s.id,
      photoId: s.id,
      name: s.name,
      kind: s.id,
      status: "ready",
    });
  }
  p.instances = [
    {
      id: uid(),
      assetId: "lamp",
      position: [-1.7, 0.9, -0.2],
      rotation: [0, 0, 0],
      scale: 1,
      locked: false,
    },
    {
      id: uid(),
      assetId: "mug",
      position: [0, 0.35, 0.5],
      rotation: [0, -0.35, 0],
      scale: 1,
      locked: false,
    },
    {
      id: uid(),
      assetId: "chair",
      position: [1.5, 0, 0.5],
      rotation: [0, -0.25, 0],
      scale: 1,
      locked: false,
    },
  ];
  await saveProject(p);
  return p;
}
export async function thumbnail(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  if (bitmap.width * bitmap.height > 80_000_000) {
    bitmap.close();
    throw new Error("图片像素过大，请缩小后重试。");
  }
  const c = document.createElement("canvas");
  const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height));
  c.width = Math.max(1, Math.round(bitmap.width * scale));
  c.height = Math.max(1, Math.round(bitmap.height * scale));
  c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("无法生成预览图"))),
      "image/webp",
      0.85,
    ),
  );
}
export async function validatePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("请上传 JPG、PNG 或 WebP 图片。");
  if (file.size > 20 * 1024 * 1024) throw new Error("单张照片不能超过 20 MB。");
  try {
    return await thumbnail(file);
  } catch {
    throw new Error("图片无法读取或像素过大，请换一张图片。");
  }
}
export function validateProject(p: unknown): asserts p is Project {
  const fail = () => {
    throw new Error("备份内容不完整或格式无效。");
  };
  if (!p || typeof p !== "object") return fail();
  const x = p as Project;
  if (
    x.version !== 1 ||
    typeof x.name !== "string" ||
    !Array.isArray(x.photos) ||
    !Array.isArray(x.assets) ||
    !Array.isArray(x.instances) ||
    x.photos.length > 500 ||
    x.instances.length > 1000
  )
    return fail();
  const vec = (v: unknown) =>
    Array.isArray(v) &&
    v.length === 3 &&
    v.every(
      (n) =>
        typeof n === "number" && Number.isFinite(n) && Math.abs(n) < 100000,
    );
  const ids = (arr: { id: string }[]) =>
    arr.every((i) => typeof i.id === "string") &&
    new Set(arr.map((i) => i.id)).size === arr.length;
  if (!ids(x.photos) || !ids(x.assets) || !ids(x.instances)) return fail();
  if (
    !x.design ||
    !["blank", "living", "gallery", "garden"].includes(x.design.scene) ||
    !["wood", "herringbone", "terrazzo", "checker"].includes(x.design.floor) ||
    !["plain", "linen", "stripes", "botanical"].includes(x.design.wall) ||
    !["morning", "noon", "evening"].includes(x.design.time) ||
    !/^#[0-9a-f]{6}$/i.test(x.design.color)
  )
    return fail();
  if (
    ![x.design.textureScale, x.design.intensity, x.design.softness].every(
      Number.isFinite,
    ) ||
    x.design.textureScale < 0.3 ||
    x.design.textureScale > 3 ||
    x.design.intensity < 0.2 ||
    x.design.intensity > 2 ||
    x.design.softness < 0 ||
    x.design.softness > 8 ||
    !x.camera ||
    !vec(x.camera.position) ||
    !vec(x.camera.target)
  )
    return fail();
  if (
    [x.design.width, x.design.depth].some(
      (value) =>
        value !== undefined &&
        (typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < baseSpaceSize ||
          value > maxSpaceSize),
    )
  )
    return fail();
  const sceneNames = ["blank", "living", "gallery", "garden"];
  if (
    x.sceneKits !== undefined &&
    (!Array.isArray(x.sceneKits) ||
      x.sceneKits.some((v) => !sceneNames.includes(v)))
  )
    return fail();
  if (
    x.gardenBedsEditable !== undefined &&
    typeof x.gardenBedsEditable !== "boolean"
  )
    return fail();
  if (
    x.gardenPergolaEditable !== undefined &&
    typeof x.gardenPergolaEditable !== "boolean"
  )
    return fail();
  if (x.sceneDesigns !== undefined) {
    if (
      !x.sceneDesigns ||
      typeof x.sceneDesigns !== "object" ||
      Object.keys(x.sceneDesigns).some((k) => !sceneNames.includes(k))
    )
      return fail();
    for (const [key, design] of Object.entries(x.sceneDesigns)) {
      if (!design || design.scene !== key) return fail();
      validateProject({ ...x, sceneDesigns: undefined, design });
    }
  }
  for (const photo of x.photos)
    if (
      (photo.referenceKey !== undefined &&
        typeof photo.referenceKey !== "string") ||
      typeof photo.name !== "string" ||
      !(photo.blob instanceof Blob) ||
      !(photo.thumb instanceof Blob) ||
      typeof photo.example !== "boolean" ||
      (photo.source &&
        (!/^https:\/\//.test(photo.source.url) ||
          typeof photo.source.author !== "string"))
    )
      return fail();
  for (const a of x.assets)
    if (
      (a.preserveScale !== undefined && typeof a.preserveScale !== "boolean") ||
      (a.placement !== undefined && a.placement !== "wall") ||
      typeof a.name !== "string" ||
      !x.photos.some((p) => p.id === a.photoId) ||
      !["mug", "lamp", "chair", "glb"].includes(a.kind) ||
      !["pending", "ready"].includes(a.status) ||
      (a.kind === "glb" && a.status === "ready" && !(a.model instanceof Blob))
    )
      return fail();
  for (const i of x.instances)
    if (
      (i.fixture
        ? !fixtureKinds.includes(i.fixture)
        : !x.assets.some((a) => a.id === i.assetId && a.status === "ready")) ||
      (i.fixtureModel !== undefined && !(i.fixtureModel instanceof Blob)) ||
      (i.scene !== undefined && !sceneNames.includes(i.scene)) ||
      (i.wall !== undefined &&
        !["back", "left", "partition", "free"].includes(i.wall)) ||
      (i.stowed !== undefined && typeof i.stowed !== "boolean") ||
      (i.settleOnLoad !== undefined && typeof i.settleOnLoad !== "boolean") ||
      (i.name !== undefined &&
        (typeof i.name !== "string" || i.name.length > 80)) ||
      (i.notes !== undefined &&
        (typeof i.notes !== "string" || i.notes.length > 1000)) ||
      !vec(i.position) ||
      !vec(i.rotation) ||
      !Number.isFinite(i.scale) ||
      i.scale < 0.01 ||
      i.scale > 100 ||
      typeof i.locked !== "boolean"
    )
      return fail();
}
export async function exportProject(p: Project) {
  const files: Record<string, Uint8Array> = {};
  const photos = await Promise.all(
    p.photos.map(async (photo, n) => {
      const blob = `photos/${n}.bin`,
        thumb = `photos/${n}.webp`;
      files[blob] = new Uint8Array(await photo.blob.arrayBuffer());
      files[thumb] = new Uint8Array(await photo.thumb.arrayBuffer());
      return { ...photo, blob, thumb, mime: photo.blob.type };
    }),
  );
  const assets = await Promise.all(
    p.assets.map(async (original, n) => {
      const { generation: _generation, ...a } = original;
      let binary: ArrayBuffer | undefined;
      let preserveScale = a.preserveScale;
      if (a.model) {
        binary = await a.model.arrayBuffer();
      } else if (a.status === "ready") {
        const root = modelFor(a);
        if (root) {
          try {
            binary = (await new GLTFExporter().parseAsync(root, {
              binary: true,
            })) as ArrayBuffer;
            preserveScale = true;
          } finally {
            disposeModel(root);
          }
        }
      }
      if (!binary) return a;
      const path = `models/${n}.glb`;
      files[path] = new Uint8Array(binary);
      return { ...a, model: path, preserveScale };
    }),
  );
  const instances = [];
  for (const i of p.instances) {
    if (!i.fixture) {
      instances.push(i);
      continue;
    }
    const path = `furnishings/${i.fixtureModel ? i.id : i.fixture}.glb`;
    if (!files[path]) {
      if (i.fixtureModel)
        files[path] = new Uint8Array(await i.fixtureModel.arrayBuffer());
      else {
        const root = furnishing(i.fixture);
        try {
          files[path] = new Uint8Array(
            (await new GLTFExporter().parseAsync(root, {
              binary: true,
            })) as ArrayBuffer,
          );
        } finally {
          disposeModel(root);
        }
      }
    }
    instances.push({ ...i, fixtureModel: path });
  }
  files["project.json"] = strToU8(
    JSON.stringify({ ...p, photos, assets, instances }),
  );
  return new Blob([zipSync(files, { level: 0 }) as Uint8Array<ArrayBuffer>], {
    type: "application/octet-stream",
  });
}
export async function importProject(file: File) {
  if (file.size > 200 * 1024 * 1024) throw new Error("备份不能超过 200 MB。");
  let total = 0;
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter(f) {
      total += f.originalSize;
      if (total > 300 * 1024 * 1024) throw new Error("备份解压后过大。");
      return true;
    },
  });
  if (!files["project.json"])
    throw new Error("不是有效的拾境 · Pickscape 备份。");
  const p = JSON.parse(strFromU8(files["project.json"]));
  if (!Array.isArray(p.photos) || !Array.isArray(p.assets))
    throw new Error("备份缺少素材数据。");
  const getBlob = (path: unknown, type: string) => {
    if (typeof path !== "string" || !files[path])
      throw new Error("备份缺少照片或模型文件。");
    return new Blob([files[path] as Uint8Array<ArrayBuffer>], { type });
  };
  p.photos = p.photos.map((v: any) => ({
    ...v,
    blob: getBlob(v.blob, typeof v.mime === "string" ? v.mime : "image/jpeg"),
    thumb: getBlob(v.thumb, "image/webp"),
  }));
  p.assets = p.assets.map((a: any) => ({
    ...a,
    generation: undefined,
    model: a.model ? getBlob(a.model, "model/gltf-binary") : undefined,
  }));
  if (!Array.isArray(p.instances)) throw new Error("备份缺少场景物件。");
  p.instances = p.instances.map((i: any) => ({
    ...i,
    fixtureModel: i.fixtureModel
      ? getBlob(i.fixtureModel, "model/gltf-binary")
      : undefined,
  }));
  validateProject(p);
  for (const i of p.instances)
    if (i.fixtureModel) {
      const root = await parseModel(i.fixtureModel, true);
      disposeModel(root);
    }
  for (const photo of p.photos) {
    await thumbnail(photo.blob);
  }
  for (const a of p.assets)
    if (a.model) {
      const group = await parseModel(a.model);
      disposeModel(group);
    }
  p.id = uid();
  p.name = `${p.name} · 导入`;
  p.updatedAt = Date.now();
  return p;
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
