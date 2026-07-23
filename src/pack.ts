import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, utimesSync, writeFileSync } from "node:fs";
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
  const archiveStaging = `${outputPath}.staging-archive`;
  if (!options.force && existsSync(outputPath)) {
    throw new Error(`Output already exists: ${outputPath}. Use --force to replace it.`);
  }
  if (!options.force && existsSync(staging)) {
    throw new Error(`Output already exists: ${staging}. Use --force to replace it.`);
  }
  if (options.force) rmSync(staging, { recursive: true, force: true });
  if (mode === "tgz") rmSync(archiveStaging, { force: true });
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
    try {
      touchTree(staging, new Date(0));
      const result = spawnSync("tar", ["-czf", archiveStaging, "-C", staging, "."], { encoding: "utf8", env: { ...process.env, COPYFILE_DISABLE: "1" } });
      if (result.status !== 0) throw new Error(`tar failed: ${result.stderr || result.stdout}`);
      if (options.force) rmSync(outputPath, { force: true });
      renameSync(archiveStaging, outputPath);
    } finally {
      rmSync(staging, { recursive: true, force: true });
      rmSync(archiveStaging, { force: true });
    }
  }

  return { plan, manifest, outputPath };
}

function touchTree(path: string, date: Date): void {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) touchTree(child, date);
    utimesSync(child, date, date);
  }
  utimesSync(path, date, date);
}
