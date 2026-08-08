import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { DeprecationRecord } from "./lookup.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, "..", "data", "deprecations.json");

function isValidRecord(value: unknown): value is DeprecationRecord {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.provider === "string" &&
    typeof r.target === "string" &&
    typeof r.status === "string" &&
    typeof r.source_url === "string" &&
    typeof r.last_verified_at === "string"
  );
}

export function loadRecords(): DeprecationRecord[] {
  let raw: string;
  try {
    raw = readFileSync(dataPath, "utf-8");
  } catch (err) {
    console.error(`deprecation-mcp: failed to read data file at ${dataPath}: ${(err as Error).message}`);
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`deprecation-mcp: failed to parse data file at ${dataPath} as JSON: ${(err as Error).message}`);
    process.exit(1);
  }

  if (!Array.isArray(parsed) || !parsed.every(isValidRecord)) {
    console.error(`deprecation-mcp: data file at ${dataPath} is malformed: expected an array of deprecation records`);
    process.exit(1);
  }

  return parsed;
}
