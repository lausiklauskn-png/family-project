# Brief für die nächste Sitzung — family-project (Stand 2026-08-02, morgens)

Klaus, das ist der vollständige Übergabestand. Alles Offene steht drin, mit dem
Grund dahinter.

---

## 0. Zuerst lesen, bevor irgendetwas angefasst wird

1. `CLAUDE.md` in `Sage-Protokol` — § Sitzungsstart-Pflicht (immer frisch von `origin/main`)
2. Diesen Brief
3. `docs/PULS.md` — die drei obersten Abschnitte sind vom 2026-08-01/02
4. `tools/messung.mjs` — der Kopf erklärt Stufe 5 in einer Bildschirmseite
5. `tests/smoke_stufe5_messung.mjs` — der Kopf nennt **elf** Gegenproben und
   zwei Lehren, die dieser Test beim Bauen gekostet hat

**Vor jeder Arbeit an einem Repo:**

```bash
git -C <repo> fetch origin --quiet
git -C <repo> checkout -B <branch> origin/main
```

Nach einem Squash-Merge zeigt `git log origin/main..branch` noch Commits, obwohl
der Inhalt in `main` ist. Immer zusätzlich `git diff origin/main origin/<branch>
--stat` prüfen.

**Vor dem ersten Test:** `npm install playwright-core --no-save`. Es gibt keine
`package.json`; ohne diesen Schritt bricht jeder Browser-Test mit
`ERR_MODULE_NOT_FOUND` ab. Das sieht aus wie ein kaputter Test, ist aber keiner.

**Nur EINE Browser-Testreihe gleichzeitig** — sonst misst man Rauschen.

**Von dieser Maschine NICHT erreichbar:** `cdn.jsdelivr.net`, `huggingface.co`,
`*.github.io`, `family-projekt.de`, `www.githubstatus.com` (Proxy).
**Workflows von Hand starten geht nicht** (403). Das bleibt Klaus' Schritt.

---

## 1. Stufe 5 ist fertig UND im Feld bewiesen

Cache-Version **v83**. Alle Suiten grün: `smoke_stufe5_messung` **92/92**,
`smoke_membran_protokoll` 27/27, `smoke_stufe2_sporen` 45/45,
`smoke_stufe3_waechter` 64/64, `smoke_all` 107/107, `smoke_knoepfe` 64/64,
`smoke_cache_version` 10/10, `smoke_studio_markt` 62/62,
`smoke_studio_vectors` 41/41, `smoke_markt_melden` 32/32.
In Sage: `smoke_bau15c_protokoll` 27/27, `smoke_bau15b_membran` 35/35.

### Der erste echte Messlauf (2026-08-02, 03:52 UTC)

`run_number 2`, `event: schedule`, 4 Minuten, **`success`**, Bericht selbst
committet. Geplant war 02:40 — **72 Minuten Verzug**, GitHubs Warteschlange.

**Das ist die wichtigste Zahl im Brief:** ein fehlender planmäßiger Lauf ist
erst nach rund **zwei Stunden** ein Befund. Vorher nicht am Workflow schrauben —
ein Eingriff kann die Registrierung des Zeitplans anfassen, während ein
verspäteter Lauf noch unterwegs ist.

Ergebnis: **10 gemessen · 0 veraltet · 4 „noch nicht dran"** (Deckel greift wie
gebaut). Echtes Lighthouse **13.4.1**. Wächter 12 grün, 2 gelb, 0 rot.

| Eintrag | L / B / G / A |
|---|---|
| Kimseek · Mycel-Karte | 99 / 93 / 100 / 100 · 99 / 87 / 100 / 100 |
| Perfect Skin Fashion · Kim-Bell · Perfect Skin Beauty | 96 / 94 / 96 / 100 · 95 / 100 / 100 / 90 · 92 / 96 / 100 / 100 |
| Jasons-Tresor · Mein-Tresor · BookLedgerPro · Kimboard | 73 / 92 / 100 / 100 · 69 / 84 / 100 / 100 · 65 / 91 / 100 / 100 · 62 / 90 / 96 / 100 |
| **Mixarium** | **39** / 87 / 100 / 100 |

Bedienbarkeit und gute Praxis stehen netzweit gut. Die **Leistung** ist die
Baustelle. Mixarium mit 39 fiele bei einer Regler-Schwelle von 50 heraus.

### Was gebaut wurde

- **`tools/messung.mjs`** hängt am selben Lauf wie der Wächter, schreibt in
  denselben Bericht (`assets/config/spore-stand.json`) neben `wache` einen Block
  `messung`. Keine Gesamtnote, an keiner Stelle. Deckel **10 je Lauf** (ältestes
  Datum zuerst, protokolliert). Fehlschlag → `veraltet` mit dem **alten** Datum,
  nie gelöscht. Kein Lighthouse → ehrlich `nicht_gemessen`.
- **Karte:** vier farbige Zahlen + ein Satz, der den **schwächsten** Wert nennt,
  + Knopf **„📊 Bewertung nachlesen"** (gleiche Optik wie „→ Zur Seite", im Test
  gemessen). Ohne Zahlen: kein Knopf, aber „📈 Noch nicht gemessen."
- **Fenster** (natives `<dialog>`): wer misst und dass der Anbieter nicht
  schummeln kann · was jede Zahl konkret bedeutet · Farb-Legende (Lighthouses
  eigene Grenzen) · **„Was besser gehen könnte"** — Vorschläge, keine Pflicht ·
  **Link zum vollen Bericht bei Google** (`pagespeed.web.dev`, nur https, neuer
  Tab, nur auf Klick).
- **Studio:** volle Tabelle (schwächste zuerst) + **Schieberegler**, reist in
  `assets/config/listings.js` mit. 0 = aus; ein Eintrag OHNE Messwert wird nie
  ausgeblendet.
- **Modul 15** sagt jetzt, WER geklopft hat (Grund · Absender · Typ · Zeit nach
  dem Laden · Tab vorn?). Im **Sage-Kanon** gebaut, hierher als **Delta**
  (dieses Repo trägt Modul 15 als Fork). PII-Grenze hart, `ZERTIFIKAT_ASPEKTE`
  in Modul 16 mitgezogen.
- **Sporen-Meldung beruhigt:** `abweichend` (weicht ab, nichts Neues) neben
  `geaendert` (wirklich geändert). Vorher standen neun von vierzehn Einträgen
  jede Nacht auf „wartet auf dich", obwohl niemand etwas geändert hatte.

---

## 2. Was du tun kannst — der Reihe nach

**a) In den Marktplatz schauen** (Hard-Reload). Auf zehn Karten stehen Zahlen
und der Knopf. Fenster einmal aufmachen: passen die Texte? Die sind in fünf
Minuten umgeschrieben.

**b) Ins Fremdzugriff-Fenster schauen** — DuckDuckGo-Browser, FREMD-Lampe
anklicken. Dort steht jetzt ein Satz, der sagt, wer geklopft hat. **Das ist der
Beleg, der noch fehlt.**

**c) Den Schieberegler einstellen, wenn du magst.** Studio → „📈 Messung
(Lighthouse)". Darunter steht live, wie viele Einträge bei diesem Wert
herausfielen. Wirksam erst mit „Veröffentlichen".

**d) Zwei Dateien per WebFTP hochladen** — unverändert offen:
`server/einreichung.php` und `server/marktplatz-api.php`. **Kontrolle:** in
beiden neuen Fassungen kommt das Wort **`sporeUrl`** vor, in den alten kein
einziges Mal. Nicht auf die Dateigröße schauen.

**e) Safe Browsing scharf schalten.** Der Wächter läuft nachweislich allein:
Google-Projekt → Safe Browsing API aktivieren → API-Schlüssel → Repo Settings →
Secrets and variables → Actions → *New repository secret*, Name genau
**`SAFE_BROWSING_KEY`**. Der Workflow reicht ihn bereits durch.

---

## 3. Die offenen Punkte, mit Grund

### Sofort prüfbar nach dem nächsten Lauf

- **Kommen die Nachbesserungen jetzt auf Deutsch?** Beim ersten echten Lauf
  kamen sie englisch („Minify JavaScript"). Behoben mit `--locale=de`; ob
  Lighthouse die Übersetzung wirklich liefert, zeigt erst der Lauf. Der Test
  prüft nur, dass die Sprache **verlangt** wird.
- **Die vier Nachzügler** (Tomys Hub, Privat-Brain, WorkFloh, Rezeptbuch) sind
  heute Nacht dran.
- **Beruhigt sich die Sporen-Liste?** `abweichend` statt `geaendert` greift ab
  dem nächsten Lauf.

### ⚠ Modul 15 steht netzweit in VIER Fassungen

`sbkim/15_membran.js` auf `origin/main`, gemessen 2026-08-01:

| Fassung | Repos |
|---|---|
| `0d037cd2` (Sage-Kanon vor der Pflege) | Jasons-Tresor · Mein-Tresor · Tomys-Hub |
| `e2ed570d` | Mein-Mixarium |
| `b0287e73` | Mein-Rezeptbuch · Muttis-Rezeptbuch |
| `82b7022f` (Fork mit A5-Antwortpfad) | family-project — **mit der Pflege** |

Der Rollout ist **kein** byte-1:1-Kopieren, sondern Delta-Arbeit je Fassung.
Der Weg ist erprobt: Delta als Patch aus dem Sage-Commit ziehen, mit `patch`
aufsetzen, danach nachzählen, dass die Eigenpflege des Repos noch steht und
nichts Fremdes eingeschleppt wurde. **Eigener Schritt, eigene Gegenprobe je Repo.**

### ⚠ Modul 17 trägt in vier Repos eine Gabelung

`sbkim/17_floating_widget.js` ist in **Mein-Rezeptbuch, Muttis-Rezeptbuch,
Mein-Mixarium und BookLedgerPro** bewusst nicht überschrieben: sie tragen Klaus'
eigene Fixes (Pro-App-Namensraum, Proxy-ID-Guard), und ihnen fehlt gleichzeitig
der Stufen-Render von 2026-05-26. Der saubere Weg: die Eigenpflegen **in den
Sage-Kanon holen**, dann sind alle wieder byte-1:1. Bis dahin ist die
Widget-Beschriftung dort über heller Seite schwer lesbar. Ehrlicher Stand.

### Kleinere Reste

- **`assets/mycel-bg.js`** (10 Verweise) hängt ohne `?v=` und ohne CORE-Eintrag
  frei am HTTP-Cache.
- **Node-20-Deprecation:** `actions/checkout@v4` + `setup-node@v4`. Warnung,
  kein Fehler. Vor dem Hochziehen die richtige Fassung nachsehen, nicht raten.
- **Ja/Nein-Stimmen** sind nicht gebaut. Sie brauchen einen Zähler auf Klaus'
  Server (also wieder eine PHP-Datei). Der **Platz** ist freigehalten. Regel:
  sie kommen **daneben**, nie in die Messwerte hinein.
- **Befund 5.1, zweite Hälfte:** verstehen sehende Nutzer 🎤 und 📷 im
  Eingabefeld? Vorschlag: eine Zeile unter dem Formular („🎤 sprechen statt
  tippen · 📷 Text aus einem Foto").
- **Nur eine Sprache im Bericht:** die Nachbesserungen sind künftig deutsch,
  auch wenn der Marktplatz auf Englisch steht. Bewusst so.

---

## 4. Wie hier gearbeitet wird

- **Messen statt schätzen.** „Sieht fertig aus" ist kein Befund.
- **Zu jedem neuen Wächter eine Gegenprobe — und sie muss scharf sein.** Hat
  eine Funktion **zwei** Fehler-Zweige, braucht sie **zwei** Gegenproben.
- **Nachzählen, dass der eingebaute Fehler wirklich im Code landet.** Ein
  Fehler, der nicht ankommt, beweist nichts über den Test.
- **Einen neuen Schritt im gemeinsamen Lauf gegen die BESTEHENDEN Tests
  messen**, nicht nur gegen den eigenen. Die Messung startete ohne installiertes
  Lighthouse für jeden Eintrag einen Prozess — gemerkt wurde es daran, dass
  `smoke_stufe2_sporen` plötzlich in seine Zeitgrenze lief.
- **NEU (2026-08-02): der erste echte Lauf ist ein eigener Prüfschritt.** Alle
  92 Proben waren grün, und trotzdem kamen die Nachbesserungen auf Englisch. Was
  ein Test nicht kennt, kann er nicht messen — der erste Lauf im Feld gehört
  ausgewertet wie ein Testlauf.
- **NEU: nicht reparieren, bevor es ein Befund ist.** Um 05:15 fehlte der
  geplante Lauf. Alles Konfigurierbare war in Ordnung; ein Eingriff hätte die
  Registrierung des Zeitplans anfassen können. Er kam um 03:52 UTC von allein.
- **Auch Optik lässt sich messen.** Der Knopf wird im Test gegen „→ Zur Seite"
  auf DERSELBEN Karte verglichen (Schrift, Größe, Rundung, Polster).
- **Am richtigen Merkmal messen.** Eine Probe las `data-theme`, obwohl die App
  CSS-Variablen setzt.
- **Nicht das eigene Zutun messen.** `page.focus()` scrollt selbst.
- **Kopieren, nicht klonen — aber Diff LESEN vor Überschreiben.** Findet sich
  eine repo-eigene Zeile: das Delta aufsetzen und danach nachzählen, dass die
  Eigenpflege noch steht.
- **Zwei verschiedene Nichts sehen nicht gleich aus.** Kein Bericht → gar nichts.
  Bericht ohne Messung → „Noch nicht gemessen."
- **Ein Beleg aus dem Repo ist kein Beleg über die Wirklichkeit.**
- **Cache ist hier die häufigste Ursache, nicht der Sonderfall.**
- **Wer eine CORE-Datei ändert, erhöht `CACHE_VERSION` und `ASSET_V`** und zieht
  alle `?v=`-Verweise mit — auch die zwei in `werkzeuge/`. Steht auf **v83**.
- **`raw.githubusercontent.com` liefert für PRIVATE Repos immer 404.**
- **Alles unter `server/` wird nie durch Merge oder Deploy aktualisiert.**
- **Erst mergen, dann prüft Klaus.** GitHub Pages deployt von `main`.
- **Selbst-Merge-Freibrief gilt** (Klaus 2026-06-28, netzweit).
- **Einzelschritte für Klaus.** Ein Schritt pro Antwort mit klarem
  Erfolgsmerkmal, keine Terminal-Befehle ohne Angabe, auf welche Maschine sie
  gehören.
- **family-projekt.de zeigt NICHT Modul 17**, sondern sein eigenes angedocktes
  Widget (`assets/status-widget.js`). Wer Modul 17 sichtbar prüfen will, nimmt
  Privat-Brain, Kimboard, Kimseek, Mein-Tresor oder Jasons-Tresor.

### Die drei Maschinen nicht verwechseln

| Ort | Prompt | Paketbefehl | Was dort läuft |
|---|---|---|---|
| Tablet / Termux | `~ $` | `pkg` | `git`, lokaler `http.server`, **`ssh` zum Server**. Kein Server. |
| Hetzner Cloud (CX23) | `root@ubuntu-…:~#` | `apt` | Caddy im Docker, liefert `family-projekt.de` statisch. `167.233.204.72`, Caddyfile `/opt/relay/Caddyfile` |
| Hetzner Webhosting S | konsoleH | — | **PHP** und die echten Geheimnisse. Nur hier wirkt `.htaccess` |

Am sichersten ist `ssh root@167.233.204.72 '<befehl>'` — dann kann er gar nicht
auf dem Tablet landen.

---

## 5. Sitzungsende, jedes Mal

1. `docs/PULS.md` fortschreiben (Datum, was getan, was offen, was als Nächstes).
2. Bei Andock-Bezug `sbkim/SIGNAL.json` pflegen — das Pushen ist das Signal.
   *(Diese Sitzung: die Modul-15-Pflege berührt ein geteiltes Sicherheits-Modul,
   aber keinen Briefkasten-Vertrag; `SIGNAL.json` blieb unangetastet, und das
   gehört gesagt.)*
3. Einen **„Nächste Schritte"-Block direkt in die Chat-Antwort** (2–4 Punkte).
4. Einen **neuen Brief wie diesen** schreiben und **vollständig als Codeblock im
   Chat** ausgeben.
