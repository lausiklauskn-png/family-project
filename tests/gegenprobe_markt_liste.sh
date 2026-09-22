#!/bin/bash
# Gegenprobe zu den vier Marktplatz-Listen-Waechtern in tests/smoke_all.mjs.
#
# ⚠ WARUM ES SIE VORHER NICHT GAB, UND WAS DAS GEKOSTET HAT. Der Waechter
# „jeder Eintrag steht genau einmal" stand seit 2026-08-05 da und hatte in
# KEINER Gegenprobe einen Fall — ein gruener Haken ohne etwas dahinter. Am
# 2026-09-18 hat Klaus Perfect Skin Fashion auf Wartung geschaltet; seitdem
# zeigt die Seite mit ABSICHT eine Karte weniger, als die Liste Eintraege hat,
# und der Waechter war ROT, ohne dass eine Zusicherung gefallen waere. Vier
# Tage lang. *Eine Zahl in einer Pruefung ist kein Vertrag* — wortgleich
# derselbe Fehler wie in PWA-Toolpoint am selben Tag.
#
# ⚠ SIE SABOTIERT DEN ECHTEN BAUM und legt ihn aus einer SICHERUNG unter /tmp
# zurueck — NICHT per `git checkout --`. Der holt den Stand aus dem letzten
# COMMIT und faehrt ueber jede ungeschriebene Aenderung hinweg. Die Sicherung
# ueberlebt auch einen Abbruch (trap).
#
#   bash tests/gegenprobe_markt_liste.sh
cd "$(dirname "$0")/.." || exit 1

DATEIEN=(markt.html tests/smoke_all.mjs)
SICH="/tmp/gp_ml.$$"; mkdir -p "$SICH"
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
heile(){ for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; }
auf(){ heile; rm -rf "$SICH"; }
trap auf INT TERM EXIT

gruen=0; blind=0; falsch=0; tot=0
LAUF=/tmp/gp_ml_lauf.$$.txt

# fall <name> <datei> <alt> <neu> <muster-das-in-der-roten-zeile-stehen-muss>
fall(){
  local name="$1" datei="$2" alt="$3" neu="$4" trifft="$5"
  if ! ALT="$alt" DATEI="$datei" python3 -c "
import io,os,sys
s=io.open(os.environ['DATEI'],encoding='utf-8').read()
sys.exit(0 if s.count(os.environ['ALT'])==1 else 1)"; then
    echo "  ⊘ TOTER ANKER (fehlt oder trifft mehrfach): $name"; tot=$((tot+1)); return
  fi
  ALT="$alt" NEU="$neu" DATEI="$datei" python3 -c "
import io,os
p=os.environ['DATEI']; s=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(s.replace(os.environ['ALT'],os.environ['NEU'],1))"
  node tests/smoke_all.mjs > "$LAUF" 2>&1
  local code=$?
  local rot; rot=$(grep -c '✗' "$LAUF")
  if [ "$code" -eq 0 ]; then
    echo "  ✗ BLIND: $name — die Probe blieb gruen"; blind=$((blind+1))
  elif grep -q '✗.*'"$trifft" "$LAUF"; then
    if [ "$rot" -gt 1 ]; then
      echo "  ✓ schlaegt an: $name — aber $rot rote Zeilen, nicht eine:"
      grep '✗' "$LAUF" | head -4 | sed 's/^/        /'
    else
      echo "  ✓ schlaegt an: $name"
    fi
    gruen=$((gruen+1))
  else
    echo "  ⚠ ROT AUS FALSCHEM GRUND: $name — erwartet „$trifft\", rote Zeilen:"
    grep '✗' "$LAUF" | head -3 | sed 's/^/        /'
    falsch=$((falsch+1))
  fi
  heile
  return 0
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_all.mjs > "$LAUF" 2>&1; then
  echo "  ✓ gruen"
else
  echo "  ✗ schon OHNE Eingriff rot — die Gegenprobe misst so nichts:"
  grep '✗' "$LAUF" | head -5 | sed 's/^/        /'; exit 1
fi

echo
echo "═══ MARKTLISTE: die vier Waechter ═══"

# 1 — genau das, wogegen der Waechter seit 2026-08-05 gebaut ist.
#     ⚠ Er wirft ZWEI rote Zeilen: „keine Adresse doppelt verlinkt" faellt mit,
#     und zwar zu RECHT — wer die Liste anhaengt, verlinkt jede Adresse wirklich
#     zweimal. Das ist kein Fall, der den Nachbarn faelschlich umwirft, sondern
#     ein Schaden mit zwei Symptomen. Der Lauf sagt die Zahl dazu, statt sie zu
#     verschweigen.
fall "die Liste wird ANGEHAENGT statt ersetzt" markt.html \
  'box.innerHTML = view.map(card).join("");' \
  'box.innerHTML += view.map(card).join("");' \
  'jeder Eintrag steht genau einmal'

# 2 — eine Karte ohne Eintrag. Schmal gehalten: EINE erfundene dazu, sonst
#     faellt der Nachbar „wer fehlt" mit um und der Fall belegt zweierlei.
fall "eine Karte ohne Eintrag wird gezeichnet" markt.html \
  'box.innerHTML = view.map(card).join("");' \
  'box.innerHTML = view.map(card).join("") + '"'"'<div class="listing"><a href="apps/markt-gibtsnicht/">x</a></div>'"'"';' \
  'keine Karte ohne Eintrag'

# 3 — ein Eintrag verschwindet aus einem Grund, der NIRGENDS steht
fall "ein Eintrag verschwindet ohne Grund in wache-hand.json" markt.html \
  'if (!x || !x.anchorId) return false;
        /* Beim ERSTEN Aufbau' \
  'if (!x || !x.anchorId) return false;
        if (x.anchorId === "markt-mixarium") return true;
        /* Beim ERSTEN Aufbau' \
  'wer fehlt, hat einen Grund'

# 4 — der Selbst-Riegel: sabotiert wird die SCHWELLE, damit genau er faellt
fall "der Selbst-Riegel meldet sich, wenn nichts gemessen wurde" tests/smoke_all.mjs \
  'ok(gez.karten>=10 && gez.karten===gez.kennungen.length,' \
  'ok(gez.karten>=10000 && gez.karten===gez.kennungen.length,' \
  'es wurde ueberhaupt etwas gemessen'

rm -f "$LAUF"
echo
echo "⚠ BENANNTE GRENZE: fuer „der Wartungs-Riegel faellt ganz weg\" steht hier"
echo '   KEIN Fall. Dieser Waechter baut inWartung() mit Absicht nicht nach —'
echo "   eine zweite Fassung derselben Regel liefe auseinander. Er verlangt nur"
echo "   die EINE Richtung: wer fehlt, braucht einen hingeschriebenen Grund."
echo "   Die andere Richtung misst tests/smoke_wartung.mjs im echten Browser."
echo
echo "$gruen schlagen an, $blind blind, $falsch aus falschem Grund, $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
