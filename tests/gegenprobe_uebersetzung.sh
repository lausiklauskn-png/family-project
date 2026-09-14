#!/bin/bash
# Gegenprobe zu tests/smoke_uebersetzung.mjs: jede Zusicherung absichtlich brechen.
# Ein Waechter, der dabei gruen bleibt, prueft nichts.
#
# Macht Dateien absichtlich kaputt und stellt sie per git checkout wieder her --
# darum NICHT Teil von npm test. Von Hand fahren:
#   bash tests/gegenprobe_uebersetzung.sh
#
# ⚠ WER DEN LAUF ABBRICHT, prueft danach `git status` — eine liegengebliebene
#   Sabotage sieht aus wie ein kaputtes Depot. (Lehre aus PWA-Toolpoint 2026-09-09.)
set -u
cd "$(dirname "$0")/.." || exit 1

gefangen=0; durch=0; tot=0

heile() { git checkout -- assets/ tests/ markt.html index.html werkzeuge.html 2>/dev/null; }

# ersetze <datei> <alt> <neu> -- meldet, wenn der Anker NICHT sass. Ein toter
# Anker aendert nichts und sieht danach aus wie ein blinder Waechter.
ersetze() {
  local d="$1" a="$2" n="$3"
  python3 - "$d" "$a" "$n" <<'PY'
import sys, io
d, a, n = sys.argv[1], sys.argv[2], sys.argv[3]
s = io.open(d, encoding="utf-8").read()
if a not in s:
    print("ANKER-TOT"); raise SystemExit(3)
io.open(d, "w", encoding="utf-8").write(s.replace(a, n, 1))
PY
}

fall() {  # fall "<name>" <datei> <alt> <neu>
  local name="$1"; shift
  if ! ersetze "$@" > /tmp/gpu_anker.txt 2>&1; then
    echo "  ✗ $name → ANKER NICHT GEFUNDEN (misst nichts)"; tot=$((tot+1)); heile; return
  fi
  if node tests/smoke_uebersetzung.mjs > /tmp/gpu.txt 2>&1; then
    echo "  ✗ $name → gruen geblieben, NICHT GEFANGEN"; durch=$((durch+1))
  else
    echo "  ✓ $name → rot: $(grep -m1 '✗' /tmp/gpu.txt | sed 's/^ *//' | cut -c1-92)"; gefangen=$((gefangen+1))
  fi
  heile
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_uebersetzung.mjs > /tmp/gpu0.txt 2>&1; then
  echo "  ✓ ohne Eingriff gruen"
else
  echo "  ✗ die Probe ist SCHON OHNE EINGRIFF rot — die Gegenprobe misst nichts."
  grep '✗' /tmp/gpu0.txt | head -3; exit 1
fi

echo; echo "═══ A · der Riegel gegen den Auto-Uebersetzer ═══"
# Der Riegel ist EINE Liste an EINER Stelle. Faellt ein Eintrag heraus, ist
# genau dieser Eigenname wieder Googles Beute.
fall "Markenname faellt aus dem Riegel" assets/notranslate.js \
  '".brand",' '"KEIN-TREFFER-brand",'
fall "Themen-Knopf faellt aus dem Riegel (das war „Hoelle“)" assets/notranslate.js \
  '"#themeBtn",' '"#KEIN-TREFFER-themeBtn",'
fall "App-Namen fallen aus dem Riegel" assets/notranslate.js \
  '".listing h3",' '".listing KEIN-TREFFER-h3",'
# Der Beobachter ist der Teil, der die NACHGELADENEN Elemente erwischt. Ohne
# ihn bleibt die Pille „🌐 Mycel“ ungeriegelt, obwohl sie in der Liste steht —
# ein einmaliger Durchgang beim Start laeuft vor ihr.
fall "der Beobachter wird abgeschaltet (nachgeladene Pille)" assets/notranslate.js \
  'if (!global.MutationObserver) return;' 'if (true) return;'
# Die Gegenrichtung: ein Riegel, der ALLES sperrt, nimmt fremdsprachigen
# Besuchern den einzigen Weg. Das muss genauso auffallen.
fall "zu viel geriegelt (auch der Fliesstext)" assets/notranslate.js \
  '"[data-eigenname]"' '"[data-eigenname]", "p"'

echo; echo "═══ B · der eigene DE/EN-Schalter ═══"
fall "Themen-Name folgt der Sprache nicht mehr" assets/app.js \
  'if (nameEl) nameEl.textContent = (th.anzeige && th.anzeige[lang]) || th.name;' \
  'if (nameEl) nameEl.textContent = th.name;'
fall "Container-Text bleibt deutsch (Klaus' Befund)" markt.html \
  'return String((en && x.text_en) ? x.text_en : (x.text || ""));' \
  'return String(x.text || "");'
fall "eine englische Container-Fassung verschwindet" assets/config/listings.js \
  '"text_en": "Recipe book and cookbook' '"text_en_AUS": "Recipe book and cookbook'
fall "das Studio wirft text_en wieder weg (Positivliste)" assets/studio-markt.js \
  'if (e.text_en) o.text_en = String(e.text_en).trim();' \
  '/* weggeworfen */'
fall "zwei verschiedene englische Fassungen desselben Satzes" index.html \
  'a3_p: "Find apps and offer them.' 'a3_p: "Find and offer apps.'

echo; echo "═══ C · die Mikrofon-Sprache am Mikrofon ═══"
fall "der Waehler wandert zurueck in die Kopfleiste" assets/app.js \
  '    var feld = ersterMic.closest(".field");
    if (feld) micLangZuFeld(feld);' \
  '    var nav = document.querySelector("nav.top"); if (nav) nav.appendChild(micSpracheReihe);'
fall "der Waehler folgt dem benutzten Mikrofon nicht mehr" assets/app.js \
  '      try { micLangZuFeld(field); } catch (_e) {}' '      /* abgeschaltet */'
# Die Suchzeile ist ein Flex-Behaelter. Ohne Umbruch wird der Waehler zu einem
# dritten Element IN der Zeile und quetscht das Suchfeld auf 230 px.
fall "die Suchzeile bricht nicht mehr um (Feld wird gequetscht)" assets/style.css \
  '.searchrow{margin:22px auto 0;max-width:680px;display:flex;gap:10px;flex-wrap:wrap}' \
  '.searchrow{margin:22px auto 0;max-width:680px;display:flex;gap:10px}'
fall "der Suchen-Knopf rutscht in die dritte Zeile" assets/style.css \
  '.searchrow > .mic-sprache{order:2;margin:2px 2px 0}' \
  '.searchrow > .mic-sprache{margin:2px 2px 0}'

echo
echo "$gefangen gefangen · $durch durchgerutscht · $tot tote Anker"
[ "$durch" -eq 0 ] && [ "$tot" -eq 0 ] || exit 1
