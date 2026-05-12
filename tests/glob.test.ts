import assert from "node:assert/strict";
import test from "node:test";
import { matchesAny } from "../src/glob.js";

test("matches doublestar and basename globs", () => {
  assert.equal(matchesAny("src/app.js", ["**/*.js"]), "**/*.js");
  assert.equal(matchesAny("nested/.env.local", [".env.*", "**/.env.*"]), "**/.env.*");
  assert.equal(matchesAny("docs/readme.md", ["src/**"]), undefined);
});
