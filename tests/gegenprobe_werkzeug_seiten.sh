#!/usr/bin/env bash
# Gegenprobe zum Backen der Werkzeug-Seiten (2026-09-22).
#
# Ein Waechter ohne Gegenprobe ist nur ein gruener Haken. Acht Fehler, und
# jeder MUSS `tests/smoke_werkzeug_seiten.mjs` umwerfen.
#
#   bash tests/gegenprobe_werkzeug_seiten.sh
#
# Sabotiert den echten Baum und legt alles zurueck, auch beim Abbruch.
# Wer abbricht, nimmt TERM (nicht KILL) und sieht danach mit `git status` nach.

set -u
cd "$(dirname "$0")/.."

SICH="/tmp/gp_wzs.$$"; mkdir -p "$SICH"
DATEIEN=(assets/tool-landing.js tools/werkzeug-seiten.mjs werkzeuge/such-werkzeug.html werkzeuge/andock-werkzeug.html)
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
aufraeumen() { for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; rm -rf "$SICH"; }
trap aufraeumen INT TERM EXIT

gruen=0; blind=0; tot=0

probe() {   # probe <Name> <Datei> <alt> <neu>
  local was="$1" datei="$2" alt="$3" neu="$4"
  for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done
  ALT="$alt" NEU="$neu" python3 - "$datei" <<'PY'
import os, sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
a, n = os.environ["ALT"], os.environ["NEU"]
if s.count(a) != 1: sys.exit(9)
open(p, "w", encoding="utf-8").write(s.replace(a, n, 1))
PY
  if [ $? -eq 9 ]; then
    echo "  ✗ TOTER ANKER: $was"; tot=$((tot+1)); return
  fi
  if node tests/smoke_werkzeug_seiten.mjs >/dev/null 2>&1; then
    echo "  ✗ BLIND: $was — die Probe blieb gruen"; blind=$((blind+1))
  else
    echo "  ✓ schlaegt an: $was"; gruen=$((gruen+1))
  fi
}

echo "── Gegenprobe: das Backen der Werkzeug-Seiten ──"
if ! node tests/smoke_werkzeug_seiten.mjs >/dev/null 2>&1; then
  echo "ABBRUCH: die Probe ist schon vor der Gegenprobe rot"; exit 2
fi
echo "  ✓ Ausgangszustand gruen"

# 1 · DER FALL, UM DEN ES GEHT: der gebackene Rumpf faellt weg.
#     Vor dem 2026-09-22 war das der Normalzustand — 188 Zeichen.
probe 'der gebackene Rumpf faellt aus einer Seite' werkzeuge/such-werkzeug.html \
      '<main id="toolMain">' \
      '<main id="toolMain" data-leer="1"><!-- GEBACKEN von tools/werkzeug-seiten.mjs — nicht von Hand aendern, der Inhalt steht in FP_TOOL -->
<!-- /GEBACKEN -->
  </main><main hidden id="_alt">'

# 2 · EINE QUELLE: das Gebackene weicht vom Zeichner ab.
#     Zwei Fassungen desselben Markups liefen auseinander, und dann spraenge
#     die Seite im Augenblick des ersten Neuzeichnens.
probe 'das Gebackene weicht vom Zeichner ab' werkzeuge/such-werkzeug.html \
      '<h2>Was es kann</h2>' \
      '<h2>Was es kann (von Hand geaendert)</h2>'

# 3 · der DOM-Riegel faellt weg — dann stirbt jeder Import in Node.
probe 'der DOM-Riegel um den Selbstlauf faellt weg' assets/tool-landing.js \
      '  if (typeof document !== "undefined" && global.addEventListener) {' \
      '  if (true) {'

# 4 · der Zeichner gibt seiteHtml nicht mehr heraus.
probe 'der Zeichner gibt seiteHtml nicht mehr heraus' assets/tool-landing.js \
      '  global.FPToolLanding = { seiteHtml: seiteHtml };' \
      '  /* nichts nach draussen */'

# 5 · der SELBST-RIEGEL: der Sammler laeuft leer.
#     Ohne ihn saehe ein leerer Lauf wie eine bestandene Pruefung aus.
probe 'der Sammler findet gar keine Seite mehr' tools/werkzeug-seiten.mjs \
      '    .filter((p) => /<main\s+id="toolMain"/.test(lies(p)))' \
      '    .filter(() => false)'

# 6 · eine Seite verliert ihr Canonical — dann faellt sie aus der Sitemap,
#     und zwar als MANGEL, nicht als Absicht.
probe 'eine Seite verliert ihr Canonical' werkzeuge/such-werkzeug.html \
      '<link rel="canonical" href="https://family-projekt.de/werkzeuge/such-werkzeug.html" />' \
      '<!-- kein Canonical -->'

# 7 · eine zweite h1 — die Seite haette zwei Themen statt einem.
probe 'eine Seite bekommt eine zweite h1' werkzeuge/such-werkzeug.html \
      '<footer>' \
      '<h1>noch ein Thema</h1><footer>'

# 8 · DIE GRENZE SELBST: eine weitere Stelle holt ihren Inhalt erst im Browser.
#     Ohne diesen Fall waere „ausserhalb des Siegels" ein Freibrief — jede
#     neue nachgeladene Stelle verschwaende lautlos aus dem Vergleich.
probe 'eine zweite Stelle holt ihren Inhalt erst im Browser' assets/tool-landing.js \
      '    main.innerHTML = seiteHtml(T, l, global.FP_SPENDEN);' \
      '    main.innerHTML = seiteHtml(T, l, global.FP_SPENDEN) + "<p>erst im Browser</p>";'

echo
echo "$gruen schlagen an, $blind blind, $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$tot" -eq 0 ]
