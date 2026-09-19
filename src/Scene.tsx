import { isMiniTool } from "./platform";
import { installBudgetRenderer } from "./minitool/budget";
import { MiniFallback } from "./minitool/Fallback";
import {
  pointerSurface,
  isFloorCovering,
  floorPosition,
  floorTransform,
  supportedPosition,
  wallPosition,
  movementPlane,
  boundsOffset,
  uprightRotation,
  draggedYaw,
} from "./placement";
import { wallsForDesign, mountedWall, wallFace } from "./walls";
import { spaceBounds, insideSpace, spaceCamera } from "./space";
import { furnishing, inScene } from "./furnishings";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
  type ReactNode,
} from "react";
import {
  Canvas,
  useThree,
  useFrame,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  OrbitControls,
  TransformControls,
  Grid,
  ContactShadows,
  Html,
} from "@react-three/drei";
import * as T from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OrbitControls as OrbitType } from "three-stdlib";
import { useApp } from "./store";
import { modelFor, parseModel, disposeModel } from "./models";
import { surfaceTexture } from "./textures";
import { defaultCamera, type Asset, type Instance, type V3 } from "./types";
function StudioReflection() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const generator = new T.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = generator.fromScene(room, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.4;
    generator.dispose();
    room.dispose();
    invalidate();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);
  return null;
}
let webGLSupport: boolean | undefined;
function webGLAvailable() {
  if (webGLSupport !== undefined) return webGLSupport;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    webGLSupport = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webGLSupport = false;
  }
  return webGLSupport;
}
const modelCache = new WeakMap<Blob, Promise<T.Group>>();
function Model({ asset }: { asset: Asset }) {
  const [loaded, setLoaded] = useState<T.Group | null>(null),
    [error, setError] = useState(false);
  const built = useMemo(
    () => (asset.model ? null : modelFor(asset)),
    [asset.kind, asset.model],
  );
  useEffect(() => {
    let active = true;
    setError(false);
    setLoaded(null);
    if (asset.model) {
      let task = modelCache.get(asset.model);
      if (!task) {
        task = parseModel(asset.model, asset.preserveScale);
        modelCache.set(asset.model, task);
      }
      task
        .then((g) => {
          if (active) setLoaded(g.clone(true));
        })
        .catch(() => {
          if (active) setError(true);
        });
    }
    return () => {
      active = false;
    };
  }, [asset.kind, asset.model]);
  useEffect(
    () => () => {
      if (built) disposeModel(built);
    },
    [built],
  );
  const obj = built || loaded;
  if (error)
    return (
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshBasicMaterial color="#b76451" wireframe />
      </mesh>
    );
  return obj ? <primitive object={obj} dispose={null} /> : null;
}
export class CanvasBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error || !webGLAvailable() ? (
      isMiniTool ? (
        <MiniFallback />
      ) : (
        <div className="canvas-error">
          <strong>暂时无法显示 3D 空间</strong>
          <p>
            请启用浏览器硬件加速或使用支持 WebGL
            的浏览器。照片与已保存布局不受影响。
          </p>
        </div>
      )
    ) : (
      this.props.children
    );
  }
}
function FixtureModel({ item }: { item: Instance }) {
  const root = useMemo(
    () => (item.fixtureModel ? null : furnishing(item.fixture!)),
    [item.fixture, item.fixtureModel],
  );
  useEffect(
    () => () => {
      if (root) disposeModel(root);
    },
    [root],
  );
  if (item.fixtureModel)
    return (
      <Model
        asset={{
          id: item.id,
          photoId: "",
          name: item.name || "场景物件",
          kind: "glb",
          model: item.fixtureModel,
          preserveScale: true,
          status: "ready",
        }}
      />
    );
  return root ? <primitive object={root} /> : null;
}
function Room() {
  const d = useApp((s) => s.project!.design);
  const b = spaceBounds(d);
  const { invalidate } = useThree();
  const floor = useMemo(() => surfaceTexture(d.floor, "#ddd8cc"), [d.floor]);
  const wall = useMemo(
    () => surfaceTexture(d.wall, d.color),
    [d.wall, d.color],
  );
  useEffect(() => () => floor.dispose(), [floor]);
  useEffect(() => () => wall.dispose(), [wall]);
  useEffect(() => {
    floor.repeat.set(
      (3 * b.width) / 6.4 / d.textureScale,
      (3 * b.depth) / 6.4 / d.textureScale,
    );
    wall.repeat.set(3, 1.5);
    invalidate();
  }, [floor, wall, d.textureScale, b.width, b.depth, invalidate]);
  const block = (
    key: string,
    pos: V3,
    size: V3,
    color: string,
    map?: T.Texture,
  ) => (
    <mesh key={key} position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} map={map} roughness={0.88} />
    </mesh>
  );
  const plaster = (key: string, pos: V3, size: V3) =>
    block(key, pos, size, "#ffffff", wall);
  return (
    <group>
      {block(
        "foundation",
        [b.cx, -0.12, b.cz],
        [b.width, 0.24, b.depth],
        d.scene === "garden" ? "#889071" : "#c9b696",
      )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[b.cx, 0.001, b.cz]}
        receiveShadow
      >
        <planeGeometry args={[b.width, b.depth]} />
        <meshStandardMaterial
          key={d.scene}
          map={d.scene === "garden" ? null : floor}
          color={d.scene === "garden" ? "#929d72" : "#ffffff"}
          roughness={0.92}
        />
      </mesh>
      {d.scene === "living" && (
        <>
          {plaster("back-left", [-2.7, 1.4, -3.13], [1, 2.8, 0.15])}
          {plaster(
            "back-right",
            [1.85 + b.cx, 1.4, -3.13],
            [2.7 + b.dx, 2.8, 0.15],
          )}
          {plaster("window-bottom", [-0.85, 0.45, -3.13], [2.7, 0.9, 0.15])}
          {plaster("window-top", [-0.85, 2.6, -3.13], [2.7, 0.4, 0.15])}
          {plaster(
            "side",
            [-3.13, 1.4, -1.25 + b.cz],
            [0.15, 2.8, 3.75 + b.dz],
          )}
          {block("sill", [-0.85, 0.93, -3.05], [2.85, 0.08, 0.32], "#cab99c")}
          {[-2.2, -0.85, 0.5].map((x, n) =>
            block(
              "mullion" + n,
              [x, 1.65, -3.12],
              [0.055, 1.5, 0.08],
              "#a7967d",
            ),
          )}
          {block(
            "window-horizontal",
            [-0.85, 1.65, -3.12],
            [2.7, 0.045, 0.08],
            "#a7967d",
          )}
          {block(
            "skirting-back",
            [b.cx, 0.07, -3.02],
            [6.25 + b.dx, 0.14, 0.06],
            "#d2c5af",
          )}
        </>
      )}
      {d.scene === "gallery" && (
        <>
          {wallsForDesign(d).map((surface) =>
            plaster(surface.id, [...surface.position], [...surface.size]),
          )}
          {[-1.8, 0.35, 2].map((x, n) => (
            <group key={n}>
              {block(
                "track" + n,
                [x, 2.9, -2.7],
                [0.055, 0.07, 0.55],
                "#514f47",
              )}
              <mesh position={[x, 2.84, -2.48]} rotation={[0.35, 0, 0]}>
                <cylinderGeometry args={[0.07, 0.07, 0.19, 16]} />
                <meshStandardMaterial color="#555349" />
              </mesh>
              <spotLight
                position={[x, 2.7, -2.4]}
                intensity={1.3}
                angle={0.5}
                penumbra={0.8}
                distance={4}
              />
            </group>
          ))}
        </>
      )}
      {d.scene === "garden" && (
        <>
          {Array.from(
            { length: Math.floor((b.width - 0.3) / 0.26) + 1 },
            (_, k) =>
              block(
                "fence" + k,
                [-3 + k * 0.26, 0.55, -3.12],
                [0.09, 1.1, 0.065],
                "#bcb99b",
              ),
          )}
          {block(
            "fence-rail",
            [b.cx, 0.82, -3.13],
            [b.width, 0.065, 0.065],
            "#a8a58b",
          )}
        </>
      )}
    </group>
  );
}
function resolveItemPosition(
  bodies: Map<string, T.Object3D>,
  id: string | null,
  position: V3,
  patch?: Partial<Instance>,
) {
  const project = useApp.getState().project!;
  const original = project.instances.find((item) => item.id === id);
  const wall = mountedWall(
    original ? { ...original, ...patch } : undefined,
    project.design,
  );
  const root = id ? bodies.get(id) : undefined;
  if (original && isFloorCovering(original))
    return floorPosition(position, root, floorTransform(original, patch || {}));
  return wall
    ? wallPosition(wall, position, root, patch)
    : supportedPosition(bodies.values(), position, root, patch);
}
// Handles draw above scene geometry, so their pointer priority must match.
function handleRaycast(
  this: T.Mesh,
  raycaster: T.Raycaster,
  intersections: T.Intersection[],
) {
  const hits: T.Intersection[] = [];
  T.Mesh.prototype.raycast.call(this, raycaster, hits);
  for (const hit of hits) intersections.push({ ...hit, distance: 0 });
}
function TurnHandle({
  item,
  root,
  controls,
  bodies,
}: {
  item: Instance;
  root: React.RefObject<T.Group | null>;
  controls: React.RefObject<OrbitType | null>;
  bodies: Map<string, T.Object3D>;
}) {
  const [radius, setRadius] = useState(1);
  const { invalidate } = useThree();
  const gesture = useRef<{
    start: number;
    from: number;
    plane: T.Plane;
    moved: boolean;
  } | null>(null);
  useFrame(() => {
    if (!root.current || gesture.current) return;
    const box = boundsOffset(root.current);
    const next = Math.max(
      0.75,
      Math.min(
        6,
        Math.max(
          Math.abs(box.min.x),
          Math.abs(box.max.x),
          Math.abs(box.min.z),
          Math.abs(box.max.z),
        ) + 0.3,
      ),
    );
    if (Math.abs(next - radius) > 0.02) setRadius(next);
  });
  useEffect(
    () => () => {
      if (gesture.current) {
        if (gesture.current.moved) useApp.getState().commit();
        if (controls.current) controls.current.enabled = true;
      }
    },
    [controls],
  );
  const down = (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const plane = new T.Plane(
      new T.Vector3(0, 1, 0),
      -(item.position[1] + 0.06),
    );
    const point = event.ray.intersectPlane(plane, new T.Vector3());
    if (!point) return;
    gesture.current = {
      start: item.rotation[1],
      from: Math.atan2(point.x - item.position[0], point.z - item.position[2]),
      plane,
      moved: false,
    };
    (event.target as Element).setPointerCapture(event.pointerId);
    if (controls.current) controls.current.enabled = false;
  };
  const move = (event: ThreeEvent<PointerEvent>) => {
    const drag = gesture.current;
    if (!drag) return;
    event.stopPropagation();
    const point = event.ray.intersectPlane(drag.plane, new T.Vector3());
    if (!point) return;
    const angle = Math.atan2(
      point.x - item.position[0],
      point.z - item.position[2],
    );
    const delta = Math.atan2(
      Math.sin(angle - drag.from),
      Math.cos(angle - drag.from),
    );
    if (!drag.moved && Math.abs(delta) < 0.015) return;
    if (!drag.moved) {
      useApp.getState().checkpoint();
      drag.moved = true;
    }
    const rotation = uprightRotation(
      draggedYaw(drag.start, drag.from, angle, useApp.getState().snap),
    );
    useApp.getState().liveTransform(item.id, {
      rotation,
      position: resolveItemPosition(bodies, item.id, item.position, {
        rotation,
      }),
    });
    invalidate();
  };
  const up = (event: ThreeEvent<PointerEvent>) => {
    if (!gesture.current) return;
    event.stopPropagation();
    if (gesture.current.moved) useApp.getState().commit();
    gesture.current = null;
    (event.target as Element).releasePointerCapture(event.pointerId);
    if (controls.current) controls.current.enabled = true;
  };
  return (
    <group
      position={[item.position[0], item.position[1] + 0.06, item.position[2]]}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <mesh
        raycast={handleRaycast}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1000}
      >
        <torusGeometry args={[radius, 0.025, 8, 96]} />
        <meshBasicMaterial
          color="#617b59"
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        raycast={handleRaycast}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1000}
      >
        <torusGeometry args={[radius, 0.11, 8, 64]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
        <mesh
          key={angle}
          position={[Math.sin(angle) * radius, 0, Math.cos(angle) * radius]}
          raycast={handleRaycast}
          renderOrder={1001}
        >
          <sphereGeometry args={[0.065, 12, 8]} />
          <meshBasicMaterial
            color="#f7f3e6"
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
function ObjectActions({
  item,
  name,
  root,
}: {
  item: Instance;
  name: string;
  root: React.RefObject<T.Group | null>;
}) {
  return (
    <Html
      position={item.position}
      center
      zIndexRange={[8, 8]}
      calculatePosition={(_anchor, camera, size) => {
        if (!root.current) return [size.width / 2, 100];
        const bounds = boundsOffset(root.current);
        const origin = root.current.getWorldPosition(new T.Vector3());
        let left = Infinity,
          right = -Infinity,
          top = Infinity;
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z]) {
              const point = new T.Vector3(x, y, z).add(origin).project(camera);
              const px = ((point.x + 1) * size.width) / 2;
              left = Math.min(left, px);
              right = Math.max(right, px);
              top = Math.min(top, ((1 - point.y) * size.height) / 2);
            }
        return [
          Math.max(90, Math.min(size.width - 90, (left + right) / 2)),
          Math.max(100, Math.min(size.height - 140, top - 26)),
        ];
      }}
    >
      <div
        className="scene-object-actions"
        role="group"
        aria-label={`${name}操作`}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          className="object-stow-button"
          aria-label={`复制${name}`}
          title="复制并选中新物件"
          onClick={(event) => {
            event.stopPropagation();
            const state = useApp.getState();
            const current = state.project?.instances.find(
              (i) => i.id === item.id,
            );
            if (!current || current.stowed) return;
            state.select(item.id);
            state.duplicate();
            state.setMode("select");
          }}
        >
          <svg
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <rect x="7" y="7" width="10" height="10" rx="1.5" />
            <path
              d="M12 4V3H3v9h1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          复制
        </button>
        <button
          className="object-stow-button"
          aria-label={`收起${name}`}
          title={item.locked ? "物件已固定，请先解锁" : "收起到物件库"}
          disabled={item.locked}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            const state = useApp.getState();
            const current = state.project?.instances.find(
              (i) => i.id === item.id,
            );
            if (!current || current.locked || current.stowed) return;
            state.transform(item.id, { stowed: true });
            state.select(null);
            state.setMode("select");
          }}
        >
          <svg
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              d="M10 2v10m-3-3 3 3 3-3M3 12v5h14v-5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          收起
        </button>
      </div>
    </Html>
  );
}
function Placed({
  item,
  asset,
  controls,
  bodies,
}: {
  bodies: Map<string, T.Object3D>;
  item: Instance;
  asset?: Asset;
  controls: React.RefObject<OrbitType | null>;
}) {
  const ref = useRef<T.Group>(null),
    gizmoStart = useRef<V3>([0, 0, 0]),
    drag = useRef<{
      start: V3;
      point: T.Vector3;
      plane: T.Plane;
      moved: boolean;
    } | null>(null);
  const selected = useApp((s) => s.selected === item.id),
    mode = useApp((s) => s.mode),
    snap = useApp((s) => s.snap);
  const design = useApp((s) => s.project!.design);
  const wall = mountedWall(item, design);
  const { invalidate } = useThree();
  useEffect(() => {
    if (ref.current) bodies.set(item.id, ref.current);
    return () => {
      bodies.delete(item.id);
    };
  }, [bodies, item.id]);
  useFrame(() => {
    const root = ref.current;
    if (
      !root ||
      (!item.settleOnLoad && !wall && !isFloorCovering(item)) ||
      item.locked
    )
      return;
    let ready = false;
    root.traverse((o) => {
      if (o instanceof T.Mesh && !o.userData.editorOverlay) ready = true;
    });
    if (!ready) return;
    const state = useApp.getState();
    const position = resolveItemPosition(bodies, item.id, item.position);
    if (
      !item.settleOnLoad &&
      position.every((v, i) => Math.abs(v - item.position[i]) < 0.00001) &&
      (!isFloorCovering(item) ||
        (item.rotation[0] === 0 && item.rotation[2] === 0))
    )
      return;
    state.liveTransform(item.id, {
      position,
      settleOnLoad: false,
    });
    state.commit();
    invalidate();
  });
  const down = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    useApp.getState().select(item.id);
    if (item.locked || (mode !== "select" && mode !== "move")) return;
    const plane = movementPlane(item.position, wall),
      pt = new T.Vector3();
    if (!e.ray.intersectPlane(plane, pt)) return;
    drag.current = {
      start: [...item.position],
      point: pt,
      plane,
      moved: false,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
    if (controls.current) controls.current.enabled = false;
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const pt = e.ray.intersectPlane(d.plane, new T.Vector3());
    if (!pt) return;
    if (!d.moved && pt.distanceTo(d.point) > 0.02) {
      useApp.getState().checkpoint();
      d.moved = true;
    }
    if (!d.moved) return;
    const round = (v: number) => (snap ? Math.round(v * 10) / 10 : v);
    useApp.getState().liveTransform(item.id, {
      position: resolveItemPosition(bodies, item.id, [
        round(d.start[0] + pt.x - d.point.x),
        wall ? round(d.start[1] + pt.y - d.point.y) : d.start[1],
        round(d.start[2] + pt.z - d.point.z),
      ]),
    });
    invalidate();
  };
  const up = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    if (drag.current.moved) useApp.getState().commit();
    drag.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
    if (controls.current) controls.current.enabled = true;
  };
  return (
    <>
      <group
        ref={ref}
        position={item.position}
        rotation={item.rotation}
        scale={item.scale}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {item.fixture ? (
          <FixtureModel item={item} />
        ) : asset ? (
          <Model asset={asset} />
        ) : null}
        {selected && (
          <mesh
            userData={{ editorOverlay: true }}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.009, 0]}
          >
            <ringGeometry args={[0.59, 0.605, 64]} />
            <meshBasicMaterial
              color={item.locked ? "#ad9273" : "#6c8268"}
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
      {selected && (
        <ObjectActions
          item={item}
          name={item.name || asset?.name || "物件"}
          root={ref}
        />
      )}
      {selected &&
        !item.locked &&
        !wall &&
        (mode === "select" || mode === "move" || mode === "rotate") && (
          <TurnHandle
            item={item}
            root={ref}
            controls={controls}
            bodies={bodies}
          />
        )}
      {selected &&
        !item.locked &&
        (mode !== "rotate" || wall) &&
        ref.current && (
          <TransformControls
            object={ref.current}
            mode={mode === "move" || mode === "select" ? "translate" : mode}
            space="world"
            showX={
              mode === "rotate"
                ? wall?.axis === 0
                : !(wall && mode !== "scale" && wall.axis === 0)
            }
            showY={mode === "scale" || (!!wall && mode !== "rotate")}
            showZ={
              mode === "rotate"
                ? wall?.axis === 2
                : !(wall && mode !== "scale" && wall.axis === 2)
            }
            translationSnap={snap ? 0.1 : null}
            rotationSnap={snap ? Math.PI / 12 : null}
            scaleSnap={snap ? 0.1 : null}
            onMouseDown={() => {
              if (ref.current)
                gizmoStart.current = ref.current.position.toArray() as V3;
              useApp.getState().checkpoint();
              if (controls.current) controls.current.enabled = false;
            }}
            onObjectChange={() => {
              const o = ref.current;
              if (o)
                useApp.getState().liveTransform(item.id, {
                  position:
                    mode === "select" || mode === "move"
                      ? resolveItemPosition(
                          bodies,
                          item.id,
                          o.position.toArray() as V3,
                        )
                      : (o.position.toArray() as V3),
                  rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
                  scale: Math.max(
                    0.05,
                    Math.min(
                      10,
                      mode === "scale"
                        ? [o.scale.x, o.scale.y, o.scale.z].reduce(
                            (a, v) =>
                              Math.abs(v - item.scale) >
                              Math.abs(a - item.scale)
                                ? v
                                : a,
                            item.scale,
                          )
                        : o.scale.x,
                    ),
                  ),
                });
            }}
            onMouseUp={() => {
              const o = ref.current;
              if (
                o &&
                (wall ||
                  mode !== "move" ||
                  Math.abs(o.position.y - gizmoStart.current[1]) < 0.001)
              ) {
                useApp.getState().liveTransform(item.id, {
                  position: resolveItemPosition(
                    bodies,
                    item.id,
                    o.position.toArray() as V3,
                  ),
                });
              }
              useApp.getState().commit();
              if (controls.current) controls.current.enabled = true;
            }}
          />
        )}
    </>
  );
}
export interface SceneBridge {
  point: (x: number, y: number, itemId?: string) => V3 | null;
  view: (top: boolean) => void;
}
function World({
  bridge,
  ghost,
}: {
  bridge: React.RefObject<SceneBridge | null>;
  ghost: V3 | null;
}) {
  const p = useApp((s) => s.project!),
    request = useApp((s) => s.cameraRequest);
  const controls = useRef<OrbitType>(null);
  const bodies = useMemo(() => new Map<string, T.Object3D>(), []);
  useEffect(() => {
    const resolvePlacement = (
      id: string | null,
      position: V3,
      patch?: Partial<Instance>,
    ) => resolveItemPosition(bodies, id, position, patch);
    useApp.setState({ resolvePlacement });
    return () => {
      if (useApp.getState().resolvePlacement === resolvePlacement)
        useApp.setState({ resolvePlacement: null });
    };
  }, [bodies]);
  const { camera, gl, invalidate, size } = useThree();
  useEffect(() => {
    if (camera instanceof T.PerspectiveCamera) {
      camera.zoom = Math.min(1, size.width / size.height / 0.95);
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size.width, size.height, invalidate]);
  useEffect(() => {
    camera.position.fromArray(p.camera.position);
    controls.current?.target.fromArray(p.camera.target);
    controls.current?.update();
    invalidate();
  }, [request]);
  useEffect(() => {
    bridge.current = {
      point: (x, y, itemId) => {
        const r = gl.domElement.getBoundingClientRect(),
          ray = new T.Raycaster();
        ray.setFromCamera(
          new T.Vector2(
            ((x - r.left) / r.width) * 2 - 1,
            (-(y - r.top) / r.height) * 2 + 1,
          ),
          camera,
        );
        const state = useApp.getState();
        const item = state.project!.instances.find(
          (i) => i.id === (itemId || state.draggingItem),
        );
        const wall = mountedWall(item, state.project!.design);
        if (wall) {
          const position = [...wall.position] as V3;
          position[wall.axis] = wallFace(wall);
          const point = ray.ray.intersectPlane(
            movementPlane(position, wall),
            new T.Vector3(),
          );
          return point
            ? wallPosition(
                wall,
                point.toArray() as V3,
                item ? bodies.get(item.id) : undefined,
              )
            : null;
        }
        const point = pointerSurface(
          isFloorCovering(item) ? [] : bodies.values(),
          ray,
        );
        return point && insideSpace(point, state.project!.design)
          ? point
          : null;
      },
      view: (top) => {
        const view = spaceCamera(useApp.getState().project!.design, top);
        camera.position.fromArray(view.position);
        controls.current?.target.fromArray(view.target);
        controls.current?.update();
        useApp.getState().camera({
          position: camera.position.toArray() as V3,
          target: controls.current!.target.toArray() as V3,
        });
        invalidate();
      },
    };
    return () => {
      bridge.current = null;
    };
  }, [camera, gl]);
  const d = p.design;
  const b = spaceBounds(d),
    coverage = Math.max(b.width, b.depth) / 6.4;
  const lightTarget = useMemo(() => {
    const target = new T.Object3D();
    target.position.set(b.cx, 0, b.cz);
    return target;
  }, [b.cx, b.cz]);
  const pos: V3 =
    d.time === "morning"
      ? [5, 4, -4]
      : d.time === "noon"
        ? [1, 9, 2]
        : [-6, 2.6, 3];
  return (
    <>
      <color
        attach="background"
        args={[
          d.time === "morning"
            ? "#e8eef0"
            : d.time === "noon"
              ? "#f5f3ed"
              : "#e8daca",
        ]}
      />
      <ambientLight intensity={d.time === "noon" ? 0.35 : 0.16} />
      <hemisphereLight args={["#fffaf0", "#b2b29a", 0.65]} />
      <primitive object={lightTarget} />
      <directionalLight
        target={lightTarget}
        position={[
          b.cx + pos[0] * coverage,
          pos[1] * coverage,
          b.cz + pos[2] * coverage,
        ]}
        intensity={d.intensity * (d.time === "noon" ? 3 : 2.5)}
        color={
          d.time === "evening"
            ? "#ffbe78"
            : d.time === "morning"
              ? "#d7e8ff"
              : "#fff9ec"
        }
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7 * coverage}
        shadow-camera-right={7 * coverage}
        shadow-camera-top={7 * coverage}
        shadow-camera-bottom={-7 * coverage}
        shadow-normalBias={0.012}
        shadow-bias={-0.0001}
        shadow-camera-far={100}
        shadow-radius={d.softness}
      />
      {!isMiniTool && <StudioReflection />}
      <Room />
      {!isMiniTool && (
        <ContactShadows
          key={JSON.stringify([p.instances, d.scene, b.width, b.depth])}
          position={[b.cx, 0.012, b.cz]}
          opacity={0.26}
          scale={8 * coverage}
          blur={2.8}
          far={2.8}
          resolution={512}
          color="#6f654e"
          frames={1}
        />
      )}
      {p.instances
        .filter((i) => !i.stowed && inScene(i, d.scene))
        .map((i) => {
          const a = p.assets.find((a) => a.id === i.assetId);
          return a || i.fixture ? (
            <Placed
              key={i.id}
              item={i}
              asset={a}
              controls={controls}
              bodies={bodies}
            />
          ) : null;
        })}
      <Grid
        position={[0, -0.115, 0]}
        args={[24, 24]}
        cellSize={0.5}
        sectionSize={3.2}
        cellColor="#dfdfd6"
        sectionColor="#cfcec4"
        cellThickness={0.35}
        sectionThickness={0.45}
        fadeDistance={18}
        infiniteGrid
      />
      {ghost && (
        <mesh
          position={[ghost[0], ghost[1] + 0.025, ghost[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.24, 0.3, 48]} />
          <meshBasicMaterial color="#60785c" transparent opacity={0.8} />
        </mesh>
      )}
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        minDistance={3}
        maxDistance={70}
        minPolarAngle={0.01}
        maxPolarAngle={Math.PI * 0.48}
        onEnd={() => {
          if (controls.current)
            useApp.getState().camera({
              position: camera.position.toArray() as V3,
              target: controls.current.target.toArray() as V3,
            });
        }}
      />
    </>
  );
}
export function EditorCanvas({
  bridge,
}: {
  bridge: React.RefObject<SceneBridge | null>;
}) {
  const [ghost, setGhost] = useState<V3 | null>(null);
  const [fallback, setFallback] = useState("");
  if (isMiniTool && fallback) return <MiniFallback message={fallback} />;
  return (
    <div
      className="canvas-wrap"
      onDragOver={(e) => {
        if (
          !e.dataTransfer.types.some((type) =>
            [
              "application/x-yidu-asset",
              "application/x-yidu-instance",
            ].includes(type),
          )
        )
          return;
        e.preventDefault();
        e.dataTransfer.dropEffect = e.dataTransfer.types.includes(
          "application/x-yidu-instance",
        )
          ? "move"
          : "copy";
        setGhost(bridge.current?.point(e.clientX, e.clientY) || null);
      }}
      onDragLeave={() => setGhost(null)}
      onDrop={(e) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData("application/x-yidu-instance");
        const id = e.dataTransfer.getData("application/x-yidu-asset"),
          point = bridge.current?.point(e.clientX, e.clientY, itemId);
        if ((id || itemId) && point) {
          const s = useApp.getState();
          const position = s.snap
            ? ([
                Math.round(point[0] * 10) / 10,
                point[1],
                Math.round(point[2] * 10) / 10,
              ] as V3)
            : point;
          if (itemId) s.placeItem(itemId, position);
          else s.add(id, position);
        }
        useApp.setState({ draggingItem: null });
        setGhost(null);
      }}
    >
      <CanvasBoundary>
        <Canvas
          shadows={!isMiniTool}
          dpr={
            isMiniTool
              ? Math.min(
                  1,
                  Math.sqrt(
                    1_000_000 /
                      Math.max(1, window.innerWidth * window.innerHeight),
                  ),
                )
              : [1, 1.7]
          }
          frameloop="demand"
          camera={{
            position: defaultCamera.position,
            fov: 38,
            near: 0.05,
            far: 150,
          }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = T.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.1;
            gl.shadowMap.type = T.PCFShadowMap;
          }}
          onPointerMissed={(e) => {
            if (e.type === "click") useApp.getState().select(null);
          }}
        >
          <Suspense fallback={null}>
            {isMiniTool && <RenderBudget onFailure={setFallback} />}
            <World bridge={bridge} ghost={ghost} />
          </Suspense>
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}
export function AssetPreview({
  asset,
  interactive = false,
}: {
  asset: Asset;
  interactive?: boolean;
}) {
  const [fallback, setFallback] = useState("");
  if (isMiniTool && fallback) return <p role="status">{fallback}</p>;
  return (
    <CanvasBoundary>
      <Canvas
        frameloop="demand"
        dpr={isMiniTool ? 1 : [1, 1.5]}
        camera={{ position: [2, 1.7, 2.5], fov: 36 }}
      >
        {!isMiniTool && <StudioReflection />}
        {isMiniTool && <RenderBudget onFailure={setFallback} />}
        <ambientLight intensity={1.0} />
        <directionalLight position={[3, 5, 4]} intensity={3} />
        <group
          position={[0, asset.kind === "mug" ? -0.35 : -0.65, 0]}
          scale={asset.kind === "mug" ? 2 : asset.kind === "lamp" ? 1.3 : 1}
        >
          <Model asset={asset} />
        </group>
        {interactive && (
          <OrbitControls enablePan={false} minDistance={1} maxDistance={6} />
        )}
      </Canvas>
    </CanvasBoundary>
  );
}

function RenderBudget({ onFailure }: { onFailure: (message: string) => void }) {
  const { gl, setFrameloop, invalidate } = useThree();
  useEffect(() => {
    const dispose = installBudgetRenderer(gl, (message) =>
      setTimeout(() => onFailure(message), 0),
    );
    const visibility = () => {
      setFrameloop(document.hidden ? "never" : "demand");
      if (!document.hidden) invalidate();
    };
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      dispose();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [gl, setFrameloop, invalidate, onFailure]);
  return null;
}
