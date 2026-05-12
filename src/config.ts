import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_CONFIG } from "./defaults.js";
import type { SafeCopyConfig } from "./types.js";

export const CONFIG_FILENAMES = ["safecopy.config.json", ".safecopy.json"];

export function findConfig(root: string, explicitPath?: string): string | undefined {
  if (explicitPath) return resolve(root, explicitPath);
  for (const name of CONFIG_FILENAMES) {
    const candidate = resolve(root, name);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

export function loadConfig(root: string, explicitPath?: string): SafeCopyConfig {
  const configPath = findConfig(root, explicitPath);
  if (!configPath) return {
    include: [...DEFAULT_CONFIG.include],
    deny: [...DEFAULT_CONFIG.deny],
    maxFileBytes: DEFAULT_CONFIG.maxFileBytes,
    redact: DEFAULT_CONFIG.redact.map((rule) => ({ ...rule }))
  };
  const raw = JSON.parse(readFileSync(configPath, "utf8")) as Partial<SafeCopyConfig>;
  return {
    include: raw.include ?? DEFAULT_CONFIG.include,
    deny: [...DEFAULT_CONFIG.deny, ...(raw.deny ?? [])],
    maxFileBytes: raw.maxFileBytes ?? DEFAULT_CONFIG.maxFileBytes,
    redact: [...DEFAULT_CONFIG.redact, ...(raw.redact ?? [])]
  };
}
