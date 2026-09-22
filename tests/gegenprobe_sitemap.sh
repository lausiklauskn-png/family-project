#!/usr/bin/env bash
# Gegenprobe zur gebauten Sitemap (2026-09-22).
#
# Ein Waechter ohne Gegenprobe ist nur ein gruener Haken. Neun Fehler, und
# jeder MUSS `tests/smoke_sitemap.mjs` umwerfen.
#
#   bash tests/gegenprobe_sitemap.sh
#
# Sabotiert den echten Baum und legt alles zurueck, auch beim Abbruch.
# Wer abbricht, nimmt TERM (nicht KILL) und sieht danach mit `git status` nach.

set -u
cd "$(dirname "$0")/.."

SICH="/tmp/gp_sitemap.$$"; mkdir -p "$SICH"
DATEIEN=(sitemap.xml tools/sitemap-bauen.mjs impressum.html sicherheit.html index.html .github/workflows/vektoren-taeglich.yml)
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
aufraeumen() { for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; rm -rf "$SICH"; }
trap aufraeumen INT TERM EXIT

gruen=0; blind=0; tot=0

probe() {   # probe <Name> <Datei> <alt> <neu>
  local was="$1" datei="$2" alt="$3" neu="$4"
  for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done
  ALT="$alt" NEU="$neu" python3 - "$datei" <<'PY'
import os, sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
a, n = os.environ["ALT"], os.environ["NEU"]
if s.count(a) != 1: sys.exit(9)
open(p, "w", encoding="utf-8").write(s.replace(a, n, 1))
PY
  if [ $? -eq 9 ]; then
    echo "  ✗ TOTER ANKER: $was"; tot=$((tot+1)); return
  fi
  if node tests/smoke_sitemap.mjs >/dev/null 2>&1; then
    echo "  ✗ BLIND: $was — die Probe blieb gruen"; blind=$((blind+1))
  else
    echo "  ✓ schlaegt an: $was"; gruen=$((gruen+1))
  fi
}

echo "── Gegenprobe: die Sitemap ──"
if ! node tests/smoke_sitemap.mjs >/dev/null 2>&1; then
  echo "ABBRUCH: die Probe ist schon vor der Gegenprobe rot"; exit 2
fi
echo "  ✓ Ausgangszustand gruen"

# 1 · die Sitemap haengt hinterher — eine Adresse fehlt.
probe 'die Sitemap haengt hinterher — eine Adresse fehlt' sitemap.xml \
      '<loc>https://family-projekt.de/sicherheit.html</loc>' \
      '<loc>https://family-projekt.de/GIBTESNICHT.html</loc>'

# 2 · eine noindex-Seite kommt in die Einladung.
#     Genau der Widerspruch, den dieses Werkzeug aufgeraeumt hat.
probe 'eine noindex-Seite kommt in die Einladung' tools/sitemap-bauen.mjs \
      '  if (/\bnoindex\b/i.test(robots)) return { pfad, drin: false, grund: "noindex", soll };' \
      '  if (false) return { pfad, drin: false, grund: "noindex", soll };'

# 3 · ein fehlendes Canonical wird als ABSICHT verbucht statt als MANGEL.
#     Die zwei Gruende verlangen das Gegenteil voneinander: wer sie
#     zusammenwirft, kann den Mangel nie melden.
probe 'ein fehlendes Canonical wird als Absicht verbucht' tools/sitemap-bauen.mjs \
      '  if (!can) return { pfad, drin: false, grund: "kein-canonical", soll };' \
      '  if (!can) return { pfad, drin: false, grund: "noindex", soll };'

# 4 · ein fremdes Canonical faellt nicht mehr heraus.
probe 'ein fremdes Canonical faellt nicht mehr heraus' tools/sitemap-bauen.mjs \
      '  if (can !== soll) return { pfad, drin: false, grund: "fremdes-canonical", soll, can };' \
      '  if (false) return { pfad, drin: false, grund: "fremdes-canonical", soll, can };'

# 5 · der vierte Ausgang faellt weg — dann meldet der Lauf die
#     Bestaetigungsdatei der Search Console wieder als Mangel AN EINER SEITE.
probe 'der Riegel "keine Seite" faellt weg' tools/sitemap-bauen.mjs \
      '  if (!/<html[\s>]/i.test(html) && !/<head[\s>]/i.test(html)) {' \
      '  if (false) {'

# 6 · das Impressum verliert sein noindex — dann waere es wieder eine
#     Einladung und eine Absage zugleich.
probe 'das Impressum verliert sein noindex' impressum.html \
      '<meta name="robots" content="noindex, follow" />' \
      '<meta name="robots" content="index, follow" />'

# 7 · das Impressum verliert seinen Link von der Startseite (§ 5 DDG).
probe 'das Impressum ist von der Startseite nicht mehr verlinkt' index.html \
      'href="impressum.html"' 'href="#kein-impressum"'

# 8 · eine indexierbare Seite verliert ihr Canonical — sie faellt aus der
#     Sitemap, und zwar als MANGEL. Ohne Waechter waere das still.
probe 'eine indexierbare Seite verliert ihr Canonical' sicherheit.html \
      '<link rel="canonical" href="https://family-projekt.de/sicherheit.html" />' \
      '<!-- kein Canonical -->'

# 9 · DER SELBST-RIEGEL: der Sammler laeuft leer. Ohne ihn saehe ein Lauf
#     ueber null Seiten wie eine bestandene Pruefung aus.
probe 'der Sammler findet gar keine Seite mehr' tools/sitemap-bauen.mjs \
      'export function seitenFinden(wurzel = WURZEL) {' \
      'export function seitenFinden(wurzel = WURZEL) { if (true) return [];'

# 10 · ein Arbeitsablauf baut die Detailseiten nicht mehr mit.
#      Dann traegt die Karte die Zahlen von heute Nacht und die Detailseite
#      die vom letzten Lauf von Hand — und eine neue App bekaeme NIE eine Seite.
probe 'ein Arbeitsablauf baut die Detailseiten nicht mehr' .github/workflows/vektoren-taeglich.yml \
      '        run: node tools/detailseiten.mjs' \
      '        run: echo uebersprungen'

# 11 · er backt die Werkzeug-Seiten nicht mehr — dann stuenden dort wieder
#      188 Zeichen, sobald jemand FP_TOOL aendert.
probe 'ein Arbeitsablauf backt die Werkzeug-Seiten nicht mehr' .github/workflows/vektoren-taeglich.yml \
      '        run: node tools/werkzeug-seiten.mjs' \
      '        run: echo uebersprungen'

# 12 · er baut die Sitemap nicht mehr.
probe 'ein Arbeitsablauf baut die Sitemap nicht mehr' .github/workflows/vektoren-taeglich.yml \
      '        run: node tools/sitemap-bauen.mjs' \
      '        run: echo uebersprungen'

# 13 · er BAUT sie, committet sie aber nicht. Ein Lauf, dessen Arbeit
#      weggeworfen wird, ist teurer als einer, der gar nicht laeuft: er sieht
#      aus, als haette er gewirkt.
probe 'ein Arbeitsablauf baut alles, committet es aber nicht' .github/workflows/vektoren-taeglich.yml \
      'markt.html werkzeuge.html apps werkzeuge sitemap.xml' \
      'markt.html werkzeuge.html'

# 14 · DIE REIHENFOLGE: die Sitemap wird VOR den Seiten gebaut, die sie liest.
#      Dann laedt sie den Stand von gestern ein — und die drei Faelle darueber
#      blieben alle gruen.
probe 'die Sitemap wird vor den Seiten gebaut, die sie liest' .github/workflows/vektoren-taeglich.yml \
      '      - name: Detailseiten bauen' \
      '      - name: Sitemap zu frueh
        run: node tools/sitemap-bauen.mjs

      - name: Detailseiten bauen'

echo
echo "$gruen schlagen an, $blind blind, $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$tot" -eq 0 ]
