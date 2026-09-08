import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { inspectBundle, summarizeManifest } from "../src/inspect.js";

function withBundle(manifest: string, callback: (directory: string, archive: string) => void): void {
  const tmp = mkdtempSync(join(tmpdir(), "safecopy-inspect-"));
  try {
    const directory = join(tmp, "bundle");
    const archive = join(tmp, "bundle.tgz");
    mkdirSync(directory);
    writeFileSync(join(directory, "safecopy-manifest.json"), manifest);
    const tar = spawnSync("tar", ["-czf", archive, "-C", directory, "./safecopy-manifest.json"]);
    assert.equal(tar.status, 0);
    callback(directory, archive);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const validManifest = {
  schemaVersion: 1,
  tool: "safecopy",
  createdAt: "2026-09-08T00:00:00.000Z",
  rootName: "demo",
  files: [{ path: "README.md", size: 4, copiedBytes: 4, sha256: "abcd", redactions: [{ rule: "token", count: 1 }] }],
  skipped: [{ path: ".env", size: 8, reason: "denied" }],
  totals: { files: 1, skipped: 1, bytes: 4, redactedFiles: 1, redactions: 1 }
};

test("inspect accepts valid directory and archive manifests", () => {
  withBundle(JSON.stringify(validManifest), (directory, archive) => {
    for (const bundle of [directory, archive]) {
      const manifest = inspectBundle(bundle);
      assert.equal(manifest.rootName, "demo");
      assert.match(summarizeManifest(manifest), /files: 1/);
      assert.equal(JSON.parse(JSON.stringify(manifest)).totals.bytes, 4);
    }
  });
});

test("inspect reports malformed JSON without parser internals", () => {
  withBundle("{ nope", (directory, archive) => {
    for (const bundle of [directory, archive]) {
      assert.throws(() => inspectBundle(bundle), new RegExp(`Invalid safecopy-manifest\\.json in bundle ${bundle}: malformed JSON`));
    }
  });
});

test("inspect reports incomplete and wrong-typed nested fields", () => {
  const cases: Array<[unknown, string]> = [
    [{}, "schemaVersion must be 1"],
    [{ ...validManifest, totals: { ...validManifest.totals, files: "1" } }, "totals.files must be a finite non-negative number"],
    [{ ...validManifest, files: [{ ...validManifest.files[0], redactions: [{ rule: "token", count: "one" }] }] }, "files\\[0\\].redactions\\[0\\].count must be a finite non-negative number"],
    [{ ...validManifest, skipped: [{ path: ".env", size: 8 }] }, "skipped\\[0\\].reason must be a string"]
  ];
  for (const [manifest, expected] of cases) {
    withBundle(JSON.stringify(manifest), (directory, archive) => {
      for (const bundle of [directory, archive]) {
        assert.throws(() => inspectBundle(bundle), new RegExp(`Invalid safecopy-manifest\\.json in bundle ${bundle}: ${expected}`));
      }
    });
  }
});

test("inspect identifies a missing directory manifest", () => {
  const tmp = mkdtempSync(join(tmpdir(), "safecopy-inspect-"));
  try {
    assert.throws(() => inspectBundle(tmp), /Could not read safecopy-manifest\.json from bundle .*safecopy-inspect-/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
