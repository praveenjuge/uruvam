import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

async function findZip(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const found = await findZip(path);
      if (found) return found;
    } else if (entry.name.endsWith(".zip")) return path;
  }
}

const archive = await findZip(resolve("out"));
if (!archive) throw new Error("No macOS ZIP found under out");
const bytes = await readFile(archive);
const size = (await stat(archive)).size;
const sha512 = createHash("sha512").update(bytes).digest("base64");
const { version } = JSON.parse(await readFile(resolve("package.json"), "utf8"));
const name = basename(archive);
const manifest = [
  `version: ${version}`,
  "files:",
  `  - url: ${name}`,
  `    sha512: ${sha512}`,
  `    size: ${size}`,
  `path: ${name}`,
  `sha512: ${sha512}`,
  `releaseDate: ${new Date().toISOString()}`,
  "",
].join("\n");
await writeFile(resolve("out", "latest-mac.yml"), manifest, { mode: 0o644 });
