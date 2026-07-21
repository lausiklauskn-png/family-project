# Server-Teil (Hetzner-Webhosting) — Einreichung + Freigabe

EU-eigener Weg **ohne Dritt-Dienst**: ein kleines PHP nimmt den Formular-POST vom
Marktplatz entgegen, schützt gegen Spam, legt den Eintrag in eine Warteschlange
und mailt ihn **lokal** an `info@family-projekt.de` (gleiche Maschine wie das
Postfach → kein Reputations-Problem). Nichts wird automatisch veröffentlicht.

Diese Dateien gehören **aufs Hetzner-Webhosting** (per WebFTP), **nicht** auf den
Caddy-Server, der die Website ausliefert. Sie sind hier im Repo nur als kopierbare
Vorlage abgelegt.

```
server/
  einreichung.php               ← Stufe 1: nimmt den POST an (Pflicht)
  .htaccess                     ← schützt Warteschlange/Rate-Datei/Config
  freigabe.php                  ← Stufe 2: Freigabe-Konsole (optional)
  freigabe-config.example.php   ← Vorlage für den GitHub-Token (Server-only)
```

---

## Stufe 1 — Einreichung scharfschalten (wenige Klicks)

1. **`einreichung.php` + `.htaccess` per WebFTP hochladen**, z. B. nach
   `httpdocs/formular/`. (Beide Dateien in **denselben** Ordner.)
2. In `einreichung.php` oben die **CONFIG** prüfen — v. a. `mail_from` (eine
   Adresse auf dieser Domain) und `ip_salt` (irgendeinen eigenen Wert eintragen).
3. Die **volle URL** des Skripts in
   `family-project/assets/config/listings.js` eintragen:
   ```js
   window.FP_MARKT_SUBMIT_ENDPOINT = "https://DEIN-WEBHOSTING/formular/einreichung.php";
   ```
   Das ist der **einzige Schaltpunkt**. Solange leer, bleibt das Formular
   fail-soft (zeigt den kopierbaren Block, kein Fehler).
4. Auf `markt.html` testen: Formular absenden → es sollte eine Mail an `info@`
   ankommen und eine Zeile in `warteschlange.jsonl` stehen.

**Spam-Schutz** ist eingebaut und Pflicht: Honigtopf-Feld · Mindest-Ausfüllzeit ·
Rate-Limit pro IP (6/Stunde) · Herkunfts-Prüfung (CORS-Allowlist) · Feld-Validierung.

---

## Stufe 2 — Freigabe-Konsole (optional, später möglich)

`freigabe.php` listet die Warteschlange und schaltet einen Eintrag mit **einem
Klick** live (Commit in `listings.js` über einen GitHub-Token, der **nur auf dem
Server** liegt). „Ablehnen" öffnet eine vorausgefüllte Antwort-Mail.

1. `freigabe-config.example.php` → nach **`freigabe-config.php`** kopieren und
   ausfüllen (Fine-grained GitHub-Token, nur Repo `family-project`, Recht
   *Contents: Read and write*). **Diese Datei nie ins Repo!**
2. `freigabe.php` + `freigabe-config.php` in denselben Ordner hochladen.
3. **Basic Auth** über eine eigene `.htaccess`-Ergänzung (nur für `freigabe.php`):
   ```apache
   <Files "freigabe.php">
     AuthType Basic
     AuthName "Freigabe"
     AuthUserFile /pfad/zu/deinem/.htpasswd
     Require valid-user
   </Files>
   ```
   `.htpasswd` erzeugen (im WebFTP/SSH oder über ein htpasswd-Generator-Tool):
   `htpasswd -c /pfad/zu/.htpasswd klaus`
4. In `listings.js` muss die Zeile `// FP_LISTINGS_INSERT_HERE` stehen — die
   Einfüge-Marke. Sie ist im Repo bereits vorhanden.

> Die App-Prüfung (Link öffnen, ist es seriös?) bleibt Klaus' manueller Schritt —
> es gibt keine „virenfrei"-Garantie für fremde Apps.

---

## Datenschutz

`warteschlange.jsonl` enthält die Formular-Angaben (App/Link/Bild/Beschreibung
bzw. Kontakt-Nachricht) **plus die Kontakt-E-Mail des Einsenders** und einen
**gekürzten IP-Hash** (kein Klar-IP) gegen Missbrauch. Verarbeitung auf Klaus'
eigenem Hetzner-Server in Deutschland. Siehe `impressum.html` Abschnitt „Marktplatz-
Einreichung & Kontakt".
