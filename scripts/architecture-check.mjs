import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
const roots = ["src", "tests", "scripts"];
const files = [];
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const next = join(path, entry.name);
    entry.isDirectory() ? await walk(next) : files.push(next);
  }
}
for (const root of roots) await walk(root).catch(() => {});
for (const file of files.filter((path) =>
  [".ts", ".tsx", ".mjs"].includes(extname(path)),
)) {
  const lines = (await readFile(file, "utf8")).split("\n").length;
  if (lines > 750) throw new Error(`${file} exceeds 750 lines (${lines})`);
}
