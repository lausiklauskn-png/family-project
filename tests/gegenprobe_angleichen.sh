#!/usr/bin/env bash
# Gegenprobe zu tests/smoke_angleichen.mjs (Klaus 2026-09-28).
#
# Jeder Fall baut einen Fehler ein, und die Probe muss rot werden — mit dem
# Namen SEINER Zusicherung in der roten Zeile, nicht mit dem eines Nachbarn.
# Gefahren wird in einer WEGWERF-KOPIE: der echte Baum bleibt unberührt,
# auch wenn daneben andere Proben laufen.
#
#   bash tests/gegenprobe_angleichen.sh
#   NUR_ANKER=1 bash tests/gegenprobe_angleichen.sh   # nur: leben die Anker?

set -u
QUELLE="$(cd "$(dirname "$0")/.." && pwd)"
KOPIE="$(mktemp -d)/fp"
mkdir -p "$KOPIE"
( cd "$QUELLE" && git ls-files -z | xargs -0 -I{} cp --parents {} "$KOPIE/" )
[ -d "$QUELLE/node_modules" ] && ln -s "$QUELLE/node_modules" "$KOPIE/node_modules"
# Der Nachbar-Klon, damit „jede App von drüben steht hier" auch in der Kopie misst.
[ -d "$QUELLE/../PWA-Toolpoint" ] && ln -s "$QUELLE/../PWA-Toolpoint" "$(dirname "$KOPIE")/PWA-Toolpoint"
trap 'rm -rf "$(dirname "$KOPIE")"' EXIT
cd "$KOPIE"

gruen=0; blind=0; falsch=0; tot=0

probe() {   # probe <Name> <erwartete rote Zeile> <Datei> <alt> <neu>
  local was="$1" erwartet="$2" datei="$3" alt="$4" neu="$5"
  cp "$QUELLE/$datei" "$datei"
  ALT="$alt" NEU="$neu" python3 - "$datei" <<'PY'
import os, sys
p = sys.argv[1]; s = open(p, encoding="utf-8").read()
a, n = os.environ["ALT"], os.environ["NEU"]
if s.count(a) != 1: sys.exit(9)
open(p, "w", encoding="utf-8").write(s.replace(a, n, 1))
PY
  if [ $? -eq 9 ]; then
    echo "  ✗ TOTER ANKER: $was"; tot=$((tot+1)); cp "$QUELLE/$datei" "$datei"; return
  fi
  if [ -n "${NUR_ANKER-}" ]; then echo "  ✓ Anker lebt: $was"; cp "$QUELLE/$datei" "$datei"; return; fi
  local aus; aus="$(node tests/smoke_angleichen.mjs 2>&1)"
  if [ $? -eq 0 ]; then
    echo "  ✗ BLIND: $was — die Probe blieb grün"; blind=$((blind+1))
  elif printf '%s\n' "$aus" | grep -F "✗ ROT" | grep -qF "$erwartet"; then
    echo "  ✓ schlägt an: $was"; gruen=$((gruen+1))
  else
    echo "  ✗ AUS FALSCHEM GRUND: $was"; printf '%s\n' "$aus" | grep -F "✗ ROT" | head -3 | sed 's/^/      /'
    falsch=$((falsch+1))
  fi
  cp "$QUELLE/$datei" "$datei"
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_angleichen.mjs >/dev/null 2>&1; then echo "  ✓ grün"
else echo "  ✗ SCHON ROT — kein Fall misst etwas."; exit 2; fi

echo "═══ A · Angleichen und doppelte Messung ═══"
probe "ein Forschungs-Ziel misst weiter, obwohl der Marktplatz es misst" \
      "zweimal gemessen" forschung/messziele.json \
      '"id": "eigen-kuechenzettel",
      "name": "Küchenzettel",
      "url": "https://lausiklauskn-png.github.io/Kuechenzettel/",
      "repo": "Kuechenzettel",
      "aktiv": false,' \
      '"id": "eigen-kuechenzettel",
      "name": "Küchenzettel",
      "url": "https://lausiklauskn-png.github.io/Kuechenzettel/",
      "repo": "Kuechenzettel",
      "aktiv": true,'
probe "eine App von PWA Toolpoint fehlt hier" \
      "jede App aus PWA Toolpoint" assets/config/listings.js \
      '"url": "https://lausiklauskn-png.github.io/Kuechenzettel/",' \
      '"url": "https://lausiklauskn-png.github.io/Kuechenzettel-weg/",'

echo "═══ B · Wartung ═══"
probe "Alis Moderaum steht nicht mehr auf Wartung" \
      "stehen auf Wartung" assets/config/wache-hand.json \
      '"eigen-alis-moderaum": {
    "wartung": true,' \
      '"eigen-alis-moderaum": {
    "wartung": false,'
probe "das Bau-Werkzeug lässt Wartung wieder durch" \
      "keiner in Wartung steht in der gebauten Liste" tools/statische-listen.mjs \
      'return !(w && w.wartung === true && w.ampel !== "rot");' \
      'return true;'

echo "═══ C · Erklärvideo ═══"
probe "die gebaute Karte verliert den Hinweis" \
      "jede gebaute Karte mit Video" tools/statische-listen.mjs \
      '(e.video && e.anchorId ? `<p class="mk-video">' \
      '(false && e.anchorId ? `<p class="mk-video">'
probe "markt.html card() verliert den Hinweis" \
      "card() zeichnet den Hinweis" markt.html \
      "'<p class=\"mk-video\"><a href=\"apps/' + esc(x.anchorId) + '/#video\">' + esc(FP.t(\"mk_video\"))" \
      "'<p><a href=\"apps/' + esc(x.anchorId) + '/#video\">' + esc(\"Video\")"
probe "das Video fällt aus der Positivliste" \
      "es gibt Einträge MIT und OHNE Video" tools/statische-listen.mjs \
      '        video: videoVon(x)' \
      '        video: null'
probe "ein unsicheres Video wird durchgelassen" \
      "ohne https-Adresse fällt weg" tools/statische-listen.mjs \
      '  if (!quer) return null;' \
      '  if (!v.quer) return null;'
probe "das Video lädt schon beim Öffnen der Seite" \
      "lädt erst auf Tipp" apps/eigen-workflow-pdf/index.html \
      '<video controls preload="none"' '<video controls preload="auto"'
probe "hochkant fällt die Hochformat-Fassung weg" \
      "Hochformat-Fassung" apps/eigen-workflow-pdf/index.html \
      ' media="(orientation: portrait)"' ''
probe "ein .mp4 kommt in den Vorrat" \
      "kein .mp4 im Service-Worker-Vorrat" sw.js \
      'var ASSET_V = ' '/* https://x.invalid/v.mp4 */ var ASSET_V = '

echo "═══ D · Weg zur App ═══"
probe "die Detailseite verliert den Weg zur App" \
      "ZUR APP eigen-workflow-pdf" apps/eigen-workflow-pdf/index.html \
      'class="btn ghost ext zur-app"' 'class="btn ghost ext"'
probe "rot lässt den Weg zur App stehen" \
      "rot heißt auch hier kein Weg zur App" tools/statische-listen.mjs \
      '        appUrl: aufEis ? "" : safeUrl(x.appUrl),' \
      '        appUrl: safeUrl(x.appUrl),'

echo
echo "$gruen schlagen an · $blind blind · $falsch aus falschem Grund · $tot tote Anker"
[ $((blind + falsch + tot)) -eq 0 ]
