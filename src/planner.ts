import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { fileSize, looksText, relativeUnix, walkFiles } from "./fs.js";
import { loadGitignorePatterns } from "./gitignore.js";
import { matchesAny } from "./glob.js";
import type { PlanOptions, SafeCopyPlan } from "./types.js";

export function createPlan(options: PlanOptions): SafeCopyPlan {
  const root = resolve(options.root);
  const config = loadConfig(root, options.configPath);
  const gitignore = loadGitignorePatterns(root);
  const deny = [...config.deny, ...gitignore];
  const included = [];
  const skipped = [];

  for (const absolutePath of walkFiles(root)) {
    const path = relativeUnix(root, absolutePath);
    const size = fileSize(absolutePath);
    const deniedBy = matchesAny(path, deny);
    const includedBy = matchesAny(path, config.include);
    if (deniedBy) {
      skipped.push({ path, absolutePath, size, reason: `denied by ${deniedBy}` });
      continue;
    }
    if (!includedBy) {
      skipped.push({ path, absolutePath, size, reason: "not matched by include globs" });
      continue;
    }
    if (size > config.maxFileBytes) {
      skipped.push({ path, absolutePath, size, reason: `larger than maxFileBytes (${config.maxFileBytes})` });
      continue;
    }
    const text = looksText(readFileSync(absolutePath));
    included.push({ path, absolutePath, size, text });
  }

  return { root, config: { ...config, deny }, included, skipped };
}
