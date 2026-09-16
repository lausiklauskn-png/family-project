#!/usr/bin/env bash
# Gegenprobe zu tests/smoke_cache_version.mjs (Klaus 2026-09-16).
#
# Der Smoke haelt zusammen, dass eine Schalen-Aenderung wirklich beim Besucher
# ankommt. Ein Test, der eine Zusicherung prueft, ohne dass sie jemand einmal
# kaputt gemacht hat, ist nur ein gruener Haken.
#
# ANLASS: der Waechter kannte eine von HAND gepflegte Liste von sechs Assets und
# sah dadurch 40 von 52 Verweisen. `assets/notranslate.js` stand in zwoelf
# Verweisen und wurde von NIEMANDEM geprueft. Die Liste wird seitdem GEFUNDEN.
#
#   bash tests/gegenprobe_cache_version.sh
#
# Alle Aenderungen werden zurueckgenommen, auch beim Abbruch.

set -u
cd "$(dirname "$0")/.."

DATEIEN="sw.js index.html werkzeuge/such-werkzeug.html tests/smoke_cache_version.mjs"
gruen=0; durch=0; blind=0
SICH="/tmp/gp_cachev_$$"; mkdir -p "$SICH"
sichern()  { for d in $DATEIEN; do cp "$d" "$SICH/$(echo "$d" | tr '/' '_')"; done; }
zurueck()  { for d in $DATEIEN; do cp "$SICH/$(echo "$d" | tr '/' '_')" "$d"; done; }
aufraeumen(){ zurueck; rm -rf "$SICH"; }
sichern
trap aufraeumen INT TERM EXIT

# probe <Beschreibung> <Datei> <sed-Ausdruck>
probe() {
  local was="$1" datei="$2" ausdruck="$3"
  zurueck
  local vorher="/tmp/gp_cv_vorher_$$"; cp "$datei" "$vorher"
  sed -i "$ausdruck" "$datei"
  if cmp -s "$vorher" "$datei"; then
    echo "  ✗ WIRKUNGSLOS: $was — der Ausdruck hat nichts geaendert (toter Anker)"
    blind=$((blind + 1)); rm -f "$vorher"; return
  fi
  rm -f "$vorher"
  if node tests/smoke_cache_version.mjs >/tmp/gp_cv_log_$$ 2>&1; then
    echo "  ✗ NICHT GEFANGEN: $was — der Smoke blieb gruen"
    durch=$((durch + 1))
  else
    echo "  ✓ schlaegt an: $was → $(grep -m1 '✗' /tmp/gp_cv_log_$$ | sed 's/^ *//' | cut -c1-96)"
    gruen=$((gruen + 1))
  fi
  rm -f /tmp/gp_cv_log_$$
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_cache_version.mjs >/tmp/gp_cv_log_$$ 2>&1; then
  echo "  ✓ der Baum ist ohne Eingriff gruen"
else
  echo "  ✗ ABBRUCH: schon ohne Eingriff rot — die Gegenprobe misst nichts."
  tail -4 /tmp/gp_cv_log_$$; rm -f /tmp/gp_cv_log_$$; exit 1
fi
rm -f /tmp/gp_cv_log_$$

echo
echo "═══ Die Zahlen laufen auseinander ═══"
# ⚠ KEINE FESTE NUMMER IM AUSDRUCK. Gezielt wird auf die Ziffernfolge, gesetzt
#   wird 1 — das weicht von jeder kuenftigen Cache-Version ab, ohne auf die
#   heutige zu zeigen. Genau daran sind die ?v=-Faelle in PWA-Toolpoint schon
#   einmal blind geworden.
probe "ASSET_V weicht von der CACHE_VERSION ab" \
      sw.js 's|var ASSET_V = "[0-9]*"|var ASSET_V = "1"|'

probe "der Offline-Vorrat haengt auf einer alten ?v=" \
      sw.js 's|"assets/style\.css?v=[0-9]*"|"assets/style.css?v=1"|'

probe "eine Seite bleibt auf einer alten ?v= zurueck" \
      index.html 's|assets/app\.js?v=[0-9]*|assets/app.js?v=1|'

echo
echo "═══ Die Liste wird GEFUNDEN, nicht gepflegt (Befund 2026-09-16) ═══"
# ⚠ DIESER FALL WAERE VOR DEM 2026-09-16 NICHT GEFANGEN WORDEN. notranslate.js
#   stand in der von Hand gepflegten Aufzaehlung NICHT — der Waechter sah es nie
#   an. Er ist der Beleg, dass die Liste jetzt wirklich gefunden wird.
probe "ein Skript aus der fruher UNGEPRUEFTEN Menge haengt zurueck" \
      werkzeuge/such-werkzeug.html 's|assets/notranslate\.js?v=[0-9]*|assets/notranslate.js?v=1|'

# ⚠ DIE ZWEITE HAELFTE DER REGEL. Ein Verweis OHNE ?v= ist in Ordnung, solange
#   die Datei in CORE steht (der Worker holt CORE mit cache:"reload", also am
#   HTTP-Cache vorbei). Faellt sie aus CORE, haengt sie frei — genau das war
#   studio-markt.js am 2026-08-03.
probe "eine Datei ohne ?v= faellt aus dem Vorrat und haengt frei" \
      sw.js 's|"assets/tool-landing\.js", ||'

# Die Gegenrichtung zum Selbst-Waechter: schrumpft die gefundene Menge wieder
# auf die frueher gepflegte, ist der Waechter erneut der am Einzelfall — und man
# saehe es an keiner roten Zeile.
# ⚠ UND DIE SABOTAGE DARF DIE GRUPPEN-NUMMERIERUNG NICHT VERSCHIEBEN. Der erste
#   Anlauf setzte `(style\.css|app\.js)` ein — eine FANGENDE Gruppe. Damit
#   rutschen m[2] und m[3] um eins, der Waechter liest den falschen Treffer und
#   meldet Unsinn wie „assets/style.cssstyle.css". Rot war es auch so, nur trug
#   die rote Zeile eine andere Aussage als die gemeinte. Es braucht `(?:…)`.
probe "die gefundene Menge schrumpft auf die alte Handliste" \
      tests/smoke_cache_version.mjs \
      's|assets\\/\[A-Za-z0-9._-\]+|assets\\/(?:style\\.css\|app\\.js)|'

echo
echo "── $gruen gefangen · $durch durchgerutscht · $blind tote Anker ──"
[ "$durch" -eq 0 ] && [ "$blind" -eq 0 ]
