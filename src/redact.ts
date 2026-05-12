import type { RedactionHit, RedactionRule } from "./types.js";

export interface RedactionResult {
  content: string;
  hits: RedactionHit[];
}

export function redactText(content: string, rules: RedactionRule[]): RedactionResult {
  let output = content;
  const hits: RedactionHit[] = [];
  for (const rule of rules) {
    const flags = normalizeFlags(rule.flags ?? "g");
    const regex = new RegExp(rule.pattern, flags);
    let count = 0;
    output = output.replace(regex, (...args: unknown[]) => {
      count += 1;
      return expandPlaceholder(rule.placeholder, args);
    });
    if (count > 0) hits.push({ rule: rule.name, count });
  }
  return { content: output, hits };
}

function normalizeFlags(flags: string): string {
  return Array.from(new Set((flags.includes("g") ? flags : `${flags}g`).split(""))).join("");
}

function expandPlaceholder(template: string, args: unknown[]): string {
  return template.replace(/\$(\d+)/g, (_, group: string) => String(args[Number(group)] ?? ""));
}
