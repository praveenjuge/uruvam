# Security policy

Uruvam is hostile-input desktop software. Report vulnerabilities privately through GitHub Security Advisories. Do not include credentials, private project files, or unredacted logs.

The renderer and generated preview are sandboxed without Node access. All privileged operations cross a minimal validated preload API. Managed paths are canonicalized; uploads are bounded and type checked; executable extensions are trusted by exact source, version, and SHA-256. The OpenCode Go credential is encrypted with macOS Keychain and injected only into the local pinned OpenCode v2 service process.

Public alpha security updates support only the latest published Apple Silicon build.
