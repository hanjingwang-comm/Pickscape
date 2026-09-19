import { installBudgetRenderer } from "./minitool/budget";
import { isMiniTool } from "./platform";
import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { furnishing, type FixtureKind } from "./furnishings";
import { disposeModel, modelFor, parseModel } from "./models";
import type { Asset } from "./types";

type Source = { fixture?: FixtureKind; fixtureModel?: Blob; asset?: Asset };
const builtinCache = new Map<string, Promise<string>>();
const blobCache = new WeakMap<Blob, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();
let retired = false;
let studio:
  | {
      renderer: T.WebGLRenderer;
      scene: T.Scene;
      environment: T.WebGLRenderTarget;
    }
  | undefined;

/** Fit all eight bounds corners, including very wide paths and tall glasses. */
export function thumbnailCamera(bounds: T.Box3, wall = false) {
  const center = bounds.getCenter(new T.Vector3());
  const size = bounds.getSize(new T.Vector3()).length();
  if (!Number.isFinite(size) || size < 0.00001) throw new Error("模型尺寸无效");
  const camera = new T.OrthographicCamera(-1, 1, 1, -1, size * 0.01, size * 8);
  const direction = wall
    ? new T.Vector3(0.18, 0.1, 1)
    : new T.Vector3(2.7, 2.1, 3.5);
  camera.position.copy(center).addScaledVector(direction.normalize(), size * 3);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  const view = bounds.clone().applyMatrix4(camera.matrixWorldInverse);
  const half = Math.max(view.max.x - view.min.x, view.max.y - view.min.y) * 0.6;
  camera.left = -half;
  camera.right = half;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();
  return camera;
}
function getStudio() {
  if (studio) return studio;
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(192, 192, false);
  renderer.setPixelRatio(1);
  renderer.setClearColor("#f0eee6");
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  scene.add(new T.HemisphereLight("#fff9ed", "#9c9b88", 2.1));
  const light = new T.DirectionalLight("#fff5e4", 3);
  light.position.set(-3, 6, 5);
  scene.add(light);
  const fill = new T.DirectionalLight("#eaf1ff", 1.1);
  fill.position.set(4, 3, -3);
  scene.add(fill);
  if (isMiniTool)
    installBudgetRenderer(renderer, (message) => {
      throw new Error(message);
    });
  const generator = new T.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const environment = isMiniTool
    ? new T.WebGLRenderTarget(1, 1)
    : generator.fromScene(room, 0.04);
  generator.dispose();
  room.dispose();
  scene.environment = isMiniTool ? null : environment.texture;
  scene.environmentIntensity = 0.55;
  studio = { renderer, scene, environment };
  return studio;
}
function disposeStudio() {
  if (!studio) return;
  studio.environment.dispose();
  studio.renderer.dispose();
  studio.renderer.forceContextLoss();
  studio = undefined;
}
if (typeof window !== "undefined")
  window.addEventListener("pagehide", disposeStudio);
(
  import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }
).hot?.dispose(() => {
  retired = true;
  window.removeEventListener("pagehide", disposeStudio);
  disposeStudio();
});

async function renderThumbnail(source: Source) {
  const blob = source.fixtureModel || source.asset?.model;
  let root: T.Group | null = null;
  try {
    root = blob
      ? await parseModel(blob, true)
      : source.fixture
        ? furnishing(source.fixture)
        : source.asset
          ? modelFor(source.asset)
          : null;
    if (!root) throw new Error("尚未生成模型");
    if (retired) throw new Error("预览已更新");
    // Center and normalize a private model before lighting it; imported GLBs can
    // use arbitrary units and origins, while the scene instance remains untouched.
    const original = new T.Box3().setFromObject(root);
    const size = original.getSize(new T.Vector3());
    const factor = 2 / Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(factor) || factor <= 0)
      throw new Error("模型尺寸无效");
    root.position
      .sub(original.getCenter(new T.Vector3()))
      .multiplyScalar(factor);
    root.scale.multiplyScalar(factor);
    const { renderer, scene } = getStudio();
    const bounds = new T.Box3().setFromObject(root);
    const camera = thumbnailCamera(
      bounds,
      source.asset?.placement === "wall" ||
        source.fixture === "art" ||
        source.fixture === "gearClock",
    );
    scene.add(root);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL("image/png");
  } finally {
    if (root) {
      root.removeFromParent();
      disposeModel(root);
    }
  }
}
export function modelThumbnail(source: Source): Promise<string> {
  const blob = source.fixtureModel || source.asset?.model;
  const key = source.fixture
    ? `fixture:${source.fixture}`
    : `asset:${source.asset?.kind}`;
  const cached = blob ? blobCache.get(blob) : builtinCache.get(key);
  if (cached) return cached;
  // One shared renderer, one model at a time; duplicates reuse a finished bitmap.
  const result = queue
    .then(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
    .then(() => renderThumbnail(source));
  queue = result.catch(() => undefined);
  if (blob) blobCache.set(blob, result);
  else builtinCache.set(key, result);
  void result.catch(() => {
    if (blob) blobCache.delete(blob);
    else builtinCache.delete(key);
  });
  return result;
}

export function ModelThumbnail({
  fixture,
  fixtureModel,
  asset,
  name,
  fallback,
  fallbackBlob,
}: Source & { name: string; fallback?: string; fallbackBlob?: Blob }) {
  const container = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [preview, setPreview] = useState<{ key: unknown; url: string } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string>();
  const identity = fixtureModel || asset?.model || fixture || asset?.kind;
  const url = preview && preview.key === identity ? preview.url : undefined;
  useEffect(() => {
    if (!fallbackBlob) {
      setBlobUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(fallbackBlob);
    setBlobUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [fallbackBlob]);
  useEffect(() => {
    if (!container.current) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    setFailed(false);
    if (asset?.status === "pending" && !fixture && !fixtureModel) {
      setFailed(true);
      return;
    }
    if (isMiniTool && (fallback || fallbackBlob)) {
      setFailed(true);
      return;
    }
    modelThumbnail({ fixture, fixtureModel, asset }).then(
      (url) => {
        if (active) setPreview({ key: identity, url });
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [
    visible,
    identity,
    fixture,
    fixtureModel,
    asset?.kind,
    asset?.status,
    asset?.placement,
  ]);
  const image = url || blobUrl || fallback;
  return (
    <span
      ref={container}
      className="model-thumbnail"
      data-preview-state={url ? "ready" : failed ? "fallback" : "loading"}
      title={`${name}${url ? " · 3D 预览" : failed ? " · 预览暂不可用" : ""}`}
    >
      {image ? (
        <img src={image} alt="" draggable={false} />
      ) : (
        <span className="thumbnail-placeholder" aria-hidden="true">
          <svg
            width="25"
            height="25"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3ZM4 7.5l8 4.5 8-4.5M12 12v9" />
          </svg>
          <small>{failed ? "预览不可用" : "预览加载中"}</small>
        </span>
      )}
    </span>
  );
}
