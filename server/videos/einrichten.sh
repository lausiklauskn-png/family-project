#!/usr/bin/env bash
# Video-Spiegel auf dem Hetzner-Cloud-Server einrichten (NICHT Termux, NICHT Webhosting).
# Klaus 2026-10-06: jedes Werbe- und Erklärvideo auf dem eigenen Server, je App ein Ordner,
# erreichbar unter https://videos.family-projekt.de/<app>/…
#
# Voraussetzung: das Depot liegt unter /srv/family-project (git clone, siehe EINRICHTEN.md),
# und der DNS-Eintrag videos → 167.233.204.72 steht.
#
# Wiederholbar: was schon da ist, wird nicht noch einmal angelegt.
# Vor jeder Änderung eine Sicherung; lehnt Caddy den Block ab, wird zurückgelegt,
# BEVOR neu geladen wird — die bestehenden Seiten bleiben also unberührt.
set -euo pipefail
QUELLE=/srv/family-project/server/videos
[ -f "$QUELLE/spiegeln.mjs" ] || { echo "!! $QUELLE/spiegeln.mjs fehlt — erst das Depot nach /srv/family-project holen (EINRICHTEN.md, Schritt 2)"; exit 1; }
cd /opt/relay
STEMPEL=$(date +%Y%m%d-%H%M%S)
BAK_COMPOSE="docker-compose.yml.bak-videos-$STEMPEL"
BAK_CADDY="Caddyfile.bak-videos-$STEMPEL"
cp docker-compose.yml "$BAK_COMPOSE"
cp Caddyfile "$BAK_CADDY"
echo "== Sicherungen: $BAK_COMPOSE, $BAK_CADDY"

mkdir -p /srv/videos

if ! grep -q '^  videos:' docker-compose.yml; then
  # insert the service right before the top-level "volumes:" line
  awk -v blk="$QUELLE/compose-dienst.yml" '
    /^volumes:/ && !x { while ((getline l < blk) > 0) print l; x=1 } { print }' docker-compose.yml > docker-compose.yml.neu
  mv docker-compose.yml.neu docker-compose.yml
  echo "== Dienst videos in docker-compose.yml eingetragen"
else
  echo "== Dienst videos steht schon in docker-compose.yml"
fi
docker compose config -q || { cp "$BAK_COMPOSE" docker-compose.yml; echo "!! compose-Datei ungültig, zurückgelegt"; exit 1; }
# the awk insert silently does nothing if there is no top-level "volumes:" line — check the result, not the intent
if ! docker compose config --services | grep -qx videos; then
  cp "$BAK_COMPOSE" docker-compose.yml
  echo "!! Dienst videos ist nach dem Eintragen NICHT in der compose-Datei — zurückgelegt. Bitte Ausgabe von: grep -n '^[a-z]' docker-compose.yml"
  exit 1
fi

docker compose up -d videos
echo "== Container videos läuft"

if ! grep -q 'videos.family-projekt.de' Caddyfile; then
  { echo; cat "$QUELLE/Caddyfile.block"; } >> Caddyfile   # >> keeps the inode the container sees
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

# mirror every 10 minutes; the script locks itself, a second run just stops
LAUF='docker run --rm -v /srv/family-project:/app:ro -v /srv/videos:/videos node:22-alpine node /app/server/videos/spiegeln.mjs'
ZEILE="*/10 * * * * $LAUF >> /var/log/videos-spiegel.log 2>&1 # videos-spiegel"
( crontab -l 2>/dev/null | grep -v videos-spiegel; echo "$ZEILE" ) | crontab -
echo "== Spiegel alle 10 Minuten eingerichtet (Protokoll: /var/log/videos-spiegel.log)"

echo "== erster Lauf (kann bei großen Videos einige Minuten dauern) …"
if $LAUF; then echo "== erster Lauf fertig, ohne Fehler"; else echo "!! erster Lauf meldet Fehler (siehe oben) — der Dienst läuft trotzdem, der nächste Lauf versucht es wieder"; fi
echo "== fertig. Prüfen: curl -sI https://videos.family-projekt.de/family-project/videos.json"
