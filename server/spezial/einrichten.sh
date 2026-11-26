#!/usr/bin/env bash
# Marktplatz Spezial auf dem Hetzner-CLOUD-Server einrichten (NICHT Termux, NICHT Webhosting).
# Klaus 2026-11-26 (Weg B): die Pro-Dateien liegen auf dem eigenen Server und werden
# nur gegen einen gültigen Passkey ausgegeben.
#
# Voraussetzung: das Depot liegt unter /srv/family-project (git pull), und die DNS-Einträge
# spezial.family-projekt.de und spezial.pwa-toolpoint.de zeigen auf 167.233.204.72.
# Wiederholbar. Vor jeder Änderung eine Sicherung; lehnt Caddy ab, wird zurückgelegt.
set -euo pipefail
QUELLE=/srv/family-project/server/spezial
[ -f "$QUELLE/dienst.mjs" ] || { echo "!! $QUELLE/dienst.mjs fehlt — erst: git -C /srv/family-project pull"; exit 1; }
cd /opt/relay
STEMPEL=$(date +%Y%m%d-%H%M%S)
BAK_COMPOSE="docker-compose.yml.bak-spezial-$STEMPEL"
BAK_CADDY="Caddyfile.bak-spezial-$STEMPEL"
cp docker-compose.yml "$BAK_COMPOSE"
cp Caddyfile "$BAK_CADDY"
echo "== Sicherungen: $BAK_COMPOSE, $BAK_CADDY"

mkdir -p /srv/spezial/dateien
chmod 700 /srv/spezial

if ! grep -q '^  spezial:' docker-compose.yml; then
  awk -v blk="$QUELLE/compose-dienst.yml" '
    /^volumes:/ && !x { while ((getline l < blk) > 0) print l; x=1 } { print }' docker-compose.yml > docker-compose.yml.neu
  mv docker-compose.yml.neu docker-compose.yml
  echo "== Dienst spezial in docker-compose.yml eingetragen"
else
  echo "== Dienst spezial steht schon in docker-compose.yml"
fi
docker compose config -q || { cp "$BAK_COMPOSE" docker-compose.yml; echo "!! compose-Datei ungültig, zurückgelegt"; exit 1; }
if ! docker compose config --services | grep -qx spezial; then
  cp "$BAK_COMPOSE" docker-compose.yml
  echo "!! Dienst spezial ist nach dem Eintragen NICHT in der compose-Datei — zurückgelegt. Bitte Ausgabe von: grep -n '^[a-z]' docker-compose.yml"
  exit 1
fi

echo "== erster Spiegel-Lauf (holt alle Pro-Dateien, kann einige Minuten dauern) …"
LAUF='docker run --rm -v /srv/family-project:/app:ro -v /srv/spezial:/daten node:22-alpine node /app/server/spezial/spiegeln.mjs'
if $LAUF; then echo "== Spiegel ohne Fehler"; else echo "!! Spiegel meldet Fehler (siehe oben) — der nächste Lauf versucht es wieder"; fi

docker compose up -d spezial
echo "== Container spezial läuft"

if ! grep -q 'spezial.family-projekt.de' Caddyfile; then
  { echo; cat "$QUELLE/Caddyfile.block"; } >> Caddyfile   # >> behält die Inode, die der Container sieht
  echo "== Caddy-Block angehängt"
fi
if ! docker exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  cat "$BAK_CADDY" > Caddyfile
  echo "!! Caddy lehnt die neue Fassung ab — alte Fassung zurückgelegt, nichts neu geladen."
  docker exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile || true
  exit 1
fi
docker exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
echo "== Caddy neu geladen"

ZEILE="17 * * * * $LAUF >> /var/log/spezial-spiegel.log 2>&1 # spezial-spiegel"
( crontab -l 2>/dev/null | grep -v spezial-spiegel; echo "$ZEILE" ) | crontab -
echo "== Spiegel stündlich eingerichtet (Protokoll: /var/log/spezial-spiegel.log)"
echo "== fertig. Prüfen: curl -s https://spezial.family-projekt.de/gesund"
