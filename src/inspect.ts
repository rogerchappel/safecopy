import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import type { SafeCopyManifest } from "./types.js";

export function inspectBundle(path: string): SafeCopyManifest {
  const target = resolve(path);
  if (!existsSync(target)) throw new Error(`Bundle not found: ${path}`);
  let source: string;
  try {
    source = readManifest(target);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read safecopy-manifest.json from bundle ${path}: ${detail}`);
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(source);
  } catch {
    throw new Error(`Invalid safecopy-manifest.json in bundle ${path}: malformed JSON`);
  }
  validateManifest(manifest, path);
  return manifest;
}

function validateManifest(value: unknown, bundle: string): asserts value is SafeCopyManifest {
  const fail = (field: string, expected: string): never => {
    throw new Error(`Invalid safecopy-manifest.json in bundle ${bundle}: ${field} must be ${expected}`);
  };
  if (!isRecord(value)) return fail("manifest", "an object");
  if (value.schemaVersion !== 1) fail("schemaVersion", "1");
  if (value.tool !== "safecopy") fail("tool", '"safecopy"');
  requireString(value.createdAt, "createdAt", fail);
  requireString(value.rootName, "rootName", fail);
  if (!Array.isArray(value.files)) return fail("files", "an array");
  value.files.forEach((entry, index) => validateFile(entry, `files[${index}]`, fail));
  if (!Array.isArray(value.skipped)) return fail("skipped", "an array");
  value.skipped.forEach((entry, index) => validateSkipped(entry, `skipped[${index}]`, fail));
  if (!isRecord(value.totals)) return fail("totals", "an object");
  for (const field of ["files", "skipped", "bytes", "redactedFiles", "redactions"] as const) {
    requireNumber(value.totals[field], `totals.${field}`, fail);
  }
}

type Failure = (field: string, expected: string) => never;

function validateFile(value: unknown, field: string, fail: Failure): void {
  if (!isRecord(value)) return fail(field, "an object");
  requireString(value.path, `${field}.path`, fail);
  requireNumber(value.size, `${field}.size`, fail);
  requireNumber(value.copiedBytes, `${field}.copiedBytes`, fail);
  requireString(value.sha256, `${field}.sha256`, fail);
  if (!Array.isArray(value.redactions)) return fail(`${field}.redactions`, "an array");
  value.redactions.forEach((hit, index) => {
    const hitField = `${field}.redactions[${index}]`;
    if (!isRecord(hit)) return fail(hitField, "an object");
    requireString(hit.rule, `${hitField}.rule`, fail);
    requireNumber(hit.count, `${hitField}.count`, fail);
  });
}

function validateSkipped(value: unknown, field: string, fail: Failure): void {
  if (!isRecord(value)) return fail(field, "an object");
  requireString(value.path, `${field}.path`, fail);
  requireNumber(value.size, `${field}.size`, fail);
  requireString(value.reason, `${field}.reason`, fail);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string, fail: Failure): void {
  if (typeof value !== "string") fail(field, "a string");
}

function requireNumber(value: unknown, field: string, fail: Failure): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) fail(field, "a finite non-negative number");
}

function readManifest(target: string): string {
  if (extname(target) === ".tgz" || target.endsWith(".tar.gz")) {
    const result = spawnSync("tar", ["-xOf", target, "./safecopy-manifest.json"], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || "tar failed");
    return result.stdout;
  }
  return readFileSync(resolve(target, "safecopy-manifest.json"), "utf8");
}

export function summarizeManifest(manifest: SafeCopyManifest): string {
  return [
    `safecopy bundle for ${manifest.rootName}`,
    `files: ${manifest.totals.files}`,
    `skipped: ${manifest.totals.skipped}`,
    `redactions: ${manifest.totals.redactions}`,
    `bytes: ${manifest.totals.bytes}`
  ].join("\n");
}
