# Internes Relais einrichten — `wss://relay-intern.family-projekt.de`

Für das **eigene Netz** der Apps (Modul 23, Einstellung „Netz“). Ein zweiter Container
neben dem öffentlichen Relais, mit derselben Software, eigener Konfig, eigener Datenbank
und eigener Adresse.

**Keine Liste erlaubter Schlüssel.** Klaus (2026-10-13): *„Es soll jederzeit möglich
sein, ein neues Tool hinzuzufügen.“* Ein neues Werkzeug tritt per Netz-Link bei. Die
Flut-Grenzen sind dieselben wie beim öffentlichen Relais.
⚠ **Grenze:** Wer die Adresse kennt, kann auf das Relais schreiben. Geschützt wird der
Inhalt durch den Netz-Code, nicht durch das Relais.

## Schritt 1 · DNS — im Browser bei **INWX**

Unter *Nameserver → family-projekt.de* einen neuen Eintrag anlegen:

| Typ | Name | Inhalt | TTL |
|---|---|---|---|
| A | `relay-intern` | `167.233.204.72` | 3600 |

Ob er schon antwortet, prüfst du auf dem **Hetzner Cloud-Server**:
`getent hosts relay-intern.family-projekt.de` muss `167.233.204.72` zeigen.

## Schritt 2 · Depot holen — auf dem **Hetzner Cloud-Server** (`root@ubuntu…`)

```bash
git -C /srv/family-project pull
```

## Schritt 3 · Einrichten — auf dem **Hetzner Cloud-Server**

```bash
bash /srv/family-project/server/relais-intern/einrichten.sh
```

Das Skript macht Folgendes:
- Es liest die Software des öffentlichen Relais ab.
- Es legt `/opt/relay-intern/config.toml` und `/opt/relay-intern/db` an. Eine vorhandene Konfig überschreibt es **nie**.
- Es trägt den Dienst `relay-intern` in `/opt/relay/docker-compose.yml` ein und startet ihn.
- Es hängt den Caddy-Block an (mit `>>`), prüft ihn und lädt Caddy dann neu.
- Vorher legt es Sicherungen an. Lehnt Caddy ab, kommt die alte Fassung zurück und es wird nichts neu geladen.

Es ist wiederholbar: Ein zweiter Lauf trägt nichts doppelt ein.

## Schritt 4 · Prüfen — auf dem **Hetzner Cloud-Server**

```bash
curl -s -H 'Accept: application/nostr+json' https://relay-intern.family-projekt.de/
```

Die Antwort muss mit `{"name":"intern Family Project"` beginnen. Beim ersten Abruf holt
Caddy das Zertifikat, das kann einige Sekunden dauern.

## Proben (im Depot, ohne Server)

```bash
node tests/smoke_relais_intern.mjs        # gestelltes docker, Wegwerf-/opt/relay
node tests/gegenprobe_relais_intern.mjs   # 9 Fälle; NUR_ANKER=1 nur die Anker
```

⚠ **Nicht gemessen:**
- der echte Server
- der echte Container (ob die Software diese Konfig annimmt)
- ob das Datenbank-Verzeichnis die richtigen Rechte hat (das Skript liest den Nutzer aus dem Bild ab)
- Caddy und das Zertifikat

Das sagt erst Schritt 4.
