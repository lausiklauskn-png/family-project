#!/usr/bin/env sh
# Family Projekt — Auto-Deploy (Server-seitiger Selbst-Updater).
#
# Holt den aktuellen main-Stand und schaltet ihn live. Caddy liefert statisch
# aus (kein Reload nötig). Bewusst `fetch + reset --hard`: das Verzeichnis ist
# ein reines Deploy-Ziel ohne lokale Änderungen — so kann ein Pull nie an einem
# schmutzigen Arbeitsbaum scheitern.
#
# Einsatz: einmalig per Cron alle paar Minuten (siehe deploy/AUTO_DEPLOY.md).
set -eu

DIR="${FAMILY_DIR:-/srv/family-project}"
LOG="${FAMILY_DEPLOY_LOG:-/tmp/family-deploy.log}"

cd "$DIR"
before="$(git rev-parse HEAD 2>/dev/null || echo none)"
git fetch origin main --quiet
git reset --hard origin/main --quiet
after="$(git rev-parse HEAD)"

if [ "$before" != "$after" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') deploy ${before} -> ${after}" >> "$LOG"
fi
