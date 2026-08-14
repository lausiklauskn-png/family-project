#!/usr/bin/env bash
# Gegenprobe zum Riegel IM STUDIO: hält der Browser-Riegel auch WIRKLICH?
#
# Geschwister von tests/gegenprobe_wache_riegel.sh — die prüft den Server
# (server/marktplatz-api.php), diese hier den Riegel davor
# (assets/studio-markt.js). Beide sind nötig: der Server ENTSCHEIDET, das
# Studio SAGT DEN GRUND. Fiele der vordere weg, erführe Klaus die Ablehnung
# erst nach einem fehlgeschlagenen Veröffentlichen — und ein Knopf, der
# manchmal einfach nichts tut, erzieht dazu, Knöpfe nicht mehr zu glauben.
#
# `tests/smoke_studio_markt.mjs` schneidet den Block zwischen
# WACHE-RIEGEL-START und WACHE-RIEGEL-ENDE heraus und lässt ihn wirklich
# laufen. Das ist der richtige Ansatz — aber ein Test, der die Regel prüft,
# ohne dass jemand die Regel einmal kaputt gemacht hat, ist nur ein grüner
# Haken.
#
# Diese Datei baut jede Lücke einzeln wieder ein und verlangt, dass der Smoke
# umfällt. Bleibt er grün, bewacht er den Riegel nicht.
#
#   bash tests/gegenprobe_studio_riegel.sh
#
# Alle Änderungen werden zurückgenommen, auch beim Abbruch.

set -u
cd "$(dirname "$0")/.."

DATEI="assets/studio-markt.js"
SICHERUNG="/tmp/gp_studio_riegel.bak"
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

echo "Gegenprobe: der Riegel im Studio (sperren ja, lösen nein)"

# 1 · Der Kern: die Richtungs-Prüfung fällt weg. Danach lässt sich eine rote
#     Zeile aus dem Studio auf gelb herunterstufen.
probe "die Richtungs-Pruefung fehlt (Herabstufen wieder erlaubt)" \
      "s|if (wacheRang(ampel) < wacheRang(wacheAmpel(id))) { toast(T(\"wa_kein_loesen\"), false); return false; }||"

# 2 · Die Rangfolge wird verdreht: grün steht plötzlich über rot.
probe "die Rangfolge wird umgedreht" \
      "s|var WACHE_RANG = { gruen: 0, gelb: 2, rot: 3 };|var WACHE_RANG = { gruen: 9, gelb: 2, rot: 3 };|"

# 3 · Grün bekommt denselben Rang wie „kein Eintrag". Dann ist Freigeben aus
#     dem Browser wieder möglich, ohne dass es nach Herabstufen aussieht.
probe "gruen gilt wie kein Eintrag - Freigeben durch die Hintertuer" \
      "s|var WACHE_RANG = { gruen: 0, gelb: 2, rot: 3 };|var WACHE_RANG = { gruen: 1, gelb: 2, rot: 3 };|"

# 4 · Die Sperre „nur strenger" fällt weg — dann liesse sich gruen setzen.
probe "die Untergrenze faellt weg (gruen setzen wieder moeglich)" \
      "s|if (wacheRang(ampel) < 2) { toast(T(\"wa_nur_strenger\"), false); return false; }||"

# 5 · Sperren ohne Begründung. „Nie still handeln" ist die vierte Regel.
probe "sperren ohne Grund wird wieder durchgelassen" \
      "s|if (!grund) { toast(T(\"wa_grund_fehlt\"), false); return false; }||"

# 6 · Die Längengrenze fällt weg. 300 Zeichen stehen öffentlich an der Karte;
#     ohne Grenze steht dort irgendwann ein ganzer Aufsatz.
probe "die Laengengrenze des Grundes faellt weg" \
      "s|if (grund.length > 300) { toast(T(\"wa_grund_lang\"), false); return false; }||"

# 7 · Ein erfundenes Ampel-Wort gilt plötzlich als gültig statt abgewiesen.
probe "ein unbekanntes Wort gilt als gueltig" \
      "s|return Object.prototype.hasOwnProperty.call(WACHE_RANG, a) ? WACHE_RANG\[a\] : -1;|return Object.prototype.hasOwnProperty.call(WACHE_RANG, a) ? WACHE_RANG[a] : 3;|"

# 8 · Die Schaltung wird still: es wird zwar abgelehnt, aber die Arbeitskopie
#     ist schon geändert. Genau das prüft die Probe zusätzlich zum Rückgabewert.
probe "abgelehnt, aber die Arbeitskopie ist trotzdem schon geaendert" \
      "s|if (!grund) { toast(T(\"wa_grund_fehlt\"), false); return false; }|if (!grund) { WACHEHAND[id] = { ampel: ampel }; toast(T(\"wa_grund_fehlt\"), false); return false; }|"

# 9 · Die Quittung geht beim Sperren verloren. Folge: nach dem Entsperren
#     meldete der Wächter dieselbe längst angesehene Änderung erneut.
probe "die Quittung geht beim Sperren verloren" \
      "s|for (var f in vorher) if (Object.prototype.hasOwnProperty.call(vorher, f)) neu\[f\] = vorher\[f\];||"

# 10 · Der Knopf ruft die Prüfung gar nicht mehr — die Ampel käme dann aus dem
#      Markup, das jeder im Browser umschreiben kann.
probe "die Ampel kommt wieder aus dem Markup statt aus dem Zustand" \
      "s|wacheSetzen(sid, (sperrZeile \&\& sperrZeile.ampel) \|\| \"rot\", feld ? feld.value : \"\");|wacheSetzen(sid, okk.getAttribute(\"data-ampel\") \|\| \"rot\", feld ? feld.value : \"\");|"

# 11 · Die Marken, an denen der Smoke schneidet, verschwinden. Dann hätte die
#      Probe keinen Gegenstand mehr — sie MUSS das als Fehler melden, nicht
#      stillschweigend nichts prüfen.
probe "die Schnittmarke verschwindet (die Probe verliert ihren Gegenstand)" \
      "s|/\* WACHE-RIEGEL-ENDE \*/||"

# ── Der Automatik-Schalter (Schritt 4) ───────────────────────────────────────
# Er kann nicht sperren und nicht lösen — aber er kann still falsch werden.

# 12 · „an" nimmt jeden Wahrheitswert statt nur echtes true. Dann schaltete ein
#      versehentliches "nein" (ein nicht-leerer Text!) die Automatik EIN.
probe "der Schalter glaubt jedem Wert statt nur echtem true" \
      "s|function autoAn() { var a = autoBlock(); return !!(a \&\& a.an === true); }|function autoAn() { var a = autoBlock(); return !!(a \&\& a.an); }|"

# 13 · Die Bereichsprüfung der Zahlen fällt weg. Dann gälte eine 0 als Schwelle
#      und jede Messung träfe sofort zu.
probe "die Bereichspruefung der Zahlen faellt weg" \
      "s|return (isFinite(n) \&\& n >= min \&\& n <= max) ? Math.floor(n) : standard;|return isFinite(n) ? Math.floor(n) : standard;|"

# 14 · Ein Block, der gar kein Objekt ist, wird trotzdem benutzt.
probe "ein Block, der kein Objekt ist, wird trotzdem benutzt" \
      "s|return (a \&\& typeof a === \"object\") ? a : null;|return a \|\| null;|"

# 15 · Der Schalter legt sich ohne die Regel-Werte an — dann stünde ein nackter
#      Schalter ohne Kontext in der Datei.
probe "der Schalter entsteht ohne die Regel-Werte" \
      "s|a = { an: false, naechte: AUTO_NAECHTE, meldungen: AUTO_MELDUNGEN, grenze: AUTO_GRENZE };|a = { an: false };|"

# 16 · Die Marke des Schalter-Blocks verschwindet — die Probe verlöre ihren
#      Gegenstand und MUSS das als Fehler melden.
probe "die Schnittmarke des Schalters verschwindet" \
      "s|/\* AUTO-SCHALTER-ENDE \*/||"

echo
if [ "$blind" -gt 0 ]; then
  echo "$gruen Wächter schlagen an, $blind BLIND — der Riegel ist nicht vollständig bewacht."
  exit 1
fi
echo "$gruen Wächter schlagen an, 0 blind"
