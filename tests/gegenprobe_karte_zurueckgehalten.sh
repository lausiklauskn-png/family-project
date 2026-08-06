#!/bin/bash
# Gegenprobe zur Anzeige "Wert wird zurueckgehalten" (Klaus 2026-08-06).
# Ein Waechter, der dabei gruen bleibt, prueft nichts (forschung/LEHREN.md Lehre 5).
# Macht Seite und Studio absichtlich kaputt und stellt sie per git checkout
# wieder her -- darum NICHT Teil des naechtlichen Laufs. Von Hand fahren:
#   bash tests/gegenprobe_karte_zurueckgehalten.sh
#
# Worum es geht: die Karte zeigt einen aelteren, besseren Wert weiter, weil die
# neueren schlechter waren. Das ist nur so lange Entprellung und nicht
# Schoenfaerberei, wie die Karte es SAGT. Diese Proben brechen genau das --
# jede einzeln, damit keine der Zeilen bloss dekorativ dasteht.
#
# Braucht einen Browser, dauert also ein paar Minuten.
cd "$(dirname "$0")/.." || exit 1

T=tests/smoke_stufe5_messung.mjs
H=markt.html
S=assets/studio-markt.js
C=assets/style.css

DRECK=$(git status --porcelain -- "$T" "$H" "$S" "$C")
if [ -n "$DRECK" ]; then
  echo "ABBRUCH: nicht eingecheckte Aenderungen an Dateien, die diese Gegenprobe"
  echo "zuruecksetzt. Erst committen, sonst wird die Arbeit geloescht:"
  echo "$DRECK"
  exit 1
fi

lauf() {  # lauf "<name>" "<erwartung: rot|gruen>"
  if node "$T" > /tmp/gp5.txt 2>&1; then E=gruen; else E=rot; fi
  if [ "$E" = "$2" ]; then echo "  ✓ $1 → $E (erwartet)"; else
    echo "  ✗ $1 → $E, erwartet $2"; grep '✗' /tmp/gp5.txt | head -3; fi
}
heile() { git checkout -- "$T" "$H" "$S" "$C" 2>/dev/null; }
bricht() {
  python3 - "$1" "$2" <<'EOF'
import sys
p = sys.argv[2]; s = open(p).read()
alt, neu = sys.argv[1].split('|||')
assert s.count(alt) == 1, f"Ankertext nicht eindeutig ({s.count(alt)}x): {alt[:70]}"
open(p, 'w').write(s.replace(alt, neu, 1))
EOF
}

echo "═══ GEGENPROBEN Anzeige zurueckgehalten ═══"

echo; echo "0 · unveraenderter Stand"
lauf "nichts angefasst" gruen

echo; echo "A · Die Zeile auf der Karte faellt weg"
echo "     (dann steht dort eine Zahl, zu der es still eine neuere, schlechtere gibt)"
bricht '''(msHalt(m, "mk_ms_halt") ? '"'"'<p class="mk-ms-halt">'"'"' + esc(msHalt(m, "mk_ms_halt")) + '"'"'</p>'"'"' : '"'"''"'"') +|||''' "$H"
lauf "Karte schweigt" rot
heile

echo; echo "B · Die Zeile steht auf JEDER Karte, auch wo nichts gehalten wird"
echo "     (Laerm ist kein Ersatz fuer Auskunft -- und macht die echte Zeile unsichtbar)"
bricht 'var z = m && m.zurueckgehalten;
        if (!z || !z.zahl) return "";|||var z = (m && m.zurueckgehalten) || { zahl: 1, noetig: 3 };' "$H"
lauf "Zeile ueberall" rot
heile

echo; echo "C · Der Stand der Zaehlung fehlt (nur 'wird gehalten', ohne wie oft)"
echo "     (2 von 3 heisst 'morgen kippt es', 1 von 3 heisst 'noch weit weg')"
bricht '.replace(/\{n\}/g, String(z.zahl))
          .replace(/\{v\}/g, String(z.noetig || 3));|||.replace(/\{n\}/g, "").replace(/\{v\}/g, "");' "$H"
lauf "ohne Zaehlerstand" rot
heile

echo; echo "D · Das Fenster verschweigt die neuere Zahl selbst"
echo "     (dann muss man sie suchen -- und genau das tut niemand)"
bricht '''(m.frisch && msZahlen(m.frisch)|||(false \&\& m.frisch \&\& msZahlen(m.frisch)''' "$H"
lauf "neue Zahl nicht genannt" rot
heile

echo; echo "E · Das Fenster begruendet nicht, sondern behauptet nur"
echo "     (die gemessenen 83/64/97 sind der Unterschied zwischen Beleg und Ausrede)"
bricht 'dieselbe unveränderte Seite lieferte an drei Nächten 83, 64 und 97 Punkte, ohne dass jemand eine Zeile geändert hatte.|||Das ist so.' "$H"
lauf "ohne Begruendung" rot
heile

echo; echo "F · Das Studio schweigt"
echo "     (die Karte sagt es dem Besucher, das Studio dem Betreiber -- beides noetig)"
bricht 'halt.textContent = "⏳ " + T("ms_halt") + " " + zh.zahl + "/" + (zh.noetig || 3) + frisch;|||halt.textContent = "";' "$S"
lauf "Studio ohne Hinweis" rot
heile

echo; echo "G · Das Studio nennt den Stand, aber nicht die neuere Zahl"
bricht '''? " (" + T("ms_leistung") + " " + m.frisch.leistung + " am " + String(m.frisch.gemessen || "").slice(0, 10) + ")"|||? ""''' "$S"
lauf "Studio ohne die neue Zahl" rot
heile

echo; echo "H · Fail-soft gebrochen: fehlt das Feld, kracht es"
echo "     (ein alter Bericht oder ein fremder Knoten darf die Karte nie zerstoeren)"
bricht 'var z = m && m.zurueckgehalten;
        if (!z || !z.zahl) return "";|||var z = m.zurueckgehalten;
        if (!z.zahl) return "";' "$H"
lauf "kein Schutz gegen fehlendes Feld" rot
heile

echo; echo "I · Der Sichttest-Schalter wirkt AUCH OHNE Parameter"
echo "     (dann stuenden erfundene Zahlen auf der echten Seite -- der schlimmste Fall)"
bricht 'if (!/[?&]sichttest=halt\b/.test(location.search)) return;|||if (false) return;' "$H"
lauf "Vorschau ohne Parameter aktiv" rot
heile

echo; echo "J · Die erfundenen Werte erscheinen OHNE Warnband"
echo "     (ein Bildschirmfoto daraus waere von einem echten Stand nicht zu unterscheiden)"
bricht 'if (getroffen) sichttestBand();|||' "$H"
lauf "Vorschau ohne Warnung" rot
heile

echo; echo "K · Der Schalter tut gar nichts"
echo "     (ein Sichttest, den man nicht fahren kann, ist keiner)"
bricht 'var ids = Object.keys(MESSUNG), getroffen = 0;|||var ids = [], getroffen = 0;' "$H"
lauf "Schalter wirkungslos" rot
heile

echo; echo "═══ Endstand ═══"
lauf "wieder unveraenderter Stand" gruen
git status --short
