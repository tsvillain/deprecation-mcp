# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- `deprecation-mcp`: open MCP server (stdio, `@modelcontextprotocol/sdk`), one tool `check_deprecation`.
  No payment/billing/metering code — keep it that way; this ships as a plain open server.
- Build/test: `npm install && npm run build && npm test` (`pretest` builds; `node:test` runs against `dist/`).
- Data lives in `data/deprecations.json`, read at server startup (see `src/data.ts`) — no DB, no scraper,
  no network calls at runtime. Every record needs a real `source_url` and accurate `last_verified_at`;
  see README.md "Updating the dataset" for the bar. `loadRecords()` fails loudly (stderr + exit 1) on a
  missing/malformed/malshaped data file instead of throwing — keep diagnostics on stderr only, stdout is
  the MCP JSON-RPC channel.
- Lookup/status logic: `src/lookup.ts`. Tests: `src/test/lookup.test.ts`.
- Drift detection: `src/scripts/check-drift.ts` (`npm run check-drift`) fetches each record's `source_url`,
  compares a sha256 hash to the record's `content_hash`, and only ever flags — it never writes `status`,
  `deprecated_on`, etc. into `data/deprecations.json`. Runs weekly via
  `.github/workflows/check-drift.yml`, which opens/updates a `drift-check`-labeled GitHub issue. See
  README.md "Drift detection" for the known false-positive limitation on 3 records with dynamic page
  content. When you re-verify a record by hand, recompute its `content_hash` too.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
