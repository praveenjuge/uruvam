import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
];
export default defineConfig({
  build: {
    ssr: resolve(import.meta.dirname, "src/preload/index.ts"),
    sourcemap: false,
    outDir: ".vite/build",
    emptyOutDir: false,
    rollupOptions: {
      external: ["electron", ...nodeBuiltins],
      output: { format: "cjs", entryFileNames: "preload.cjs" },
    },
  },
});
