#!/usr/bin/env bash
# Gegenprobe zu den drei Haertungen in server/einreichung.php (2026-08-10).
#
# Jede davon behebt einen Fehler, der still passiert waere. Diese Datei prueft,
# dass sie da sind — und, wo es geht, dass sie WIRKEN (echter Lauf in /tmp).
set -u
cd "$(dirname "$0")/.."
gruen=0; rot=0
pruef() { local was="$1" soll="$2" muster="$3"
  if grep -q "$muster" server/einreichung.php; then da=1; else da=0; fi
  if [ "$da" = "$soll" ]; then echo "  ✓ $was"; gruen=$((gruen+1));
  else echo "  ✗ $was"; rot=$((rot+1)); fi; }
lauf() { local was="$1" erwartet="$2"; shift 2
  if echo "$AUSGABE" | grep -q "$erwartet"; then echo "  ✓ $was"; gruen=$((gruen+1));
  else echo "  ✗ $was  (Antwort war: $AUSGABE)"; rot=$((rot+1)); fi; }

echo "── Haertung der Einreichung ──"
pruef "PHP-Syntax"                              1 '<?php'
php -l server/einreichung.php >/dev/null 2>&1 || { echo "  ✗ PHP-Syntax kaputt"; exit 1; }

pruef "Salz kommt aus einer eigenen Datei"       1 "salt_file"
pruef "… und wird zufaellig erzeugt"             1 "random_bytes"
# NEGATIV: das feste Platzhalter-Salz darf nicht mehr die einzige Quelle sein.
pruef "… der Platzhalter ist nur noch Rueckfall" 1 "lieber ein schwaches Salz"
pruef "Deckel gegen riesige Anfragen"            1 "zu_gross"
pruef "Warteschlangen-Schreiben wird geprueft"   1 'inWarteschlange'
pruef "Mail-Ergebnis wird geprueft"              1 'gemailt = @mail'
pruef "beide gescheitert = ehrlicher Fehler"     1 'nicht_gespeichert'
# NEGATIV: es darf kein bedingungsloses ok mehr geben.
pruef "KEIN vorgetaeuschtes ok mehr"             0 'Mail-Fehlschlag ist kein harter Fehler'

# ---- echter Lauf ------------------------------------------------------------
ARBEIT="$(mktemp -d)"
cp server/einreichung.php "$ARBEIT/"
cat > "$ARBEIT/lauf.php" <<'PHP'
<?php
$_SERVER['REQUEST_METHOD']='POST'; $_SERVER['HTTP_ORIGIN']=getenv('HERK');
$_SERVER['REMOTE_ADDR']='203.0.113.7';
if (getenv('GROSS')) $_SERVER['CONTENT_LENGTH']='9000000';
$_POST=['zweck'=>'eintrag','app'=>'Testapp','beschreibung'=>'Text',
  'url'=>'https://example.org/','bild'=>'https://example.org/b.png',
  'kontakt'=>'du@example.com','fp_elapsed'=>5000];
ob_start(); include 'einreichung.php'; echo ob_get_clean();
PHP

AUSGABE="$(cd "$ARBEIT" && HERK=https://pwa-toolpoint.de php lauf.php 2>/dev/null)"
lauf "ein normaler Lauf wird angenommen" '"ok":true'
[ -f "$ARBEIT/.ip_salt.php" ] && { echo "  ✓ Salz-Datei wurde angelegt"; gruen=$((gruen+1)); } \
                              || { echo "  ✗ Salz-Datei fehlt"; rot=$((rot+1)); }
RECHTE="$(stat -c %a "$ARBEIT/.ip_salt.php" 2>/dev/null)"
[ "$RECHTE" = "600" ] && { echo "  ✓ … und ist nur fuer den Besitzer lesbar"; gruen=$((gruen+1)); } \
                      || { echo "  ✗ Salz-Datei hat Rechte $RECHTE statt 600"; rot=$((rot+1)); }
S1="$(cd "$ARBEIT" && php -r 'echo include ".ip_salt.php";')"
(cd "$ARBEIT" && HERK=https://pwa-toolpoint.de php lauf.php >/dev/null 2>&1)
S2="$(cd "$ARBEIT" && php -r 'echo include ".ip_salt.php";')"
[ -n "$S1" ] && [ "$S1" = "$S2" ] && { echo "  ✓ … und bleibt ueber Laeufe hinweg gleich"; gruen=$((gruen+1)); } \
                                  || { echo "  ✗ Salz aendert sich bei jedem Lauf"; rot=$((rot+1)); }

# Herkunft aus dem Origin-Kopf, NICHT aus dem Formular.
grep -q '"ziel":"toolpoint"' "$ARBEIT/warteschlange.jsonl" \
  && { echo "  ✓ die Herkunft landet in der Warteschlange"; gruen=$((gruen+1)); } \
  || { echo "  ✗ Herkunft fehlt in der Warteschlange"; rot=$((rot+1)); }

AUSGABE="$(cd "$ARBEIT" && HERK=https://pwa-toolpoint.de GROSS=1 php lauf.php 2>/dev/null)"
lauf "eine riesige Anfrage wird abgewiesen" 'zu_gross'

rm -f "$ARBEIT/warteschlange.jsonl"; mkdir "$ARBEIT/warteschlange.jsonl"
AUSGABE="$(cd "$ARBEIT" && HERK=https://pwa-toolpoint.de php lauf.php 2>/dev/null)"
lauf "geht BEIDES schief, wird es ehrlich gemeldet" 'nicht_gespeichert'
rmdir "$ARBEIT/warteschlange.jsonl" 2>/dev/null
rm -rf "$ARBEIT"

echo
echo "$gruen gruen, $rot rot"
[ "$rot" -eq 0 ] || exit 1
