# deprecation-mcp

A free, open [MCP](https://modelcontextprotocol.io) server for checking whether
a vendor API or SDK is active, deprecated, or sunset — so an agent doing
upgrade/maintenance work can check before it breaks, instead of after.

API/SDK deprecations are scattered across changelog pages, RSS feeds (if
you're lucky), and `Sunset`/`Deprecation` HTTP headers (if the vendor bothers
implementing [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594)). This server
puts a curated, hand-verified answer behind one tool call.

No payment gating, no metering, no billing code of any kind — this is a plain
open MCP server.

## What it exposes

One tool, `check_deprecation`:

```
check_deprecation(provider: string, target: string) -> {
  status: "active" | "deprecated" | "sunset" | "unknown",
  deprecated_on: string | null,
  sunset_on: string | null,
  replacement: string | null,
  migration_url: string | null,
  source_url: string,
  last_verified_at: string
}
```

`status: "unknown"` (with a blank `source_url`) is returned for any
provider/target not in the curated dataset below — it means "not tracked",
not "confirmed active."

## Curated dataset

Ten provider APIs/SDKs, each checked against the vendor's own published page
(`source_url`) on the date in `last_verified_at`. Data lives in
[`data/deprecations.json`](data/deprecations.json).

| provider | target | status |
|---|---|---|
| `aws` | `aws-sdk-js-v2` | sunset |
| `stripe` | `sources-api` | deprecated |
| `twilio` | `programmable-chat` | sunset |
| `github` | `dependency-graph-sbom-sync` | deprecated |
| `openai` | `assistants-api` | deprecated |
| `slack` | `classic-apps` | deprecated |
| `sendgrid` | `v2-mail-send` | deprecated |
| `shopify` | `rest-admin-api` | deprecated |
| `auth0` | `rules-and-hooks` | deprecated |
| `paypal` | `nvp-soap-api` | deprecated |

Lookups are case-insensitive and also match each record's `aliases` (e.g.
`aws`/`aws-sdk` resolves to `aws-sdk-js-v2`).

## Run it

```bash
npm install
npm run build
npm start        # starts the stdio MCP server
```

## Add to an MCP client

Claude Code (`.mcp.json` in your project, or `claude mcp add`):

```json
{
  "mcpServers": {
    "deprecation": {
      "command": "node",
      "args": ["/absolute/path/to/deprecation-mcp/dist/index.js"]
    }
  }
}
```

Any other stdio-based MCP client config follows the same shape: run
`node dist/index.js` as the server command.

## Worked example

Once connected, an agent calls:

```json
{
  "name": "check_deprecation",
  "arguments": { "provider": "aws", "target": "aws-sdk-js-v2" }
}
```

and gets back:

```json
{
  "status": "sunset",
  "deprecated_on": "2024-09-08",
  "sunset_on": "2025-09-08",
  "replacement": "AWS SDK for JavaScript v3",
  "migration_url": "https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrating-to-v3.html",
  "source_url": "https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/",
  "last_verified_at": "2026-08-08"
}
```

## Tests

```bash
npm test   # builds, then runs node:test against the lookup logic
```

## Updating the dataset

Edit `data/deprecations.json` directly — no build step or scraper needed, it's
read at server startup. Each record needs a real `source_url` you actually
checked and an accurate `last_verified_at`. When you re-verify a record,
recompute its `content_hash` too (see below).

## Drift detection

Hand-checking ten `source_url`s every so often doesn't scale, and stale data
is worse than no data. A weekly GitHub Action
([`.github/workflows/check-drift.yml`](.github/workflows/check-drift.yml))
fetches each record's `source_url`, hashes the response body (sha256), and
compares it to the `content_hash` stored on the record at
`last_verified_at`. If the hash changed, the page changed since it was last
verified — the record is flagged, not auto-updated. **The automation never
writes to `data/deprecations.json`**; a changed page only means "a human or
agent needs to re-verify this record by hand," never an inferred new status.
Wrong auto-inferred status is worse than no automation.

When drift or a fetch failure is detected, the workflow opens (or updates) a
single GitHub issue labeled `drift-check` summarizing which records need
attention; it closes that issue automatically once a later run comes back
clean.

Run it locally:

```bash
npm run build
npm run check-drift
```

Exits `0` if every record's hash still matches, `1` otherwise.

All ten `source_url`s were fetched with a plain GET (no headless browser, no
bot-protection workaround) when their `content_hash` baselines were seeded,
and all ten succeeded. If a vendor later adds bot protection or a redirect
that breaks the plain-GET fetch, that record will show up as
`fetch_failed` in the weekly report rather than being silently skipped.

**Known limitation:** the AWS blog post, Stripe docs page, and PayPal docs
page (`aws/aws-sdk-js-v2`, `stripe/sources-api`, `paypal/nvp-soap-api`) embed
per-request dynamic content — a nonce, timestamp, or session token that
changes on every fetch even when the substantive page content hasn't. Their
body hash is therefore not fully stable across requests, and the weekly
check may occasionally flag one of these three as "drifted" even with no
real change. This is disclosed rather than worked around (e.g. by stripping
known-volatile substrings): a false-positive "please go look at this page"
is an acceptable cost for a tool whose entire design principle is to never
guess at a status. A human/agent re-verifying such a flagged record should
expect it may be a false alarm.
