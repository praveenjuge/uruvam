import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("desktop security architecture", () => {
  it("keeps the renderer sandboxed without Node", async () => {
    const source = await readFile("src/main/index.ts", "utf8");
    expect(source).toContain("sandbox: true");
    expect(source).toContain("contextIsolation: true");
    expect(source).toContain("nodeIntegration: false");
  });
  it("keeps preview content in a separate sandbox", async () => {
    const source = await readFile("src/main/preview.ts", "utf8");
    expect(source).toContain("new WebContentsView");
    expect(source).toContain("setWindowOpenHandler");
    expect(source).toContain("setPermissionRequestHandler");
    expect(source).toContain("will-download");
  });
  it("exposes only a typed preload surface", async () => {
    const source = await readFile("src/preload/index.ts", "utf8");
    expect(source).toContain("contextBridge.exposeInMainWorld");
    expect(source).not.toMatch(/\brequire\s*\(/);
    expect(source).not.toContain("ipcRenderer.send");
  });
  it("contains no prohibited no-code surfaces", async () => {
    const renderer = `${await readFile("src/renderer/App.tsx", "utf8")}\n${await readFile("src/renderer/components/workspace.tsx", "utf8")}`;
    expect(renderer).not.toMatch(/source viewer|raw diff|file tree|terminal/i);
  });
  it("does not pass the Go key through command arguments", async () => {
    const source = await readFile("src/main/opencode.ts", "utf8");
    expect(source).not.toMatch(/command:\s*\[[^\]]*(?:key|credential)/i);
    expect(source).toContain("Reflect.deleteProperty(process.env, name)");
    expect(source).toContain("XDG_STATE_HOME");
  });
});
