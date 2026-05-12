#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

node "$ROOT_DIR/dist/src/cli.js" plan --root "$ROOT_DIR/fixtures/demo" > "$TMP_DIR/plan.txt"
grep -q "README.md" "$TMP_DIR/plan.txt"

node "$ROOT_DIR/dist/src/cli.js" pack --root "$ROOT_DIR/fixtures/demo" --out "$TMP_DIR/demo.tgz" --force > "$TMP_DIR/pack.txt"
test -s "$TMP_DIR/demo.tgz"

node "$ROOT_DIR/dist/src/cli.js" inspect --bundle "$TMP_DIR/demo.tgz" --json > "$TMP_DIR/manifest.json"
grep -q '"redactions"' "$TMP_DIR/manifest.json"

tar -xOf "$TMP_DIR/demo.tgz" ./secrets.txt > "$TMP_DIR/secrets.txt"
grep -q "REDACTED" "$TMP_DIR/secrets.txt"
! grep -q "demo-secret-value" "$TMP_DIR/secrets.txt"

echo "safecopy smoke ok"
