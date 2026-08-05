#!/bin/bash
# Gegenprobe zu tests/smoke_statische_listen.mjs: jede Pruefung absichtlich brechen.
# Ein Waechter, der dabei gruen bleibt, prueft nichts (forschung/LEHREN.md Lehre 5).
# Macht die Seiten absichtlich kaputt und stellt sie per git checkout wieder her --
# darum NICHT Teil von npm test. Von Hand fahren:  bash tests/gegenprobe_statische_listen.sh
# Am 2026-08-05 hat Probe B hier einen echten Fehler IM WAECHTER gefunden:
# /\breferrer\b/ trifft "noreferrer" nicht, zwei Pruefungen waren wirkungslos.
cd "$(dirname "$0")/.." || exit 1

lauf() {  # lauf "<name>" "<erwartung: rot|gruen>"
  if node tests/smoke_statische_listen.mjs > /tmp/gp.txt 2>&1; then E=gruen; else E=rot; fi
  if [ "$E" = "$2" ]; then echo "  ✓ $1 → $E (erwartet)"; else
    echo "  ✗ $1 → $E, erwartet $2"; grep '✗' /tmp/gp.txt | head -3; fi
}
heile() { git checkout -- markt.html werkzeuge.html sitemap.xml assets/config/ 2>/dev/null; }

echo "═══ GEGENPROBEN ═══"

echo; echo "A · Datendatei geändert, Neubau vergessen (Prüfung 1/2/5)"
python3 - <<'EOF'
import re
p='assets/config/listings.js'; s=open(p).read()
neu='''  {
    "label": "Testeintrag Gegenprobe",
    "anchorId": "markt-gegenprobe",
    "text": "Nur fuer die Gegenprobe.",
    "by": "@test",
    "url": "https://example.org/gegenprobe/",
    "img": "https://example.org/bild.png",
    "own": true
  },
'''
s=s.replace('  // FP_LISTINGS_INSERT_HERE', neu+'  // FP_LISTINGS_INSERT_HERE')
open(p,'w').write(s)
EOF
lauf "neuer Eintrag ohne Neubau" rot
echo "     … und nach dem Neubau:"
node tools/statische-listen.mjs > /dev/null && lauf "nach node tools/statische-listen.mjs" gruen
heile

echo; echo "B · Eintrag ist FREMD (kein own) — muss nofollow ugc bekommen (Prüfung 4)"
python3 - <<'EOF'
p='assets/config/listings.js'; s=open(p).read()
neu='''  {
    "label": "Fremder Testeintrag",
    "anchorId": "markt-fremd-test",
    "text": "Fremde Einsendung fuer die Gegenprobe.",
    "by": "@fremd",
    "url": "https://example.org/fremd/",
    "img": "https://example.org/bild.png"
  },
'''
s=s.replace('  // FP_LISTINGS_INSERT_HERE', neu+'  // FP_LISTINGS_INSERT_HERE')
open(p,'w').write(s)
EOF
node tools/statische-listen.mjs > /dev/null
echo -n "     erzeugtes rel: "; grep -o 'href="https://example.org/fremd/"[^>]*' markt.html | grep -o 'rel="[^"]*"'
lauf "fremder Eintrag korrekt gebaut" gruen
echo "     falsche Reparatur — jemand macht daraus einen normalen Link:"
sed -i 's|href="https://example.org/fremd/" target="_blank" rel="nofollow ugc noopener noreferrer"|href="https://example.org/fremd/" target="_blank" rel="noopener"|' markt.html
lauf "fremd, aber ohne nofollow" rot
heile

echo; echo "C · Rote Ampel → kein Link (Prüfung 3)"
python3 - <<'EOF'
import json
p='assets/config/spore-stand.json'; d=json.load(open(p))
d['eintraege']['markt-kimboard']['wache']['ampel']='rot'
d['eintraege']['markt-kimboard']['wache']['grund']='safebrowsing'
json.dump(d,open(p,'w'),indent=2,ensure_ascii=False)
EOF
lauf "Ampel rot, Seite noch nicht neu gebaut" rot
node tools/statische-listen.mjs > /dev/null
echo -n "     Kimboard-Link nach Neubau: "; grep -c 'href="https://lausiklauskn-png.github.io/Kimboard/"' markt.html
echo -n "     Kimboard-Karte trotzdem sichtbar: "; grep -c '>Kimboard<' markt.html
lauf "rot gebaut: Eintrag sichtbar, Link weg" gruen
echo "     falsche Reparatur — Link von Hand wieder rein:"
sed -i 's|<div class="listing-actions"><div class="listing-foot"></div></div></div></div>|<div class="listing-actions"><div class="listing-foot"><a class="btn ghost ext" href="https://lausiklauskn-png.github.io/Kimboard/" target="_blank" rel="noopener">→ Zur Seite</a></div></div></div></div>|' markt.html
lauf "Link auf Eis-Eintrag wieder eingebaut" rot
heile

echo; echo "D · Angehängt statt ersetzt (Prüfung 6)"
python3 - <<'EOF'
p='markt.html'; s=open(p).read()
s=s.replace('<!-- statische-listen:ende -->','<div class="glass listing"><div class="body"><h3>doppelt</h3></div></div>\n<!-- statische-listen:ende -->',1)
open(p,'w').write(s)
EOF
lauf "zusätzliche Zeile im Block" rot
heile

echo; echo "E · Fremder Host in werkzeuge.js (Falle 7)"
python3 - <<'EOF'
p='assets/config/werkzeuge.js'; s=open(p).read()
s=s.replace('window.FP_WERKZEUGE = [','''window.FP_WERKZEUGE = [
  { id: "fremd", name: "Fremdes Werkzeug", icon: "❓", external: true,
    de: "Gegenprobe.", en: "Counter-check.",
    open: "https://beispiel-fremd.de/" },''')
open(p,'w').write(s)
EOF
node tools/statische-listen.mjs > /dev/null
lauf "fremder Host würde als eigen behandelt" rot
heile

echo; echo "F · Sitemap zeigt auf eine Datei, die es nicht gibt (Prüfung 7)"
sed -i 's|<loc>https://family-projekt.de/referenzen.html</loc>|<loc>https://family-projekt.de/gibtsnicht.html</loc>|' sitemap.xml
lauf "tote Adresse in der Sitemap" rot
heile

echo; echo "G · Werkzeug-Unterseite aus der Sitemap entfernt (Prüfung 7)"
python3 - <<'EOF'
import re
p='sitemap.xml'; s=open(p).read()
s=re.sub(r'  <url>\s*<loc>https://family-projekt\.de/werkzeuge/such-werkzeug\.html</loc>.*?</url>\n','',s,flags=re.S)
open(p,'w').write(s)
EOF
lauf "such-werkzeug.html fehlt in der Sitemap" rot
heile

echo; echo "═══ Endstand: Wächter muss wieder grün sein ═══"
lauf "unveränderter Stand" gruen
git status --short

echo; echo "H · Eigener Eintrag bekommt noreferrer (der Fall, der am 2026-08-05 durchrutschte)"
python3 - <<'EOF'
p='markt.html'; s=open(p).read()
alt='href="https://lausiklauskn-png.github.io/Mein-Rezeptbuch-Page/" target="_blank" rel="noopener"'
open(p,'w').write(s.replace(alt, alt.replace('rel="noopener"','rel="noopener noreferrer"'),1))
EOF
lauf "eigen, aber noreferrer" rot
heile
lauf "Endstand wieder grün" gruen
