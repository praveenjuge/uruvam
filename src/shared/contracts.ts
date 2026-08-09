import { z } from "zod";
export { channels } from "./channels";

export const identifier = z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/);
export const projectId = z.uuid();
export const absolutePath = z
  .string()
  .min(1)
  .refine((value) => value.startsWith("/"), "Absolute path required");
export const httpPreviewUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "http:" && url.hostname === "127.0.0.1";
}, "Only loopback previews are allowed");

export const createProjectInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    slug: identifier,
    prompt: z.string().trim().min(8).max(20_000),
  })
  .strict();
export const importReferenceInput = z
  .object({ projectId, sourcePath: absolutePath })
  .strict();
export const projectActionInput = z.object({ projectId }).strict();
export const previewBoundsInput = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    width: z.number().int().min(320).max(2560),
    height: z.number().int().min(240).max(1600),
  })
  .strict();
export const previewOpenInput = z.object({ url: httpPreviewUrl }).strict();
export const credentialInput = z
  .object({ value: z.string().min(16).max(4096) })
  .strict();
export const generationInput = z
  .object({
    projectId,
    prompt: z.string().trim().min(3).max(20_000),
    model: z.string().min(3).max(200),
  })
  .strict();
export const commentInput = z
  .object({
    projectId,
    route: z.string().max(500),
    state: z.string().max(100),
    text: z.string().trim().min(1).max(4000),
    anchor: z
      .object({
        elementId: z.string().max(200).optional(),
        fingerprint: z.string().max(500).optional(),
        selector: z.string().max(500).optional(),
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
      })
      .strict(),
  })
  .strict();
export const commentResolveInput = z
  .object({
    projectId,
    commentId: z.uuid(),
    decision: z.string().trim().min(1).max(1000),
  })
  .strict();
export const directionActionInput = z
  .object({
    projectId,
    branch: z
      .string()
      .regex(/^uruvam\/(?:run|direction)\/[a-zA-Z0-9._/-]+$/)
      .optional(),
    action: z.enum(["accept", "keep", "reject", "discard", "undo"]),
    name: z.string().trim().min(1).max(80).optional(),
    feedback: z.string().trim().max(2000).optional(),
  })
  .strict();
export const extensionTrustInput = z
  .object({
    projectId,
    kind: z.enum(["skill", "plugin", "mcp"]),
    source: z.url(),
    version: z.string().min(1).max(100),
    checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectInput>;
export type GenerationInput = z.infer<typeof generationInput>;

export interface ManagedProject {
  id: string;
  name: string;
  slug: string;
  root: string;
  createdAt: string;
  updatedAt: string;
  status: "ready" | "creating" | "recoverable";
}
export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  compatible: boolean;
  reason?: string;
}
export interface RunState {
  projectId: string;
  status: "idle" | "queued" | "running" | "stopped" | "failed" | "complete";
  prompt?: string;
  startedAt?: string;
  repairsUsed: number;
  minutesUsed: number;
  milestone: string;
  branch?: string;
  queueDepth?: number;
  budgetRemaining?: { repairs: number; minutes: number };
}

export interface ScreenState {
  id: string;
  name: string;
  route: string;
  states: string[];
}
export interface VisualComment {
  id: string;
  route: string;
  state: string;
  text: string;
  status: "open" | "resolved";
  decision?: string;
  anchor: {
    elementId?: string;
    fingerprint?: string;
    selector?: string;
    x: number;
    y: number;
  };
  createdAt: string;
}
export interface Direction {
  name: string;
  branch: string;
  status: "draft" | "accepted" | "kept" | "rejected" | "discarded";
  feedback?: string;
  createdAt?: string;
}
export interface ProjectSnapshot {
  productPrompt?: string;
  screens: ScreenState[];
  comments: VisualComment[];
  directions: Direction[];
  recoverableRun?: RunState;
}
export interface ExtensionCatalog {
  skills: Array<{ id: string; name: string; description?: string }>;
  plugins: Array<{ id: string }>;
  mcp: Array<{ name: string; status: string }>;
  trust: Array<{
    id: string;
    kind: "skill" | "plugin" | "mcp";
    source: string;
    version: string;
    checksum: string;
    approvedAt: string;
  }>;
}
