export function normalizePath(path: string): string {
  return path.replace(/\\\\/g, "/").replace(/^\.\//, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

export function globToRegExp(glob: string): RegExp {
  let source = "^";
  const chars = normalizePath(glob).split("");
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    const next = chars[i + 1];
    if (char === "*" && next === "*") {
      const after = chars[i + 2];
      if (after === "/") {
        source += "(?:.*/)?";
        i += 2;
      } else {
        source += ".*";
        i += 1;
      }
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegex(char);
    }
  }
  source += "$";
  return new RegExp(source);
}

export function matchesAny(path: string, patterns: string[]): string | undefined {
  const normalized = normalizePath(path);
  return patterns.find((pattern) => globToRegExp(pattern).test(normalized));
}
