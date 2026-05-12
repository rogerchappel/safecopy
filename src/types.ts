export type OutputMode = "directory" | "tgz";

export interface RedactionRule {
  name: string;
  pattern: string;
  placeholder: string;
  flags?: string;
}

export interface SafeCopyConfig {
  include: string[];
  deny: string[];
  maxFileBytes: number;
  redact: RedactionRule[];
}

export interface PlanOptions {
  root: string;
  configPath?: string;
}

export interface PlannedFile {
  path: string;
  absolutePath: string;
  size: number;
  reason?: string;
  text: boolean;
}

export interface SkippedFile {
  path: string;
  absolutePath: string;
  size: number;
  reason: string;
}

export interface RedactionHit {
  rule: string;
  count: number;
}

export interface FileManifestEntry {
  path: string;
  size: number;
  copiedBytes: number;
  sha256: string;
  redactions: RedactionHit[];
}

export interface SafeCopyPlan {
  root: string;
  config: SafeCopyConfig;
  included: PlannedFile[];
  skipped: SkippedFile[];
}

export interface SafeCopyManifest {
  schemaVersion: 1;
  tool: "safecopy";
  createdAt: string;
  rootName: string;
  files: FileManifestEntry[];
  skipped: Array<Pick<SkippedFile, "path" | "size" | "reason">>;
  totals: {
    files: number;
    skipped: number;
    bytes: number;
    redactedFiles: number;
    redactions: number;
  };
}
