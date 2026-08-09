import { describe, expect, it } from "vitest";
import {
  commentInput,
  createProjectInput,
  extensionTrustInput,
  httpPreviewUrl,
  previewBoundsInput,
} from "../src/shared/contracts";

describe("hostile input contracts", () => {
  it("accepts a bounded project request", () => {
    expect(
      createProjectInput.parse({
        name: "Atlas",
        slug: "atlas",
        prompt: "Design an operations workspace",
      }).slug,
    ).toBe("atlas");
  });
  it.each(["../escape", "/absolute", "has spaces", "UPPER"])(
    "rejects unsafe project slug %s",
    (slug) => {
      expect(() =>
        createProjectInput.parse({
          name: "Atlas",
          slug,
          prompt: "Design an operations workspace",
        }),
      ).toThrow();
    },
  );
  it.each([
    "https://example.com",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "http://localhost:4173",
  ])("rejects non-loopback preview %s", (url) =>
    expect(() => httpPreviewUrl.parse(url)).toThrow(),
  );
  it("allows an explicit IPv4 loopback preview", () =>
    expect(httpPreviewUrl.parse("http://127.0.0.1:4173/dashboard")).toContain(
      "127.0.0.1",
    ));
  it("bounds preview geometry", () =>
    expect(() =>
      previewBoundsInput.parse({ x: -1, y: 0, width: 9000, height: 1 }),
    ).toThrow());
  it("requires immutable extension identity", () =>
    expect(() =>
      extensionTrustInput.parse({
        projectId: crypto.randomUUID(),
        kind: "plugin",
        source: "https://example.com/plugin",
        version: "2.0.0",
        checksum: "latest",
      }),
    ).toThrow());
  it("bounds visual comment anchors", () =>
    expect(() =>
      commentInput.parse({
        projectId: crypto.randomUUID(),
        route: "/",
        state: "default",
        text: "Move this",
        anchor: { x: 2, y: 0.5 },
      }),
    ).toThrow());
});
