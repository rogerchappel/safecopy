import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

test("directory repacks refuse existing outputs unless force replaces them", () => {
  const tmp = mkdtempSync(join(tmpdir(), "safecopy-"));
  try {
    const root = join(tmp, "project");
    const out = join(tmp, "bundle");
    mkdirSync(root);
    writeFileSync(join(root, "sensitive.txt"), "secret-old\n");
    writeFileSync(join(root, "current.txt"), "current\n");
    const configPath = join(root, "safecopy.config.json");
    writeFileSync(configPath, `${JSON.stringify({ include: ["sensitive.txt"] })}\n`);

    pack({ root, out, mode: "directory" });
    assert.equal(readFileSync(join(out, "sensitive.txt"), "utf8"), "secret-old\n");

    writeFileSync(configPath, `${JSON.stringify({ include: ["current.txt"] })}\n`);
    assert.throws(
      () => pack({ root, out, mode: "directory" }),
      /Output already exists: .* Use --force to replace it\./
    );

    pack({ root, out, mode: "directory", force: true });
    assert.equal(existsSync(join(out, "sensitive.txt")), false);
    assert.equal(readFileSync(join(out, "current.txt"), "utf8"), "current\n");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("forced directory repacks exclude an output inside the project", () => {
  const tmp = mkdtempSync(join(tmpdir(), "safecopy-"));
  try {
    const root = join(tmp, "project");
    const out = join(root, "bundle");
    mkdirSync(root);
    writeFileSync(join(root, "current.txt"), "current\n");

    pack({ root, out, mode: "directory" });
    pack({ root, out, mode: "directory", force: true });

    const manifest = inspectBundle(out);
    assert.ok(manifest.files.some((file) => file.path === "current.txt"));
    assert.equal(manifest.files.some((file) => file.path.startsWith("bundle/")), false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("tgz repacks refuse existing outputs unless force replaces them", () => {
  const tmp = mkdtempSync(join(tmpdir(), "safecopy-"));
  try {
    const out = join(tmp, "bundle.tgz");
    writeFileSync(out, "keep-existing\n");

    assert.throws(
      () => pack({ root: fixture, out }),
      /Output already exists: .* Use --force to replace it\./
    );
    assert.equal(readFileSync(out, "utf8"), "keep-existing\n");
    assert.equal(existsSync(`${out}.staging`), false);

    pack({ root: fixture, out, force: true });
    assert.ok(inspectBundle(out).files.some((file) => file.path === "README.md"));
    assert.equal(existsSync(`${out}.staging`), false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("tgz failures clean staging without altering an existing output", () => {
  const tmp = mkdtempSync(join(tmpdir(), "safecopy-"));
  const originalPath = process.env.PATH;
  try {
    const out = join(tmp, "bundle.tgz");
    const bin = join(tmp, "bin");
    mkdirSync(bin);
    const tar = join(bin, "tar");
    writeFileSync(tar, "#!/bin/sh\nexit 7\n");
    chmodSync(tar, 0o755);
    writeFileSync(out, "keep-existing\n");
    process.env.PATH = `${bin}:${originalPath ?? ""}`;

    assert.throws(() => pack({ root: fixture, out, force: true }), /tar failed/);
    assert.equal(readFileSync(out, "utf8"), "keep-existing\n");
    assert.equal(existsSync(`${out}.staging`), false);
    assert.equal(existsSync(`${out}.staging-archive`), false);
  } finally {
    process.env.PATH = originalPath;
    rmSync(tmp, { recursive: true, force: true });
  }
});
