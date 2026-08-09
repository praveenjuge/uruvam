import { randomUUID } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { updateProjectState } from "./project-state";

export async function addComment(
  projectRoot: string,
  comment: unknown,
): Promise<{ id: string }> {
  const id = randomUUID();
  await updateProjectState(projectRoot, (metadata) => ({
    ...metadata,
    comments: [
      ...metadata.comments,
      {
        ...(comment as object),
        id,
        status: "open",
        createdAt: new Date().toISOString(),
      } as never,
    ],
  }));
  return { id };
}

export async function resolveComment(
  projectRoot: string,
  commentId: string,
  decision: string,
): Promise<void> {
  await updateProjectState(projectRoot, (state) => ({
    ...state,
    comments: state.comments.map((comment) => {
      if (comment.id !== commentId) return comment;
      return { ...comment, status: "resolved", decision };
    }),
  }));
  await appendFile(
    resolve(projectRoot, "DECISIONS.md"),
    `\n- ${decision.replaceAll("\n", " ")}\n`,
    { mode: 0o600 },
  );
}
