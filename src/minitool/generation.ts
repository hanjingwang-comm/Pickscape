import type { Asset } from "../types";
export const generationLabel = (asset?: Asset) =>
  asset?.status === "ready" ? "可放入空间" : "可制成装框画作";
export const generationActive = () => false;
export const queueGeneration = () => {};
export const useGeneration = () => ({
  config: { enabled: false, configured: false, provider: "", error: "" },
  refresh: async () => {},
});
