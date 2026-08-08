import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { DeprecationRecord } from "./lookup.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataPath = join(here, "..", "data", "deprecations.json");

export function loadRecords(): DeprecationRecord[] {
  const raw = readFileSync(dataPath, "utf-8");
  return JSON.parse(raw) as DeprecationRecord[];
}
