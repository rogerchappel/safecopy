import assert from "node:assert/strict";
import test from "node:test";
import { redactText } from "../src/redact.js";

test("redacts configured text and reports counts", () => {
  const result = redactText("token=abc123\nplain=true\ntoken=def456", [
    { name: "token", pattern: "token=\\w+", placeholder: "token=[REDACTED]" }
  ]);
  assert.equal(result.content, "token=[REDACTED]\nplain=true\ntoken=[REDACTED]");
  assert.deepEqual(result.hits, [{ rule: "token", count: 2 }]);
});
