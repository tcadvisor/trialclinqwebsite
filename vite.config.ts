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
  resolve: {  // Add this resolve configuration
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});