# Forschungs-Journal — was sich geändert hat, und warum

Diese Datei hat zwei Verfasser. **Das Werkzeug** (`tools/forschung.mjs`, jede
Nacht) trägt ein, *was* passiert ist: welche Zahl gesprungen ist, welche
Beanstandung verschwunden oder dazugekommen ist. **Eine Sitzung** trägt danach
von Hand ein, *warum* — was gebaut wurde, das diesen Sprung verursacht hat.

Das Werkzeug fasst einen einmal geschriebenen Eintrag nie wieder an. Was hier
an Erklärung steht, bleibt stehen.

Fehlt bei einem Eintrag noch das „Warum“, findet man ihn mit:

```
node tools/forschung.mjs --offen
```

Aus den beantworteten Einträgen wächst `LEHREN.md` — die Regeln, nach denen
die nächste Seite von vornherein gebaut wird.

---

<!-- forschung:auto -->

### 2026-08-05 · Jasons-Tresor

<https://lausiklauskn-png.github.io/Jasons-Tresor/> · Quelle der Zahlen: Google PageSpeed Insights

- **Leistung 83 → 64** (↓ 19)
- Beanstandung weg: leistung: Bildübermittlung verbessern
- Beanstandung weg: leistung: Erzwungener dynamischer Umbruch
- Beanstandung neu: leistung: JavaScript komprimieren
- Beanstandung neu: leistung: Largest Contentful Paint

**Warum:** **Gar nicht.** An der Seite wurde nichts geändert — der letzte Commit
auf `main` ist vom **2026-08-03 22:32**, also vor *beiden* Messungen. Gemessen
wurde beide Male bei Google. Der Absturz um 19 Punkte ist **reines Rauschen**.

Das ist der wertvollste Befund der ersten Nacht, weil er eine Annahme widerlegt:
ich hatte gedacht, Googles Zahl sei stabiler als eine eigene Messung. Ist sie
nicht. Vier weitere unveränderte Seiten in derselben Nacht, ebenfalls zweimal
Google: Kimboard −6, Kim-Bell −1, Mein-Tresor −1, Kimseek ±0. Die Streuung
reicht also bis 19.

**Folge:** die Schwelle für einen Journal-Eintrag ist von 14 auf **20** gesetzt
worden — gemessen, nicht geschätzt. Und eine geänderte Beanstandungsliste allein
löst keinen Eintrag mehr aus (siehe die vier Einträge unter diesem hier).

→ Lehre 6 in `LEHREN.md`, jetzt mit Zahlen statt Vermutung.

### 2026-08-05 · Kim-Bell

<https://lausiklauskn-png.github.io/Kim-Bell/> · Quelle der Zahlen: Google PageSpeed Insights

- Beanstandung weg: leistung: Anfragen zum Blockieren des Renderings
- Beanstandung neu: leistung: Erzwungener dynamischer Umbruch

**Warum:** **Rauschen, kein Ereignis.** Keine Zahl hat sich bewegt (Leistung
97 → 96); es hat nur die Beanstandungsliste gewackelt. „Erzwungener dynamischer
Umbruch" ist in derselben Nacht bei Kim-Bell, Kimseek und mycel-karte **neu
aufgetaucht** und bei Kimboard und Jasons-Tresor **verschwunden** — ohne dass
an einer dieser fünf Seiten etwas geändert wurde. Die Liste wackelt an ihren
eigenen Schwellen.

Solche Wechsel bekommen ab jetzt **keinen eigenen Eintrag** mehr; sie stehen
weiter in der Messreihe und als Begleitinformation in echten Einträgen. Vier
von sechs Einträgen dieser ersten Nacht waren genau das — so hätte das Journal
das Signal binnen einer Woche erstickt.

### 2026-08-05 · Kimseek

<https://lausiklauskn-png.github.io/Kimseek/> · Quelle der Zahlen: Google PageSpeed Insights

- Beanstandung weg: leistung: Effiziente Verweildauer im Cache verwenden
- Beanstandung neu: leistung: Erzwungener dynamischer Umbruch

**Warum:** Dasselbe wie bei Kim-Bell — Listen-Wackler ohne Bewegung in den
Zahlen (Leistung 99 → 99). Kein eigener Eintrag mehr ab jetzt.

### 2026-08-05 · Kimboard

<https://lausiklauskn-png.github.io/Kimboard/> · Quelle der Zahlen: Google PageSpeed Insights

- Beanstandung weg: leistung: Erzwungener dynamischer Umbruch
- Beanstandung neu: leistung: Reduziere nicht verwendetes JavaScript

**Warum:** Dasselbe Muster, andere Richtung: hier ist „Erzwungener dynamischer
Umbruch" **verschwunden**, während er bei drei anderen Seiten auftauchte.
Leistung 98 → 92, also unter der neuen Schwelle. Kein Ereignis.

### 2026-08-05 · Mein-Mixarium

<https://lausiklauskn-png.github.io/Mein-Mixarium/> · Quelle der Zahlen: Google PageSpeed Insights

- **Leistung 37 → 75** (↑ 38)
- Beanstandung weg: leistung: JavaScript komprimieren
- Beanstandung neu: gute_praxis: Es wurden Browserfehler in der Konsole protokolliert
- Beanstandung neu: leistung: Bildübermittlung verbessern

**Warum:** **Nicht die App — die Messquelle.** Am 4. August lag für Mixarium noch
eine **eigene** Messung vor (37), am 5. August hat es Googles PageSpeed Insights
gemessen (75). An der App wurde in der Zwischenzeit nichts geändert.

Genau davor warnt Lehre 7, und genau hier ist es passiert: Mixarium kam beim
Lauf am 4. August nicht mehr unter den Zehner-Deckel und behielt deshalb seinen
alten, selbst gemessenen Wert; erst in der Nacht darauf war es dran. Der
„Sprung" ist der Wechsel.

**Folge:** das Werkzeug erkennt einen Quellwechsel jetzt selbst und schreibt eine
Warnung an den Anfang des Eintrags. Ohne die liest sich eine Umstellung wie ein
Erfolg — und ich hätte Klaus fast einen gemeldet.

Was der neue Wert **wirklich** sagt: Mixarium steht bei Leistung 75, nicht bei
37. Die App ist also nie so schlecht gewesen, wie die Karte monatelang behauptet
hat.

### 2026-08-05 · mycel-karte

<https://lausiklauskn-png.github.io/mycel-karte/> · Quelle der Zahlen: Google PageSpeed Insights

- Beanstandung weg: leistung: Aufwand für Hauptthread minimieren
- Beanstandung neu: leistung: Erzwungener dynamischer Umbruch

**Warum:** Auch hier ein Quellwechsel (eigene Messung 100 → Google 99), aber ohne
nennenswerten Unterschied — die Karte ist schnell, egal wer misst. Der Eintrag
entstand nur durch den Listen-Wackler („Erzwungener dynamischer Umbruch"), der
in dieser Nacht durch das halbe Netz ging. Kein Ereignis.

<!-- Ab hier schreibt das Werkzeug. Alles UNTERHALB der Trennlinie
     „Vor der Station“ ist von Hand nachgetragene Vorgeschichte. -->

---

## Vor der Station — was vor dem 2026-08-04 geschah

Die Messreihe beginnt am **2026-08-04**. Was davor gebaut wurde, ist in der
Reihe nicht mehr sichtbar; es steht hier, weil es die aussagekräftigsten Fälle
enthält, die wir haben. Die Zahlen stammen aus den Messungen der jeweiligen
Bau-Sitzung, nicht aus der Reihe — deshalb sind sie hier ausdrücklich als
**Vorgeschichte** markiert und nicht in `messreihe.json` eingespeist. Eine
nachträglich erfundene Zeitreihe wäre keine Messung.

### 2026-08-04 · Sage-Protokol — Barrierefreiheit 93 → 97

<https://lausiklauskn-png.github.io/Sage-Protokol/> · Quelle: eigene Messung (Lighthouse 13.4.1, drei Läufe)

- **Barrierefreiheit 93 → 97**
- Beanstandung weg: 21 von 26 Kontrast-Beanstandungen (`--dim`)
- Beanstandung weg: 4 Kontrast-Beanstandungen an den Status-Etiketten

**Warum:** Zwei Bauten am selben Tag, beide reiner Kontrast.

Erstens `--dim`: die abgeblendete Schrift der Seite stand auf
`rgba(245,245,255,0.36)` und kam damit auf **3,08 : 1**. Auf `0.50` angehoben →
**4,99 : 1**. Diese eine Zeile war für **21 der 26** Beanstandungen
verantwortlich — sie wird an sehr vielen Stellen benutzt (`.card-tag` und
Verwandte). Die Abstufung zu `--muted` (0,62) blieb erhalten, damit die Seite
ihre Tiefe behält.

Zweitens die Status-Farben: die restlichen vier Beanstandungen saßen alle an
`.badge`. Der Grund war eine **Doppelrolle** — dieselbe Farbe ist Füllung
(Punkt, Lampe, Diagrammknoten) *und* Schrift im Etikett. Als Schrift auf
dunklem Grund fielen die zwei dunkelsten durch: `schablone` `#92400E` bei
**2,88 : 1**, `stub` `#2563EB` bei **3,95 : 1**. Beide auf demselben Farbton
aufgehellt → `#A9714B` (5,01 : 1) und `#4479EE` (5,07 : 1).

Beim Aufhellen war die Falle, dass Braun zu **Orange** wird — und Orange ist
schon `werkstatt`. Deshalb ein gedämpftes Erdbraun statt eines hellen Orange;
Abstand im Lab-Raum 49,7 zu `#EA580C`. Die verbindliche Tafel
(`docs/INTERFACES.md §5`) wurde dabei **zuerst** nachgezogen, dann der Code.

Der Wächter (`tests/smoke_lighthouse_module.mjs`) rechnet jetzt beide Rollen
nach und prüft zusätzlich, dass CSS-Variable und JS-Karte dasselbe sagen — die
stehen 2000 Zeilen auseinander und driften sonst lautlos.

→ Lehre 4 und Lehre 5 in `LEHREN.md`.

### 2026-08-04 · family-projekt.de / Werkzeuge — CLS 0,188 → 0, Barrierefreiheit 98 → 100

<https://family-projekt.de/werkzeuge.html> · Quelle: eigene Messung (drei Läufe)

- **Sprung (CLS) 0,188 → 0**
- **Barrierefreiheit 98 → 100**

**Warum:** Der Werkzeug-Bereich wird von einem Skript gefüllt und war beim
ersten Bild leer — der Seitenfuß rutschte hoch und beim Füllen wieder runter.
Der **Trace** zeigte das; der Bericht allein hatte nur den Container genannt.
Behoben durch reservierten Platz, der beim Zeichnen wieder freigegeben wird
(`#toolGrid:not(.gefuellt){min-height:70vh}` + `classList.add("gefuellt")`).
Die zwei Punkte bei der Barrierefreiheit kamen von der Überschriften-Ordnung
(die Karten trugen `h3` ohne `h2` darüber).

→ Lehre 1 und Lehre 2 in `LEHREN.md`.

### 2026-08-04 · Tomys Hub — Einstiegsseite 46 → 86

<https://lausiklauskn-png.github.io/Tomys-Hub/> · Quelle: eigene Messung, am echten Server bestätigt

- **Leistung 46 → 86**
- **Barrierefreiheit → 100**
- 57 KiB Bilder gespart

**Warum:** Drei Dinge, in dieser Reihenfolge nach Wirkung.

Der große Hebel war der **WebGL-Hintergrund**: er lief beim Seitenstart mit und
blockierte den Hauptthread genau dann, wenn die Seite sichtbar werden soll.
Jetzt wird er erst **nach `load`** und über `requestIdleCallback` geladen —
und er bekam eine **Selbstbremse**: fällt die Bildrate unter eine Schwelle,
hört er von selbst auf, statt weiter zu rechnen.

Zweitens die **Bilder**: nicht kleiner gerechnet, sondern als **WebP**
ausgeliefert — gleiche Abmessung, gleiche Schärfe, ein Bruchteil der Bytes.

Drittens der **Kontrast**: zwei neue Zwischentöne (`--ink-2`, `--ink-3`) statt
`opacity` auf ganzen Gruppen. `opacity` schlägt jede Farbwahl darin; wer den
Kontrast über die Farbe repariert, während darüber `opacity` liegt, repariert
nichts.

**Nachspiel, das eine eigene Lehre wert war:** nach der Beschleunigung fielen
Tests um, die vorher grün waren. Der Verdacht „ich habe etwas kaputtgemacht“
war falsch — die Tests waren grün gewesen, **weil die Seite zu langsam war**.
Bewiesen durch 9 Sekunden Wartezeit auf unverändertem `origin/main`: derselbe
Fehlschlag.

→ Lehre 3 und Lehre 5 in `LEHREN.md`.

### 2026-08-04 · Alle Marktplatz-Einträge — Messquelle auf Google umgestellt

<https://family-projekt.de/markt.html> · Quelle: ab jetzt Google PageSpeed Insights

- Quelle der Zahlen: eigene Messung → Google PageSpeed Insights (10 von 14 Einträgen)

**Warum:** Klaus' Befund war, dass die Zahl auf der Marktplatz-Karte nicht zu
der Zahl auf dem verlinkten Bericht passte (Mein Mixarium: 37 auf der Karte,
76 im Bericht). Meine erste Erklärung — „anderer Rechner“ — war **falsch**; das
Schaufenster stand in derselben Nacht auf demselben Rechner bei 63 gegen 65.
Die wirkliche Ursache: eine **einzelne** Messung einer schweren Seite ist eine
Stichprobe, keine Zahl (zwei lokale Läufe ergaben 33 und 51).

Konsequenz auf Klaus' Anweisung: die Karte zeigt jetzt **dieselbe Quelle**, auf
die sie verlinkt. Mit hinterlegtem Schlüssel (`PSI_API_KEY`) holt der nächtliche
Lauf die Zahl von Googles PageSpeed Insights; ohne Schlüssel misst er weiter
selbst. Welcher Weg es war, steht in jeder Messung im Feld `quelle` und auf der
Karte.

→ Lehre 6 und Lehre 7 in `LEHREN.md`.
