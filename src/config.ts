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
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid config at ${configPath}: malformed JSON (${detail})`);
  }
  validateConfig(raw, configPath);
  return {
    include: raw.include ?? DEFAULT_CONFIG.include,
    deny: [...DEFAULT_CONFIG.deny, ...(raw.deny ?? [])],
    maxFileBytes: raw.maxFileBytes ?? DEFAULT_CONFIG.maxFileBytes,
    redact: [...DEFAULT_CONFIG.redact, ...(raw.redact ?? [])]
  };
}

function validateConfig(value: unknown, configPath: string): asserts value is Partial<SafeCopyConfig> {
  if (!isRecord(value)) fail(configPath, "root", "must be a JSON object");
  validateStringArray(value.include, configPath, "include");
  validateStringArray(value.deny, configPath, "deny");
  if (value.maxFileBytes !== undefined &&
      (typeof value.maxFileBytes !== "number" || !Number.isFinite(value.maxFileBytes) || value.maxFileBytes < 0)) {
    fail(configPath, "maxFileBytes", "must be a finite non-negative number");
  }
  if (value.redact !== undefined) {
    if (!Array.isArray(value.redact)) fail(configPath, "redact", "must be an array");
    value.redact.forEach((rule, index) => validateRedactionRule(rule, configPath, `redact[${index}]`));
  }
}

function validateStringArray(value: unknown, configPath: string, field: string): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) fail(configPath, field, "must be an array of strings");
  value.forEach((entry, index) => {
    if (typeof entry !== "string") fail(configPath, `${field}[${index}]`, "must be a string");
  });
}

function validateRedactionRule(value: unknown, configPath: string, field: string): void {
  if (!isRecord(value)) fail(configPath, field, "must be an object");
  if (typeof value.name !== "string") fail(configPath, `${field}.name`, "must be a string");
  if (typeof value.pattern !== "string") fail(configPath, `${field}.pattern`, "must be a string");
  if (typeof value.placeholder !== "string") fail(configPath, `${field}.placeholder`, "must be a string");
  if (value.flags !== undefined && typeof value.flags !== "string") {
    fail(configPath, `${field}.flags`, "must be a string");
  }
  const flags = value.flags as string | undefined;
  if (flags !== undefined) {
    try {
      new RegExp("", flags);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      fail(configPath, `${field}.flags`, `must be valid regular expression flags (${detail})`);
    }
  }
  try {
    new RegExp(value.pattern, flags);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(configPath, `${field}.pattern`, `must be a valid regular expression (${detail})`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(configPath: string, field: string, message: string): never {
  throw new Error(`Invalid config at ${configPath}: ${field} ${message}`);
}
