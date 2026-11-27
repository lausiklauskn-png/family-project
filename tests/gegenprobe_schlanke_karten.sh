#!/bin/bash
# Gegenprobe zu tests/smoke_schlanke_karten.mjs (Klaus 2026-11-27: „Die
# App-Karten sind zu groß"). Jeder Riegel bekommt einen Fehler, der ihn
# umwerfen MUSS — und die rote Zeile muss den Namen SEINER Zusicherung tragen.
#
# ⚠ Sabotiert den Baum und legt ihn aus einer SICHERUNG zurück, nie per
# `git checkout --`. Am besten in einer Wegwerf-Kopie fahren.
# ⚠ Im Muster steht KEIN Umlaut und kein „×“: im C-Locale trifft `.` ein Byte
# (CLAUDE.md, „`Pr.f` trifft `Prüf` nicht").
#
#   bash tests/gegenprobe_schlanke_karten.sh
#   NUR_ANKER=1 bash tests/gegenprobe_schlanke_karten.sh   # nur: trifft jeder Anker genau einmal?
#   NUR_FALL="SPALTEN" bash tests/gegenprobe_schlanke_karten.sh
cd "$(dirname "$0")/.." || exit 1

DATEIEN=(assets/style.css markt.html tools/statische-listen.mjs)
SICH="/tmp/gp_sk.$$"; mkdir -p "$SICH"
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
heile(){ for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done; }
auf(){ heile; rm -rf "$SICH"; }
trap auf INT TERM EXIT

gruen=0; blind=0; falsch=0; tot=0

# fall <name> <datei> <alt> <neu> <muster-in-der-roten-zeile> [neubau]
fall(){
  local name="$1" datei="$2" alt="$3" neu="$4" trifft="$5" neubau="${6:-}"
  if [ -n "$NUR_FALL" ] && [[ "$name" != *"$NUR_FALL"* ]]; then return 0; fi
  # ZWEITER ANKER (optional, gleiche Datei): ALT2/NEU2 aus der Umgebung —
  # für eine Sabotage, die etwas VERSCHIEBT statt es zu löschen.
  local n; n=$(ALT="$alt" ALT2="${ALT2:-}" python3 -c "
import io,os
s=io.open('$datei',encoding='utf-8').read(); a2=os.environ['ALT2']
n=s.count(os.environ['ALT'])
print(n if not a2 else (n if s.count(a2)==1 else 0))")
  if [ "$n" != "1" ]; then
    echo "  ⊘ TOTER ANKER: $name ($n Treffer)"; tot=$((tot+1)); return 0
  fi
  if [ -n "$NUR_ANKER" ]; then echo "  ✓ Anker eindeutig: $name"; return 0; fi
  ALT="$alt" NEU="$neu" ALT2="${ALT2:-}" NEU2="${NEU2:-}" python3 -c "
import io,os
p='$datei'; s=io.open(p,encoding='utf-8').read()
s=s.replace(os.environ['ALT'],os.environ['NEU'],1)
if os.environ['ALT2']: s=s.replace(os.environ['ALT2'],os.environ['NEU2'],1)
io.open(p,'w',encoding='utf-8').write(s)"
  [ -n "$neubau" ] && node tools/statische-listen.mjs >/dev/null 2>&1
  node tests/smoke_schlanke_karten.mjs > /tmp/gp_sk_lauf.txt 2>&1
  local code=$?
  if [ "$code" -eq 0 ]; then
    echo "  ✗ BLIND: $name — die Probe blieb gruen"; blind=$((blind+1))
  elif grep -q '✗.*'"$trifft" /tmp/gp_sk_lauf.txt; then
    echo "  ✓ schlaegt an: $name"; gruen=$((gruen+1))
  else
    echo "  ⚠ ROT AUS FALSCHEM GRUND: $name — erwartet „$trifft\", rote Zeilen:"
    grep '✗\|Error' /tmp/gp_sk_lauf.txt | head -3 | sed 's/^/        /'
    falsch=$((falsch+1))
  fi
  heile
  [ -n "$neubau" ] && node tools/statische-listen.mjs >/dev/null 2>&1
  return 0
}

if [ -z "$NUR_ANKER" ]; then
  echo "═══ Ausgangslage ═══"
  if node tests/smoke_schlanke_karten.mjs > /tmp/gp_sk_lauf.txt 2>&1; then echo "  ✓ gruen"
  else echo "  ✗ schon OHNE Eingriff rot:"; grep '✗' /tmp/gp_sk_lauf.txt | head -5; exit 1; fi
fi

echo; echo "═══ schlanke Karten ═══"

# Klaus: „3 nebeneinander am Monitor (nicht 4)".
fall 'SPALTEN: am Monitor wieder vier nebeneinander' assets/style.css \
  '@media (min-width:900px){.listings{grid-template-columns:repeat(3,minmax(0,1fr))}}' \
  '@media (min-width:900px){.listings{grid-template-columns:repeat(4,minmax(0,1fr))}}' \
  'Spalte(n) nebeneinander'

# „2 am Tablet" — das Tablet faellt auf eine Spalte zurueck.
fall 'TABLET: am Tablet nur eine Spalte' assets/style.css \
  '@media (min-width:600px){.listings{grid-template-columns:repeat(2,minmax(0,1fr))}}' \
  '@media (min-width:600px){.listings{grid-template-columns:1fr}}' \
  '820 px: 2 Spalte'

# Das grosse Bild kommt zurueck: 16:9 ueber die ganze Breite.
fall 'LOGO: das Bild wird wieder ein breites Band' assets/style.css \
  '.listing .img{flex:0 0 52px;width:52px;height:52px;' \
  '.listing .img{flex:0 0 100%;width:100%;aspect-ratio:16/9;' \
  'kleines Quadrat'

# Das Logo steht wieder UEBER dem Namen statt daneben (Kopf als Spalte).
fall 'NEBEN: Logo ueber dem Namen statt daneben' assets/style.css \
  '.listing .mk-kopf{display:flex;align-items:center;' \
  '.listing .mk-kopf{display:flex;flex-direction:column;align-items:flex-start;' \
  'LINKS NEBEN dem Namen'

# „Text kurz (2 Zeilen)" — die alte Klemmung auf drei Zeilen.
fall 'ZEILEN: der Text klemmt wieder auf drei Zeilen' assets/style.css \
  'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:calc(1.4em * 2)}' \
  'display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;min-height:calc(1.4em * 3)}' \
  'genau 2 Zeilen'

# Die Woerter der Messwerte werden wieder sichtbar: die Reihe passt nicht
# mehr in die Karte und wird abgeschnitten (nowrap).
fall 'REIHE: die Woerter der Messwerte stehen wieder in der Pille' assets/style.css \
  '.listing .mk-ms-k{position:absolute;width:1px;height:1px;' \
  '.listing .mk-ms-k{position:static;width:auto;height:auto;' \
  'nicht abgeschnitten'

# Die Pillen teilen sich die Breite nicht mehr und duerfen nicht umbrechen:
# bei grosser Schrift liegen sie dann uebereinander (Klaus' Bild 2026-11-28).
fall 'UEBERLAPP: die Pillen schrumpfen unter ihren Inhalt' assets/style.css \
  '.listing .mk-ms-zeile{display:flex;flex-wrap:wrap;gap:4px;min-width:0;width:100%}
.listing .mk-ms-zeile .mk-ms-w{flex:1 1 0;justify-content:center;' \
  '.listing .mk-ms-zeile{display:flex;flex-wrap:nowrap;gap:4px;min-width:0;width:100%}
.listing .mk-ms-zeile .mk-ms-w{flex:1 1 0;min-width:0;justify-content:center;' \
  'keine Pille liegt'

# „mehr" steht wieder in der Zeile der Messwerte (der Stand vor Klaus' Bild).
fall 'MEHR-OBEN: mehr steht wieder in der Zeile der Messwerte' markt.html \
  "'<p class=\"mk-mehr-reihe\">' + teil.kurz + '</p>' +" \
  "'<p class=\"mk-mehr-reihe\">' + teil.kurz + (id ? '<button type=\"button\" class=\"mk-mehr-zu\" aria-expanded=\"false\" aria-controls=\"' + id + '\">mehr</button>' : '') + '</p>' + (id = '', '') +" \
  'NICHT in der Zeile der Messwerte'

# „mehr" und „Melden" sind kein Paar mehr: bei grosser Schrift steht
# „Melden" wieder allein links unten.
fall 'PAAR: mehr und Melden brechen getrennt um' assets/style.css \
  '.listing-foot .mk-fuss-rechts{display:flex;align-items:flex-end;gap:4px;margin-left:auto}' \
  '.listing-foot .mk-fuss-rechts{display:contents}' \
  'zusammen in einer Reihe'

# „mehr" steht von Anfang an offen.
fall 'MEHR: der aufgeklappte Teil steht von Anfang an offen' markt.html \
  "'<div class=\"mk-mehr-innen\" id=\"' + id + '\" hidden>'" \
  "'<div class=\"mk-mehr-innen\" id=\"' + id + '\">'" \
  'liegt zugeklappt'

# Die gelbe/rote Warnung wandert mit unter „mehr" — verschwindet aus dem Blick.
ALT2='((w && w.ampel === "quittiert") ? "" : wacheBand(w)) +' NEU2='"" +' \
fall 'WARNUNG: gelb und rot verschwinden unter mehr' markt.html \
  'var innen = teil.lang + ((w && w.ampel === "quittiert") ? wacheBand(w) : "") + video + knoepfe;' \
  'var innen = teil.lang + wacheBand(w) + video + knoepfe;' \
  'stehen OFFEN an der Karte'

# Der Platzhalter der gebauten Seite faellt weg: die Liste springt beim
# Neuzeichnen, weil die Messwert-Zeile erst mit dem Skript kommt.
fall 'SPRUNG: die gebaute Karte verliert den Platzhalter' tools/statische-listen.mjs \
  "'<div class=\"mk-mehr\"><p class=\"mk-mehr-reihe\" aria-hidden=\"true\"></p>' +" \
  "'<div class=\"mk-mehr\">' +" \
  'ohne und mit Skript gleich hoch' neubau

# Die Reserve fuer den Melde-Knopf faellt weg (gebaut 7 px niedriger).
fall 'FUSS: die Fusszeile verliert ihre Reserve' assets/style.css \
  'flex-wrap:wrap;min-height:44px}' \
  'flex-wrap:wrap}' \
  'ohne und mit Skript gleich hoch'

# Die Liste wird wieder lang: das Polster der Karte verdoppelt sich, und das
# grosse Bild kommt zurueck — der Wächter auf die Bildschirme muss fallen.
fall 'LAENGE: die Karte wird wieder hoch' assets/style.css \
  '.listing .body{padding:12px 14px 12px;' \
  '.listing .body{padding:150px 14px 12px;' \
  'Bildschirme lang'

echo
echo "  $gruen schlagen an · $blind blind · $falsch aus falschem Grund · $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
