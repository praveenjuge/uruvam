# Contributing

Use Node 24 or newer and pnpm 11. Run `pnpm quality` before opening a pull request. Keep renderer sandboxing, IPC validation, managed-path containment, preview isolation, credential redaction, one-writer Git worktrees, and source-owned shadcn components intact.

Changes to the pinned OpenCode v2 binary and generated client must update both exact versions, the binary checksum, contract tests, SBOM, and packaged-app evidence in one pull request.
