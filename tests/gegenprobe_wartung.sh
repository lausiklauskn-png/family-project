#!/usr/bin/env bash
# Gegenprobe zur WARTUNG (Klaus 2026-09-18): werden die Wächter auch WIRKLICH rot?
#
# Die Wartung berührt VIER Stellen, und jede hat ihren eigenen Wächter:
#
#   tools/waechter.mjs           der nächtliche Lauf sieht nicht nach
#   tools/statische-listen.mjs   die gebaute Seite lässt die Karte weg
#   markt.html                   der Browser lässt sie sofort weg
#   assets/studio-markt.js       der Knopf, der schaltet
#
# Ein Wächter ohne Gegenprobe ist nur ein grüner Haken. Diese Datei baut jede
# Lücke einzeln wieder ein und verlangt, dass die zuständige Probe umfällt.
#
#   bash tests/gegenprobe_wartung.sh
#
# ⚠ SIE SABOTIERT DEN ECHTEN BAUM und legt alles danach zurück — auch beim
# Abbruch. Wer sie abbricht, nimmt TERM (nicht KILL) und sieht danach mit
# `git status` nach.
#
# ⚠ UND SIE PRÜFT DIE AUSGANGSLAGE. Ist schon etwas rot, misst kein Fall mehr
# etwas — genau der Fall, der am 2026-09-18 in PWA Toolpoint eine ganze
# Veröffentlichung stillgelegt hat, ohne dass es jemandem auffiel.

set -u
cd "$(dirname "$0")/.."

SICH="/tmp/gp_wartung.$$"
mkdir -p "$SICH"
DATEIEN=(tools/waechter.mjs tools/statische-listen.mjs markt.html assets/studio-markt.js)
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
aufraeumen() { for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; rm -rf "$SICH"; }
trap aufraeumen INT TERM EXIT

gruen=0; blind=0; wirkungslos=0

# probe <Beschreibung> <Datei> <Probe> <python-Ausdruck alt> <neu>
probe() {
  local was="$1" datei="$2" probe="$3" alt="$4" neu="$5"
  for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done
  ALT="$alt" NEU="$neu" python3 - "$datei" <<'PY'
import os, sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
a, n = os.environ["ALT"], os.environ["NEU"]
if s.count(a) != 1:
    sys.exit(9)          # Anker trifft nicht genau einmal
open(p, "w", encoding="utf-8").write(s.replace(a, n, 1))
PY
  local rc=$?
  if [ "$rc" -eq 9 ]; then
    echo "  ✗ TOTER ANKER: $was — der Ausdruck trifft nicht genau einmal"
    wirkungslos=$((wirkungslos + 1)); return
  fi
  if node "$probe" >/dev/null 2>&1; then
    echo "  ✗ BLIND: $was — $(basename "$probe") blieb grün"
    blind=$((blind + 1))
  else
    echo "  ✓ schlägt an: $was"
    gruen=$((gruen + 1))
  fi
}

echo "═══ Ausgangslage ═══"
for pr in tests/smoke_statische_listen.mjs tests/smoke_studio_markt.mjs tests/smoke_wartung.mjs; do
  if node "$pr" >/dev/null 2>&1; then echo "  ✓ $(basename "$pr") grün"
  else echo "  ✗ $(basename "$pr") ist SCHON ROT — kein Fall misst etwas."; exit 2; fi
done

echo
echo "═══ A · Der nächtliche Wächter ═══"
probe "der Wächter urteilt auch während der Wartung" \
      tools/waechter.mjs tests/smoke_stufe3_waechter.mjs \
      '} else if (hand.wartung === true) {' \
      '} else if (false) {'
# ⚠ DIESE SABOTAGE MUSSTE ZWEIMAL GEBAUT WERDEN. Der erste Anlauf hängte
# `|| handAmpel === "rot"` an die Wartungs-Bedingung — wirkungslos, weil der
# rot-Zweig DARÜBER steht und den Fall längst gefangen hat. Die Reihenfolge IST
# der Riegel; also wird sie umgedreht.
probe "die Wartung steht ÜBER der Sperre statt darunter" \
      tools/waechter.mjs tests/smoke_stufe3_waechter.mjs \
      '  if (handAmpel === "rot") {' \
      '  if (hand.wartung === true) {
    w.ampel = AMPELN.includes(vorher.ampel) ? vorher.ampel : "gruen";
    w.grund = "in_wartung";
    w.fehlschlaege = Number(vorher.fehlschlaege) || 0;
    w.wartung = true;
  } else if (handAmpel === "rot") {'
probe "die Fehlschläge laufen in der Wartung weiter" \
      tools/waechter.mjs tests/smoke_stufe3_waechter.mjs \
      '    w.fehlschlaege = Number(vorher.fehlschlaege) || 0;
    w.wartung = true;' \
      '    w.fehlschlaege = (Number(vorher.fehlschlaege) || 0) + 1;
    w.wartung = true;'

echo
echo "═══ B · Das Bau-Werkzeug ═══"
probe "die gebaute Seite lässt die Karte doch stehen" \
      tools/statische-listen.mjs tests/smoke_statische_listen.mjs \
      '      return !(w && w.wartung === true && w.ampel !== "rot");' \
      '      return true;'
probe "die Sperre geht im Bau-Werkzeug nicht vor" \
      tools/statische-listen.mjs tests/smoke_statische_listen.mjs \
      '      return !(w && w.wartung === true && w.ampel !== "rot");' \
      '      return !(w && w.wartung === true);'

echo
echo "═══ C · Der Marktplatz im Browser ═══"
probe "der Filter lässt die Karte stehen" \
      markt.html tests/smoke_wartung.mjs \
      ' && !inWartung(x); });' \
      '; });'
probe "die Sperre wird nur im Bericht gesucht (nicht in der Arbeitskopie)" \
      markt.html tests/smoke_wartung.mjs \
      '        if (hand && hand.ampel === "rot") return false;' \
      '        if (false) return false;'
probe "die Arbeitskopie wirkt nicht mehr sofort" \
      markt.html tests/smoke_wartung.mjs \
      '              WARTUNG[wk] = wacheHand[wk];' \
      '              WARTUNG[wk] = null;'

echo
echo "═══ D · Das Studio ═══"
probe "der Knopf fällt aus der Liste" \
      assets/studio-markt.js tests/smoke_studio_markt.mjs \
      "'<button data-wartung=\"' + i + '\">' +" \
      "'<button data-wartungNIEMALS=\"' + i + '\">' +"
probe "die Sperre wird erst NACH dem Schreiben geprüft" \
      assets/studio-markt.js tests/smoke_studio_markt.mjs \
      '    if (an && wacheAmpel(id) === "rot") { toast(T("wa_wartung_gesperrt"), false); return false; }' \
      '    /* verschoben */'
probe "sie schaltet nur in EINE Richtung" \
      assets/studio-markt.js tests/smoke_studio_markt.mjs \
      '      delete neu.wartung;' \
      '      neu.wartung = true;'
probe "wartungBis wird beim Beenden nicht gesetzt" \
      assets/studio-markt.js tests/smoke_studio_markt.mjs \
      '      neu.wartungBis = heuteOrt();' \
      '      delete neu.wartungBis;'
probe "sie setzt dirty statt wacheDirty" \
      assets/studio-markt.js tests/smoke_studio_markt.mjs \
      '    wacheDirty = true; markDirty();
    renderList();' \
      '    dirty = true; markDirty();
    renderList();'
probe "der englische Knopf-Text fehlt" \
      assets/studio-markt.js tests/smoke_studio_markt.mjs \
      '      wa_wartung: "🛠 Maintenance",' \
      '      wa_wartungNIEMALS: "🛠 Maintenance",'

aufraeumen
trap - INT TERM EXIT
echo
echo "$gruen Wächter schlagen an · $blind blind · $wirkungslos tote Anker"
[ "$blind" -eq 0 ] && [ "$wirkungslos" -eq 0 ] || exit 1
