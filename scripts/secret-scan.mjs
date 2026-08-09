import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);
const suspicious = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /GOOGLE_GENERATIVE_AI_API_KEY\s*=\s*[^$\s{]/,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
];
for (const file of files) {
  const text = await readFile(file, "utf8").catch(() => "");
  if (suspicious.some((pattern) => pattern.test(text)))
    throw new Error(`Possible secret in ${file}`);
}
