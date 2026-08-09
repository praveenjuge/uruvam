import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  CircleStop,
  Code2,
  ExternalLink,
  History,
  ImagePlus,
  MessageCircle,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelRightClose,
  Play,
  RotateCcw,
  Smartphone,
  Sun,
  X,
} from "lucide-react";
import type {
  ExtensionCatalog,
  ManagedProject,
  ModelOption,
  ProjectSnapshot,
  RunState,
} from "../../shared/contracts";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export function Workspace({ project }: { project: ManagedProject }) {
  const canvas = useRef<HTMLDivElement>(null);
  const initialDirectionStarted = useRef(false);
  const [left, setLeft] = useState(true);
  const [right, setRight] = useState(true);
  const [width, setWidth] = useState<390 | 1440>(1440);
  const [prompt, setPrompt] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [model, setModel] = useState("");
  const [run, setRun] = useState<RunState>();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [snapshot, setSnapshot] = useState<ProjectSnapshot>({
    screens: [],
    comments: [],
    directions: [],
  });
  const [tab, setTab] = useState<
    "conversation" | "comments" | "milestones" | "extensions"
  >("conversation");
  const [extensions, setExtensions] = useState<ExtensionCatalog>();
  const [anchor, setAnchor] = useState<{
    route: string;
    elementId?: string;
    fingerprint?: string;
    selector?: string;
    x: number;
    y: number;
  }>();
  const [comment, setComment] = useState("");
  const [previewError, setPreviewError] = useState("");
  const refresh = useCallback(async (): Promise<void> => {
    setSnapshot(await window.uruvam.projects.snapshot(project.id));
  }, [project.id]);
  useEffect(
    () =>
      window.uruvam.subscribe((event) => {
        const value = event as {
          type?: string;
          state?: RunState;
          anchor?: typeof anchor;
        };
        if (value.type === "run" && value.state?.projectId === project.id)
          setRun(value.state);
        if (value.type === "anchor" && value.anchor) {
          setAnchor(value.anchor);
          setTab("comments");
        }
      }),
    [project.id],
  );
  useEffect(() => {
    void window.uruvam.projects.snapshot(project.id).then(setSnapshot);
    void window.uruvam.preview
      .open(project.id)
      .catch((error: unknown) =>
        setPreviewError(
          error instanceof Error ? error.message : "Preview unavailable",
        ),
      );
  }, [project.id]);
  useEffect(() => {
    if (tab === "extensions" && !extensions)
      void window.uruvam.extensions
        .list(project.id)
        .then(setExtensions)
        .catch(() => undefined);
  }, [extensions, project.id, tab]);
  useEffect(() => {
    void window.uruvam.models
      .list()
      .then((items) => {
        setModels(items);
        setModel(
          items.find((item) => item.id === "opencode-go/deepseek-v4-flash")
            ?.id ??
            items.find((item) => item.compatible)?.id ??
            "",
        );
      })
      .catch(() => setModels([]));
  }, []);
  useEffect(() => {
    if (
      initialDirectionStarted.current ||
      !model ||
      !snapshot.productPrompt ||
      snapshot.directions.length !== 1 ||
      snapshot.recoverableRun ||
      snapshot.directions.some((item) => item.status === "draft")
    )
      return;
    initialDirectionStarted.current = true;
    void window.uruvam.generation
      .start(project.id, snapshot.productPrompt, model)
      .then(setRun);
  }, [model, project.id, snapshot]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const rect = entry.contentRect;
      const screen = new DOMRect(
        element.getBoundingClientRect().x +
          Math.max(0, (rect.width - Math.min(width, rect.width)) / 2),
        element.getBoundingClientRect().y + 48,
        Math.min(width, rect.width),
        Math.max(240, rect.height - 72),
      );
      void window.uruvam.preview.bounds({
        x: Math.round(screen.x),
        y: Math.round(screen.y),
        width: Math.round(screen.width),
        height: Math.round(screen.height),
      });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      void window.uruvam.preview.hide();
    };
  }, [width, left, right]);
  async function generate(): Promise<void> {
    if (!model || !prompt.trim()) return;
    setRun(await window.uruvam.generation.start(project.id, prompt, model));
    setPrompt("");
  }
  async function addVisualComment(): Promise<void> {
    if (!anchor || !comment.trim()) return;
    await window.uruvam.comments.create({
      projectId: project.id,
      route: anchor.route,
      state: "default",
      text: comment,
      anchor,
    });
    setComment("");
    setAnchor(undefined);
    await refresh();
  }
  async function direction(
    action: "accept" | "keep" | "reject" | "discard" | "undo",
    branch?: string,
  ): Promise<void> {
    setSnapshot(
      await window.uruvam.directions.action({
        projectId: project.id,
        action,
        ...(branch ? { branch } : {}),
        ...(action === "keep" ? { name: "Exploration" } : {}),
        ...(action === "reject"
          ? { feedback: "Revise this direction using the latest comments." }
          : {}),
      }),
    );
    if (action === "accept" || action === "undo")
      void window.uruvam.preview.open(project.id);
  }
  return (
    <main
      className={`workspace ${left ? "with-left" : ""} ${right ? "with-right" : ""}`}
    >
      <header className="toolbar">
        <div className="toolbar-side">
          <Button
            aria-label="Toggle screens"
            size="icon"
            variant="ghost"
            onClick={() => setLeft(!left)}
          >
            <PanelLeftClose />
          </Button>
          <strong>{project.name}</strong>
          <span className="status-dot" />{" "}
          <small>{run?.status ?? "Ready"}</small>
        </div>
        <div className="viewport-toggle">
          <Button
            size="sm"
            variant={width === 390 ? "secondary" : "ghost"}
            onClick={() => setWidth(390)}
          >
            <Smartphone />
            390
          </Button>
          <Button
            size="sm"
            variant={width === 1440 ? "secondary" : "ghost"}
            onClick={() => setWidth(1440)}
          >
            <Monitor />
            1440
          </Button>
        </div>
        <div className="toolbar-side end">
          <Button
            aria-label="Toggle theme"
            size="icon"
            variant="ghost"
            onClick={() => {
              const next = theme === "light" ? "dark" : "light";
              setTheme(next);
              document.documentElement.dataset.theme = next;
            }}
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>
          <Button
            aria-label="Toggle conversation"
            size="icon"
            variant="ghost"
            onClick={() => setRight(!right)}
          >
            <PanelRightClose />
          </Button>
        </div>
      </header>
      {left && (
        <aside className="left-rail">
          <p className="rail-title">Screens</p>
          {(snapshot.screens.length
            ? snapshot.screens
            : [{ id: "home", name: "Home", route: "/", states: ["default"] }]
          ).map((screen, index) => (
            <button
              className={`screen-row ${index === 0 ? "selected" : ""}`}
              key={screen.id}
            >
              <span className="screen-thumb" />
              <span>
                <strong>{screen.name}</strong>
                <small>
                  {screen.route} · {screen.states.length} states
                </small>
              </span>
            </button>
          ))}
          <p className="rail-title spaced">History</p>
          {snapshot.directions.slice(0, 5).map((item) => (
            <button
              className="history-row"
              key={`${item.branch}-${item.createdAt ?? "initial"}`}
            >
              <History />
              <span>
                <strong>{item.name}</strong>
                <small>{item.status}</small>
              </span>
            </button>
          ))}
          <div className="rail-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void window.uruvam.projects.reveal(project.id)}
            >
              <ExternalLink />
              Reveal in Finder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void window.uruvam.references.import(project.id)}
            >
              <ImagePlus /> Add reference
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void direction("undo")}
            >
              <RotateCcw /> Undo accepted direction
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void window.uruvam.projects.openEditor(project.id)}
            >
              <Code2 />
              Open in Editor
            </Button>
          </div>
        </aside>
      )}
      <section ref={canvas} className="canvas">
        <div className="canvas-label">
          <ChevronLeft /> Home · Default <ChevronRight />
        </div>
        {previewError && (
          <div className="preview-placeholder">
            <Play />
            <span>{previewError}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void window.uruvam.preview
                  .open(project.id)
                  .then(() => setPreviewError(""))
              }
            >
              Try again
            </Button>
          </div>
        )}
      </section>
      {right && (
        <aside className="right-rail">
          <div className="tabs">
            {(
              ["conversation", "comments", "milestones", "extensions"] as const
            ).map((item) => (
              <button
                className={tab === item ? "active" : ""}
                onClick={() => setTab(item)}
                key={item}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
          <div className="conversation">
            {tab === "conversation" && (
              <>
                <div className="agent-note">
                  <span className="brand-mark small">U</span>
                  <p>
                    <strong>First direction ready</strong>
                    <br />I assumed a clear primary action, calm neutral
                    palette, and responsive single-column mobile flow. Correct
                    any assumption below.
                  </p>
                </div>
                {run?.status === "complete" && run.branch && (
                  <div className="direction-actions">
                    <Button
                      size="sm"
                      onClick={() => void direction("accept", run.branch)}
                    >
                      <Check /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void direction("keep", run.branch)}
                    >
                      Keep direction
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void direction("reject", run.branch)}
                    >
                      <X /> Revise
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void direction("discard", run.branch)}
                    >
                      Discard
                    </Button>
                  </div>
                )}
              </>
            )}
            {run && (
              <div className="milestone">
                <span className={`status-dot ${run.status}`} />
                <p>
                  <strong>{run.milestone}</strong>
                  <br />
                  <small>
                    {run.repairsUsed}/3 repairs · {run.minutesUsed}/20 min
                  </small>
                </p>
              </div>
            )}
            {tab === "conversation" && (
              <div className="comment-tip">
                <MessageCircle />
                <span>
                  Option-click anything in the preview to leave precise visual
                  feedback.
                </span>
              </div>
            )}
            {tab === "comments" && (
              <div className="comment-list">
                {anchor && (
                  <div className="comment-editor">
                    <p>
                      <strong>
                        Comment on{" "}
                        {anchor.fingerprint ||
                          anchor.elementId ||
                          "this element"}
                      </strong>
                    </p>
                    <Textarea
                      placeholder="What should change?"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={!comment.trim()}
                      onClick={() => void addVisualComment()}
                    >
                      Add comment
                    </Button>
                  </div>
                )}
                {snapshot.comments.length === 0 && !anchor && (
                  <p className="empty-copy">
                    Option-click an element in the preview to start.
                  </p>
                )}
                {snapshot.comments.map((item) => (
                  <article className="saved-comment" key={item.id}>
                    <p>{item.text}</p>
                    <small>
                      {item.route} · {item.status}
                    </small>
                    {item.status === "open" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void window.uruvam.comments
                            .resolve(project.id, item.id, item.text)
                            .then(refresh)
                        }
                      >
                        Turn into decision
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            )}
            {tab === "milestones" && (
              <div className="milestone-list">
                <p>
                  <strong>
                    {run?.milestone ?? "Ready for a new direction"}
                  </strong>
                </p>
                <p className="empty-copy">
                  {run?.budgetRemaining
                    ? `${run.budgetRemaining.repairs} repairs and ${run.budgetRemaining.minutes} minutes remain`
                    : "Each direction has three repair passes and 20 minutes."}
                </p>
                {snapshot.recoverableRun && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRun(snapshot.recoverableRun)}
                  >
                    Review checkpoint
                  </Button>
                )}
              </div>
            )}
            {tab === "extensions" && (
              <div className="milestone-list">
                <p>
                  <strong>Project capabilities</strong>
                </p>
                <p className="empty-copy">
                  Skills shape how the agent works. Plugins and MCP connections
                  can run code, so changed versions wait for exact source and
                  checksum approval.
                </p>
                {!extensions && (
                  <p className="empty-copy">Reading the local catalog…</p>
                )}
                {extensions?.skills.map((item) => (
                  <div className="extension-row" key={item.id}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.description ?? "Project skill"}</small>
                    </span>
                    <small>Skill</small>
                  </div>
                ))}
                {extensions?.plugins.map((item) => (
                  <div className="extension-row" key={item.id}>
                    <span>
                      <strong>{item.id}</strong>
                      <small>OpenCode plugin</small>
                    </span>
                    <small>Plugin</small>
                  </div>
                ))}
                {extensions?.mcp.map((item) => (
                  <div className="extension-row" key={item.name}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.status}</small>
                    </span>
                    <small>MCP</small>
                  </div>
                ))}
                <p className="empty-copy">
                  {extensions?.trust.length ?? 0} executable additions approved
                  for this project.
                </p>
              </div>
            )}
          </div>
          <div className="composer">
            <select
              aria-label="Build model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            >
              {models.length === 0 && (
                <option value="">Go catalog unavailable</option>
              )}
              {models.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  disabled={!item.compatible}
                >
                  {item.name}
                  {item.compatible ? "" : ` — ${item.reason}`}
                </option>
              ))}
            </select>
            <Textarea
              placeholder="Describe the next direction…"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            {run?.status === "running" ? (
              <Button
                variant="outline"
                onClick={() => void window.uruvam.generation.stop(project.id)}
              >
                <CircleStop />
                Stop safely
              </Button>
            ) : (
              <Button
                disabled={!model || !prompt.trim()}
                onClick={() => void generate()}
              >
                Send direction <ChevronRight />
              </Button>
            )}
          </div>
        </aside>
      )}
    </main>
  );
}
