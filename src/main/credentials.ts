import { safeStorage } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { app } from "electron";

function credentialPath(): string {
  return resolve(app.getPath("userData"), "credentials", "go.enc");
}
export async function storeCredential(value: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable())
    throw new Error("macOS Keychain encryption is unavailable");
  const path = credentialPath();
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, safeStorage.encryptString(value), { mode: 0o600 });
}
export async function hasCredential(): Promise<boolean> {
  try {
    await readFile(credentialPath());
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}
export async function withCredential<T>(
  run: (credential: string) => Promise<T>,
): Promise<T> {
  if (!safeStorage.isEncryptionAvailable())
    throw new Error("macOS Keychain encryption is unavailable");
  const encrypted = await readFile(credentialPath());
  let credential = safeStorage.decryptString(encrypted);
  try {
    return await run(credential);
  } finally {
    credential = "";
  }
}
