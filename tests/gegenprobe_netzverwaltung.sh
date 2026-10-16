#!/usr/bin/env bash
# Gegenprobe zur NETZ-VERWALTUNG (Sage Modul 23b, S5b Teil 2, 2026-10-16):
# wird tests/smoke_netzverwaltung.mjs auch WIRKLICH rot?
#
#   bash tests/gegenprobe_netzverwaltung.sh
#
# ⚠ SIE SABOTIERT NIE DEN ECHTEN BAUM. Jeder Fall läuft in einer Wegwerf-Kopie
# unter mktemp (node_modules nur verlinkt). Der echte Baum bleibt unberührt —
# ein Commit während des Laufs kann keine Sabotage mitnehmen (Sage LEHREN § 10).
#
# Drei Ausgänge je Fall: schlägt an · BLIND (Probe blieb grün) ·
# TOTER ANKER (die Sabotage traf gar nicht — der Eingriff hat nichts geändert).

set -u
cd "$(dirname "$0")/.."
ECHT="$(pwd)"
WURF="$(mktemp -d "${GP_TMP:-/tmp}/gp_netzverwaltung.XXXXXX")"
trap 'rm -rf "$WURF"' INT TERM EXIT

gruen=0; blind=0; tot=0

kopie() {
  rm -rf "$WURF/baum"; mkdir -p "$WURF/baum"
  ( cd "$ECHT" && tar --exclude=./node_modules --exclude=./.git -cf - . ) | ( cd "$WURF/baum" && tar -xf - )
  [ -d "$ECHT/node_modules" ] && ln -s "$ECHT/node_modules" "$WURF/baum/node_modules"
}

# fall <Beschreibung> <Datei> <alt> <neu>
fall() {
  local was="$1" datei="$2" alt="$3" neu="$4"
  kopie
  ALT="$alt" NEU="$neu" python3 - "$WURF/baum/$datei" <<'PY'
import os, sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
a, n = os.environ["ALT"], os.environ["NEU"]
if s.count(a) != 1:
    sys.exit(9)
open(p, "w", encoding="utf-8").write(s.replace(a, n, 1))
PY
  if [ $? -eq 9 ]; then echo "  ✗ TOTER ANKER: $was"; tot=$((tot + 1)); return; fi
  if node "$WURF/baum/tests/smoke_netzverwaltung.mjs" >/dev/null 2>&1; then
    echo "  ✗ BLIND: $was — die Probe blieb grün"; blind=$((blind + 1))
  else
    echo "  ✓ schlägt an: $was"; gruen=$((gruen + 1))
  fi
}

echo "═══ Ausgangslage (echter Baum, nur gelesen) ═══"
if node tests/smoke_netzverwaltung.mjs >/dev/null 2>&1; then echo "  ✓ smoke_netzverwaltung.mjs grün"
else echo "  ✗ smoke_netzverwaltung.mjs ist SCHON ROT — kein Fall misst etwas."; exit 2; fi

echo
echo "═══ Fälle (je in einer Wegwerf-Kopie) ═══"
fall "normEntry wirft nodeId weg (Positivliste ohne das Feld)" assets/studio-markt.js \
     '    if (nid) o.nodeId = nid;' \
     ''
fall "normEntry lässt jede Kennung durch, auch ungültige" assets/studio-markt.js \
     '  function cleanNodeId(v) { v = String(v == null ? "" : v).trim(); return NODE_ID_RE.test(v) ? v : ""; }' \
     '  function cleanNodeId(v) { return String(v == null ? "" : v).trim(); }'
fall "die Studio-Liste setzt den Namen unescaped ein" assets/studio-markt.js \
     "'<div class=\"fpst-item__b\"><b>' + esc(e.label) + '</b>'" \
     "'<div class=\"fpst-item__b\"><b>' + e.label + '</b>'"
fall "„Kennung passt nicht“ wird nicht mehr unterschieden" assets/studio-markt.js \
     '    if (st === "andere-kennung") return T("spc_other");' \
     ''
fall "die Kennung wird nicht mehr aus der Spore vorgeschlagen" assets/studio-markt.js \
     '          feld.value = cleanNodeId(r.id);' \
     ''
fall "das Ergebnis geht als innerHTML ins DOM" assets/studio-markt.js \
     '        out.textContent = t;' \
     '        out.innerHTML = t + "<img src=x>";'
fall "der Knopf öffnet ein neues Fenster statt im selben Tab" assets/studio-markt.js \
     '    location.href = "netz-verwaltung.html";' \
     '    window.open("netz-verwaltung.html", "_blank");'
fall "die Seite lädt Modul 23b nicht" netz-verwaltung.html \
     '  <script src="sbkim/23b_netzverwaltung.js"></script>' \
     ''
fall "die Seite fragt beim Laden eine fremde Adresse an" netz-verwaltung.html \
     '</body>' \
     '<script>fetch("https://example.org/probe").catch(function(){});</script></body>'
fall "die Seite verliert ihre Schublade (falsche Identität)" netz-verwaltung.html \
     '<script>window.SBKIM_DB_SUFFIX="familyprojekt";</script>' \
     ''

echo
echo "$gruen schlagen an · $blind blind · $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$tot" -eq 0 ]
