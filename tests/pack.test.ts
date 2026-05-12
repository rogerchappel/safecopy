import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { inspectBundle } from "../src/inspect.js";
import { pack } from "../src/pack.js";

const fixture = resolve("fixtures/demo");

test("pack creates a redacted directory bundle with manifests", () => {
  const tmp = mkdtempSync(join(tmpdir(), "safecopy-"));
  try {
    const out = join(tmp, "bundle");
    const result = pack({ root: fixture, out, mode: "directory", force: true });
    const secret = readFileSync(join(out, "secrets.txt"), "utf8");
    assert.match(secret, /REDACTED/);
    assert.doesNotMatch(secret, /demo-secret-value/);
    assert.equal(result.manifest.totals.redactions >= 2, true);
    assert.equal(inspectBundle(out).totals.files, result.manifest.totals.files);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("pack creates inspectable tgz archives", () => {
  const tmp = mkdtempSync(join(tmpdir(), "safecopy-"));
  try {
    const out = join(tmp, "bundle.tgz");
    pack({ root: fixture, out, force: true });
    const manifest = inspectBundle(out);
    assert.ok(manifest.files.some((file) => file.path === "README.md"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
