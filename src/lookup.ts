export type DeprecationStatus = "active" | "deprecated" | "sunset" | "unknown";

export interface DeprecationRecord {
  provider: string;
  target: string;
  aliases?: string[];
  status: DeprecationStatus;
  deprecated_on: string | null;
  sunset_on: string | null;
  replacement: string | null;
  migration_url: string | null;
  source_url: string;
  last_verified_at: string;
  content_hash?: string;
}

export interface CheckDeprecationResult {
  status: DeprecationStatus;
  deprecated_on: string | null;
  sunset_on: string | null;
  replacement: string | null;
  migration_url: string | null;
  source_url: string;
  last_verified_at: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function findRecord(
  records: DeprecationRecord[],
  provider: string,
  target: string
): DeprecationRecord | undefined {
  const provNorm = normalize(provider);
  const targetNorm = normalize(target);
  return records.find(
    (r) =>
      normalize(r.provider) === provNorm &&
      (normalize(r.target) === targetNorm ||
        (r.aliases ?? []).some((alias) => normalize(alias) === targetNorm))
  );
}

export function checkDeprecation(
  records: DeprecationRecord[],
  provider: string,
  target: string
): CheckDeprecationResult {
  const record = findRecord(records, provider, target);
  if (!record) {
    return {
      status: "unknown",
      deprecated_on: null,
      sunset_on: null,
      replacement: null,
      migration_url: null,
      source_url: "",
      last_verified_at: new Date().toISOString().slice(0, 10),
    };
  }
  const {
    status,
    deprecated_on,
    sunset_on,
    replacement,
    migration_url,
    source_url,
    last_verified_at,
  } = record;
  return { status, deprecated_on, sunset_on, replacement, migration_url, source_url, last_verified_at };
}
