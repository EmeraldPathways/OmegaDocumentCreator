import { defineConfig, mergeConfig } from "vite";
import baseConfig from "./vite.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    cacheDir: ".vite-run-cache",
    server: {
      host: "127.0.0.1",
      port: 3001,
    },
  }),
);
