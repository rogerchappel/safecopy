import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createPlan } from "../src/planner.js";

const fixture = resolve("fixtures/demo");

test("planner includes safe files and skips denied files", () => {
  const plan = createPlan({ root: fixture });
  const included = plan.included.map((file) => file.path);
  const skipped = new Map(plan.skipped.map((file) => [file.path, file.reason]));
  assert.ok(included.includes("README.md"));
  assert.ok(included.includes("src/app.js"));
  assert.ok(skipped.get(".env")?.includes("denied"));
  assert.ok(skipped.get("ignored.txt")?.includes("ignored.txt"));
  assert.ok(skipped.get("cache/tmp.txt")?.includes("cache/**"));
});

test("planner applies gitignore rules in order while retaining safety denies", () => {
  const root = mkdtempSync(join(tmpdir(), "safecopy-gitignore-"));
  try {
    writeFileSync(join(root, ".gitignore"), "*.tmp\n!keep.tmp\n!.env\n");
    writeFileSync(join(root, "drop.tmp"), "drop\n");
    writeFileSync(join(root, "keep.tmp"), "keep\n");
    writeFileSync(join(root, ".env"), "SECRET=unsafe\n");

    const plan = createPlan({ root });
    const included = plan.included.map((file) => file.path);
    const skipped = new Map(plan.skipped.map((file) => [file.path, file.reason]));

    assert.ok(included.includes("keep.tmp"));
    assert.match(skipped.get("drop.tmp") ?? "", /denied by \*\*\/\*\.tmp/);
    assert.match(skipped.get(".env") ?? "", /denied by/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("planner applies unanchored gitignore directory rules at every depth", () => {
  const root = mkdtempSync(join(tmpdir(), "safecopy-gitignore-directory-"));
  try {
    mkdirSync(join(root, "cache"), { recursive: true });
    mkdirSync(join(root, "nested", "cache"), { recursive: true });
    writeFileSync(join(root, ".gitignore"), "cache/\n");
    writeFileSync(join(root, "cache", "root.txt"), "ignored\n");
    writeFileSync(join(root, "nested", "cache", "context.txt"), "ignored\n");

    const plan = createPlan({ root });
    const skipped = new Map(plan.skipped.map((file) => [file.path, file.reason]));

    assert.match(skipped.get("cache/root.txt") ?? "", /denied by \*\*\/cache\/\*\*/);
    assert.match(skipped.get("nested/cache/context.txt") ?? "", /denied by \*\*\/cache\/\*\*/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("planner keeps anchored directory rules at the repository root", () => {
  const root = mkdtempSync(join(tmpdir(), "safecopy-gitignore-anchored-"));
  try {
    mkdirSync(join(root, "cache"), { recursive: true });
    mkdirSync(join(root, "nested", "cache"), { recursive: true });
    writeFileSync(join(root, ".gitignore"), "/cache/\n");
    writeFileSync(join(root, "cache", "root.txt"), "ignored\n");
    writeFileSync(join(root, "nested", "cache", "context.txt"), "included\n");

    const plan = createPlan({ root });
    const included = plan.included.map((file) => file.path);
    const skipped = new Map(plan.skipped.map((file) => [file.path, file.reason]));

    assert.match(skipped.get("cache/root.txt") ?? "", /denied by cache\/\*\*/);
    assert.ok(included.includes("nested/cache/context.txt"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("planner applies negated unanchored directory rules in order", () => {
  const root = mkdtempSync(join(tmpdir(), "safecopy-gitignore-negated-directory-"));
  try {
    mkdirSync(join(root, "cache"), { recursive: true });
    mkdirSync(join(root, "nested", "cache"), { recursive: true });
    writeFileSync(join(root, ".gitignore"), "cache/\n!nested/cache/\n");
    writeFileSync(join(root, "cache", "root.txt"), "ignored\n");
    writeFileSync(join(root, "nested", "cache", "context.txt"), "included\n");

    const plan = createPlan({ root });
    const included = plan.included.map((file) => file.path);
    const skipped = new Map(plan.skipped.map((file) => [file.path, file.reason]));

    assert.match(skipped.get("cache/root.txt") ?? "", /denied by \*\*\/cache\/\*\*/);
    assert.ok(included.includes("nested/cache/context.txt"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
