# Marktplatz Spezial einrichten — spezial.family-projekt.de

Klaus 2026-11-26 (Weg B): die Pro-Apps (APK, Windows) werden **nur gegen einen gültigen Passkey** ausgegeben.
Der Server holt die Dateien selbst aus den GitHub-Releases (stündlich) und legt sie unter `/srv/spezial/dateien/`
ab — **außerhalb** jedes Web-Ordners. Ausgegeben wird nur über den Dienst `spezial`, mit einem Link, der
10 Minuten gilt.

| Datei | Zweck |
|---|---|
| `dienst.mjs` | prüft Passkey, gibt Links und Dateien aus, nimmt Sperren an |
| `spiegeln.mjs` | holt die neueste Freigabe je App und Art (android/windows), prüft SHA-256 |
| `quellen.json` | welche App aus welchem Repo — Kennungen nie umbenennen |
| `schluessel.json` | die **öffentlichen** Herausgeber-Schlüssel je Markt (`fp`, `tp`) |
| `/srv/spezial/` (nur am Server) | `dateien/`, `stand.json`, `sperrliste.json`, `zaehler.json`, `geheim` |

⚠ **Benannte Grenze:** solange die Releases auf GitHub öffentlich sind, lädt wer die Release-Adresse kennt
weiter ohne Passkey (Klaus 26.11.: „erst mal öffentlich lassen"). Ob Repos oder Releases privat werden,
ist ein eigener Schritt — dann legt Klaus einen Lese-Token nach `/srv/spezial/github-token` (nur am Server).

---

## Schritt 1 · DNS (im Browser, bei INWX)

| Zone | Name | Typ | Wert |
|---|---|---|---|
| `family-projekt.de` | `spezial` | A | `167.233.204.72` |
| `pwa-toolpoint.de` | `spezial` | A | `167.233.204.72` |

Erfolg: auf dem **Tablet in Termux** nennt `nslookup spezial.family-projekt.de` (und `spezial.pwa-toolpoint.de`)
die Adresse `167.233.204.72`.

## Schritt 2 · Depot holen (Hetzner Cloud-Server, Prompt `root@ubuntu`)

```bash
git -C /srv/family-project pull
```

## Schritt 3 · Einrichten (Hetzner Cloud-Server)

```bash
bash /srv/family-project/server/spezial/einrichten.sh
```

Erfolg: die letzte Zeile heißt `== fertig`. Der erste Spiegel-Lauf lädt alle Pro-Dateien (rund 1–1,5 GB).

## Schritt 4 · Prüfen (Cloud-Server oder Termux)

```bash
curl -s https://spezial.family-projekt.de/gesund
curl -s https://spezial.family-projekt.de/apps | head -c 400
curl -s -o /dev/null -w "%{http_code}\n" https://spezial.family-projekt.de/dateien/
```

Erwartet: `ok`, eine Liste mit Fassungen, und **404** beim dritten (Dateien gibt es nur über einen Link).

## Schritt 5 · Herausgeber-Schlüssel (im Browser, Studio)

1. Auf family-projekt.de das Studio öffnen (langer Druck auf die Fußzeile) → **🔑 Marktplatz Spezial: Passkeys**.
2. **Schlüssel anlegen** mit einem Studio-Passwort. Der geheime Schlüssel bleibt verschlüsselt in diesem Browser.
3. Den **öffentlichen Schlüssel** an Claude schicken — er kommt in `schluessel.json` (`fp`). Danach am Server
   `git -C /srv/family-project pull` (kein Neustart nötig, der Dienst liest die Datei bei jeder Anfrage).
4. **Schlüssel-Sicherung kopieren** und gut aufheben (z. B. im Tresor).
5. Dasselbe auf pwa-toolpoint.de für den Markt `tp` — ein **eigener** Schlüssel.

## Wenn etwas nicht geht

| Zeichen | wo nachsehen |
|---|---|
| `/apps` nennt keine Fassung | `tail -50 /var/log/spezial-spiegel.log` (Cloud-Server) |
| Passkey „noch kein Schlüssel" | Schritt 5.3 fehlt oder `git pull` am Server fehlt |
| Dienst antwortet nicht | `docker logs --tail 50 spezial` (Cloud-Server, in `/opt/relay`) |
| neue Fassung von `dienst.mjs` | `git -C /srv/family-project pull && docker restart spezial` |

**Zweiter Weg (2026-11-27):** BookLedger Pro und Datei-Organizer Pro legen ihren Windows-Installer nur auf
`family-projekt.de/updates/<ordner>/`, nicht an ein GitHub-Release. `quellen.json` nennt das je App unter `server.windows`;
der Spiegel holt dann `aktuell-windows.json` samt `.sig`, prüft die Unterschrift gegen den Schlüssel, der in der App
eingebaut ist, und danach Größe und SHA-256. Nichts einzurichten: der Server zieht `main` alle 2 Minuten, der Spiegel
läuft stündlich. Sofort: `docker run --rm -v /srv/family-project:/app:ro -v /srv/spezial:/daten node:22-alpine node /app/server/spezial/spiegeln.mjs` (Cloud-Server).

Wer wie oft geladen hat: `cat /srv/spezial/zaehler.json` (je Passkey-Kennung, kein Name).

**Kurzlinks (2026-11-27):** Bei „Mit Code verschließen“ holt das Studio einen Kurzlink `spezial.family-projekt.de/k/<id>`
(bzw. `spezial.pwa-toolpoint.de/k/<id>`), 3 Tage gültig. Gespeichert wird in `/srv/spezial/kurz.json` nur der verschlossene
Teil (`FPZ1.`/`TPZ1.`), ohne den Code nutzlos; „Sperren“ löscht die Kurzlinks des Passkeys. Weil sich `dienst.mjs` dafür
geändert hat, einmal auf dem **Cloud-Server**: `docker restart spezial` (das `git pull` macht der Server selbst).

**Gerätebindung (2026-11-27):** je Passkey höchstens 2 Geräte (`/srv/spezial/geraete.json`, nur Zufallskennungen).
„Geräte zurücksetzen“ im Studio schickt eine unterschriebene Erklärung über `/sperren` (15 Minuten gültig). Die Bremse
zählt seitdem nur Fehlversuche (30 in 10 Minuten). Neue `dienst.mjs` → einmal `docker restart spezial` (Cloud-Server).
