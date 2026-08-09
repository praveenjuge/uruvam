---
name: test-uruvam
description: Test and validate the Uruvam Electron desktop app, its OpenCode Go integration, generated shadcn projects, security boundaries, visual quality gates, Git recovery, and release artifacts. Use for Uruvam test runs, bug verification, release readiness, AI-agent testing, smoke tests, end-to-end checks, or validation of changes in this repository.
---

# Test Uruvam

## Test contract

Treat the application as hostile-input software with access to local files, credentials, subprocesses, extensions, and generated web content. Never weaken a failing check to obtain a pass.

Never print, log, persist, commit, screenshot, or transmit a credential. On macOS, obtain the test Go key only through the Keychain service `com.uruvam.opencode-go`; keep it in one process environment and unset it after the run.

Read `references/test-matrix.md` before planning a full, integration, security, or release test. For a narrow regression, run the smallest relevant checks plus adjacent security boundaries.

Read `references/real-world-findings.md` before packaged or live-provider work, and append concise dated findings after the real harness proves a new canonical behavior or failure mode.

## Workflow

1. Inspect `git status --short`, the current diff, `package.json`, lockfile, Electron configuration, and available test scripts.
2. Refuse to proceed if the worktree contains unexplained overlapping changes or if a requested destructive test lacks an isolated disposable directory.
3. Run `pnpm quality` from the repository root for deterministic checks.
4. Create all test projects under a fresh `mktemp -d` directory. Never use a real user project or broad directory.
5. Exercise Electron through the repository's supported E2E harness. Keep the real renderer sandbox, IPC validation, and OpenCode process boundary enabled.
6. For live Go integration, retrieve the Keychain credential inside the test process. If it is unavailable, mark live-provider coverage blocked; do not substitute or request a plaintext file.
7. Test one minimal live generation request and stop after proving catalog retrieval, streaming, tool execution, preview generation, interruption, and secret redaction. Avoid unnecessary provider usage.
8. Capture screenshots for visual assertions at the app-shell viewport plus generated-project widths of 390px and 1440px.
9. Report exact commands, pass/fail/blocked counts, artifact paths, tested commit, OpenCode binary/client versions, model used, and redacted evidence.
10. Move disposable test projects to Trash after explicit test cleanup approval; otherwise leave their exact paths for review.

## Canonical full validation

Run these commands in order from the repository root:

1. `pnpm quality`
2. `pnpm test:e2e`
3. `pnpm package`
4. `pnpm test:packaged`
5. `pnpm test:live` when the Keychain test credential is available; this bundles the pinned v2 client through the same Vite contract used by the app

If a proved DeepSeek turn needs a bounded visual repair without spending another full scaffold generation, run `pnpm test:live:vision <exact-disposable-project-path>`. It re-runs deterministic 390px/1440px gates, uses MiniMax M3 for severity-based review, and sends only blocking findings through the bounded DeepSeek repair path.

The packaged test connects over Chromium DevTools Protocol. Do not re-enable Electron Node inspector arguments: the production fuse must remain disabled.

## Required invariants

- No renderer receives Node primitives, filesystem handles, raw IPC, or credentials.
- Preview content cannot navigate the app shell, open arbitrary windows, or invoke privileged actions.
- Every IPC, file, URL, upload, extension, MCP, and subprocess input is schema-validated.
- The Go key never appears in Git, logs, snapshots, screenshots, errors, or child arguments.
- One project has at most one writer; queued requests do not mutate concurrently.
- Failed, stopped, or crashed runs preserve a recoverable Git checkpoint and never silently modify main.
- Serious accessibility failures block completion.
- Uruvam shows no source code, raw diff, terminal, or file tree.
- Offline review performs no provider request, and queued work does not auto-submit on reconnection.
- New projects contain source-owned shadcn components and a pnpm lockfile.

Do not claim the app works from unit tests alone. A release-ready result requires packaged-app smoke coverage and one bounded live OpenCode Go flow.
