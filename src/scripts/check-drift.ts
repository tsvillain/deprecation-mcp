import { createHash } from "node:crypto";
import { loadRecords } from "../data.js";
import type { DeprecationRecord } from "../lookup.js";

export interface FetchResult {
  ok: boolean;
  hash?: string;
}

export interface DriftBuckets {
  drifted: DeprecationRecord[];
  fetchFailed: DeprecationRecord[];
  ok: DeprecationRecord[];
}

export function compareHashes(
  records: DeprecationRecord[],
  fetchResults: Map<string, FetchResult>
): DriftBuckets {
  const buckets: DriftBuckets = { drifted: [], fetchFailed: [], ok: [] };
  for (const record of records) {
    const result = fetchResults.get(record.source_url);
    if (!result || !result.ok || !result.hash) {
      buckets.fetchFailed.push(record);
    } else if (result.hash !== record.content_hash) {
      buckets.drifted.push(record);
    } else {
      buckets.ok.push(record);
    }
  }
  return buckets;
}

async function fetchAll(records: DeprecationRecord[]): Promise<Map<string, FetchResult>> {
  const results = new Map<string, FetchResult>();
  for (const record of records) {
    try {
      const res = await fetch(record.source_url);
      if (!res.ok) {
        results.set(record.source_url, { ok: false });
        continue;
      }
      const body = await res.text();
      const hash = createHash("sha256").update(body).digest("hex");
      results.set(record.source_url, { ok: true, hash });
    } catch {
      results.set(record.source_url, { ok: false });
    }
  }
  return results;
}

function formatRecord(r: DeprecationRecord, bucket: string): string {
  return `- [${bucket}] ${r.provider}/${r.target} — ${r.source_url}`;
}

async function main() {
  const records = loadRecords();
  const fetchResults = await fetchAll(records);
  const { drifted, fetchFailed, ok } = compareHashes(records, fetchResults);

  if (drifted.length === 0 && fetchFailed.length === 0) {
    console.log(`Drift check: all ${ok.length} records OK, no drift, no fetch failures.`);
    process.exit(0);
  }

  console.log("# Drift check report\n");
  if (drifted.length > 0) {
    console.log(`## Drifted (${drifted.length}) — source_url content changed since last verification`);
    for (const r of drifted) console.log(formatRecord(r, "drifted"));
    console.log("");
  }
  if (fetchFailed.length > 0) {
    console.log(`## Fetch failed (${fetchFailed.length}) — could not fetch source_url`);
    for (const r of fetchFailed) console.log(formatRecord(r, "fetch_failed"));
    console.log("");
  }
  console.log(`OK: ${ok.length}, drifted: ${drifted.length}, fetch_failed: ${fetchFailed.length}`);
  process.exit(1);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
