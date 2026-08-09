import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "vendor/opencode2");
const version = "0.0.0-next-17055";
const expectedDigest =
  "fb54a79ce936b0186602ff15141b1d70280fe0c565d4b81a931c2c0a01b16734";
const source = resolve(
  root,
  "node_modules/@opencode-ai/cli-darwin-arm64/bin/opencode2",
);
const clientPackage = JSON.parse(
  await readFile(
    resolve(root, "node_modules/@opencode-ai/client/package.json"),
    "utf8",
  ),
);
if (clientPackage.version !== version)
  throw new Error(`OpenCode client mismatch: ${clientPackage.version}`);
const reported = execFileSync(source, ["--version"], {
  encoding: "utf8",
}).trim();
if (!reported.includes(version))
  throw new Error(`OpenCode binary mismatch: ${reported}`);
await mkdir(dirname(output), { recursive: true });
await copyFile(source, output);
await chmod(output, 0o755);
const digest = createHash("sha256")
  .update(await readFile(output))
  .digest("hex");
if (digest !== expectedDigest)
  throw new Error(`OpenCode binary checksum mismatch: ${digest}`);
await writeFile(`${output}.sha256`, `${digest}  opencode2\n`, { mode: 0o644 });
