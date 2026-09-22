#!/bin/bash
# Gegenprobe zu tests/smoke_kartenknoepfe.mjs. Jeder Waechter bekommt einen
# Fehler, der ihn umwerfen MUSS — und die rote Zeile muss den Namen SEINER
# Zusicherung tragen. „Gefangen" allein ist keine Messung: die Zahl sagt, ob
# die Probe rot wird, nicht ob sie aus dem richtigen Grund rot wird.
#
# ⚠ SIE SABOTIERT DEN ECHTEN BAUM und legt ihn aus einer SICHERUNG unter /tmp
# zurueck — NICHT per `git checkout --`. Der holt den Stand aus dem letzten
# COMMIT und faehrt dabei ueber jede ungeschriebene Aenderung hinweg; am
# 2026-09-22 hat genau das in diesem Depot viermal Arbeit geloescht. Die
# Sicherung ueberlebt auch einen Abbruch (trap).
#
#   bash tests/gegenprobe_kartenknoepfe.sh
cd "$(dirname "$0")/.." || exit 1

DATEIEN=(assets/style.css markt.html tools/statische-listen.mjs)
SICH="/tmp/gp_kk.$$"; mkdir -p "$SICH"
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
heile(){ for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; }
auf(){ heile; rm -rf "$SICH"; }
trap auf INT TERM EXIT

gruen=0; blind=0; falsch=0; tot=0

# fall <name> <datei> <alt> <neu> <muster-das-in-der-roten-zeile-stehen-muss> [neubau]
fall(){
  local name="$1" datei="$2" alt="$3" neu="$4" trifft="$5" neubau="${6:-}"
  if ! ALT="$alt" python3 -c "
import io,os,sys
s=io.open('$datei',encoding='utf-8').read()
sys.exit(0 if os.environ['ALT'] in s else 1)"; then
    echo \"  ⊘ TOTER ANKER: $name\"; tot=$((tot+1)); return
  fi
  ALT="$alt" NEU="$neu" python3 -c "
import io,os
p='$datei'; s=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(s.replace(os.environ['ALT'],os.environ['NEU'],1))"
  [ -n "$neubau" ] && node tools/statische-listen.mjs >/dev/null 2>&1
  node tests/smoke_kartenknoepfe.mjs > /tmp/gp_kk_lauf.txt 2>&1
  local code=$?
  if [ "$code" -eq 0 ]; then
    echo "  ✗ BLIND: $name — die Probe blieb gruen"; blind=$((blind+1))
  elif grep -q '✗.*'"$trifft" /tmp/gp_kk_lauf.txt; then
    echo "  ✓ schlaegt an: $name"; gruen=$((gruen+1))
  else
    echo "  ⚠ ROT AUS FALSCHEM GRUND: $name — erwartet „$trifft\", rote Zeilen:"
    grep '✗' /tmp/gp_kk_lauf.txt | head -3 | sed 's/^/        /'
    falsch=$((falsch+1))
  fi
  heile
  [ -n "$neubau" ] && node tools/statische-listen.mjs >/dev/null 2>&1
  return 0
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_kartenknoepfe.mjs > /tmp/gp_kk_lauf.txt 2>&1; then
  echo "  ✓ gruen"
else
  echo "  ✗ schon OHNE Eingriff rot — die Gegenprobe misst so nichts:"
  grep '✗' /tmp/gp_kk_lauf.txt | head -5 | sed 's/^/        /'; exit 1
fi

echo
echo "═══ KNOPF: die Knoepfe einer Karte sind eine Familie ═══"

# 1 · DER BEFUND SELBST: der Text darf wieder umbrechen.
# ⚠ AM BESTAND BRICHT NICHTS MEHR UM — „Einzelheiten" passt mit dem kleinen
#   Polster in jede Karte. Der Riegel ist deshalb nur an der GESTELLTEN Lage
#   messbar (langer Text). Ohne sie waere er eine Behauptung; genau das hat
#   dieser Fall beim ersten Lauf gemeldet.
fall 'der Knopftext darf wieder umbrechen' assets/style.css \
  '  white-space:nowrap}       /* der Text bricht NIE um — siehe oben */' \
  '  white-space:normal}' \
  'nowrap wirkt wirklich'

# 2 · Klaus' zweiter Befund: „steht auch nicht in der Mitte vom Button."
fall 'der Text steht nicht mehr mittig' assets/style.css \
  '  justify-content:center;   /* Klaus: „steht auch nicht in der Mitte vom Button" */' \
  '  justify-content:flex-start;' \
  'steht mittig'

# 3 · „Einzelheiten" faellt aus der Familie und erbt wieder .btn (.96rem,
#     13px/22px) — genau der Zustand, den Klaus fotografiert hat.
fall 'Einzelheiten faellt aus der gemeinsamen Regel' assets/style.css \
  '.listing .listing-foot .btn:not(.mk-report){' \
  '.listing .listing-foot .btn.ext-nicht-vorhanden{' \
  'gleich hoch'

# 4 · der Melde-Knopf wird wieder gross. Er ist dann hoeher als die Referenz —
#     genau Klaus' „bombenfunktionoeser, riesiger Button".
fall 'der Melde-Knopf wird wieder 68 px breit' assets/style.css \
  '  width:52px;height:44px;flex:0 0 auto;' \
  '  width:68px;height:44px;flex:0 0 auto;' \
  'nicht mehr so breit'

# 5 · das alte Polster kommt zurueck. Die Textknoepfe werden 43 px, der
#     Melde-Knopf bleibt 37 — genau die ungleiche Hoehe, die Klaus gemeldet
#     hat. ⚠ Mein erster Anlauf erwartete hier „ragt aus der Karte" und
#     meldete sich als ROT AUS FALSCHEM GRUND: mit `flex-wrap` ragt NIE etwas
#     hinaus, es rutscht in eine zweite Reihe. Der Fall-Name log.
fall 'das alte Polster kommt zurueck — die Knoepfe werden wieder fett' assets/style.css \
  '  padding:10px 12px;border-radius:10px;' \
  '  padding:13px 22px;border-radius:14px;' \
  'Nagel'

# 6 · flex-wrap raus. ⚠ DER FUND DIESER GEGENPROBE, und er war beim ersten
#     Lauf BLIND: `.btn` traegt `overflow:hidden`, also darf ein Flex-Kind
#     unter seine Textbreite schrumpfen (`min-width:auto` = 0). Der Knopf ragt
#     dann NICHT hinaus — sein Text wird still abgeschnitten. Das ist die
#     schlimmere Sorte, weil man sie nicht sieht. Seitdem misst die Probe
#     `scrollWidth > clientWidth`.
fall 'die Fusszeile darf nicht mehr in eine zweite Reihe' assets/style.css \
  'justify-content:space-between;gap:14px;flex-wrap:wrap}' \
  'justify-content:space-between;gap:14px;flex-wrap:nowrap}' \
  'ist nicht abgeschnitten'

# 7 · der Pfeil kommt zurueck — im BAU-Zeichner, mit Neubau der Seite.
fall 'der Pfeil kommt in den Bau-Zeichner zurueck' tools/statische-listen.mjs \
  'href="apps/${esc(e.anchorId)}/">Einzelheiten</a>' \
  'href="apps/${esc(e.anchorId)}/">Einzelheiten →</a>' \
  'keinen Pfeil mehr' neubau

# 8 · der Pfeil kommt im LAUFZEIT-Zeichner zurueck. Sichtbar wird das erst
#     nach einer Suche — die Lage im Browser deckt ihn nicht ab.
fall 'der Pfeil kommt in den Laufzeit-Zeichner zurueck' markt.html \
  'mk_details: "Einzelheiten", search_btn: "Suchen",' \
  'mk_details: "Einzelheiten →", search_btn: "Suchen",' \
  'keinen Pfeil mehr'

# 9 · die drei Knoepfe bekommen wieder DREI Regeln statt einer. Der Waechter
#     auf die eine Regel faellt — und das ist die Zusicherung, aus der die
#     naechste Drift geboren wuerde.
fall 'aus einer Regel werden wieder drei' assets/style.css \
  '.listing .ext,
.listing .mk-ms-btn,
.listing .listing-foot .btn:not(.mk-report){' \
  '.listing .ext{font-family:var(--mono);font-size:.78rem}
.listing .mk-ms-btn{font-family:var(--mono);font-size:.78rem}
.listing .listing-foot .btn:not(.mk-report){' \
  'EINER Regel'

echo
echo "═══ Der Selbst-Riegel — misst der Lauf ueberhaupt etwas? ═══"
# 10 · Nur eine BREITE Karte messen. Dort war auch der alte Zustand einzeilig:
#      der Lauf waere gruen, ohne etwas gemessen zu haben. Genau diese Falle
#      hat in PWA Toolpoint einen Waechter bei 1280 px blind gelassen.
cp tests/smoke_kartenknoepfe.mjs "$SICH/smoke_kk.mjs"
python3 -c "
import io
p='tests/smoke_kartenknoepfe.mjs'; s=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(s.replace('const BREITEN = [380, 412, 900, 1280, 1600];','const BREITEN = [560];',1))"
node tests/smoke_kartenknoepfe.mjs > /tmp/gp_kk_lauf.txt 2>&1
if grep -q '✗.*mindestens eine gemessene Breite' /tmp/gp_kk_lauf.txt; then
  echo "  ✓ schlaegt an: nur eine breite Karte gemessen — der Lauf sagt es selbst"; gruen=$((gruen+1))
else
  echo "  ✗ BLIND: der Selbst-Riegel meldet sich nicht"; blind=$((blind+1))
  grep '✗' /tmp/gp_kk_lauf.txt | head -3 | sed 's/^/        /'
fi
cp "$SICH/smoke_kk.mjs" tests/smoke_kartenknoepfe.mjs

echo
echo "$gruen schlagen an, $blind blind, $falsch aus falschem Grund, $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
