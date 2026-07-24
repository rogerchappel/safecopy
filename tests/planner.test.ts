import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
