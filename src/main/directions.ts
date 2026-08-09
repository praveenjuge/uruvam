import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { shell } from "electron";
import type { z } from "zod";
import type { directionActionInput } from "../shared/contracts";
import { updateProjectState } from "./project-state";

const exec = promisify(execFile);
type Action = z.infer<typeof directionActionInput>;

async function git(root: string, args: string[]): Promise<string> {
  return (
    await exec("git", args, {
      cwd: root,
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    })
  ).stdout.trim();
}

function directionName(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "direction"
  );
}

export async function applyDirection(root: string, input: Action) {
  if (input.action === "undo") {
    const head = await git(root, ["rev-parse", "HEAD"]);
    const parent = await git(root, ["rev-parse", "HEAD^"]);
    if (!head || !parent) throw new Error("No accepted direction to undo");
    await git(root, ["revert", "--no-edit", head]);
    return updateProjectState(root, (state) => ({
      ...state,
      directions: [
        {
          name: "Undo",
          branch: "main",
          status: "accepted",
          createdAt: new Date().toISOString(),
        },
        ...state.directions,
      ],
    }));
  }
  if (!input.branch) throw new Error("Direction branch required");
  await git(root, ["show-ref", "--verify", `refs/heads/${input.branch}`]);
  let branch = input.branch;
  if (input.action === "accept")
    await git(root, ["merge", "--ff-only", input.branch]);
  if (input.action === "keep") {
    const next = `uruvam/direction/${directionName(input.name ?? "direction")}`;
    const listing = await git(root, ["worktree", "list", "--porcelain"]);
    const blocks = listing.split("\n\n");
    const worktree = blocks
      .find((block) => block.includes(`branch refs/heads/${input.branch}`))
      ?.match(/^worktree (.+)$/m)?.[1];
    await git(worktree ?? root, ["branch", "-m", input.branch, next]);
    branch = next;
  }
  if (input.action === "discard") {
    const listing = await git(root, ["worktree", "list", "--porcelain"]);
    const worktree = listing
      .split("\n\n")
      .find((block) => block.includes(`branch refs/heads/${input.branch}`))
      ?.match(/^worktree (.+)$/m)?.[1];
    if (worktree) {
      await shell.trashItem(worktree);
      await git(root, ["worktree", "prune"]);
    }
  }
  return updateProjectState(root, (state) => ({
    ...(state.productPrompt ? { productPrompt: state.productPrompt } : {}),
    screens: state.screens,
    comments: state.comments,
    directions: [
      {
        name:
          input.name ??
          (input.action === "accept"
            ? "Accepted direction"
            : "Design direction"),
        branch,
        status:
          input.action === "accept"
            ? "accepted"
            : input.action === "keep"
              ? "kept"
              : input.action === "reject"
                ? "rejected"
                : "discarded",
        ...(input.feedback ? { feedback: input.feedback } : {}),
        createdAt: new Date().toISOString(),
      },
      ...state.directions.filter((item) => item.branch !== input.branch),
    ],
  }));
}
