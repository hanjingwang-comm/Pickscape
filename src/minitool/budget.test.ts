import { describe, it, expect, vi, afterEach } from "vitest";
import * as T from "three";
import { sceneCost, installBudgetRenderer } from "./budget";
afterEach(() => vi.unstubAllGlobals());
describe("mini-tool GPU guard", () => {
  it("counts visible geometry and shared texture memory only once", () => {
    const scene = new T.Scene();
    const texture = new T.Texture({ width: 1024, height: 1024 });
    texture.generateMipmaps = false;
    const material = new T.MeshBasicMaterial({ map: texture });
    scene.add(
      new T.Mesh(new T.BoxGeometry(), material),
      new T.Mesh(new T.BoxGeometry(), material),
    );
    const hidden = new T.Mesh(new T.SphereGeometry(1, 100, 100), material);
    hidden.visible = false;
    scene.add(hidden);
    expect(sceneCost(scene)).toMatchObject({
      triangles: 24,
      calls: 2,
      bytes: 4 * 1024 * 1024,
      maxTexture: 1024,
    });
  });
  it("rejects oversized scenes before any GPU render and prevents retries", () => {
    const doc = Object.assign(new EventTarget(), { hidden: false });
    vi.stubGlobal("document", doc);
    vi.stubGlobal("window", { devicePixelRatio: 3 });
    let ratio = 3;
    const render = vi.fn();
    const gl = {
      render,
      domElement: new EventTarget(),
      debug: {},
      shadowMap: { enabled: false },
      getSize: (v: T.Vector2) => v.set(2000, 2000),
      getPixelRatio: () => ratio,
      setPixelRatio: (r: number) => (ratio = r),
    };
    const fail = vi.fn(),
      dispose = installBudgetRenderer(gl as any, fail);
    const scene = new T.Scene();
    scene.add(
      new T.Mesh(new T.SphereGeometry(1, 400, 400), new T.MeshBasicMaterial()),
    );
    gl.render(scene, new T.PerspectiveCamera());
    gl.render(scene, new T.PerspectiveCamera());
    expect(render).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledTimes(1);
    expect(2000 * 2000 * ratio * ratio).toBeLessThanOrEqual(2_000_001);
    dispose();
  });
  it("pauses hidden-page GPU submissions and handles context loss once", () => {
    const doc = Object.assign(new EventTarget(), { hidden: true });
    vi.stubGlobal("document", doc);
    vi.stubGlobal("window", { devicePixelRatio: 1 });
    const render = vi.fn(),
      canvas = new EventTarget(),
      fail = vi.fn();
    const gl = {
      render,
      domElement: canvas,
      debug: {},
      shadowMap: { enabled: false },
      getSize: (v: T.Vector2) => v.set(100, 100),
      getPixelRatio: () => 1,
      setPixelRatio: () => {},
    };
    const dispose = installBudgetRenderer(gl as any, fail);
    gl.render(new T.Scene(), new T.PerspectiveCamera());
    expect(render).not.toHaveBeenCalled();
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    gl.render(new T.Scene(), new T.PerspectiveCamera());
    expect(render).toHaveBeenCalledTimes(1);
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    expect(fail).toHaveBeenCalledTimes(1);
    gl.render(new T.Scene(), new T.PerspectiveCamera());
    expect(render).toHaveBeenCalledTimes(1);
    dispose();
  });
});
