#!/bin/bash
# Gegenprobe zu Fall 9 in tests/smoke_stufe2_sporen.mjs (Sporen-Bericht im Studio).
# Ein Waechter, der dabei gruen bleibt, prueft nichts (forschung/LEHREN.md Lehre 5).
# Macht Test und Studio absichtlich kaputt und stellt sie per git checkout wieder
# her -- darum NICHT Teil des naechtlichen Laufs. Von Hand fahren:
#   bash tests/gegenprobe_stufe2_sporen.sh
#
# Anlass (2026-08-06): Fall 9 stand auf "drei Zeilen im Bericht (7)". Er zaehlte
# mit document.querySelectorAll(".fpst-sporezeile") ueber die ganze Seite und
# bekam die 3 Zeilen des Sporen-Blocks PLUS 4 Zeilen des Mess-Blocks, der
# dieselbe CSS-Klasse benutzt. Der Waehler ist jetzt auf [data-role=sporen]
# eingegrenzt. Probe C zeigt, warum die bequeme Reparatur (3 auf 7 hochsetzen)
# ein gruener Haken ohne Deckung gewesen waere.
#
# Ein Lauf dauert ein paar Minuten (echter Browser). Sechs Proben, also Geduld.
cd "$(dirname "$0")/.." || exit 1

T=tests/smoke_stufe2_sporen.mjs
S=assets/studio-markt.js
M=assets/config/messung-hand.json

# SPERRE, aus Schaden klug (2026-08-06): heile() ist ein `git checkout --`.
# Beim ersten Lauf lag der zu pruefende Fix noch UNCOMMITTED im Baum -- die
# erste heile() hat ihn mitgeloescht, und alle Proben danach liefen gegen den
# alten Stand und meldeten Unsinn. Ein Werkzeug, das eine Datei zuruecksetzt,
# darf nur laufen, wenn diese Datei sauber ist.
DRECK=$(git status --porcelain -- "$T" "$S" "$M")
if [ -n "$DRECK" ]; then
  echo "ABBRUCH: nicht eingecheckte Aenderungen an Dateien, die diese Gegenprobe"
  echo "zuruecksetzt. Erst committen, sonst wird die Arbeit geloescht:"
  echo "$DRECK"
  exit 1
fi

lauf() {  # lauf "<name>" "<erwartung: rot|gruen>"
  if node "$T" > /tmp/gp2.txt 2>&1; then E=gruen; else E=rot; fi
  if [ "$E" = "$2" ]; then echo "  ✓ $1 → $E (erwartet)"; else
    echo "  ✗ $1 → $E, erwartet $2"; grep '✗' /tmp/gp2.txt | head -3; fi
}
heile() { git checkout -- "$T" "$S" "$M" 2>/dev/null; }

echo "═══ GEGENPROBEN Fall 9 ═══"

echo; echo "0 · unveraenderter Stand"
lauf "nichts angefasst" gruen

echo; echo "A · echter Fehler: das Studio laesst eine Bericht-Zeile weg"
echo "     (beweist, dass der eingegrenzte Waehler den Sporen-Block wirklich sieht)"
python3 - <<'EOF'
p='assets/studio-markt.js'; s=open(p).read()
alt='    for (var i = 0; i < ids.length; i++) {\n      var id = ids[i], e = st.eintraege[id] || {};'
neu='    for (var i = 0; i < ids.length; i++) {\n      if (i === 1) continue;   // GEGENPROBE\n      var id = ids[i], e = st.eintraege[id] || {};'
assert s.count(alt) == 1, "Ankertext nicht eindeutig gefunden"
open(p,'w').write(s.replace(alt, neu, 1))
EOF
lauf "nur 2 statt 3 Zeilen im Bericht" rot
heile

echo; echo "B · falsche Reparatur 1: Erwartung von 3 auf 7 hochgesetzt"
sed -i 's/ok(z.length === 3, "drei Zeilen im Bericht/ok(z.length === 7, "drei Zeilen im Bericht/' "$T"
lauf "erwartet 7, findet 3" rot
heile

echo; echo "C · falsche Reparatur 2: Waehler wieder ungefiltert UND Erwartung 7"
echo "     — sieht heute gruen aus, haengt aber an einer voellig fremden Datei:"
sed -i 's|^const SPZ = "\[data-role=sporen\] .fpst-sporezeile";|const SPZ = ".fpst-sporezeile";|' "$T"
sed -i 's/ok(z.length === 3, "drei Zeilen im Bericht/ok(z.length === 7, "drei Zeilen im Bericht/' "$T"
lauf "ungefiltert + 7, heutiger Stand" gruen
echo "     … und jetzt traegt jemand EINE Messung von Hand nach:"
python3 - <<'EOF'
import json, collections
p='assets/config/messung-hand.json'
d=json.load(open(p), object_pairs_hook=collections.OrderedDict)
d['markt-kimseek']={"gemessen":"2026-08-06","leistung":88,"barrierefreiheit":95,
                    "gute_praxis":96,"seo":92,"url":"https://example.invalid/gegenprobe/"}
json.dump(d, open(p,'w'), indent=2, ensure_ascii=False)
EOF
lauf "ungefiltert + 7, eine Messung mehr" rot
echo "     ↑ genau darum ist 7 keine Reparatur: die Zahl gehoert dem Mess-Block."
heile

echo; echo "D · Entkopplung: dieselbe zusaetzliche Messung, aber mit eingegrenztem Waehler"
python3 - <<'EOF'
import json, collections
p='assets/config/messung-hand.json'
d=json.load(open(p), object_pairs_hook=collections.OrderedDict)
d['markt-kimseek']={"gemessen":"2026-08-06","leistung":88,"barrierefreiheit":95,
                    "gute_praxis":96,"seo":92,"url":"https://example.invalid/gegenprobe/"}
json.dump(d, open(p,'w'), indent=2, ensure_ascii=False)
EOF
lauf "Mess-Block waechst, Bericht-Pruefung bleibt ruhig" gruen
heile

echo; echo "E · kaputter Waehler faellt auf, statt still gruen zu bleiben"
sed -i 's|^const SPZ = "\[data-role=sporen\] .fpst-sporezeile";|const SPZ = "[data-role=gibtsnicht] .fpst-sporezeile";|' "$T"
lauf "Waehler trifft nichts (0 Zeilen)" rot
heile

echo; echo "F · XSS-Pruefung: fremder Text als HTML eingebaut"
echo "     (die Pruefung sieht nach der Eingrenzung noch immer den RICHTIGEN Text an)"
python3 - <<'EOF'
p='assets/studio-markt.js'; s=open(p).read()
alt='        vor.textContent = e.neuerText;          // fremder Text — nie als HTML'
neu='        vor.innerHTML = e.neuerText;            // GEGENPROBE: absichtlich falsch'
assert s.count(alt) == 1, "Ankertext nicht eindeutig gefunden"
open(p,'w').write(s.replace(alt, neu, 1))
EOF
lauf "innerHTML statt textContent" rot
heile

echo; echo "═══ Endstand ═══"
lauf "wieder unveraenderter Stand" gruen
git status --short
