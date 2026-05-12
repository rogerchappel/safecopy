#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createPlan, formatPlan, inspectBundle, pack, summarizeManifest } from "./index.js";

interface ParsedArgs {
  command?: string;
  values: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const values: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = rest[i + 1];
    if (!next || next.startsWith("--")) values[key] = true;
    else {
      values[key] = next;
      i += 1;
    }
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
  safecopy pack [--root .] --out bundle.tgz [--force] [--directory]
  safecopy inspect --bundle bundle.tgz [--json]

No telemetry. No upload. Local files only.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
