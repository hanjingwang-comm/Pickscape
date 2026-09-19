/** Local packaged images use the image element, never a network API. */
export function imageElement(source: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url =
      typeof source === "string" ? source : URL.createObjectURL(source);
    const image = new Image();
    const release = () => {
      if (typeof source !== "string") URL.revokeObjectURL(url);
    };
    image.onload = () => {
      release();
      resolve(image);
    };
    image.onerror = () => {
      release();
      reject(new Error("图片无法读取"));
    };
    image.src = url;
  });
}
export async function localImageBlob(url: string, size = 800) {
  if (/^(https?:)?\/\//.test(url)) throw new Error("只支持包内图片");
  const image = await imageElement(url);
  const scale = Math.min(1, size / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("无法保存图片"))),
      "image/webp",
      0.82,
    ),
  );
}
