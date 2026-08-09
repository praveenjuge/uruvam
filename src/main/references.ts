import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { assertRegularFile } from "./paths";

const maxBytes = 20 * 1024 * 1024;
const allowed = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".txt",
  ".md",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
]);
export async function importReference(
  projectRoot: string,
  sourcePath: string,
): Promise<{ name: string }> {
  await assertRegularFile(sourcePath);
  const info = await stat(sourcePath);
  if (info.size > maxBytes) throw new Error("Reference exceeds 20 MB");
  const extension = extname(sourcePath).toLowerCase();
  if (!allowed.has(extension)) throw new Error("Unsupported reference type");
  const bytes = await readFile(sourcePath);
  validateContent(extension, bytes);
  const name = `${randomUUID()}-${basename(sourcePath).replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const destination = resolve(projectRoot, ".uruvam", "references", name);
  await mkdir(resolve(projectRoot, ".uruvam", "references"), {
    recursive: true,
    mode: 0o700,
  });
  await copyFile(sourcePath, destination);
  return { name };
}
function validateContent(extension: string, bytes: Buffer): void {
  if (
    extension === ".png" &&
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error("Malformed PNG");
  if (
    [".jpg", ".jpeg"].includes(extension) &&
    !(bytes[0] === 0xff && bytes[1] === 0xd8)
  )
    throw new Error("Malformed JPEG");
  if (
    extension === ".webp" &&
    !(
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    )
  )
    throw new Error("Malformed WebP");
  if (extension === ".svg") {
    const text = bytes.toString("utf8");
    if (
      !/^\s*<svg\b/i.test(text) ||
      /<(?:script|foreignObject|iframe|object|embed)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|file:|javascript:|data:)/i.test(
        text,
      )
    )
      throw new Error("Unsafe SVG");
  }
  if ([".txt", ".md"].includes(extension) && bytes.includes(0))
    throw new Error("Text reference contains binary data");
}
