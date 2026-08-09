import { app, BrowserWindow, shell } from "electron";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { configureLogging } from "./logging";
import { registerIpc } from "./ipc";
import { OpenCodeManager } from "./opencode";
import { PreviewHost } from "./preview";
import { configureUpdates } from "./updates";

const e2eData = process.env.URUVAM_E2E_DATA;
if (process.env.URUVAM_E2E === "1" && e2eData) {
  const candidate = realpathSync(resolve(e2eData));
  if (relative(realpathSync(tmpdir()), candidate).startsWith(".."))
    throw new Error("E2E data must be isolated under the temporary directory");
  app.setPath("userData", candidate);
}

if (process.platform !== "darwin" || process.arch !== "arm64") {
  void app
    .whenReady()
    .then(() => {
      throw new Error("Uruvam public alpha requires Apple Silicon macOS");
    })
    .catch(() => app.quit());
}
configureLogging();
let window: BrowserWindow | undefined;
const getWindow = () => window;
const preview = new PreviewHost(getWindow);
const opencode = new OpenCodeManager(getWindow);
registerIpc(preview, opencode);

function createWindow(): void {
  window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 960,
    minHeight: 680,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#111111",
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (
        parsed.protocol === "https:" &&
        ["opencode.ai", "github.com", "ui.shadcn.com"].includes(parsed.hostname)
      )
        void shell.openExternal(url);
    } catch {
      /* blocked */
    }
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== window?.webContents.getURL()) event.preventDefault();
  });
  window.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  window.once("ready-to-show", () => window?.show());
  window.on("closed", () => {
    preview.destroy();
    window = undefined;
  });
  const devServer =
    typeof MAIN_WINDOW_VITE_DEV_SERVER_URL === "string"
      ? MAIN_WINDOW_VITE_DEV_SERVER_URL
      : undefined;
  const rendererName =
    typeof MAIN_WINDOW_VITE_NAME === "string"
      ? MAIN_WINDOW_VITE_NAME
      : "main_window";
  if (devServer) void window.loadURL(devServer);
  else
    void window.loadFile(
      join(__dirname, `../renderer/${rendererName}/index.html`),
    );
}
void app
  .whenReady()
  .then(() => {
    createWindow();
    void configureUpdates();
  })
  .catch(() => app.quit());
app.on("activate", () => {
  if (!BrowserWindow.getAllWindows().length) createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
  void opencode.shutdown();
});

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
