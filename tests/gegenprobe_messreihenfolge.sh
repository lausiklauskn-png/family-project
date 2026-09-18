#!/usr/bin/env bash
# Gegenprobe zur Mess-Reihenfolge und zum nächtlichen Lauf (Klaus 2026-09-18).
#
# Der Befund, aus dem diese Datei entstand: die Reihenfolge war RICHTIG, und
# trotzdem wurde sechs Nächte lang nichts gemessen. Ein Wächter auf die
# Reihenfolge allein wäre die ganze Zeit grün gewesen. Deshalb baut diese
# Gegenprobe beide Lücken ein — die an der Sortierung UND die am Lauf.
#
#   bash tests/gegenprobe_messreihenfolge.sh
#
# Sabotiert den echten Baum und legt alles zurück, auch beim Abbruch.
# Wer abbricht, nimmt TERM (nicht KILL) und sieht danach mit `git status` nach.

set -u
cd "$(dirname "$0")/.."

SICH="/tmp/gp_messreihe.$$"; mkdir -p "$SICH"
DATEIEN=(tools/messung.mjs .github/workflows/vektoren-taeglich.yml)
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
  if node tests/smoke_messreihenfolge.mjs >/dev/null 2>&1; then
    echo "  ✗ BLIND: $was — die Probe blieb grün"; blind=$((blind+1))
  else
    echo "  ✓ schlägt an: $was"; gruen=$((gruen+1))
  fi
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_messreihenfolge.mjs >/dev/null 2>&1; then echo "  ✓ grün"
else echo "  ✗ SCHON ROT — kein Fall misst etwas."; exit 2; fi

echo
echo "═══ A · Die Reihenfolge ═══"
probe "nie Gemessene stehen HINTEN statt vorn" \
      tools/messung.mjs \
      '    if (da !== db) return da < db ? -1 : 1;' \
      '    if (da !== db) return da < db ? 1 : -1;'
probe "bei Gleichstand entscheidet nichts mehr (Zufall)" \
      tools/messung.mjs \
      '    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;' \
      '    return 0;'
probe "der Deckel lässt niemanden dran" \
      tools/messung.mjs \
      'export const MESSUNG_MAX_PRO_LAUF = 10;' \
      'export const MESSUNG_MAX_PRO_LAUF = 0;'
# ⚠ Der Deckel auf 3 ist der FALL, DEN KLAUS BESCHRIEBEN HAT: er reicht für die
# Alten, aber nicht für alle vier Neuen. „Ein Deckel ist nicht zu klein, solange
# die Reihenfolge stimmt" gilt nur, wenn er die Nie-Gemessenen noch fasst.
probe "der Deckel ist zu klein für die vier Nie-Gemessenen" \
      tools/messung.mjs \
      'export const MESSUNG_MAX_PRO_LAUF = 10;' \
      'export const MESSUNG_MAX_PRO_LAUF = 3;'

echo
echo "═══ B · Der nächtliche Lauf ═══"
probe "zwei getrennte Installationen (der Stand vom 12.–17.09.)" \
      .github/workflows/vektoren-taeglich.yml \
      'npm install playwright lighthouse --no-save \' \
      'npm install playwright --no-save
          npm install lighthouse --no-save \'
probe "die Werkzeuge werden gar nicht nachgezählt" \
      .github/workflows/vektoren-taeglich.yml \
      '      - name: Werkzeuge nachzählen' \
      '      - name: Werkzeuge NICHT nachzählen'

aufraeumen
trap - INT TERM EXIT
echo
echo "$gruen Wächter schlagen an · $blind blind · $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$tot" -eq 0 ] || exit 1
