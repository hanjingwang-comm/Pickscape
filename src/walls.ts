import type { Design, Instance, SceneName, V3 } from "./types";

import { spaceBounds } from "./space";

export const galleryWalls = [
  {
    id: "back",
    name: "后墙",
    position: [0, 1.55, -3.13],
    size: [6.4, 3.1, 0.15],
    axis: 2,
    sign: 1,
    rotation: [0, 0, 0],
  },
  {
    id: "left",
    name: "左墙",
    position: [-3.13, 1.55, -1.85],
    size: [0.15, 3.1, 2.55],
    axis: 0,
    sign: 1,
    rotation: [0, Math.PI / 2, 0],
  },
  {
    id: "partition",
    name: "独立展墙",
    position: [2.72, 1.15, -1.75],
    size: [0.13, 2.3, 1.8],
    axis: 0,
    sign: -1,
    rotation: [0, -Math.PI / 2, 0],
  },
] as const;
export type WallId = (typeof galleryWalls)[number]["id"];
export interface WallSurface {
  id: WallId;
  name: string;
  position: readonly [number, number, number];
  size: readonly [number, number, number];
  axis: 0 | 2;
  sign: number;
  rotation: readonly [number, number, number];
}
export function wallsForDesign(
  design: Pick<Design, "width" | "depth"> & Partial<Pick<Design, "scene">>,
): WallSurface[] {
  const { dx, dz } = spaceBounds(design);
  if (design.scene === "living")
    return [
      {
        id: "back",
        name: "后墙右侧",
        position: [1.85 + dx / 2, 1.4, -3.13],
        size: [2.7 + dx, 2.8, 0.15],
        axis: 2,
        sign: 1,
        rotation: [0, 0, 0],
      },
      {
        id: "left",
        name: "左墙",
        position: [-3.13, 1.4, -1.25 + dz / 2],
        size: [0.15, 2.8, 3.75 + dz],
        axis: 0,
        sign: 1,
        rotation: [0, Math.PI / 2, 0],
      },
    ];
  return galleryWalls.map((w) =>
    w.id === "back"
      ? {
          ...w,
          position: [dx / 2, w.position[1], w.position[2]],
          size: [w.size[0] + dx, w.size[1], w.size[2]],
        }
      : w.id === "left"
        ? {
            ...w,
            position: [w.position[0], w.position[1], w.position[2] + dz / 2],
            size: [w.size[0], w.size[1], w.size[2] + dz],
          }
        : w,
  );
}
export const wallGap = 0.012;
export function mountedWall(
  item: Instance | undefined,
  design: SceneName | Design,
) {
  const scene = typeof design === "string" ? design : design.scene;
  if (
    !item ||
    (item.fixture !== "art" && item.wall === undefined) ||
    (scene !== "gallery" &&
      !(scene === "living" && item.fixture === "gearClock")) ||
    item.wall === "free"
  )
    return undefined;
  // Existing gallery paintings acquire wall movement without changing their identity.
  return wallsForDesign(
    typeof design === "string" ? { scene: design } : design,
  ).find((wall) => wall.id === (item.wall || "back"));
}
export function wallFace(wall: WallSurface) {
  return wall.position[wall.axis] + (wall.sign * wall.size[wall.axis]) / 2;
}
export function wallCenter(wall: WallSurface): V3 {
  const position = [...wall.position] as V3;
  position[wall.axis] = wallFace(wall);
  position[1] = 0.6;
  return position;
}
