import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const appDir = path.dirname(fileURLToPath(import.meta.url));
  const env = {
    ...loadEnv(mode, path.resolve(appDir, "../.."), ""),
    ...loadEnv(mode, appDir, "")
  };
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:3000";

  return {
    base: "/admin/",
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/api(?=\/|$)/u, ""),
          target: apiProxyTarget
        }
      }
    },
    build: {
      sourcemap: true
    }
  };
});
