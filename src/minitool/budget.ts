import * as T from "three";
export const GPU_BUDGET = {
  normal: {
    pixels: 2_000_000,
    triangles: 100_000,
    calls: 100,
    texture: 2048,
    bytes: 64 * 1024 * 1024,
  },
  low: {
    pixels: 1_000_000,
    triangles: 50_000,
    calls: 50,
    texture: 1024,
    bytes: 32 * 1024 * 1024,
  },
};
export function sceneCost(scene: T.Object3D) {
  let triangles = 0,
    calls = 0,
    bytes = 0;
  const textures = new Set<T.Texture>();
  scene.traverseVisible((object) => {
    const mesh = object as T.Mesh;
    if (!mesh.geometry || !mesh.material) return;
    const count =
      mesh.geometry.index?.count ||
      mesh.geometry.attributes.position?.count ||
      0;
    const instances = (mesh as T.InstancedMesh).isInstancedMesh
      ? (mesh as T.InstancedMesh).count
      : 1;
    triangles +=
      (Math.min(count, mesh.geometry.drawRange.count) / 3) * instances;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    calls += Array.isArray(mesh.material)
      ? Math.max(1, mesh.geometry.groups.length)
      : 1;
    materials.forEach((material) =>
      Object.values(material).forEach((value) => {
        if (value instanceof T.Texture) textures.add(value);
      }),
    );
  });
  let maxTexture = 0;
  textures.forEach((texture) => {
    const img = texture.image;
    if (!img) return;
    const width = img.width || 1,
      height = img.height || 1;
    maxTexture = Math.max(maxTexture, width, height);
    bytes += width * height * 4 * (texture.generateMipmaps ? 4 / 3 : 1);
  });
  return { triangles, calls, bytes, maxTexture };
}
/** Reject an over-budget frame before submitting it, and progressively lower measured slow frames. */
export function installBudgetRenderer(
  gl: T.WebGLRenderer,
  fail: (message: string) => void,
) {
  const original = gl.render.bind(gl),
    size = new T.Vector2();
  let low = false,
    stopped = false,
    losses = 0,
    slowFrames = 0,
    last = 0;
  function stop(message: string) {
    if (stopped) return;
    stopped = true;
    fail(message);
  }
  const lost = (event: Event) => {
    event.preventDefault();
    losses++;
    stop("图形上下文已中断，已切换轻量布局。");
  };
  const restored = () => {
    if (losses) stop("图形恢复后继续使用轻量布局，避免重复重建。");
  };
  const visible = () => {
    last = 0;
    slowFrames = 0;
  };
  gl.domElement.addEventListener("webglcontextlost", lost);
  gl.domElement.addEventListener("webglcontextrestored", restored);
  document.addEventListener("visibilitychange", visible);
  gl.debug.onShaderError = () => stop("设备无法显示此材质，已切换轻量布局。");
  gl.render = (scene, camera) => {
    if (stopped || document.hidden) return;
    const budget = low ? GPU_BUDGET.low : GPU_BUDGET.normal;
    gl.getSize(size);
    const dpr = Math.min(
      low ? 1 : Math.min(window.devicePixelRatio || 1, 1.5),
      Math.sqrt(budget.pixels / Math.max(1, size.x * size.y)),
    );
    if (Math.abs(gl.getPixelRatio() - dpr) > 0.01) gl.setPixelRatio(dpr);
    const cost = sceneCost(scene);
    if (
      cost.triangles > budget.triangles ||
      cost.calls > budget.calls ||
      cost.bytes > budget.bytes ||
      cost.maxTexture > budget.texture
    ) {
      stop("场景超出当前设备的轻量渲染预算，可继续通过物件列表和布局图编辑。");
      return;
    }
    const now = performance.now(),
      interval = last ? now - last : 0;
    last = now;
    if (interval > (low ? 80 : 42) && interval < 250) slowFrames++;
    else slowFrames = 0;
    if (slowFrames >= 20) {
      if (low) {
        stop("当前渲染较慢，已切换轻量布局。");
        return;
      }
      low = true;
      slowFrames = 0;
      gl.shadowMap.enabled = false;
    }
    try {
      original(scene, camera);
    } catch {
      stop("图形渲染不可用，已切换轻量布局。");
    }
  };
  return () => {
    gl.render = original;
    gl.domElement.removeEventListener("webglcontextlost", lost);
    gl.domElement.removeEventListener("webglcontextrestored", restored);
    document.removeEventListener("visibilitychange", visible);
  };
}
