import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../sugar360/public/frontend",
    emptyOutDir: true,
  },
  server: {
    port: 3007,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: process.env['VITE_FRAPPE_URL'] || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      "/files": {
        target: process.env['VITE_FRAPPE_URL'] || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      "/private/files": {
        target: process.env['VITE_FRAPPE_URL'] || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
