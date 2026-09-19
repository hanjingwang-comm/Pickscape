import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { Group } from "three";
import { useApp, emptyProject } from "./store";
import {
  generationLabel,
  processGeneration,
  queueGeneration,
} from "./generation";
import { parseModel } from "./models";
import { exportProject } from "./storage";
import { unzipSync, strFromU8 } from "fflate";
vi.mock("./models", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./models")>()),
  parseModel: vi.fn(async () => new Group()),
}));
beforeEach(() => {
  const p = emptyProject();
  p.sceneKits = ["blank", "living", "garden", "gallery"];
  p.instances = [];
  p.photos = [
    {
      id: "photo",
      name: "photo",
      blob: new Blob(["original"]),
      thumb: new Blob(["thumb"]),
      example: false,
    },
  ];
  p.assets = [
    {
      id: "asset",
      photoId: "photo",
      name: "object",
      kind: "glb",
      status: "pending",
    },
  ];
  useApp.getState().load(p);
  queueGeneration("asset");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const asset = () => useApp.getState().project!.assets[0];
const step = (value: "poll" | "download") =>
  useApp.getState().updateMeta((p) => {
    p.assets[0].generation!.step = value;
  });
it("retains a request identity when resuming instead of creating another task", () => {
  const id = asset().generation!.id;
  useApp.getState().updateMeta((p) => {
    p.assets[0].generation!.state = "paused";
  });
  queueGeneration("asset");
  expect(asset().generation!.id).toBe(id);
});
it("shows provider progress without making unfinished models placeable", async () => {
  step("poll");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ status: "IN_PROGRESS", progress: 43 })),
  );
  await processGeneration(async () => {});
  expect(generationLabel(asset())).toBe("生成中 · 43%");
  expect(asset().status).toBe("pending");
  expect(asset().model).toBeUndefined();
});
it("validates and imports a downloaded model, preserving its source photo", async () => {
  step("download");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(new Blob(["glTF-model"]))),
  );
  const persist = vi.fn(async () => {});
  await processGeneration(persist);
  expect(parseModel).toHaveBeenCalled();
  expect(asset().status).toBe("ready");
  expect(asset().generatedBy).toBe("Meshy");
  expect(asset().generation).toBeUndefined();
  expect(await useApp.getState().project!.photos[0].blob.text()).toBe(
    "original",
  );
  expect(persist).toHaveBeenCalledTimes(1);
});
it("keeps invalid models pending and resumes downloading the same task", async () => {
  step("download");
  const id = asset().generation!.id;
  vi.mocked(parseModel).mockRejectedValueOnce(new Error("模型无有效几何体"));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("broken")),
  );
  await processGeneration(async () => {});
  expect(asset().status).toBe("pending");
  expect(asset().generation!.state).toBe("paused");
  expect(asset().generation!.message).toContain("无有效几何体");
  queueGeneration("asset");
  expect(asset().generation!.id).toBe(id);
  expect(asset().generation!.step).toBe("download");
});
it("does not submit before a task can be saved locally", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await processGeneration(async () => {
    throw new Error("存储空间不足");
  });
  expect(fetcher).not.toHaveBeenCalled();
  expect(asset().generation!.state).toBe("paused");
  expect(asset().generation!.message).toContain("存储空间不足");
});
it("never puts an old project result into the newly selected project", async () => {
  step("poll");
  let resolve!: (r: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    ),
  );
  const running = processGeneration(async () => {});
  const other = emptyProject();
  useApp.getState().load(other);
  resolve(Response.json({ status: "SUCCEEDED", progress: 100 }));
  await running;
  expect(useApp.getState().project!.id).toBe(other.id);
  expect(useApp.getState().project!.assets).toEqual([]);
});
it("does not carry active cloud task identities into a portable backup", async () => {
  useApp.getState().updateMeta((p) => {
    p.instances = [];
  });
  const file = await exportProject(useApp.getState().project!);
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const manifest = JSON.parse(strFromU8(files["project.json"]));
  expect(manifest.assets[0].generation).toBeUndefined();
  expect(manifest.assets[0].status).toBe("pending");
});
