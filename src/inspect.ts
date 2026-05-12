import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import type { SafeCopyManifest } from "./types.js";

export function inspectBundle(path: string): SafeCopyManifest {
  const target = resolve(path);
  if (!existsSync(target)) throw new Error(`Bundle not found: ${path}`);
  const manifest = readManifest(target);
  return JSON.parse(manifest) as SafeCopyManifest;
}

function readManifest(target: string): string {
  if (extname(target) === ".tgz" || target.endsWith(".tar.gz")) {
    const result = spawnSync("tar", ["-xOf", target, "./safecopy-manifest.json"], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`Could not read manifest from archive: ${result.stderr || result.stdout}`);
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
