import axe from "axe-core";
import { BrowserWindow } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ScreenState } from "../shared/contracts";

interface QualityResult {
  screenshots: string[];
  routesChecked: number;
  accessibilityViolations: number;
}

function previewEnvironment(root: string): NodeJS.ProcessEnv {
  return { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: root, CI: "1" };
}

async function startPreview(
  root: string,
): Promise<{ child: ChildProcess; url: string }> {
  const child = spawn(
    "pnpm",
    ["exec", "vite", "--host", "127.0.0.1", "--port", "0", "--strictPort"],
    {
      cwd: root,
      env: previewEnvironment(root),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const url = await new Promise<string>((resolveUrl, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Preview startup timed out")),
      30_000,
    );
    child.stdout.on("data", (chunk: Buffer) => {
      const match = chunk.toString("utf8").match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (match) {
        clearTimeout(timer);
        resolveUrl(match[0]);
      }
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Preview exited with ${code ?? "unknown"}`));
    });
  });
  return { child, url };
}

export async function inspectDirection(
  root: string,
  screens: ScreenState[],
): Promise<QualityResult> {
  const { child, url } = await startPreview(root);
  const window = new BrowserWindow({
    show: false,
    width: 1440,
    height: 1000,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      partition: `uruvam-quality-${Date.now()}`,
    },
  });
  const failures: string[] = [];
  window.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    try {
      const request = new URL(details.url);
      callback({
        cancel: !(
          request.protocol === "data:" ||
          (request.protocol === "http:" && request.hostname === "127.0.0.1")
        ),
      });
    } catch {
      callback({ cancel: true });
    }
  });
  window.webContents.on("console-message", (_event, level, message) => {
    if (level >= 3) failures.push(`console: ${message.slice(0, 300)}`);
  });
  window.webContents.session.webRequest.onErrorOccurred((details) => {
    if (!details.error.includes("ABORTED"))
      failures.push(
        `resource: ${new URL(details.url).pathname} ${details.error}`,
      );
  });
  const evidence = resolve(root, ".uruvam", "evidence");
  await mkdir(evidence, { recursive: true, mode: 0o700 });
  const screenshots: string[] = [];
  let violations = 0;
  try {
    const routes = screens
      .flatMap((screen) =>
        screen.states.map((state) => ({ route: screen.route, state })),
      )
      .slice(0, 30);
    for (const item of routes.length
      ? routes
      : [{ route: "/", state: "default" }]) {
      const target = new URL(item.route, url);
      target.searchParams.set("state", item.state);
      await window.loadURL(target.toString());
    }
    for (const width of [390, 1440]) {
      window.setContentSize(width, width === 390 ? 844 : 1000);
      await window.loadURL(url);
      const result = (await window.webContents.executeJavaScript(
        `${axe.source}; axe.run(document)`,
      )) as { violations: Array<{ impact: string | null; id: string }> };
      const serious = result.violations.filter(
        (item) => item.impact === "serious" || item.impact === "critical",
      );
      violations += serious.length;
      if (serious.length)
        failures.push(
          `accessibility ${width}px: ${serious.map((item) => item.id).join(", ")}`,
        );
      const checks = (await window.webContents.executeJavaScript(`({
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        hiddenFocus: [...document.querySelectorAll('button,a,input,textarea,select')].some((el) => { el.focus(); const s=getComputedStyle(el); return s.outlineStyle === 'none' && s.boxShadow === 'none'; })
      })`)) as { overflow: boolean; hiddenFocus: boolean };
      if (checks.overflow) failures.push(`horizontal overflow at ${width}px`);
      if (checks.hiddenFocus)
        failures.push(`missing visible focus at ${width}px`);
      const path = resolve(evidence, `direction-${width}.png`);
      await writeFile(path, (await window.webContents.capturePage()).toPNG(), {
        mode: 0o600,
      });
      screenshots.push(path);
    }
    if (failures.length) throw new Error(failures.join("; "));
    const report = {
      passedAt: new Date().toISOString(),
      screenshots,
      routesChecked: routes.length || 1,
      accessibilityViolations: violations,
    };
    await writeFile(
      resolve(evidence, "quality.json"),
      JSON.stringify(report, null, 2),
      { mode: 0o600 },
    );
    return report;
  } finally {
    window.destroy();
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}
