import { useEffect, useState } from "react";
import { useApp } from "./store";
import { parseModel, disposeModel } from "./models";
import type { Asset, Generation } from "./types";

export function generationLabel(asset?: Asset) {
  if (!asset) return "待生成";
  if (asset.status === "ready") return "可放入空间";
  const g = asset.generation;
  if (!g) return "待生成";
  if (g.state === "paused") return "生成已暂停连接";
  if (g.state === "failed") return "生成失败 · 可重试";
  if (g.state === "uncertain") return "提交待核对";
  if (g.step === "submit") return "准备并提交图片";
  if (g.step === "download") return "正在下载并检查模型";
  return `生成中${g.progress === undefined ? "" : ` · ${g.progress}%`}`;
}
export const generationActive = (a: Asset) =>
  a.status === "pending" && a.generation?.state === "active";
export async function generationConfig(): Promise<{
  enabled: boolean;
  configured: boolean;
  provider: string;
}> {
  const r = await fetch("/api/generation/config", {
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error("本机生成接口未启动，请重启开发服务。");
  return r.json();
}
async function checked(response: Response) {
  if (!response.ok) {
    let message = "无法连接生成服务，请稍后恢复连接。";
    try {
      message = (await response.json()).error || message;
    } catch {
      /* HTML/network gateway */
    }
    throw new Error(message);
  }
  return response;
}
// Preserve the original in IndexedDB; send a bounded PNG copy (also supports WebP input).
export async function generationImage(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const ratio = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/png");
}
export function queueGeneration(id: string) {
  useApp.getState().updateMeta((p) => {
    const a = p.assets.find((a) => a.id === id);
    if (!a || a.status !== "pending" || generationActive(a)) return;
    a.generation =
      a.generation && a.generation.state !== "failed"
        ? {
            ...a.generation,
            state: "active",
            message: undefined,
            step:
              a.generation.state === "uncertain" ? "poll" : a.generation.step,
          }
        : { id: crypto.randomUUID(), state: "active", step: "submit" };
  });
}
let processing = false;
export async function processGeneration(persist: () => Promise<void>) {
  if (processing) return;
  const p = useApp.getState().project;
  const a = p?.assets.find(generationActive);
  const g = a?.generation;
  if (!p || !a || !g) return;
  const photo = p.photos.find((ph) => ph.id === a.photoId);
  if (!photo) return;
  processing = true;
  const current = () => {
    const project = useApp.getState().project;
    const asset =
      project?.id === p.id
        ? project.assets.find((item) => item.id === a.id)
        : undefined;
    return asset?.generation?.id === g.id && generationActive(asset)
      ? asset
      : undefined;
  };
  const patch = (value: Partial<Generation>) => {
    if (!current()) return;
    useApp.getState().updateMeta((project) => {
      const asset = project.assets.find((item) => item.id === a.id)!;
      asset.generation = { ...asset.generation!, ...value };
    });
  };
  try {
    // Persist the request identity before any billed submission; retries reuse it.
    if (g.step === "submit") await persist();
    if (!current()) return;
    if (g.step === "download") {
      const result = await checked(
        await fetch(`/api/generation/${g.id}/model`, {
          signal: AbortSignal.timeout(120000),
        }),
      );
      const model = await result.blob();
      const root = await parseModel(model);
      disposeModel(root);
      if (!current()) return;
      useApp.getState().updateMeta((project) => {
        const asset = project.assets.find((item) => item.id === a.id)!;
        Object.assign(asset, {
          kind: "glb",
          model,
          preserveScale: false,
          placement: undefined,
          status: "ready",
          generation: undefined,
          generatedBy: "Meshy",
        });
      });
      await persist();
      return;
    }
    const response = await checked(
      await fetch(
        `/api/generation/${g.id}`,
        g.step === "submit"
          ? {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Yidu-Client": "1",
              },
              body: JSON.stringify({
                image: await generationImage(photo.blob),
                consent: true,
              }),
              signal: AbortSignal.timeout(75000),
            }
          : { signal: AbortSignal.timeout(75000) },
      ),
    );
    const data = await response.json();
    if (data.status === "FAILED" || data.status === "CANCELED")
      patch({ state: "failed", message: data.message });
    else if (data.status === "UNCERTAIN")
      patch({ state: "uncertain", step: "poll", message: data.message });
    else
      patch({
        step: data.status === "SUCCEEDED" ? "download" : "poll",
        progress: data.progress,
        message: undefined,
      });
  } catch (e) {
    patch({
      state: "paused",
      message: (e as Error).message || "连接中断，原图和生成任务已保留。",
    });
    if (useApp.getState().saving === "error") return;
  } finally {
    processing = false;
  }
}
export function useGeneration(persist: () => Promise<void>) {
  const [config, setConfig] = useState({
    enabled: false,
    configured: false,
    provider: "Meshy",
    error: "",
  });
  const refresh = () =>
    generationConfig()
      .then((value) => setConfig({ ...value, error: "" }))
      .catch((e) =>
        setConfig({
          enabled: false,
          configured: false,
          provider: "Meshy",
          error: e.message,
        }),
      );
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    if (!config.enabled || !config.configured) return;
    const tick = () => void processGeneration(persist);
    tick();
    const timer = setInterval(tick, 4000);
    return () => clearInterval(timer);
  }, [config.enabled, config.configured]);
  return { config, refresh };
}
