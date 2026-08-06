#!/bin/bash
# Gegenprobe zur Bestaetigungs-Regel in tools/forschung.mjs (Klaus 2026-08-06).
# Ein Waechter, der dabei gruen bleibt, prueft nichts (forschung/LEHREN.md Lehre 5).
# Macht das Werkzeug absichtlich kaputt und stellt es per git checkout wieder her --
# darum NICHT Teil des naechtlichen Laufs. Von Hand fahren:
#   bash tests/gegenprobe_forschung_bestaetigung.sh
#
# Anlass: Jasons-Tresor lieferte 83 / 64 / 97 an drei Naechten, letzter Commit vom
# 2026-08-03. Der Sprung 64 -> 97 lief durch die Schwelle 20 und stand als Erfolg
# im Journal, obwohl niemand etwas gebaut hatte. Seither gilt: ein Sprung wird
# erst gemeldet, wenn ihn die NAECHSTE Messung haelt.
#
# Laeuft ohne Browser, also schnell (ein paar Sekunden je Probe).
cd "$(dirname "$0")/.." || exit 1

T=tests/smoke_forschung.mjs
W=tools/forschung.mjs

# Sperre, aus Schaden klug (2026-08-06): heile() ist ein `git checkout --`.
# Liegt der zu pruefende Stand noch uncommitted im Baum, loescht die erste
# heile() ihn -- und alle Proben danach messen den alten Stand.
DRECK=$(git status --porcelain -- "$T" "$W")
if [ -n "$DRECK" ]; then
  echo "ABBRUCH: nicht eingecheckte Aenderungen an Dateien, die diese Gegenprobe"
  echo "zuruecksetzt. Erst committen, sonst wird die Arbeit geloescht:"
  echo "$DRECK"
  exit 1
fi

lauf() {  # lauf "<name>" "<erwartung: rot|gruen>"
  if node "$T" > /tmp/gp3.txt 2>&1; then E=gruen; else E=rot; fi
  if [ "$E" = "$2" ]; then echo "  ✓ $1 → $E (erwartet)"; else
    echo "  ✗ $1 → $E, erwartet $2"; grep '✗' /tmp/gp3.txt | head -3; fi
}
heile() { git checkout -- "$T" "$W" 2>/dev/null; }
bricht() { # bricht "<python-ersetzung>"
  python3 - "$1" <<'EOF'
import sys, re
p = 'tools/forschung.mjs'; s = open(p).read()
alt, neu = sys.argv[1].split('|||')
assert s.count(alt) == 1, f"Ankertext nicht eindeutig ({s.count(alt)}x): {alt[:60]}"
open(p, 'w').write(s.replace(alt, neu, 1))
EOF
}

echo "═══ GEGENPROBEN Bestaetigungs-Regel ═══"

echo; echo "0 · unveraenderter Stand"
lauf "nichts angefasst" gruen

echo; echo "A · Regel ausgehaengt: ein Sprung meldet sofort, wie frueher"
echo "     (das ist genau der Zustand, der den Jasons-Tresor-Fehlalarm erzeugt hat)"
bricht 'r.verdacht = { gesehen: m.gemessen, sprung, weg, dazu, quelle: m.quelle, quellwechsel };
    verdaechtig++;|||ereignisse.push({ ziel: m.id, name: m.name, url: m.url, datum: m.gemessen, sprung, weg, dazu, quelle: m.quelle, quellwechsel });'
lauf "Verdacht wird sofort zum Eintrag" rot
heile

echo; echo "B · Richtungspruefung entfernt: nur der Abstand zaehlt"
echo "     (dann 'bestaetigt' ein Ausschlag nach oben einen Einbruch nach unten)"
bricht 'return Math.abs(d) >= SCHWELLE && (d > 0) === (s.d > 0);|||return Math.abs(d) >= SCHWELLE;'
lauf "Abstand ohne Richtung" rot
heile

echo; echo "C · Ausreisser wird zum neuen Massstab (basis ignoriert)"
echo "     (dann dreht sich eine schwankende Seite selbst einen Eintrag an: 32→80→34)"
bricht 'const vonWo = (k) => (basis && typeof basis[k] === "number" ? basis[k] : letzt[k]);|||const vonWo = (k) => letzt[k];'
lauf "gegen den Ausreisser gerechnet" rot
heile

echo; echo "D · Verdacht wird nicht gemerkt (ueberlebt die Nacht nicht)"
echo "     (dann wird NIE etwas bestaetigt — das Journal bliebe fuer immer leer)"
bricht 'const urteil = verdachtPruefen(r, m);|||const urteil = null;'
lauf "Verdacht wird nie geprueft" rot
heile

echo; echo "E · Pruefung hinter die 'gleich'-Abkuerzung geschoben"
echo "     (eine unveraenderte Folge-Messung ist die STAERKSTE Bestaetigung —"
echo "      steht die Pruefung dahinter, bleibt sie ewig Verdacht)"
bricht 'if (m.gemessen > letzt.bis) { letzt.bis = m.gemessen; verlaengert++; }
      continue;|||if (m.gemessen > letzt.bis) { letzt.bis = m.gemessen; verlaengert++; }
      if (r.verdacht) { /* GEGENPROBE: Bestaetigung verschlucken */ }
      continue;'
echo "     … dazu die Pruefung selbst nach hinten:"
bricht 'const urteil = verdachtPruefen(r, m);|||const urteil = gleich({ werte: m.werte, mangel: m.mangel }, { werte: Object.fromEntries(MASSE.map((k) => [k, letzt[k]])), mangel: letzt.mangel || [] }) ? null : verdachtPruefen(r, m);'
lauf "gleiche Messung bestaetigt nicht mehr" rot
heile

echo; echo "F · Schwelle so hoch, dass nie ein Verdacht entsteht"
echo "     (die Schwelle sagt weiterhin, was gross genug ist — sie ist nicht abgeschafft)"
bricht 'const SCHWELLE = 20;|||const SCHWELLE = 200;'
lauf "Schwelle 200" rot
heile

echo; echo "═══ Endstand ═══"
lauf "wieder unveraenderter Stand" gruen
git status --short
