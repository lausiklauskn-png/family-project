#!/bin/bash
# Gegenprobe zu tests/smoke_werbevideo.mjs. Jeder Wächter bekommt einen Fehler,
# der ihn umwerfen MUSS — und die rote Zeile muss den Namen SEINER Zusicherung
# tragen. „Gefangen" allein ist keine Messung.
#
# Sabotiert wird der echte Baum, zurückgelegt aus einer SICHERUNG (nie per
# `git checkout --`, das fährt über ungeschriebene Arbeit). Die Sicherung
# überlebt einen Abbruch (trap).
#
# ⚠ Die Sabotagen am Spieler laufen mit GEGENPROBE_PIN_AUS=1, sonst wäre jede
# zuerst ein Pin-Bruch („rot aus falschem Grund"). Der Pin hat Fall 1, ohne Schalter.
#
#   bash tests/gegenprobe_werbevideo.sh          NUR_FALL="STOPP" für einen Fall
#   NUR_ANKER=1 bash tests/gegenprobe_werbevideo.sh   nur die Anker, fährt KEINE Probe
#   und fasst den Baum nicht an. Ohne den Schalter lief am 2026-10-06 ein
#   „NUR_ANKER"-Aufruf als voller Lauf im echten Baum (er kannte ihn nicht).
#
# ⚠ Der volle Lauf gehört in eine Wegwerf-Kopie, und vorher wird committet.
cd "$(dirname "$0")/.." || exit 1
export PW_CORE="${PW_CORE:-/opt/node-tools/node_modules/playwright-core/index.mjs}"

DATEIEN=(assets/abspielen-rahmen.js assets/abspielen-kern.js sw.js index.html)
SICH="/tmp/gp_wv.$$"; mkdir -p "$SICH"
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
heile(){ for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; }
auf(){ heile; rm -rf "$SICH"; }
trap auf INT TERM EXIT
LAUF="/tmp/gp_wv_lauf.$$.txt"

gruen=0; blind=0; falsch=0; tot=0

# fall <name> <datei> <alt> <neu> <muster der roten Zeile> [pin-an]
fall(){
  local name="$1" datei="$2" alt="$3" neu="$4" trifft="$5" pin="${6:-}"
  if [ -n "$NUR_FALL" ] && [[ "$name" != *"$NUR_FALL"* ]]; then return 0; fi
  if ! ALT="$alt" python3 -c "
import io,os,sys
s=io.open('$datei',encoding='utf-8').read()
sys.exit(0 if os.environ['ALT'] in s else 1)"; then
    echo "  ⊘ TOTER ANKER: $name"; tot=$((tot+1)); return 0
  fi
  if [ -n "$NUR_ANKER" ]; then
    local n; n=$(ALT="$alt" python3 -c "
import io,os
print(io.open('$datei',encoding='utf-8').read().count(os.environ['ALT']))")
    if [ "$n" -ne 1 ]; then echo "  ⊘ ANKER TRIFFT ${n}x: $name"; tot=$((tot+1))
    else echo "  · lebt: $name"; gruen=$((gruen+1)); fi
    return 0
  fi
  ALT="$alt" NEU="$neu" python3 -c "
import io,os
p='$datei'; s=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(s.replace(os.environ['ALT'],os.environ['NEU'],1))"
  if [ -n "$pin" ]; then node tests/smoke_werbevideo.mjs > "$LAUF" 2>&1
  else GEGENPROBE_PIN_AUS=1 node tests/smoke_werbevideo.mjs > "$LAUF" 2>&1; fi
  local code=$?
  if [ "$code" -eq 0 ]; then
    echo "  ✗ BLIND: $name — die Probe blieb grün"; blind=$((blind+1))
  elif grep -q '✗.*'"$trifft" "$LAUF"; then
    echo "  ✓ schlägt an: $name"; gruen=$((gruen+1))
  else
    echo "  ⚠ ROT AUS FALSCHEM GRUND: $name — erwartet „$trifft\", rote Zeilen:"
    grep '✗\|⊘' "$LAUF" | head -3 | sed 's/^/        /'
    falsch=$((falsch+1))
  fi
  heile
  return 0
}

if [ -n "$NUR_ANKER" ]; then trap - INT TERM EXIT; rm -rf "$SICH"
else
echo "═══ Ausgangslage ═══"
if node tests/smoke_werbevideo.mjs > "$LAUF" 2>&1; then echo "  ✓ grün"
else echo "  ✗ schon OHNE Eingriff rot — die Gegenprobe misst so nichts:"; grep '✗\|⊘' "$LAUF" | head -5; exit 1; fi
fi

echo; echo "═══ WERBEVIDEO im Rahmen der Startseite ═══"
# Die Muster in den roten Zeilen tragen KEINEN Umlaut: im C-Locale trifft
# `.` ein Byte, und ein Umlaut sind zwei (family-project, 2026-09-22).

fall 'PIN: der Kern weicht ein Byte von FP-Videos ab' assets/abspielen-kern.js \
  '  var TEIL_MAX = 3;' '  var TEIL_MAX = 3; ' \
  'abspielen-kern.js ist die gepinnte Kopie' pin

fall 'AUTOSTART: das Video bekommt seine Quelle schon beim Laden' assets/abspielen-rahmen.js \
  'vid.setAttribute("playsinline", ""); vid.setAttribute("preload", "none");' \
  'vid.setAttribute("playsinline", ""); vid.setAttribute("preload", "auto"); vid.src = mit(M.weg, id);' \
  'vor dem Tipp'

fall 'ROUTE: der Worker fängt werbevideo/ nicht mehr ab' sw.js \
  '  if (vw) {' '  if (false) {' \
  'nach dem Tipp l'

fall 'KNOPF: ▶ und ⏸ vertauscht' assets/abspielen-rahmen.js \
  'symbol(spielen, laeuft ? "pause" : "spielen");' 'symbol(spielen, laeuft ? "spielen" : "pause");' \
  'solange es nicht l'

fall 'RAHMEN: die Leiste liegt unter dem Rahmen statt darin' assets/abspielen-rahmen.js \
  '".vr-leiste{position:absolute;left:6px;right:6px;bottom:6px;' '".vr-leiste{position:absolute;left:6px;right:6px;bottom:-60px;' \
  'Bedienung liegt IM Rahmen'

fall 'LADEBALKEN: Geladenes wird nicht mehr gezeigt' assets/abspielen-rahmen.js \
  'var gel = d ? Math.min(100, vorgeladenBis() / d * 100) : 0;' 'var gel = gesp;' \
  'mehr Geladenes'

fall 'FUENFFACH: Tipps in der Leiste zählen zum Bild-Wechsel' assets/abspielen-rahmen.js \
  'x.addEventListener("click", function (e) { e.stopPropagation(); });' 'x.addEventListener("click", function (e) { });' \
  'Bild-Wechsel-Fenster'

fall 'SCROLLEN: Weiterscrollen hält das Video an' assets/abspielen-rahmen.js \
  '    vid.addEventListener("play", function () { setzeZustand("laeuft"); });' \
  '    vid.addEventListener("play", function () { setzeZustand("laeuft"); }); addEventListener("scroll", function () { vid.pause(); });' \
  'Weiterscrollen'

fall 'GROESSEN: die Liste der Video-Seite wird nicht gefragt' assets/abspielen-rahmen.js \
  'fetch(M.quelle + "videos.json"' 'fetch(M.quelle + "videos-x.json"' \
  'nennt die Gr'

fall 'QUALITAET: der Wechsel beginnt wieder vorn' assets/abspielen-rahmen.js \
  '        quelle(fid, ab, lief);' '        quelle(fid, 0, lief);' \
  'an derselben Stelle'

fall 'VOLLBILD: zurück aus dem Vollbild hält es an' assets/abspielen-rahmen.js \
  '["fullscreenchange", "webkitfullscreenchange"].forEach(function (n) { document.addEventListener(n, zeichne); });' \
  '["fullscreenchange", "webkitfullscreenchange"].forEach(function (n) { document.addEventListener(n, function () { if (!vollbildElement()) vid.pause(); zeichne(); }); });' \
  'nach dem Vollbild'

fall 'MERKEN: die Stelle wird nicht gemerkt' assets/abspielen-rahmen.js \
  'localStorage.setItem(M.merken, ' 'void (M.merken, ' \
  'Stelle ist gemerkt'

fall 'STOPP: Stopp lässt die Quelle stehen und lädt weiter' assets/abspielen-rahmen.js \
  '      vid.removeAttribute("src");
      try { vid.load(); } catch (e) {}
      gestartet = null;' '      gestartet = null;' \
  'Stopp: das Bild'

fall 'MENUE: das Menü bekommt rechts wieder 44 px Rand' assets/abspielen-rahmen.js \
  'overflow:auto;padding:4px 8px 4px 10px;' 'overflow:auto;padding:4px 44px 4px 10px;' \
  'einreihig'

fall 'SEITE: der Rahmen trägt den Spieler nicht mehr' index.html \
  '                 data-video-rahmen
' '' \
  'sitzt IM Bildrahmen'


fall 'FORM: der Rahmen behaelt beim Abspielen die Bildform (schwarze Balken)' assets/abspielen-rahmen.js \
  '".vr-rahmen:not([data-vr-zustand=ruhe]){aspect-ratio:var(--vr-format,1.7778)!important;' '".vr-rahmen:not([data-vr-zustand=ruhe]){' \
  'Form des Films'

fall 'ENDE: nach dem letzten Bild bleibt das Video stehen' assets/abspielen-rahmen.js \
  'vid.addEventListener("ended", function () { if (zustand !== "ruhe") stoppe(); });' 'vid.addEventListener("ended", function () { });' \
  'Grundansicht'

fall 'PUNKTE: beim Laden kreist nichts' assets/abspielen-rahmen.js \
  '  function punkte(eltern) {' '  function punkte(eltern) { return;' \
  'kreisen Punkte'

# Die schlanke Leiste (Klaus 2026-10-06): sie tritt beim Spielen zurück, ein Tipp
# holt sie, „720p" verschwindet, und der Name steht nicht sichtbar da.
fall 'LEISE: die Leiste bleibt beim Spielen stehen' assets/abspielen-rahmen.js \
  'if (leiseErlaubt()) rahmen.setAttribute("data-vr-leise", ""); }, LEISE_MS);' '}, LEISE_MS);' \
  'beim Abspielen tritt die Leiste'

fall 'TIPP: ein Tipp aufs Video holt die Leiste nicht zurueck' assets/abspielen-rahmen.js \
  'if (rahmen.hasAttribute("data-vr-leise")) { wach(); return; }' 'if (rahmen.hasAttribute("data-vr-leise")) { return; }' \
  'ein Tipp aufs Video holt die Leiste'

fall 'QUAL: die Qualitaet bleibt stehen' assets/abspielen-rahmen.js \
  'qualUhr = setTimeout(function () { qual.hidden = true; }, QUAL_MS);' 'qualUhr = null;' \
  'verschwindet nach 2 s'

# Die Seite trägt keinen data-video-titel (M.titel ist leer); eine Sabotage, die nur
# M.titel einsetzt, nähme „weiter bei" mit und fiele über den Neuladen-Wächter
# (gemessen am 2026-10-06: „rot aus falschem Grund"). Sie hängt deshalb den Namen an.
fall 'TITEL: der Name des Videos steht wieder sichtbar in der Leiste' assets/abspielen-rahmen.js \
  'titel.textContent = stelle > 0 ? T.weiterBei + mmss(stelle) : "";' 'titel.textContent = (stelle > 0 ? T.weiterBei + mmss(stelle) : "") + (M.titel || "Werbevideo");' \
  'steht nicht im sichtbaren Text'

echo
echo "═══ $gruen schlagen an · $blind blind · $falsch aus falschem Grund · $tot tote Anker ═══"
rm -f "$LAUF"
[ "$blind" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
