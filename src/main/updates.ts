import { app } from "electron";
import { logger } from "./logging";

export async function configureUpdates(): Promise<void> {
  if (!app.isPackaged) return;
  const { autoUpdater } = await import("electron-updater");
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "praveenjuge",
    repo: "uruvam",
  });
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;
  autoUpdater.on("error", (error) => logger.error("update.error", error));
  autoUpdater.on("update-available", ({ version }) =>
    logger.info("update.available", { version }),
  );
  autoUpdater.on("update-downloaded", ({ version }) =>
    logger.info("update.verified", { version }),
  );
  void autoUpdater
    .checkForUpdates()
    .catch((error: unknown) => logger.error("update.check.failed", error));
}
