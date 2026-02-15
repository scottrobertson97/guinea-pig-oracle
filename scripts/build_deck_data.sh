#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DECK_JSON="${1:-$ROOT_DIR/deck.json}"
OUTPUT_JS="${2:-$ROOT_DIR/deck-data.js}"

if [[ ! -f "$DECK_JSON" ]]; then
  echo "Deck file not found: $DECK_JSON" >&2
  exit 1
fi

{
  printf '// Auto-generated from %s\n' "${DECK_JSON##*/}"
  printf 'window.ORACLE_DECK = '
  cat "$DECK_JSON"
  printf ';\n'
} > "$OUTPUT_JS"

echo "Wrote $OUTPUT_JS"
