import { _electron as electron, expect, test } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("packaged app presents secure first-launch disclosures", async () => {
  const userData = mkdtempSync(join(tmpdir(), "uruvam-e2e-"));
  const application = await electron.launch({
    args: ["."],
    env: { ...process.env, URUVAM_E2E: "1", URUVAM_E2E_DATA: userData },
  });
  const page = await application.firstWindow();
  page.on("console", (message) =>
    process.stderr.write(`[renderer:${message.type()}] ${message.text()}\n`),
  );
  page.on("pageerror", (error) =>
    process.stderr.write(`[renderer:error] ${error.message}\n`),
  );
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByText("Shape real interfaces visually.")).toBeVisible();
  await expect(page.getByText("Your work stays here")).toBeVisible();
  await expect(
    page.getByText("Uruvam does not sync, publish, or track you."),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/app-shell.png",
    animations: "disabled",
  });
  await application.close();
});
