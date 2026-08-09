import { BrowserWindow, WebContentsView, shell } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import {
  commentInput,
  httpPreviewUrl,
  previewBoundsInput,
} from "../shared/contracts";
import { channels } from "../shared/channels";

export class PreviewHost {
  private view: WebContentsView | undefined;
  private process: ChildProcess | undefined;
  constructor(private readonly window: () => BrowserWindow | undefined) {}
  private ensure(): WebContentsView {
    if (this.view) return this.view;
    const parent = this.window();
    if (!parent) throw new Error("Main window unavailable");
    this.view = new WebContentsView({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        spellcheck: false,
        partition: "uruvam-preview",
      },
    });
    this.view.webContents.setWindowOpenHandler(({ url }) => {
      if (isAllowedExternal(url)) void shell.openExternal(url);
      return { action: "deny" };
    });
    this.view.webContents.on("will-navigate", (event, url) => {
      try {
        httpPreviewUrl.parse(url);
      } catch {
        event.preventDefault();
      }
    });
    this.view.webContents.session.setPermissionRequestHandler(
      (_contents, _permission, callback) => callback(false),
    );
    this.view.webContents.session.on("will-download", (event) =>
      event.preventDefault(),
    );
    this.view.webContents.session.webRequest.onBeforeRequest(
      (details, callback) => {
        try {
          const url = new URL(details.url);
          callback({
            cancel: !(
              url.protocol === "data:" ||
              (url.protocol === "http:" && url.hostname === "127.0.0.1")
            ),
          });
        } catch {
          callback({ cancel: true });
        }
      },
    );
    this.view.webContents.on("did-finish-load", () => {
      void this.view?.webContents
        .executeJavaScript(
          `
        if (!window.__uruvamAnchors) {
          window.__uruvamAnchors = true;
          addEventListener("click", (event) => {
            if (!event.altKey) return;
            event.preventDefault(); event.stopPropagation();
            const target = event.target instanceof Element ? event.target : document.body;
            const rect = target.getBoundingClientRect();
            console.debug("__URUVAM_ANCHOR__" + JSON.stringify({
              route: location.pathname + location.search,
              elementId: target.getAttribute("data-uruvam-id") || target.id || undefined,
              fingerprint: [target.getAttribute("aria-label"), target.textContent?.trim().slice(0, 160)].filter(Boolean).join(" | "),
              selector: target.id ? "#" + CSS.escape(target.id) : target.tagName.toLowerCase(),
              x: Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1))),
              y: Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(rect.height, 1)))
            }));
          }, true);
        }
      `,
        )
        .catch(() => undefined);
    });
    this.view.webContents.on("console-message", (_event, _level, message) => {
      if (!message.startsWith("__URUVAM_ANCHOR__")) return;
      try {
        this.window()?.webContents.send(channels.event, {
          type: "anchor",
          anchor: commentInput.shape.anchor.parse(
            JSON.parse(message.slice(19)) as unknown,
          ),
        });
      } catch {
        /* malformed preview message */
      }
    });
    parent.contentView.addChildView(this.view);
    return this.view;
  }
  async open(raw: string): Promise<void> {
    const url = httpPreviewUrl.parse(raw);
    await this.ensure().webContents.loadURL(url);
  }
  async openProject(root: string): Promise<{ url: string }> {
    this.stopProcess();
    const child = spawn(
      "pnpm",
      ["exec", "vite", "--host", "127.0.0.1", "--port", "0", "--strictPort"],
      {
        cwd: root,
        env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: root, CI: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    this.process = child;
    const url = await new Promise<string>((resolveUrl, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Local preview did not start")),
        30_000,
      );
      child.stdout.on("data", (chunk: Buffer) => {
        const match = chunk
          .toString("utf8")
          .match(/http:\/\/127\.0\.0\.1:\d+\//);
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
        reject(new Error(`Local preview exited with ${code ?? "unknown"}`));
      });
    });
    await this.open(url);
    return { url };
  }
  bounds(raw: unknown): void {
    this.ensure().setBounds(previewBoundsInput.parse(raw));
  }
  hide(): void {
    if (this.view) this.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  }
  destroy(): void {
    this.stopProcess();
    if (!this.view) return;
    this.window()?.contentView.removeChildView(this.view);
    this.view.webContents.close();
    this.view = undefined;
  }
  private stopProcess(): void {
    if (this.process && this.process.exitCode === null)
      this.process.kill("SIGTERM");
    this.process = undefined;
  }
}
function isAllowedExternal(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      ["opencode.ai", "github.com", "ui.shadcn.com"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
