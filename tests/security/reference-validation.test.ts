import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("reference ingestion boundary", () => {
  it("rejects executable SVG features and external sources", async () => {
    const source = await readFile("src/main/references.ts", "utf8");
    expect(source).toMatch(/script\|foreignObject\|iframe\|object\|embed/);
    expect(source).toContain("javascript:");
    expect(source).toContain("assertRegularFile");
  });
  it("enforces type signatures and a size ceiling", async () => {
    const source = await readFile("src/main/references.ts", "utf8");
    expect(source).toContain("20 * 1024 * 1024");
    expect(source).toContain("Malformed PNG");
    expect(source).toContain("Malformed JPEG");
    expect(source).toContain("Malformed WebP");
  });
});
