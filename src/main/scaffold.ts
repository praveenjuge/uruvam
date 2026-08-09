import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import type { CreateProjectInput } from "../shared/contracts";

const run = promisify(execFile);
const files = (input: CreateProjectInput): Record<string, string> => ({
  "package.json": JSON.stringify(
    {
      name: input.slug,
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: "vite --host 127.0.0.1",
        build: "tsc -b && vite build",
        lint: "eslint .",
        test: "vitest run",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@vitejs/plugin-react": "latest",
        "class-variance-authority": "latest",
        clsx: "latest",
        "lucide-react": "latest",
        react: "latest",
        "react-dom": "latest",
        "tailwind-merge": "latest",
      },
      devDependencies: {
        "@eslint/js": "latest",
        "@tailwindcss/vite": "latest",
        "@types/react": "latest",
        "@types/react-dom": "latest",
        eslint: "latest",
        "eslint-plugin-react-hooks": "latest",
        tailwindcss: "latest",
        typescript: "latest",
        "typescript-eslint": "latest",
        vite: "latest",
        vitest: "latest",
      },
    },
    null,
    2,
  ),
  "index.html":
    '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prototype</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
  "tsconfig.json": JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
      },
      include: ["src", "vite.config.ts"],
    },
    null,
    2,
  ),
  "vite.config.ts":
    'import react from "@vitejs/plugin-react";\nimport tailwindcss from "@tailwindcss/vite";\nimport { defineConfig } from "vite";\nexport default defineConfig({ plugins: [react(), tailwindcss()] });\n',
  "components.json": JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema.json",
      style: "new-york",
      rsc: false,
      tsx: true,
      tailwind: {
        css: "src/index.css",
        baseColor: "neutral",
        cssVariables: true,
      },
      aliases: {
        components: "@/components",
        utils: "@/lib/utils",
        ui: "@/components/ui",
        lib: "@/lib",
        hooks: "@/hooks",
      },
      iconLibrary: "lucide",
    },
    null,
    2,
  ),
  "src/main.tsx":
    'import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport { App } from "./App";\nimport "./index.css";\ncreateRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);\n',
  "src/vite-env.d.ts": '/// <reference types="vite/client" />\n',
  "src/App.tsx":
    'import { ArrowRight } from "lucide-react";\nimport { Button } from "./components/ui/button";\nexport function App() { return <main className="min-h-screen bg-background p-6 text-foreground"><section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col justify-between rounded-[2rem] border bg-card p-8 shadow-sm"><p className="text-sm font-medium text-muted-foreground">First direction</p><div><h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-7xl">A thoughtful start for your product.</h1><p className="mt-5 max-w-xl text-lg text-muted-foreground">Review the assumptions in Uruvam, then guide the agent with visual comments.</p></div><Button className="w-fit">Explore direction <ArrowRight /></Button></section></main>; }\n',
  "src/lib/utils.ts":
    'import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\nexport function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }\n',
  "src/components/ui/button.tsx":
    'import * as React from "react";\nimport { cva, type VariantProps } from "class-variance-authority";\nimport { cn } from "../../lib/utils";\nconst buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { default: "bg-primary text-primary-foreground hover:bg-primary/90", outline: "border bg-background hover:bg-accent" }, size: { default: "h-10 px-4 py-2", sm: "h-9 px-3" } }, defaultVariants: { variant: "default", size: "default" } });\nexport interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}\nexport const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />);\nButton.displayName = "Button";\n',
  "src/index.css":
    '@import "tailwindcss";\n:root { --background: oklch(0.985 0 0); --foreground: oklch(0.18 0 0); --card: oklch(1 0 0); --primary: oklch(0.2 0 0); --primary-foreground: oklch(0.98 0 0); --muted-foreground: oklch(0.5 0 0); --accent: oklch(0.95 0 0); --ring: oklch(0.5 0.15 260); }\n@media (prefers-color-scheme: dark) { :root { --background: oklch(0.14 0 0); --foreground: oklch(0.94 0 0); --card: oklch(0.19 0 0); --primary: oklch(0.92 0 0); --primary-foreground: oklch(0.18 0 0); --muted-foreground: oklch(0.7 0 0); --accent: oklch(0.25 0 0); } }\n@theme inline { --color-background: var(--background); --color-foreground: var(--foreground); --color-card: var(--card); --color-primary: var(--primary); --color-primary-foreground: var(--primary-foreground); --color-muted-foreground: var(--muted-foreground); --color-accent: var(--accent); --color-ring: var(--ring); }\n* { box-sizing: border-box; } body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; }\n',
  "src/app.test.ts":
    'import { describe, expect, it } from "vitest";\ndescribe("prototype", () => { it("has a first direction", () => expect("First direction").toBeTruthy()); });\n',
  "eslint.config.js":
    'import js from "@eslint/js";\nimport reactHooks from "eslint-plugin-react-hooks";\nimport tseslint from "typescript-eslint";\nexport default tseslint.config({ ignores: ["dist"] }, js.configs.recommended, ...tseslint.configs.recommended, { files: ["**/*.{ts,tsx}"], plugins: { "react-hooks": reactHooks }, rules: reactHooks.configs.flat.recommended.rules });\n',
  "DESIGN.md": `# ${input.name} design direction\n\n## Product intent\n\n${input.prompt}\n\n## Principles\n\n- Clear hierarchy before decoration.\n- Responsive at 390px and 1440px.\n- Keyboard-visible, accessible interactions.\n- Realistic empty, loading, error, success, and disabled states.\n`,
  "DECISIONS.md":
    "# Accepted design decisions\n\nDecisions promoted from resolved comments appear here.\n",
  "AGENTS.md":
    "# Project agent rules\n\nUse pnpm and source-owned shadcn components. Treat DESIGN.md as the visual contract. Run typecheck, lint, tests, and build before checkpoints. Never expose credentials or work outside this repository.\n",
  ".opencode/skills/uruvam-design/SKILL.md":
    "---\nname: uruvam-design\ndescription: Build and repair this visual prototype against DESIGN.md and Uruvam comments.\n---\n\nRead DESIGN.md and DECISIONS.md. Preserve source-owned shadcn components, responsive behavior, accessibility, and all declared states. Do not add a backend, deployment, telemetry, secrets, or code-view UI.\n",
  ".uruvam/project.json": JSON.stringify(
    {
      version: 1,
      productPrompt: input.prompt,
      screens: [
        {
          id: randomUUID(),
          name: "Home",
          route: "/",
          states: [
            "default",
            "loading",
            "empty",
            "error",
            "success",
            "disabled",
          ],
        },
      ],
      comments: [],
      directions: [
        { name: "First direction", branch: "main", status: "accepted" },
      ],
    },
    null,
    2,
  ),
  "opencode.json": JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      permissions: permissionRules,
    },
    null,
    2,
  ),
});

const permissionRules = [
  { action: "*", resource: "*", effect: "deny" },
  ...["read", "glob", "grep", "edit"].map((action) => ({
    action,
    resource: "*",
    effect: "allow",
  })),
  { action: "read", resource: "*.env", effect: "deny" },
  { action: "read", resource: "*.env.*", effect: "deny" },
  { action: "skill", resource: "uruvam-design", effect: "allow" },
  { action: "question", resource: "*", effect: "allow" },
  { action: "external_directory", resource: "*", effect: "ask" },
  ...[
    "pnpm install *",
    "pnpm typecheck",
    "pnpm lint",
    "pnpm test",
    "pnpm build",
    "git status *",
    "git diff *",
    "git add *",
    "git commit *",
  ].map((resource) => ({ action: "shell", resource, effect: "allow" })),
];

export async function scaffoldProject(
  root: string,
  input: CreateProjectInput,
): Promise<void> {
  await mkdir(root, { recursive: false, mode: 0o700 });
  for (const [relative, contents] of Object.entries(files(input))) {
    const path = `${root}/${relative}`;
    await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
    await writeFile(path, contents, { mode: 0o600 });
  }
  const env = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: root,
    CI: "1",
  };
  await run("pnpm", ["install", "--ignore-scripts"], {
    cwd: root,
    env,
    timeout: 180_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  await run("pnpm", ["build"], {
    cwd: root,
    env,
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  await run("git", ["init", "--initial-branch=main"], { cwd: root, env });
  await run("git", ["add", "."], { cwd: root, env });
  await run(
    "git",
    [
      "-c",
      "user.name=Uruvam",
      "-c",
      "user.email=local@uruvam.invalid",
      "commit",
      "-m",
      "chore: scaffold first direction",
    ],
    { cwd: root, env },
  );
}
