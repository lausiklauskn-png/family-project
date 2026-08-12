#!/usr/bin/env bash
# Gegenprobe zum Riegel der Ampel: wird der Wächter auch WIRKLICH rot?
#
# `tests/smoke_studio_markt.mjs` schneidet den `commit_wache`-Block aus
# server/marktplatz-api.php und lässt ihn mit echten Nutzlasten laufen. Das ist
# der richtige Ansatz — aber ein Test, der die Regel prüft, ohne dass jemand
# die Regel einmal kaputt gemacht hat, ist nur ein grüner Haken.
#
# Diese Datei baut jede Lücke einzeln wieder ein und verlangt, dass der Smoke
# umfällt. Bleibt er grün, bewacht er die Sperre nicht.
#
#   bash tests/gegenprobe_wache_riegel.sh
#
# Alle Änderungen werden zurückgenommen, auch beim Abbruch.

set -u
cd "$(dirname "$0")/.."

DATEI="server/marktplatz-api.php"
SICHERUNG="/tmp/gp_wache_riegel.bak"
gruen=0
blind=0

cp "$DATEI" "$SICHERUNG"
aufraeumen() { cp "$SICHERUNG" "$DATEI"; }
trap aufraeumen INT TERM EXIT

probe() {                       # probe <Beschreibung> <sed-Ausdruck>
  local was="$1" ausdruck="$2"
  cp "$SICHERUNG" "$DATEI"
  sed -i "$ausdruck" "$DATEI"
  if ! cmp -s "$SICHERUNG" "$DATEI"; then
    if node tests/smoke_studio_markt.mjs >/dev/null 2>&1; then
      echo "  ✗ BLIND: $was — der Smoke blieb grün, obwohl die Lücke drin war"
      blind=$((blind + 1))
    else
      echo "  ✓ schlägt an: $was"
      gruen=$((gruen + 1))
    fi
  else
    # Der Fehler, der am 2026-08-09 zweimal passiert ist: die Sabotage traf
    # nichts, und das sah aus wie eine bestandene Prüfung.
    echo "  ✗ WIRKUNGSLOS: $was — der sed-Ausdruck hat nichts geändert"
    blind=$((blind + 1))
  fi
  cp "$SICHERUNG" "$DATEI"
}

echo "Gegenprobe: der Riegel der Ampel (sperren ja, lösen nein)"

# 1 · Der Kern: die Richtungs-Prüfung fällt weg. Danach darf der Browser eine
#     Sperre herabstufen — genau das, was nie gehen soll.
probe "die Richtungs-Prüfung fehlt (Herabstufen wieder erlaubt)" \
      "s|if (\$rangNeu < \$rangAlt) out(array('ok' => false, 'error' => 'entsperren_nur_in_datei'), 422);||"

# 2 · Die Rangfolge wird verdreht: grün steht plötzlich über rot.
probe "die Rangfolge wird umgedreht" \
      "s|if (\$a === 'gruen') return 0;|if (\$a === 'gruen') return 9;|"

# 3 · Grün bekommt denselben Rang wie „kein Eintrag". Dann ist Freigeben aus
#     dem Browser wieder möglich, ohne dass irgendetwas herabgestuft aussieht.
probe "gruen gilt wie kein Eintrag - Freigeben durch die Hintertuer" \
      "s|if (\$a === 'gruen') return 0;|if (\$a === 'gruen') return 1;|"

# 4 · Der stillste Weg: den gesperrten Eintrag einfach weglassen.
probe "die Runde gegen das Weglassen fällt weg" \
      "s|if (\$rNeu < \$rAlt) out(array('ok' => false, 'error' => 'entsperren_nur_in_datei'), 422);||"

# 5 · Sperren ohne Begründung. „Nie still handeln" ist die vierte Regel.
probe "sperren ohne Grund wird wieder durchgelassen" \
      "s|if (\$g === '') out(array('ok' => false, 'error' => 'grund_fehlt'), 422);||"

# 6 · FAIL-OPEN statt fail-closed: der Abruf schlägt fehl, und es wird trotzdem
#     geschaltet. Das ist die gefährlichste Lücke von allen, weil sie nur an
#     einem schlechten Tag auffällt.
probe "fail-closed wird zu fail-open" \
      "s|if (!\$vorhandenGeholt) out(array('ok' => false, 'error' => 'vorlage_nicht_lesbar'), 409);||"

# 7 · Ein erfundenes Ampel-Wort gilt plötzlich als gültig und höchster Rang.
probe "ein unbekanntes Wort gilt als gültig" \
      "s|  return -1;|  return 3;|"

# 8 · Der Grund darf beliebig lang werden — ein Roman an der Karte.
probe "die Längenprüfung des Grundes fällt weg" \
      "s|strlen(\$wert) > 300|strlen(\$wert) > 300000|"

# 9 · Der Automatik-Schalter (Schritt 4). Sein Prüfer lässt alles durch —
#     dann könnte im Schalter eine Ampel stehen, an der Rangfolge vorbei.
probe "der Prüfer des Schalters lässt alles durch" \
      "s|^  if (!is_array(\$a)) return 'automatik_invalid';|  if (true) return '';\n  if (!is_array(\$a)) return 'automatik_invalid';|"

# 10 · Der Schalter wird zum Generalschlüssel: JEDER Unterstrich-Name kommt
#      am Schlüssel-Muster vorbei, nicht nur der eine.
probe "jeder Unterstrich-Schlüssel kommt durch" \
      "s|if (\$id === '_automatik') {|if (\$id[0] === '_') {|"

# 11 · Der Wertebereich der Nächte fällt weg — dann ließe sich die Automatik
#      auf 0 stellen und schlüge bei jeder einzelnen schlechten Nacht an.
probe "der Wertebereich der Nächte fällt weg" \
      "s|if (!is_int(\$v) \|\| \$v < 1 \|\| \$v > 30)  return 'automatik_invalid';|if (false) return 'automatik_invalid';|"

echo
echo "$gruen Wächter schlagen an, $blind blind"
[ "$blind" -eq 0 ] || exit 1
