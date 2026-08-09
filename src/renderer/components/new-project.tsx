import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ManagedProject } from "../../shared/contracts";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

export function NewProject({
  onCreated,
}: {
  onCreated: (project: ManagedProject) => void;
}) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const slug = useMemo(
    () =>
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 63),
    [name],
  );
  async function create(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      onCreated(await window.uruvam.projects.create({ name, slug, prompt }));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Project setup failed",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <section className="w-full max-w-2xl">
        <p className="eyebrow">New project</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          What should we shape?
        </h1>
        <p className="mt-3 text-muted-foreground">
          Describe the product, audience, and feeling. Uruvam will turn that
          into a working first direction you can guide visually.
        </p>
        <label className="mt-8 block text-sm font-medium" htmlFor="name">
          Project name
        </label>
        <Input
          id="name"
          className="mt-2"
          placeholder="Northstar workspace"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label className="mt-6 block text-sm font-medium" htmlFor="prompt">
          Product direction
        </label>
        <Textarea
          id="prompt"
          className="mt-2 min-h-36"
          placeholder="Design a calm operations dashboard for…"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <p className="mt-4 text-sm text-muted-foreground">
          You can add imagery, type, and written references after the first
          direction opens.
        </p>
        <p aria-live="polite" className="mt-3 min-h-5 text-sm text-destructive">
          {error}
        </p>
        <Button
          className="mt-2"
          disabled={busy || slug.length === 0 || prompt.trim().length < 8}
          onClick={() => void create()}
        >
          {busy ? "Preparing your canvas…" : "Create first direction"}
          <ArrowRight />
        </Button>
      </section>
    </main>
  );
}
