import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { globToRegExp, normalizePath } from "./glob.js";

export interface GitignorePattern {
  pattern: string;
  negated: boolean;
}

export function loadGitignorePatterns(root: string): GitignorePattern[] {
  const path = resolve(root, ".gitignore");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => {
      const negated = line.startsWith("!");
      const clean = (negated ? line.slice(1) : line).replace(/^\//, "");
      const pattern = clean.endsWith("/") ? `${clean}**` : !clean.includes("/") ? `**/${clean}` : clean;
      return { pattern, negated };
    });
}

export function ignoredByGitignore(path: string, patterns: GitignorePattern[]): string | undefined {
  const normalized = normalizePath(path);
  let ignoredBy: string | undefined;
  for (const entry of patterns) {
    if (!globToRegExp(entry.pattern).test(normalized)) continue;
    ignoredBy = entry.negated ? undefined : entry.pattern;
  }
  return ignoredBy;
}
