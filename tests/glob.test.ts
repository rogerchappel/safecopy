import assert from "node:assert/strict";
import test from "node:test";
import { matchesAny, normalizePath } from "../src/glob.js";

test("matches doublestar and basename globs", () => {
  assert.equal(matchesAny("src/app.js", ["**/*.js"]), "**/*.js");
  assert.equal(matchesAny("nested/.env.local", [".env.*", "**/.env.*"]), "**/.env.*");
  assert.equal(matchesAny("docs/readme.md", ["src/**"]), undefined);
});

test("normalizes every Windows path separator deterministically", () => {
  assert.equal(normalizePath("src\\nested\\app.js"), "src/nested/app.js");
  assert.equal(normalizePath("src\\\\nested/app.js"), "src//nested/app.js");
  assert.equal(normalizePath("./src/nested/app.js"), "src/nested/app.js");
  assert.equal(normalizePath("src/nested/app.js"), "src/nested/app.js");
});

test("matches Windows-separated paths against slash-based include and deny globs", () => {
  const path = "src\\nested\\app.js";

  assert.equal(matchesAny(path, ["src/**"]), "src/**");
  assert.equal(matchesAny(path, ["docs/**", "src/nested/**"]), "src/nested/**");
});
