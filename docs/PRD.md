# safecopy PRD

Status: in-progress

## Summary

`safecopy` builds a shareable project bundle for agents, reviewers, or bug reports while applying deterministic deny globs, size limits, and text redaction. It is “copy this repo, but don’t leak the dragon eggs.” 🐉

## Problem

Developers often need to hand project context to agents or collaborators, but raw archives can include secrets, caches, node_modules, private notes, or huge binary blobs.

## Users

- Developers sending repo context to local/remote agents.
- Maintainers preparing minimal reproduction bundles.
- Teams wanting repeatable context packs with safety boundaries.

## Goals

- Create deterministic `.tar.gz` or directory bundles from a repo.
- Respect `.gitignore`, built-in deny patterns, and project config.
- Redact secret-looking text with visible placeholders.
- Emit a manifest showing included, skipped, and redacted files.
- Provide useful CLI examples and fixture-backed tests.

## Non-goals

- Perfect secret detection.
- Cloud upload or telemetry.
- Binary diffing or backup semantics.

## V1 requirements

- TypeScript CLI commands: `plan`, `pack`, `inspect`.
- Config `safecopy.config.json` with include/deny globs, max bytes, redaction rules.
- Deterministic manifest JSON plus human Markdown summary.
- Fixture repo with ignored files, fake secrets, and binaries.
- Tests for glob planning, redaction, manifest, and archive creation.

## Safety

- Built-in denies for `.git`, `node_modules`, `.env*`, key files, caches, and large binaries.
- Redaction preview before writing archive.
- Never uploads; local files only.

## Attribution

Inspired by git archive, bug reproduction bundles, and agent context pack workflows; reframed as a local-first safety wrapper for sharing source context.
