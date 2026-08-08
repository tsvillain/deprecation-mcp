import { test } from "node:test";
import assert from "node:assert/strict";
import { compareHashes, type FetchResult } from "../scripts/check-drift.js";
import type { DeprecationRecord } from "../lookup.js";

function makeRecord(overrides: Partial<DeprecationRecord>): DeprecationRecord {
  return {
    provider: "acme",
    target: "widget-api",
    status: "deprecated",
    deprecated_on: null,
    sunset_on: null,
    replacement: null,
    migration_url: null,
    source_url: "https://example.com/acme",
    last_verified_at: "2026-08-08",
    content_hash: "abc123",
    ...overrides,
  };
}

test("record with matching hash is bucketed as ok", () => {
  const record = makeRecord({});
  const fetchResults = new Map<string, FetchResult>([
    [record.source_url, { ok: true, hash: "abc123" }],
  ]);
  const buckets = compareHashes([record], fetchResults);
  assert.deepEqual(buckets.ok, [record]);
  assert.deepEqual(buckets.drifted, []);
  assert.deepEqual(buckets.fetchFailed, []);
});

test("record with mismatched hash is bucketed as drifted", () => {
  const record = makeRecord({});
  const fetchResults = new Map<string, FetchResult>([
    [record.source_url, { ok: true, hash: "different-hash" }],
  ]);
  const buckets = compareHashes([record], fetchResults);
  assert.deepEqual(buckets.drifted, [record]);
  assert.deepEqual(buckets.ok, []);
  assert.deepEqual(buckets.fetchFailed, []);
});

test("failed fetch is bucketed as fetch_failed", () => {
  const record = makeRecord({});
  const fetchResults = new Map<string, FetchResult>([
    [record.source_url, { ok: false }],
  ]);
  const buckets = compareHashes([record], fetchResults);
  assert.deepEqual(buckets.fetchFailed, [record]);
  assert.deepEqual(buckets.drifted, []);
  assert.deepEqual(buckets.ok, []);
});

test("missing fetch result is bucketed as fetch_failed", () => {
  const record = makeRecord({});
  const buckets = compareHashes([record], new Map());
  assert.deepEqual(buckets.fetchFailed, [record]);
});

test("multiple records are bucketed independently", () => {
  const ok = makeRecord({ provider: "a", source_url: "https://example.com/a", content_hash: "h1" });
  const drifted = makeRecord({ provider: "b", source_url: "https://example.com/b", content_hash: "h2" });
  const failed = makeRecord({ provider: "c", source_url: "https://example.com/c", content_hash: "h3" });
  const fetchResults = new Map<string, FetchResult>([
    [ok.source_url, { ok: true, hash: "h1" }],
    [drifted.source_url, { ok: true, hash: "changed" }],
    [failed.source_url, { ok: false }],
  ]);
  const buckets = compareHashes([ok, drifted, failed], fetchResults);
  assert.deepEqual(buckets.ok, [ok]);
  assert.deepEqual(buckets.drifted, [drifted]);
  assert.deepEqual(buckets.fetchFailed, [failed]);
});
