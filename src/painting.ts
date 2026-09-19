import * as T from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { disposeModel } from "./models";

/** A framed, un-cropped image; the supplied picture stays flat on the canvas. */
export function createPaintingModel(texture: T.Texture, aspect: number) {
  if (!Number.isFinite(aspect) || aspect <= 0) throw new Error("图片比例无效");
  const width = 1.2 * Math.min(1, aspect),
    height = width / aspect;
  const rim = 0.055,
    fullWidth = width + rim * 2,
    fullHeight = height + rim * 2;
  const root = new T.Group();
  root.name = "装框画作";
  const wood = new T.MeshStandardMaterial({
    color: "#594534",
    roughness: 0.68,
  });
  const backing = new T.MeshStandardMaterial({
    color: "#9c8b70",
    roughness: 0.95,
  });
  function box(
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    material: T.Material,
  ) {
    const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  box(
    "画框背板",
    [fullWidth, fullHeight, 0.025],
    [0, fullHeight / 2, -0.0125],
    backing,
  );
  for (const sign of [-1, 1]) {
    box(
      "竖边框",
      [rim, fullHeight, 0.07],
      [(sign * (width + rim)) / 2, fullHeight / 2, 0.02],
      wood,
    );
    box(
      "横边框",
      [width, rim, 0.07],
      [0, fullHeight / 2 + (sign * (height + rim)) / 2, 0.02],
      wood,
    );
  }
  texture.colorSpace = T.SRGBColorSpace;
  const picture = new T.Mesh(
    new T.PlaneGeometry(width, height),
    new T.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  picture.name = "原始画面";
  picture.position.set(0, fullHeight / 2, 0.041);
  root.add(picture);
  return root;
}
export async function paintingGlb(blob: Blob): Promise<Blob> {
  const image = await createImageBitmap(blob);
  let root: T.Group | undefined;
  try {
    if (image.width * image.height > 80_000_000)
      throw new Error("图片像素过大");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 2048 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法读取画面");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    root = createPaintingModel(
      new T.CanvasTexture(canvas),
      image.width / image.height,
    );
    const binary = await new GLTFExporter().parseAsync(root, { binary: true });
    return new Blob([binary as ArrayBuffer], { type: "model/gltf-binary" });
  } finally {
    image.close();
    if (root) disposeModel(root);
  }
}
