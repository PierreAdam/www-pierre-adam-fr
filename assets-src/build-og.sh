#!/usr/bin/env bash
# Render og.html to ../og-image.png (1200x630) and favicon.svg to ../favicon-180.png with headless Edge.
set -euo pipefail
cd "$(dirname "$0")"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"

# shot <html file> <width> <height> <output png>
shot() {
  # fresh profile each time, otherwise Edge hands the job to an already running instance
  local profile; profile="$(mktemp -d)"
  rm -f "$4"
  "$EDGE" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$(cygpath -w "$profile")" \
    --window-size="$2,$3" --screenshot="$(cygpath -w "$PWD/$4")" "file:///$(cygpath -m "$PWD/$1")" 2>/dev/null || true
  # the Windows launcher returns early: wait for the file
  for _ in $(seq 60); do [ -s "$4" ] && break; sleep 0.5; done
  [ -s "$4" ] || { echo "failed to render $4" >&2; exit 1; }
  echo "rendered $4"
  sleep 1; rm -rf "$profile" 2>/dev/null || true
}

shot og.html 1200 630 ../og-image.png

printf '<html><body style="margin:0;background:#0a0e14"><img src="../favicon.svg" width="180" height="180"></body></html>' > favicon.tmp.html
shot favicon.tmp.html 180 180 ../favicon-180.png
rm -f favicon.tmp.html
