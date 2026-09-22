#!/bin/bash
# Gegenprobe zu tests/smoke_detail_gestalt.mjs und tests/smoke_syntax.mjs.
# Jeder Waechter bekommt einen Fehler, der ihn umwerfen MUSS — und die rote
# Zeile muss den Namen SEINER Zusicherung tragen.
#
# ⚠ SIE SABOTIERT DEN ECHTEN BAUM und legt ihn aus einer SICHERUNG unter /tmp
# zurueck, NICHT per `git checkout --` (der faehrt ueber ungeschriebene Arbeit
# hinweg; am 2026-09-22 hat das hier viermal Arbeit geloescht). Die Sicherung
# ueberlebt auch einen Abbruch (trap).
cd "$(dirname "$0")/.." || exit 1

DATEIEN=(tools/vorlagen/detail.html tools/detailseiten.mjs tools/statische-listen.mjs
         assets/style.css markt.html)
SICH="/tmp/gp_dg.$$"; mkdir -p "$SICH"
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
for a in apps/*/index.html; do mkdir -p "$SICH/$(dirname "$a")"; cp "$a" "$SICH/$a"; done
heile(){ for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done
         for a in apps/*/index.html; do cp "$SICH/$a" "$a" 2>/dev/null; done; }
auf(){ heile; rm -rf "$SICH"; }
trap auf INT TERM EXIT

gruen=0; blind=0; falsch=0; tot=0

# fall <name> <datei> <alt> <neu> <trifft> [probe] [neubau]
fall(){
  local name="$1" datei="$2" alt="$3" neu="$4" trifft="$5"
  local probe="${6:-tests/smoke_detail_gestalt.mjs}" neubau="${7:-}"
  if ! ALT="$alt" python3 -c "
import io,os,sys
sys.exit(0 if os.environ['ALT'] in io.open('$datei',encoding='utf-8').read() else 1)"; then
    echo "  ⊘ TOTER ANKER: $name"; tot=$((tot+1)); return
  fi
  ALT="$alt" NEU="$neu" python3 -c "
import io,os
p='$datei'; s=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(s.replace(os.environ['ALT'],os.environ['NEU'],1))"
  [ -n "$neubau" ] && node tools/detailseiten.mjs >/dev/null 2>&1
  node "$probe" > /tmp/gp_dg_lauf.txt 2>&1
  local code=$?
  if [ "$code" -eq 0 ]; then
    echo "  ✗ BLIND: $name — die Probe blieb gruen"; blind=$((blind+1))
  elif grep -q '✗.*'"$trifft" /tmp/gp_dg_lauf.txt; then
    echo "  ✓ schlaegt an: $name"; gruen=$((gruen+1))
  else
    echo "  ⚠ ROT AUS FALSCHEM GRUND: $name — erwartet „$trifft\", rote Zeilen:"
    grep '✗' /tmp/gp_dg_lauf.txt | head -3 | sed 's/^/        /'; falsch=$((falsch+1))
  fi
  heile
  [ -n "$neubau" ] && node tools/detailseiten.mjs >/dev/null 2>&1
  return 0
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_detail_gestalt.mjs > /tmp/gp_dg_lauf.txt 2>&1 && node tests/smoke_syntax.mjs >/dev/null 2>&1; then
  echo "  ✓ gruen"
else
  echo "  ✗ schon OHNE Eingriff rot:"; grep '✗' /tmp/gp_dg_lauf.txt | head -4 | sed 's/^/        /'; exit 1
fi

echo; echo "═══ GESTALT: Polster und Farben der Detailseite ═══"

# 1 · DER BEFUND SELBST: das seitliche Polster faellt weg, und die Schrift
#     klebt wieder am Rand — Klaus' „linksbuendig im Container auf Null".
fall 'das seitliche Polster faellt weg' tools/vorlagen/detail.html \
  '  main.wrap > section.glass { padding:24px 22px; margin:18px 0; }' \
  '  main.wrap > section.glass { padding:32px 0; margin:0; }' \
  'klebt am Kastenrand' tests/smoke_detail_gestalt.mjs neubau

# 2 · die Messwerte verlieren ihre Stufen-Klasse — grau wie vorher.
fall 'die Messwerte werden wieder grau' tools/detailseiten.mjs \
  'T.push(`        <span class="mk-ms-w${st ? " is-" + st : ""}">` +' \
  'T.push(`        <span class="mk-ms-w">` +' \
  'tragen eine Stufe' tests/smoke_detail_gestalt.mjs neubau

# 3 · auch der Verlauf verliert sie.
fall 'der Verlauf verliert seine Stufen' tools/detailseiten.mjs \
  'return `<td class="zahl${st ? " st-" + st : ""}">${Number.isFinite(v) ? v : "—"}</td>`;' \
  'return `<td class="zahl">${Number.isFinite(v) ? v : "—"}</td>`;' \
  'im Verlauf' tests/smoke_detail_gestalt.mjs neubau

# 4 · die Farben werden wieder ABGESCHRIEBEN statt geteilt — die Drift selbst.
# ⚠ Mein erster Anlauf benannte die VARIABLE in style.css um und meldete
#   sich als ROT AUS FALSCHEM GRUND: `--ms-gut` steht dort zweimal (Grundwert
#   und Thema), der Waechter fand die zweite Stelle noch und blieb gruen —
#   gefallen ist ein Farb-Waechter daneben. Sabotiert wird jetzt die Stelle,
#   an der die Zusicherung wirklich haengt.
fall 'die Farben werden in die Vorlage abgeschrieben' tools/vorlagen/detail.html \
  '  .mess-tabelle .st-gut { color:var(--ms-gut); }' \
  '  .mess-tabelle .st-gut { color:#1e7a4b; }' \
  'nicht abgeschrieben'

# 5 · Node und Browser rechnen nicht mehr gleich. DAS ist die benannte
#     Doppelung, und ohne diesen Waechter liefe sie still auseinander.
fall 'die Schwelle im Bau-Werkzeug wandert' tools/statische-listen.mjs \
  '  return z >= 90 ? "gut" : (z >= 50 ? "mittel" : "schwach");' \
  '  return z >= 85 ? "gut" : (z >= 50 ? "mittel" : "schwach");' \
  'dasselbe wie das Bau-Werkzeug'

# 6 · „nichts" wird wieder gedeutet. `Number(null)` ist 0 — eine FEHLENDE
#     Zahl bekaeme eine rote Pille fuer eine Messung, die es nicht gibt.
fall 'eine fehlende Zahl wird wieder gedeutet' tools/statische-listen.mjs \
  '  if (n === null || n === undefined || n === "" || typeof n === "boolean") return "";' \
  '  // Riegel raus' \
  'GAR KEINE Stufe'

echo; echo "═══ SYNTAX: jede JS-Datei laedt ═══"
# 7 · genau der Fehler, der mir an EINEM Tag fuenfmal passiert ist.
fall 'ein deutsches Anfuehrungszeichen beendet einen String' tools/detailseiten.mjs \
  'const MONATE = ["Januar",' \
  'const HINWEIS = "er sagte „ja""; const MONATE = ["Januar",' \
  'sich nicht laden' tests/smoke_syntax.mjs

echo
echo "$gruen schlagen an, $blind blind, $falsch aus falschem Grund, $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
