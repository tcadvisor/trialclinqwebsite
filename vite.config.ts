import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import { defineConfig } from "vite";
import path from "path";  // Add this import

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: "./static",
  base: "./",
  css: {
    postcss: {
      plugins: [tailwind()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/.netlify/functions/epic-token-exchange": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
});
