# Safety model

`safecopy` reduces accidental context leaks, but it is not a perfect secret scanner.

## Guarantees

- All work is local.
- No telemetry, upload, network sync, or remote API calls.
- Source files are never modified.
- Bundles include manifests with copied, skipped, and redacted files.

## Limits

- Redaction is pattern-based and best-effort.
- Binary files are copied or skipped; they are not deeply inspected.
- Complex `.gitignore` negation rules are intentionally not fully implemented yet.

## Recommended workflow

1. Run `safecopy plan` first.
2. Review skipped files and redaction counts.
3. Pack to a temporary path.
4. Inspect the manifest before sharing.
5. Delete bundles when they are no longer needed.
