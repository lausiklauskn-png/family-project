# Video-Spiegel einrichten — videos.family-projekt.de

Klaus 2026-10-06: *„jedes Werbevideo … in einen separaten Ordner … videos.family-projekt.de/workfloh-pdf/…"*

Der Server holt sich die Videos **selbst** von GitHub Pages, alle 10 Minuten.
Du lädst weiter nur nach GitHub hoch. Gelöscht wird auf dem Server **nie**.

| Ordner | woher |
|---|---|
| `family-project/` | Family-Projekt.de-Video (Werbevideo in Teilen, setzt sie zusammen, prüft jede SHA-256) |
| `workfloh-pdf/` | Workfloh-PDF-Page (Erklärvideo quer + hochkant, DE/EN/RU, Vorschaubilder, Kapitel) |
| `mein-mixarium/` · `mein-rezeptbuch/` · `tomys-hub/` · `alis-moderaum/` | die Videos dieser Seiten |

Was gespiegelt wird, steht in `quellen.json`. Die Apps benutzen die neue Adresse **noch nicht** — das ist Schritt 2, eine eigene Sitzung.

---

## Schritt 1 · DNS (im Browser, bei INWX)

Neuer Eintrag in der Zone `family-projekt.de`:

| Name | Typ | Wert |
|---|---|---|
| `videos` | A | `167.233.204.72` |

Erfolg, wenn auf dem **Tablet in Termux** `nslookup videos.family-projekt.de` die Adresse `167.233.204.72` nennt. Das kann ein paar Minuten dauern.

## Schritt 2 · Depot auf den Server holen (Hetzner Cloud-Server, Prompt `root@ubuntu`)

Beim ersten Mal:

```bash
git clone https://github.com/lausiklauskn-png/family-project.git /srv/family-project
```

Steht es schon da:

```bash
git -C /srv/family-project pull
```

## Schritt 3 · Einrichten (Hetzner Cloud-Server)

```bash
bash /srv/family-project/server/videos/einrichten.sh
```

Das Skript macht vorher Sicherungen (`/opt/relay/*.bak-videos-<Zeit>`), trägt den Container `videos` ein, hängt den Caddy-Block an, lädt Caddy **erst nach** erfolgreicher Prüfung neu, richtet den 10-Minuten-Lauf ein und macht den ersten Lauf. Lehnt Caddy etwas ab, legt es die alte Fassung zurück — die bestehenden Seiten bleiben dann unberührt.

Erfolg: die letzte Zeile heißt `== fertig`.

## Schritt 4 · Prüfen (Hetzner Cloud-Server oder Termux)

```bash
curl -sI https://videos.family-projekt.de/family-project/videos.json | head -1
curl -sI https://videos.family-projekt.de/workfloh-pdf/workfloh-pdf-quer.mp4 | head -1
curl -s -o /dev/null -w "%{http_code}\n" https://videos.family-projekt.de/.spiegel/stand.json
```

Erwartet: `HTTP/2 200`, `HTTP/2 200`, und **404** beim dritten (der interne Stand wird nie ausgeliefert).

Protokoll ansehen (Cloud-Server): `tail -40 /var/log/videos-spiegel.log`

---

## Später

- **Ein neuer Ordner oder eine neue Datei** in `quellen.json`: erst auf GitHub mergen, dann auf dem Cloud-Server `git -C /srv/family-project pull` — der 10-Minuten-Lauf holt sich das Depot **nicht** selbst.
- **`server/videos/Caddyfile` geändert**: nach dem `git pull` zusätzlich `docker restart videos` (Cloud-Server). Eine einzeln eingehängte Datei kann sonst die alte Fassung behalten.
- **Neue Fassung eines Videos** auf GitHub: nichts tun. Der nächste Lauf merkt es (SHA bzw. ETag) und ersetzt die Datei; die alte bleibt liegen, bis die neue vollständig und geprüft ist.

## Zurücknehmen (Hetzner Cloud-Server)

```bash
crontab -l | grep -v videos-spiegel | crontab -
cd /opt/relay
ls -1 *.bak-videos-*                       # die Sicherungen
cat Caddyfile.bak-videos-<Zeit> > Caddyfile   # cat >, NIE cp — der Container sieht die Datei über ihren Inode
cp docker-compose.yml.bak-videos-<Zeit> docker-compose.yml
docker compose up -d --remove-orphans
docker exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

Die Videos unter `/srv/videos` bleiben dabei liegen; weg nur mit `rm -r /srv/videos`.

## Geprüft

```bash
node tests/smoke_videos_spiegel.mjs       # gestellter Server statt github.io
node tests/gegenprobe_videos_spiegel.mjs  # 16 eingebaute Fehler, Wegwerf-Kopie
```

⚠ **Nicht gemessen:** der echte Server, echte Downloads von github.io (aus dem Sitzungs-Behälter gesperrt), die Größe aller Videos zusammen, ob jede Adresse in `quellen.json` heute antwortet (Fehlende meldet der Lauf im Protokoll), das Tablet.
