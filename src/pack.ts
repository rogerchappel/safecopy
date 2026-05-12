import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createManifest, manifestMarkdown, sha256 } from "./manifest.js";
import { createPlan } from "./planner.js";
import { redactText } from "./redact.js";
import type { FileManifestEntry, OutputMode, SafeCopyManifest, SafeCopyPlan } from "./types.js";

export interface PackOptions {
  root: string;
  out: string;
  mode?: OutputMode;
  configPath?: string;
  force?: boolean;
}

export interface PackResult {
  plan: SafeCopyPlan;
  manifest: SafeCopyManifest;
  outputPath: string;
}

export function pack(options: PackOptions): PackResult {
  const plan = createPlan({ root: options.root, configPath: options.configPath });
  const mode = options.mode ?? (options.out.endsWith(".tgz") || options.out.endsWith(".tar.gz") ? "tgz" : "directory");
  const outputPath = resolve(options.out);
  const staging = mode === "directory" ? outputPath : `${outputPath}.staging`;
  if (options.force) rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });

  const files: FileManifestEntry[] = [];
  for (const file of plan.included) {
    const source = readFileSync(file.absolutePath);
    const redacted = file.text ? redactText(source.toString("utf8"), plan.config.redact) : { content: source, hits: [] };
    const output = typeof redacted.content === "string" ? Buffer.from(redacted.content) : redacted.content;
    const destination = resolve(staging, file.path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, output);
    files.push({ path: file.path, size: file.size, copiedBytes: output.length, sha256: sha256(output), redactions: redacted.hits });
  }

  const manifest = createManifest(plan, files);
  writeFileSync(resolve(staging, "safecopy-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(resolve(staging, "safecopy-manifest.md"), manifestMarkdown(manifest));

  if (mode === "tgz") {
    if (options.force) rmSync(outputPath, { force: true });
    const result = spawnSync("tar", ["--sort", "name", "--mtime", "1970-01-01", "-czf", outputPath, "-C", staging, "."], { encoding: "utf8" });
    rmSync(staging, { recursive: true, force: true });
    if (result.status !== 0) throw new Error(`tar failed: ${result.stderr || result.stdout}`);
  }

  return { plan, manifest, outputPath };
}
