import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:3000";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          changeOrigin: true,
          target: apiProxyTarget
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 650,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "react-vendor",
                priority: 40,
                test: /node_modules[\\/](react|react-dom)[\\/]/
              },
              {
                name: "pixi-vendor",
                priority: 30,
                test: /node_modules[\\/](pixi\.js|@pixi)[\\/]/
              },
              {
                name: "icons-vendor",
                priority: 20,
                test: /node_modules[\\/]lucide-react[\\/]/
              },
              {
                maxSize: 420_000,
                name: "vendor",
                priority: 10,
                test: /node_modules[\\/]/
              }
            ]
          }
        }
      },
      sourcemap: true
    }
  };
});
