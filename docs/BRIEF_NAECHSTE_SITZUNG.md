# Brief für die nächste Sitzung — family-project (Stand 2026-08-01)

Klaus, dieser Brief ist der vollständige Übergabestand. Alles Offene steht drin,
Schritt für Schritt, mit dem Grund dahinter.

---

## 0. Zuerst lesen, bevor irgendetwas angefasst wird

1. `CLAUDE.md` in `Sage-Protokol` — § Sitzungsstart-Pflicht (immer frisch von `origin/main`)
2. Diesen Brief
3. `assets/vec-codec.js` — der Kopf erklärt die Katalog-Spore in einer Bildschirmseite
4. `tests/smoke_studio_vectors.mjs` — der Kopf erklärt, warum dieser Test die *Wirkung*
   prüft und nicht die Form, und welche Gegenproben schon gemacht sind
5. `tests/smoke_markt_vecpack.mjs` — der Kopf enthält drei Fallen, die Zeit gekostet haben

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

---

## 1. Was zuletzt fertig wurde

| PR | Inhalt |
|---|---|
| #136, #137, #142 | Melde-Knopf + Haftung für fremde Links (Katalog-Spore **Stufe 4**) |
| #138, #139 | Service-Worker holt am HTTP-Cache vorbei · `?v=NN` an allen CSS/JS-Verweisen |
| #140 | Vektor-Codec `assets/vec-codec.js` (8.025 → 546 Bytes je Vektor) |
| #141 | Marktplatz nutzt vorberechnete Vektoren — **Leseseite** |
| #144 | Melde-Weg scharf: `einreichung.php` hochgeladen, Mail live bewiesen |
| **diese Sitzung** | **Schreibseite: Studio-Knopf „Vektoren bauen" + `commit_vectors`** |

Cache-Version steht jetzt auf **v71**.

### Was diese Sitzung gebaut hat

**Knopf „🧠 Vektoren bauen" im Studio** (`assets/studio-markt.js`; das Studio öffnet über
1,5 Sekunden Langdruck auf das Copyright in der Fußzeile von `markt.html`). Er rechnet die
Bedeutungs-Vektoren aller Einträge einmal aus, packt sie mit `FPVecCodec`, hängt je Eintrag
den Text-Hash an und schickt das Paket über `commit_vectors` an den Server. Fortschritt in
Achter-Häppchen sichtbar. **Nie ein halbes Paket** — erst wenn alles gerechnet ist, geht der
Commit raus; bricht etwas ab, bleibt die alte Datei stehen.

**`commit_vectors` in `server/marktplatz-api.php`.** Schwester von `commit_listings`, aber
mit echter Prüfung: gültiges JSON · nicht-leeres `vectors` · gesetzte `model`-Kennung. Ziel
ist `assets/config/listings-vec.json`, über `vectors_path` in `freigabe-config.php`
umstellbar — fehlt die Zeile, gilt genau dieser Standard, also läuft deine bestehende
Konfiguration unverändert weiter.

### Warum der Test so gebaut ist, wie er gebaut ist

Schreib- und Leseseite sind zwei Dateien, die an **vier** Stellen übereinstimmen müssen:
Text-Regel `x.text || x.label`, `model`, `dim`, Codec. Weicht eine ab, passiert etwas
Unangenehmes — **nichts stürzt ab**. Die Leseseite ist fail-soft und rechnet klaglos alles
selbst nach. Das Paket läge nutzlos herum, die Suche funktionierte weiter, nur eben so
langsam wie vorher, und niemandem fiele es auf.

Deshalb prüft `tests/smoke_studio_vectors.mjs` nicht die *Form* des Pakets, sondern seine
*Wirkung*: das Studio baut ein Paket, genau dieses Paket wird der Leseseite vorgelegt, dann
werden die Einbettungen gezählt. **0 heißt: die Seiten passen zusammen.** Jede Zahl darüber
heißt: sie tun es nicht. Dazu ein zweiter Teil, der die Server-Prüfung mit echten Anfragen
gegen `php -S` durchspielt (kein Netz nach außen).

**20/20 grün, mit drei Gegenproben belegt:**

| absichtlich eingebauter Fehler | Test |
|---|---|
| Text-Regel `x.label` statt `x.text \|\| x.label` | rot — (11), (12), **(14): 14 statt 0 eingebettet** |
| `model` hartcodiert statt aus `_meta` gelesen | rot — (6), (14) |
| Leer-Schutz im PHP entfernt | rot — (18), (19) |

### Zwei Befunde nebenbei

- **`assets/studio-markt.js` wurde ohne `?v=` geladen.** Caddy cacht `*.js` sieben Tage
  (`Caddyfile.example:55`) — der neue Knopf wäre bei dir schlicht nicht aufgetaucht, und
  die nächste Sitzung hätte ihn gesucht. Die Adresse trägt jetzt `?v=71`, `CACHE_VERSION`
  und `ASSET_V` und alle 22 Verweise mitgezogen.
- **`tests/smoke_markt_melden.mjs` flackerte** und wurde repariert. Ursache war nicht die
  Wartezeit allein: das Melde-Fenster **schließt sich 2,2 Sekunden nach dem Erfolg selbst**
  (`markt.html`, `setTimeout(closeReport, 2200)`), und auf einer beschäftigten Maschine
  kostet jeder Zugriff des Tests eine halbe Sekunde. Die letzte Prüfzeile las den
  Bildschirm, wenn die Seite ihn längst aufgeräumt hatte. Der Test schreibt jetzt über
  einen Beobachter mit, was angezeigt *wurde*, statt hinterher nachzusehen. Lehre für
  jeden künftigen Test hier: **wo die Seite selbst aufräumt, reicht „auf das Ergebnis
  warten" nicht — es muss mitgeschrieben werden.**

---

## 1b. Der erste echte Lauf (2026-08-01) — und was er zutage brachte

**Der Knopf funktioniert.** Klaus hat ihn gedrückt, Commit `4e16ec2` liegt auf `main`,
`assets/config/listings-vec.json` existiert: 14 Vektoren, 8,1 KB, echtes Modell
`Xenova/multilingual-e5-small`, dim 384, alle vollständig. Die Kette Studio → Server →
GitHub trägt.

**Und trotzdem brachte er nichts.** Nachgemessen mit dem echten Codec gegen die echten
Einträge: nur **4 von 14** Vektoren hätte die Leseseite genutzt. Gegenprobe gegen den
alten Dateistand macht die Ursache eindeutig:

| Vergleich gegen | passende Hashes |
|---|---|
| `listings.js` **aktuell** (nach #135, 31.07.) | 4/14 |
| `listings.js` **alt** (vor #135, 26.07.) | **14/14** |

Klaus' Browser hielt eine `listings.js` vom 26.07. fest. `markt.html` lädt sie **ohne
`?v=`**, Caddy cacht `*.js` sieben Tage, und am 31.07. wurden die Marktplatz-Texte
umformuliert. Der Knopf rechnete über Texte, die live nicht mehr standen.

**Merk dir die Form dieses Fehlers, sie kommt wieder:** nichts stürzte ab, die Meldung
sagte „14 Einträge", der Hash-Wächter verwarf die falschen still und rechnete nach. Alles
funktionierte — es brachte nur nichts. Ohne Nachmessen wäre es nie aufgefallen. *(Positiv:
der Hash-Wächter hat im Echtbetrieb genau das getan, wofür er gebaut wurde. Falsch
sortiert hat nie etwas.)*

### Drei Reparaturen

1. **Der Knopf holt die Einträge frisch vom Server** (`frischeListings()`,
   `cache: "no-store"`) statt aus `window.FP_LISTINGS`. Der veröffentlichte Stand ist der
   richtige Bezugspunkt. Ungespeicherte Änderungen blockieren den Bau („erst
   Veröffentlichen") — sonst entstünde dasselbe Problem von der anderen Seite.
2. **Ladebalken im Studio.** Klaus' Befund: *„keinen Ladebalken, ich sehe nicht, wie weit
   es ist oder ob gerade etwas hakt."* Bei ~30 MB Download ist das der Unterschied
   zwischen „läuft" und „hängt". Jetzt beide Phasen mit Balken, wandernder Balken bei
   unbekannter Länge, Fehlermeldungen bleiben stehen statt als Toast zu verschwinden.
3. **Caddy-Regel für `/assets/config/*`** in `Caddyfile.example`: 300 s statt 7 Tage. Das
   sind **Daten**-Dateien, die das Studio ohne Deploy neu schreibt — ein `?v=NN` hilft dort
   grundsätzlich nicht, weil die Zahl nur beim Deploy steigt. **Muss Klaus am Server
   einspielen** (Hetzner Cloud, `/opt/relay/Caddyfile`), sonst erscheint eine freigegebene
   App bis zu eine Woche lang nicht. Im Repo geändert, am Server **ungeprüft**.

`tests/smoke_studio_vectors.mjs` steht bei **26/26**, mit zwei neuen Gegenproben belegt:
Balken ausgebaut → (14)(15)(16) rot; frisches Holen ausgebaut → (20)(21) rot.
Cache-Version **v72**.

---

## 2. Was du tun musst, damit es wirkt

**Schritt 1 — `server/marktplatz-api.php` per WebFTP hochladen.**
Hetzner **Webhosting S** (konsoleH), Ordner `Heim / public_html / formular` — dorthin, wo
`einreichung.php`, `freigabe-config.php` und `warteschlange.jsonl` schon liegen.
**Kontrolle ist das Wort `commit_vectors` im Inhalt, nicht die Dateigröße.** Steht es
drin, ist die neue Fassung oben (2x in `marktplatz-api.php`, 0x in `einreichung.php`).

Warum nicht die Größe: Im selben Ordner liegt `einreichung.php` mit 10.798 Bytes =
**10,54 KB**, die neue `marktplatz-api.php` hat 10.844 Bytes = **10,59 KB**. 46 Bytes
Unterschied. Am 2026-08-01 sah Klaus die falsche Datei an und hielt sie an der Größe für
die richtige — verständlich, die Zahlen sind praktisch gleich. **Lehre für jede künftige
Server-Datei: eine Größenangabe taugt nur als Kontrolle, wenn vorher gemessen ist, dass
die Nachbardateien nicht ähnlich groß sind. Sonst ein Wort nennen, das nur in der neuen
Fassung vorkommt.**

**Alles unter `server/` wird nie durch einen Merge oder ein Deploy aktualisiert.** Ohne
diesen Schritt läuft weiter die alte Fassung, der Knopf meldet `unknown_action`, und man
sucht den Fehler im Browser.

**Schritt 1 ist erledigt** (2026-08-01, Datei liegt oben, `commit_vectors` antwortet).

**Schritt 2 — Vektoren NEU bauen.** Der erste Lauf ist wegen des Cache-Befunds (Abschnitt
1b) nur zu 4/14 brauchbar. **Vorher Hard-Reload**, sonst läuft noch der alte Studio-Code
und der Fehler wiederholt sich. Dann Langdruck auf das Copyright, Passwort, Knopf.
Erfolgsmerkmal jetzt sichtbar: Balken für „Hole den veröffentlichten Stand" → „Lade
Sprachmodell … NN %" → „Rechne Vektoren … 14/14" → „Vektoren gebaut: 14 Einträge".

**Schritt 2b — Caddy-Regel am Server einspielen** (Abschnitt 1b, Punkt 3). Ohne sie
erscheint jede künftige Freigabe bis zu eine Woche verzögert. Die Regel steht in
`Caddyfile.example`; auf dem Hetzner-Cloud-Server liegt die echte unter
`/opt/relay/Caddyfile`, danach Caddy neu laden.

**Schritt 3 — nachmessen und die Zahl ehrlich aufschreiben.**
Wie lange dauert die erste Bedeutungs-Suche vorher, wie lange nachher? Nicht „fühlt sich
schneller an". Bei 14 Einträgen ist der Unterschied klein; der Sinn zeigt sich bei 100.

**Ungeprüft, wartet auf deinen Browser-Lauf:** der echte Lauf mit dem 30-MB-Sprachmodell
und dem echten Studio-Passwort. Der Test fährt mit einem Modell-Stub — er beweist, dass die
Seiten zusammenpassen, nicht dass das echte Modell auf deinem Tablet durchläuft.

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
(30 Minuten). Ob das zu kurz oder zu lang ist, weiß niemand — es ist geraten, nicht gemessen.
Blockiert nichts, sollte aber vor Stufe 6 vorliegen.

### Stufe 1 — vorberechnete Vektoren ✅ **gebaut und im Echtbetrieb gelaufen**

Leseseite #141, Schreibseite diese Sitzung. Rückfall in Stufen, schlimmster Fall ist genau
das heutige Verhalten:

| Lage | Was passiert |
|---|---|
| Datei fehlt (404) | alles live, wie bisher |
| Modell-Kennung passt nicht | Paket komplett verworfen, alles live |
| einzelner Eintrag fehlt | nur dieser eine live |
| Text seit dem Vorberechnen geändert (Hash) | nur dieser eine live |

**Offen bleibt:** ein zweiter Knopfdruck nach Hard-Reload (der erste war nur zu 4/14
brauchbar, siehe 1b), die Caddy-Regel am Server, und deine Messung (Abschnitt 2).

**Wie man prüft, ob ein Paket wirklich wirkt** — nicht raten, nachrechnen: den echten Codec
(`assets/vec-codec.js`) und die echte `listings.js` in Node laden, für jeden Eintrag
`textHash(x.text || x.label)` gegen das `h` im Paket halten und zählen. Passen nicht alle,
ist das Paket veraltet, egal wie vollständig es aussieht.

### Stufe 2 — `sporeUrl` + tägliche Aktualisierung

Jeder Eintrag bekommt ein Feld `sporeUrl`, das auf die `sbkim/spore.json` im **eigenen Repo
des Anbieters** zeigt (`raw.githubusercontent.com/<owner>/<repo>/main/sbkim/spore.json`).

Das ist deine Antwort auf „ein eigenes Konto wäre dafür doof, aber über sein eigenes Repo
eventuell": Der Anbieter behält seine Spore bei sich, kann sie jederzeit herunterladen und
ändern, und der Marktplatz **liest** sie nur.

Eine **GitHub-Action, einmal täglich**, holt alle hinterlegten Sporen, baut daraus die
Vektoren (derselbe Codec, dieselbe Text-Regel — sonst passen die Hashes nicht) und schreibt
`listings-vec.json` fort. Damit ist der Katalog immer aktuell, ohne dass jemand einen Knopf
drückt. Der Studio-Knopf aus dieser Sitzung bleibt daneben als Hand-Auslöser bestehen.

Wichtig für die Ehrlichkeit: Das ist **Pilz-Schicht**. Der Marktplatz fragt einmal am Tag
öffentliche Dateien ab. Das ist kein Crawler im Mycel und keine Pulsation — es ist ein
benannter, sichtbarer Server-Dienst. Auf der Netzwerk-Seite gehört das so gesagt.

### Stufe 3 — Wächter *(sicherheitsrelevant, sorgfältig bauen)*

Deine Frage war klar: „Wenn jemand seinen Code ändert und Schlimmes drauflegt oder auf einen
Virus verlinkt — kannst du das täglich prüfen? Das muss man ja vollkommen ausschließen
können."

Die ehrliche Antwort zuerst: **vollständig ausschließen kann man es nicht.** Was geht, ist
täglich prüfen, abstufen und im Zweifel sperren. Der Wächter läuft als tägliche Aktion und
stuft dreifach ab:

| Stufe | Auslöser | Folge |
|---|---|---|
| **grün** | nichts auffällig | Eintrag normal sichtbar |
| **gelb** | Ziel-Seite geändert, Prüfung ausstehend | Eintrag sichtbar mit Hinweis |
| **rot** | Google Safe Browsing meldet die URL, Seite nicht erreichbar, oder du sperrst von Hand | Eintrag **auf Eis**, nicht mehr sichtbar |

Bausteine: **Safe Browsing API** gegen die eingetragene URL (kostenlos, Schlüssel nötig) ·
**Prüfsumme der Zielseite** (ändert sie sich → gelb; `action: "fetch"` in
`marktplatz-api.php` holt den Quelltext schon, es war für genau das gedacht) ·
**Handschalter** (`setstatus` kennt `verdacht` und `abgelehnt`) · der **Melde-Knopf** als
menschlicher Kanal ins selbe System.

**Wichtig:** Ein Eintrag darf nie stillschweigend verschwinden. Wer gesperrt wird, muss es
erfahren, und der Grund muss nachlesbar sein.

### Stufe 4 — Melde-Knopf ✅ vollständig fertig und live bewiesen

### Stufe 5 — Bewertung: Lighthouse + Ja/Nein-Stimmen

Deine Vorgabe: Nur Apps, die **nützlich, technisch gut, nutzerfreundlich und optisch gut bis
hervorragend** sind, bleiben auf Dauer. Zwei getrennte Quellen, die nicht vermischt werden
dürfen:

1. **Maschinell messbar — Google Lighthouse.** Vier harte Zahlen: Leistung, Bedienbarkeit,
   gute Praxis, Auffindbarkeit. Kein Geschmacksurteil, sondern eine Messung — genau deshalb
   taugt es nach außen: „diese App erreicht 94 von 100" ist überprüfbar.
2. **Menschlich — Ja / Nein / geht besser.** Drei Knöpfe, keine Sternchen. Sternchen
   verleiten zu Mittelmaß-Klicks.

Dein **Schieberegler** stellt einmalig ein, wie streng gefiltert wird. **Nicht vermischen** —
eine gemittelte Gesamtnote aus Messwert und Stimmen wäre eine Zahl, die nichts mehr bedeutet.

**Offen und von dir zu entscheiden:** Lighthouse braucht entweder die PageSpeed-Insights-API
(Schlüssel, Google sieht die URLs) oder einen eigenen Lauf in der Action (langsamer, aber
niemand sieht mit). Vor dem Bauen fragen.

### Stufe 6 — längeres Lesefenster im Relais

Setzt **Stufe 0** voraus. Der Wert wird angepasst, wenn gemessen ist — nicht vorher.

### Stufe 7 — Gast-Pillen auf der Mycel-Karte

Wer im Marktplatz steht, aber (noch) kein voller Knoten ist, erscheint als **Gast**.

### Stufe 8 — Aufräumen im Relais

Alte Karten verfallen lassen, damit der gemeinsame Raum nicht zuwächst.

---

## 4. Befunde, die notiert, aber nicht gebaut sind

### 4.1 Neun dauerhaft rote Tests in `smoke_all.mjs` — **der nächste Punkt**

`node tests/smoke_all.mjs` steht bei **94 von 103 grün, 9 rot**. Sie sind seit Längerem rot,
**unabhängig** von den Änderungen dieser Sitzung — vorher und nachher gemessen, Zeile für
Zeile identisch:

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
obwohl der Marktplatz inzwischen 14 Apps führt. Der Test ist also **veraltet**, nicht die App
kaputt. Die anderen sind vermutlich derselbe Fall.

**Warum das dringlich ist:** Dauerhaft rote Tests entwerten jede spätere Prüfung. Wer gewohnt
ist, dass neun Zeilen rot sind, übersieht die zehnte. Jeden einzeln ansehen, dann entweder
anpassen oder löschen — aber **nicht** pauschal löschen, ohne zu prüfen, ob dahinter ein
echter Mangel steckt (die beiden `connect:`-Zeilen könnten einer sein).

Ein Verdacht aus dieser Sitzung, der beim Aufräumen zuerst zu prüfen ist: mehrere dieser
Tests arbeiten wie der reparierte Melde-Test mit festen Wartezeiten. Bevor eine Zeile als
„veraltet" gelöscht wird, gehört geprüft, ob sie nur zu früh hinsieht.

### 4.2 Fokus-Markierung kaum sichtbar

An mehreren Stellen wird der Fokusring aktiv entfernt (`assets/style.css:175`, `:363`,
`:424`). Wer mit der Tastatur bedient, sieht nicht, wo er ist. Das schlägt direkt auf den
Lighthouse-Wert durch, den **Stufe 5** messen soll — also am besten vorher richten.

### 4.3 Andere Symbol-Knöpfe haben dasselbe Tablet-Problem

🎤, 📷, ✕ und die Knoten-Status-Knöpfe tragen nur ein `title`-Attribut. Auf einem Touch-Gerät
erscheint das **nie**. Genau das war der Mangel am Melde-Knopf, bis er sichtbaren Text bekam.

### 4.4 `docs/PULS.md` in Sage-Protokol

7.816 Zeilen gegen eine selbst gesetzte Grenze von 3.000. Ältere Sitzungen ins Archiv
auslagern, **nicht kürzen**.

### 4.5 Automatischer Rück-Handshake

Auf `netzwerk.html` steht der ehrliche Stand (Zeile 130): Der server-lose Handshake ist
bewiesen, aber die Gegenseite quittiert nur zurück, wenn ihr Tab **offen und aktiv** ist.
Das ist der eigentliche Grund, warum es die Katalog-Spore überhaupt gibt — sie umgeht das
Problem, statt es zu lösen. Den Text nicht versehentlich in „geht automatisch" umschreiben,
solange es nicht stimmt.

---

## 5. Wie hier gearbeitet wird

- **Messen statt schätzen.** Am 2026-08-01 sah ein Paket vollständig aus (14/14 Vektoren,
  richtiges Modell) und war zu zwei Dritteln wertlos. Sichtbar wurde das erst durch
  Nachrechnen der Hashes. „Sieht fertig aus" ist kein Befund.
- **Cache ist die häufigste Ursache hier, nicht der seltene Sonderfall.** Drei von vier
  Befunden dieser Sitzungen kamen daher: alte `style.css`, alte `studio-markt.js`, alte
  `listings.js`. Bei jedem „das kann doch nicht sein" zuerst fragen: welche Fassung hat der
  Browser wirklich?
- **Gegenprobe zu jedem neuen Wächter.** Den bekannten Fehler absichtlich wieder einbauen
  und prüfen, dass der Test rot wird. Ein Test, der den Fehler nicht fängt, ist wertlos —
  und man merkt es sonst nie.
- **Auf das Ergebnis warten, nie auf die Uhr** — und wo die Seite selbst aufräumt
  (auto-schließende Fenster, Toasts), **mitschreiben statt nachsehen**.
- **Keine Notlösung stehen lassen, deren Notwendigkeit man nicht geprüft hat.**
- **Klaus' Browser-Sichttest ersetzt nichts und wird durch nichts ersetzt.** Headless
  bestätigt Logik; echte Mängel zeigen sich am Tablet.
- **Erst mergen, dann prüft Klaus.** GitHub Pages deployt von `main`.
- **Selbst-Merge-Freibrief gilt** (Klaus 2026-06-28, netzweit). Bei echtem Zweifel erst fragen.
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

1. **Klaus: WebFTP + Knopfdruck + Messung** (Abschnitt 2) — ohne das bringt Stufe 1 nichts.
2. **Die neun roten Tests aufräumen** — je länger sie rot sind, desto weniger sagt jede
   spätere Prüfung aus. Erst prüfen, ob sie nur zu früh hinsehen, dann anpassen oder löschen.
3. **Fokus-Markierung richten** — muss vor Stufe 5 stehen, sonst misst Lighthouse einen
   Mangel, den wir schon kennen.
4. **Stufe 2** (`sporeUrl` + tägliche Aktion) — setzt Stufe 1 vollständig voraus, also
   Punkt 1 dieser Liste.
5. **Stufe 3** (Wächter) — sicherheitsrelevant, vorher über Safe Browsing sprechen.
6. **Stufe 5** (Lighthouse + Stimmen) — vorher die offene Frage aus Abschnitt 3 klären.
7. **Stufe 0** (Relais-Messung, Klaus im Browser), dann **Stufe 6**.
8. **Stufen 7 und 8** zum Schluss.

---

## 7. Sitzungsende, jedes Mal

1. `docs/PULS.md` fortschreiben (Datum, was getan, was offen, was als Nächstes).
2. Bei Andock-Bezug: `sbkim/SIGNAL.json` pflegen (`seq` +1, `headline`, `forNodes`) —
   **das Pushen ist das Signal.** (Reine Marktplatz-Arbeit ist Pilz-Schicht und berührt den
   Briefkasten nicht — dann bleibt `SIGNAL.json` unangetastet, und das gehört gesagt.)
3. Einen **„Nächste Schritte"-Block direkt in die Chat-Antwort** (2–4 Punkte, je ein Satz
   Begründung). Klaus liest den Tab, nicht den Dateibrowser.
4. Einen **neuen Brief wie diesen** schreiben und **vollständig als Codeblock im Chat**
   ausgeben.
