# Brief: Statische Links auf family-projekt.de

**Für die Nachfolgesitzung.** Angelegt 2026-08-05, Klaus' Auftrag: *„Wir werden
das komplett umsetzen, so wie Du es vorgeschlagen hast."*

---

## Der Befund

Auf **keiner** Seite von family-projekt.de steht ein Link zu einer der Apps im
ausgelieferten HTML. Nachgezählt am 2026-08-05:

| Seite | statische Links nach außen |
|---|---|
| `index.html` | **0** |
| `werkzeuge.html` | **0** |
| `markt.html` | **0** |
| `netzwerk.html` | 1 |

Alle Karten baut JavaScript zur Laufzeit:

- `markt.html` → `render()` setzt `document.getElementById("mkListings").innerHTML
  = view.map(card).join("")`, gefüttert aus `assets/config/listings.js`
  (14 Einträge, alle `own: true`).
- `werkzeuge.html` → dasselbe Muster auf `#toolGrid`, gefüttert aus
  `assets/config/meineapps.js` (11) und `publicapps.js` (8).

**Warum das ein Problem ist.** Google führt JavaScript aus, aber in einem
**zweiten, verzögerten Durchgang**. Links, die erst dabei entstehen, werden
später entdeckt und zählen unzuverlässiger; geht beim Rendern etwas schief,
sind sie gar nicht da. Faktisch gibt family-projekt.de damit an **keine** der
Apps verlässlich Empfehlungswert weiter.

**Das passt zum gemessenen Stand:** die Search-Console-Property für
family-projekt.de zeigt (Stand 2026-08-05) nur **4 indexierte Seiten** und
**8 Klicks** im Monat. Klaus' 33 App-Verweise stehen dort — Google sieht sie
womöglich nie.

---

## Was gebaut werden soll

Die Listen **zusätzlich als echtes HTML** in die ausgelieferten Seiten bauen,
erzeugt aus denselben Datendateien. Das JavaScript baut dann darauf auf, statt
aus dem Nichts zu zeichnen.

Vorbild ist das, was in `Perfect-Skin-Beauty/tools/sprachen-bauen.mjs` schon
steht: ein Bauwerkzeug erzeugt aus einer Quelle statische Dateien, ein Wächter
baut nach und vergleicht.

### Umfang

1. `markt.html` — 14 Einträge aus `listings.js`
2. `werkzeuge.html` — 19 Einträge aus `meineapps.js` + `publicapps.js`
3. Ein Bauwerkzeug `tools/statische-listen.mjs`
4. Ein Wächter `tests/smoke_statische_listen.mjs`
5. Der nächtliche Lauf baut mit

---

## Sieben Punkte, an denen es schiefgeht

Die stehen hier, damit die Folgesitzung sie nicht erst selbst entdecken muss.

### 1 · Der Zeitpunkt des Bauens

Der Wächter-Zustand (`wacheVon(x)`, Ampel rot → Link abgeschaltet) kommt aus
`assets/config/spore-stand.json`, und **die schreibt der nächtliche Lauf**. Wird
die statische Liste zu einem anderen Zeitpunkt gebaut, friert sie einen alten
Zustand ein — und eine Seite, die Klaus bewusst auf Eis gelegt hat, bliebe
statisch verlinkt.

**Also:** das Bauwerkzeug läuft in `.github/workflows/vektoren-taeglich.yml`
**nach** dem Wächter-Schritt, in derselben Reihenfolge wie
`tools/tabelle-bauen.mjs` heute. Und: eine rote Ampel bedeutet **kein
statischer Link**, genau wie im JavaScript (`if (w && w.ampel === "rot") url = ""`).

### 2 · CLS — messen, nicht hoffen

Heute hält `.listings:not(.gefuellt)` bzw. `#toolGrid:not(.gefuellt)` Platz
frei, weil der Bereich beim ersten Bild leer ist (siehe `assets/style.css`
Z. ~297 und die Lehre 1 in `forschung/LEHREN.md`).

Ist der Bereich **von Anfang an gefüllt**, ist diese Reserve überflüssig — aber
nur, wenn die statische Liste **genauso hoch** ist wie die gezeichnete. Ist sie
das nicht, entsteht ein neuer Sprung an der Stelle, an der wir gerade einen
beseitigt haben.

**Also:** vorher und nachher mit `node tools/lh-messen.mjs markt.html --trace
--laeufe=3` messen. Erwartung ist eine **Verbesserung**; wenn nicht, sagt der
Trace warum. Kein Umbau der Reserve ohne Messung.

### 3 · Doppelt anzeigen

`render()` überschreibt `innerHTML` — die statische Liste verschwindet also in
dem Moment, in dem das Skript läuft. Das ist **genau richtig** und braucht
keine Sonderbehandlung: der Crawler sieht das Statische, der Besucher das
Gezeichnete. Als Nebengewinn bleibt die Liste stehen, wenn das Skript
ausfällt — das ist heute nicht so.

**Aber:** nicht versehentlich anhängen statt ersetzen. Nach dem Bau einmal im
Browser nachsehen, dass jeder Eintrag **einmal** dasteht, nicht zweimal.

### 4 · Fremde Einträge

Heute sind alle 14 Marktplatz-Einträge `own: true`. Der Marktplatz nimmt aber
**fremde Einsendungen** an (`markt.html` hat ein Einreichungs-Formular).

Ein Link ist eine Empfehlung. Für fremde Einträge gehört deshalb
`rel="nofollow ugc"` an den statischen Link — sonst bürgt family-projekt.de bei
Google für Inhalte, die Klaus nicht kontrolliert. Eigene Einträge bekommen
selbstverständlich einen normalen Link.

**Diese Unterscheidung von Anfang an einbauen**, nicht später nachrüsten: sobald
der erste fremde Eintrag da ist, ist es zu spät, ihn zu übersehen.

### 5 · `rel="noreferrer"` prüfen

Die heutigen JS-Links tragen `rel="noopener noreferrer"`. Für Google ist das
unschädlich, aber `noreferrer` verbirgt die Herkunft — die verlinkte App sieht
in ihrer eigenen Statistik nie, dass der Besuch von family-projekt.de kam.

**Vorschlag:** `noopener` behalten (Sicherheit), `noreferrer` bei **eigenen**
Apps weglassen. Dann kann Klaus in der Search Console jeder App sehen, was ihr
der Marktplatz bringt — und genau darum geht es bei dieser ganzen Arbeit.
Das ist eine Entscheidung, keine Selbstverständlichkeit: **Klaus fragen.**

### 6 · Die eigene Domain schlägt github.io

Bereits am 2026-08-05 einmal passiert und behoben (PR #207): Perfect Skin Beauty
war mit der github.io-Adresse verlinkt, obwohl es `perfectskinbeauty.de` gibt.
`tests/smoke_forschung.mjs` wacht seitdem darüber.

**Die statische Liste erbt die Adressen aus `listings.js`** — der Wächter greift
also automatisch mit. Nichts zusätzlich zu tun, aber wissen sollte man es.

### 7 · Die Reihenfolge

`render()` sortiert nach Relevanz/Vektoren, und das hängt von der Suchanfrage
ab. Die statische Liste hat keine Anfrage.

**Also:** die Reihenfolge aus der Datendatei nehmen, unverändert. Sie ist
stabil, nachvollziehbar und niemand muss sie erklären.

---

## Der Wächter

`tests/smoke_statische_listen.mjs`, mindestens:

1. **Jeder Eintrag aus der Datendatei kommt im HTML als `<a href>` vor** — Zahl
   gegen Zahl, nicht „mindestens einer".
2. **Die Adressen stimmen überein** mit denen in der Datendatei (nicht nur
   irgendwelche Links).
3. **Rote Ampel → kein statischer Link.**
4. **Fremde Einträge tragen `rel="nofollow ugc"`, eigene nicht.**
5. **Nachbauen und vergleichen:** das Werkzeug erneut laufen lassen und mit der
   Datei vergleichen — wer die Datendatei ändert und das Neubauen vergisst,
   wird rot. (Genau wie `Perfect-Skin-Beauty/test/smoke_sprachen.mjs`.)
6. **Das Werkzeug ist idempotent:** zweimal laufen lassen ändert nichts. Beim
   Sprachen-Bauwerkzeug hat genau das gefehlt und bei jedem Lauf eine Zeile
   angehäuft — der Wächter hat es gefangen.

**Und die Gegenprobe fahren**, jede einzelne. Ein Wächter ohne Gegenprobe ist
nur ein grüner Haken (Lehre 5 in `forschung/LEHREN.md`).

---

## Wie der Erfolg gemessen wird

Das hier ist ein Fall für die Forschungsstation — und ein besonders sauberer,
weil wir **vorher** wissen, was wir erwarten.

**Ausgangsstand festhalten** (Search Console, family-projekt.de, 2026-08-05):

- indexierte Seiten: **4**
- Klicks im Monat: **8**

**Erwartung:** die Zahl der indexierten Seiten steigt nicht — es kommen ja keine
Seiten dazu. Steigen sollte, was bei den **verlinkten Apps** ankommt. Sichtbar
wird das in der Search Console jeder einzelnen App, nicht in Lighthouse.

**Ehrlich dazu:** das dauert **Wochen**, nicht eine Nacht. Und es lässt sich
nicht sauber beweisen — es gibt keine Kontrollgruppe. Wer nach zwei Wochen
einen Anstieg sieht, hat einen **Hinweis**, keinen Beweis. Das gehört so ins
Journal, sonst schreiben wir uns einen Erfolg zurecht.

Einen Eintrag in `forschung/JOURNAL.md` anlegen, sobald gebaut ist — mit Datum,
Ausgangszahlen und der Erwartung. **Vorher aufschreiben, was man erwartet,** ist
der einzige Weg, sich hinterher nicht selbst zu belügen.

---

## Pflichtlektüre vorher

1. `forschung/LEHREN.md` — besonders Lehre 1 (Platz reservieren), 2 (erst den
   Trace lesen), 5 (Gegenprobe) und 6 (eine Messung ist eine Stichprobe)
2. `docs/BRIEF_NACH_CLS_MARKTPLATZ.md` — was an `markt.html` schon einmal
   gerichtet wurde und warum
3. `Perfect-Skin-Beauty/tools/sprachen-bauen.mjs` — das Muster, dem dieser Bau
   folgt, samt der Fallen im Kopf-Kommentar
4. `markt.html` Z. ~887–925 (`card()` und `render()`) und `werkzeuge.html`
   Z. ~110–150

## Zum Abschluss

- `forschung/JOURNAL.md` fortschreiben (Ausgangszahlen + Erwartung, siehe oben)
- Selbst-Merge nach dem netzweiten Freibrief, wenn die Wächter grün sind und
  die Gegenproben gefahren wurden
- **„Nächste Schritte"-Block in der Chat-Antwort** — Klaus liest den Chat, nicht
  den Dateibrowser
- Einen neuen Brief für die Folgesitzung schreiben und **vollständig als
  Codeblock im Chat** ausgeben
