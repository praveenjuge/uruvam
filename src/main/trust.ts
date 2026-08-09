import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface TrustRecord {
  id: string;
  kind: "skill" | "plugin" | "mcp";
  source: string;
  version: string;
  checksum: string;
  approvedAt: string;
}
export async function addTrust(
  projectRoot: string,
  record: Omit<TrustRecord, "id" | "approvedAt">,
): Promise<void> {
  if (new URL(record.source).protocol !== "https:")
    throw new Error("Extension sources must use HTTPS");
  const path = resolve(projectRoot, ".uruvam", "trust.json");
  let records: TrustRecord[] = [];
  try {
    records = JSON.parse(await readFile(path, "utf8")) as TrustRecord[];
  } catch {
    /* new trust store */
  }
  const next = records.filter(
    (item) => !(item.kind === record.kind && item.source === record.source),
  );
  next.push({
    ...record,
    id: randomUUID(),
    approvedAt: new Date().toISOString(),
  });
  await mkdir(resolve(projectRoot, ".uruvam"), { recursive: true });
  await writeFile(path, JSON.stringify(next, null, 2), { mode: 0o600 });
}
export async function listTrust(projectRoot: string): Promise<TrustRecord[]> {
  try {
    return JSON.parse(
      await readFile(resolve(projectRoot, ".uruvam", "trust.json"), "utf8"),
    ) as TrustRecord[];
  } catch {
    return [];
  }
}
