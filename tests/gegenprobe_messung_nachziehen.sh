#!/usr/bin/env bash
# Gegenprobe zum Nachziehen der Messung (Klaus 2026-09-22).
#
# Der Befund: zwei Karten standen auf „noch nicht gemessen", während ihre
# Detailseite 13 und 14 Messpunkte zeigte. Die Reparatur füllt NUR, was leer
# ist — und genau diese Abgrenzung ist die teuerste Zusicherung hier: wer sie
# aufweicht, überschreibt die Haltefrist für schlechtere Werte (Klaus
# 2026-08-06) an einer zweiten Stelle, und niemand sähe es.
#
#   bash tests/gegenprobe_messung_nachziehen.sh
#
# Sabotiert den echten Baum und legt alles zurück, auch beim Abbruch.
# Wer abbricht, nimmt TERM (nicht KILL) und sieht danach mit `git status` nach.

set -u
cd "$(dirname "$0")/.."

SICH="/tmp/gp_nachziehen.$$"; mkdir -p "$SICH"
DATEIEN=(tools/messung-nachziehen.mjs .github/workflows/vektoren-taeglich.yml)
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
  if node tests/smoke_messung_nachziehen.mjs >/dev/null 2>&1; then
    echo "  ✗ BLIND: $was — die Probe blieb grün"; blind=$((blind+1))
  else
    echo "  ✓ schlägt an: $was"; gruen=$((gruen+1))
  fi
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_messung_nachziehen.mjs >/dev/null 2>&1; then echo "  ✓ grün"
else echo "  ✗ SCHON ROT — kein Fall misst etwas."; exit 2; fi

echo
echo "═══ A · Was nachgezogen wird ═══"
probe "es wird gar nichts mehr nachgezogen" \
      tools/messung-nachziehen.mjs \
      '    if (m) raus.push({ anchorId: k, label: e.label || k, messung: m });' \
      '    if (false) raus.push({ anchorId: k, label: e.label || k, messung: m });'
probe "die Adresse kommt aus der Reihe statt vom Eintrag" \
      tools/messung-nachziehen.mjs \
      '  if (url) m.url = url;' \
      '  if (punkt.url) m.url = punkt.url;'
probe "das Datum faellt weg — eine Zahl ohne Datum ist eine Behauptung" \
      tools/messung-nachziehen.mjs \
      '  m.gemessen = punkt.bis || punkt.von || "";' \
      '  m.gemessen = "";'

echo
echo "═══ B · Die Haltefrist bleibt unberuehrt ═══"
# ⚠ DER TEUERSTE FALL. Ohne diesen Riegel ueberschriebe das Werkzeug jede Karte
# mit dem juengsten Reihen-Wert — und nimmt damit Klaus' Entscheidung vom
# 2026-08-06 zurueck, ohne dass es irgendwo steht.
probe "eine vorhandene Messung wird ueberschrieben" \
      tools/messung-nachziehen.mjs \
      '    if (da && ZAHLEN.some((z) => Number.isFinite(da[z]))) continue;' \
      '    if (false) continue;'
probe "ein leerer Platzhalter gilt faelschlich als gemessen" \
      tools/messung-nachziehen.mjs \
      '    if (da && ZAHLEN.some((z) => Number.isFinite(da[z]))) continue;' \
      '    if (da) continue;'

echo
echo "═══ C · Was NICHT nachgezogen wird ═══"
probe "ein Punkt ohne eine einzige Zahl ergibt trotzdem ein Band" \
      tools/messung-nachziehen.mjs \
      '  if (!ZAHLEN.some((z) => Number.isFinite(m[z]))) return null;' \
      '  if (false) return null;'
probe "Desktop-Punkte zaehlen mit — zwei Geraete in einer Spalte" \
      tools/messung-nachziehen.mjs \
      '  const p = ((reihe || {}).punkte || []).filter((x) => (x.geraet || "handy") === "handy");' \
      '  const p = ((reihe || {}).punkte || []);'
probe "genommen wird der LETZTE Punkt der Datei statt des juengsten" \
      tools/messung-nachziehen.mjs \
      '  return p.slice().sort((a, b) =>' \
      '  if (1) return p[p.length - 1]; return p.slice().sort((a, b) =>'
probe "ein Mangel wird am ERSTEN Doppelpunkt geraten statt getrennt" \
      tools/messung-nachziehen.mjs \
      '  const i = t.indexOf(": ");
  if (i < 1) return { k: "", t };' \
      '  const i = t.indexOf(":");
  if (i < 1) return { k: t, t: "" };'

echo
echo "═══ D · Der naechtliche Lauf ═══"
probe "der Schritt faellt aus dem Lauf" \
      .github/workflows/vektoren-taeglich.yml \
      '        run: node tools/messung-nachziehen.mjs' \
      '        run: true'
probe "er laeuft VOR dem Messen — die Reihe ist dann noch die von gestern" \
      .github/workflows/vektoren-taeglich.yml \
      '          node tools/forschung.mjs --messen' \
      '          node tools/messung-nachziehen.mjs
          node tools/forschung.mjs --messen'

echo
echo "⚠ BENANNTE GRENZE: fuer „eine Karte, die aelter ist als ihre Reihe, traegt"
echo "   ihren Grund mit\" steht hier KEIN Fall. Dieser Waechter misst den echten"
echo "   Bestand, und die drei Faelle darin (zurueckgehalten: zahl 1 von 3)"
echo "   entstehen im naechtlichen Messlauf, nicht in diesem Werkzeug. Eine"
echo "   Sabotage muesste den Bestand aendern — und dann misst sie den Bestand,"
echo "   nicht die Zusicherung."

echo
echo "$gruen schlagen an, $blind blind, $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$tot" -eq 0 ]
