export const isMiniTool =
  (import.meta as ImportMeta & { env?: { MODE?: string } }).env?.MODE ===
  "minitool";
