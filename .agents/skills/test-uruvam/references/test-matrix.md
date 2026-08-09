# Uruvam test matrix

## Deterministic gates

- Dependency integrity and lockfile consistency
- Formatting check, lint, typecheck, unit tests, build
- Electron Forge package for Apple Silicon
- OpenCode binary/client version and checksum contract
- Secret-pattern scan over tracked files, logs, screenshots, reports, and packaged resources
- File-size and UI-nesting architecture checks

## Desktop security

- Renderer sandbox, context isolation, no Node integration, CSP, navigation and window-open policy
- IPC sender and schema rejection tests
- Preview isolation with hostile HTML, script, form, navigation, download, and protocol payloads
- Path traversal, absolute external path, symlink escape, malformed image/font, oversized upload, and unsafe SVG
- Unsafe shell, destructive Git, external directory, MCP URL, plugin source, changed checksum, and revoked trust
- Keychain unavailable, denied, invalid, revoked, and redaction behavior

## Product workflow

- First launch and Go key validation
- Complete catalog with incompatible design models disabled and explained
- Latest-shadcn preflight success and atomic failure
- Immediate first direction and inspectable assumptions
- Multi-route/state prototype at 390px and 1440px
- Comment creation, re-anchoring, resolution, and decision-log promotion
- Draft worktree, semantic checkpoints, acceptance, named direction, rejection, Stop, crash, and recovery
- One writer with visible queued prompts
- Offline preview, comments, history, and no automatic reconnection submission
- Reveal in Finder and Open in Editor without displaying code inside Uruvam

## Quality loop

- Console and required-resource failures
- Typecheck, lint, unit test, and production build failures
- Overflow, keyboard, focus visibility, contrast, and serious accessibility violations
- Screenshot inspection against DESIGN.md
- Three-repair and 20-minute budgets
- Preserve the latest valid checkpoint when exhausted or interrupted

## Release

- Signed and notarized Apple Silicon app
- Fresh-machine launch and Gatekeeper behavior
- Signed GitHub update, interrupted update, checksum failure, and rollback
- MIT licence, third-party notices, SBOM, provenance, checksums, security and contribution documentation
- No telemetry requests

Record each item as passed, failed, skipped with reason, or blocked with exact missing prerequisite.
