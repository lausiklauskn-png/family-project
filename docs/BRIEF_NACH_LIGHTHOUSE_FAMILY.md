# Sitzungsbrief — nach dem Lighthouse-Durchgang an family-projekt.de

**Stand: 2026-08-02, nachts.** Selbsterklärend, setzt kein Wissen aus der
Vorsitzung voraus.

---

## 0. Pflichtlektüre, bevor eine Zeile Code entsteht

1. **Diesen Brief.**
2. **`docs/PULS.md`**, oberster Eintrag — was gemacht wurde und was bewusst nicht.
3. **`docs/BRIEF_LIGHTHOUSE_VERBESSERUNGEN.md`** — die Arbeitsordnung gilt
   unverändert. Besonders **§ 5.1** (Bildmaße nur mit `height:auto`) und
   **§ 3** (was gar nicht reparierbar ist).
4. **`docs/DEPLOY.md`** — diese Seite läuft **nicht** auf GitHub Pages.

---

## 1. Was am 2026-08-02 geschehen ist

Klaus' PageSpeed-Bericht: **Leistung 40 · Barrierefreiheit 89 · Best Practices
96 · SEO 100** (Mobil).

Zwei PRs, beide gemergt:

- **#185** — Startseite: Übertragung 2960 → 698 KiB, Barrierefreiheit 89 → 100.
- **#186** — Selbst-Bremse für den 3D-Hintergrund: Blockierzeit 161.640 →
  6.610 ms, Leistung 31 → 60 (drei Läufe: 60/60/59).

**Die Ursache stand nicht in Googles Vorschlagsliste.** Lighthouse schlug
„JavaScript komprimieren" (870 ms) und „nicht verwendetes JavaScript" (450 ms)
vor. Tatsächlich verursachte `assets/mycel-bg.js` **40.411 von 41.800 ms**
Hauptthread-Arbeit — nicht das *Laden* von three.js, sondern die
**Dauer-Renderschleife**. In Klaus' Bericht waren **alle zwanzig** längsten
Aufgaben dieselbe Datei.

**Lehre für den nächsten Durchgang:** Die Vorschlagsliste nennt, was leicht zu
zählen ist. Die Diagnose-Abschnitte weiter unten im Bericht („Aufwand für
Hauptthread minimieren", „Lange Hauptthread-Aufgaben vermeiden") nennen, was
wirklich weh tut. **Zuerst dorthin sehen.**

---

## 2. ⚠ Das Wichtigste zuerst: Klaus' Sichttest steht aus

Beide PRs sind gemergt, der Cron zieht sie binnen zwei Minuten live. **Niemand
hat die Seite seither im Browser gesehen.** Drei Dinge gehören angesehen:

1. **Dreht sich der Mycel-Hintergrund noch?** Die Selbst-Bremse soll auf dem
   Tablet **nie** greifen (dort ~60 Bilder/s, Schwelle bei 20). Steht er still,
   ist die Schwelle falsch gewählt — dann in `assets/mycel-bg.js`
   `BREMS_SCHWELLE` prüfen, **nicht** die Bremse ausbauen.
2. **Sieht das Bild des Tages gut aus?** Es ist jetzt WebP mit 1536 Punkten
   Breite statt PNG mit 1983. Gemessen ist es fast identisch (Ø-Abweichung 3,4
   von 255), aber Klaus' Auge zählt mehr als die Zahl. Bei Streifen oder
   Unschärfe: `docs/BILDER-VERKLEINERN.md`, höhere Qualität wählen.
3. **Sind die App-Symbole in der Weekly Discovery scharf?** Auch WebP.

**Hard-Reload nicht vergessen** (Strg+Shift+R). Die Versionsnummer steht auf
`v86`.

---

## 3. Was bei Klaus liegt — Server, nicht Repo

**Cache-Kopfzeilen einschalten.** In Klaus' Bericht steht bei **jeder** Datei
„Cache-TTL: None". Jeder Wiederbesuch lädt alle 2.984 KiB neu.

Fertige Anleitung mit kopierfertigem Befehl **und Nachweis-Befehl**:
**`docs/CADDY-CACHE.md`**. Gehört auf den **Hetzner-Cloud-Server**
(`root@ubuntu-…:~#`), nicht aufs Tablet.

**Ehrlich:** Diese Prüfung ist bei Google „Nicht bewertet" — sie bringt
**keine Punkte**. Sie hilft Wiederbesuchern und spart Datenvolumen.

`Caddyfile.example` im Repo ist bereits nachgezogen, **aber am Server noch
nicht bestätigt**. Wer das liest: eine Vorlage im Repo ist kein Beweis für den
Server. Erst der `curl`-Nachweis zählt.

---

## 4. Was NICHT gemacht wurde — damit es niemand zweimal sucht

- **„JavaScript komprimieren" (133 KiB).** Trifft fast nur `sbkim/*.js`. Das
  sind **byte-gleiche Kopien aus dem Sage-Kanon**; minifizieren erzeugt Drift.
  Wenn überhaupt: in Sage reparieren und von dort zurückholen.
- **„Nicht verwendetes JavaScript" (100 KiB).** Ausschließlich three.js.
  Wegzuschneiden bräuchte einen Bau-Schritt; die Seite ist bau-frei.
- **„Nicht zusammengesetzte Animationen" (11 Elemente).** Das ist die
  Holo-Schrift — Erkennungsmerkmal der Seite. Der Prüfpunkt ist unbewertet,
  kostet also nichts. Nur anfassen, wenn Klaus die Optik ändern will.
- **`markt.html` (100 KiB).** Nicht angefasst. Dort liegt eine eigene, offene
  Bauaufgabe (vorberechnete Vektoren ab ~20 Einträgen, Tafel-Entscheid
  2026-07-31) — **kein Lighthouse-Fix**.
- **`relay.family-projekt.de` löst nicht auf.** Alter Befund, liegt bei Klaus.

---

## 4b. ⭐ HIER GEHT ES WEITER: `markt.html` (Klaus, 2026-08-02 abends)

Klaus hat nach den Merges alle vier Seiten selbst bei PageSpeed gemessen und
entschieden: **„Fangen wir mit dem Markt an, der sieht am schlimmsten aus."**
Das ist der Auftrag für die nächste Sitzung.

### Klaus' echte Messwerte (Mobil, 2026-08-02 gegen 23:17 Uhr)

| Seite | Leistung | Barrierefreiheit | Best Practices | SEO |
|---|---|---|---|---|
| Startseite | **68** (vorher 40) | **100** (vorher 89) | 96 | 100 |
| `netzwerk.html` | **98** | 96 | 96 | 100 |
| `werkzeuge.html` | **60** | 94 | 96 | 100 |
| **`markt.html`** | **45** ← hier weiter | 96 | 96 | 100 |

Die Startseite ist damit **bestätigt** von 40 auf 68 gestiegen, die
Barrierefreiheit von 89 auf 100. Das ist Klaus' eigene Messung, keine
Nachbildung.

**Ein Befund, der die Diagnose stützt:** `netzwerk.html` trägt **denselben**
three.js-Hintergrund und erreicht trotzdem 98. Sie hat nur kein 2,4-MB-Bild.

### Was an `markt.html` wirklich fehlt — schon gemessen

Nachgemessen am 2026-08-02 auf der Caddy-Nachbildung (Leistung 45, identisch
mit Klaus' Wert):

| | Wert | Urteil |
|---|---|---|
| **CLS (Layout-Sprünge)** | **0,853** | ⚠ **DAS ist der Hauptposten.** Grün wäre unter 0,1. |
| Blockierzeit | 5.000 ms | Szenen-Aufbau von three.js, siehe § 5 Punkt 1 |
| LCP | 1,8 s | gut |
| Erster sichtbarer Inhalt | 1,8 s | gut |
| Übertragung | 547 KiB | in Ordnung |

**Die Ursache des Sprungs ist eingegrenzt:** Lighthouse benennt `<main>` mit
einem Anteil von **0,8535**. In `markt.html` Zeile ~89 steht

```html
<div class="listings" id="mkListings"></div>
```

— **leer**, gefüllt wird erst später per JavaScript (Zeile ~902,
`box.innerHTML = view.map(card).join("")`). Bis dahin hat der Container keine
Höhe; sobald die Einträge kommen, schiebt sich alles darunter nach unten.

**Ansatz:** dem Container vorab Platz reservieren (`min-height` passend zur
üblichen Anzahl, oder Platzhalter-Karten in der Höhe einer echten Karte).
**Vorher messen, wie hoch eine Karte tatsächlich ist** — nicht schätzen.

### ⚠ Was an `markt.html` NICHT angefasst werden darf

Die Seite rechnet beim Besuch Vektoren für die Marktplatz-Suche. Dazu gibt es
eine **eigene Tafel-Entscheidung vom 2026-07-31** (unter ~20 Einträgen bleibt
es lazy, darüber kommen vorberechnete Vektoren). **Das ist eine offene
Bauaufgabe, kein Lighthouse-Fix.** Der CLS-Fix oben kommt ohne sie aus.

Ebenfalls dort: `assets/vec-codec.js` und `assets/studio-markt.js` tragen noch
`?v=84`, absichtlich — sie wurden am 2026-08-02 nicht geändert, ein Cache-Bust
ohne Änderung wäre unnötig.

### Danach `werkzeuge.html` (60)

Auch schon gemessen. Drei **echte** Barrierefreiheits-Fehler, alle vom selben
Typ wie die an der Startseite behobenen:

1. **Fußzeilen-Kontrast 4,38:1** — dieselbe Zeile `opacity:.7` wie an der
   Startseite. Dort auf `.85` gesetzt (5,99:1), hier noch offen. Der gleiche
   Handgriff steht in `index.html` als Vorlage.
2. **Überschriften-Sprung** bei `div#toolGrid > a.glass > h3`.
3. **Sichtbarer Text passt nicht zum Vorlese-Namen** bei drei Knöpfen im Kopf
   (`#fpReload`, `#langBtn`, `#themeBtn`): das `aria-label` enthält den
   sichtbaren Text nicht. Beispiel: sichtbar „DE / EN", vorgelesen „Sprache
   umschalten, Deutsch oder Englisch". Regel: der sichtbare Text muss im
   Vorlese-Namen **vorkommen**. Diese Knöpfe stehen in **jeder** Seite —
   einmal richtig gemacht, hilft es überall.

---

## 5. Wo noch echte Punkte liegen (nach der Messung)

Nach der Selbst-Bremse liegt die Leistung bei ~60. Was übrig bleibt:

1. **Der Aufbau der Szene selbst** kostet noch rund 7,9 s Hauptthread — das ist
   three.js beim Anlegen der Punktwolke, **bevor** die Bremse greifen kann.
   Ein Ansatz wäre, die Zahl der Partikel auf schwachen Geräten kleiner zu
   wählen. **Das ändert das Aussehen → Klaus fragen**, nicht selbst entscheiden.
2. **LCP liegt bei 4,2 s.** Der größte Rest ist „Verzögerung beim Rendern des
   Elements" — also blockierter Hauptthread, siehe Punkt 1. Kein eigener Fix.
3. **Die anderen Seiten** (`markt.html`, `netzwerk.html`, `werkzeuge.html`)
   sind **nie gemessen worden**. Nur die Startseite. Dort kann dasselbe
   Bild- und Skript-Muster liegen.

---

## 6. Eine offene Kleinigkeit

`tests/smoke_cache_version.mjs` prüft nur `style.css`, `app.js` und
`status-widget.js` auf ihr `?v=NN`. **`mycel-bg.js` trägt seit 2026-08-02 auch
eines, wird aber nicht bewacht.** Wer dort das nächste Mal etwas ändert, muss
selbst daran denken. Den Wächter zu erweitern wäre ein sauberer kleiner
Handgriff — mit Gegenprobe.

---

## 7. Arbeitsweise (gilt unverändert)

- **Ursache statt Symptom.** Eine Zahl schöner machen, ohne zu verstehen, warum
  sie niedrig war, ist keine Verbesserung.
- **Ändern, dann messen.** Kein „das müsste helfen".
- **Immer eine Gegenprobe.** Am 2026-08-02 hat genau das einen echten Mangel im
  neuen Wächter gefunden: die Prüfung blieb 16/16 grün, obwohl die geprüfte
  Zeile entfernt war. Eine Prüfung, die nie rot war, beweist nichts.
- **Ehrlich auflisten, was NICHT gemacht wurde — und warum.**
- **Nie behaupten, die Punktzahl steige.** Das zeigt erst die nächste Messung.
- **Selbst mergen** nach dem netzweiten Freibrief.
- **Am Ende einen neuen Brief schreiben** und als Codeblock im Chat ausgeben.

### Werkzeug, das jetzt bereitsteht

Lighthouse **13.4.1** (dieselbe Fassung, die Klaus' Bericht erzeugt) lässt sich
auf der Bau-Maschine installieren: `npm install lighthouse@13.4.1`. Die Seite
selbst ist gesperrt (403), aber ein **Mess-Server, der Caddy nachbildet**
(gzip an, **keine** Cache-Kopfzeilen), trifft die echten Werte erstaunlich
genau — am 2026-08-02 auf's Byte beim Bild und auf den Punkt bei der
Barrierefreiheit. **Ohne gzip misst man den Prüf-Server, nicht die Seite.**
