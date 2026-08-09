import { app } from "electron";
import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export function managedRoot(): string {
  return resolve(app.getPath("userData"), "projects");
}
export async function assertManagedPath(
  input: string,
  root = managedRoot(),
): Promise<string> {
  if (!isAbsolute(input)) throw new Error("Absolute path required");
  const resolvedRoot = await realpath(root);
  const candidate = await realpath(input);
  const rel = relative(resolvedRoot, candidate);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error("Path escapes managed storage");
  return candidate;
}
export function safeChild(root: string, name: string): string {
  const candidate = resolve(root, name);
  const rel = relative(root, candidate);
  if (!rel || rel.startsWith("..") || isAbsolute(rel))
    throw new Error("Unsafe child path");
  return candidate;
}
export async function assertRegularFile(path: string): Promise<void> {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink())
    throw new Error("Regular files only");
}
