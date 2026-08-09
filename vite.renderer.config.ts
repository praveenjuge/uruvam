import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  build: {
    sourcemap: false,
    outDir: ".vite/renderer/main_window",
    emptyOutDir: true,
  },
});
