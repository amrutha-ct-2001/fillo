#!/usr/bin/env bash
# Lists places that still use the old look instead of the design system.
# Usage: scripts/check-theme.sh [file-or-folder ...]   (default: src)
# Exits 1 when it finds anything (the old look is gone, so keep it that way).
# Pass --warn to report without failing.
set -u
cd "$(dirname "$0")/.."

strict=1
paths=()
for a in "$@"; do
  if [ "$a" = "--warn" ]; then strict=0; else paths+=("$a"); fi
done
[ ${#paths[@]} -eq 0 ] && paths=(src)

# Files that define the tokens, or tests, are allowed to contain raw values.
exclude=(--exclude-dir=__tests__ --exclude=tokens.ts)

total=0
check() {
  local label="$1" pattern="$2"
  local out
  out=$(grep -rnE "${exclude[@]}" --include='*.ts' --include='*.tsx' -e "$pattern" "${paths[@]}" 2>/dev/null \
    | grep -v 'src/theme/' | grep -v 'src/components/Icon.tsx')
  if [ -n "$out" ]; then
    local n; n=$(echo "$out" | wc -l | tr -d ' ')
    echo "== $label ($n)"
    echo "$out" | sed 's/^/   /'
    total=$((total + n))
  fi
}

check "raw hex colours (use useTheme())"        "['\"]#[0-9a-fA-F]{3,8}['\"]"
check "old theme import (use theme/tokens + useTheme)" "from '(\.\./)+theme'|from '\./theme'"
check "raw shadows / elevation (spread shadow.card / shadow.raised)" "shadowColor|shadowOpacity|shadowRadius|shadowOffset|elevation:"
check "fontWeight (name the font file in the type style)" "fontWeight"
check "raw radius above 8 (use radius tokens)"     "[rR]adius: *(9|[1-9][0-9]+)\b"
check "low-opacity pressed/disabled states"      "opacity: *0\.[0-9]"
check "local formatInr (use utils/format)"       "^(const|function) formatInr"

echo
if [ "$total" -eq 0 ]; then
  echo "check-theme: clean"
else
  echo "check-theme: $total finding(s)"
  [ "$strict" -eq 1 ] && exit 1
fi
exit 0
