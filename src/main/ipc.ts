import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import type { OpenDialogOptions } from "electron";
import type { ZodType } from "zod";
import {
  channels,
  commentInput,
  commentResolveInput,
  createProjectInput,
  credentialInput,
  extensionTrustInput,
  directionActionInput,
  generationInput,
  previewBoundsInput,
  projectActionInput,
} from "../shared/contracts";
import { addComment, resolveComment } from "./comments";
import { applyDirection } from "./directions";
import { hasCredential, storeCredential } from "./credentials";
import { OpenCodeManager } from "./opencode";
import { PreviewHost } from "./preview";
import { createProject, getProject, listProjects } from "./projects";
import { importReference } from "./references";
import { readProjectState } from "./project-state";
import { addTrust } from "./trust";

function register<T>(
  channel: string,
  schema: ZodType<T> | undefined,
  handler: (value: T) => unknown,
): void {
  ipcMain.handle(channel, async (event, raw) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    if (
      !owner ||
      owner.isDestroyed() ||
      event.senderFrame !== event.sender.mainFrame
    )
      throw new Error("Untrusted IPC sender");
    return handler(schema ? schema.parse(raw) : (undefined as T));
  });
}
export function registerIpc(
  preview: PreviewHost,
  opencode: OpenCodeManager,
): void {
  register(channels.bootstrap, undefined, async () => ({
    onboarded: false,
    credentialStored: await hasCredential(),
    projects: await listProjects(),
    theme: "system" as const,
  }));
  register(channels.credentialStore, credentialInput, async ({ value }) => {
    await opencode.validateCredential(value);
    await storeCredential(value);
  });
  register(channels.credentialStatus, undefined, hasCredential);
  register(channels.projectsList, undefined, listProjects);
  register(channels.projectCreate, createProjectInput, createProject);
  register(channels.projectReveal, projectActionInput, async ({ projectId }) =>
    shell.showItemInFolder((await getProject(projectId)).root),
  );
  register(
    channels.projectEditor,
    projectActionInput,
    async ({ projectId }) => {
      const result = await shell.openPath((await getProject(projectId)).root);
      if (result) throw new Error(result);
    },
  );
  register(
    channels.projectSnapshot,
    projectActionInput,
    async ({ projectId }) =>
      readProjectState((await getProject(projectId)).root),
  );
  register(
    channels.referenceImport,
    projectActionInput,
    async ({ projectId }) => {
      const options: OpenDialogOptions = {
        title: "Choose a visual reference",
        properties: ["openFile"],
        filters: [
          {
            name: "Visual kits",
            extensions: [
              "png",
              "jpg",
              "jpeg",
              "webp",
              "svg",
              "txt",
              "md",
              "woff",
              "woff2",
              "ttf",
              "otf",
            ],
          },
        ],
      };
      const owner = BrowserWindow.getFocusedWindow();
      const result = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options);
      const source = result.filePaths[0];
      return source
        ? importReference((await getProject(projectId)).root, source)
        : undefined;
    },
  );
  register(channels.modelsList, projectActionInput.optional(), async (value) =>
    opencode.models(value?.projectId),
  );
  register(channels.generate, generationInput, ({ projectId, prompt, model }) =>
    opencode.start(projectId, prompt, model),
  );
  register(channels.stop, projectActionInput, ({ projectId }) =>
    opencode.stop(projectId),
  );
  register(channels.previewOpen, projectActionInput, async ({ projectId }) =>
    preview.openProject((await getProject(projectId)).root),
  );
  register(channels.previewBounds, previewBoundsInput, (bounds) =>
    preview.bounds(bounds),
  );
  register(channels.previewHide, undefined, () => preview.hide());
  register(channels.commentCreate, commentInput, async (input) =>
    addComment((await getProject(input.projectId)).root, input),
  );
  register(channels.commentResolve, commentResolveInput, async (input) =>
    resolveComment(
      (await getProject(input.projectId)).root,
      input.commentId,
      input.decision,
    ),
  );
  register(channels.directionAction, directionActionInput, async (input) =>
    applyDirection((await getProject(input.projectId)).root, input),
  );
  register(channels.extensionTrust, extensionTrustInput, async (input) =>
    addTrust((await getProject(input.projectId)).root, input),
  );
  register(channels.extensionList, projectActionInput, ({ projectId }) =>
    opencode.extensions(projectId),
  );
}
