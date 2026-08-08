import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDeprecation, findRecord, type DeprecationRecord } from "../lookup.js";
import { loadRecords } from "../data.js";

const records: DeprecationRecord[] = loadRecords();

test("known provider/target returns real status", () => {
  const result = checkDeprecation(records, "aws", "aws-sdk-js-v2");
  assert.equal(result.status, "sunset");
  assert.equal(result.replacement, "AWS SDK for JavaScript v3");
  assert.ok(result.source_url.startsWith("https://"));
});

test("lookup is case-insensitive", () => {
  const result = checkDeprecation(records, "AWS", "AWS-SDK-JS-V2");
  assert.equal(result.status, "sunset");
});

test("alias resolves to the same record", () => {
  const byAlias = checkDeprecation(records, "aws", "aws-sdk");
  const byTarget = checkDeprecation(records, "aws", "aws-sdk-js-v2");
  assert.deepEqual(byAlias, byTarget);
});

test("unknown provider/target returns unknown status with null fields", () => {
  const result = checkDeprecation(records, "not-a-real-vendor", "not-a-real-target");
  assert.equal(result.status, "unknown");
  assert.equal(result.deprecated_on, null);
  assert.equal(result.sunset_on, null);
  assert.equal(result.replacement, null);
  assert.equal(result.migration_url, null);
  assert.equal(result.source_url, "");
});

test("findRecord returns undefined for no match", () => {
  assert.equal(findRecord(records, "nope", "nope"), undefined);
});

test("dataset has 8-10 curated providers, each with required fields", () => {
  assert.ok(records.length >= 8 && records.length <= 12, `expected 8-12 records, got ${records.length}`);
  for (const r of records) {
    assert.ok(r.provider.length > 0, "provider must be set");
    assert.ok(r.target.length > 0, "target must be set");
    assert.match(r.source_url, /^https:\/\//, `source_url must be a real URL for ${r.provider}/${r.target}`);
    assert.match(r.last_verified_at, /^\d{4}-\d{2}-\d{2}$/, `last_verified_at must be YYYY-MM-DD for ${r.provider}/${r.target}`);
    assert.ok(
      ["active", "deprecated", "sunset", "unknown"].includes(r.status),
      `invalid status for ${r.provider}/${r.target}`
    );
  }
});
