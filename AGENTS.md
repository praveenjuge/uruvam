# Repository instructions

- Build for long-term maintainability and reliability; do not take MVP shortcuts.
- Keep one canonical implementation in the primary codepath.
- Use current stable dependencies, except the explicitly pinned OpenCode v2 binary/client pair.
- Keep files at or below 750 lines and UI nesting at three levels or fewer.
- Use shadcn source-owned components for Uruvam and every generated project.
- Keep renderer processes sandboxed and validate every IPC, path, URL, upload, extension, and subprocess input.
- Never commit, print, log, snapshot, or transmit credentials. The local Go test key is available only from macOS Keychain service `com.uruvam.opencode-go`.
- Use `.agents/skills/test-uruvam` for test, validation, and release-readiness work.
- Ask before migrations, backfills, destructive cleanup, or changes that weaken the security boundary.
- Treat unexpected file changes as parallel work and keep changes scoped.
