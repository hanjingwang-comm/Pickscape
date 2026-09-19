import { gardenPropCatalog, type GardenProp } from "./gardenProps";
import type { Photo } from "./types";
import { thumbnail } from "./storage";

type ReferenceItem = {
  kind: GardenProp | "pond" | "wisteria";
  name: string;
  reference: string;
};
// One original photograph can supply several independently placeable objects.
const items: ReferenceItem[] = [
  ...gardenPropCatalog,
  {
    kind: "pond",
    name: "鸢尾石岸池塘",
    reference: new URL(
      "./assets/references/pond/reference.png",
      import.meta.url,
    ).href,
  },
  {
    kind: "wisteria",
    name: "紫藤花树",
    reference: new URL(
      "./assets/references/wisteria/reference.png",
      import.meta.url,
    ).href,
  },
];
export const referenceCollection = Array.from(
  new Set(items.map((item) => item.reference)),
).map((url) => {
  const matches = items.filter((item) => item.reference === url);
  return {
    key: `reference:${matches[0].kind}`,
    url,
    name: matches.map((item) => item.name).join(" · "),
    items: matches,
  };
});

export async function loadReferencePhotos(
  existing: Photo[],
  load: (url: string) => Promise<{ blob: Blob; thumb: Blob }> = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("照片加载失败");
    const blob = await response.blob();
    return { blob, thumb: await thumbnail(blob) };
  },
) {
  const missing = referenceCollection.filter(
    (entry) =>
      !existing.some(
        (photo) => photo.referenceKey === entry.key || photo.id === entry.key,
      ),
  );
  const results = await Promise.allSettled(
    missing.map(async (entry): Promise<Photo> => ({
      id: entry.key,
      referenceKey: entry.key,
      name: entry.name,
      ...(await load(entry.url)),
      example: false,
    })),
  );
  return {
    photos: results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    ),
    failures: results.filter((result) => result.status === "rejected").length,
  };
}
