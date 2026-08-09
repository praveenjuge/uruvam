import { createHash } from "node:crypto";
import { copyFile, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

async function findArtifact(directory, suffix) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const found = await findArtifact(path, suffix);
      if (found) return found;
    } else if (entry.name.endsWith(suffix)) return path;
  }
}

const [nestedZip, nestedDmg] = await Promise.all([
  findArtifact(resolve("out", "make"), ".zip"),
  findArtifact(resolve("out", "make"), ".dmg"),
]);
if (!nestedZip || !nestedDmg)
  throw new Error("Expected one macOS ZIP and DMG under out/make");
const archive = resolve("out", basename(nestedZip));
await Promise.all([
  copyFile(nestedZip, archive),
  copyFile(nestedDmg, resolve("out", basename(nestedDmg))),
]);
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
