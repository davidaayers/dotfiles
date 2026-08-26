#!/usr/bin/env bash
MONTH=$(date +%Y-%m)
MTD=$(/Users/david.ayers/.volta/bin/ccusage monthly 2>/dev/null \
  | grep "│ $MONTH" | head -1 | grep -oE '\$[0-9,]+\.[0-9]+')

/Users/david.ayers/.volta/bin/ccusage statusline "$@" \
  | sed 's| / \$[0-9.]* block ([^)]*)||' \
  | sed 's/ session//' \
  | sed "s/ today/ ${MTD:+| 📅 $MTD}/" 2>/dev/null \
  || true
