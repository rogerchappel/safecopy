import assert from "node:assert/strict";
import { resolve } from "node:path";
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
