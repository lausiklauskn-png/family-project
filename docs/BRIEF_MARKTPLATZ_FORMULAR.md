# BRIEF — Marktplatz-Einreichung fertig bauen (family-project) + Kontaktformular

**Für die nächste Sitzung.** Ziel: das Marktplatz-Einreich-Formular so **fertig vorbereiten**,
dass Klaus es mit **wenigen Klicks** scharfschalten/deployen kann — sobald der Mail-Test grün
ist. Zusätzlich ein **vorausgefülltes Kontaktformular** als zweites, kleineres Stück.

## Stand nach der Sitzung 2026-07-21 (was schon da ist)

- **EU-eigene Mail-Infrastruktur steht** (Hetzner Webhosting S + INWX-DNS):
  - Postfach **info@family-projekt.de** (konsoleH), MX → `www746.your-server.de` (leerer Name, korrekt).
  - **DKIM** (`default2607._domainkey`), **SPF** (`v=spf1 a mx ~all`), **DMARC** (`_dmarc`, `p=none`) — alle als TXT bei INWX gesetzt.
  - **Offen:** Klaus' Browser-Test (~1 h nach DNS): Gmail→info@ kommt an? info@→Gmail kommt an? (t-online blockt evtl. weiter — Reputation.)
- **markt.html** (family-project, schon gemergt PR #92/#93): Einreich-Formular ruft
  `POST` an `window.FP_MARKT_SUBMIT_ENDPOINT` (Config in `assets/config/listings.js`, aktuell
  leer → fail-soft Kopier-Block). Kontakt-Feld des Einreichers ist drin. „100 frei"-Zähler ist raus.
- **Private E-Mail netzweit ersetzt:** `klaus-nitzsche@t-online.de` → `info@family-projekt.de`
  in allen Repos (Impressum/Datenschutz/COPYRIGHT/LICENSE/USP/Seiten).

## Wichtige NEUE Erkenntnis für die Formular-Abwicklung

Das Hetzner **Webhosting S** (auf dem das Postfach läuft, Server `www746.your-server.de`) bringt
**PHP + Datenbank + Cronjobs** mit. **Damit gibt es jetzt einen sauberen, EU-eigenen Weg OHNE
Dritt-Dienst und OHNE Backend auf dem Cloud-Server:**

> Ein **kleines PHP-Skript auf dem Hetzner-Webhosting** nimmt den Formular-`POST` entgegen,
> **schreibt jede Einreichung in eine Warteschlange-Datei** (JSON/JSONL) **und/oder mailt sie
> an info@family-projekt.de** (lokal, dieselbe Maschine → zuverlässig, kein Reputations-Problem).
> Klaus prüft + gibt frei auf einer **passwortgeschützten Freigabe-Seite** (ebenfalls auf dem
> Webhosting, .htpasswd-geschützt), die „Freigeben" den Eintrag in `assets/config/listings.js`
> schreibt (via GitHub-Token, der NUR auf dem Server liegt — nie öffentlich).

Das ist die **empfohlene Architektur** (Klaus wollte „von Anfang an unabhängig", EU-eigen). Der
frühere „nur Caddy statisch"-Blocker ist damit weg — das Webhosting kann PHP.

**Alternativen** (falls PHP-Weg zu groß): (a) Form.taxi (DE, EU) als reiner Intake → Mail an
info@; (b) Formspree (US, DSGVO-Hinweis nötig). Beide brauchen nur den Endpoint in
`FP_MARKT_SUBMIT_ENDPOINT`.

## Aufgabe der nächsten Sitzung

1. **Formular-Handler bauen (PHP, auf dem Webhosting)** — fertig vorbereitet als kopierbare
   Datei(en), sodass Klaus sie per konsoleH-WebFTP hochlädt und in `FP_MARKT_SUBMIT_ENDPOINT`
   die URL einträgt = **wenige Klicks**:
   - `einreichung.php`: nimmt `POST` (Felder: app, kuerzel, url, bild, kategorie, beschreibung,
     kontakt), **Spam-Schutz** (Honigtopf-Feld, simple Rate-Begrenzung, Herkunfts-/Origin-Check,
     Feld-/Längen-Validierung), schreibt nach `warteschlange.jsonl` (außerhalb des Web-Roots)
     **und** mailt an info@family-projekt.de (`mail()` lokal). Antwort: JSON `{ok:true}`.
   - Klaus-Schritte dokumentieren (WebFTP-Upload-Pfad, `FP_MARKT_SUBMIT_ENDPOINT` setzen, testen).
2. **Freigabe-Seite** (`freigabe.php`, .htpasswd-geschützt): listet die Warteschlange, „Freigeben"
   (schreibt Eintrag in `listings.js` via server-seitigen GitHub-Token) / „Ablehnen mit Grund"
   (vorausgefüllte Antwort-Mail an Einreicher). Token liegt in einer Konfig-Datei außerhalb des
   Web-Roots, NIE im Repo. *(Kann Stufe 2 bleiben, wenn Zeit knapp — dann erst Intake+Queue.)*
3. **Vorausgefülltes Kontaktformular (zweites Stück):** In `markt.html` gibt es schon den
   `mailto:info@family-projekt.de?subject=…`-Knopf „✉ Unverbindlich anfragen". Ausbauen zu einem
   echten, **vorausgefüllten Kontaktformular** (Name/Betreff/Nachricht → derselbe PHP-Handler,
   Zweck-Feld „Kontakt" statt „Eintrag"), oder als sauberer `mailto:`-Vordruck, wenn Klaus es
   minimal will. Klaus-Entscheid einholen (Formular vs. mailto).
4. **Datenschutz nachziehen:** Sobald das Formular Kontakt-Daten verarbeitet, den kurzen
   Datenschutz-Absatz in `family-project/impressum.html` ergänzen (welche Daten, Zweck Freigabe/
   Rückmeldung, EU-Verarbeitung auf eigenem Hetzner, Aufbewahrung). Punkt „keine Daten gespeichert"
   entsprechend anpassen.

## Datenverträge / TABU
- `FP_MARKT_SUBMIT_ENDPOINT` in `assets/config/listings.js` ist der einzige Schaltpunkt (fail-soft
  bleibt: leer → Kopier-Block).
- `sw.js` bei Shell-Änderungen `CACHE_VERSION` erhöhen (aktuell `family-projekt-v55`).
- GitHub-Token für die Freigabe-Seite **nur auf dem Server**, nie im Repo, nie im Chat.
- Kein Dritt-Dienst nötig (EU-eigen), Spam-Schutz Pflicht (öffentlicher Endpoint).

## Pflichtlektüre nächste Sitzung
`family-project/CLAUDE.md` + `README.md` · dieser Brief · `docs/PULS.md` (oberster Stand) ·
`markt.html` (Einreich-Formular + `FP_MARKT_SUBMIT_ENDPOINT`-Nutzung) · `assets/config/listings.js`.

## Akzeptanzkriterien
- Klaus kann mit wenigen Klicks: PHP-Datei(en) hochladen (WebFTP) + `FP_MARKT_SUBMIT_ENDPOINT`
  setzen → eine Test-Einreichung landet in der Warteschlange und/oder als Mail bei info@.
- Nichts wird automatisch veröffentlicht; Freigabe bleibt Klaus' Entscheidung.
- Datenschutz-Absatz ergänzt. Kein Token/PII im Repo.
