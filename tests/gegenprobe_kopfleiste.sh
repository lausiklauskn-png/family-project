#!/bin/bash
# Gegenprobe zu tests/smoke_kopfleiste.mjs (Klaus 2026-10-06: Kopfleiste kompakt). Jeder Wächter bekommt einen Fehler,
# der ihn umwerfen MUSS — und die rote Zeile muss den Namen SEINER Zusicherung
# tragen. „Gefangen" allein ist keine Messung.
#
# Sabotiert wird der echte Baum, zurückgelegt aus einer SICHERUNG (nie per
# `git checkout --`, das fährt über ungeschriebene Arbeit). Die Sicherung
# überlebt einen Abbruch (trap).
#
#   bash tests/gegenprobe_kopfleiste.sh   NUR_FALL="REIHEN" · NUR_ANKER=1 nur die Anker für einen Fall
cd "$(dirname "$0")/.." || exit 1
export PW_CORE="${PW_CORE:-/opt/node-tools/node_modules/playwright-core/index.mjs}"

DATEIEN=(assets/app.js assets/style.css index.html)
SICH="/tmp/gp_kl.$$"; mkdir -p "$SICH"
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
heile(){ for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; }
auf(){ heile; rm -rf "$SICH"; }
trap auf INT TERM EXIT
LAUF="/tmp/gp_kl_lauf.$$.txt"

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
  if [ -n "$NUR_ANKER" ]; then echo "  · Anker lebt: $name"; return 0; fi
  ALT="$alt" NEU="$neu" python3 -c "
import io,os
p='$datei'; s=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(s.replace(os.environ['ALT'],os.environ['NEU'],1))"
  node tests/smoke_kopfleiste.mjs > "$LAUF" 2>&1
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
if [ -n "$NUR_ANKER" ]; then echo "  (NUR_ANKER: keine Probe, nur die Anker)"
elif node tests/smoke_kopfleiste.mjs > "$LAUF" 2>&1; then echo "  ✓ grün"
else echo "  ✗ schon OHNE Eingriff rot — die Gegenprobe misst so nichts:"; grep '✗\|⊘' "$LAUF" | head -5; exit 1; fi

echo
echo "═══ KOPFLEISTE ═══"
# Muster ohne Umlaute (C-Locale: ein Umlaut sind zwei Bytes).
fall 'AUSWAHL: ein Tipp auf den Sprachknopf oeffnet nichts' assets/app.js \
  '      document.body.appendChild(langMenu);' '      /* weg */' \
  'ffnet die Auswahl'

fall 'WAHL: die Wahl im Menue setzt die Sprache nicht' assets/app.js \
  'b.addEventListener("click", function () { langZu(true); waehleSprache(o[0]); });' \
  'b.addEventListener("click", function () { langZu(true); });' \
  'die Wahl setzt die Sprache'

# Die Beschriftung setzt app.js bei JEDEM Laden neu (setLabel) — eine Sabotage
# an index.html kommt dort nie an und war deshalb blind. Sabotiert wird die Quelle.
fall 'RELOAD: das Wort Aktualisieren steht wieder sichtbar im Knopf' assets/app.js \
  "      pill.innerHTML = '<span class=\"rl-ic\" aria-hidden=\"true\">↻</span>';" \
  "      pill.innerHTML = '<span class=\"rl-ic\" aria-hidden=\"true\">↻</span> Aktualisieren';" \
  'zeigt nur das Zeichen'

fall 'SPRACHE: der Sprachknopf zeigt wieder das ganze Wort' assets/app.js \
  'lbx.textContent = lang === "en" ? "EN" : "DE";' 'lbx.textContent = lang === "en" ? "English" : "Deutsch";' \
  'nur die aktuelle Sprache'

fall 'REIHEN: ohne die Verdichtung bricht die Kopfleiste in vier Reihen' assets/style.css \
  '@media (max-width:360px){nav.top{gap:5px}nav.top a{padding:7px 8px;font-size:.86rem}}' '' \
  'drei Reihen'

echo
echo "═══ $gruen schlagen an · $blind blind · $falsch aus falschem Grund · $tot tote Anker ═══"
rm -f "$LAUF"
[ "$blind" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
