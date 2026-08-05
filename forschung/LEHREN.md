# Lehren — wie man eine Seite baut, die von Anfang an gut ist

Diese Datei ist das Ziel der ganzen Forschungsstation. `messreihe.json` sammelt
Zahlen, `JOURNAL.md` sammelt Erklärungen — **hier** steht, was daraus für die
**nächste** Seite folgt. Reine Handarbeit: kein Werkzeug schreibt hier hinein.

Der Maßstab ist **Perfect Skin Beauty**. Diese Seite war vom ersten Tag an gut,
ohne dass jemand sie nachbessern musste. Jede Regel hier beantwortet die Frage:
*was hat diese Seite von Anfang an richtig gemacht, das eine andere erst nach
drei Nachbesserungen gelernt hat?*

> **Stand 2026-08-05.** Die Reihe läuft seit dem 4. August. Die erste Nacht hat
> gleich zwei Regeln unten geschärft (6 und 7) und eine dritte hinzugefügt (6b) —
> alle drei aus gemessenen Daten, nicht aus Vermutung. Genau dafür ist die
> Station da.
> Wo eine Regel noch nicht durch einen gemessenen Vorher/Nachher-Vergleich
> gedeckt ist, steht das ausdrücklich dabei. Ehrlichkeit vor Vollständigkeit —
> eine erfundene Regel wäre schlimmer als eine fehlende.

---

## 1. Was Platz braucht, bekommt den Platz **vorher** — nicht wenn es fertig ist

**Gemessen:** `werkzeuge.html` auf family-projekt.de, CLS 0,188 → **0**.

Ein Bereich, den erst ein Skript füllt, ist beim ersten Bild leer. Der Fuß der
Seite rutscht dann nach oben und beim Füllen wieder nach unten — das ist der
Sprung, den Lighthouse als CLS misst. Die Lösung ist nicht schnelleres
Skript, sondern **reservierter Platz**:

```css
#toolGrid:not(.gefuellt) { min-height: 70vh; }
```

und im Skript, nach dem Zeichnen, genau einmal:

```js
grid.classList.add("gefuellt");
```

**Regel für neue Seiten:** jeder Container, der später von JavaScript gefüllt
wird, bekommt von Anfang an eine Mindesthöhe, die beim Füllen wieder freigegeben
wird. Nicht per Klassen-Sammelbegriff (`.areas`), sondern **auf die eine ID
gemünzt** — sonst reserviert man auch dort Platz, wo schon Inhalt steht.

### 1b. Ein leerer Kasten verbirgt den Sprung, der unter ihm liegt

**Gemessen:** `markt.html`, CLS 0 → 0,006 → 0, drei Läufe je Stand.

Am 2026-08-05 bekam `markt.html` ihre Einträge zusätzlich als statisches HTML.
Vorher war der Bereich beim ersten Bild leer, CLS lag bei 0. Danach lag er bei
0,006 — und der Trace zeigte, dass sich **nicht** die neue Liste bewegt hatte,
sondern die Zeile darüber (`#mkCount`, leer → „14 / 14", +31 px).

Dieser Sprung war die ganze Zeit da. Chrome zählt aber nur, was **gemalt** wird:
ein leerer Kasten, der sich verschiebt, malt nichts. Die Null davor war also
keine Abwesenheit des Fehlers, sondern seine Verdeckung.

**Regel:** wer einen bisher leeren Bereich füllt, misst danach neu — auch wenn
der Wert vorher schon 0 war. Eine 0 an einem leeren Container ist kein Beweis,
dass darüber alles ruhig steht. Und die Reserve aus Regel 1 gilt auch für
**eine einzelne Textzeile**, die erst ein Skript setzt; sie ist nicht nur etwas
für grosse Raster.

## 2. Zuerst den Trace lesen, dann die Ursache benennen

**Erfahrung, zweimal teuer bezahlt.** Der Lighthouse-*Bericht* nennt bei einem
Sprung nur den *Container*. Welcher Knoten sich wirklich bewegt hat, steht
ausschließlich im **Trace** (`res.artifacts.Trace`, Ereignis `LayoutShift`,
darin `impacted_nodes` mit `old_rect`/`new_rect`).

Bei Sage-Protokol hätte ich auf die Bilder getippt — der Trace zeigte einen
Kopfbereich, der Knoten um bis zu 311 px nach oben zog. Die Vermutung war
plausibel und falsch.

**Regel:** keine Aussage über eine Ursache ohne den Trace. Ein plausibler
Verdacht ist kein Befund.

## 3. Beim Bild ist meistens das **Format** das Problem, nicht die Größe

**Gemessen:** Tomys Hub, 57 KiB gespart, Einstiegsseite 46 → 86.

Man liest den Befund „Bild zu groß“ und verkleinert die Abmessungen — und
verliert Schärfe, ohne viel zu sparen. Fast immer liegt es am Format: dasselbe
Bild als WebP ist ein Bruchteil des PNG, bei gleicher Abmessung und gleicher
Schärfe.

**Regel:** Bilder in **Anzeigegröße × 2** ausliefern (scharf auf guten
Bildschirmen) und **als WebP**. `width`/`height` gehören ins Tag — aber nur
zusammen mit `height: auto` im CSS, sonst verzerrt es.

**Nebenlehre aus dem Vergleich zweier Icons:** wenn ein Vergleich „maximale
Abweichung 255“ meldet, ist das fast sicher **Transparenz**, nicht Qualität.
Bei vollständig durchsichtigen Bildpunkten ist der Farbwert beliebig. Beide
Bilder erst auf Weiß legen, dann vergleichen — dann waren es 1,72 von 64.

## 4. Eine Farbe hat oft zwei Rollen — gemessen wird die schwierigere

**Gemessen:** Sage-Protokol, Barrierefreiheit 93 → 97.

Die Status-Farben dort sind gleichzeitig **Füllung** (Punkt, Lampe, Diagramm)
und **Schrift** (Text im Etikett). Als Füllung ist ein dunkles Braun gut, als
Schrift auf dunklem Grund fällt es durch (2,88 : 1 statt 4,5 : 1).

**Regel:** eine Farbe in **beiden** Rollen messen, bevor man sie festschreibt —
und beim Aufhellen prüfen, dass sie nicht zur Nachbarfarbe wird (Braun wird
beim Aufhellen zu Orange; Abstand im Lab-Raum ≥ 25 halten).

**Zweitens:** `opacity` auf einer Gruppe schlägt jede Farbwahl darin. Wer den
Kontrast über die Farbe repariert, während darüber ein `opacity: .7` liegt,
repariert nichts.

## 5. Ein Wächter ohne Gegenprobe ist nur ein grüner Haken

**Erfahrung, mehrfach.** Ein Test, der grün ist, weil er nichts prüft, ist
schlimmer als kein Test — er erzeugt Vertrauen ohne Deckung. In Tomys Hub liefen
Tests grün, **weil die Seite zu langsam war**; nach der Beschleunigung fielen
sie um, obwohl nichts kaputt war.

**Regel:** jeder neue Wächter wird **beide Richtungen** gegengeprüft: einmal den
Fehler wieder einbauen (Wächter muss rot werden) und einmal die falsche
Reparatur einbauen (Wächter muss auch rot werden). Erst dann zählt sein Grün.

## 6. Eine einzelne Messung einer schweren Seite ist keine Zahl, sondern eine Stichprobe

**Gemessen, zweimal, mit zwei verschiedenen Messgeräten.**

Erstens auf unserem Rechner: Sage-Protokol lieferte in drei Läufen
hintereinander, dieselbe Datei, **49 · 67 · 36** bei „Leistung“.

Zweitens — und das war die Überraschung — **bei Google genauso**. In der Nacht
vom 4. auf den 5. August lagen fünf Seiten vor, die sich nachweislich nicht
geändert hatten (letzter Commit vom 3. August, also vor beiden Messungen),
beide Male von Googles PageSpeed Insights gemessen:

| Seite | vorher | nachher | |
|---|---|---|---|
| Jasons-Tresor | 83 | 64 | **−19** |
| Kimboard | 98 | 92 | −6 |
| Kim-Bell | 97 | 96 | −1 |
| Mein-Tresor | 72 | 71 | −1 |
| Kimseek | 99 | 99 | ±0 |

Ich hatte angenommen, Googles Zahl sei stabiler als eine eigene Messung. **Ist
sie nicht.** Die Streuung an einer unveränderten Seite reicht bis 19 Punkte.

Deshalb steht die Schwelle der Forschungsstation auf **20** — gemessen, nicht
geschätzt. Wer sie senkt, holt sich das Journal voll mit Sprüngen, die keine
sind.

**Regel:** drei Läufe, bei Leistungszahlen nie den einen guten nennen — und ein
Sprung unter 20 Punkten ist erst dann eine Verbesserung, wenn er die **nächste**
Messung übersteht.

## 6b. Auch die Mängelliste wackelt — ein neuer Befund ist noch kein neuer Fehler

**Gemessen, dieselbe Nacht.** „Erzwungener dynamischer Umbruch“ tauchte bei
Kim-Bell, Kimseek und mycel-karte **neu auf** und verschwand gleichzeitig bei
Kimboard und Jasons-Tresor. An keiner der fünf Seiten war etwas geändert worden.
Die Liste wackelt an ihren eigenen Schwellen, genau wie die Zahl.

Vier von sechs Journal-Einträgen der ersten Nacht waren genau das. Ohne
Gegenmaßnahme hätte das Rauschen binnen einer Woche das Signal erstickt.

**Regel:** eine geänderte Beanstandungsliste **allein** ist kein Ereignis. Sie
wird aufgezeichnet und als Begleitinformation gezeigt, löst aber keinen
Journal-Eintrag aus. Handeln erst, wenn ein Befund **mehrere** Messungen lang
stehen bleibt.

## 7. Woher die Zahl kommt, gehört zur Zahl

**Erfahrung, an Mein Mixarium.** Eigene Messung und Googles PageSpeed Insights
können bei derselben Seite weit auseinanderliegen. Wer beides nebeneinander
zeigt, ohne die Quelle zu nennen, erzeugt einen Widerspruch, den niemand
auflösen kann.

**Regel:** jede gespeicherte Messung trägt ihre Quelle mit (`quelle`), und die
Anzeige nennt sie. In der Messreihe steht sie in jedem Punkt.

**Und es ist prompt wieder passiert.** In der ersten Nacht sprang Mein Mixarium
von **37 auf 75** — ohne dass eine Zeile geändert wurde. Am 4. August lag noch
eine eigene Messung vor, am 5. August hatte Google gemessen. Ich hätte das
beinahe als Erfolg gemeldet.

Deshalb erkennt das Werkzeug einen Quellwechsel jetzt **selbst** und schreibt
eine Warnung an den Anfang des Eintrags. Eine Regel, die nur in einer Doku steht,
hilft in dem Moment nicht, in dem man sie braucht — sie muss im Werkzeug sitzen.

---

## Was wir noch nicht wissen

Ehrlich benannt, damit keine Sitzung so tut, als wäre das hier schon eine
Theorie:

- **Warum Perfect Skin Beauty von Anfang an gut war**, ist noch nicht
  auseinandergenommen. Es ist die interessanteste offene Frage der Station.
- **Ob „Effiziente Verweildauer im Cache verwenden“ auf GitHub Pages überhaupt
  behebbar ist** — der Befund steht bei fast jeder Seite, und GitHub Pages lässt
  keine eigenen Cache-Kopfzeilen zu. Wenn nicht behebbar, gehört er als
  bekannte, unvermeidbare Beanstandung markiert, statt jede Nacht neu zu
  irritieren.
- **Ob Landingpage oder App die besseren Zahlen liefert** und woran das liegt.
  Die Reihe misst beide getrennt; bei Mein Mixarium standen sie am 2026-08-04
  bei 37 (App) gegen 63 (Landingpage).
