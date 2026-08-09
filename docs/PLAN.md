# Uruvam product and implementation plan

## Product contract

Uruvam is an MIT-licensed, visual-first Electron app for designer-developers to create high-fidelity product UI systems with OpenCode Go. Runnable Vite/React/TypeScript projects are canonical, but Uruvam exposes no source editor or terminal. Canvas actions create comments; the agent performs code changes.

The first public alpha supports Apple Silicon macOS only, OpenCode Go only, new projects only, and local high-fidelity frontend prototypes. It excludes accounts, collaboration, cloud sync, export, deployment, Figma/PDF/URL import, backend generation, and non-Mac platforms.

Every generated project uses pnpm and source-owned shadcn components. New projects resolve the latest shadcn stack through a compatibility preflight; existing lockfiles are never silently upgraded.

## Desktop architecture

- Use Electron Forge, Vite, React, TypeScript, pnpm, and shadcn.
- Split Electron main, a sandboxed renderer, and a minimal typed preload bridge. Validate inputs at both IPC ends.
- Enforce context isolation, renderer sandboxing, no Node integration, restrictive CSP, sender validation, blocked navigation, and allowlisted external links.
- Render generated apps in a separate sandboxed WebContentsView with no Node access.
- Bundle a checksum-verified Apple Silicon `opencode2` binary and the exactly matching generated TypeScript client. Start a loopback-only server on an ephemeral port; only the main process may call it.
- Pin and contract-test OpenCode v2 upgrades. Do not build a parallel agent loop or compatibility shim.
- Store the Go key through asynchronous Electron safeStorage/macOS Keychain, inject it only into the OpenCode child, and redact it everywhere.
- Fetch the complete live Go model catalog. Show all models and disable models that lack required image or tool capabilities for design runs.

## Managed project model

Managed Git repositories live below Uruvam's Application Support directory. The UI provides Reveal in Finder and Open in Editor, but no export or publishing flow. Local Git is the only backup mechanism.

Each repository contains standard Vite/React source, `components.json`, copied shadcn components, a pnpm lockfile, canonical `DESIGN.md`, a concise decision log, screen/comment/reference metadata, project-scoped OpenCode configuration, an inspectable Uruvam design skill, and `AGENTS.md`.

References accept validated PNG, JPEG, WebP, sanitized SVG, local fonts, plain text, and Markdown only. Reject malformed binaries, executable uploads, unsafe SVG, path traversal, symlink escapes, and oversized input. Licensed placeholder assets must be copied locally with source, author, licence, retrieval date, and replacement intent.

## Design workflow

1. Onboard with local-execution, Go-usage, extension-trust, managed-storage, and no-cloud-backup disclosures.
2. Validate and store the Go credential; fetch the model catalog.
3. Accept a product prompt and optional local visual kit.
4. Scaffold the latest shadcn Vite template in isolation, resolve dependencies, create a lockfile, build, then atomically promote it into the library. Never overwrite an existing project.
5. Generate an immediate first direction, then show its assumptions for correction.
6. Build realistic routes, navigation, forms, validation, loading, empty, error, success, disabled, and responsive states without a backend.
7. Validate every direction at 390px and 1440px, adding intermediate widths when behavior changes.

The workspace uses a compact native-Mac interface: screens/history on a collapsible left rail, one live route/state in the center, and conversation/comments/milestones on a collapsible right rail. It supports system light/dark with manual override. It never renders source, raw diffs, a terminal, or a file tree.

Comments anchor through route/state, a stable element identifier when available, accessibility/text fingerprints, selector fallback, and viewport position. Relevant resolved comments become concise accepted design decisions.

## Git directions and agent execution

- Permit one writing agent per project; queue later requests while preserving read-only review.
- Run each request in an isolated Git worktree and `uruvam/run/*` branch.
- Create semantic checkpoints after valid milestones.
- Let users accept into the current direction, keep a named `uruvam/direction/*` branch, reject with feedback, or explicitly discard.
- Keep main unchanged until acceptance. Move explicitly discarded worktrees to Trash and retain recoverable branches until explicit purge.
- Automatically allow ordinary reads, edits, approved pnpm commands, preview checks, and Git checkpoints inside the active worktree.
- Deny destructive/system commands and credential reads. Ask for external directories, commands outside the development allowlist, non-allowlisted network access, extension installation, or another repository.
- Expose full OpenCode skills, plugins, and MCP management. Trust executable extensions by exact source, version, and checksum; require reapproval when any changes.

## Quality gate

Every candidate must install from its lockfile; pass typecheck, lint, tests, and production build; start without console errors or required-resource failures; exercise declared routes/states; capture 390px and 1440px screenshots; check overflow, focus, keyboard, contrast, and accessibility; block serious accessibility violations; receive screenshot inspection against `DESIGN.md`; and repair failures before rerunning affected gates.

Default budget: initial generation plus three repair passes and a 20-minute ceiling. Show usage and remaining budget, pause before exceeding either, and preserve the latest valid checkpoint on Stop.

Offline mode supports project opening, local previews, screens, history, comments, branches, principles, decisions, and external-editor access. Model requests remain queued and never auto-submit after reconnection.

Crash recovery preserves Git/worktree state, restarts the pinned server, rehydrates recoverable session state, and offers Resume, Review checkpoint, or Discard without automatically resuming mutation.

No telemetry or diagnostic data is transmitted. Logs remain local, rotated, structured, and secret-redacted.

## Delivery sequence

1. Secure Electron foundation, Keychain, managed-project index, logging, theming, and Apple Silicon packaging.
2. Latest-shadcn project lifecycle, reference validation, pnpm runtime, Git setup, and offline preview.
3. Pinned OpenCode server/client, Go onboarding, catalog capability gating, milestones, permissions, queueing, budgets, and interruption.
4. Screen navigator, viewport controls, preview inspection, comments, decisions, directions, and acceptance.
5. Render-inspect-repair quality gate plus skills/plugins/MCP trust management.
6. Signed and notarized public-alpha release through GitHub Releases with checksums, SBOM, provenance, automatic signed updates, security policy, contribution guide, and third-party notices.

## Release acceptance

Test valid/invalid/revoked credentials; compatible/incompatible models; offline reopening; failed latest-shadcn preflight; responsive multi-screen generation; accessibility repair; comment re-anchoring; accept/reject/direction/undo; crash and interruption recovery; queued requests; malicious uploads and previews; path/symlink escape; unsafe MCP/plugin activation; Keychain denial; signed update/rollback; binary-client mismatch; and absence of telemetry or credential leakage.

Uruvam is the fixed name. Trademark clearance remains the founder's responsibility.
