#!/usr/bin/env bash
MONTH=$(date +%Y-%m)
MTD=$("$HOME/.volta/bin/ccusage" monthly 2>/dev/null \
  | grep "│ $MONTH" | head -1 | grep -oE '\$[0-9,]+\.[0-9]+')

"$HOME/.volta/bin/ccusage" statusline "$@" \
  | sed 's/\$-/\$/g' \
  | sed 's| / \$[0-9.]* block ([^)]*)||' \
  | sed 's/ session//' \
  | sed "s/ today/ ${MTD:+| 📅 $MTD}/" 2>/dev/null \
  || true
