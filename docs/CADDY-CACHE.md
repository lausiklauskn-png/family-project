# Cache-Kopfzeilen am Server einschalten — Anleitung für Klaus

**Stand 2026-08-02: noch NICHT eingespielt.** Diese Seite sagt, was zu tun ist
und wie man nachweist, dass es gewirkt hat.

---

## Worum es geht

In Klaus' PageSpeed-Bericht vom 2026-08-02 steht in der Spalte „Cache-TTL" bei
**jeder einzelnen Datei** das Wort **„None"**. Caddy sagt dem Browser also nicht,
wie lange er etwas behalten darf. Folge: Wer die Seite ein zweites Mal öffnet,
lädt **alle 2.984 KiB noch einmal** — obwohl sich nichts geändert hat.

**Ehrlich dazugesagt:** Diese Prüfung ist bei Google als **„Nicht bewertet"**
markiert. Sie bringt also **keine Punkte**. Sie hilft echten Wiederbesuchern,
und sie spart Datenvolumen auf dem Handy. Das ist der ganze Gewinn — aber der
ist echt.

---

## Wo das hingehört

**Auf den Hetzner-Cloud-Server** (Prompt `root@ubuntu-…:~#`, Paketbefehl `apt`),
**nicht** ins Repo und **nicht** auf das Tablet. Eine Sitzung kann das nicht
selbst tun; sie hat keinen Server-Zugang.

Der Caddy läuft dort im Docker mit gemountetem `Caddyfile` unter `/opt/relay/`.

---

## Schritt 1 — nachsehen, wie es JETZT ist (die Gegenprobe)

Erst den Ist-Zustand festhalten, sonst weiß hinterher niemand, ob sich etwas
geändert hat:

```bash
curl -sI https://family-projekt.de/assets/style.css?v=86 | grep -i "cache-control" || echo "KEIN Cache-Header — genau der Befund"
```

Erwartet: die Meldung „KEIN Cache-Header". Genau das wird jetzt behoben.

---

## Schritt 2 — die Regeln einfügen

Ein Befehl, auf dem **Hetzner-Cloud-Server**. Er legt vorher eine Sicherung an,
tut nichts doppelt, prüft die Datei auf Fehler und lädt erst dann neu:

```bash
cd /opt/relay && cp Caddyfile Caddyfile.sicherung-$(date +%F) && python3 - <<'PY'
p="/opt/relay/Caddyfile"
s=open(p,encoding="utf-8").read()
if "@bilder path" in s:
    print("Schon vorhanden — nichts geändert.")
else:
    anker='\t@config path /assets/config/*'
    if anker not in s:
        anker='@config path /assets/config/*'
    if anker not in s:
        print("FEHLER: Anker @config nicht gefunden. Bitte melden, nichts geändert."); raise SystemExit(1)
    neu = ('\t@bilder path /assets/appicons/* /assets/tagesbilder/* /assets/*.svg /icon-*.png /og-image.png\n'
           '\theader @bilder Cache-Control "public, max-age=2592000"\n\n'
           '\t@code path /sbkim/* /vendor/* /assets/style.css /assets/app.js /assets/status-widget.js /assets/mycel-bg.js /assets/tool-landing.js /assets/vec-codec.js /assets/studio-markt.js\n'
           '\theader @code Cache-Control "public, max-age=86400"\n\n'
           '\t@seiten path *.html /\n'
           '\theader @seiten Cache-Control "public, max-age=0, must-revalidate"\n\n'
           + anker)
    open(p,"w",encoding="utf-8").write(s.replace(anker, neu, 1))
    print("Eingefügt.")
PY
docker exec -w /etc/caddy caddy caddy validate --config /etc/caddy/Caddyfile && docker exec -w /etc/caddy caddy caddy reload --config /etc/caddy/Caddyfile && echo "CADDY NEU GELADEN"
```

Heißt der Container nicht `caddy`, vorher `docker ps` und den richtigen Namen
einsetzen.

---

## Schritt 3 — nachweisen, dass es gewirkt hat

**Ohne diesen Schritt ist nichts belegt.** Erwartet werden drei verschiedene
Werte — genau daran erkennt man, dass die Regeln wirklich greifen und nicht
alle Dateien in denselben Topf fallen:

```bash
echo "Bild  (erwartet 2592000):" && curl -sI https://family-projekt.de/assets/appicons/point.webp | grep -i cache-control
echo "Code  (erwartet 86400):"   && curl -sI https://family-projekt.de/assets/style.css?v=86  | grep -i cache-control
echo "Seite (erwartet 0):"       && curl -sI https://family-projekt.de/                        | grep -i cache-control
echo "Konfig (erwartet 300):"    && curl -sI https://family-projekt.de/assets/config/listings.js | grep -i cache-control
```

Kommt bei einer Zeile **gar nichts** zurück, hat die Regel nicht gegriffen —
dann bitte melden und **nicht** raten.

---

## Warum drei verschiedene Zeiten und nicht überall dreißig Tage

| Was | Wie lange | Warum |
|---|---|---|
| Bilder, Symbole | 30 Tage | ändern sich praktisch nie |
| Code (`sbkim/`, `vendor/`, CSS, JS) | **1 Tag** | Die Dateien unter `sbkim/` und `vendor/` tragen **keine** Versionsnummer in der Adresse. Bei 30 Tagen käme eine Änderung dort einen Monat lang nicht an. |
| HTML-Seiten | 0, aber nachfragen | Sonst sieht ein Wiederbesucher nach einem Deploy die alte Seite. |
| `assets/config/*` | 5 Minuten | Bleibt wie gehabt — das Marktplatz-Studio schreibt diese Dateien zwischen zwei Deploys neu (Befund 2026-08-01). |

Die `?v=NN`-Versionierung in den HTML-Adressen bleibt davon **unberührt** und
wird weiter gebraucht: Sie ist der Weg, wie eine geänderte `style.css` sofort
ankommt statt erst am nächsten Tag.

---

## Wenn etwas schiefgeht

Die Sicherung von Schritt 2 zurückspielen und neu laden:

```bash
cd /opt/relay && cp Caddyfile.sicherung-$(date +%F) Caddyfile && docker exec -w /etc/caddy caddy caddy reload --config /etc/caddy/Caddyfile
```
