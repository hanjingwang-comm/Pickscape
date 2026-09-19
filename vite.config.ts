import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { generationMiddleware } from "./server/generation.mjs";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "MESHY_");
  const install = (server: any) => {
    server.middlewares.use(
      generationMiddleware({
        enabled: (process.env.MESHY_ENABLED || env.MESHY_ENABLED) === "true",
        key: process.env.MESHY_API_KEY || env.MESHY_API_KEY,
        directory: `${process.cwd()}/.yidu-generation`,
      }),
    );
  };
  return {
    plugins: [
      react(),
      {
        name: "yidu-image-to-3d",
        configureServer: install,
        configurePreviewServer: install,
      },
    ],
    server: { host: "127.0.0.1", port: 5173, strictPort: true },
    build: { chunkSizeWarningLimit: 1400 },
  };
});
