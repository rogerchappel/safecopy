import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cliPath = fileURLToPath(new URL("../src/cli.js", import.meta.url));

function cli(args: string[], cwd?: string) {
  return spawnSync(process.execPath, [cliPath, ...args], { cwd, encoding: "utf8" });
}

const malformedCases: Array<[string, string[], RegExp]> = [
  ["unknown options", ["plan", "--bogus"], /Unknown option for plan: --bogus/],
  ["missing root values", ["plan", "--root"], /Option --root requires a value/],
  ["missing config values", ["plan", "--config", "--json"], /Option --config requires a value/],
  ["missing out values", ["pack", "--out", "--directory"], /Option --out requires a value/],
  ["missing bundle values", ["inspect", "--bundle"], /Option --bundle requires a value/],
  ["missing path values", ["inspect", "--path", "--json"], /Option --path requires a value/],
  ["boolean flag values", ["plan", "--json", "true"], /Unexpected argument: true/],
  ["positional arguments", ["plan", "project"], /Unexpected argument: project/]
];

for (const [name, args, expected] of malformedCases) {
  test(`CLI rejects ${name}`, () => {
    const result = cli(args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, expected);
  });
}

test("CLI rejects a missing out value instead of writing the fallback output", () => {
  const cwd = mkdtempSync(join(tmpdir(), "safecopy-cli-"));
  try {
    const result = cli(["pack", "--root", cwd, "--out", "--directory"], cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Option --out requires a value/);
    assert.doesNotMatch(result.stdout, /wrote/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("CLI help forms remain available", () => {
  for (const args of [[], ["help"], ["--help"], ["plan", "--help"], ["pack", "--help"], ["inspect", "--help"]]) {
    const result = cli(args);
    assert.equal(result.status, 0, `${args.join(" ")}: ${result.stderr}`);
    assert.match(result.stdout, /Usage:/);
  }
});
