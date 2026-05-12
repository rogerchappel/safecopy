import type { SafeCopyPlan } from "./types.js";

export function formatPlan(plan: SafeCopyPlan): string {
  const lines = [
    `safecopy plan for ${plan.root}`,
    `include: ${plan.included.length}`,
    `skip: ${plan.skipped.length}`,
    "",
    "Included:"
  ];
  for (const file of plan.included) lines.push(`  + ${file.path} (${file.size} bytes)`);
  lines.push("", "Skipped:");
  for (const file of plan.skipped) lines.push(`  - ${file.path} (${file.reason})`);
  return lines.join("\n");
}
