import { createHash } from "node:crypto";
import { basename } from "node:path";
import type { FileManifestEntry, SafeCopyManifest, SafeCopyPlan, SkippedFile } from "./types.js";

export function sha256(buffer: Buffer | string): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function createManifest(plan: SafeCopyPlan, files: FileManifestEntry[], createdAt = "1970-01-01T00:00:00.000Z"): SafeCopyManifest {
  const redactedFiles = files.filter((file) => file.redactions.length > 0).length;
  const redactions = files.reduce((sum, file) => sum + file.redactions.reduce((inner, hit) => inner + hit.count, 0), 0);
  return {
    schemaVersion: 1,
    tool: "safecopy",
    createdAt,
    rootName: basename(plan.root),
    files: files.slice().sort((a, b) => a.path.localeCompare(b.path, "en")),
    skipped: summarizeSkipped(plan.skipped),
    totals: {
      files: files.length,
      skipped: plan.skipped.length,
      bytes: files.reduce((sum, file) => sum + file.copiedBytes, 0),
      redactedFiles,
      redactions
    }
  };
}

function summarizeSkipped(skipped: SkippedFile[]): SafeCopyManifest["skipped"] {
  return skipped
    .map(({ path, size, reason }) => ({ path, size, reason }))
    .sort((a, b) => a.path.localeCompare(b.path, "en"));
}

export function manifestMarkdown(manifest: SafeCopyManifest): string {
  const lines = [
    "# safecopy manifest",
    "",
    `- Files copied: ${manifest.totals.files}`,
    `- Files skipped: ${manifest.totals.skipped}`,
    `- Redactions: ${manifest.totals.redactions}`,
    `- Bytes copied: ${manifest.totals.bytes}`,
    "",
    "## Included files"
  ];
  for (const file of manifest.files) lines.push(`- ${file.path} (${file.copiedBytes} bytes, ${file.redactions.length} redaction rule hits)`);
  lines.push("", "## Skipped files");
  for (const file of manifest.skipped) lines.push(`- ${file.path}: ${file.reason}`);
  return `${lines.join("\n")}\n`;
}
