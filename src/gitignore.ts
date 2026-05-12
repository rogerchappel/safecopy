import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadGitignorePatterns(root: string): string[] {
  const path = resolve(root, ".gitignore");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .filter((line) => !line.startsWith("!"))
    .map((line) => {
      const clean = line.replace(/^\//, "");
      if (clean.endsWith("/")) return `${clean}**`;
      if (!clean.includes("/")) return `**/${clean}`;
      return clean;
    });
}
