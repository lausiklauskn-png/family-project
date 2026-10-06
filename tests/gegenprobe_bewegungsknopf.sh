#!/bin/bash
# Gegenprobe zu tests/smoke_bewegungsknopf.mjs. Jeder Wächter bekommt einen Fehler,
# der ihn umwerfen MUSS — und die rote Zeile muss den Namen SEINER Zusicherung
# tragen. „Gefangen" allein ist keine Messung.
#
# Sabotiert wird der echte Baum, zurückgelegt aus einer SICHERUNG (nie per
# `git checkout --`, das fährt über ungeschriebene Arbeit). Die Sicherung
# überlebt einen Abbruch (trap).
#
#   bash tests/gegenprobe_bewegungsknopf.sh      NUR_FALL="BREMSE" für einen Fall
cd "$(dirname "$0")/.." || exit 1
export PW_CORE="${PW_CORE:-/opt/node-tools/node_modules/playwright-core/index.mjs}"

DATEIEN=(assets/mycel-bg.js assets/app.js index.html)
SICH="/tmp/gp_bk.$$"; mkdir -p "$SICH"
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
heile(){ for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; }
auf(){ heile; rm -rf "$SICH"; }
trap auf INT TERM EXIT
LAUF="/tmp/gp_bk_lauf.$$.txt"

gruen=0; blind=0; falsch=0; tot=0

# fall <name> <datei> <alt> <neu> <muster der roten Zeile>
fall(){
  local name="$1" datei="$2" alt="$3" neu="$4" trifft="$5"
  if [ -n "$NUR_FALL" ] && [[ "$name" != *"$NUR_FALL"* ]]; then return 0; fi
  if ! ALT="$alt" python3 -c "
import io,os,sys
s=io.open('$datei',encoding='utf-8').read()
sys.exit(0 if os.environ['ALT'] in s else 1)"; then
    echo "  ⊘ TOTER ANKER: $name"; tot=$((tot+1)); return 0
  fi
  ALT="$alt" NEU="$neu" python3 -c "
import io,os
p='$datei'; s=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(s.replace(os.environ['ALT'],os.environ['NEU'],1))"
  node tests/smoke_bewegungsknopf.mjs > "$LAUF" 2>&1
  local code=$?
  if [ "$code" -eq 0 ]; then
    echo "  ✗ BLIND: $name — die Probe blieb grün"; blind=$((blind+1))
  elif grep -q '✗.*'"$trifft" "$LAUF"; then
    echo "  ✓ schlägt an: $name"; gruen=$((gruen+1))
  else
    echo "  ⚠ ROT AUS FALSCHEM GRUND: $name — erwartet „$trifft\", rote Zeilen:"
    grep '✗\|⊘' "$LAUF" | head -3 | sed 's/^/        /'
    falsch=$((falsch+1))
  fi
  heile
  return 0
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_bewegungsknopf.mjs > "$LAUF" 2>&1; then echo "  ✓ grün"
else echo "  ✗ schon OHNE Eingriff rot — die Gegenprobe misst so nichts:"; grep '✗\|⊘' "$LAUF" | head -5; exit 1; fi

echo; echo "═══ BEWEGUNGSKNOPF in der Kopfleiste ═══"
fall 'BREMSE: steht() kennt die Selbst-Bremse nicht mehr' assets/mycel-bg.js \
  'return pausiert || reduce || gebremst; }' 'return pausiert || reduce; }' \
  'steht() sagt es'

fall 'MELDUNG: die Bremse sagt dem Knopf nichts' assets/mycel-bg.js \
  '        meldeZustand();
        return;                  // Schleife endet' '        return;                  // Schleife endet' \
  'nicht mehr'

fall 'GRUND: ohne Grafikchip zeigt ein Tipp den Grund nicht' assets/app.js \
  '          if (w0) { w0.textContent = GRUND[l][g];' '          if (false) { w0.textContent = GRUND[l][g];' \
  'SICHTBAR im Knopf'

fall 'ZEICHEN: das Video-Zeichen kommt in den Knopf zurück' index.html \
  '<span id="bgPauseZeichen" aria-hidden="true">≈</span> <span id="bgPauseWort" aria-hidden="true">Bewegt</span>' \
  '<span id="bgPauseZeichen" aria-hidden="true">⏸</span><span id="bgPauseWort" aria-hidden="true">Bewegt</span>' \
  'kein ⏸/▶ mehr'

echo
echo "═══ $gruen schlagen an · $blind blind · $falsch aus falschem Grund · $tot tote Anker ═══"
rm -f "$LAUF"
[ "$blind" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
