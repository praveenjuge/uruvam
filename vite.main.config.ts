import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
];
export default defineConfig({
  ssr: { noExternal: true },
  build: {
    ssr: resolve(import.meta.dirname, "src/main/index.ts"),
    sourcemap: false,
    outDir: ".vite/build",
    emptyOutDir: false,
    rollupOptions: {
      external: ["electron", ...nodeBuiltins],
      output: { format: "cjs", entryFileNames: "main.cjs" },
    },
  },
});
