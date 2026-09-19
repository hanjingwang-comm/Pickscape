import { defaultCamera, type Design, type CameraState, type V3 } from "./types";

export const baseSpaceSize = 6.4;
export const maxSpaceSize = 19.2;
export const spaceStep = 1.6;
export function spaceBounds(design: Pick<Design, "width" | "depth">) {
  const width = design.width ?? baseSpaceSize;
  const depth = design.depth ?? baseSpaceSize;
  // Grow away from the existing back-left corner so objects and wall faces stay put.
  const dx = width - baseSpaceSize,
    dz = depth - baseSpaceSize;
  return {
    width,
    depth,
    dx,
    dz,
    cx: dx / 2,
    cz: dz / 2,
    minX: -3.2,
    minZ: -3.2,
    maxX: width - 3.2,
    maxZ: depth - 3.2,
  };
}
export function insideSpace(point: V3, design: Design) {
  const b = spaceBounds(design);
  return (
    point[0] >= b.minX &&
    point[0] <= b.maxX &&
    point[2] >= b.minZ &&
    point[2] <= b.maxZ
  );
}
export function spaceCamera(design: Design, top = false): CameraState {
  const b = spaceBounds(design),
    ratio = Math.max(b.width, b.depth) / baseSpaceSize;
  return top
    ? { position: [b.cx, 11 * ratio, b.cz + 0.001], target: [b.cx, 0, b.cz] }
    : {
        position: [
          b.cx + defaultCamera.position[0] * ratio,
          defaultCamera.position[1] * ratio,
          b.cz + defaultCamera.position[2] * ratio,
        ],
        target: [b.cx, 0.8, b.cz],
      };
}
