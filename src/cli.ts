#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createPlan, formatPlan, inspectBundle, pack, summarizeManifest } from "./index.js";

interface ParsedArgs {
  command?: string;
  values: Record<string, string | boolean>;
}

const valueOptions = new Set(["root", "config", "out", "bundle", "path"]);
const booleanOptions = new Set(["json", "force", "directory", "help"]);
const commandOptions: Record<string, Set<string>> = {
  plan: new Set(["root", "config", "json", "help"]),
  pack: new Set(["root", "config", "out", "force", "directory", "help"]),
  inspect: new Set(["bundle", "path", "json", "help"]),
  help: new Set()
};

function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) return { values: {} };
  if (argv[0] === "--help") {
    if (argv.length > 1) throw new Error(`Unexpected argument: ${argv[1]}`);
    return { command: "help", values: {} };
  }

  const [command, ...rest] = argv;
  const allowed = commandOptions[command];
  if (!allowed) throw new Error(`Unknown command: ${command}`);
  const values: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (!allowed.has(key)) throw new Error(`Unknown option for ${command}: --${key}`);
    if (key in values) throw new Error(`Option may only be supplied once: --${key}`);

    const next = rest[i + 1];
    if (valueOptions.has(key)) {
      if (!next || next.startsWith("--")) throw new Error(`Option --${key} requires a value`);
      values[key] = next;
      i += 1;
      continue;
    }
    if (!booleanOptions.has(key)) throw new Error(`Unknown option: --${key}`);
    values[key] = true;
  }
  return { command, values };
}

function stringOpt(values: Record<string, string | boolean>, key: string, fallback?: string): string | undefined {
  const value = values[key];
  return typeof value === "string" ? value : fallback;
}

function main(): void {
  const { command, values } = parseArgs(process.argv.slice(2));
  const root = resolve(stringOpt(values, "root", process.cwd())!);
  const configPath = stringOpt(values, "config");
  if (!command || command === "help" || values.help) return help();
  if (command === "plan") {
    const plan = createPlan({ root, configPath });
    console.log(values.json ? JSON.stringify(plan, null, 2) : formatPlan(plan));
    return;
  }
  if (command === "pack") {
    const out = stringOpt(values, "out", "safecopy-bundle.tgz")!;
    mkdirSync(dirname(resolve(out)), { recursive: true });
    const result = pack({ root, out, configPath, force: Boolean(values.force), mode: values.directory ? "directory" : undefined });
    console.log(`wrote ${result.outputPath}`);
    console.log(summarizeManifest(result.manifest));
    return;
  }
  if (command === "inspect") {
    const bundle = stringOpt(values, "bundle") ?? stringOpt(values, "path");
    if (!bundle) throw new Error("inspect requires --bundle <path>");
    const manifest = inspectBundle(bundle);
    console.log(values.json ? JSON.stringify(manifest, null, 2) : summarizeManifest(manifest));
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

function help(): void {
  console.log(`safecopy - deterministic safe project context bundles

Usage:
  safecopy plan [--root .] [--config safecopy.config.json] [--json]
  safecopy pack [--root .] [--config safecopy.config.json] [--out bundle.tgz] [--force] [--directory]
  safecopy inspect (--bundle bundle.tgz | --path bundle.tgz) [--json]
  safecopy help

Every command also accepts --help. Boolean flags do not take values.

No telemetry. No upload. Local files only.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
