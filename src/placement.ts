import * as T from "three";
import type { V3, Instance } from "./types";
import { wallFace, wallGap, type WallSurface } from "./walls";

export function isFloorCovering(item?: Pick<Instance, "fixture">) {
  return item?.fixture === "rug" || item?.fixture === "blueBorderRug";
}
export function floorPosition(
  position: V3,
  moving?: T.Object3D,
  patch?: Partial<Instance>,
): V3 {
  return [position[0], -bottomOffset(moving, patch), position[2]];
}
export function floorTransform(
  item: Instance,
  patch: Partial<Instance>,
): Partial<Instance> {
  if (!isFloorCovering(item)) return patch;
  return {
    ...patch,
    rotation: uprightRotation((patch.rotation || item.rotation)[1]),
  };
}

const up = new T.Vector3(0, 1, 0);
function surfaces(roots: Iterable<T.Object3D>, exclude?: T.Object3D) {
  const meshes: T.Mesh[] = [];
  for (const root of roots) {
    if (root === exclude) continue;
    root.updateWorldMatrix(true, true);
    root.traverse((object) => {
      if (
        object instanceof T.Mesh &&
        object.visible &&
        !object.userData.editorOverlay
      )
        meshes.push(object);
    });
  }
  return meshes;
}
function upward(hit: T.Intersection) {
  if (!hit.face) return false;
  const normal = hit.face.normal
    .clone()
    .applyNormalMatrix(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld));
  return normal.dot(up) > 0.85;
}
// Query the actual mesh, rather than a furniture bounding box: openings and
// curved edges must not become invisible tabletops.
export function supportHeight(
  roots: Iterable<T.Object3D>,
  x: number,
  z: number,
  exclude?: T.Object3D,
) {
  const meshes = surfaces(roots, exclude);
  let top = 1;
  for (const mesh of meshes)
    top = Math.max(top, new T.Box3().setFromObject(mesh).max.y + 1);
  const ray = new T.Raycaster(
    new T.Vector3(x, top, z),
    new T.Vector3(0, -1, 0),
  );
  const hit = ray
    .intersectObjects(meshes, false)
    .find((h) => h.point.y >= 0 && upward(h));
  return hit?.point.y ?? 0;
}
export function boundsOffset(root?: T.Object3D, patch?: Partial<Instance>) {
  if (!root) return new T.Box3(new T.Vector3(), new T.Vector3());
  root.updateWorldMatrix(true, true);
  const delta = new T.Matrix4();
  if (patch?.rotation || patch?.scale !== undefined) {
    const target = new T.Matrix4().compose(
      root.position,
      patch.rotation
        ? new T.Quaternion().setFromEuler(new T.Euler(...patch.rotation))
        : root.quaternion,
      patch.scale !== undefined
        ? new T.Vector3().setScalar(patch.scale)
        : root.scale,
    );
    if (root.parent) target.premultiply(root.parent.matrixWorld);
    delta.copy(target).multiply(root.matrixWorld.clone().invert());
  }
  const box = new T.Box3();
  root.traverse((object) => {
    if (object instanceof T.Mesh && !object.userData.editorOverlay) {
      object.geometry.computeBoundingBox();
      if (object.geometry.boundingBox)
        box.union(
          object.geometry.boundingBox
            .clone()
            .applyMatrix4(delta.clone().multiply(object.matrixWorld)),
        );
    }
  });
  if (box.isEmpty()) return new T.Box3(new T.Vector3(), new T.Vector3());
  return box.translate(root.getWorldPosition(new T.Vector3()).negate());
}
export function bottomOffset(root?: T.Object3D, patch?: Partial<Instance>) {
  return boundsOffset(root, patch).min.y;
}
export function supportedPosition(
  roots: Iterable<T.Object3D>,
  position: V3,
  moving?: T.Object3D,
  patch?: Partial<Instance>,
): V3 {
  return [
    position[0],
    supportHeight(roots, position[0], position[2], moving) -
      bottomOffset(moving, patch),
    position[2],
  ];
}
export function pointerSurface(
  roots: Iterable<T.Object3D>,
  ray: T.Raycaster,
): V3 | null {
  const hit = ray.intersectObjects(surfaces(roots), false).find(upward);
  const ground = ray.ray.intersectPlane(new T.Plane(up, 0), new T.Vector3());
  // Prefer a visible upward-facing surface; the placement resolver will
  // recompute its exact height after X/Z grid snapping.
  const point = hit?.point || ground;
  return point ? [point.x, Math.max(0, point.y), point.z] : null;
}

// Offset the actual transformed frame, not just its origin, from the wall face.
export function wallPosition(
  wall: WallSurface,
  position: V3,
  moving?: T.Object3D,
  patch?: Partial<Instance>,
): V3 {
  const box = boundsOffset(moving, patch),
    result = [...position] as V3;
  const axis = wall.axis;
  const extent =
    wall.sign === 1 ? box.min.getComponent(axis) : box.max.getComponent(axis);
  result[axis] = wallFace(wall) + wall.sign * wallGap - extent;
  for (const tangent of [1, axis === 0 ? 2 : 0]) {
    const min =
      wall.position[tangent] -
      wall.size[tangent] / 2 +
      wallGap -
      box.min.getComponent(tangent);
    const max =
      wall.position[tangent] +
      wall.size[tangent] / 2 -
      wallGap -
      box.max.getComponent(tangent);
    // An oversized frame stays centered instead of oscillating between incompatible bounds.
    result[tangent] =
      min <= max
        ? T.MathUtils.clamp(result[tangent], min, max)
        : (min + max) / 2;
  }
  return result;
}
export function movementPlane(position: V3, wall?: WallSurface) {
  const normal = new T.Vector3();
  normal.setComponent(wall?.axis ?? 1, 1);
  return new T.Plane(normal, -position[wall?.axis ?? 1]);
}

// Rotation used by the placement handles: preserve yaw, never introduce tilt.
export function uprightRotation(yaw: number): V3 {
  return [0, yaw, 0];
}
export function draggedYaw(
  start: number,
  from: number,
  to: number,
  snap: boolean,
) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const yaw = start + delta;
  return snap ? Math.round(yaw / (Math.PI / 12)) * (Math.PI / 12) : yaw;
}
