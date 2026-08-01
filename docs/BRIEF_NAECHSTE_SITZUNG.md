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
5. `Caddyfile.example` — der Kopf erklärt, warum diese Datei jahrelang in die Irre führte

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
überlasten diese Maschine (Last 7), und dann misst man Rauschen statt Ergebnissen.

---

## 1. Was in dieser Sitzung fertig wurde

| PR | Inhalt |
|---|---|
| #145 | **Katalog-Spore Stufe 1, Schreibseite:** Studio-Knopf „Vektoren bauen" + `commit_vectors` |
| #146 | Kontrolle der Server-Datei: eindeutiges Wort statt Dateigröße |
| #147 | Vektor-Bau rechnet frisch vom Server + Ladebalken |
| #148 | Studio zeigt den echten Vektor-Stand + Bericht als PDF |
| #149 | Nur rechnen, was sich geändert hat |
| #150 | **Die neun roten Tests aufgeräumt — `smoke_all` 107/107 grün** |
| #151 | Spenden-Link auf PayPal.Me (+ drei Schwester-Repos) |
| #152 | `Caddyfile.example` zeigt den echten Server, falsche Erklärung korrigiert |

Cache-Version steht auf **v74**.

### Katalog-Spore Stufe 1 ist im Echtbetrieb bewiesen

Klaus hat den Knopf gedrückt, die Datei liegt auf `main`, und sein PDF-Bericht zeigt
**14 von 14 Einträgen abgedeckt**. Unabhängig nachgerechnet mit dem echten Codec gegen die
echte `listings.js`: 14 bedient, **0 live nachzurechnen**. Die Kette Studio → Server →
GitHub → Leseseite trägt.

Der Knopf rechnet nur noch, was sich geändert hat: **ein geänderter Text → 1 Einbettung
statt 14.** Bei 1000 Apps und drei Änderungen wären es drei statt tausend. Ändert sich
nichts, gibt es keinen Commit und die ehrliche Meldung „Nichts zu tun".

### Vier Befunde, die diese Sitzung zutage gefördert hat

Alle vier haben dieselbe Form, und die ist es wert, gemerkt zu werden: **es funktionierte
alles, und es brachte nichts.** Nichts stürzte ab, keine Fehlermeldung, kein rotes Signal.
Sichtbar wurden sie nur durch Nachmessen.

**1. Das erste Vektor-Paket war zu zwei Dritteln wertlos.** 14 Vektoren gebaut, 4
brauchbar. Klaus' Browser hielt eine fünf Tage alte `listings.js` fest, während die Seite
live neuere Texte zeigte. Der Hash-Wächter der Leseseite verwarf die falschen still und
rechnete nach — er tat genau, wofür er gebaut wurde, und deshalb fiel es niemandem auf.
*Behoben: der Knopf holt die Einträge jetzt frisch vom Server.*

**2. Drei Test-Zeilen prüften seit Monaten nichts mehr.** Das Einreich-Formular hatte ein
neues Pflichtfeld bekommen; der Browser blockierte das Absenden, es passierte gar nichts,
und der Test las ein leeres Ausgabefeld. Er meldete Fehlschlag und *sah aus wie ein Test*.
*Behoben: alle Pflichtfelder gefüllt, POST abgefangen, auf das Ergebnis gewartet.*

**3. Die Kontrollgröße für den WebFTP-Schritt war unbrauchbar.** „10,59 KB" — im selben
Ordner liegt `einreichung.php` mit 10,54 KB. 46 Bytes Unterschied. Klaus sah die falsche
Datei an und hielt sie für die richtige, völlig zu Recht.
*Behoben: Kontrolle ist jetzt ein Wort, das nur in der neuen Fassung vorkommt.*

**4. `Caddyfile.example` war nie der Server.** Die „sieben Tage Cache", mit denen diese
Sitzung ein echtes Problem erklärt hat, standen nur in der Repo-Vorlage. Auf dem Server
gab es *gar keine* Cache-Regel. Die Erklärung klang gut belegt und war falsch.
*Behoben: die Vorlage zeigt jetzt den echten Stand, die falsche Behauptung ist an allen
vier Stellen korrigiert — jeweils mit dem Hinweis, was daran falsch war.*

### Die Lehre, die alle vier verbindet

**Ein Beleg aus dem Repo ist kein Beleg über die Wirklichkeit.** Eine Vorlage, eine
Kontrollgröße, ein grüner Test, ein vollständig aussehendes Paket — alle vier sahen aus
wie Beweise und waren keine. Wer eine Aussage trifft, misst dort, wo sie gilt:

| Aussage über | messen mit |
|---|---|
| den Server | `curl -sI <url> \| grep -i cache-control` |
| ein Vektor-Paket | Hashes gegen die echte `listings.js` nachrechnen |
| einen Test | den Fehler absichtlich einbauen und prüfen, dass er rot wird |
| eine hochgeladene Datei | ein Wort suchen, das nur die neue Fassung enthält |

---

## 2. Was Klaus noch offen hat

**Nichts Blockierendes.** Alle Schritte aus der Sitzung sind erledigt und belegt:

- ✅ `marktplatz-api.php` hochgeladen, `commit_vectors` antwortet
- ✅ Vektoren gebaut, 14/14 abgedeckt
- ✅ Caddy-Regel eingespielt (`max-age=300` am Server nachgewiesen)
- ✅ PayPal.Me-Link in allen vier Repos

**Eine Kleinigkeit für später:** Auf dem Server meldet Caddy beim Neuladen
*„Caddyfile input is not formatted"*. Rein kosmetisch, die Konfiguration ist gültig. Wer
mag, räumt es mit `docker exec caddy caddy fmt --overwrite /etc/caddy/Caddyfile` auf.

**Was headless nicht prüfbar ist und auf Klaus' Browser wartet:** die Stand-Anzeige und der
Ladebalken im Studio unter echten Bedingungen (30-MB-Modell, echtes Passwort). Der Test
fährt mit einem Modell-Stub — er beweist, dass die Seiten zusammenpassen, nicht dass das
Modell auf dem Tablet durchläuft.

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

### Stufe 1 — vorberechnete Vektoren ✅ **fertig und im Echtbetrieb bewiesen**

Rückfall in Stufen, schlimmster Fall ist genau das frühere Verhalten:

| Lage | Was passiert |
|---|---|
| Datei fehlt (404) | alles live, wie bisher |
| Modell-Kennung passt nicht | Paket komplett verworfen, alles live |
| einzelner Eintrag fehlt | nur dieser eine live |
| Text seit dem Vorberechnen geändert (Hash) | nur dieser eine live |

**Wie man prüft, ob ein Paket wirklich wirkt** — nicht raten, nachrechnen: den echten Codec
(`assets/vec-codec.js`) und die echte `listings.js` in Node laden, für jeden Eintrag
`textHash(x.text || x.label)` gegen das `h` im Paket halten und zählen. Seit dieser Sitzung
macht das Studio dieselbe Rechnung selbst und zeigt sie an — für eine unabhängige
Gegenprobe bleibt der Node-Weg trotzdem wertvoll.

### Stufe 2 — `sporeUrl` + tägliche Aktualisierung *(der nächste Bau-Schritt)*

Jeder Eintrag bekommt ein Feld `sporeUrl`, das auf die `sbkim/spore.json` im **eigenen Repo
des Anbieters** zeigt (`raw.githubusercontent.com/<owner>/<repo>/main/sbkim/spore.json`).

Das ist Klaus' Antwort auf „ein eigenes Konto wäre dafür doof, aber über sein eigenes Repo
eventuell": Der Anbieter behält seine Spore bei sich, kann sie jederzeit herunterladen und
ändern, und der Marktplatz **liest** sie nur.

Eine **GitHub-Action, einmal täglich**, holt alle hinterlegten Sporen, baut daraus die
Vektoren (derselbe Codec, dieselbe Text-Regel — sonst passen die Hashes nicht) und schreibt
`listings-vec.json` fort. Der Studio-Knopf bleibt daneben als Hand-Auslöser.

**Wichtig für die Umsetzung:** die Action muss dieselbe Spar-Logik nutzen wie der Knopf
(bestehendes Paket laden, nur Geändertes rechnen) — sonst rechnet sie jede Nacht alles neu.

Ehrlichkeit: Das ist **Pilz-Schicht**. Der Marktplatz fragt einmal am Tag öffentliche
Dateien ab. Kein Crawler im Mycel, keine Pulsation — ein benannter, sichtbarer
Server-Dienst. Auf der Netzwerk-Seite gehört das so gesagt.

### Stufe 3 — Wächter *(sicherheitsrelevant, sorgfältig bauen)*

Klaus' Frage war klar: „Wenn jemand seinen Code ändert und Schlimmes drauflegt oder auf
einen Virus verlinkt — kannst du das täglich prüfen? Das muss man ja vollkommen
ausschließen können."

Die ehrliche Antwort zuerst: **vollständig ausschließen kann man es nicht.** Was geht, ist
täglich prüfen, abstufen und im Zweifel sperren.

| Stufe | Auslöser | Folge |
|---|---|---|
| **grün** | nichts auffällig | Eintrag normal sichtbar |
| **gelb** | Ziel-Seite geändert, Prüfung ausstehend | Eintrag sichtbar mit Hinweis |
| **rot** | Safe Browsing meldet die URL, Seite nicht erreichbar, oder Klaus sperrt von Hand | Eintrag **auf Eis** |

Bausteine: **Google Safe Browsing API** (kostenlos, Schlüssel nötig) · **Prüfsumme der
Zielseite** (`action: "fetch"` in `marktplatz-api.php` holt den Quelltext schon — es war für
genau das gedacht) · **Handschalter** (`setstatus` kennt `verdacht` und `abgelehnt`) · der
**Melde-Knopf** als menschlicher Kanal ins selbe System.

**Wichtig:** Ein Eintrag darf nie stillschweigend verschwinden. Wer gesperrt wird, muss es
erfahren, und der Grund muss nachlesbar sein.

### Stufe 4 — Melde-Knopf ✅ fertig und live bewiesen

### Stufe 5 — Bewertung: Lighthouse + Ja/Nein-Stimmen

Klaus' Vorgabe: Nur Apps, die **nützlich, technisch gut, nutzerfreundlich und optisch gut
bis hervorragend** sind, bleiben auf Dauer. Zwei getrennte Quellen, die nicht vermischt
werden dürfen:

1. **Maschinell messbar — Google Lighthouse.** Vier harte Zahlen: Leistung, Bedienbarkeit,
   gute Praxis, Auffindbarkeit. Kein Geschmacksurteil, sondern eine Messung — genau deshalb
   taugt es nach außen: „diese App erreicht 94 von 100" ist überprüfbar.
2. **Menschlich — Ja / Nein / geht besser.** Drei Knöpfe, keine Sternchen.

Klaus' **Schieberegler** stellt einmalig ein, wie streng gefiltert wird. **Nicht
vermischen** — eine gemittelte Note aus Messwert und Stimmen bedeutet nichts mehr.

**Offen und von Klaus zu entscheiden:** Lighthouse braucht entweder die
PageSpeed-Insights-API (Schlüssel, Google sieht die URLs) oder einen eigenen Lauf in der
Action (langsamer, aber niemand sieht mit). Vor dem Bauen fragen.

### Stufe 6 — längeres Lesefenster im Relais

Setzt **Stufe 0** voraus. Der Wert wird angepasst, wenn gemessen ist — nicht vorher.

### Stufe 7 — Gast-Pillen auf der Mycel-Karte

Wer im Marktplatz steht, aber (noch) kein voller Knoten ist, erscheint als **Gast**.

### Stufe 8 — Aufräumen im Relais

Alte Karten verfallen lassen, damit der gemeinsame Raum nicht zuwächst.

---

## 4. Befunde, die notiert, aber nicht gebaut sind

### 4.1 Fokus-Markierung kaum sichtbar

An mehreren Stellen wird der Fokusring aktiv entfernt (`assets/style.css:175`, `:363`,
`:424`). Wer mit der Tastatur bedient, sieht nicht, wo er ist. Das schlägt direkt auf den
Lighthouse-Wert durch, den **Stufe 5** messen soll — also am besten vorher richten.

### 4.2 Andere Symbol-Knöpfe haben dasselbe Tablet-Problem

🎤, 📷, ✕ und die Knoten-Status-Knöpfe tragen nur ein `title`-Attribut. Auf einem Touch-Gerät
erscheint das **nie**. Genau das war der Mangel am Melde-Knopf, bis er sichtbaren Text
bekam.

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

---

## 5. Wie hier gearbeitet wird

- **Messen statt schätzen.** In dieser Sitzung sah viermal etwas nach einem Beweis aus und
  war keiner: eine Repo-Vorlage, eine Dateigröße, ein grüner Test, ein vollständig
  aussehendes Vektor-Paket. „Sieht fertig aus" ist kein Befund.
- **Cache ist hier die häufigste Ursache, nicht der Sonderfall.** Vier Befunde dieser
  Sitzungen kamen daher. Bei jedem „das kann doch nicht sein" zuerst fragen: welche Fassung
  hat der Browser wirklich?
- **Gegenprobe zu jedem neuen Wächter.** Den Fehler absichtlich einbauen und prüfen, dass
  der Test rot wird. Ein Test, der den Fehler nicht fängt, ist wertlos — und man merkt es
  sonst nie. In dieser Sitzung acht Mal gemacht, acht Mal bestätigt.
- **Auf das Ergebnis warten, nie auf die Uhr** — und wo die Seite selbst aufräumt
  (auto-schließende Fenster, geleerte Statusfelder), **mitschreiben statt nachsehen**.
- **Im Test alles umleiten, was der Code abruft.** Sonst greift er irgendwann auf echte
  Dateien zu und misst etwas anderes, als er glaubt. (Playwright-Globs vergleichen die
  ganze Adresse samt Query — ein `?ts=` bricht die Umleitung.)
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

1. **Fokus-Markierung richten** (4.1) — klein, und muss vor Stufe 5 stehen, sonst misst
   Lighthouse einen Mangel, den wir schon kennen.
2. **Stufe 2** (`sporeUrl` + tägliche Action) — der nächste inhaltliche Schritt. Stufe 1
   ist vollständig, die Grundlage steht.
3. **Stufe 3** (Wächter) — sicherheitsrelevant, vorher mit Klaus über Safe Browsing
   sprechen.
4. **Stufe 5** (Lighthouse + Stimmen) — vorher die offene Frage aus Abschnitt 3 klären.
5. **Stufe 0** (Relais-Messung, Klaus im Browser), dann **Stufe 6**.
6. **Stufen 7 und 8** zum Schluss.

---

## 7. Sitzungsende, jedes Mal

1. `docs/PULS.md` fortschreiben (Datum, was getan, was offen, was als Nächstes).
2. Bei Andock-Bezug: `sbkim/SIGNAL.json` pflegen (`seq` +1, `headline`, `forNodes`) —
   **das Pushen ist das Signal.** Reine Marktplatz-Arbeit ist Pilz-Schicht und berührt den
   Briefkasten nicht; dann bleibt `SIGNAL.json` unangetastet, und das gehört gesagt.
3. Einen **„Nächste Schritte"-Block direkt in die Chat-Antwort** (2–4 Punkte, je ein Satz
   Begründung). Klaus liest den Tab, nicht den Dateibrowser.
4. Einen **neuen Brief wie diesen** schreiben und **vollständig als Codeblock im Chat**
   ausgeben.
