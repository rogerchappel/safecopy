import { Dirent, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { normalizePath } from "./glob.js";

export function walkFiles(root: string): string[] {
  const results: string[] = [];
  const visit = (dir: string): void => {
    const entries = readdirSync(dir, { withFileTypes: true }).sort(compareDirent);
    for (const entry of entries) {
      const absolute = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) visit(absolute);
      if (entry.isFile()) results.push(absolute);
    }
  };
  visit(root);
  return results;
}

function compareDirent(a: Dirent, b: Dirent): number {
  return a.name.localeCompare(b.name, "en");
}

export function relativeUnix(root: string, path: string): string {
  return normalizePath(relative(root, path));
}

export function fileSize(path: string): number {
  return statSync(path).size;
}

export function looksText(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  return !sample.includes(0);
}
