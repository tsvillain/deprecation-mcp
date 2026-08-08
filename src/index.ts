#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadRecords } from "./data.js";
import { checkDeprecation } from "./lookup.js";

const records = loadRecords();

const server = new McpServer({
  name: "deprecation-mcp",
  version: "0.1.0",
});

server.registerTool(
  "check_deprecation",
  {
    title: "Check API/SDK deprecation status",
    description:
      "Look up whether a provider's API or SDK is active, deprecated, or sunset. " +
      "Covers a curated set of high-traffic providers (Stripe, Twilio, AWS, GitHub, OpenAI, " +
      "Slack, SendGrid, Shopify, Auth0, PayPal). Returns 'unknown' for anything not tracked.",
    inputSchema: {
      provider: z.string().describe("Vendor slug, e.g. 'stripe', 'aws', 'github'"),
      target: z.string().describe("API/SDK identifier within that provider, e.g. 'sources-api'"),
    },
  },
  async ({ provider, target }) => {
    const result = checkDeprecation(records, provider, target);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("deprecation-mcp fatal error:", err);
  process.exit(1);
});
