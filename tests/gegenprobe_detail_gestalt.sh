#!/bin/bash
# Gegenprobe zu tests/smoke_detail_gestalt.mjs und tests/smoke_syntax.mjs.
# Jeder Waechter bekommt einen Fehler, der ihn umwerfen MUSS — und die rote
# Zeile muss den Namen SEINER Zusicherung tragen.
#
# ⚠ SIE SABOTIERT DEN ECHTEN BAUM und legt ihn aus einer SICHERUNG unter /tmp
# zurueck, NICHT per `git checkout --` (der faehrt ueber ungeschriebene Arbeit
# hinweg; am 2026-09-22 hat das hier viermal Arbeit geloescht). Die Sicherung
# ueberlebt auch einen Abbruch (trap).
cd "$(dirname "$0")/.." || exit 1

DATEIEN=(tools/vorlagen/detail.html tools/detailseiten.mjs tools/statische-listen.mjs
         assets/style.css markt.html assets/config/listings.js
         tests/smoke_markt_vecpack.mjs tests/lib/vec-stub.mjs)
SICH="/tmp/gp_dg.$$"; mkdir -p "$SICH"
for d in "${DATEIEN[@]}"; do mkdir -p "$SICH/$(dirname "$d")"; cp "$d" "$SICH/$d"; done
for a in apps/*/index.html; do mkdir -p "$SICH/$(dirname "$a")"; cp "$a" "$SICH/$a"; done
heile(){ for d in "${DATEIEN[@]}"; do cp "$SICH/$d" "$d"; done
         for a in apps/*/index.html; do cp "$SICH/$a" "$a" 2>/dev/null; done; }
auf(){ heile; rm -rf "$SICH"; }
trap auf INT TERM EXIT

gruen=0; blind=0; falsch=0; tot=0

# fall <name> <datei> <alt> <neu> <trifft> [probe] [neubau]
fall(){
  local name="$1" datei="$2" alt="$3" neu="$4" trifft="$5"
  local probe="${6:-tests/smoke_detail_gestalt.mjs}" neubau="${7:-}"
  if ! ALT="$alt" python3 -c "
import io,os,sys
sys.exit(0 if os.environ['ALT'] in io.open('$datei',encoding='utf-8').read() else 1)"; then
    echo "  ⊘ TOTER ANKER: $name"; tot=$((tot+1)); return
  fi
  ALT="$alt" NEU="$neu" python3 -c "
import io,os
p='$datei'; s=io.open(p,encoding='utf-8').read()
io.open(p,'w',encoding='utf-8').write(s.replace(os.environ['ALT'],os.environ['NEU'],1))"
  [ -n "$neubau" ] && { node tools/statische-listen.mjs >/dev/null 2>&1; node tools/detailseiten.mjs >/dev/null 2>&1; }
  node "$probe" > /tmp/gp_dg_lauf.txt 2>&1
  local code=$?
  if [ "$code" -eq 0 ]; then
    echo "  ✗ BLIND: $name — die Probe blieb gruen"; blind=$((blind+1))
  elif grep -q '✗.*'"$trifft" /tmp/gp_dg_lauf.txt; then
    echo "  ✓ schlaegt an: $name"; gruen=$((gruen+1))
  else
    echo "  ⚠ ROT AUS FALSCHEM GRUND: $name — erwartet „$trifft\", rote Zeilen:"
    grep '✗' /tmp/gp_dg_lauf.txt | head -3 | sed 's/^/        /'; falsch=$((falsch+1))
  fi
  heile
  [ -n "$neubau" ] && { node tools/statische-listen.mjs >/dev/null 2>&1; node tools/detailseiten.mjs >/dev/null 2>&1; }
  return 0
}

echo "═══ Ausgangslage ═══"
if node tests/smoke_detail_gestalt.mjs > /tmp/gp_dg_lauf.txt 2>&1 && node tests/smoke_syntax.mjs >/dev/null 2>&1; then
  echo "  ✓ gruen"
else
  echo "  ✗ schon OHNE Eingriff rot:"; grep '✗' /tmp/gp_dg_lauf.txt | head -4 | sed 's/^/        /'; exit 1
fi

echo; echo "═══ GESTALT: Polster und Farben der Detailseite ═══"

# 1 · DER BEFUND SELBST: das seitliche Polster faellt weg, und die Schrift
#     klebt wieder am Rand — Klaus' „linksbuendig im Container auf Null".
fall 'das seitliche Polster faellt weg' tools/vorlagen/detail.html \
  '  main.wrap > section.glass { padding:24px 22px; margin:18px 0; }' \
  '  main.wrap > section.glass { padding:32px 0; margin:0; }' \
  'klebt am Kastenrand' tests/smoke_detail_gestalt.mjs neubau

# 2 · die Messwerte verlieren ihre Stufen-Klasse — grau wie vorher.
fall 'die Messwerte werden wieder grau' tools/detailseiten.mjs \
  'T.push(`        <span class="mk-ms-w${st ? " is-" + st : ""}">` +' \
  'T.push(`        <span class="mk-ms-w">` +' \
  'tragen eine Stufe' tests/smoke_detail_gestalt.mjs neubau

# 3 · auch der Verlauf verliert sie.
fall 'der Verlauf verliert seine Stufen' tools/detailseiten.mjs \
  'return `<td class="zahl${st ? " st-" + st : ""}">${Number.isFinite(v) ? v : "—"}</td>`;' \
  'return `<td class="zahl">${Number.isFinite(v) ? v : "—"}</td>`;' \
  'im Verlauf' tests/smoke_detail_gestalt.mjs neubau

# 4 · die Farben werden wieder ABGESCHRIEBEN statt geteilt — die Drift selbst.
# ⚠ Mein erster Anlauf benannte die VARIABLE in style.css um und meldete
#   sich als ROT AUS FALSCHEM GRUND: `--ms-gut` steht dort zweimal (Grundwert
#   und Thema), der Waechter fand die zweite Stelle noch und blieb gruen —
#   gefallen ist ein Farb-Waechter daneben. Sabotiert wird jetzt die Stelle,
#   an der die Zusicherung wirklich haengt.
fall 'die Farben werden in die Vorlage abgeschrieben' tools/vorlagen/detail.html \
  '  .mess-tabelle .st-gut { color:var(--ms-gut); }' \
  '  .mess-tabelle .st-gut { color:#1e7a4b; }' \
  'nicht abgeschrieben'

# 5 · Node und Browser rechnen nicht mehr gleich. DAS ist die benannte
#     Doppelung, und ohne diesen Waechter liefe sie still auseinander.
fall 'die Schwelle im Bau-Werkzeug wandert' tools/statische-listen.mjs \
  '  return z >= 90 ? "gut" : (z >= 50 ? "mittel" : "schwach");' \
  '  return z >= 85 ? "gut" : (z >= 50 ? "mittel" : "schwach");' \
  'dasselbe wie das Bau-Werkzeug'

# 6 · „nichts" wird wieder gedeutet. `Number(null)` ist 0 — eine FEHLENDE
#     Zahl bekaeme eine rote Pille fuer eine Messung, die es nicht gibt.
fall 'eine fehlende Zahl wird wieder gedeutet' tools/statische-listen.mjs \
  '  if (n === null || n === undefined || n === "" || typeof n === "boolean") return "";' \
  '  // Riegel raus' \
  'GAR KEINE Stufe'

# 7 · DIE WICHTIGSTE ZUSICHERUNG: die Positivliste laesst das neue Feld
#     wieder fallen. Genau daran ist der erste Bau gescheitert — die Felder
#     standen in listings.js, das Werkzeug las sie, und auf der Seite stand
#     trotzdem der alte Text. Kein Fehler, keine rote Zeile.
fall 'die Positivliste laesst vorstellung wieder fallen' tools/statische-listen.mjs \
  '        vorstellung: Array.isArray(x.vorstellung)' \
  '        vorstellungAUS: Array.isArray(x.vorstellung)' \
  'zeigt Stichpunkte' tests/smoke_detail_gestalt.mjs neubau

# 8 · die hervorgehobene Funktion faellt weg.
fall 'die hervorgehobene Funktion faellt weg' tools/detailseiten.mjs \
  '  if (String(e.besonders || "").trim()) {' \
  '  if (false) {' \
  'hervorgehobene Funktion steht' tests/smoke_detail_gestalt.mjs neubau

# 9 · ⚠ DER SUCH-KORPUS WIRD UEBERSCHRIEBEN. Das ist der stillste denkbare
#     Schaden: die Karte zeigte Werbetext, die Bedeutungs-Vektoren wuerden aus
#     ihm gerechnet, und niemand saehe einen Fehler.
fall 'der Werbetext ueberschreibt den Such-Korpus' tools/statische-listen.mjs \
  '        text: String(x.text || ""),' \
  '        text: String(x.vorstellung || x.text || ""),' \
  'zeigt genau ihn, nicht den Werbetext' tests/smoke_detail_gestalt.mjs neubau

echo; echo "═══ PRUEFKNOPF: Pruef es selbst — Klaus 2026-09-22 ═══"

# PRUEF-1 · aus dem Link wird ein Knopf ohne Ziel. Der stillste Schaden: er
#           steht da und fuehrt nirgendwohin.
fall 'PRUEF: aus dem Link wird ein <button>' tools/detailseiten.mjs \
  "      <p><a class=\"btn ghost ext\" href=\"\${PRUEFER}?adresse=" \
  "      <p><button class=\"btn ghost ext\" data-x=\"\${PRUEFER}?adresse=" \
  'Knopf ist ein <a href>' tests/smoke_detail_gestalt.mjs neubau

# PRUEF-2 · vorbelegt wird eine ANDERE Adresse als die, auf die „Zur Seite"
#           zeigt. Der Nutzer prueft dann etwas anderes, als er ansieht — und
#           der Bericht sieht trotzdem echt aus.
fall 'PRUEF: vorbelegt wird eine fremde Adresse' tools/detailseiten.mjs \
  '?adresse=${esc(encodeURIComponent(e.url))}' \
  '?adresse=${esc(encodeURIComponent("https://example.org/"))}' \
  'vorbelegt ist genau die Adresse' tests/smoke_detail_gestalt.mjs neubau

# PRUEF-3 · der Domain-Wechsel wird verschwiegen. Genau das verbietet der Ton
#           dieses Depots: ein Knopf, der einen woandershin traegt, sagt es.
fall 'PRUEF: der Domain-Wechsel wird verschwiegen' tools/detailseiten.mjs \
  " du verlässt dabei also diese Seite.</p>');" \
  "</p>');" \
  'es steht dabei, dass man diese Seite verl' tests/smoke_detail_gestalt.mjs neubau

# PRUEF-4 · der fremde Tab bekommt Zugriff aufs Fenster.
fall 'PRUEF: rel=noopener faellt weg' tools/detailseiten.mjs \
  " target=\"_blank\" rel=\"noopener\">Diese App prüfen</a></p>');" \
  " target=\"_blank\">Diese App prüfen</a></p>');" \
  'neuer Tab, rel=noopener' tests/smoke_detail_gestalt.mjs neubau

# PRUEF-5 · die GRENZE faellt weg. Dann verspricht der Abschnitt etwas, das
#           das Werkzeug nicht halten kann — es liest den Quelltext, nicht den
#           laufenden Verkehr.
fall 'PRUEF: die Grenze des Pruefers faellt weg' tools/detailseiten.mjs \
  'nicht den laufenden Verkehr:' \
  'auch den laufenden Verkehr:' \
  'fers steht dabei' tests/smoke_detail_gestalt.mjs neubau

# PRUEF-6 · die Konstante driftet vom Marktplatz-Eintrag weg. Dann fuehrt der
#           Knopf woandershin als die Karte, und niemand saehe es.
fall 'PRUEF: die Pruefer-Adresse driftet vom Marktplatz weg' tools/detailseiten.mjs \
  'export const PRUEFER = "https://pwa-toolpoint.de/auslieferungspruefer.html";' \
  'export const PRUEFER = "https://pwa-toolpoint.de/pruefer.html";' \
  'dieselbe Adresse wie seine Karte' tests/smoke_detail_gestalt.mjs neubau

# PRUEF-7 · ⚠ BENANNTE GRENZE: fuer „der Knopf kommt auch ohne Adresse" steht
#           hier KEIN Fall. Heute steht kein Eintrag auf ROT, es gibt also gar
#           keine Seite ohne Adresse — eine Sabotage an `const pruefbar =
#           !!e.url` aenderte nichts Messbares, und der Fall saehe wie Deckung
#           aus. Der Waechter bleibt trotzdem: er misst die Zusicherung „wer
#           keinen Knopf hat, hat eine ausgesetzte Adresse" und traegt an dem
#           Tag, an dem Klaus einen Eintrag sperrt.
#           (Mein erster Anlauf war zudem ein TOTER ANKER: der mehrzeilige
#           Anker trug woertliche \n statt Zeilenumbrueche — die Falle steht
#           netzweit seit dem 2026-08-24 aufgeschrieben.)

echo; echo "═══ VEKTOR-STUB: misst er Raenge oder Rauschen? (2026-09-22) ═══"

# VEC-1 · DER ALTE STUB, wortgleich zurueckgedreht. Er hat siebzehn Eintraege
#         lang gruen gemeldet und bei neunzehn die Raenge kippen lassen — nicht
#         weil der Code kaputt war, sondern weil zwei Zahlen gleich waren.
#         DIESER FALL IST DER BELEG, dass die Reparatur eine ist.
fall 'VEC: der alte Stub mit % 40 und gefaltetem Kosinus kommt zurueck' tests/lib/vec-stub.mjs \
  '    const c = s.startsWith("q:") ? 1' \
  '    const w40 = ((s.length % 40) / 40) * Math.PI * 0.5; v[0] = Math.cos(w40); v[1] = Math.sin(w40); return v; const c = s.startsWith("q:") ? 1' \
  'liegen WEITER auseinander' tests/smoke_markt_vecpack.mjs

# VEC-2 · die Abstaende werden eng, ohne gleich zu sein. Dann ist der
#         Gleichstands-Gedanke erfuellt und die Raenge kippen trotzdem am
#         Runden — genau der Fehler meines ERSTEN Reparatur-Versuchs.
fall 'VEC: die Abstaende schrumpfen unter die Quantisierung' tests/lib/vec-stub.mjs \
  'const SCHRITT = 0.8 / (N + 1);' \
  'const SCHRITT = 0.001 / (N + 1);' \
  'liegen WEITER auseinander' tests/smoke_markt_vecpack.mjs

# VEC-3 · ⚠ UND DIE ZWEITE PROBE HAENGT AM SELBEN STUB. Bis zum 2026-09-22
#         stand er zweimal; dieser Fall belegt, dass es jetzt EINE Fassung
#         ist — eine Sabotage dort wirft auch die Studio-Probe um.
fall 'VEC: die Studio-Probe haengt am selben Stub' tests/lib/vec-stub.mjs \
  'const SCHRITT = 0.8 / (N + 1);' \
  'const SCHRITT = 0.002 / (N + 1);' \
  'Reihenfolge identisch' tests/smoke_studio_vectors.mjs

echo; echo "═══ SYNTAX: jede JS-Datei laedt ═══"
# 7 · genau der Fehler, der mir an EINEM Tag fuenfmal passiert ist.
fall 'ein deutsches Anfuehrungszeichen beendet einen String' tools/detailseiten.mjs \
  'const MONATE = ["Januar",' \
  'const HINWEIS = "er sagte „ja""; const MONATE = ["Januar",' \
  'sich nicht laden' tests/smoke_syntax.mjs

echo
echo "$gruen schlagen an, $blind blind, $falsch aus falschem Grund, $tot tote Anker"
[ "$blind" -eq 0 ] && [ "$falsch" -eq 0 ] && [ "$tot" -eq 0 ]
