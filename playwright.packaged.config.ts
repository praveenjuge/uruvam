import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/packaged",
  timeout: 30_000,
  reporter: [["list"]],
  outputDir: "test-results/packaged",
  use: { trace: "retain-on-failure" },
});
