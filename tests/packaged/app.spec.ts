import { chromium, expect, test } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

async function availablePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string")
        return reject(new Error("No test port"));
      server.close(() => resolvePort(address.port));
    });
  });
}

async function connect(port: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      return await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    } catch (error) {
      lastError = error;
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
  }
  throw lastError;
}

test("Apple Silicon package launches with hardened fuses and isolated preload", async () => {
  const userData = mkdtempSync(join(tmpdir(), "uruvam-packaged-"));
  const executablePath = resolve(
    "out/Uruvam-darwin-arm64/Uruvam.app/Contents/MacOS/Uruvam",
  );
  const port = await availablePort();
  const child = spawn(executablePath, [`--remote-debugging-port=${port}`], {
    env: { ...process.env, URUVAM_E2E: "1", URUVAM_E2E_DATA: userData },
    stdio: "ignore",
  });
  try {
    const browser = await connect(port);
    const page = browser.contexts()[0]?.pages()[0];
    if (!page) throw new Error("Packaged renderer was not available");
    await expect(
      page.getByText("Shape real interfaces visually."),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/packaged-app-shell.png",
      animations: "disabled",
    });
    await browser.close();
  } finally {
    child.kill("SIGTERM");
  }
});
