#!/usr/bin/env bash
# Internes Relais auf dem Hetzner-CLOUD-Server einrichten (NICHT Termux, NICHT Webhosting).
# Klaus 2026-10-13: wss://relay-intern.family-projekt.de für das eigene Netz der Apps.
#
# Voraussetzung: das Depot liegt unter /srv/family-project (git pull vorher), und der
# DNS-Eintrag relay-intern → 167.233.204.72 steht bei INWX.
#
# Wiederholbar: was schon da ist, wird nicht noch einmal angelegt, und eine schon
# vorhandene Konfig wird NIE überschrieben. Vor jeder Änderung eine Sicherung; lehnt
# Caddy den Block ab, wird zurückgelegt, BEVOR neu geladen wird — das öffentliche
# Relais und alle Seiten bleiben unberührt.
set -euo pipefail
QUELLE=${QUELLE:-/srv/family-project/server/relais-intern}
ZIEL=${ZIEL:-/opt/relay-intern}
[ -f "$QUELLE/config.toml" ] || { echo "!! $QUELLE/config.toml fehlt — erst: git -C /srv/family-project pull"; exit 1; }
cd "${RELAIS:-/opt/relay}"

# Dieselbe Software wie das öffentliche Relais — abgelesen, nicht geraten.
BILD=$(docker inspect relay --format '{{.Config.Image}}' 2>/dev/null || true)
[ -n "$BILD" ] || { echo "!! Container 'relay' nicht gefunden — welche Software läuft dort? (docker ps)"; exit 1; }
echo "== Software wie das öffentliche Relais: $BILD"

STEMPEL=$(date +%Y%m%d-%H%M%S)
BAK_COMPOSE="docker-compose.yml.bak-relais-intern-$STEMPEL"
BAK_CADDY="Caddyfile.bak-relais-intern-$STEMPEL"
cp docker-compose.yml "$BAK_COMPOSE"
cp Caddyfile "$BAK_CADDY"
echo "== Sicherungen: $BAK_COMPOSE, $BAK_CADDY"

mkdir -p "$ZIEL/db"
if [ -f "$ZIEL/config.toml" ]; then
  echo "== $ZIEL/config.toml steht schon — nicht überschrieben"
else
  cp "$QUELLE/config.toml" "$ZIEL/config.toml"
  echo "== Konfig nach $ZIEL/config.toml gelegt (KEINE pubkey_whitelist, Flut-Grenzen gesetzt)"
fi
# the db directory must belong to the user the image runs as — measured from the image
NUTZER=$(docker run --rm --entrypoint id "$BILD" -u 2>/dev/null || echo "")
if [ -n "$NUTZER" ] && [ "$NUTZER" != "0" ]; then chown -R "$NUTZER" "$ZIEL/db"; echo "== $ZIEL/db gehört Nutzer $NUTZER (wie im Bild)"; fi

if ! grep -q '^  relay-intern:' docker-compose.yml; then
  BLK=$(mktemp)
  cat > "$BLK" <<EOF
  relay-intern:
    image: $BILD
    container_name: relay-intern
    restart: unless-stopped
    volumes:
      - $ZIEL/config.toml:/usr/src/app/config.toml:ro
      - $ZIEL/db:/usr/src/app/db
    logging: { driver: "json-file", options: { max-size: "1m", max-file: "2" } }
    expose: ["8080"]

EOF
  awk -v blk="$BLK" '/^volumes:/ && !x { while ((getline l < blk) > 0) print l; x=1 } { print }' docker-compose.yml > docker-compose.yml.neu
  mv docker-compose.yml.neu docker-compose.yml; rm -f "$BLK"
  echo "== Dienst relay-intern in docker-compose.yml eingetragen"
else
  echo "== Dienst relay-intern steht schon in docker-compose.yml"
fi
docker compose config -q || { cp "$BAK_COMPOSE" docker-compose.yml; echo "!! compose-Datei ungültig, zurückgelegt"; exit 1; }
if ! docker compose config --services | grep -qx relay-intern; then
  cp "$BAK_COMPOSE" docker-compose.yml
  echo "!! Dienst relay-intern ist NICHT in der compose-Datei (keine Zeile 'volumes:' oben?) — zurückgelegt."
  echo "   Bitte Ausgabe schicken von: grep -n '^[a-z]' docker-compose.yml"
  exit 1
fi

docker compose up -d relay-intern
# wait for the condition, not the clock: up to WARTEN seconds for "running"
LAEUFT=nein
for _ in $(seq 1 "${WARTEN:-20}"); do
  [ "$(docker inspect relay-intern --format '{{.State.Running}}' 2>/dev/null)" = "true" ] && { LAEUFT=ja; break; }
  sleep 1
done
if [ "$LAEUFT" != ja ]; then
  echo "!! Container relay-intern läuft nicht. Letzte Zeilen:"; docker logs --tail 30 relay-intern || true; exit 1
fi
echo "== Container relay-intern läuft"

if ! grep -q 'relay-intern.family-projekt.de' Caddyfile; then
  { echo; cat "$QUELLE/Caddyfile.block"; } >> Caddyfile   # >> keeps the inode the caddy container sees
  echo "== Caddy-Block angehängt"
fi
if ! docker exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  cat "$BAK_CADDY" > Caddyfile
  echo "!! Caddy lehnt die neue Fassung ab — alte Fassung zurückgelegt, nichts neu geladen."
  docker exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile || true
  exit 1
fi
docker exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
echo "== Caddy neu geladen (das Zertifikat holt Caddy beim ersten Abruf)"
echo
echo "== fertig. Prüfen (auf demselben Server):"
echo "   curl -s -H 'Accept: application/nostr+json' https://relay-intern.family-projekt.de/"
echo "   → muss mit {\"name\":\"intern Family Project\" … antworten"
