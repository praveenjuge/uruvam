import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const version = "0.0.0-next-17055";
describe("OpenCode v2 contract", () => {
  it("pins the binary and generated client to one build", async () => {
    const pkg = JSON.parse(await readFile("package.json", "utf8")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies["@opencode-ai/client"]).toBe(version);
    expect(pkg.devDependencies["@opencode-ai/cli-darwin-arm64"]).toBe(version);
  });
  it("matches the packaged Apple Silicon binary checksum", async () => {
    const binary = await readFile("vendor/opencode2");
    const manifest = await readFile("vendor/opencode2.sha256", "utf8");
    expect(
      manifest.startsWith(createHash("sha256").update(binary).digest("hex")),
    ).toBe(true);
  });
  it("uses the v2 service registration location written by the pinned binary", async () => {
    const source = await readFile("src/main/opencode.ts", "utf8");
    expect(source).toContain('"state"');
    expect(source).toContain('"service.json"');
  });
});
