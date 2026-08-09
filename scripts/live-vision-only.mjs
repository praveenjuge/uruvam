import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { OpenCode } from "@opencode-ai/client";
import { Service } from "@opencode-ai/client/service";
import axe from "axe-core";
import { chromium } from "playwright";

const exec = promisify(execFile);
const root = resolve(process.argv[2] ?? "");
if (
  !root.includes("uruvam-live-") ||
  !(await readFile(join(root, "DESIGN.md")))
)
  throw new Error("Expected a disposable Uruvam live project");
const visionHome = join(root, ".uruvam", "vision-home");
const state = join(visionHome, ".local", "state", "opencode", "service.json");
let active = true;
let stage = "visual-gates";

function stopProcessGroup(child) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string")
        return reject(new Error("No preview port"));
      server.close(() => resolvePort(address.port));
    });
  });
}

async function previewUrl(port) {
  const url = `http://127.0.0.1:${port}/`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if ((await fetch(url).catch(() => undefined))?.ok) return url;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error("Preview timeout");
}

async function main() {
  const port = await availablePort();
  const preview = spawn(
    "pnpm",
    [
      "exec",
      "vite",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      cwd: root,
      env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: root, CI: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );
  const evidence = join(root, ".uruvam", "evidence");
  await mkdir(evidence, { recursive: true, mode: 0o700 });
  const paths = [];
  try {
    const url = await previewUrl(port);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const result = await page.evaluate(axe.source + "; axe.run(document)");
      const serious = result.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact),
      );
      if (serious.length)
        throw new Error(
          `Accessibility failed at ${width}px: ${serious.map((item) => item.id).join(", ")}`,
        );
      if (
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        )
      )
        throw new Error(`Horizontal overflow at ${width}px`);
      const path = join(evidence, `live-direction-${width}.png`);
      await page.screenshot({ path, fullPage: true, animations: "disabled" });
      paths.push(path);
    }
    await browser.close();
  } finally {
    stopProcessGroup(preview);
  }

  const keyResult = await exec(
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
  stage = "vision-service";
  await mkdir(visionHome, { recursive: true, mode: 0o700 });
  let key = Buffer.from(keyResult.stdout).toString("utf8").trim();
  const saved = new Map();
  for (const name of Object.keys(process.env)) {
    if (/(?:TOKEN|KEY|PASSWORD|SECRET|AUTH|CREDENTIAL)/i.test(name)) {
      saved.set(name, process.env[name]);
      delete process.env[name];
    }
  }
  Object.assign(process.env, {
    OPENCODE_API_KEY: key,
    HOME: visionHome,
    XDG_CONFIG_HOME: join(visionHome, ".config"),
    XDG_DATA_HOME: join(visionHome, ".local", "share"),
    XDG_STATE_HOME: join(visionHome, ".local", "state"),
  });
  let endpoint;
  try {
    await Service.stop({ file: state }).catch(() => undefined);
    endpoint = await Service.ensure({
      file: state,
      version: "0.0.0-next-17055",
      command: [resolve("vendor/opencode2"), "serve", "--service"],
    });
  } finally {
    key = "";
    delete process.env.OPENCODE_API_KEY;
    for (const [name, value] of saved)
      if (value !== undefined) process.env[name] = value;
  }
  const client = OpenCode.make({
    baseUrl: endpoint.url,
    headers: Service.headers(endpoint),
  });
  stage = "vision-catalog";
  let models = await client.model.list({ location: { directory: root } });
  const catalogDeadline = Date.now() + 30_000;
  while (models.data.length === 0 && Date.now() < catalogDeadline) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    models = await client.model.list({ location: { directory: root } });
  }
  const model = models.data.find(
    (item) =>
      item.providerID === "opencode-go" &&
      item.modelID === "minimax-m3" &&
      item.enabled &&
      item.capabilities.input.includes("image"),
  );
  if (!model) throw new Error("MiniMax M3 unavailable");
  stage = "vision-session";
  const session = await client.session.create({
    title: "Uruvam evidence review",
    agent: "build",
    model: { providerID: model.providerID, id: model.modelID },
    location: { directory: root },
  });
  const reportPath = join(root, ".uruvam", "vision-review.json");
  await writeFile(reportPath, JSON.stringify({ pending: true }));
  await client.session.prompt({
    sessionID: session.id,
    files: paths.map((path) => ({
      uri: pathToFileURL(path).href,
      name: path.endsWith("390.png") ? "Mobile 390px" : "Desktop 1440px",
    })),
    text: 'Review only these two screenshots as a senior product designer. Do not edit source. Use "needs-work" only for a blocking responsive, usability, rendering, or accessibility defect; record non-blocking polish opportunities as findings with a "pass" verdict. Write .uruvam/vision-review.json with keys "model" (minimax-m3), "verdict" (pass or needs-work), and "findings" (short strings).',
  });
  stage = "vision-wait";
  await client.session
    .wait(
      { sessionID: session.id },
      { signal: AbortSignal.timeout(6 * 60_000) },
    )
    .catch(() => undefined);
  let report;
  const reportDeadline = Date.now() + 6 * 60_000;
  do {
    report = JSON.parse(await readFile(reportPath, "utf8"));
    if (
      report.model === "minimax-m3" &&
      ["pass", "needs-work"].includes(report.verdict) &&
      Array.isArray(report.findings)
    )
      break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  } while (Date.now() < reportDeadline);
  stage = "vision-report";
  if (
    report.model !== "minimax-m3" ||
    !["pass", "needs-work"].includes(report.verdict) ||
    !Array.isArray(report.findings)
  )
    throw new Error("Invalid MiniMax report");
  if (report.verdict === "needs-work") {
    const repairModel = models.data.find(
      (item) =>
        item.providerID === "opencode-go" &&
        item.modelID === "deepseek-v4-flash" &&
        item.enabled &&
        item.capabilities.tools,
    );
    if (!repairModel) throw new Error("DeepSeek repair model unavailable");
    stage = "deepseek-repair";
    const repair = await client.session.create({
      title: "Uruvam bounded visual repair",
      agent: "build",
      model: { providerID: repairModel.providerID, id: repairModel.modelID },
      location: { directory: root },
    });
    await client.session.prompt({
      sessionID: repair.id,
      skills: [{ id: "uruvam-design" }],
      text: `Finish the generated Luma direction now. Replace the placeholder src/App.tsx with the complete responsive exhibition planner using the source-owned components and data already created. Address these visual-review findings: ${report.findings.join("; ")}. Keep designer-relatable copy and visible focus. Run typecheck, test, and build. Do not access credentials or external directories.`,
    });
    await client.session
      .wait(
        { sessionID: repair.id },
        { signal: AbortSignal.timeout(8 * 60_000) },
      )
      .catch(() => undefined);
    const appSource = await readFile(join(root, "src", "App.tsx"), "utf8");
    if (appSource.includes("Direction waiting to be shaped"))
      throw new Error("DeepSeek repair did not replace the placeholder");
    await Service.stop({ file: state });
    active = false;
    process.stdout.write(
      JSON.stringify({
        status: "repaired-needs-recheck",
        builderModel: "deepseek-v4-flash",
        visionModel: "minimax-m3",
        project: root,
      }) + "\n",
    );
    return;
  }
  for (const [index, width] of [390, 1440].entries())
    await writeFile(
      resolve("test-results", `live-direction-${width}.png`),
      await readFile(paths[index]),
    );
  await writeFile(
    resolve("test-results", "live-vision-review.json"),
    JSON.stringify(report, null, 2),
  );
  await Service.stop({ file: state });
  active = false;
  const output =
    JSON.stringify({
      status: "passed",
      builderModel: "deepseek-v4-flash",
      visionModel: "minimax-m3",
      project: root,
    }) + "\n";
  process.stdout.write(output, () => process.exit(0));
}

main().catch(async (error) => {
  if (active) await Service.stop({ file: state }).catch(() => undefined);
  const detail =
    stage === "visual-gates" && error instanceof Error
      ? `: ${error.message}`
      : "";
  const code =
    error && typeof error === "object" && "code" in error
      ? `:${String(error.code)}`
      : "";
  process.stderr.write(
    `Vision validation failed at ${stage} (${error instanceof Error ? error.name : "Error"}${code})${detail}\n`,
  );
  process.exit(1);
});
