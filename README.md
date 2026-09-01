# safecopy

Deterministic, local-first project context bundles that copy the useful bits and leave sensitive files behind.

`safecopy` is a TypeScript CLI for preparing source bundles for agents, reviewers, support tickets, or bug reports. It plans what will be copied, applies deny globs and `.gitignore`, redacts secret-looking text, writes manifests, and never uploads anything.

## Install

The `safecopy` package is not published to the npm registry yet. Install the
current CLI from its GitHub source:

```sh
git clone https://github.com/rogerchappel/safecopy.git
cd safecopy
npm ci
npm run build
npm install --global .
safecopy help
```

To run it only inside the checkout instead of installing the command globally:

```sh
node dist/src/cli.js help
```

After the first npm release, `npm install --global safecopy` will become the
short registry installation path. Until then, that command returns an npm 404.

## Quick start

Preview a bundle:

```sh
safecopy plan --root ./my-project
```

Create an archive:

```sh
safecopy pack --root ./my-project --out ./my-project.safe.tgz
```

`--out` is optional and defaults to `safecopy-bundle.tgz`. Options that take
values (`--root`, `--config`, `--out`, `--bundle`, and `--path`) require the
value immediately after the option. Boolean flags such as `--json`, `--force`,
and `--directory` do not take values. Unknown options and positional arguments
are rejected.

`pack` refuses to overwrite an existing archive or directory. Pass `--force`
to replace the target; archive replacements are installed only after the new
archive is created successfully.

Inspect a bundle later:

```sh
safecopy inspect --bundle ./my-project.safe.tgz
```

`inspect --path ./my-project.safe.tgz` is an equivalent form. Run `safecopy
help`, `safecopy --help`, or any command with `--help` to see accepted forms.

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

Project deny patterns are added to the built-in safety defaults. Simple `.gitignore` patterns are evaluated in order, including slashless file-or-directory names at any depth and `!` rules that re-include a previously ignored file. Re-inclusion never overrides built-in or configured safety denies; complex negation semantics are not fully implemented.

Configuration is validated when it is loaded. The root must be a JSON object;
`include` and `deny` must be arrays of strings; `maxFileBytes` must be a finite,
non-negative number; and `redact` must be an array of rules with string
`name`, `pattern`, and `placeholder` fields (plus optional string `flags`).
Patterns and flags must form a valid JavaScript regular expression. Invalid
configuration exits with an error naming the config path and failing field.

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
npm run install:smoke
npm run package:smoke
npm run release:check
bash scripts/validate.sh
```

`npm run release:check` runs the test suite, type check, build, CLI smoke,
packed-artifact installation smoke, and package and release-workflow gates used
before release promotion. The install smoke puts the packed artifact in an
isolated npm prefix and verifies that its `safecopy help` command runs.

## Releases

A `v*.*.*` tag runs the release checks, creates one npm tarball, and publishes
that exact artifact to npm using trusted publishing. The workflow then attaches
the same tarball to the matching GitHub release. The pull request release dry
run likewise packs once and executes `npm publish <tarball> --dry-run --access
public`, so package publication is checked before a tag is created. Only after
that first successful npm publication is `npm install --global safecopy` a
valid registry installation command; the GitHub source path above is the
supported installation path today.

## Philosophy

Local-first means local-first: no telemetry, no cloud upload, no background services. The tool is deliberately boring about data movement so sharing context can be safer and repeatable.

## License

MIT
