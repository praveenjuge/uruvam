import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { app } from "electron";
import type { CreateProjectInput, ManagedProject } from "../shared/contracts";
import { managedRoot, safeChild } from "./paths";
import { scaffoldProject } from "./scaffold";

function indexPath(): string {
  return resolve(app.getPath("userData"), "projects.json");
}
async function writeIndex(projects: ManagedProject[]): Promise<void> {
  const path = indexPath();
  const temp = `${path}.${randomUUID()}.tmp`;
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(temp, JSON.stringify({ version: 1, projects }, null, 2), {
    mode: 0o600,
  });
  await rename(temp, path);
}
export async function listProjects(): Promise<ManagedProject[]> {
  try {
    const value = JSON.parse(await readFile(indexPath(), "utf8")) as {
      projects?: ManagedProject[];
    };
    return value.projects ?? [];
  } catch {
    return [];
  }
}
export async function getProject(id: string): Promise<ManagedProject> {
  const project = (await listProjects()).find((item) => item.id === id);
  if (!project) throw new Error("Project not found");
  return project;
}
export async function createProject(
  input: CreateProjectInput,
): Promise<ManagedProject> {
  const root = managedRoot();
  await mkdir(root, { recursive: true, mode: 0o700 });
  const destination = safeChild(root, input.slug);
  try {
    await readFile(resolve(destination, "package.json"));
    throw new Error("Project already exists");
  } catch (error) {
    if (error instanceof Error && error.message === "Project already exists")
      throw error;
  }
  const staging = safeChild(root, `.staging-${randomUUID()}`);
  await scaffoldProject(staging, input);
  await rename(staging, destination);
  const now = new Date().toISOString();
  const project: ManagedProject = {
    id: randomUUID(),
    name: input.name,
    slug: input.slug,
    root: destination,
    createdAt: now,
    updatedAt: now,
    status: "ready",
  };
  const projects = await listProjects();
  await writeIndex([...projects, project]);
  return project;
}
