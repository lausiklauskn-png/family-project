# Auto-Deploy — der Server holt sich main von allein

Damit nach jedem Merge auf `main` die Live-Seite **family-projekt.de** automatisch
aktuell wird, läuft auf dem Hetzner-Server ein kleiner Cron-Job, der alle 2 Minuten
den neuesten Stand zieht. **Einmal einrichten, danach nie wieder anfassen.**

> Voraussetzung: das Verzeichnis `/srv/family-project` existiert bereits als
> `git clone` (siehe `docs/DEPLOY.md`). Das Repo ist öffentlich → `git fetch`
> braucht kein Token.

## Einmalige Einrichtung (eine Zeile in die Hetzner-Konsole einfügen)

Diese eine Zeile (a) zieht **sofort** den aktuellen Stand und (b) richtet den
2-Minuten-Cron ein (doppelte Einträge werden vermieden):

```sh
cd /srv/family-project && git fetch origin main && git reset --hard origin/main && \
( crontab -l 2>/dev/null | grep -v 'family-project auto-deploy' ; \
  echo '*/2 * * * * cd /srv/family-project && git fetch origin main && git reset --hard origin/main >> /tmp/family-deploy.log 2>&1 # family-project auto-deploy' ) | crontab -
```

Danach im Browser **Strg+Shift+R** (Hard-Reload) auf `family-projekt.de`.

## Prüfen

```sh
crontab -l | grep family-project        # zeigt die Auto-Deploy-Zeile
cat /tmp/family-deploy.log               # Verlauf der Auto-Updates (nur bei Änderung)
```

## Wieder entfernen

```sh
crontab -l 2>/dev/null | grep -v 'family-project auto-deploy' | crontab -
```

## Hinweise

- `git reset --hard origin/main` verwirft bewusst lokale Änderungen im Deploy-
  Verzeichnis — dort soll nie von Hand editiert werden. Änderungen laufen immer
  über einen PR → Merge nach `main`.
- Caddy liefert die Dateien statisch aus; ein Reload ist nach dem Pull **nicht**
  nötig. Nur der Browser-Cache/Service-Worker kann hartnäckig sein → Hard-Reload.
- Das Skript `deploy/auto-pull.sh` macht dasselbe als wartbare Datei; der Cron
  oben ist bewusst inline (self-contained), damit er ohne Datei-Abhängigkeit läuft.
