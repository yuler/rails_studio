import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  resolve: {
    alias: {
      "@assets": path.resolve(__dirname, "../assets")
    }
  },
  build: {
    outDir: path.resolve(__dirname, "../public/assets"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/main.tsx"),
      output: {
        entryFileNames: "index.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "index.css";
          }
          return "media/[name][extname]";
        }
      }
    }
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "..")]
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000/rails_studio",
        changeOrigin: true
      }
    }
  }
});
