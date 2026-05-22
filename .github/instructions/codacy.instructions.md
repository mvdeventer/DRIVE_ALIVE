---
description: Codacy MCP rules — only loaded for source-code edits
applyTo: '**/*.{py,ts,tsx,js,jsx}'
---
# Codacy Rules (minimal)

- After **meaningful** edits to `.py/.ts/.tsx/.js/.jsx`, run `codacy_cli_analyze` with `rootPath` = workspace path, `file` = edited file, `tool` unset. Skip for trivial edits (comments, typos, single-line tweaks).
- After installing/adding dependencies (`pip`, `npm`, `yarn`, `pnpm`, requirements.txt, package.json), run `codacy_cli_analyze` with `tool: "trivy"` and `file` unset. Fix any new vulns before continuing.
- If Codacy CLI is missing, ask once whether to run `codacy_cli_install`. Do not install via brew/npm manually.
- Use plain (non-URL-encoded) filesystem paths. Ignore complexity-metric and coverage diffs.
