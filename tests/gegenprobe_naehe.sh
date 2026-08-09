#!/usr/bin/env bash
# Gegenprobe zur Naehe-Zahl der Bedeutungs-Suche (Klaus 2026-08-09).
#
# Die Suche sortierte nach einem Wert, den sie sofort wegwarf. Man sah die
# Reihenfolge, aber nicht, wie sicher sie ist. Diese Datei prueft, dass die
# Zahl da ist UND ehrlich beschriftet — und dass jede Pruefung auch rot wird.
set -u
cd "$(dirname "$0")/.."
gruen=0; rot=0
pruef() {                       # pruef <Beschreibung> <0=erwartet-vorhanden> <muster>
  local was="$1" soll="$2" muster="$3"
  if grep -q "$muster" markt.html; then da=1; else da=0; fi
  if [ "$da" = "$soll" ]; then echo "  ✓ $was"; gruen=$((gruen+1));
  else echo "  ✗ $was"; rot=$((rot+1)); fi
}
echo "── Naehe-Zahl in der Bedeutungs-Suche ──"
pruef "die Zahl landet an der Karte"            1 '_naehe = r.s'
pruef "die Karte zeigt sie"                     1 'function naeheBand'
pruef "… und sie steht im Karten-Markup"        1 'naeheBand(x) +'
pruef "die Wortsuche raeumt alte Zahlen ab"     1 'delete x._naehe'
pruef "beschriftet als Naehe"                   1 'mk_naehe: "Nähe"'
pruef "… mit dem vollen Satz dazu"              1 'Das ist eine Rangfolge, kein Urteil'
pruef "… auf Englisch auch"                     1 'mk_naehe: "Closeness"'
# NEGATIV: ein Cosinus ist keine Prozent-Uebereinstimmung.
pruef "KEINE Prozentzahl an der Zahl"           0 'toFixed(2) + .%'
pruef "KEIN 'Uebereinstimmung' als Beschriftung" 0 'mk_naehe: "Übereinstimmung"'
echo
echo "$gruen gruen, $rot rot"
[ "$rot" -eq 0 ] || exit 1
