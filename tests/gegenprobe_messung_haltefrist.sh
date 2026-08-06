#!/bin/bash
# Gegenprobe zur Haltefrist des gelisteten Wertes (Klaus 2026-08-06).
# Ein Waechter, der dabei gruen bleibt, prueft nichts (forschung/LEHREN.md Lehre 5).
# Macht die Werkzeuge absichtlich kaputt und stellt sie per git checkout wieder
# her -- darum NICHT Teil des naechtlichen Laufs. Von Hand fahren:
#   bash tests/gegenprobe_messung_haltefrist.sh
#
# Die Regel: ein BESSERER Wert gilt sofort, ein SCHLECHTERER erst nach drei
# Messungen hintereinander. Sie ist nur so lange ehrlich, wie drei Dinge gelten
# -- und genau diese drei werden hier einzeln gebrochen:
#   1. der gezeigte Wert wurde wirklich so gemessen (Proben D, E)
#   2. sein Messdatum wandert nicht mit                (Probe C)
#   3. der frische Wert geht nicht verloren            (Proben F, G)
# Faellt eines davon weg, ist es Schoenfaerberei statt Entprellung.
#
# Laeuft ohne Browser, also schnell.
cd "$(dirname "$0")/.." || exit 1

TM=tests/smoke_stufe5_messung.mjs
TF=tests/smoke_forschung.mjs
M=tools/messung.mjs
F=tools/forschung.mjs

DRECK=$(git status --porcelain -- "$TM" "$TF" "$M" "$F")
if [ -n "$DRECK" ]; then
  echo "ABBRUCH: nicht eingecheckte Aenderungen an Dateien, die diese Gegenprobe"
  echo "zuruecksetzt. Erst committen, sonst wird die Arbeit geloescht:"
  echo "$DRECK"
  exit 1
fi

lauf() {  # lauf "<name>" "<erwartung>" "<test-datei>"
  if node "${3:-$TM}" > /tmp/gp4.txt 2>&1; then E=gruen; else E=rot; fi
  if [ "$E" = "$2" ]; then echo "  ✓ $1 → $E (erwartet)"; else
    echo "  ✗ $1 → $E, erwartet $2"; grep '✗' /tmp/gp4.txt | head -3; fi
}
heile() { git checkout -- "$TM" "$TF" "$M" "$F" 2>/dev/null; }
bricht() {
  python3 - "$1" "$2" <<'EOF'
import sys
p = sys.argv[2]; s = open(p).read()
alt, neu = sys.argv[1].split('|||')
assert s.count(alt) == 1, f"Ankertext nicht eindeutig ({s.count(alt)}x): {alt[:70]}"
open(p, 'w').write(s.replace(alt, neu, 1))
EOF
}

echo "═══ GEGENPROBEN Haltefrist ═══"

echo; echo "0 · unveraenderter Stand"
lauf "messung: nichts angefasst" gruen "$TM"
lauf "forschung: nichts angefasst" gruen "$TF"

echo; echo "A · Haltefrist ausgehaengt: jeder schlechtere Wert gilt sofort"
echo "     (das ist der Zustand, in dem ein Wuerfelwurf eine App aus dem Markt kippt)"
bricht 'if (frisch.leistung >= vorher.leistung) return uebernehmen();|||return uebernehmen();' "$M"
lauf "schlechterer Wert sofort uebernommen" rot "$TM"
heile

echo; echo "B · Zaehler zu niedrig: schon der zweite schlechtere Wert gilt"
bricht 'export const SCHLECHTER_NOETIG = 3;|||export const SCHLECHTER_NOETIG = 2;' "$M"
lauf "SCHLECHTER_NOETIG = 2" rot "$TM"
heile

echo; echo "B2 · Zaehler zu hoch: ein echter Absturz wird nie uebernommen"
bricht 'export const SCHLECHTER_NOETIG = 3;|||export const SCHLECHTER_NOETIG = 9;' "$M"
lauf "SCHLECHTER_NOETIG = 9" rot "$TM"
heile

echo; echo "C · Das Messdatum wandert mit (Ehrlichkeits-Regel 2)"
echo "     (die Karte behauptete dann, den alten Wert HEUTE gemessen zu haben)"
bricht 'if (vorher.gemessen) m.gemessen = vorher.gemessen;   // wandert NICHT mit|||m.gemessen = heute;' "$M"
lauf "altes Ergebnis mit heutigem Datum" rot "$TM"
heile

echo; echo "D · Die guten Zahlen von gestern mit den guten von heute gemischt"
echo "     (dann passt die Karte zu KEINEM Bericht, auf den sie verlinkt)"
bricht 'for (const k of SCHLUESSEL) m[k] = vorher[k];
    m.stand = vorher.stand === "gemessen" ? "gemessen" : "veraltet";|||for (const k of SCHLUESSEL) m[k] = Math.max(vorher[k], frisch[k]);
    m.stand = vorher.stand === "gemessen" ? "gemessen" : "veraltet";' "$M"
lauf "je Zahl das Beste aus beiden" rot "$TM"
heile

echo; echo "E · Die Zaehlung sammelt sich, statt Hintereinander zu verlangen"
echo "     (dann kippt 83/64/97/64 die Karte, obwohl nie zwei schlechte in Folge kamen)"
bricht 'if (frisch.leistung >= vorher.leistung) return uebernehmen();|||if (frisch.leistung >= vorher.leistung) { const t = uebernehmen(); if (vorher.zurueckgehalten) t.zurueckgehalten = vorher.zurueckgehalten; return t; }' "$M"
lauf "guter Wert setzt die Zaehlung nicht zurueck" rot "$TM"
heile

echo; echo "F · Der frische Wert wird weggeworfen (Ehrlichkeits-Regel 3)"
bricht 'm.frisch = frisch;|||/* GEGENPROBE: frisch verschluckt */' "$M"
lauf "keine Spur der echten Messung" rot "$TM"
heile

echo; echo "G · Die Forschung nimmt den gehaltenen statt des echten Wertes"
echo "     (dann verloere die Messreihe genau die Ausreisser, wegen derer es die Regel gibt)"
bricht 'const echt = (mess) => (mess && mess.frisch ? { ...mess, ...mess.frisch } : mess);|||const echt = (mess) => mess;' "$F"
lauf "Messreihe schreibt den Karten-Wert fort" rot "$TF"
heile

echo; echo "═══ Endstand ═══"
lauf "messung: wieder unveraendert" gruen "$TM"
lauf "forschung: wieder unveraendert" gruen "$TF"
git status --short
