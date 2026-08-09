import { app } from "electron";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { BrowserWindow } from "electron";
import type {
  ExtensionCatalog,
  ModelOption,
  RunState,
} from "../shared/contracts";
import { channels } from "../shared/contracts";
import { withCredential } from "./credentials";
import { logger } from "./logging";
import { getProject } from "./projects";
import { updateProjectState } from "./project-state";
import { readProjectState } from "./project-state";
import { inspectDirection } from "./quality";
import { listTrust } from "./trust";

const exec = promisify(execFile);
const version = "0.0.0-next-17055";
type Client = ReturnType<
  (typeof import("@opencode-ai/client"))["OpenCode"]["make"]
>;
type ServiceEndpoint = Awaited<
  ReturnType<
    (typeof import("@opencode-ai/client/service"))["Service"]["ensure"]
  >
>;
const projectEnvironment = (root: string): NodeJS.ProcessEnv => ({
  PATH: process.env.PATH ?? "/usr/bin:/bin",
  HOME: root,
  CI: "1",
});

interface VisionReport {
  model: string;
  verdict: "pass" | "needs-work";
  findings: string[];
}

function binaryPath(): string {
  return app.isPackaged
    ? resolve(process.resourcesPath, "opencode2")
    : resolve(app.getAppPath(), "vendor", "opencode2");
}
function registrationPath(): string {
  return resolve(
    app.getPath("userData"),
    "opencode",
    "home",
    ".local",
    "state",
    "opencode",
    "service.json",
  );
}

export class OpenCodeManager {
  private client?: Client;
  private endpoint?: ServiceEndpoint;
  private readonly runs = new Map<string, RunState>();
  private readonly sessions = new Map<string, string>();
  private readonly aborters = new Map<string, AbortController>();
  private readonly queues = new Map<
    string,
    Array<{ prompt: string; model: string }>
  >();
  constructor(private readonly window: () => BrowserWindow | undefined) {}

  private emit(state: RunState): void {
    this.runs.set(state.projectId, state);
    this.window()?.webContents.send(channels.event, { type: "run", state });
  }
  private async connect(): Promise<Client> {
    if (this.client) return this.client;
    const [{ OpenCode }, { Service }] = await Promise.all([
      import("@opencode-ai/client"),
      import("@opencode-ai/client/service"),
    ]);
    await mkdir(resolve(app.getPath("userData"), "opencode"), {
      recursive: true,
      mode: 0o700,
    });
    this.endpoint = await withCredential(async (key) =>
      this.withNarrowServiceEnvironment(key, async () =>
        Service.ensure({
          file: registrationPath(),
          version,
          command: [binaryPath(), "serve", "--service"],
          onStart: (reason) =>
            logger.info("opencode.service.start", { reason, version }),
        }),
      ),
    );
    this.client = OpenCode.make({
      baseUrl: this.endpoint.url,
      headers: Service.headers(this.endpoint),
      fetch: (input, init) => fetch(input, { ...init, redirect: "error" }),
    });
    await this.client.health.get({ signal: AbortSignal.timeout(10_000) });
    return this.client;
  }

  async validateCredential(key: string): Promise<void> {
    const [{ OpenCode }, { Service }] = await Promise.all([
      import("@opencode-ai/client"),
      import("@opencode-ai/client/service"),
    ]);
    await Service.stop({ file: registrationPath() }).catch(() => undefined);
    const endpoint = await this.withNarrowServiceEnvironment(key, () =>
      Service.ensure({
        file: registrationPath(),
        version,
        command: [binaryPath(), "serve", "--service"],
      }),
    );
    const client = OpenCode.make({
      baseUrl: endpoint.url,
      headers: Service.headers(endpoint),
      fetch: (input, init) => fetch(input, { ...init, redirect: "error" }),
    });
    try {
      const models = await client.model.list(
        { location: { directory: app.getPath("userData") } },
        { signal: AbortSignal.timeout(30_000) },
      );
      const model = models.data.find(
        (item) =>
          item.providerID === "opencode-go" &&
          item.enabled &&
          item.capabilities.tools,
      );
      if (!model)
        throw new Error("This Go account has no compatible design model");
      await client.generate.text(
        {
          prompt: "Reply with OK.",
          model: { providerID: model.providerID, id: model.modelID },
          location: { directory: app.getPath("userData") },
        },
        { signal: AbortSignal.timeout(30_000) },
      );
      this.endpoint = endpoint;
      this.client = client;
    } catch (error) {
      await Service.stop({ file: registrationPath() }).catch(() => undefined);
      throw new Error("OpenCode Go could not validate this key", {
        cause: error,
      });
    }
  }

  private async withNarrowServiceEnvironment<T>(
    key: string,
    run: () => Promise<T>,
  ): Promise<T> {
    const secret = /(?:TOKEN|KEY|PASSWORD|SECRET|AUTH|CREDENTIAL)/i;
    const saved = new Map<string, string>();
    for (const [name, value] of Object.entries(process.env)) {
      if (value !== undefined && secret.test(name)) {
        saved.set(name, value);
        Reflect.deleteProperty(process.env, name);
      }
    }
    const home = resolve(app.getPath("userData"), "opencode", "home");
    await mkdir(home, { recursive: true, mode: 0o700 });
    const fixed = {
      OPENCODE_API_KEY: key,
      HOME: home,
      XDG_CONFIG_HOME: resolve(home, ".config"),
      XDG_DATA_HOME: resolve(home, ".local", "share"),
      XDG_STATE_HOME: resolve(home, ".local", "state"),
    };
    const previous = new Map(
      Object.keys(fixed).map((name) => [name, process.env[name]]),
    );
    Object.assign(process.env, fixed);
    try {
      return await run();
    } finally {
      for (const name of Object.keys(fixed)) {
        const value = previous.get(name);
        if (value === undefined) Reflect.deleteProperty(process.env, name);
        else process.env[name] = value;
      }
      for (const [name, value] of saved) process.env[name] = value;
    }
  }

  async models(projectId?: string): Promise<ModelOption[]> {
    const project = projectId
      ? await getProject(projectId)
      : (await (await import("./projects")).listProjects())[0];
    if (!project) return [];
    const client = await this.connect();
    let response = await client.model.list(
      { location: { directory: project.root } },
      { signal: AbortSignal.timeout(10_000) },
    );
    const deadline = Date.now() + 30_000;
    while (response.data.length === 0 && Date.now() < deadline) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 250));
      response = await client.model.list(
        { location: { directory: project.root } },
        { signal: AbortSignal.timeout(10_000) },
      );
    }
    return response.data
      .filter((model) => model.providerID === "opencode-go")
      .map((model) => {
        const compatible = model.enabled && model.capabilities.tools;
        return {
          id: `${model.providerID}/${model.modelID}`,
          name: model.name,
          provider: model.providerID,
          compatible,
          ...(compatible
            ? {}
            : {
                reason: !model.enabled
                  ? "Unavailable for this Go account"
                  : !model.capabilities.tools
                    ? "Tool use is required"
                    : "Tool use is required",
              }),
        };
      });
  }

  async extensions(projectId: string): Promise<ExtensionCatalog> {
    const project = await getProject(projectId);
    const client = await this.connect();
    const location = { location: { directory: project.root } };
    const [skills, plugins, mcp, trust] = await Promise.all([
      client.skill.list(location),
      client.plugin.list(location),
      client.mcp.list(location),
      listTrust(project.root),
    ]);
    return {
      skills: skills.data.map((item) => ({
        id: item.id,
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
      })),
      plugins: plugins.data.map((item) => ({ id: item.id })),
      mcp: mcp.data.map((item) => ({
        name: item.name,
        status: item.status.status,
      })),
      trust,
    };
  }

  async start(
    projectId: string,
    prompt: string,
    model: string,
  ): Promise<RunState> {
    if (!model.startsWith("opencode-go/"))
      throw new Error("Only OpenCode Go models are supported");
    const selected = (await this.models(projectId)).find(
      (item) => item.id === model,
    );
    if (!selected?.compatible)
      throw new Error(
        selected?.reason ?? "This model cannot run visual design directions",
      );
    const existing = this.runs.get(projectId);
    if (existing?.status === "running") {
      const queue = this.queues.get(projectId) ?? [];
      queue.push({ prompt, model });
      this.queues.set(projectId, queue);
      const queued: RunState = {
        projectId,
        status: "queued",
        prompt,
        repairsUsed: existing.repairsUsed,
        minutesUsed: existing.minutesUsed,
        milestone: "Saved for after the current direction",
        queueDepth: queue.length,
        budgetRemaining: {
          repairs: Math.max(0, 3 - existing.repairsUsed),
          minutes: Math.max(0, 20 - existing.minutesUsed),
        },
      };
      this.emit(queued);
      return queued;
    }
    const project = await getProject(projectId);
    const started = Date.now();
    const controller = new AbortController();
    this.aborters.set(projectId, controller);
    const state: RunState = {
      projectId,
      status: "running",
      prompt,
      startedAt: new Date(started).toISOString(),
      repairsUsed: 0,
      minutesUsed: 0,
      milestone: "Creating isolated direction",
      budgetRemaining: { repairs: 3, minutes: 20 },
    };
    this.emit(state);
    void this.execute(
      project.root,
      projectId,
      prompt,
      model,
      started,
      controller,
    )
      .catch((error: unknown) => {
        logger.error("generation.failed", error);
        this.emit({
          ...state,
          status: "failed",
          minutesUsed: Math.ceil((Date.now() - started) / 60_000),
          milestone:
            error instanceof Error ? error.message : "Generation failed",
        });
      })
      .finally(() => void this.drain(projectId));
    return state;
  }

  private async drain(projectId: string): Promise<void> {
    const next = this.queues.get(projectId)?.shift();
    if (!next) return;
    this.runs.delete(projectId);
    await this.start(projectId, next.prompt, next.model);
  }

  private async execute(
    root: string,
    projectId: string,
    prompt: string,
    model: string,
    started: number,
    controller: AbortController,
  ): Promise<void> {
    const branch = `uruvam/run/${Date.now()}`;
    const worktree = resolve(
      app.getPath("userData"),
      "worktrees",
      projectId,
      branch.replaceAll("/", "-"),
    );
    await mkdir(resolve(worktree, ".."), { recursive: true });
    await exec("git", ["worktree", "add", "-b", branch, worktree, "main"], {
      cwd: root,
      env: projectEnvironment(root),
      timeout: 20_000,
    });
    const client = await this.connect();
    const [provider, ...modelParts] = model.split("/");
    if (!provider || modelParts.length === 0)
      throw new Error("Invalid model selection");
    const session = await client.session.create(
      {
        title: "Uruvam design direction",
        agent: "build",
        model: { providerID: provider, id: modelParts.join("/") },
        location: { directory: worktree },
      },
      { signal: controller.signal },
    );
    this.sessions.set(projectId, session.id);
    this.emit({
      projectId,
      status: "running",
      prompt,
      startedAt: new Date(started).toISOString(),
      repairsUsed: 0,
      minutesUsed: 0,
      milestone: "Generating first direction",
      branch,
      budgetRemaining: { repairs: 3, minutes: 20 },
    });
    await client.session.prompt(
      {
        sessionID: session.id,
        skills: [{ id: "uruvam-design" }],
        text: `${prompt}\n\nUse the uruvam-design skill. Build the complete realistic multi-route prototype with all declared states. Keep shadcn source-owned components. Validate at 390px and 1440px. Run typecheck, lint, tests, and build. Do not add a backend, telemetry, deployment, source viewer, raw diff, terminal, or file tree.`,
      },
      { signal: controller.signal },
    );
    await client.session
      .wait(
        { sessionID: session.id },
        {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(20 * 60 * 1000),
          ]),
        },
      )
      .catch(() => undefined);
    const mutation = await exec("git", ["status", "--porcelain"], {
      cwd: worktree,
      env: projectEnvironment(worktree),
    });
    if (
      !mutation.stdout.split("\n").some((line) => {
        const path = line.slice(3);
        return (
          path === "index.html" ||
          path === "package.json" ||
          path.startsWith("src/")
        );
      })
    )
      throw new Error("OpenCode finished without a visual source change");
    await exec("pnpm", ["install", "--frozen-lockfile", "--ignore-scripts"], {
      cwd: worktree,
      env: projectEnvironment(worktree),
      timeout: 180_000,
    });
    let repairsUsed = 0;
    for (;;) {
      try {
        for (const command of ["typecheck", "lint", "test", "build"])
          await exec("pnpm", [command], {
            cwd: worktree,
            env: projectEnvironment(worktree),
            timeout: 120_000,
          });
        const quality = await inspectDirection(
          worktree,
          (await readProjectState(worktree)).screens,
        );
        const vision = await this.reviewDirection(
          client,
          worktree,
          quality.screenshots,
          controller,
        );
        if (vision.verdict !== "pass")
          throw new Error(
            `MiniMax visual review: ${vision.findings.join("; ").slice(0, 1800)}`,
          );
        break;
      } catch (error) {
        const minutes = Math.ceil((Date.now() - started) / 60_000);
        if (repairsUsed >= 3 || minutes >= 20) throw error;
        repairsUsed += 1;
        this.emit({
          projectId,
          status: "running",
          prompt,
          startedAt: new Date(started).toISOString(),
          repairsUsed,
          minutesUsed: minutes,
          milestone: `Repairing quality findings · pass ${repairsUsed} of 3`,
          branch,
          budgetRemaining: {
            repairs: 3 - repairsUsed,
            minutes: Math.max(0, 20 - minutes),
          },
        });
        const finding =
          error instanceof Error
            ? error.message.slice(0, 2000)
            : "Quality validation failed";
        await client.session.prompt(
          {
            sessionID: session.id,
            text: `Repair the candidate against this local quality-gate result, then rerun the affected checks. Do not weaken or remove tests: ${finding}`,
          },
          { signal: controller.signal },
        );
        await client.session
          .wait(
            { sessionID: session.id },
            { signal: AbortSignal.timeout(Math.max(1, 20 - minutes) * 60_000) },
          )
          .catch(() => undefined);
      }
    }
    await exec("git", ["add", "."], {
      cwd: worktree,
      env: projectEnvironment(worktree),
    });
    const status = await exec("git", ["status", "--porcelain"], {
      cwd: worktree,
      env: projectEnvironment(worktree),
    });
    if (status.stdout.trim())
      await exec(
        "git",
        [
          "-c",
          "user.name=Uruvam",
          "-c",
          "user.email=local@uruvam.invalid",
          "commit",
          "-m",
          "feat: generate validated design direction",
        ],
        { cwd: worktree, env: projectEnvironment(worktree) },
      );
    const complete: RunState = {
      projectId,
      status: "complete",
      repairsUsed,
      minutesUsed: Math.ceil((Date.now() - started) / 60_000),
      milestone: `Direction ready on ${branch}`,
      branch,
      budgetRemaining: {
        repairs: 3 - repairsUsed,
        minutes: Math.max(0, 20 - Math.ceil((Date.now() - started) / 60_000)),
      },
    };
    await updateProjectState(root, (state) => ({
      ...state,
      recoverableRun: complete,
      directions: [
        {
          name: `Direction ${new Date().toLocaleDateString()}`,
          branch,
          status: "draft",
          createdAt: new Date().toISOString(),
        },
        ...state.directions.filter((item) => item.branch !== branch),
      ],
    }));
    this.emit(complete);
  }

  private async reviewDirection(
    client: Client,
    root: string,
    screenshots: string[],
    controller: AbortController,
  ): Promise<VisionReport> {
    const catalog = await client.model.list(
      { location: { directory: root } },
      { signal: controller.signal },
    );
    const model = catalog.data.find(
      (item) =>
        item.providerID === "opencode-go" &&
        item.modelID === "minimax-m3" &&
        item.enabled &&
        item.capabilities.tools &&
        item.capabilities.input.includes("image"),
    );
    if (!model) throw new Error("MiniMax M3 vision review is unavailable");
    const session = await client.session.create(
      {
        title: "Uruvam visual review",
        agent: "build",
        model: { providerID: model.providerID, id: model.modelID },
        location: { directory: root },
      },
      { signal: controller.signal },
    );
    const reportPath = resolve(root, ".uruvam", "vision-review.json");
    await writeFile(reportPath, JSON.stringify({ pending: true }), {
      mode: 0o600,
    });
    await client.session.prompt(
      {
        sessionID: session.id,
        skills: [{ id: "uruvam-design" }],
        files: screenshots.map((path) => ({
          uri: pathToFileURL(path).href,
          name: path.endsWith("390.png") ? "Mobile 390px" : "Desktop 1440px",
        })),
        text: 'Review only these screenshots against DESIGN.md. Check hierarchy, density, responsive behavior, designer-relatable copy, consistency, and obvious accessibility risks. Use needs-work only for a blocking responsive, usability, rendering, or accessibility defect; keep non-blocking polish as findings with pass. Do not change the interface. Write only .uruvam/vision-review.json with keys "model" (minimax-m3), "verdict" (pass or needs-work), and "findings" (short strings).',
      },
      { signal: controller.signal },
    );
    await client.session
      .wait(
        { sessionID: session.id },
        { signal: AbortSignal.timeout(6 * 60_000) },
      )
      .catch(() => undefined);
    let value: Partial<VisionReport> = {};
    const deadline = Date.now() + 6 * 60_000;
    do {
      value = JSON.parse(
        await readFile(reportPath, "utf8"),
      ) as Partial<VisionReport>;
      if (
        value.model === "minimax-m3" &&
        ["pass", "needs-work"].includes(value.verdict ?? "") &&
        Array.isArray(value.findings)
      )
        break;
      await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    } while (Date.now() < deadline);
    if (
      value.model !== "minimax-m3" ||
      !["pass", "needs-work"].includes(value.verdict ?? "") ||
      !Array.isArray(value.findings) ||
      value.findings.some((item) => typeof item !== "string")
    )
      throw new Error("MiniMax M3 returned an invalid visual review");
    return value as VisionReport;
  }

  async stop(projectId: string): Promise<void> {
    this.aborters.get(projectId)?.abort();
    const session = this.sessions.get(projectId);
    if (session && this.client)
      await this.client.session
        .interrupt({ sessionID: session })
        .catch(() => {});
    const current = this.runs.get(projectId);
    this.emit({
      projectId,
      status: "stopped",
      repairsUsed: current?.repairsUsed ?? 0,
      minutesUsed: current?.minutesUsed ?? 0,
      milestone: "Stopped at the latest recoverable checkpoint",
      ...(current?.branch ? { branch: current.branch } : {}),
      ...(current?.budgetRemaining
        ? { budgetRemaining: current.budgetRemaining }
        : {}),
    });
  }
  async shutdown(): Promise<void> {
    if (this.endpoint) {
      const { Service } = await import("@opencode-ai/client/service");
      await Service.stop({ file: registrationPath() }).catch(() => {});
    }
  }
}
