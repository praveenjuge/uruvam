import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { OpenCode } from "@opencode-ai/client";
import { Service } from "@opencode-ai/client/service";
import { chromium } from "playwright";
import axe from "axe-core";

const exec = promisify(execFile);
const version = "0.0.0-next-17055";
const binary = resolve("vendor/opencode2");
const secretNames = /(?:TOKEN|KEY|PASSWORD|SECRET|AUTH|CREDENTIAL)/i;
let activeServiceFile;

function stopProcessGroup(child) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

process.once("SIGINT", () => {
  void (
    activeServiceFile
      ? Service.stop({ file: activeServiceFile }).catch(() => undefined)
      : Promise.resolve()
  ).finally(() => process.exit(130));
});

async function stage(name) {
  await mkdir(resolve("test-results"), { recursive: true });
  await writeFile(
    resolve("test-results", "live-stage.json"),
    JSON.stringify({ stage: name }, null, 2),
  );
}

function narrowEnvironment(key, home) {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    XDG_DATA_HOME: join(home, ".local", "share"),
    XDG_STATE_HOME: join(home, ".local", "state"),
    OPENCODE_API_KEY: key,
    CI: "1",
  };
}

async function keychainCredential() {
  const result = await exec(
    "security",
    [
      "find-generic-password",
      "-a",
      "opencode-go",
      "-s",
      "com.uruvam.opencode-go",
      "-w",
    ],
    { encoding: "buffer", maxBuffer: 8192 },
  );
  const key = Buffer.from(result.stdout).toString("utf8").trim();
  if (key.length < 16) throw new Error("Keychain credential is unavailable");
  return key;
}

async function writeStarter(root) {
  const entries = {
    "package.json": JSON.stringify(
      {
        name: "uruvam-live-direction",
        private: true,
        type: "module",
        packageManager: "pnpm@11.20.0",
        scripts: {
          dev: "vite --host 127.0.0.1",
          build: "vite build",
          typecheck: "tsc --noEmit",
          lint: "eslint .",
          test: "vitest run",
        },
        dependencies: {
          "@vitejs/plugin-react": "latest",
          "@tailwindcss/vite": "latest",
          "class-variance-authority": "latest",
          clsx: "latest",
          "lucide-react": "latest",
          react: "latest",
          "react-dom": "latest",
          "tailwind-merge": "latest",
          tailwindcss: "latest",
          vite: "latest",
        },
        devDependencies: {
          "@types/react": "latest",
          "@types/react-dom": "latest",
          "@eslint/js": "latest",
          eslint: "latest",
          "eslint-plugin-react-hooks": "latest",
          typescript: "latest",
          "typescript-eslint": "latest",
          vitest: "latest",
        },
      },
      null,
      2,
    ),
    "index.html":
      '<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n',
    ".npmrc": "confirmModulesPurge=false\n",
    ".gitignore":
      "node_modules/\ndist/\n.cache/\n.config/\n.local/\nLibrary/\n.uruvam/evidence/\n",
    "components.json": JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema.json",
        style: "new-york",
        rsc: false,
        tsx: true,
        tailwind: {
          css: "src/index.css",
          baseColor: "neutral",
          cssVariables: true,
        },
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
          ui: "@/components/ui",
          lib: "@/lib",
        },
        iconLibrary: "lucide",
      },
      null,
      2,
    ),
    "DESIGN.md":
      "# Luma exhibition planner\n\nA minimal, editorial planning surface for independent exhibition designers. Show a calm overview, a timeline route, meaningful empty/loading/error/success states, and responsive layouts at 390px and 1440px. Use source-owned shadcn components.\n",
    "AGENTS.md":
      "Use pnpm. Keep source-owned shadcn components. Build accessible, responsive frontend routes only. Never read credentials or files outside this repository.\n",
    "opencode.json": JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        permissions: [
          { action: "*", resource: "*", effect: "deny" },
          ...["read", "glob", "grep", "edit"].map((action) => ({
            action,
            resource: "*",
            effect: "allow",
          })),
          { action: "read", resource: "*.env", effect: "deny" },
          { action: "read", resource: "*.env.*", effect: "deny" },
          { action: "skill", resource: "uruvam-design", effect: "allow" },
          ...[
            "pnpm install *",
            "pnpm typecheck",
            "pnpm lint",
            "pnpm test",
            "pnpm build",
          ].map((resource) => ({ action: "shell", resource, effect: "allow" })),
        ],
      },
      null,
      2,
    ),
    ".opencode/skills/uruvam-design/SKILL.md":
      "---\nname: uruvam-design\ndescription: Shape this local visual prototype against DESIGN.md.\n---\n\nBuild a complete, responsive, accessible frontend using source-owned shadcn components. Stay inside this repository and never access credentials.\n",
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM"],
          module: "ESNext",
          moduleResolution: "Bundler",
          jsx: "react-jsx",
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: ["node", "vite/client"],
        },
        include: ["src", "vite.config.ts"],
      },
      null,
      2,
    ),
    "vite.config.ts":
      'import react from "@vitejs/plugin-react"; import tailwindcss from "@tailwindcss/vite"; import { defineConfig } from "vite"; export default defineConfig({ plugins: [react(), tailwindcss()] });\n',
    "src/main.tsx":
      'import { StrictMode } from "react"; import { createRoot } from "react-dom/client"; import { App } from "./App"; import "./index.css"; createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);\n',
    "src/vite-env.d.ts": '/// <reference types="vite/client" />\n',
    "src/App.tsx":
      "export function App(){return <main><h1>Luma</h1><p>Direction waiting to be shaped.</p></main>}\n",
    "src/index.css": '@import "tailwindcss"; body{margin:0}\n',
    "src/app.test.ts":
      'import { describe, expect, it } from "vitest"; describe("direction",()=>it("has a project",()=>expect("Luma").toBeTruthy()));\n',
  };
  for (const [name, contents] of Object.entries(entries)) {
    const path = join(root, name);
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, contents, { mode: 0o600 });
  }
}

async function waitForUrl(child) {
  return new Promise((resolveUrl, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Preview did not start")),
      30_000,
    );
    child.stdout.on("data", (chunk) => {
      const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:(\d+)\//);
      if (match) {
        clearTimeout(timer);
        resolveUrl(match[0]);
      }
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Preview exited with ${code}`));
    });
  });
}

async function main() {
  const root = await mkdtemp(join(tmpdir(), "uruvam-live-"));
  const state = join(root, ".local", "state", "opencode", "service.json");
  activeServiceFile = state;
  await writeStarter(root);
  await exec("pnpm", ["install", "--ignore-scripts", "--reporter=silent"], {
    cwd: root,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: root, CI: "1" },
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  await exec("git", ["init", "--initial-branch=main"], { cwd: root });
  await exec("git", ["add", "."], { cwd: root });
  await exec(
    "git",
    [
      "-c",
      "user.name=Uruvam",
      "-c",
      "user.email=local@uruvam.invalid",
      "commit",
      "-m",
      "chore: seed live test",
    ],
    { cwd: root },
  );
  let key = await keychainCredential();
  const saved = {};
  for (const name of Object.keys(process.env)) {
    if (secretNames.test(name)) {
      saved[name] = process.env[name];
      delete process.env[name];
    }
  }
  Object.assign(process.env, narrowEnvironment(key, root));
  let endpoint;
  try {
    endpoint = await Service.ensure({
      file: state,
      version,
      command: [binary, "serve", "--service"],
    });
  } finally {
    delete process.env.OPENCODE_API_KEY;
    key = "";
    for (const [name, value] of Object.entries(saved))
      if (value !== undefined) process.env[name] = value;
  }
  const client = OpenCode.make({
    baseUrl: endpoint.url,
    headers: Service.headers(endpoint),
    fetch: (input, init) => fetch(input, { ...init, redirect: "error" }),
  });
  await stage("catalog");
  let catalog;
  let integrations;
  const catalogDeadline = Date.now() + 30_000;
  do {
    [catalog, integrations] = await Promise.all([
      client.model.list(
        { location: { directory: root } },
        { signal: AbortSignal.timeout(10_000) },
      ),
      client.integration.list(
        { location: { directory: root } },
        { signal: AbortSignal.timeout(10_000) },
      ),
    ]);
    if (catalog.data.length || integrations.data.length) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  } while (Date.now() < catalogDeadline);
  const providers = [
    ...new Set(catalog.data.map((item) => item.providerID)),
  ].sort();
  await mkdir(resolve("test-results"), { recursive: true });
  await writeFile(
    resolve("test-results", "live-catalog.json"),
    JSON.stringify(
      {
        providers,
        modelCount: catalog.data.length,
        integrations: integrations.data
          .filter((item) => item.id === "opencode" || item.id === "opencode-go")
          .map((item) => ({
            id: item.id,
            name: item.name,
            methods: item.methods.map((method) =>
              method.type === "env"
                ? { type: method.type, names: method.names }
                : { type: method.type },
            ),
            connections: item.connections.map((connection) => ({
              type: connection.type,
              ...(connection.type === "env" ? { name: connection.name } : {}),
            })),
          })),
        goModels: catalog.data
          .filter((item) => item.providerID === "opencode-go")
          .map((item) => ({
            id: item.modelID,
            name: item.name,
            enabled: item.enabled,
            tools: item.capabilities.tools,
            input: item.capabilities.input,
          })),
      },
      null,
      2,
    ),
  );
  const compatible = catalog.data.filter(
    (item) =>
      item.providerID === "opencode-go" &&
      item.enabled &&
      item.capabilities.tools,
  );
  const model =
    compatible.find((item) => item.modelID === "deepseek-v4-flash") ??
    compatible[0];
  if (!model) {
    await Service.stop({ file: state }).catch(() => undefined);
    throw new Error(
      `No compatible OpenCode Go model in providers: ${providers.join(", ")}`,
    );
  }
  await writeFile(
    resolve("test-results", "live-model.json"),
    JSON.stringify(
      { provider: model.providerID, model: model.modelID },
      null,
      2,
    ),
  );
  await stage("session-create");
  const session = await client.session.create(
    {
      title: "Uruvam bounded live validation",
      agent: "build",
      model: { providerID: model.providerID, id: model.modelID },
      location: { directory: root },
    },
    { signal: AbortSignal.timeout(30_000) },
  );
  await stage("generation");
  await client.session.prompt(
    {
      sessionID: session.id,
      skills: [{ id: "uruvam-design" }],
      text: "Build the complete Luma exhibition planner described in DESIGN.md. Create source-owned shadcn-style components in src/components/ui. Include realistic overview and timeline navigation plus loading, empty, error, success, and disabled states. Keep the interface minimal, editorial, and relatable to designers. Ensure keyboard-visible accessible controls and responsive layouts at 390px and 1440px. This project uses TypeScript 6: do not add the removed baseUrl option; keep node and vite/client types for the Vite config. Avoid a custom toast reducer; use simple typed local state for feedback. Run pnpm install, typecheck, test, and build, and repair every failure before finishing. Do not access any credential, external directory, backend, deployment, or telemetry.",
    },
    { signal: AbortSignal.timeout(10 * 60_000) },
  );
  await stage("session-wait");
  await client.session
    .wait(
      { sessionID: session.id },
      { signal: AbortSignal.timeout(12 * 60_000) },
    )
    .catch(() => undefined);
  const generated = await exec("git", ["status", "--porcelain"], {
    cwd: root,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: root, CI: "1" },
  });
  if (
    !generated.stdout.split("\n").some((line) => {
      const path = line.slice(3);
      return (
        path === "index.html" ||
        path === "package.json" ||
        path.startsWith("src/")
      );
    })
  )
    throw new Error(
      "OpenCode turn completed without generating interface source",
    );
  const env = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: root,
    CI: "1",
  };
  await stage("local-gates");
  await exec("pnpm", ["install", "--frozen-lockfile", "--ignore-scripts"], {
    cwd: root,
    env,
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  for (const command of ["typecheck", "test", "build"])
    await exec("pnpm", [command], {
      cwd: root,
      env,
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
    });
  const preview = spawn("pnpm", ["dev", "--", "--port", "0", "--strictPort"], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "ignore"],
    detached: true,
  });
  await stage("visual-gates");
  const evidenceDirectory = join(root, ".uruvam", "evidence");
  await mkdir(evidenceDirectory, { recursive: true, mode: 0o700 });
  const screenshotPaths = [];
  try {
    const url = await waitForUrl(preview);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(url, { waitUntil: "networkidle" });
      const result = await page.evaluate(axe.source + "; axe.run(document)");
      const serious = result.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact),
      );
      if (serious.length)
        throw new Error(`Accessibility gate failed at ${width}px`);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      if (overflow) throw new Error(`Horizontal overflow at ${width}px`);
      const screenshotPath = join(
        evidenceDirectory,
        `live-direction-${width}.png`,
      );
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: "disabled",
      });
      screenshotPaths.push(screenshotPath);
    }
    await browser.close();
    if (errors.length)
      throw new Error("Generated preview logged console errors");
  } finally {
    stopProcessGroup(preview);
  }
  const visionModel = catalog.data.find(
    (item) =>
      item.providerID === "opencode-go" &&
      item.modelID === "minimax-m3" &&
      item.enabled &&
      item.capabilities.input.includes("image"),
  );
  if (!visionModel) throw new Error("MiniMax M3 vision model unavailable");
  await stage("vision-review");
  const vision = await client.session.create(
    {
      title: "Uruvam visual inspection",
      agent: "build",
      model: { providerID: visionModel.providerID, id: visionModel.modelID },
      location: { directory: root },
    },
    { signal: AbortSignal.timeout(30_000) },
  );
  const visionReportPath = join(root, ".uruvam", "vision-review.json");
  await writeFile(visionReportPath, JSON.stringify({ pending: true }));
  await client.session.prompt(
    {
      sessionID: vision.id,
      skills: [{ id: "uruvam-design" }],
      files: screenshotPaths.map((path) => ({
        uri: pathToFileURL(path).href,
        name: path.endsWith("390.png") ? "Mobile 390px" : "Desktop 1440px",
      })),
      text: 'Inspect both screenshots against DESIGN.md as a senior product designer. Check hierarchy, density, responsive behavior, designer-relatable copy, consistency, and obvious accessibility risks. Use needs-work only for a blocking responsive, usability, rendering, or accessibility defect; keep non-blocking polish as findings with pass. Do not edit the interface. Write only a concise JSON report to .uruvam/vision-review.json with keys "model", "verdict" (pass or needs-work), and "findings" (an array of short strings).',
    },
    { signal: AbortSignal.timeout(5 * 60_000) },
  );
  await client.session
    .wait({ sessionID: vision.id }, { signal: AbortSignal.timeout(6 * 60_000) })
    .catch(() => undefined);
  let visionReport;
  const visionDeadline = Date.now() + 6 * 60_000;
  do {
    visionReport = JSON.parse(await readFile(visionReportPath, "utf8"));
    if (
      visionReport.model === "minimax-m3" &&
      ["pass", "needs-work"].includes(visionReport.verdict) &&
      Array.isArray(visionReport.findings)
    )
      break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  } while (Date.now() < visionDeadline);
  if (
    !Array.isArray(visionReport.findings) ||
    !["pass", "needs-work"].includes(visionReport.verdict)
  )
    throw new Error("MiniMax M3 produced an invalid vision report");
  for (const [index, width] of [390, 1440].entries())
    await writeFile(
      resolve("test-results", `live-direction-${width}.png`),
      await readFile(screenshotPaths[index]),
    );
  await writeFile(
    resolve("test-results", "live-vision-review.json"),
    JSON.stringify(visionReport, null, 2),
  );
  await Service.stop({ file: state }).catch(() => undefined);
  activeServiceFile = undefined;
  const lock = await readFile(join(root, "pnpm-lock.yaml"));
  const button = await readFile(
    join(root, "src", "components", "ui", "button.tsx"),
  );
  const output = {
    status: "passed",
    disposableProject: root,
    provider: model.providerID,
    builderModel: model.modelID,
    visionModel: visionModel.modelID,
    catalogCount: catalog.data.length,
    lockfileSha256: createHash("sha256").update(lock).digest("hex"),
    sourceOwnedButtonSha256: createHash("sha256").update(button).digest("hex"),
    screenshots: [
      "test-results/live-direction-390.png",
      "test-results/live-direction-1440.png",
    ],
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch(async (error) => {
  if (activeServiceFile)
    await Service.stop({ file: activeServiceFile }).catch(() => undefined);
  const evidence = await readFile(
    resolve("test-results", "live-stage.json"),
    "utf8",
  ).catch(() => '{"stage":"startup"}');
  const failedStage =
    evidence.match(/"stage"\s*:\s*"([^"]+)"/)?.[1] ?? "startup";
  process.stderr.write(
    `Live validation failed at ${failedStage} (${error instanceof Error ? error.name : "Error"}${error && typeof error === "object" && "code" in error ? `:${String(error.code)}` : ""})\n`,
  );
  process.exitCode = 1;
});
