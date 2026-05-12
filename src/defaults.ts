import type { SafeCopyConfig } from "./types.js";

export const BUILT_IN_DENY = [
  ".git/**",
  "node_modules/**",
  "dist/**",
  "coverage/**",
  ".DS_Store",
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*.p12",
  "*.sqlite",
  "*.sqlite3",
  "*.db",
  "*.log",
  ".cache/**",
  ".next/**",
  ".turbo/**"
];

export const DEFAULT_REDACTIONS = [
  {
    name: "generic-secret-assignment",
    pattern: "(api[_-]?key|token|secret|password)(\\s*[=:]\\s*)['\"]?([^'\"\\s]+)['\"]?",
    placeholder: "$1$2[REDACTED:$1]",
    flags: "gi"
  },
  {
    name: "aws-access-key",
    pattern: "AKIA[0-9A-Z]{16}",
    placeholder: "[REDACTED:AWS_ACCESS_KEY]"
  },
  {
    name: "github-token",
    pattern: "gh[pousr]_[A-Za-z0-9_]{20,}",
    placeholder: "[REDACTED:GITHUB_TOKEN]"
  }
];

export const DEFAULT_CONFIG: SafeCopyConfig = {
  include: ["**/*"],
  deny: BUILT_IN_DENY,
  maxFileBytes: 512 * 1024,
  redact: DEFAULT_REDACTIONS
};
