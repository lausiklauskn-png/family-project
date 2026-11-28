#!/bin/bash
# Gegenprobe zu tests/smoke_blaettern.mjs (Klaus 2026-11-27: Wegkippen +
# Schieberegler). Jeder Riegel bekommt einen Fehler, der ihn umwerfen MUSS,
# und die rote Zeile muss den Namen SEINER Zusicherung tragen.
# ⚠ Sabotiert den Baum und legt ihn aus einer SICHERUNG zurück. In einer
# Wegwerf-Kopie fahren. Im Muster steht kein Umlaut (C-Locale: `.` = Byte).
#
#   bash tests/gegenprobe_blaettern.sh
#   NUR_ANKER=1 bash tests/gegenprobe_blaettern.sh
#   NUR_FALL="REGLER" bash tests/gegenprobe_blaettern.sh
cd "$(dirname "$0")/.." || exit 1

DATEIEN=(assets/style.css assets/markt-blaettern.js)
SICH="/tmp/gp_bl.$$"; mkdir -p "$SICH"
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
heile(){ for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; }
auf(){ heile; rm -rf "$SICH"; }
trap auf INT TERM EXIT

gruen=0; blind=0; falsch=0; tot=0
fall(){
  local name="$1" datei="$2" alt="$3" neu="$4" trifft="$5"
  if [ -n "$NUR_FALL" ] && [[ "$name" != *"$NUR_FALL"* ]]; then return 0; fi
  # Optional ein ZWEITER Anker (DATEI2/ALT2/NEU2 aus der Umgebung): fuer
  # Riegel, die doppelt gebaut sind (Skript UND CSS) — eine Sabotage an nur
  # einem faengt der andere auf, und der Fall maesse nichts.
  local n; n=$(ALT="$alt" python3 -c "
import io,os
print(io.open('$datei',encoding='utf-8').read().count(os.environ['ALT']))")
  if [ -n "$ALT2" ] && [ "$n" = "1" ]; then n=$(ALT="$ALT2" python3 -c "
import io,os
print(io.open('$DATEI2',encoding='utf-8').read().count(os.environ['ALT']))"); fi
  if [ "$n" != "1" ]; then echo "  ⊘ TOTER ANKER: $name ($n Treffer)"; tot=$((tot+1)); return 0; fi
  if [ -n "$NUR_ANKER" ]; then echo "  ✓ Anker eindeutig: $name"; return 0; fi
  ALT="$alt" NEU="$neu" python3 -c "
import io,os
p='$datei'; s=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(s.replace(os.environ['ALT'],os.environ['NEU'],1))"
  [ -n "$ALT2" ] && ALT="$ALT2" NEU="$NEU2" python3 -c "
import io,os
p='$DATEI2'; s=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(s.replace(os.environ['ALT'],os.environ['NEU'],1))"
  node tests/smoke_blaettern.mjs > /tmp/gp_bl_lauf.txt 2>&1
  local code=$?
  if [ "$code" -eq 0 ]; then echo "  ✗ BLIND: $name — die Probe blieb gruen"; blind=$((blind+1))
  elif grep -q '✗.*'"$trifft" /tmp/gp_bl_lauf.txt; then echo "  ✓ schlaegt an: $name"; gruen=$((gruen+1))
  else echo "  ⚠ ROT AUS FALSCHEM GRUND: $name — erwartet „$trifft\", rote Zeilen:"
    grep '✗\|Error' /tmp/gp_bl_lauf.txt | head -3 | sed 's/^/        /'; falsch=$((falsch+1)); fi
  heile; return 0
}

if [ -z "$NUR_ANKER" ]; then
  echo "═══ Ausgangslage ═══"
  if node tests/smoke_blaettern.mjs > /tmp/gp_bl_lauf.txt 2>&1; then echo "  ✓ gruen"
  else echo "  ✗ schon OHNE Eingriff rot:"; grep '✗' /tmp/gp_bl_lauf.txt | head -5; exit 1; fi
fi
echo; echo "═══ Regler und Kippen ═══"

DATEI2=assets/style.css ALT2='@media (min-width:600px){.mk-regler{display:none}}' NEU2='' \
fall 'REGLER-BREIT: der Regler erscheint auch am Tablet (Skript UND CSS)' assets/markt-blaettern.js \
  'var REGLER_BREITE = "(max-width: 599px)";' 'var REGLER_BREITE = "(max-width: 1400px)";' \
  'kein Regler (nur'
fall 'REGLER-IMMER: sichtbar auch ganz oben vor der Liste' assets/markt-blaettern.js \
  'el.hidden = !(an && imBild);' 'el.hidden = !an;' \
  'vor der Liste, ist der Regler NICHT'
fall 'REGLER-ZIEHT-NICHT: Ziehen bewegt die Seite nicht' assets/markt-blaettern.js \
  'try { window.scrollTo({ top: Math.round(r.a + p * (r.b - r.a)), behavior: "instant" }); }' \
  'try { void 0; }' \
  'Zug nach unten bringt die letzte App'
fall 'REGLER-WEICH: der Sprung laeuft weich hinterher' assets/markt-blaettern.js \
  'behavior: "instant" }); }' 'behavior: "smooth" }); }' \
  'Zug nach unten bringt die letzte App'
fall 'REGLER-ENDE: das Ende rechnet ohne den unteren Rand' assets/markt-blaettern.js \
  'var b = listeUnten - bild + 8;' 'var b = listeUnten - bild + 400;' \
  'Zug nach unten bringt die letzte App'
fall 'REGLER-GROSS: der Griff wird riesig' assets/style.css \
  'width:22px;height:40px;margin-left:-11px;' 'width:60px;height:90px;margin-left:-30px;' \
  'ist schmal'
fall 'REGLER-PILLE: der Regler endet unter der Mycel-Pille' assets/markt-blaettern.js \
  'unten = Math.max(unten, bild - pr.top + 8);' 'unten = unten;' \
  'Mycel-Pille, nicht unter'
fall 'REGLER-TASTE: die Tastatur bewegt nichts' assets/markt-blaettern.js \
  'else if (ev.key === "End") neu = 1;' 'else if (ev.key === "End") neu = null;' \
  'mit der Tastatur'
fall 'KIPP-AUS: es kippt gar nichts mehr' assets/markt-blaettern.js \
  'k.el.classList.toggle("kipp-weg", raus);' 'k.el.classList.toggle("kipp-weg", false);' \
  'kippen Karten weg'
# ⚠ Der erste Lauf war BLIND: `zuWenig` allein zu kippen reichte nicht, ob
# eine Karte kippt, entscheidet erst „oben raus" / „unten rein".
fall 'KIPP-ZU-FRUEH: auch ganz sichtbare Karten kippen' assets/markt-blaettern.js \
  'var rein = zuWenig && !raus && unten > bild;' 'var rein = !raus;' \
  'ganz sichtbare Karte steht gerade'
fall 'KIPP-FLACKERN: gemessen wird die gekippte Karte' assets/markt-blaettern.js \
  'karten.push({ el: g[i], oben: obenImDokument(g[i]), hoehe: g[i].offsetHeight });' \
  'var q = g[i].getBoundingClientRect(); karten.push({ el: g[i], oben: q.top + (window.pageYOffset || 0), hoehe: q.height });' \
  'kein Flackern'
# Der Skript-Riegel allein: die Klassen kommen, das CSS macht sie flach —
# gemessen wird, dass gar keine Klasse gesetzt wird.
fall 'RUHIG: weniger Bewegung wird im Skript nicht beachtet' assets/markt-blaettern.js \
  'if (ruhig) return;' 'if (false) return;' \
  'kippt nichts'
# Beide Riegel zugleich: dann stehen Karten unsichtbar da.
DATEI2=assets/style.css ALT2='.listing.kipp-weg,.listing.kipp-rein{--kipp:0deg;opacity:1;pointer-events:auto;transition:none}' NEU2='.listing.kipp-weg{}' \
fall 'RUHIG-BEIDE: Skript und CSS beachten weniger Bewegung nicht' assets/markt-blaettern.js \
  'if (ruhig) return;' 'if (false) return;' \
  'keine Karte ist unsichtbar'
# ⚠ BENANNTE GRENZE: der CSS-Riegel ALLEIN ist nicht messbar — ohne Klassen
# aus dem Skript hat er nichts zu tun. Er ist das Netz unter dem Skript.

echo
echo "  $gruen schlagen an · $blind blind · $falsch aus falschem Grund · $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
