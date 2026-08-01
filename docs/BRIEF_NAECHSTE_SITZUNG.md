# Brief für die nächste Sitzung — family-project (Stand 2026-08-02)

Klaus, dieser Brief ist der vollständige Übergabestand. Alles Offene steht drin,
Schritt für Schritt, mit dem Grund dahinter.

---

## 0. Zuerst lesen, bevor irgendetwas angefasst wird

1. `CLAUDE.md` in `Sage-Protokol` — § Sitzungsstart-Pflicht (immer frisch von `origin/main`)
2. Diesen Brief
3. `tools/vektoren-bauen.mjs` — der Kopf erklärt die tägliche Aktualisierung in
   einer Bildschirmseite, samt der Frage, warum der fertige Vektor aus der Spore
   *nicht* übernommen wird
4. `tests/smoke_stufe2_sporen.mjs` — der Kopf nennt die Gegenproben, die schon
   gemacht sind, und die eine Grenze, die dieser Test nicht überschreiten kann
5. `assets/vec-codec.js` — der Kopf erklärt die Katalog-Spore
6. `Caddyfile.example` — der Kopf erklärt, warum diese Datei jahrelang in die Irre führte

**Vor jeder Arbeit an einem Repo:**

```bash
git -C <repo> fetch origin --quiet
git -C <repo> checkout -B <branch> origin/main
```

Der Grund steht in Sages `CLAUDE.md`: die Klone im Container können Monate alt sein.
In diesem Repo kommt eine zweite Falle dazu: nach einem Squash-Merge zeigt
`git log origin/main..branch` noch Commits an, obwohl der Inhalt längst in `main` ist.
Immer zusätzlich `git diff origin/main origin/<branch> --stat` prüfen. Ist der leer, ist
ein `push --force-with-lease` gefahrlos.

**Vor dem ersten Test:** `npm install playwright-core --no-save`. Es gibt keine
`package.json`, und ohne diesen Schritt bricht jeder Browser-Test mit
`ERR_MODULE_NOT_FOUND` ab — das sieht aus wie ein kaputter Test, ist aber keiner.

**Nur EINE Browser-Testreihe gleichzeitig laufen lassen.** Zwei parallele `smoke_all`
überlasten diese Maschine, und dann misst man Rauschen statt Ergebnissen.

**Was von dieser Maschine aus NICHT erreichbar ist** (gemessen 2026-08-02, jeweils
„CONNECT tunnel failed, response 403"): `cdn.jsdelivr.net`, `huggingface.co`,
`*.github.io`. Erreichbar ist `raw.githubusercontent.com`. Wer etwas davon braucht,
plant es als „ungeprüft, die Action misst es" ein — nicht als Fehler.

---

## 1. Was in dieser Sitzung fertig wurde

| Was | Wo |
|---|---|
| **Fokus-Markierung gerichtet** (Brief §4.1 der Vorsitzung) | `assets/style.css`, `assets/app.js`, `tests/smoke_fokus.mjs` |
| **Katalog-Spore Stufe 2** — `sporeUrl` + tägliche Aktion | `tools/vektoren-bauen.mjs`, `.github/workflows/vektoren-taeglich.yml`, Studio, Formular, zwei PHP-Dateien |

Cache-Version steht auf **v76**. Alle 15 Testreihen grün: `smoke_all` 107/107,
`smoke_fokus` 15/15, `smoke_stufe2_sporen` 38/38, der Rest unverändert.

### Die Fokus-Markierung

Drei `outline:none` sind raus. Neu ist ein Token `--focus` (Gold auf Dunkel und
Neon, kräftiges Blau auf Hell — Kontrast 13,5 / 15,2 / 7,5 gegen den jeweiligen
Hintergrund, Norm ist 3) und eine Regel `:focus-visible{outline:3px …}`.
`:focus-visible` statt `:focus` heißt: Mausklick auf einen Knopf sieht aus wie
immer, nur die Tastatur bekommt den Ring.

Nebenbefund aus der Gegenprobe: der Browser-Standardring war **1 px** breit.
Der gemeldete Mangel in Zahlen.

### Katalog-Spore Stufe 2

Jeder Eintrag darf ein Feld `sporeUrl` tragen — die `sbkim/spore.json` im eigenen
Repo des Anbieters. Eine GitHub-Action (02:40 UTC, auch von Hand auslösbar) liest
sie und schreibt `listings-vec.json` fort, mit **derselben Spar-Logik wie der
Studio-Knopf**: ein geänderter Text ergibt eine Einbettung statt vierzehn.
Ändert sich nichts, wird kein Modell geladen und nichts geschrieben.

**Deine Entscheidung vom 2026-08-02**, so gebaut:

| am Eintrag | was nachts passiert |
|---|---|
| `sporeAuto: true` | die Beschreibung wird übernommen, der Vektor neu gerechnet |
| kein Haken (Standard) | nur gemeldet; du übernimmst im Studio per Knopf |

Der Standard ist die sichere Seite: ohne deine ausdrückliche Erlaubnis schreibt
niemand Fremdes ungefragt auf family-projekt.de. Der Bericht steht in
`assets/config/spore-stand.json` und erscheint im Studio als eigener Block —
wartende Einträge oben, hervorgehoben, mit Knopf. Fremder Text wird
ausschließlich als Text gesetzt, nie als HTML.

Neun deiner vierzehn Einträge haben schon einen Spore-Link. Der Haken ist
nirgends gesetzt — das ist bewusst deine Entscheidung, Eintrag für Eintrag.

### Zwei gemessene Befunde, die Zeit sparen

**1. `raw.githubusercontent.com` liefert für PRIVATE Repos immer 404** — auch
wenn die Datei da ist. Genau fünf von neun Sporen fielen darauf herein
(BookLedgerPro, Tomys-Hub, Kim-Bell, Privat-Brain, Mein-WorkFloh — alle privat;
die vier, die antworteten, sind alle öffentlich). Diese fünf zeigen jetzt auf die
Live-Adresse der App. Das Werkzeug schreibt den Grund bei einem 404 in den
Bericht, damit die nächste Sitzung nicht bei sich sucht.

**2. Der `domainVector` aus der Spore wird NICHT übernommen**, obwohl er fertig
dasteht und mit demselben Modell gerechnet ist. Er gehört nicht sicher zum selben
Text: `sbkim-init.js` rechnet `embedPassage(beschreibung)`, der Siegel-Wizard
dagegen `embedPassage(beschreibung + ". " + stichworte)` — und ein fremder Knoten
darf eine dritte Regel benutzen. Ein übernommener Vektor sähe vollständig aus und
gehörte zu einem anderen Text. Dieselbe Form wie die vier Befunde vom 2026-08-01.

### Die Gegenprobe, die zuerst nichts fing

Erwähnenswert, weil sie die Lehre der letzten Sitzung bestätigt hat. Der
Studio-Bericht setzt fremden Text als `textContent`. Zur Prüfung wurde das
absichtlich auf `innerHTML` umgestellt — und der Test blieb **grün**. Der
Prüftext war „PRUEF-VORSCHLAG aus der Spore.", ohne ein einziges spitzes
Klammerpaar; als Text und als HTML sieht er gleich aus. Erst mit echtem Markup im
Prüftext wurde die Gegenprobe rot. Ein Wächter, der den Fehler nicht fängt, ist
kein Wächter — und man merkt es nur, wenn man den Fehler wirklich einbaut.

---

## 2. Was du noch tun musst

**Zwei Dateien per WebFTP hochladen.** Alles unter `server/` wird nie durch einen
Merge oder Deploy aktualisiert — das machst nur du.

- `server/einreichung.php`
- `server/marktplatz-api.php`

**Kontrolle:** in beiden neuen Fassungen kommt das Wort **`sporeUrl`** vor; in den
alten kein einziges Mal. Nicht auf die Dateigröße schauen — das war der Befund
vom 2026-08-01 (10,59 KB gegen 10,54 KB, 46 Bytes Unterschied).

Ohne den Upload bleibt alles heil. Es fehlt dann nur eines: der freiwillige
Spore-Link, den ein Anbieter im Einreich-Formular angibt, kommt nicht im Studio
an. Alles andere — die nächtliche Aktion, der Bericht, die Vektoren — läuft davon
unabhängig.

**Danach, wenn du magst:** Actions → „Sporen lesen und Vektoren fortschreiben
(täglich)" → *Run workflow*. Dann musst du nicht bis 02:40 UTC warten und siehst
sofort, welche der fünf Live-Adressen wirklich antworten.

---

## 3. Katalog-Spore — der Fahrplan, Stufe für Stufe

Der Gedanke dahinter: Wer seine App im Marktplatz einträgt, muss **gefunden werden**. Bei
100 Apps kann niemand 100 Tabs offen halten, damit ein Handshake zustande kommt. Die
Katalog-Spore ist die Antwort, ohne die Verfassung zu brechen — der Marktplatz ist
**Pilz-Schicht** (Schicht 2), er darf Server benutzen und auf Nutzer-Aktion nach außen
gehen. Die **Mycel-Schicht** (Schicht 1, der Knoten selbst) bleibt unangetastet:
Empfangsmodus, keine Pulsation, kein Crawler.

### Stufe 0 — Relais-Messung *(nur Klaus, läuft im Browser)*

Über die Mycel-Karte messen, **wie lange eine Karte im Relais liegen bleibt**. Das Ergebnis
legt das Lesefenster in Stufe 6 fest. Heute liest Modul 23 mit `since: now - 1800`
(30 Minuten). Ob das zu kurz oder zu lang ist, weiß niemand — es ist geraten, nicht
gemessen. Blockiert nichts, sollte aber vor Stufe 6 vorliegen.

### Stufe 1 — vorberechnete Vektoren ✅ fertig, im Echtbetrieb bewiesen (14/14)

Rückfall in Stufen, schlimmster Fall ist genau das frühere Verhalten:

| Lage | Was passiert |
|---|---|
| Datei fehlt (404) | alles live, wie bisher |
| Modell-Kennung passt nicht | Paket komplett verworfen, alles live |
| einzelner Eintrag fehlt | nur dieser eine live |
| Text seit dem Vorberechnen geändert (Hash) | nur dieser eine live |

### Stufe 2 — `sporeUrl` + tägliche Aktualisierung ✅ gebaut

Offen daran bleibt nur, was hier niemand messen kann: der Lauf mit dem echten
Modell und die fünf Live-Adressen. Beides beantwortet der erste Lauf der Action.

### Stufe 3 — Wächter *(der nächste Bau-Schritt, sicherheitsrelevant)*

Deine Frage war klar: „Wenn jemand seinen Code ändert und Schlimmes drauflegt oder auf
einen Virus verlinkt — kannst du das täglich prüfen? Das muss man ja vollkommen
ausschließen können."

Die ehrliche Antwort zuerst: **vollständig ausschließen kann man es nicht.** Was geht, ist
täglich prüfen, abstufen und im Zweifel sperren.

| Stufe | Auslöser | Folge |
|---|---|---|
| **grün** | nichts auffällig | Eintrag normal sichtbar |
| **gelb** | Ziel-Seite geändert, Prüfung ausstehend | Eintrag sichtbar mit Hinweis |
| **rot** | Safe Browsing meldet die URL, Seite nicht erreichbar, oder du sperrst von Hand | Eintrag **auf Eis** |

Bausteine: **Google Safe Browsing API** (kostenlos, Schlüssel nötig) · **Prüfsumme der
Zielseite** (`action: "fetch"` in `marktplatz-api.php` holt den Quelltext schon — es war für
genau das gedacht) · **Handschalter** (`setstatus` kennt `verdacht` und `abgelehnt`) · der
**Melde-Knopf** als menschlicher Kanal ins selbe System.

**Die Vorarbeit steht schon:** Die tägliche Aktion läuft, `spore-stand.json` ist das
Format für „was haben wir gestern Nacht gesehen", und der Studio-Block zeigt es
an. Stufe 3 hängt sich an dieselbe Aktion und erweitert denselben Bericht — kein
zweiter Lauf, kein zweites Format.

**Wichtig:** Ein Eintrag darf nie stillschweigend verschwinden. Wer gesperrt wird, muss es
erfahren, und der Grund muss nachlesbar sein.

**Vorher mit dir zu klären:** ob Safe Browsing benutzt wird (Google sieht dann die
geprüften Adressen) oder ob es bei Erreichbarkeit + Prüfsumme + Handschalter bleibt.

### Stufe 4 — Melde-Knopf ✅ fertig und live bewiesen

### Stufe 5 — Bewertung: Lighthouse + Ja/Nein-Stimmen

Deine Vorgabe: Nur Apps, die **nützlich, technisch gut, nutzerfreundlich und optisch gut
bis hervorragend** sind, bleiben auf Dauer. Zwei getrennte Quellen, die nicht vermischt
werden dürfen:

1. **Maschinell messbar — Google Lighthouse.** Vier harte Zahlen: Leistung, Bedienbarkeit,
   gute Praxis, Auffindbarkeit. Kein Geschmacksurteil, sondern eine Messung — genau deshalb
   taugt es nach außen: „diese App erreicht 94 von 100" ist überprüfbar.
2. **Menschlich — Ja / Nein / geht besser.** Drei Knöpfe, keine Sternchen.

Dein **Schieberegler** stellt einmalig ein, wie streng gefiltert wird. **Nicht
vermischen** — eine gemittelte Note aus Messwert und Stimmen bedeutet nichts mehr.

Die Fokus-Markierung war die Vorbedingung dafür und ist erledigt: family-projekt.de
misst jetzt nicht mehr einen Mangel, den es selbst hat.

**Offen und von dir zu entscheiden:** Lighthouse braucht entweder die
PageSpeed-Insights-API (Schlüssel, Google sieht die URLs) oder einen eigenen Lauf in der
Action (langsamer, aber niemand sieht mit). Vor dem Bauen fragen.

### Stufe 6 — längeres Lesefenster im Relais

Setzt **Stufe 0** voraus. Der Wert wird angepasst, wenn gemessen ist — nicht vorher.

### Stufe 7 — Gast-Pillen auf der Mycel-Karte

Wer im Marktplatz steht, aber (noch) kein voller Knoten ist, erscheint als **Gast**.
`spore-stand.json` trägt dafür schon `nodeName` und `nodeId` je Anbieter mit.

### Stufe 8 — Aufräumen im Relais

Alte Karten verfallen lassen, damit der gemeinsame Raum nicht zuwächst.

---

## 4. Befunde, die notiert, aber nicht gebaut sind

### 4.1 ~~Fokus-Markierung kaum sichtbar~~ ✅ erledigt 2026-08-02

### 4.2 Andere Symbol-Knöpfe haben dasselbe Tablet-Problem

🎤, 📷, ✕ und die Knoten-Status-Knöpfe tragen nur ein `title`-Attribut. Auf einem Touch-Gerät
erscheint das **nie**. Genau das war der Mangel am Melde-Knopf, bis er sichtbaren Text
bekam. Schlägt ebenfalls auf den Lighthouse-Wert durch (Stufe 5) — sinnvoll, das vor
Stufe 5 zu richten, so wie es die Fokus-Markierung war.

### 4.3 `docs/PULS.md` in Sage-Protokol

7.816 Zeilen gegen eine selbst gesetzte Grenze von 3.000. Ältere Sitzungen ins Archiv
auslagern, **nicht kürzen**. (Diese Datei hier wächst auch — im Auge behalten.)

### 4.4 Automatischer Rück-Handshake

Auf `netzwerk.html` steht der ehrliche Stand (Zeile 130): Der server-lose Handshake ist
bewiesen, aber die Gegenseite quittiert nur zurück, wenn ihr Tab **offen und aktiv** ist.
Das ist der eigentliche Grund, warum es die Katalog-Spore überhaupt gibt — sie umgeht das
Problem, statt es zu lösen. Den Text nicht versehentlich in „geht automatisch"
umschreiben, solange es nicht stimmt.

### 4.5 Caddy-Formatierung

Kosmetische Warnung beim Neuladen. `docker exec caddy caddy fmt --overwrite
/etc/caddy/Caddyfile` räumt es auf.

### 4.6 Die tägliche Aktion schreibt jede Nacht einen kleinen Commit

`spore-stand.json` bekommt bei jedem Lauf einen frischen Zeitstempel, auch wenn
sich sonst nichts geändert hat. Das ist Absicht: der Stempel ist der Beleg, **dass**
nachgesehen wurde — ein Bericht, der stehen bleibt, wäre von einem ausgefallenen
Lauf nicht zu unterscheiden. Wenn dich der tägliche Commit stört, ist das die
Stelle; dann braucht es aber einen anderen Beleg für „der Wächter lebt noch".

---

## 5. Wie hier gearbeitet wird

- **Messen statt schätzen.** „Sieht fertig aus" ist kein Befund. In dieser Sitzung
  war es zweimal wieder so: fünf Sporen antworteten nicht (private Repos), und eine
  Gegenprobe blieb grün, weil der Prüftext zu harmlos war.
- **Zu jedem neuen Wächter eine Gegenprobe** — den Fehler absichtlich einbauen und
  prüfen, dass der Test rot wird. **Und darauf achten, dass die Gegenprobe scharf
  ist:** ein Prüfwert, bei dem richtig und falsch gleich aussehen, macht sie
  wertlos. In dieser Sitzung sieben Mal gemacht, einmal nachgeschärft.
- **Cache ist hier die häufigste Ursache, nicht der Sonderfall.** Bei jedem „das
  kann doch nicht sein" zuerst fragen: welche Fassung hat der Browser wirklich?
- **Wer eine CORE-Datei ändert, erhöht `CACHE_VERSION` und `ASSET_V` in `sw.js`**
  und zieht alle `?v=`-Verweise mit. Steht auf **v76**.
  `tests/smoke_cache_version.mjs` sagt es dir.
- **Auf das Ergebnis warten, nie auf die Uhr** — und wo die Seite selbst aufräumt,
  **mitschreiben statt nachsehen**.
- **Im Test alles umleiten, was der Code abruft.** (Playwright-Globs vergleichen die
  ganze Adresse samt Query — ein `?ts=` bricht die Umleitung.)
- **Ein Test, der den Prozess blockiert, misst sich selbst.** `spawnSync` hält die
  Ereignisschleife an; läuft im selben Prozess ein Server, nimmt der keine
  Verbindung mehr an, und fünf Prüfungen fallen aus einem Grund durch, der nicht
  im geprüften Code liegt. In dieser Sitzung genau so passiert.
- **Klaus' Browser-Sichttest ersetzt nichts und wird durch nichts ersetzt.**
- **Erst mergen, dann prüft Klaus.** GitHub Pages deployt von `main`.
- **Selbst-Merge-Freibrief gilt** (Klaus 2026-06-28, netzweit). Bei echtem Zweifel fragen.
- **Einzelschritte für Klaus.** Ein Schritt pro Antwort mit klarem Erfolgsmerkmal, keine
  Terminal-Befehle ohne Angabe, auf welche Maschine sie gehören.

### Die drei Maschinen nicht verwechseln

| Ort | Prompt | Paketbefehl | Was dort läuft |
|---|---|---|---|
| Tablet / Termux | `~ $` | `pkg` | `git`, lokaler `http.server`, **`ssh` zum Server**. Kein Server. |
| Hetzner Cloud (CX23) | `root@ubuntu-…:~#` | `apt` | Caddy im Docker, liefert `family-projekt.de` **statisch**. `167.233.204.72`, Caddyfile unter `/opt/relay/Caddyfile` |
| Hetzner Webhosting S | konsoleH | — | **PHP** und die echten Geheimnisse. Nur hier wirkt `.htaccess` |

Am 2026-08-01 lief ein `cat /opt/relay/Caddyfile` im Termux ins Leere — genau diese
Verwechslung. Wer einen Befehl gibt, sagt dazu, wohin er gehört. Am sichersten ist
`ssh root@167.233.204.72 '<befehl>'`, dann kann er gar nicht auf dem Tablet landen.

---

## 6. Vorschlag für die Reihenfolge

1. **Die zwei PHP-Dateien hochladen** (Abschnitt 2) und die Action einmal von Hand
   starten — danach steht schwarz auf weiß, welche Sporen wirklich erreichbar sind.
2. **Stufe 3** (Wächter) — der nächste inhaltliche Schritt; die Aktion und der
   Bericht stehen schon, Stufe 3 hängt sich daran. Vorher mit dir über Safe
   Browsing sprechen.
3. **Befund 4.2** (Symbol-Knöpfe ohne sichtbaren Text) — klein, und gehört wie die
   Fokus-Markierung vor Stufe 5.
4. **Stufe 5** (Lighthouse + Stimmen) — vorher die offene Frage aus Abschnitt 3 klären.
5. **Stufe 0** (Relais-Messung, du im Browser), dann **Stufe 6**.
6. **Stufen 7 und 8** zum Schluss.

---

## 7. Sitzungsende, jedes Mal

1. `docs/PULS.md` fortschreiben (Datum, was getan, was offen, was als Nächstes).
2. Bei Andock-Bezug: `sbkim/SIGNAL.json` pflegen (`seq` +1, `headline`, `forNodes`) —
   **das Pushen ist das Signal.** Reine Marktplatz-Arbeit ist Pilz-Schicht und berührt den
   Briefkasten nicht; dann bleibt `SIGNAL.json` unangetastet, und das gehört gesagt.
   *(Diese Sitzung war reine Pilz-Schicht — `SIGNAL.json` blieb unangetastet.)*
3. Einen **„Nächste Schritte"-Block direkt in die Chat-Antwort** (2–4 Punkte, je ein Satz
   Begründung). Klaus liest den Tab, nicht den Dateibrowser.
4. Einen **neuen Brief wie diesen** schreiben und **vollständig als Codeblock im Chat**
   ausgeben.
