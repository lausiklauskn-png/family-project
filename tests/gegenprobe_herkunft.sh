#!/usr/bin/env bash
# Gegenprobe: erkennt einreichung.php WIRKLICH, von welchem Marktplatz eine
# Einsendung kam?
#
# Anlass (Klaus 2026-08-09): seit zwei Marktplätze denselben Dienst benutzen,
# stand in JEDER Mail „über family-projekt.de" — auch bei einer Einsendung von
# PWA Toolpoint. Man sah der Post nicht mehr an, wo sie herkam.
#
# Wichtiger noch als die Mail: das Studio braucht die Herkunft, um einen
# freigegebenen Eintrag in den RICHTIGEN Marktplatz zu committen. Ohne sie
# landete eine Toolpoint-Einsendung bei Family Projekt, ohne dass jemand einen
# Fehler sähe.
#
#   bash tests/gegenprobe_herkunft.sh

set -u
cd "$(dirname "$0")/.."
DATEI="server/einreichung.php"
gruen=0; rot=0

pruef() {   # pruef <Beschreibung> <erwartet-gefunden:ja|nein> <muster>
  local was="$1" soll="$2" muster="$3"
  if grep -q "$muster" "$DATEI"; then gefunden=ja; else gefunden=nein; fi
  if [ "$gefunden" = "$soll" ]; then
    echo "  ✓ $was"; gruen=$((gruen+1))
  else
    echo "  ✗ $was  (erwartet: $soll, ist: $gefunden)"; rot=$((rot+1))
  fi
}

echo "── Herkunft der Einsendung ──"
php -l "$DATEI" >/dev/null || { echo "  ✗ ABBRUCH: PHP-Syntaxfehler"; exit 1; }
echo "  ✓ PHP-Syntax grün"

# Die Herkunft kommt aus dem Origin-Kopf des BROWSERS, nicht aus dem Formular.
# Ein selbst mitgeschicktes Feld wäre eine Selbstauskunft und taugte nicht.
pruef "Herkunfts-Tabelle vorhanden"            ja   "'herkunft' =>"
pruef "PWA Toolpoint ist eingetragen"          ja   "pwa-toolpoint.de'  *=> \['name' => 'PWA Toolpoint'"
pruef "Ziel wandert in die Warteschlange"      ja   "\$rec\['ziel'\] = \$hkZiel;"
pruef "Origin wird mitgeschrieben"             ja   "\$rec\['origin'\] = \$origin;"
pruef "Betreff nennt die Herkunft"             ja   "\$subject = \$hkName"
pruef "KEIN fest verdrahtetes family-projekt.de im Betreff" nein "Marktplatz-Einreichung: ' \."
pruef "Fußzeile nennt die Herkunft"            ja   "gesendet über \" \. \$hkName"
pruef "keine Selbstauskunft aus dem Formular"  nein "field(\$data, 'herkunft'"

echo
echo "$gruen grün, $rot rot"
[ "$rot" -eq 0 ] || exit 1
