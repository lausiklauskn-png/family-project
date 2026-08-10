#!/usr/bin/env bash
# Gegenprobe: reicht die API eine MELDUNG so durch, dass ein Studio sie von
# einer EINREICHUNG unterscheiden kann? (2026-08-10)
#
# ANLASS. Bis heute lieferte `list` nur id/status/ts/label/text/by/url/img/
# category/contact/sporeUrl/herkunft/ziel. Eine Meldung und eine Einreichung
# haben davon nur `label` und `text` gemeinsam — es gab kein einziges Merkmal,
# an dem ein Studio die beiden auseinanderhalten koennte. Folge: jede Meldung
# stand im Pruef-Stapel und trug die Warnungen „kein brauchbares Bild" und
# „Adresse ist kein https". Eine Meldung hat beides naturgemaess nicht; sie sah
# aus wie ein kaputter Eintrag.
#
# Raten waere der falsche Ausweg gewesen — eine Einsendung ohne Bild ist auch
# nur eine Einsendung ohne Bild. Der Server sagt jetzt, was es ist.
#
# Diese Datei prueft es nicht am Text, sondern am ECHTEN LAUF: sie legt eine
# Warteschlange mit einer Meldung und einer Einreichung an, ruft `list` auf und
# sieht in der Antwort nach. Danach nimmt sie die vier Zeilen wieder heraus und
# verlangt, dass die Unterscheidung damit verschwindet.
#
#   bash tests/gegenprobe_meldung_im_studio.sh

set -u
cd "$(dirname "$0")/.."
gruen=0; rot=0

pruef() {   # pruef <Beschreibung> <soll:ja|nein> <muster> <text>
  local was="$1" soll="$2" muster="$3" text="$4"
  if echo "$text" | grep -q "$muster"; then ist=ja; else ist=nein; fi
  if [ "$ist" = "$soll" ]; then echo "  ✓ $was"; gruen=$((gruen+1));
  else echo "  ✗ $was  (erwartet: $soll, ist: $ist)"; rot=$((rot+1)); fi
}

if ! command -v php >/dev/null 2>&1; then
  echo "  ⚠ php nicht vorhanden — Gegenprobe uebersprungen (kein Freispruch)."
  exit 0
fi

ARBEIT="$(mktemp -d)"
trap 'rm -rf "$ARBEIT"' EXIT
cp server/marktplatz-api.php "$ARBEIT/"

# Konfiguration NUR fuer den Lauf. Kein echter Token — `list` liest bloss die
# Warteschlange und fasst GitHub gar nicht an.
cat > "$ARBEIT/freigabe-config.php" <<'PHP'
<?php
return array(
  'studio_key'    => 'test-schluessel',
  'queue_file'    => __DIR__ . '/warteschlange.jsonl',
  'github_owner'  => 'niemand',
  'github_repo'   => 'nichts',
  'github_branch' => 'main',
  'github_token'  => 'kein-token',
);
PHP

# Eine Meldung, eine Einreichung, eine Kontakt-Anfrage. Die dritte muss
# herausfallen — Kontakt bleibt freigabe.php vorbehalten.
cat > "$ARBEIT/warteschlange.jsonl" <<'JSONL'
{"zweck":"meldung","label":"Jasons Tresor","entry_id":"markt-jasons-tresor","grund":"kaputt","grund_text":"Die Seite ist nicht erreichbar oder kaputt.","text":"Hinweis des Melders.","herkunft":"PWA Toolpoint","ziel":"toolpoint","ts":"2026-08-10T20:56:24+00:00","id":"m1","status":"neu"}
{"zweck":"eintrag","label":"Eine App","text":"Beschreibung","url":"https://example.org/","img":"https://example.org/i.png","herkunft":"PWA Toolpoint","ziel":"toolpoint","ts":"2026-08-10T16:34:00+00:00","id":"e1","status":"neu"}
{"zweck":"kontakt","name":"Jemand","contact":"wer@example.org","text":"Frage","ts":"2026-08-10T16:28:00+00:00","id":"k1","status":"neu"}
JSONL

cat > "$ARBEIT/lauf.php" <<'PHP'
<?php
$_REQUEST = array('action' => 'list', 'key' => 'test-schluessel');
require __DIR__ . '/marktplatz-api.php';
PHP

echo "── Meldung im Studio unterscheidbar ──"
ANTWORT="$(cd "$ARBEIT" && php lauf.php 2>/dev/null)"

pruef "die Meldung kommt ueberhaupt an"            ja '"id":"m1"'                 "$ANTWORT"
pruef "die Einreichung kommt an"                   ja '"id":"e1"'                 "$ANTWORT"
pruef "die Kontakt-Anfrage bleibt draussen"        nein '"id":"k1"'               "$ANTWORT"
pruef "sie ist als Meldung erkennbar"              ja '"zweck":"meldung"'         "$ANTWORT"
pruef "die Einreichung ist als solche erkennbar"   ja '"zweck":"eintrag"'         "$ANTWORT"
pruef "der gemeldete Eintrag steht dabei"          ja '"entry_id":"markt-jasons-tresor"' "$ANTWORT"
pruef "der Grund als Kuerzel"                      ja '"grund":"kaputt"'          "$ANTWORT"
pruef "der Grund im Klartext"                      ja 'nicht erreichbar oder kaputt' "$ANTWORT"
pruef "der Hinweis des Melders"                    ja 'Hinweis des Melders'       "$ANTWORT"
pruef "die Herkunft weiterhin"                     ja '"herkunft":"PWA Toolpoint"' "$ANTWORT"

# ---- Der Beweis, dass die Pruefung etwas prueft ----------------------------
# Ohne diesen Teil koennte oben alles gruen sein, weil die Muster zu lasch sind.
# Also: die vier Zeilen wieder herausnehmen und verlangen, dass die
# Unterscheidung damit VERSCHWINDET.
echo "── Gegenprobe: ohne die vier Zeilen ──"
sed -i "/'zweck' => isset(\$r\['zweck'\])/d;/'entry_id' => isset(\$r\['entry_id'\])/d;/'grund' => isset(\$r\['grund'\])/d;/'grund_text' => isset(\$r\['grund_text'\])/d" "$ARBEIT/marktplatz-api.php"
php -l "$ARBEIT/marktplatz-api.php" >/dev/null 2>&1 || { echo "  ✗ ABBRUCH: die Sabotage hat die Datei kaputtgemacht"; exit 1; }
OHNE="$(cd "$ARBEIT" && php lauf.php 2>/dev/null)"

pruef "die Meldung kommt weiterhin an"             ja '"id":"m1"'          "$OHNE"
pruef "… aber sie ist NICHT mehr als Meldung erkennbar" nein '"zweck":"meldung"' "$OHNE"
pruef "… der Grund fehlt"                          nein '"grund":"kaputt"'  "$OHNE"
pruef "… der gemeldete Eintrag fehlt"              nein '"entry_id":'       "$OHNE"

echo
echo "$gruen bestanden, $rot fehlgeschlagen"
[ "$rot" -eq 0 ] || exit 1
