# Brief für die nächste Sitzung — family-project (Stand 2026-07-31)

Klaus, dieser Brief ist der vollständige Übergabestand. Alles Offene steht drin,
Schritt für Schritt, mit dem Grund dahinter.

---

## 0. Zuerst lesen, bevor irgendetwas angefasst wird

1. `CLAUDE.md` in `Sage-Protokol` — § Sitzungsstart-Pflicht (immer frisch von `origin/main`)
2. Diesen Brief
3. `assets/vec-codec.js` — der Kopf erklärt die Katalog-Spore in einer Bildschirmseite
4. `tests/smoke_markt_vecpack.mjs` — der Kopf enthält drei Fallen, die schon Zeit gekostet haben

**Vor jeder Arbeit an einem Repo:**

```bash
git -C <repo> fetch origin --quiet
git -C <repo> checkout -B <branch> origin/main
```

Der Grund steht in Sages `CLAUDE.md`: die Klone im Container können Monate alt sein.
In diesem Repo kommt eine zweite Falle dazu, die in dieser Sitzung **zweimal**
zugeschlagen hat: nach einem Squash-Merge zeigt `git log origin/main..branch` noch
Commits an, obwohl der Inhalt längst in `main` ist. Immer zusätzlich
`git diff origin/main origin/<branch> --stat` prüfen. Ist der leer, ist ein
`push --force-with-lease` gefahrlos.

---

## 1. Was in dieser Sitzung fertig wurde

| PR | Inhalt |
|---|---|
| #136 | Melde-Knopf + Haftung für fremde Links im Impressum (Katalog-Spore **Stufe 4**) |
| #137 | Melde-Knopf repariert: Cache-Bump, natives `<dialog>`, dreieckiger Knopf |
| #138 | Service-Worker holt Dateien am HTTP-Cache vorbei, CSS/JS network-first |
| #139 | Cache-Bust über die Adresse (`?v=NN` an allen CSS/JS-Verweisen) |
| #140 | Vektor-Codec `assets/vec-codec.js` (8.025 → 546 Bytes je Vektor) |
| #141 | Marktplatz nutzt vorberechnete Vektoren — **Leseseite** (Katalog-Spore Stufe 1) |
| #142 | Melde-Dreieck auf 44 px, gleiche Höhe wie der Öffnen-Knopf daneben |

Cache-Version steht auf **v70**.

### Die eine Lehre, die viel Zeit gekostet hat

Der Cache hat **drei** Ebenen, und sie greifen in dieser Reihenfolge:

1. **Caddy** liefert CSS/JS mit `max-age=604800` aus — **sieben Tage** Browser-Cache
   (`Caddyfile.example:55`). HTML dagegen mit 300 Sekunden.
2. Der **HTTP-Cache des Browsers** sitzt **vor** dem Service-Worker.
3. Der **Service-Worker-Speicher**.

Daraus folgt: Ein Sprung der `CACHE_VERSION` allein hilft **nicht**. Nach einem
Deploy kam die neue `markt.html` an, die alte `style.css` aber nicht, und der neue
Knopf blieb eckig. Nur eine **geänderte Adresse** (`?v=NN`) kommt gegen den
Sieben-Tage-Cache an. Zusätzlich muss der Service-Worker seine Dateien mit
`new Request(u, {cache:"reload"})` holen, sonst legt er selbst alte Dateien in den
frischen Speicher.

`tests/smoke_cache_version.mjs` wacht jetzt darüber: Es verlangt einen Versions-Sprung,
sobald eine CORE-Datei angefasst wurde, und prüft, dass alle 22 HTML-Verweise dasselbe
`?v=` tragen. **Wer `assets/style.css`, `assets/app.js`, `sw.js` oder eine der Seiten
ändert, muss `CACHE_VERSION` und `ASSET_V` in `sw.js` erhöhen und alle `?v=`-Verweise
mitziehen.** Der Test sagt es, wenn man es vergisst.

---

## 2. Der Schritt, den nur Klaus tun kann — bitte zuerst

**`server/einreichung.php` per WebFTP hochladen.**

- Ziel: **Hetzner Webhosting S** (konsoleH, Apache) — dort läuft PHP.
- **Nicht** auf den Hetzner Cloud-Server (Caddy im Docker, liefert nur statisch aus).
- **Nicht** aufs Tablet.

Ohne diesen Schritt bleibt beim Absenden einer Meldung „Das Senden hat gerade nicht
geklappt" stehen, weil der Server den Zweck `meldung` noch nicht kennt. Der Hinweis
steht als auffälliger Block in `server/README.md`. Bis dahin geht nichts verloren:
Der Marktplatz nennt daneben `info@family-projekt.de`.

---

## 3. Katalog-Spore — der Fahrplan, Stufe für Stufe

Der Gedanke dahinter: Wer seine App im Marktplatz einträgt, muss **gefunden werden**.
Bei 100 Apps kann niemand 100 Tabs offen halten, damit ein Handshake zustande kommt.
Die Katalog-Spore ist die Antwort, ohne die Verfassung zu brechen — der Marktplatz ist
**Pilz-Schicht** (Schicht 2), er darf Server benutzen und auf Nutzer-Aktion nach außen
gehen. Die **Mycel-Schicht** (Schicht 1, der Knoten selbst) bleibt unangetastet:
Empfangsmodus, keine Pulsation, kein Crawler.

### Stufe 0 — Relais-Messung *(nur Klaus, läuft im Browser)*

Über die Mycel-Karte messen, **wie lange eine Karte im Relais liegen bleibt**. Das
Ergebnis legt das Lesefenster in Stufe 6 fest. Heute liest Modul 23 mit
`since: now - 1800` (30 Minuten). Ob das zu kurz oder zu lang ist, weiß niemand —
es ist geraten, nicht gemessen. Blockiert nichts, sollte aber vor Stufe 6 vorliegen.

### Stufe 1 — vorberechnete Vektoren

**Leseseite: fertig und gemergt (#141).** `markt.html` liest
`assets/config/listings-vec.json`, wenn es da ist. Rückfall in Stufen, schlimmster Fall
ist genau das heutige Verhalten:

| Lage | Was passiert |
|---|---|
| Datei fehlt (404) | alles live, wie bisher |
| Modell-Kennung passt nicht | Paket komplett verworfen, alles live |
| einzelner Eintrag fehlt | nur dieser eine live |
| Text seit dem Vorberechnen geändert (Hash) | nur dieser eine live |

**Schreibseite: offen. Das ist der nächste Schritt.**

Zu bauen sind zwei Dinge:

**(a) Knopf „Vektoren bauen" im Studio** (`assets/studio-markt.js`; das Studio öffnet
sich über 1,5 Sekunden Langdruck auf das Copyright in der Fußzeile von `markt.html`).
Der Knopf soll:

1. Für jeden Eintrag aus `FP_LISTINGS` den Text nehmen (`x.text || x.label`) — **exakt
   dieselbe Regel wie die Leseseite**, sonst passen die Hashes nicht.
2. `SbkimEmbedding.embedPassageBatch(texte)` aufrufen.
3. Jeden Vektor mit `FPVecCodec.encode(v)` packen und `p.h = FPVecCodec.textHash(text)`
   dazuschreiben.
4. Das Paket zusammenbauen:
   ```json
   { "version": 1, "model": "<aus SbkimEmbedding._meta.model>",
     "dim": 384, "quant": "int8-sym-b64",
     "vectors": { "<anchorId>": { "s": 0.0123, "v": "base64…", "h": "1a2b3c4d" } } }
   ```
   **`model` und `dim` aus `SbkimEmbedding._meta` auslesen, nicht hartcodieren.** Der
   Feldname ist `_meta`, **nicht** `info()` — das war in dieser Sitzung schon ein
   Fehler, der die Prüfung still wirkungslos gemacht hätte.
5. Per `action: "commit_vectors"` an `server/marktplatz-api.php` schicken.
6. Fortschritt anzeigen (das Einbetten von 100 Einträgen dauert), und **niemals** ein
   halbes Paket committen, wenn zwischendrin etwas schiefgeht.

**(b) `commit_vectors` in `server/marktplatz-api.php`.** Nahe Kopie von
`commit_listings` (Zeile 137). Unterschiede:

- Ziel ist `assets/config/listings-vec.json`, nicht die Listings-Datei.
- Der Schutz vor einer kaputten Datei muss anders aussehen: `commit_listings` prüft auf
  `window.FP_LISTINGS`. Hier gehört geprüft, dass der Inhalt **gültiges JSON** ist und
  ein nicht-leeres `vectors`-Objekt enthält. Ein leeres Paket darf nie geschrieben werden.
- `require_key($STUDIO_KEY, $B)` wie überall.
- Commit-Nachricht: `Studio: Marktplatz-Vektoren aktualisiert`.

**Ein Test dafür schreiben**, der wirklich etwas fängt. `tests/smoke_studio_markt.mjs`
ist die Vorlage (Struktur-Smoke auf `assets/studio-markt.js`).

**Danach in `markt.html` messen**, wie viel es bringt, und die Zahl ehrlich notieren —
nicht „fühlt sich schneller an".

### Stufe 2 — `sporeUrl` + tägliche Aktualisierung

Jeder Eintrag bekommt ein Feld `sporeUrl`, das auf die `sbkim/spore.json` im **eigenen
Repo des Anbieters** zeigt (`raw.githubusercontent.com/<owner>/<repo>/main/sbkim/spore.json`).

Das ist Klaus' Antwort auf „ein eigenes Konto wäre dafür doof, aber über sein eigenes
Repo eventuell": Der Anbieter behält seine Spore bei sich, kann sie jederzeit
herunterladen und ändern, und der Marktplatz **liest** sie nur.

Eine **GitHub-Action, einmal täglich**, holt alle hinterlegten Sporen, baut daraus die
Vektoren (derselbe Codec) und schreibt `listings-vec.json` fort. Damit ist der Katalog
immer aktuell, ohne dass jemand einen Knopf drückt.

Wichtig für die Ehrlichkeit: Das ist **Pilz-Schicht**. Der Marktplatz fragt einmal am
Tag öffentliche Dateien ab. Das ist kein Crawler im Mycel und keine Pulsation — es ist
ein benannter, sichtbarer Server-Dienst. Auf der Netzwerk-Seite gehört das so gesagt.

### Stufe 3 — Wächter *(sicherheitsrelevant, sorgfältig bauen)*

Klaus' Frage war klar: „Wenn jemand seinen Code ändert und Schlimmes drauflegt oder auf
einen Virus verlinkt — kannst du das täglich prüfen? Das muss man ja vollkommen
ausschließen können."

Die ehrliche Antwort zuerst: **vollständig ausschließen kann man es nicht.** Was geht,
ist täglich prüfen, abstufen und im Zweifel sperren. Der Wächter läuft als tägliche
Aktion und stuft dreifach ab:

| Stufe | Auslöser | Folge |
|---|---|---|
| **grün** | nichts auffällig | Eintrag normal sichtbar |
| **gelb** | Ziel-Seite geändert, Prüfung ausstehend | Eintrag sichtbar mit Hinweis |
| **rot** | Google Safe Browsing meldet die URL, Seite nicht erreichbar, oder Klaus sperrt von Hand | Eintrag **auf Eis**, nicht mehr sichtbar |

Bausteine:

- **Google Safe Browsing API** gegen die eingetragene URL (kostenlos, Schlüssel nötig).
- **Prüfsumme der Zielseite**: ändert sie sich, geht der Eintrag auf **gelb**, bis
  jemand hinschaut. `action: "fetch"` in `marktplatz-api.php` (Zeile 157) kann den
  Quelltext schon holen — das war für genau so eine Prüfung gedacht.
- **Handschalter** für Klaus: `setstatus` kennt bereits `verdacht` und `abgelehnt`.
- Der **Melde-Knopf** (Stufe 4, fertig) ist der menschliche Kanal in dasselbe System.

**Wichtig:** Ein Eintrag darf nie stillschweigend verschwinden. Wer gesperrt wird, muss
es erfahren, und der Grund muss nachlesbar sein.

### Stufe 4 — Melde-Knopf ✅ fertig (#136, #137, #142)

Fehlt nur noch der WebFTP-Schritt aus Abschnitt 2.

### Stufe 5 — Bewertung: Lighthouse + Ja/Nein-Stimmen

Klaus' Vorgabe: Nur Apps, die **nützlich, technisch gut, nutzerfreundlich und optisch
gut bis hervorragend** sind, bleiben auf Dauer. Dazu zwei getrennte Quellen, die nicht
vermischt werden dürfen:

1. **Maschinell messbar — Google Lighthouse.** Läuft in der täglichen Aktion gegen jede
   eingetragene URL und liefert vier harte Zahlen: Leistung, Bedienbarkeit
   (Accessibility), gute Praxis, Auffindbarkeit. Das ist **kein Geschmacksurteil**,
   sondern eine Messung, und genau deshalb taugt es nach außen: „diese App erreicht 94
   von 100" ist überprüfbar. Ein Schwellenwert (Vorschlag: unter 50 in Leistung oder
   Bedienbarkeit) markiert einen Eintrag zur Nachbesserung.
2. **Menschlich — Ja / Nein / geht besser.** Drei Knöpfe, keine Sternchen. Sternchen
   verleiten zu Mittelmaß-Klicks; drei klare Antworten sind ehrlicher und bei einem
   kleinen Netz auch aussagekräftiger.

Klaus' **Schieberegler** stellt einmalig ein, wie streng der Marktplatz filtert (etwa:
nur Einträge ab Lighthouse 70 anzeigen).

**Nicht vermischen.** Eine gemittelte Gesamtnote aus Messwert und Stimmen wäre eine
Zahl, die nichts mehr bedeutet. Beide Werte getrennt zeigen, beide benannt.

**Offen und für Klaus zu entscheiden:** Lighthouse braucht entweder die PageSpeed-
Insights-API (Schlüssel, Google sieht die URLs) oder einen eigenen Lauf in der Action
(langsamer, aber niemand sieht mit). Vor dem Bauen fragen.

### Stufe 6 — längeres Lesefenster im Relais

Setzt **Stufe 0** voraus. Heute liest Modul 23 mit `since: now - 1800`. Sobald gemessen
ist, wie lange Karten wirklich liegen, wird der Wert angepasst — nicht vorher.

### Stufe 7 — Gast-Pillen auf der Mycel-Karte

Wer im Marktplatz steht, aber (noch) kein voller Knoten ist, erscheint als **Gast** auf
der Mycel-Karte. Klaus' Frage „wie kann ich sehen, wo mein Knoten ist" bekommt damit
eine Antwort, auch für die, die nur einen Eintrag haben.

### Stufe 8 — Aufräumen im Relais

Alte Karten verfallen lassen, damit der gemeinsame Raum nicht zuwächst.

---

## 4. Befunde, die notiert, aber nicht gebaut sind

Keiner blockiert den Fahrplan. Jeder ist eine eigene kleine Sitzung wert.

### 4.1 Neun dauerhaft rote Tests in `smoke_all.mjs`

`node tests/smoke_all.mjs` steht bei **94 von 103 grün, 9 rot**. Sie sind seit Längerem
rot, **unabhängig** von den Änderungen dieser Sitzung — per Gegenprobe gegen
`origin/main` belegt, Zeile für Zeile identisch vorher wie nachher:

```
✗ markt: Leer-Hinweis (noch keine Einträge)
✗ markt: SVG-Bild wird abgelehnt
✗ markt: gültiger Eintrag ohne Endpoint -> fail-soft Kopier-Block
✗ markt: Kontakt-Formular validiert (Ausgabe erscheint)
✗ markt: Spenden-Knöpfe als Platzhalter deaktiviert (kein Einzug)
✗ markt: kein scharfer Spenden-Link solange enabled:false
✗ footer: Bauleiste öffentlich verborgen (kein ?dev)
✗ connect: öffentlicher 🌐-Knopf sichtbar ohne ?dev
✗ connect: 🌐-Panel öffnet mit Verbinden/Wer-ist-im-Raum/Nur-neu-anmelden
```

Der erste ist der aufschlussreichste: Er erwartet einen Hinweis „noch keine Einträge",
obwohl der Marktplatz inzwischen 14 Apps führt. Der Test ist also **veraltet**, nicht
die App kaputt. Die anderen sind vermutlich derselbe Fall.

**Warum das dringlich ist:** Dauerhaft rote Tests entwerten jede spätere Prüfung. Wer
gewohnt ist, dass neun Zeilen rot sind, übersieht die zehnte. Jeden einzeln ansehen,
dann entweder anpassen oder löschen — aber **nicht** pauschal löschen, ohne zu prüfen,
ob dahinter ein echter Mangel steckt (die beiden `connect:`-Zeilen könnten einer sein).

### 4.2 Fokus-Markierung kaum sichtbar

An mehreren Stellen wird der Fokusring aktiv entfernt (`assets/style.css:175`, `:363`,
`:424`). Wer mit der Tastatur bedient, sieht nicht, wo er ist. Das schlägt direkt auf
den Lighthouse-Wert durch, den **Stufe 5** messen soll — also am besten vorher richten.

### 4.3 Andere Symbol-Knöpfe haben dasselbe Tablet-Problem

🎤, 📷, ✕ und die Knoten-Status-Knöpfe tragen nur ein `title`-Attribut. Auf einem
Touch-Gerät erscheint das **nie**. Genau das war der Mangel am Melde-Knopf, bis er
sichtbaren Text bekam. Dieselbe Behandlung für die übrigen.

### 4.4 `docs/PULS.md` in Sage-Protokol

7.816 Zeilen gegen eine selbst gesetzte Grenze von 3.000. Die Datei nennt die Regel im
eigenen Kopf. Ältere Sitzungen ins Archiv auslagern, **nicht kürzen**.

### 4.5 Automatischer Rück-Handshake

Auf `netzwerk.html` steht der ehrliche Stand (Zeile 130): Der server-lose Handshake ist
bewiesen, aber die Gegenseite quittiert nur zurück, wenn ihr Tab **offen und aktiv** ist
(Browser drosseln Hintergrund-Tabs). Das ist der eigentliche Grund, warum es die
Katalog-Spore überhaupt gibt — sie umgeht das Problem, statt es zu lösen. Der Text ist
richtig formuliert und braucht keine Änderung; wichtig ist nur, ihn nicht versehentlich
in „geht automatisch" umzuschreiben, solange es nicht stimmt.

---

## 5. Wie hier gearbeitet wird

- **Messen statt schätzen.** In dieser Sitzung wurde zweimal etwas „zu groß" gefühlt und
  zweimal ergab die Messung eine andere Zahl als die Schätzung.
- **Gegenprobe zu jedem neuen Wächter.** Den bekannten Fehler absichtlich wieder
  einbauen und prüfen, dass der Test rot wird. Ein Test, der den Fehler nicht fängt, ist
  wertlos — und man merkt es sonst nie.
- **Auf das Ergebnis warten, nie auf die Uhr.** Feste `setTimeout`-Werte in Tests haben
  hier zu einem Test geführt, der zwischen Läufen grün und rot flackerte. Das ist
  schlimmer als dauerhaft rot.
- **Keine Notlösung stehen lassen, deren Notwendigkeit man nicht geprüft hat.** Auch das
  ist hier passiert: ein eigener Browser je Testfall gegen ein Cache-Problem, das gar
  nicht die Ursache war. Nach dem echten Fix wieder zurückgebaut und nachgemessen.
- **Klaus' Browser-Sichttest ersetzt nichts und wird durch nichts ersetzt.** Headless
  bestätigt Logik; echte Mängel zeigen sich am Tablet.
- **Erst mergen, dann prüft Klaus.** GitHub Pages deployt von `main` — Klaus kann viele
  Dinge erst nach dem Merge sehen. Nicht auf seinen Test warten, bevor Getestetes und
  Abgegrenztes gemergt wird.
- **Selbst-Merge-Freibrief gilt** (Klaus 2026-06-28, netzweit): eigene PRs selbstständig
  squash-mergen, sobald getestet und abgegrenzt. Bei echtem Zweifel erst fragen.
- **Einzelschritte für Klaus.** Ein Schritt pro Antwort mit klarem Erfolgsmerkmal, keine
  Terminal-Befehle, keine Blockanweisungen.

### Die drei Maschinen nicht verwechseln

| Ort | Prompt | Paketbefehl | Was dort läuft |
|---|---|---|---|
| Tablet / Termux | `~ $` | `pkg` | `git`, lokaler `http.server`. **Kein Server.** |
| Hetzner Cloud (CX23) | `root@ubuntu-…:~#` | `apt` | Caddy im Docker, liefert `family-projekt.de` **statisch** |
| Hetzner Webhosting S | konsoleH | — | **PHP** und die echten Geheimnisse. Nur hier wirkt `.htaccess` |

Wer einen Befehl gibt, sagt immer dazu, wohin er gehört.

---

## 6. Vorschlag für die Reihenfolge

1. **`einreichung.php` per WebFTP hochladen** (Klaus) — schließt Stufe 4 ab.
2. **Stufe 1 Schreibseite** (Studio-Knopf + `commit_vectors`) — die Leseseite wartet
   darauf, vorher bringt sie nichts.
3. **Die neun roten Tests aufräumen** — je länger sie rot sind, desto weniger sagt jede
   spätere Prüfung aus.
4. **Fokus-Markierung richten** — muss vor Stufe 5 stehen, sonst misst Lighthouse einen
   Mangel, den wir schon kennen.
5. **Stufe 2** (`sporeUrl` + tägliche Aktion) — setzt Stufe 1 vollständig voraus.
6. **Stufe 3** (Wächter) — sicherheitsrelevant, vorher mit Klaus über Safe Browsing
   sprechen.
7. **Stufe 5** (Lighthouse + Stimmen) — vorher die offene Frage aus Abschnitt 3 klären.
8. **Stufe 0** (Relais-Messung, Klaus im Browser), dann **Stufe 6**.
9. **Stufen 7 und 8** zum Schluss.

---

## 7. Sitzungsende, jedes Mal

1. `docs/PULS.md` fortschreiben (Datum, was getan, was offen, was als Nächstes).
2. Übergabeprotokoll in `docs/sessions/archiv/YYYY-MM-DD_<thema>.md`.
3. Bei Andock-Bezug: `sbkim/SIGNAL.json` pflegen (`seq` +1, `headline`, `forNodes`) —
   **das Pushen ist das Signal.**
4. Einen **„Nächste Schritte"-Block direkt in die Chat-Antwort** (2–4 Punkte, je ein
   Satz Begründung). Klaus liest den Tab, nicht den Dateibrowser.
5. Einen **neuen Brief wie diesen** schreiben und **vollständig als Codeblock im Chat**
   ausgeben.
