# safecopy

Deterministic, local-first project context bundles that copy the useful bits and leave sensitive files behind.

`safecopy` is a TypeScript CLI for preparing source bundles for agents, reviewers, support tickets, or bug reports. It plans what will be copied, applies deny globs and `.gitignore`, redacts secret-looking text, writes manifests, and never uploads anything.

## Install

```sh
npm install -g safecopy
```

For local development:

```sh
npm install
npm run build
node dist/src/cli.js help
```

## Quick start

Preview a bundle:

```sh
safecopy plan --root ./my-project
```

Create an archive:

```sh
safecopy pack --root ./my-project --out ./my-project.safe.tgz
```

`pack` refuses to overwrite an existing archive or directory. Pass `--force`
to replace the target; archive replacements are installed only after the new
archive is created successfully.

Inspect a bundle later:

```sh
safecopy inspect --bundle ./my-project.safe.tgz
```

## What gets protected

Built-in deny patterns skip common high-risk or noisy paths:

- `.git/**`, `node_modules/**`, `dist/**`, `coverage/**`
- `.env`, `.env.*`, keys and cert-like files
- caches, logs, SQLite/database files
- anything over `maxFileBytes`

Text files are scanned with configurable redaction rules. Redactions are visible placeholders such as `[REDACTED:GITHUB_TOKEN]`; safecopy does not silently mutate source files.

## Config

Create `safecopy.config.json` at the project root:

```json
{
  "include": ["**/*"],
  "deny": ["private/**", "tmp/**"],
  "maxFileBytes": 524288,
  "redact": [
    {
      "name": "internal-ticket",
      "pattern": "TICKET-[0-9]+",
      "placeholder": "[REDACTED:TICKET]"
    }
  ]
}
```

Project deny patterns are added to the built-in safety defaults. `.gitignore` patterns are respected for straightforward ignored files and folders.

## Outputs

Every bundle includes:

- `safecopy-manifest.json` — deterministic machine-readable file list, hashes, skips, and redaction counts
- `safecopy-manifest.md` — human summary
- copied files with redactions applied where needed

## Verify

```sh
npm test
npm run check
npm run build
npm run smoke
npm run package:smoke
npm run release:check
bash scripts/validate.sh
```

`npm run release:check` runs the test suite, type check, build, CLI smoke, and
package smoke gate used before release promotion.

## Philosophy

Local-first means local-first: no telemetry, no cloud upload, no background services. The tool is deliberately boring about data movement so sharing context can be safer and repeatable.

## License

MIT
