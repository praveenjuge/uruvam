import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  ssr: { noExternal: [/^@opencode-ai\//] },
  build: {
    ssr: resolve(
      import.meta.dirname,
      process.env.URUVAM_LIVE_ENTRY ?? "scripts/live-opencode-flow.mjs",
    ),
    sourcemap: false,
    outDir: ".vite/live",
    emptyOutDir: true,
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((name) => `node:${name}`),
      ],
      output: { format: "es", entryFileNames: "live.mjs" },
    },
  },
});
