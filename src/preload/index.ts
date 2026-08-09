import { contextBridge, ipcRenderer } from "electron";
import { channels } from "../shared/channels";
import type { UruvamApi } from "../shared/api";

const api: UruvamApi = {
  bootstrap: () => ipcRenderer.invoke(channels.bootstrap),
  credential: {
    store: (value) => ipcRenderer.invoke(channels.credentialStore, { value }),
    status: () => ipcRenderer.invoke(channels.credentialStatus),
  },
  projects: {
    list: () => ipcRenderer.invoke(channels.projectsList),
    create: (input) => ipcRenderer.invoke(channels.projectCreate, input),
    reveal: (projectId) =>
      ipcRenderer.invoke(channels.projectReveal, { projectId }),
    openEditor: (projectId) =>
      ipcRenderer.invoke(channels.projectEditor, { projectId }),
    snapshot: (projectId) =>
      ipcRenderer.invoke(channels.projectSnapshot, { projectId }),
  },
  references: {
    import: (projectId) =>
      ipcRenderer.invoke(channels.referenceImport, { projectId }),
  },
  models: { list: () => ipcRenderer.invoke(channels.modelsList) },
  generation: {
    start: (projectId, prompt, model) =>
      ipcRenderer.invoke(channels.generate, { projectId, prompt, model }),
    stop: (projectId) => ipcRenderer.invoke(channels.stop, { projectId }),
  },
  preview: {
    open: (projectId) =>
      ipcRenderer.invoke(channels.previewOpen, { projectId }),
    bounds: (bounds) => ipcRenderer.invoke(channels.previewBounds, bounds),
    hide: () => ipcRenderer.invoke(channels.previewHide),
  },
  comments: {
    create: (input) => ipcRenderer.invoke(channels.commentCreate, input),
    resolve: (projectId, commentId, decision) =>
      ipcRenderer.invoke(channels.commentResolve, {
        projectId,
        commentId,
        decision,
      }),
  },
  directions: {
    action: (input) => ipcRenderer.invoke(channels.directionAction, input),
  },
  extensions: {
    list: (projectId) =>
      ipcRenderer.invoke(channels.extensionList, { projectId }),
    trust: (input) => ipcRenderer.invoke(channels.extensionTrust, input),
  },
  subscribe: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, value: unknown) =>
      listener(value);
    ipcRenderer.on(channels.event, handler);
    return () => ipcRenderer.removeListener(channels.event, handler);
  },
};
contextBridge.exposeInMainWorld("uruvam", Object.freeze(api));
