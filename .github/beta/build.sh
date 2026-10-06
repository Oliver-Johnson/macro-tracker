#!/usr/bin/env bash
# Builds the beta.macroslog.co.uk site from a checkout of the beta branch.
# Usage: build.sh <source-dir> <output-dir> <build-number>
#
# The beta branch keeps the main app's domain, manifest and version format so
# merges with master stay clean. This script swaps in the beta's own CNAME and
# manifest and stamps a "-beta" version, so none of that ever lands on master.
set -euo pipefail

src=$1
out=$2
build=$3
here=$(cd "$(dirname "$0")" && pwd)

# Date of publish plus the workflow run number: always increases, so the
# in-app "Check for Updates" and the service worker both see each publish as new.
version="$(date -u +%Y-%m-%d).${build}"

for f in index.html sw.js icon-192.svg icon-512.svg .nojekyll; do
  cp "$src/$f" "$out/$f"
done
cp "$here/CNAME" "$here/manifest.json" "$out/"

# Replace a pattern that must occur exactly once, so a change to the app that
# moves one of these lines fails the publish instead of shipping it unstamped.
replace_once() {
  local file=$1 pattern=$2 replacement=$3
  local count
  count=$(PAT="$pattern" perl -ne '$c += () = /$ENV{PAT}/g; END { print $c + 0 }' "$file")
  if [ "$count" != "1" ]; then
    echo "::error::expected exactly one match for /$pattern/ in $file, found $count"
    exit 1
  fi
  PAT="$pattern" REP="$replacement" perl -pi -e 's/$ENV{PAT}/$ENV{REP}/' "$file"
}

replace_once "$out/index.html" 'Version \d{4}-\d{2}-\d{2}\.\d+' "Version ${version}-beta"
replace_once "$out/index.html" 'New features launch on <a href="https://beta\.macroslog\.co\.uk"[^>]*>beta\.macroslog\.co\.uk</a> first' \
  "You're on the beta. The stable app is at <a href=\"https://macroslog.co.uk\" target=\"_blank\" style=\"color:var(--accent);text-decoration:none\">macroslog.co.uk</a>"
replace_once "$out/sw.js" "const CACHE_NAME = '[^']*';" "const CACHE_NAME = 'macro-tracker-beta-${version}';"
replace_once "$out/sw.js" "const APP_VERSION = '[^']*';" "const APP_VERSION = 'beta-${version}';"

echo "Built beta ${version}"
