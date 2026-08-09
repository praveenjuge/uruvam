# Uruvam

Uruvam is a visual-first Apple Silicon macOS studio for designer-developers to shape high-fidelity local product interfaces with OpenCode Go. Runnable Vite, React, TypeScript, pnpm, and source-owned shadcn projects are canonical, while the app exposes no source viewer, raw diff, terminal, or file tree.

The first public alpha is local-only: new frontend prototypes, managed Git history, responsive visual review, comments, directions, and guarded OpenCode v2 execution. It does not include accounts, collaboration, cloud sync, export, deployment, backend generation, imports from web products, or non-Mac platforms.

## Develop

Requirements: Apple Silicon macOS, Node 24+, pnpm 11+, Git, and an OpenCode Go credential.

```sh
pnpm install
pnpm fetch:opencode
pnpm dev
```

Run deterministic validation with `pnpm quality`. Package the Apple Silicon app with `pnpm package`.

See [the approved product plan](docs/PLAN.md), [security policy](docs/SECURITY.md), [contribution guide](CONTRIBUTING.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

## Privacy and security

Uruvam sends no telemetry. Projects and structured redacted logs remain in local Application Support. The Go key is encrypted by Electron `safeStorage` backed by macOS Keychain; renderer and preview processes cannot access it. The pinned `opencode2` binary and generated client are contract-tested as one version.

## License

MIT © Praveen Juge.
