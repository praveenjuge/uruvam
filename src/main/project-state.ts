import { randomUUID } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ProjectSnapshot } from "../shared/contracts";

const empty: ProjectSnapshot = { screens: [], comments: [], directions: [] };

export async function readProjectState(root: string): Promise<ProjectSnapshot> {
  const value = JSON.parse(
    await readFile(resolve(root, ".uruvam", "project.json"), "utf8"),
  ) as Partial<ProjectSnapshot> & { prompt?: string };
  return {
    ...((value.productPrompt ?? value.prompt)
      ? { productPrompt: value.productPrompt ?? value.prompt }
      : {}),
    screens: Array.isArray(value.screens) ? value.screens : [],
    comments: Array.isArray(value.comments) ? value.comments : [],
    directions: Array.isArray(value.directions) ? value.directions : [],
    ...(value.recoverableRun ? { recoverableRun: value.recoverableRun } : {}),
  };
}

export async function writeProjectState(
  root: string,
  state: ProjectSnapshot,
): Promise<void> {
  const path = resolve(root, ".uruvam", "project.json");
  const temp = `${path}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify({ version: 1, ...state }, null, 2), {
    mode: 0o600,
  });
  await rename(temp, path);
}

export async function updateProjectState(
  root: string,
  update: (state: ProjectSnapshot) => ProjectSnapshot,
): Promise<ProjectSnapshot> {
  let current = empty;
  try {
    current = await readProjectState(root);
  } catch {
    /* scaffold creates it before use */
  }
  const next = update(current);
  await writeProjectState(root, next);
  return next;
}
