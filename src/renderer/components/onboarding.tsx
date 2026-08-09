import { useState } from "react";
import {
  ArrowRight,
  Check,
  KeyRound,
  Laptop,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Props {
  onComplete: () => void;
}
export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<"disclosure" | "credential">("disclosure");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      await window.uruvam.credential.store(key);
      setKey("");
      onComplete();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not store this credential",
      );
    } finally {
      setBusy(false);
    }
  }
  if (step === "credential")
    return (
      <main className="grid min-h-screen place-items-center p-8">
        <section className="w-full max-w-md">
          <KeyRound className="mb-8 size-9" />
          <p className="eyebrow">OpenCode Go</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Bring your design partner online
          </h1>
          <p className="mt-3 text-muted-foreground">
            Your Go key stays in macOS Keychain and is only shared with the
            local OpenCode v2 process while it works.
          </p>
          <label className="mt-8 block text-sm font-medium" htmlFor="go-key">
            Go API key
          </label>
          <Input
            id="go-key"
            className="mt-2"
            type="password"
            autoComplete="off"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
          <p
            aria-live="polite"
            className="mt-2 min-h-5 text-sm text-destructive"
          >
            {error}
          </p>
          <Button
            className="mt-4 w-full"
            disabled={busy || key.length < 16}
            onClick={() => void save()}
          >
            {busy ? "Validating…" : "Validate and continue"}
            <ArrowRight />
          </Button>
        </section>
      </main>
    );
  const items = [
    {
      icon: Laptop,
      title: "Your work stays here",
      body: "Projects, previews, comments, and every direction live on this Mac.",
    },
    {
      icon: Sparkles,
      title: "Uses your Go plan",
      body: "Generation requests use OpenCode Go and may consume your provider allowance.",
    },
    {
      icon: ShieldCheck,
      title: "You choose what can run",
      body: "Skills, plugins, and connections wait for your approval whenever they change.",
    },
    {
      icon: Check,
      title: "Every direction is remembered",
      body: "Local Git keeps the history. Uruvam does not sync, publish, or track you.",
    },
  ];
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <section className="w-full max-w-2xl">
        <div className="brand-mark">U</div>
        <p className="eyebrow mt-8">Welcome to Uruvam</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Shape real interfaces visually.
        </h1>
        <p className="mt-3 max-w-xl text-lg text-muted-foreground">
          A local, no-code workspace for directing high-fidelity shadcn
          prototypes with OpenCode Go.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {items.map(({ icon: Icon, title, body }) => (
            <article className="disclosure" key={title}>
              <Icon className="size-5" />
              <div>
                <h2 className="font-medium">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </article>
          ))}
        </div>
        <Button className="mt-8" onClick={() => setStep("credential")}>
          I understand <ArrowRight />
        </Button>
      </section>
    </main>
  );
}
