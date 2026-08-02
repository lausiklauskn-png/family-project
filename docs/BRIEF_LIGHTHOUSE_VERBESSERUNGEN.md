# Brief für die nächste Sitzung — Lighthouse-Verbesserungen umsetzen

**Auftrag von Klaus, 2026-08-02:** Bevor weiter geprüft wird, arbeiten wir die
Verbesserungs-Vorschläge ab, die Google Lighthouse gemacht hat. App für App,
von oben nach unten, **beginnend mit Mixarium**.

Dieser Brief ersetzt für die nächste Sitzung nicht `BRIEF_NAECHSTE_SITZUNG.md`
(der bleibt der allgemeine Stand), sondern legt die **Arbeitsordnung für genau
diese Aufgabe** fest.

---

## 0. Zuerst: kann die Sitzung die Berichte überhaupt lesen?

**Nein, nicht selbst holen.** Von der Bau-Maschine sind gesperrt:
`pagespeed.web.dev`, `*.github.io`, `family-projekt.de`. Die Sitzung kann also
weder einen Bericht abrufen noch die Live-Seite ansehen.

**Ja, wenn Klaus sie schickt.** Dann liest die Sitzung sie vollständig. Bester
Weg, in dieser Reihenfolge:

1. **JSON-Datei** — in PageSpeed Insights ganz unten „Bericht herunterladen"
   bzw. in Chrome DevTools → Lighthouse → Download-Symbol. Das ist die
   vollständige Fassung mit **allen** Prüfungen, den betroffenen Dateien und
   den Ersparnissen in Kilobyte und Millisekunden. Damit kann die Sitzung
   genau sagen, welche Zeile welchen Wert kostet.
2. **Bildschirmfotos** — geht auch, ist aber lückenhaft: die aufgeklappten
   Details fehlen meist, und genau dort steht, *welche* Datei gemeint ist.
3. Gar nichts — auch dann ist die Sitzung nicht blind: die drei wichtigsten
   Hinweise je Kategorie stehen bereits in
   `family-project/assets/config/spore-stand.json` (siehe unten). Was fehlt,
   sind die Details.

**Klaus muss nichts sortieren.** Einfach alle Dateien schicken; die Sitzung
ordnet sie den Apps selbst zu (im Bericht steht die geprüfte Adresse).

---

## 1. Die Reihenfolge — schwächster Leistungswert zuerst

Gemessen am 2026-08-02 (Lighthouse 13.4.1). Die Spalte „Repo" ist die, die
angefasst wird — **nicht raten**, mehrere Marktplatz-Einträge zeigen auf eine
**Page**, nicht auf die App:

| # | App | L / B / G / A | **Repo, das bearbeitet wird** |
|---|---|---|---|
| 1 | **Mixarium** | **39** / 87 / 100 / 100 | `Mein-Mixarium-Page` ⚠ nicht `Mein-Mixarium` |
| 2 | Kimboard | 62 / 90 / 96 / 100 | `Kimboard` |
| 3 | BookLedgerPro | 65 / 91 / 100 / 100 | `BookLedgerPro` |
| 4 | Mein-Tresor | 69 / 84 / 100 / 100 | `Mein-Tresor` |
| 5 | Jasons-Tresor | 73 / 92 / 100 / 100 | `Jasons-Tresor` |
| 6 | Perfect Skin Beauty | 92 / 96 / 100 / 100 | `Perfect-Skin-Beauty` |
| 7 | Kim-Bell | 95 / 100 / 100 / 90 | `Kim-Bell` |
| 8 | Perfect Skin Fashion | 96 / 94 / 96 / 100 | `Perfect-Skin-Fashion` |
| 9 | Kimseek | 99 / 93 / 100 / 100 | `Kimseek` |
| 10 | Mycel-Karte | 99 / 87 / 100 / 100 | `mycel-karte` |

Noch **nicht** gemessen (kommen im nächsten nächtlichen Lauf dran, dann
nachziehen): Tomys Hub · Privat-Brain · Mein-WorkFloh · `Mein-Rezeptbuch-Page`.

---

## 2. Was wir schon wissen — ohne Klaus' Berichte

Aus `spore-stand.json`, je Kategorie die drei lohnendsten:

**Mixarium (39)** — `Mein-Mixarium-Page`
- Leistung: *Reduce unused JavaScript* (450 ms) · *Total Blocking Time* ·
  *Use efficient cache lifetimes*
- Bedienbarkeit: *zu wenig Farbkontrast* · *Links sind nur an der Farbe zu
  erkennen*
- Gute Praxis: *fehlende Source-Maps*

**Kimboard (62)**
- Leistung: *Minify JavaScript* (600 ms) · *Reduce unused JavaScript* (150 ms) ·
  *Use efficient cache lifetimes*
- Bedienbarkeit: *Auswahlfelder ohne Beschriftung* · *Tippziele zu klein oder zu
  dicht* · *kein `main`-Landmark*
- Gute Praxis: *Browser-Fehler in der Konsole* ← **den zuerst ansehen, das ist
  oft ein echter Fehler und keine Kosmetik**

**BookLedgerPro (65)**
- Leistung: *Minify JavaScript* (900 ms) · *Largest Contentful Paint* ·
  *Use efficient cache lifetimes*
- Bedienbarkeit: *zu wenig Farbkontrast* · *Tippziele zu klein* · *kein
  `main`-Landmark*

**Mein-Tresor (69)**
- Leistung: *Minify JavaScript* (450 ms) · *Largest Contentful Paint* ·
  *Use efficient cache lifetimes*
- Bedienbarkeit: *verbotene ARIA-Attribute* · *zu wenig Farbkontrast* ·
  *Auswahlfelder ohne Beschriftung*

**Jasons-Tresor (73)**
- Leistung: *Largest Contentful Paint* · *Use efficient cache lifetimes* ·
  *Improve image delivery*
- Bedienbarkeit: *Auswahlfelder ohne Beschriftung* · *Tippziele zu klein* ·
  *sichtbarer Text stimmt nicht mit dem zugänglichen Namen überein*

---

## 3. ⚠ Was NICHT reparierbar ist — und warum das gesagt gehört

**„Use efficient cache lifetimes" steht bei ALLEN zehn Apps.** Das sind die
Cache-Kopfzeilen, die **GitHub Pages** setzt (zehn Minuten). Die kann niemand
von uns ändern — es gibt dort keine Konfiguration dafür.

Das ist keine Ausrede, das ist ein Befund: **jeder Anbieter, der auf GitHub
Pages liegt, verliert hier Punkte, egal wie sauber er baut.** Wer das ändern
will, müsste umziehen (Klaus' Hetzner-Caddy setzt eigene Kopfzeilen — das wäre
ein eigenes, größeres Thema).

Ebenfalls praktisch nicht lohnend:
- **„Missing source maps"** — bei einer Einzeldatei-PWA ohne Bau-Schritt gibt
  es nichts abzubilden. Wir liefern absichtlich lesbaren Quelltext aus.
- **„Total Blocking Time" / „Largest Contentful Paint"** sind keine eigenen
  Mängel, sondern **Folgen** der anderen. Sie verschwinden, wenn das
  JavaScript kleiner wird — nicht durch einen eigenen Handgriff.

**Regel: Was nicht reparierbar ist, wird Klaus GESAGT und nicht still
übergangen.** Sonst sucht die übernächste Sitzung dieselbe Sackgasse noch mal.

---

## 4. Die Arbeitsordnung je App

Immer dieselben sechs Schritte, eine App nach der anderen. **Erst die nächste
App anfangen, wenn die vorige gemergt ist** — sonst weiß am Ende niemand, welche
Änderung welchen Wert bewegt hat.

1. **Frisch aufsetzen.**
   `git -C <repo> fetch origin --quiet && git -C <repo> checkout -B claude/<scope> origin/main`
2. **Die Hausordnung des Repos lesen** — `CLAUDE.md`. Sie ist bei jedem anders,
   und ein Verstoß macht mehr kaputt, als der Punktgewinn wert ist (§5).
3. **Klaus' Bericht lesen** und in zwei Listen sortieren:
   *lohnt sich und ist sicher* ↔ *lohnt sich nicht / geht nicht* (mit Grund).
4. **Die sichere Liste umsetzen.** Kleine, benannte Schritte. Nichts
   „nebenbei" mitmachen.
5. **Beweisen, dass nichts kaputt ist:** die Tests des Repos laufen lassen,
   `CACHE_VERSION`/`ASSET_V` hochziehen, wenn eine ausgelieferte Datei
   berührt wurde, alle `?v=`-Verweise mitziehen.
6. **PR anlegen, selbst mergen** (Freibrief), und Klaus **in einem Satz je
   Änderung** sagen, was getan wurde und was bewusst liegen blieb.

**Gemessen wird erst danach.** Der nächtliche Lauf misst je Nacht zehn Apps —
die neuen Werte stehen also am Morgen nach dem Merge im Marktplatz. Wer
schneller wissen will, ob es geholfen hat, lässt Klaus die Aktion von Hand
starten (Actions → *Run workflow*); aus einer Sitzung geht das nicht (403).

---

## 5. ⚠ Die Fallen je Repo — hier wird es gefährlich

Ein Performance-Fix, der die Hausordnung bricht, ist ein Rückschritt. **Vor der
ersten Zeile Code die `CLAUDE.md` des Repos lesen.** Die wichtigsten:

- **`Mein-Mixarium`** — `index.html` und `QC_Mixarium_*.html` müssen
  **byte-identisch** bleiben (`md5sum` prüfen, steht als Pflicht-Checkliste in
  der Hausordnung). *Achtung: die gemessene Adresse ist aber
  `Mein-Mixarium-Page` — ein anderes Repo. Erst prüfen, welches gemeint ist.*
- **`Mein-Rezeptbuch` / `Muttis-Rezeptbuch`** — `index.html` wird **gebaut**
  (`python3 build.py`), niemals von Hand bearbeitet. Und: der GitHub-Default-
  Branch von `Mein-Rezeptbuch` ist **nicht** `main` — immer gegen `origin/main`
  arbeiten.
- **`BookLedgerPro`** — **build-frei**, native ES-Module, **keine Bundler, keine
  CDNs**. „Minify JavaScript" darf also **nicht** durch einen Bau-Schritt gelöst
  werden. Und `CACHE_VERSION` in `sw.js` hochziehen ist dort Pflicht.
- **`Mein-Tresor` / `Jasons-Tresor`** — der Krypto-Kern zwischen
  `JASONLIB-CORE-START..END` bleibt **byte-gleich**, Wurzel und Spiegel
  identisch. Dort wird nichts „aufgeräumt".
- **Alle SBKIM-Apps** — die Dateien unter `sbkim/` sind **Kopien aus dem
  Sage-Kanon**. Wer dort etwas ändert, erzeugt Drift. Findet sich ein Mangel in
  einem geteilten Modul: **in Sage reparieren und von dort zurückholen**, nicht
  vor Ort.

**Und über allem:** offline-first bleibt, keine CDNs, kein fremder Code, keine
neuen Laufzeit-Abhängigkeiten. Eine App, die zehn Punkte gewinnt und dafür
online sein muss, hat verloren.

---

## 6. Was erfahrungsgemäß am meisten bringt

Nach den Zahlen oben, in dieser Reihenfolge:

1. **„Reduce unused JavaScript" / „Minify JavaScript"** — der mit Abstand
   größte Hebel (450–900 ms). Bei Einzeldatei-PWAs heißt das meistens: etwas
   Großes wird geladen, das die Startseite gar nicht braucht. **Erst
   nachsehen, was es ist**, bevor irgendwas verkleinert wird — oft lässt es
   sich schlicht später laden statt kleiner machen.
2. **„Browser errors were logged to the console"** (Kimboard) — das ist
   oft ein **echter Fehler**, kein Optik-Punkt. Zuerst ansehen.
3. **Farbkontrast** — billig zu beheben, hilft echten Menschen, und wir haben
   dieselbe Sache am eigenen Widget schon einmal repariert (Modul 17,
   2026-08-01). Die Rechnung dort ist die Vorlage.
4. **Auswahlfelder ohne Beschriftung · Tippziele zu klein · fehlendes
   `main`-Landmark** — kleine, saubere Handgriffe mit echtem Nutzen am Tablet.
5. **„Improve image delivery"** (Jasons-Tresor) — Bildgrößen. Vorsicht bei
   data-URIs: ein größeres Bild in einer Einzeldatei-App kostet doppelt.

---

## 7. Am Ende jeder App

- **`docs/PULS.md` des jeweiligen Repos** fortschreiben: was geändert, was
  bewusst nicht, welcher Wert vorher stand.
- In `family-project/docs/PULS.md` **eine Zeile** je App, damit die Übersicht
  an einer Stelle bleibt.
- Klaus **ehrlich** berichten: welche Vorschläge umgesetzt wurden, welche nicht
  und warum. Besonders die nicht reparierbaren (§3) — die stehen sonst nächstes
  Mal wieder auf der Liste.
- **Nicht behaupten, der Wert sei jetzt besser.** Das sagt erst die nächste
  Messung. Bis dahin heißt es: „umgesetzt, Wirkung ungeprüft."

---

## 8. Wie hier gearbeitet wird (gilt unverändert)

- **Messen statt schätzen.** „Sieht besser aus" ist kein Befund.
- **Zu jeder Änderung mit Logik eine Gegenprobe**, und nachzählen, dass der
  eingebaute Fehler wirklich im Code landet.
- **Bei einer Layout-Probe die LAGE mit aufbauen, in der der Fehler entstehen
  kann** — sonst misst man an ihm vorbei (Lehre vom 2026-08-02).
- **Kopieren, nicht klonen — aber Diff LESEN vor Überschreiben.**
- **Erst mergen, dann prüft Klaus.** GitHub Pages deployt von `main`.
- **Selbst-Merge-Freibrief gilt** (Klaus 2026-06-28, netzweit).
- **Einzelschritte für Klaus**, keine Terminal-Befehle ohne Angabe, auf welche
  Maschine sie gehören.
