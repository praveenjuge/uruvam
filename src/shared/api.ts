import type {
  ExtensionCatalog,
  ManagedProject,
  ModelOption,
  ProjectSnapshot,
  RunState,
} from "./contracts";

export interface Bootstrap {
  onboarded: boolean;
  credentialStored: boolean;
  projects: ManagedProject[];
  theme: "system" | "light" | "dark";
}
export interface UruvamApi {
  bootstrap(): Promise<Bootstrap>;
  credential: {
    store(value: string): Promise<void>;
    status(): Promise<boolean>;
  };
  projects: {
    list(): Promise<ManagedProject[]>;
    create(input: {
      name: string;
      slug: string;
      prompt: string;
    }): Promise<ManagedProject>;
    reveal(projectId: string): Promise<void>;
    openEditor(projectId: string): Promise<void>;
    snapshot(projectId: string): Promise<ProjectSnapshot>;
  };
  references: {
    import(projectId: string): Promise<{ name: string } | undefined>;
  };
  models: { list(): Promise<ModelOption[]> };
  generation: {
    start(projectId: string, prompt: string, model: string): Promise<RunState>;
    stop(projectId: string): Promise<void>;
  };
  preview: {
    open(projectId: string): Promise<{ url: string }>;
    bounds(bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    }): Promise<void>;
    hide(): Promise<void>;
  };
  comments: {
    create(input: unknown): Promise<{ id: string }>;
    resolve(
      projectId: string,
      commentId: string,
      decision: string,
    ): Promise<void>;
  };
  directions: {
    action(input: unknown): Promise<ProjectSnapshot>;
  };
  extensions: {
    list(projectId: string): Promise<ExtensionCatalog>;
    trust(input: unknown): Promise<void>;
  };
  subscribe(listener: (event: unknown) => void): () => void;
}

declare global {
  interface Window {
    uruvam: UruvamApi;
  }
}
