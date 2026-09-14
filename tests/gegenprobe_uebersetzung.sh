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

# ⚠ JEDE Datei, die ein Fall anfasst, MUSS hier stehen. Fehlt eine, bleibt die
# Sabotage liegen, die Faelle stapeln sich, und der naechste meldet die rote
# Zeile des vorigen — gefangen aus dem falschen Grund. Genau so geschehen am
# 2026-09-14 mit sicherheit.html.
heile() { git checkout -- assets/ tests/ markt.html index.html werkzeuge.html sicherheit.html 2>/dev/null; }

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
# ⚠ ZWEI RIEGEL DECKEN EINANDER, und beide sind berechtigt: die Liste in
# notranslate.js UND das translate="no", das card() direkt ins Karten-Markup
# schreibt. Der erste Lauf baute nur einen aus und meldete „nicht gefangen",
# obwohl beide Waechter tadellos waren. Sabotiert wird die ZUSICHERUNG, nicht
# die Zeile — also beide zugleich.
fall_zwei() {  # fall_zwei "<name>" <d1> <a1> <n1> <d2> <a2> <n2>
  local name="$1"; shift
  if ! ersetze "$1" "$2" "$3" > /dev/null 2>&1 || ! ersetze "$4" "$5" "$6" > /dev/null 2>&1; then
    echo "  ✗ $name → ANKER NICHT GEFUNDEN (misst nichts)"; tot=$((tot+1)); heile; return
  fi
  if node tests/smoke_uebersetzung.mjs > /tmp/gpu.txt 2>&1; then
    echo "  ✗ $name → gruen geblieben, NICHT GEFANGEN"; durch=$((durch+1))
  else
    echo "  ✓ $name → rot: $(grep -m1 '✗' /tmp/gpu.txt | sed 's/^ *//' | cut -c1-92)"; gefangen=$((gefangen+1))
  fi
  heile
}
# ⚠ UND DER ANKER MUSS EINDEUTIG SEIN. `<div class="body"><h3 translate="no">`
# steht 18× in markt.html — 17× in der statischen Liste und einmal in card().
# Die statische Liste steht WEITER OBEN, also traf die Ersetzung eine Karte
# statt der Funktion: sabotiert war eine Karte, die das Skript ohnehin
# ueberschreibt, und der Fall meldete „nicht gefangen". Genommen wird deshalb
# die JS-Form mit `+ esc(x.label)` — die gibt es genau einmal.
fall_zwei "App-Namen fallen aus BEIDEN Riegeln" \
  assets/notranslate.js '".listing h3",' '".listing KEIN-TREFFER-h3",' \
  markt.html "'<div class=\"body\"><h3 translate=\"no\">' + esc(x.label)" "'<div class=\"body\"><h3>' + esc(x.label)"
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

echo; echo "═══ E · der Sprachriegel ═══"
# Der Riegel im <head> ist der eigentliche: er laeuft VOR dem ersten Anstrich.
# Faellt er aus, hat Chrome laengst entschieden, wenn app.js dran ist.
# ⚠ DIE SABOTAGE MUSS DIE SEITE TREFFEN, DIE DER WAECHTER MISST. Die erste
# Fassung nahm markt.html — dort wird geklickt, aber der Waechter „der Riegel
# steht schon VOR dem ersten Anstrich" misst die NAECHSTE Seite, werkzeuge.html.
# Der Fall aenderte also eine Seite, auf die keine Zusicherung zeigt, und
# meldete sich als „nicht gefangen", obwohl der Waechter tadellos ist.
fall "der Riegel im <head> faellt aus" werkzeuge.html \
  'if(localStorage.getItem("fp_lang_wahl")!=="1")return;' \
  'if(true)return;'
# Der Klick muss die Wahl MERKEN — sonst greift der head-Riegel beim naechsten
# Aufbau nicht, und alles ist wie vorher.
fall "der Klick merkt die Wahl nicht mehr" assets/app.js \
  '    try { localStorage.setItem(LS_WAHL, "1"); } catch (_e) {}' \
  '    /* nicht gemerkt */'
# Gesperrt wird auf drei Wegen zugleich, weil keiner allein ueberall greift.
fall "das meta google/notranslate faellt weg" assets/app.js \
  '      m.name = "google"; m.content = "notranslate";' \
  '      m.name = "google-AUS"; m.content = "notranslate";'
fall "der Knopf waehlt nicht mehr ausdruecklich (nur applyLang)" assets/app.js \
  'alsKnopf(lb, function () { waehleSprache(lang === "de" ? "en" : "de"); },' \
  'alsKnopf(lb, function () { applyLang(lang === "de" ? "en" : "de"); },'
# Der Hinweis ist der dritte Fall: Google war schneller. Ohne ihn raet der
# Nutzer, warum die Seite zurueckspringt.
fall "der Beobachter fuer den Uebersetzer wird abgeschaltet" assets/app.js \
  '    if (!gewaehlt) return;                       // wer nicht gewaehlt hat, wird nicht belaestigt' \
  '    return;'
# Die Gegenrichtung, und sie ist die wichtigere: ein Riegel, der IMMER greift,
# nimmt fremdsprachigen Besuchern den einzigen Weg.
fall "gesperrt wird auch OHNE Wahl (Google fuer alle tot)" markt.html \
  'if(localStorage.getItem("fp_lang_wahl")!=="1")return;' \
  'if(false)return;'
# Der Weg zurueck: ohne ihn ist ein Klick eine Einbahnstrasse.
fall "der lange Druck nimmt die Wahl nicht mehr zurueck" assets/app.js \
  '    langerDruckZuruecknehmen(lb);' '    /* abgeschaltet */'

echo; echo "═══ D · sicherheit.html traegt ihre Uebersetzung selbst ═══"
# Die Seite laedt kein app.js. Faellt ihr eigenes Woerterbuch oder der Anwender
# aus, steht sie im Englisch-Modus wieder vollstaendig auf Deutsch — genau der
# Zustand vor dem 2026-09-14.
fall "die Ueberschrift verliert ihre englische Fassung" sicherheit.html \
  'sh_h1: "How the mycelium works, and how you are protected.",' \
  'sh_h1_AUS: "How the mycelium works, and how you are protected.",'
fall "der Anwender schreibt nichts mehr" sicherheit.html \
  '      if (w[k] != null) el.textContent = w[k];' \
  '      /* abgeschaltet */'
fall "die Seite folgt fp_lang nicht mehr" sicherheit.html \
  '  var lang = gewaehlt();' \
  '  var lang = "de";'
# Ein EINZELNER Woerterbuch-Eintrag verliert seine englische Fassung — dann
# steht dort wieder deutscher Text, und genau das soll auffallen.
fall "ein einzelner Woerterbuch-Eintrag verliert seine EN-Fassung" sicherheit.html \
  '    sh_g_hyphe: "a single fungal thread' \
  '    sh_g_hyphe_AUS: "a single fungal thread'
# Die Gegenrichtung: Eigennamen sollen STEHEN BLEIBEN. Bekommt „Hyphe" eine
# Uebersetzung, ist das ein Fehler, den der Waechter fangen muss.
# ⚠ Der Haken muss auf einen Schluessel zeigen, den es im englischen
# Woerterbuch WIRKLICH gibt. Die erste Fassung nahm `sh_gt_hyphe` — den gibt es
# nicht, `w[k] != null` war false, der Text blieb stehen, und der Fall aenderte
# gar nichts. Eine Sabotage, die nichts aendert, misst nichts.
fall "ein Eigenname wird faelschlich uebersetzt" sicherheit.html \
  '<dt translate="no">Hyphe</dt>' '<dt data-i18n="sh_gt_knoten">Hyphe</dt>'

echo
echo "$gefangen gefangen · $durch durchgerutscht · $tot tote Anker"
[ "$durch" -eq 0 ] && [ "$tot" -eq 0 ] || exit 1
