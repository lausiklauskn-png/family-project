# Deploy — Family Projekt (Hetzner + Caddy)

Die Website läuft auf Klaus' **eigenem Hetzner-Server** (CX23, Falkenstein), auf
dem schon das **Relay** (`wss://relay.family-projekt.de`) hinter **Caddy** im
Docker läuft. Wir lassen dieselbe Caddy die Website gleich mit ausliefern —
ein zusätzlicher Site-Block + ein Verzeichnis, in das wir per `git pull` ziehen.

> **Kein GitHub Pages.** Bewusst: das spätere Einreich-Formular + die Bezahlung
> brauchen einen kleinen Hintergrund-Dienst, den Pages nicht kann.

---

## 1. Verzeichnis anlegen (einmalig, gemeinsam mit Klaus)

Auf dem Server ein Verzeichnis für die Website-Dateien, z. B. `/srv/family-project`:

```bash
sudo mkdir -p /srv/family-project
sudo chown "$USER":"$USER" /srv/family-project
git clone https://github.com/lausiklauskn-png/family-project.git /srv/family-project
cd /srv/family-project
git checkout main      # nach dem Merge des Bau-PRs
```

Aktualisieren später (nach jedem Merge auf `main`):

```bash
cd /srv/family-project && git pull origin main
```

> Nach jedem Pull im Browser **Hard-Reload (Strg+Shift+R)** — falls ein
> Service-Worker/HTTP-Cache hartnäckig ist.

---

## 2. Caddy-Site-Block ergänzen

Die schon laufende Caddy bekommt einen zusätzlichen Block (siehe
`Caddyfile.example` in diesem Repo). Je nach Setup:

- **Caddy im Docker mit gemountetem `Caddyfile`:** den Block in das gemountete
  `Caddyfile` einfügen und das Verzeichnis `/srv/family-project` zusätzlich als
  Volume in den Caddy-Container mounten (z. B. `-v /srv/family-project:/srv/family-project:ro`).
- **Caddy nativ:** den Block in `/etc/caddy/Caddyfile` einfügen.

Kern-Block (Auto-TLS via Let's Encrypt, statisches Ausliefern):

```caddy
family-projekt.de, www.family-projekt.de {
    root * /srv/family-project
    encode zstd gzip

    # /server/ sperren — NICHT weglassen (siehe § Warum die Sperre nötig ist)
    handle /server/* {
        respond 404
    }

    handle {
        try_files {path} {path}/ /index.html
        file_server
    }

    # Korrekte MIME-Typen (ältere Caddy)
    @js path *.js
    header @js Content-Type "text/javascript; charset=utf-8"
}

# .com auf .de umleiten (eine kanonische Adresse)
family-projekt.com, www.family-projekt.com {
    redir https://family-projekt.de{uri} permanent
}
```

> Willst du `.de` und `.com` **beide** gleichwertig ausliefern statt umzuleiten,
> nimm denselben `root … file_server`-Block für beide Domänen. Empfehlung: eine
> kanonische Adresse (besser für Suchmaschinen) → umleiten.

### Warum die `/server/`-Sperre nötig ist (nicht weglassen)

Diese Caddy führt **kein PHP aus** — es gibt keinen `php_fastcgi`-Block. Der
`file_server` liefert eine `.php`-Datei deshalb **als Klartext** aus, statt sie
auszuführen. `/srv/family-project` ist ein `git clone` des Repos, also liegen
dort `server/freigabe.php`, `server/einreichung.php`, `server/marktplatz-api.php`
und `server/freigabe-config.example.php` — ihr Quelltext wäre ohne die Sperre
öffentlich lesbar. Legt jemand dort zusätzlich die **echte**
`server/freigabe-config.php` an, stünde der **GitHub-Token im Klartext** im Netz.

`server/.htaccess` schützt hier **nicht**: `.htaccess` ist eine Apache-Datei und
wird von Caddy ignoriert. Sie bleibt im Repo, weil die PHP-Endpunkte auf dem
separaten **Hetzner-Webhosting (Apache)** laufen — dort greift sie. Auf der
Caddy-Maschine ist der `handle /server/*`-Block der Schutz.

Bis zur Sperre war der Token nur deshalb nicht sichtbar, weil die echte
`freigabe-config.php` auf dem Server gar nicht existiert (sie steht in
`.gitignore` und kommt durch keinen `git pull` mit) — der `try_files`-Auffang
lieferte stattdessen die Startseite aus. Das ist Zufall, kein Schutz.

---

## 3. Caddy neu laden + prüfen

```bash
# Docker:
docker exec -w /etc/caddy <caddy-container> caddy reload
# nativ:
sudo systemctl reload caddy
```

Prüfen:

```bash
curl -I https://family-projekt.de            # 200 + text/html
curl -I https://family-projekt.de/assets/app.js   # 200 + text/javascript
```

**Sperre nachweisen** (muss jeweils `404` liefern — nicht `200`):

```bash
curl -I https://family-projekt.de/server/freigabe-config.php
curl -I https://family-projekt.de/server/freigabe-config.example.php
curl -I https://family-projekt.de/server/freigabe.php
```

Im Browser sind dieselben drei Adressen der Test ohne Terminal: es darf **weder**
PHP-Quelltext **noch** die Startseite erscheinen, sondern nur eine leere
404-Seite.

Dann im Chrome `https://family-projekt.de` öffnen — Startseite, three.js-
Hintergrund, Themen, Suche, drei Räume.

---

## 4. Vor dem öffentlichen Launch (Checkliste)

- [ ] **Dev-Briefkasten AUS:** Default ist aus. Sicherstellen, dass niemand
      `?dev`/`fp_dev=1` gesetzt lässt (das ist pro Browser, nicht serverseitig —
      betrifft nur das eigene Test-Gerät). Der Dev-Knopf erscheint NUR bei
      gesetztem Schalter (Brief §6b).
- [ ] **Impressum** (`impressum.html`) mit echten Angaben füllen (Platzhalter
      ersetzen). Kein Platzhalter darf öffentlich stehen bleiben.
- [ ] **Eigene Spore** erzeugt + committet (`sbkim/spore.json`) — über den
      Dev-Briefkasten „Eigene Spore erzeugen" oder `__fpErzeugeSpore()` in der
      Konsole, dann JSON nach `sbkim/spore.json` committen.
- [ ] **Tagesbild/Weekly/Listings** nach Wunsch vorbefüllt
      (`assets/config/*.js`).
- [ ] **Hard-Reload** nach dem letzten Pull.

---

## 4b. Hetzner-Webhosting (Mail + PHP-Endpunkt für die Marktplatz-Einreichung)

Neben dem Caddy-Server gibt es das **Hetzner-Webhosting S** (konsoleH, Konto
„Family Projekt"). Die Domain `family-projekt.de` ist dort als **„Ext"** (extern
gehostet) eingetragen — der **Web-Teil läuft auf dem Caddy-Server**, das
**Webhosting stellt Postfach + Webspace + PHP** bereit. Merkdaten für jede Sitzung:

- **konsoleH:** `https://konsoleh.hetzner.com` (Konto Webhosting S).
- **WebFTP (Datei-Manager im Browser):** `https://webftp.your-server.de/index.php#/`
  (Login mit dem FTP-Zugang des Webhostings; in konsoleH unter
  Domain → Einstellungen → WebFTP).
- **Hosting-Server:** `www746.your-server.de` · **Webspace-Adresse (vhost, mit
  eigenem SSL):** `cjlb.your-vhost.de` · **Web-Wurzel:** `public_html`.
- **Verfügbar:** PHP-Konfiguration, Cronjob Manager, WebFTP, MariaDB/MySQL (1 DB) —
  d. h. der EU-eigene Einreich-/Kontakt-Dienst braucht keinen Dritt-Anbieter.
- **Postfach `info@family-projekt.de`:** DKIM/SPF/DMARC gesetzt (DNS bei INWX).
  In konsoleH ist bei info@ eine **Kopie an Klaus' zwei private Adressen**
  (Gmail + T-Online) hinterlegt → doppelte Zustellung als Redundanz, das Original
  bleibt im Postfach (Adressen bewusst NICHT hier im Repo — nur in konsoleH).

**Einreich-/Kontakt-Endpunkt:** Das Skript `server/einreichung.php` (dieses Repo,
kopierbare Vorlage) wird per WebFTP nach `public_html/formular/` geladen →
erreichbar unter `https://cjlb.your-vhost.de/formular/einreichung.php`. Diese URL
kommt in `assets/config/listings.js` → `FP_MARKT_SUBMIT_ENDPOINT` (einziger
Schaltpunkt, leer = fail-soft). Voll-Anleitung: `server/README.md`.

## 5. Spätere, eigene Sitzungen (nicht Teil dieses Bau-Schritts)

- Auto-Handshake übers Relay (heute „in Vorbereitung").
- Einreich-Dienst + Freigabe-Workflow (kleiner Hintergrund-Dienst).
- Bezahlung / PayPal-Spende, Jahresbeitrag.
- Verstecktes Admin-Panel (Konfig ohne Datei-Editieren).
