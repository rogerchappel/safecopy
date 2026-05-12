# Contributing

Thanks for helping make project context sharing safer.

## Development

```sh
npm install
npm test
npm run check
npm run build
npm run smoke
```

Use small, reviewable changes. Add fixture-backed tests for behavior that changes planning, redaction, manifests, or archive creation.

## Design rules

- Keep safecopy local-first.
- Do not add telemetry.
- Prefer deterministic output over clever shortcuts.
- Make safety behavior visible in plans and manifests.
- Never modify source files while packing.

## Reporting issues

Please include:

- OS and Node version
- command run
- relevant config (with secrets removed)
- plan or manifest excerpt if safe to share
