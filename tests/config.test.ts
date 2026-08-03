import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { loadConfig } from "../src/config.js";

function withConfig(contents: string, run: (root: string, path: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "safecopy-config-"));
  const path = join(root, "safecopy.config.json");
  try {
    writeFileSync(path, contents);
    run(root, path);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const invalidCases: Array<[string, unknown, RegExp]> = [
  ["root container", [], /root must be a JSON object/],
  ["include container", { include: "**\/*" }, /include must be an array of strings/],
  ["deny entry", { deny: [42] }, /deny\[0\] must be a string/],
  ["negative byte limit", { maxFileBytes: -1 }, /maxFileBytes must be a finite non-negative number/],
  ["infinite byte limit", { maxFileBytes: null }, /maxFileBytes must be a finite non-negative number/],
  ["redact container", { redact: {} }, /redact must be an array/],
  ["redact rule container", { redact: [null] }, /redact\[0\] must be an object/],
  ["redact property", { redact: [{ name: 1, pattern: "x", placeholder: "y" }] }, /redact\[0\]\.name must be a string/],
  ["regex pattern", { redact: [{ name: "bad", pattern: "[", placeholder: "x" }] }, /redact\[0\]\.pattern must be a valid regular expression/],
  ["regex flags", { redact: [{ name: "bad", pattern: "x", placeholder: "x", flags: "z" }] }, /redact\[0\]\.flags must be valid regular expression flags/]
];

for (const [name, config, expected] of invalidCases) {
  test(`rejects invalid ${name}`, () => withConfig(JSON.stringify(config), (root, path) => {
    assert.throws(() => loadConfig(root), (error: Error) => error.message.includes(path) && expected.test(error.message));
  }));
}

test("rejects malformed JSON with the config path", () => withConfig("{", (root, path) => {
  assert.throws(() => loadConfig(root), (error: Error) => error.message.includes(path) && /malformed JSON/.test(error.message));
}));

test("loads a valid complete config", () => withConfig(JSON.stringify({
  include: ["src/**"], deny: ["tmp/**"], maxFileBytes: 0,
  redact: [{ name: "ticket", pattern: "TICKET-[0-9]+", placeholder: "[TICKET]", flags: "i" }]
}), (root) => {
  const config = loadConfig(root);
  assert.deepEqual(config.include, ["src/**"]);
  assert.ok(config.deny.includes("tmp/**"));
  assert.equal(config.maxFileBytes, 0);
  assert.equal(config.redact.at(-1)?.name, "ticket");
}));

test("CLI reports an actionable config error without an internal TypeError", () => withConfig('{"include":"**/*"}', (root, path) => {
  const result = spawnSync(process.execPath, ["dist/src/cli.js", "plan", "--root", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(`Invalid config at ${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: include`));
  assert.doesNotMatch(result.stderr, /TypeError|patterns\.find/);
}));
