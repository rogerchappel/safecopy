#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$ROOT_DIR"
pack_json="$(npm pack --json --pack-destination "$TMP_DIR")"
tarball="$(node -e 'const [pack] = JSON.parse(process.argv[1]); process.stdout.write(pack.filename)' "$pack_json")"

npm install --global --prefix "$TMP_DIR/install" "$TMP_DIR/$tarball"
"$TMP_DIR/install/bin/safecopy" help > "$TMP_DIR/help.txt"
grep -q '^safecopy ' "$TMP_DIR/help.txt"

echo "safecopy packed-install smoke ok"
