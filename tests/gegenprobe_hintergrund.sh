#!/usr/bin/env bash
# Gegenprobe zu tests/smoke_hintergrund.mjs (Klaus 2026-09-02).
#
# Der Smoke prüft den Pause-Schalter und den Lichtschein. Ein Test, der eine
# Zusicherung prüft, ohne dass sie jemand einmal kaputt gemacht hat, ist nur
# ein grüner Haken. Diese Datei baut jede Lücke einzeln ein und verlangt, dass
# der Smoke umfällt.
#
# Sabotiert wird die ZUSICHERUNG, nicht eine Zeile: wo zwei Riegel einander
# decken, fallen beide zusammen — sonst rutscht der Fall durch, weil der
# andere ihn allein fängt.
#
#   bash tests/gegenprobe_hintergrund.sh
#
# Alle Änderungen werden zurückgenommen, auch beim Abbruch.

set -u
cd "$(dirname "$0")/.."

gruen=0
blind=0
SICH_DIR="/tmp/gp_hintergrund_$$"
mkdir -p "$SICH_DIR"
for d in assets/mycel-bg.js assets/app.js markt.html; do
  cp "$d" "$SICH_DIR/$(echo "$d" | tr '/' '_')"
done
aufraeumen() {
  for d in assets/mycel-bg.js assets/app.js markt.html; do
    cp "$SICH_DIR/$(echo "$d" | tr '/' '_')" "$d"
  done
  rm -rf "$SICH_DIR"
}
trap aufraeumen INT TERM EXIT

# probe <Beschreibung> <Datei> <sed-Ausdruck...>
probe() {
  local was="$1" datei="$2"; shift 2
  aufraeumen_leise() { for d in assets/mycel-bg.js assets/app.js markt.html; do cp "$SICH_DIR/$(echo "$d" | tr '/' '_')" "$d"; done; }
  aufraeumen_leise
  local vorher="/tmp/gp_h_vorher_$$"
  cp "$datei" "$vorher"
  for ausdruck in "$@"; do sed -i "$ausdruck" "$datei"; done
  if cmp -s "$vorher" "$datei"; then
    echo "  ✗ WIRKUNGSLOS: $was — der Ausdruck hat nichts geändert"
    blind=$((blind + 1))
  elif node tests/smoke_hintergrund.mjs >/dev/null 2>&1; then
    echo "  ✗ BLIND: $was — der Smoke blieb grün, obwohl die Lücke drin war"
    blind=$((blind + 1))
  else
    echo "  ✓ schlägt an: $was"
    gruen=$((gruen + 1))
  fi
  rm -f "$vorher"
  aufraeumen_leise
}

echo "── Gegenprobe: Mycel-Hintergrund ──"

# 1 · Der Absturz bei „Bewegung reduzieren" kommt zurück.
#     Beide Riegel zusammen, denn sie decken einander: der Torwächter in
#     renderOnce UND die Hochziehung per var.
probe "der Hintergrund stirbt wieder bei „Bewegung reduzieren“" assets/mycel-bg.js \
  's/^  var bereit = false;/  let bereit = false;/' \
  's/^    if (!bereit) return;//'

# 2 · Der Startfehler wird wieder verschluckt.
probe "ein Startfehler wird stumm verschluckt" assets/mycel-bg.js \
  "s/\.catch((e) => { try { console.warn('\[mycel-bg\] nicht gestartet:', e); } catch (_e) {} });/.catch(() => {});/"

# 3 · Die Pause versteckt nur, statt die Schleife anzuhalten.
#     Alle Halte-Wege gehen durch schleifeAnhalten() — ein Eingriff dort
#     trifft die Zusicherung selbst, statt einen von drei Wegen.
probe "die Pause hält die Schleife NICHT mehr an" assets/mycel-bg.js \
  "s/^    laeuft = false;$//"

# 4 · Die Wahl wird nicht mehr gespeichert.
probe "die Wahl überlebt das Neuladen nicht" assets/mycel-bg.js \
  "s/localStorage.setItem(PAUSE_SCHLUESSEL, pausiert ? 'ja' : 'nein');//"

# 5 · Der Knopf liest den gespeicherten Zustand nicht mehr, sondern wartet
#     auf den Hintergrund — das Rennen gegen die Uhr von vorher.
probe "der Knopf zeigt nach dem Neuladen wieder den falschen Zustand" assets/app.js \
  's/steht = localStorage.getItem("fp_bg_pause") === "ja";/steht = false;/'

# 6 · Die zwei Dateien nennen verschiedene Schlüssel.
probe "app.js und mycel-bg.js laufen beim Schlüsselnamen auseinander" assets/app.js \
  's/localStorage.getItem("fp_bg_pause")/localStorage.getItem("fp_hintergrund_pause")/'

# 7 · Eine Seite verliert den Knopf.
probe "eine Seite mit Hintergrund hat keinen Pause-Knopf mehr" markt.html \
  's/id="bgPauseBtn"/id="bgPauseBtnAlt"/'

# 8 · Der Lichtschein wird wieder so groß und grell wie vorher.
probe "der Lichtschein ist wieder so grell wie vorher" assets/mycel-bg.js \
  's/smoothstep(0.22, 0.0/smoothstep(0.5, 0.0/' \
  's/nearC \* 0.30/nearC * 0.75/' \
  's/nearC \* 0.45/nearC * 0.9/'

# 9 · Er parkt wieder, wenn der Finger hochgeht.
#     Beide Wege zusammen — pointerup und pointercancel fangen einander sonst.
probe "der Schein bleibt nach dem Loslassen wieder stehen" assets/mycel-bg.js \
  "s/window.addEventListener('pointerup', (e) => {/window.addEventListener('pointerupNIE', (e) => {/" \
  "s/window.addEventListener('pointercancel', scheinWeg, { passive: true });//"

# 10 · Der Schein klebt wieder an der Maus, statt nachzulaufen.
probe "der Schein klebt wieder am Zeiger" assets/mycel-bg.js \
  "s/u.uMouse.value.lerp(zielMaus, scheinFaktor(dt, SCHEIN_FOLGT));/u.uMouse.value.copy(zielMaus);/"

# 11 · Er springt aus, statt zu verglimmen.
probe "er springt aus, statt zu verglimmen" assets/mycel-bg.js \
  "s/^  const SCHEIN_AUSLAUF = 0.42;.*$/  const SCHEIN_AUSLAUF = 0.02;/"

# 12 · Die Traegheit haengt wieder an der Bildrate statt an der Zeit.
probe "die Traegheit haengt wieder an der Bildrate" assets/mycel-bg.js \
  "s|return Math.min(1 - Math.exp(-dt / tau), 1);|return 0.12;|"

# 13 · Jeder Ausstieg aus der Schleife laesst den Schein stehen.
#      Alle drei Wege gehen durch schleifeAnhalten() — also EIN Eingriff,
#      der die Zusicherung trifft, statt drei, die einander decken.
probe "jeder Halt der Schleife laesst einen hellen Fleck stehen" assets/mycel-bg.js \
  "s/^    scheinAus();$//"

echo
echo "$gruen gefangen, $blind durchgerutscht"
[ "$blind" -eq 0 ] || exit 1
