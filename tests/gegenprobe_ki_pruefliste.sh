#!/usr/bin/env bash
# Gegenprobe zu tests/smoke_ki_pruefliste.mjs (Bau 04.J / 24.R, 2026-10-14).
# Jeder Fall sabotiert eine Stelle in einer WEGWERF-KOPIE und verlangt, dass die
# Probe rot wird — und zwar mit der roten Zeile, die seine Zusicherung nennt.
#   NUR_ANKER=1  prüft nur, dass jeder Anker genau einmal trifft (Sekunden)
#   NUR_FALL=…   fährt nur Fälle, deren Name das Muster enthält
set -u
QUELLE="$(cd "$(dirname "$0")/.." && pwd)"
NUR_ANKER="${NUR_ANKER-}"; NUR_FALL="${NUR_FALL-}"
gefangen=0; blind=0; falsch=0; tot=0
ARBEIT="$(mktemp -d)"; trap 'rm -rf "$ARBEIT"' EXIT

# fall NAME DATEI ROTE_ZEILE (Python-Ersetzung aus der Umgebung ALT/NEU)
fall() {
  local name="$1" datei="$2" erwartet="$3"
  if [ -n "$NUR_FALL" ] && ! printf '%s' "$name" | grep -q -- "$NUR_FALL"; then return; fi
  local n
  n="$(ALT="$ALT" python3 -c 'import os,sys; print(open(sys.argv[1],encoding="utf-8").read().count(os.environ["ALT"]))' "$QUELLE/$datei")"
  if [ "$n" != "1" ]; then tot=$((tot+1)); echo "  ✗ TOTER ANKER ($n Treffer): $name"; return; fi
  [ -n "$NUR_ANKER" ] && { echo "  · Anker lebt: $name"; return; }
  local k="$ARBEIT/kopie"; rm -rf "$k"; mkdir -p "$k"
  (cd "$QUELLE" && tar --exclude=./node_modules --exclude=./.git -cf - .) | (cd "$k" && tar -xf -)
  ln -s "$QUELLE/node_modules" "$k/node_modules"
  ALT="$ALT" NEU="$NEU" python3 -c 'import os,sys; p=sys.argv[1]; s=open(p,encoding="utf-8").read(); open(p,"w",encoding="utf-8").write(s.replace(os.environ["ALT"],os.environ["NEU"],1))' "$k/$datei"
  local aus rc; aus="$(cd "$k" && timeout 300 node tests/smoke_ki_pruefliste.mjs 2>&1)"; rc=$?
  if [ $rc -eq 0 ]; then blind=$((blind+1)); echo "  ✗ DURCHGERUTSCHT: $name"
  elif printf '%s\n' "$aus" | grep '✗' | grep -q -- "$erwartet"; then gefangen=$((gefangen+1)); echo "  ✓ gefangen: $name"
  else falsch=$((falsch+1)); echo "  ✗ ROT AUS FALSCHEM GRUND: $name"; printf '%s\n' "$aus" | grep '✗' | head -3 | sed 's/^/      /'
  fi
}

echo "GEGENPROBE — Prüfliste vor dem KI-Richter · Halt bei Text aus Foto${NUR_ANKER:+ · nur die Anker}"

ALT='  <script src="sbkim/pruefer-mail.js"></script>' NEU='' \
  fall "LISTE: markt.html lädt die Prüfliste nicht mehr" markt.html "markt.html: die Prüfliste steht direkt nach 04"
ALT='  <script defer src="sbkim/pruefer-mail.js"></script>' NEU='' \
  fall "LISTE: die Startseite lädt die Prüfliste nicht mehr" index.html "index.html: prueflisteGeladen"
ALT='/* Auslieferungsprüfer — der Eingang für E-Mails.' NEU='/* Auslieferungspruefer — der Eingang für E-Mails.' \
  fall "PIN: die Liste ist nicht mehr byte-1:1" sbkim/pruefer-mail.js "byte-1:1 aus dem Auslieferungsprüfer"
ALT='          if (res.kiAnweisung && res.kiAnweisung.length) {' NEU='          if (false) {' \
  fall "HALT: eine Anweisung an eine KI hält nicht mehr an" assets/app.js "hält einmal an"
ALT='            text = global.SbkimOcr.ohneZeilen ? global.SbkimOcr.ohneZeilen(text, res.kiAnweisung) : "";' NEU='' \
  fall "HALT: OK übernimmt die Zeile mit der Anweisung mit" assets/app.js "Zeile mit der Anweisung NICHT"
ALT='            if (!weiter) { done(); return; }' NEU='' \
  fall "HALT: Abbrechen übernimmt trotzdem" assets/app.js "Abbrechen"
ALT='    var pr = textPruefen(text);' NEU='    var pr = { geprueft: true, zeilen: [] };' \
  fall "MODUL24: der erkannte Text wird nicht mehr geprüft" sbkim/24_ocr_eingabe.js "hält einmal an"

ALT='      try { sauber = await bildReinigen(b64, mime); }' NEU='      try { sauber = { bilder: [b64], mime: mime, liste: [], seiten: 1, gesamt: 1 }; }' \
  fall "ORIGINAL: Modul 24 schickt das Foto wieder roh hinaus" sbkim/24_ocr_eingabe.js "nie das Original"

echo; echo "— $gefangen gefangen · $blind durchgerutscht · $falsch aus falschem Grund · $tot tote Anker —"
[ $((blind+falsch+tot)) -eq 0 ]
