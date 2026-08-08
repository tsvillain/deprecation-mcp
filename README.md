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
checked and an accurate `last_verified_at`.
