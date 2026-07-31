import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8007";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("@tiptap") || id.includes("/prosemirror-") || id.includes("/orderedmap/")) {
            return "editor";
          }
          if (
            id.includes("/jspdf/") ||
            id.includes("/html2canvas/")
          ) {
            return "pdf-export";
          }
          if (id.includes("/docx/")) {
            return "docx-export";
          }
          if (id.includes("/file-saver/")) {
            return "file-save";
          }
          if (id.includes("/react-router") || id.includes("@remix-run")) {
            return "router";
          }
          if (id.includes("/lucide-react/")) {
            return "icons";
          }
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "react-vendor";
          }
          return "vendor";
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3007,
    proxy: {
      "/auth": apiProxyTarget,
      "/clients": apiProxyTarget,
      "/documents": apiProxyTarget,
      "/health": apiProxyTarget,
      "/admin": apiProxyTarget,
      "/users": apiProxyTarget,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
});
