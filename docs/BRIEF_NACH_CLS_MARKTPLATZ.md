# Sitzungsbrief — nach dem CLS-Durchgang an `markt.html`

**Stand: 2026-08-02, tief in der Nacht.** Selbsterklärend, setzt kein Wissen
aus der Vorsitzung voraus.

---

## 0. Pflichtlektüre, bevor eine Zeile Code entsteht

1. **Diesen Brief.**
2. **`docs/PULS.md`**, oberster Eintrag — was gemacht wurde und was bewusst nicht.
3. **`docs/BRIEF_LIGHTHOUSE_VERBESSERUNGEN.md`** — die Arbeitsordnung gilt
   unverändert. Besonders **§ 5.1** (Bildmaße nur mit `height:auto`) und
   **§ 3** (was gar nicht reparierbar ist).
4. **`docs/DEPLOY.md`** — diese Seite läuft **nicht** auf GitHub Pages.

---

## 1. Was am 2026-08-02 nachts geschehen ist (PR #189, gemergt)

`markt.html` sprang beim Laden mit **CLS 0,853**. Jetzt **0**.
Barrierefreiheit **96 → 100**.

### ⚠ Die wichtigste Lehre: der vorige Brief hatte die falsche Ursache

Er schrieb, die beiden Bänder an den Karten (Wächter-Ampel + Messwerte) seien
schuld — sie kommen 470 ms später und lassen jede Karte wachsen. **Das stimmt,
und es kostet trotzdem keinen einzigen CLS-Punkt.** Die Liste beginnt bei
y = 713 px, das Sichtfeld endet bei 823 px: sie wächst **unterhalb** des ersten
Bildes, und was dort passiert, zählt für CLS nicht.

Der Wert, den Lighthouse `<main>` zuschreibt, war **kein Wachstum, sondern
eine Verschiebung um 40 px**. Das steht **nicht** im Bericht — erst im Trace
(`old_rect` → `new_rect`).

**Für den nächsten Durchgang mitnehmen:** Wer bei CLS „was wird größer?" fragt,
sucht am falschen Ort. Die richtige Frage ist **„was verschiebt sich, und was
davon ist im ersten Bild sichtbar?"**

### Drei Ursachen, alle vom selben Bauart-Fehler

Etwas wird **erst vom Skript** in die Seite gehängt — der Browser hat da aber
längst einmal gemalt.

1. `assets/status-widget.js` setzt die Lampen-Leiste ins leere `#fp-dock` →
   Navleiste 245 px breiter → Umbruch → Kopf +40 px → **alles** rutscht mit.
   Allein 0,64 der 0,853 Punkte.
2. `assets/app.js` hängte den „↻ Aktualisieren"-Knopf zur Laufzeit ein —
   derselbe Umbruch noch einmal.
3. `markt.html` zeichnet die Einträge erst am Seitenende. Bis dahin steht der
   Kasten „Eigene App gewünscht?" mitten im Bild und wird danach
   zehntausend Pixel weggeschoben.

Behoben mit `.fp-dock:empty{min-width:246px}` (gemessen, nicht geschätzt),
dem Knopf **fest im Markup aller elf Seiten mit Navleiste**, und
`.listings:not(.gefuellt){min-height:70vh}` + `render()` setzt `gefuellt`.

---

## 2. ⚠ Das Wichtigste zuerst: Klaus' Sichttest steht aus

Der Merge ist durch, der Cron zieht ihn binnen zwei Minuten live. **Niemand
hat die Seite seither im Browser gesehen.** Zwei Dinge gehören angesehen:

1. **Sitzt die Navleiste unverändert?** Der „↻ Aktualisieren"-Knopf steht
   jetzt fest im HTML statt nachgereicht. Er darf **genau einmal** erscheinen,
   an derselben Stelle wie vorher (links von „DE / EN"). Erscheint er doppelt,
   ist die Übernahme-Logik in `mountReloadButton()` schuld — dort steht ein
   `dataset.fpWired`-Riegel.
2. **Klafft irgendwo eine Lücke?** Wenn `status-widget.js` einmal nicht lädt,
   bleiben 246 px in der Navleiste leer stehen. Das ist gewollt (lieber eine
   ruhige Lücke als ein springender Kopf) — aber es sollte im Normalfall
   **nie** sichtbar sein.

**Hard-Reload nicht vergessen** (Strg+Shift+R). Die Versionsnummer steht auf
`v88`.

---

## 3. ⭐ HIER GEHT ES WEITER: `werkzeuge.html`

Nach dem Merge steht sie bei **CLS 0,188** (vorher 0,853) und Barrierefreiheit
**98** (vorher 94). Die Kopfzeilen-Reparaturen haben dort mitgewirkt, ohne dass
die Seite angefasst wurde.

### Was noch offen ist — Ursache ist bekannt, Diagnose steht

**CLS 0,188.** Das ist **dieselbe Bauart wie Ursache 3** oben, nur mit
`#toolGrid` statt der Eintrags-Liste: das Werkzeug-Raster wird vom Skript
gezeichnet, bis dahin ist der Bereich leer, und was darunter steht, rutscht
später weg.

**Ansatz:** dasselbe Muster wie bei den Einträgen — Platz freihalten, solange
das Raster leer ist, und die Reserve abgeben, sobald gezeichnet wurde.
`.listings:not(.gefuellt){min-height:70vh}` in `assets/style.css` ist die
Vorlage; die Klasse setzt `render()` in `markt.html`.

**Vorher nachsehen, ob es wirklich dieselbe Ursache ist** — nicht annehmen.
Der Weg dahin steht in § 5.

**Barrierefreiheit 98.** Ein Mangel bleibt: **Überschriften-Sprung** bei
`div#toolGrid > a.glass > h3`. Der vorige Brief nannte ihn schon; er ist noch
offen. Die beiden anderen, die dort standen (Fusszeilen-Kontrast und die
Kopf-Knöpfe), sind mit PR #189 erledigt.

### Danach `index.html` (Leistung ~55, CLS jetzt 0)

Dort ist der Sprung weg. Was bleibt, ist der **Aufbau der three.js-Szene**:
rund 7–8 s Hauptthread, bevor die Selbst-Bremse überhaupt greifen kann. Ein
Ansatz wäre, die Partikelzahl auf schwachen Geräten kleiner zu wählen — **das
ändert das Aussehen, also Klaus fragen**, nicht selbst entscheiden.

Und: `werkzeuge.html` und `markt.html` haben den `defer`-Umbau noch nicht (nur
`index.html`). **Vorsicht:** vor dem Umstellen dieselbe Abhängigkeitsprüfung
machen wie bei der Startseite — `app.js` darf **nicht** verschoben werden, der
Inline-Block braucht `FP.getLang()` synchron. Die Gegenprobe bricht dort mit
`FP is not defined`.

---

## 4. Was bei Klaus liegt — Server, nicht Repo

**Cache-Kopfzeilen einschalten.** In Klaus' Bericht steht bei **jeder** Datei
„Cache-TTL: None". Jeder Wiederbesuch lädt alles neu.

Fertige Anleitung mit kopierfertigem Befehl **und Nachweis-Befehl**:
**`docs/CADDY-CACHE.md`**. Gehört auf den **Hetzner-Cloud-Server**
(`root@ubuntu-…:~#`), nicht aufs Tablet.

**Ehrlich:** Diese Prüfung ist bei Google „Nicht bewertet" — sie bringt
**keine Punkte**. Sie hilft Wiederbesuchern und spart Datenvolumen.
`Caddyfile.example` im Repo ist nachgezogen, **am Server aber noch nicht
bestätigt**. Eine Vorlage im Repo ist kein Beweis für den Server; erst der
`curl`-Nachweis zählt.

---

## 5. ⭐ Das Werkzeug, das jetzt bereitsteht — und wie man es benutzt

**Echtes Lighthouse 13.4.1 läuft auf der Bau-Maschine.** Das ist der Grund,
warum dieser Durchgang die Ursache gefunden hat statt sie zu raten.

```bash
cd /home/user/family-project
npm install lighthouse@13.4.1 playwright-core --no-save   # beide zusammen, sonst prunt npm
```

Dann ein Mess-Skript, das **Caddy nachbildet** (gzip an, **keine**
Cache-Kopfzeilen) und Lighthouse gegen `127.0.0.1` laufen lässt. Das traf
Klaus' echte Werte auf wenige Punkte genau: gemessen 42/96/96/100 gegen Klaus'
45/96/96/100.

**Drei Dinge, die dabei zwingend sind — jedes einzelne hat mich Zeit gekostet:**

1. **Ohne gzip misst man den Prüfserver, nicht die Seite.**
2. **Ein eigener CLS-Messaufbau mit `PerformanceObserver` reicht NICHT.** Ohne
   Prozessor-Drosselung laden die zwanzig Skripte in Nullzeit, dann steht beim
   ersten Bild schon alles, und CLS ist 0. Ich hatte genau einmal einen
   Zufallstreffer von 0,8535 und danach fünfmal 0,0000 — wer das für ein
   Ergebnis hält, repariert das Falsche. **Lighthouse drosselt selbst vierfach;
   nimm Lighthouse.**
3. **Die Zahl allein sagt nicht, welches Element springt.** `layout-shifts`
   nennt nur das Element (`body > main`). Erst die **Trace-Ereignisse**
   (`res.artifacts.Trace`, Name `LayoutShift`, Feld `impacted_nodes` mit
   `old_rect`/`new_rect`) zeigen, ob etwas gewachsen oder verschoben ist.

**Und der Versuch schlägt die Vermutung.** Der schnellste Schritt war,
`status-widget.js` testweise mit `sed` aus der Seite zu nehmen und noch einmal
zu messen: 0,853 → 0,217. Danach war die Richtung klar. Nachher mit `cp`
zurückstellen.

Bilder umrechnen geht ohne Zusatzprogramm über Chromium; das Rezept samt
Qualitätsmessung steht in `docs/BILDER-VERKLEINERN.md`.

---

## 6. Der neue Wächter — und was er kann und was nicht

`tests/smoke_kein_sprung.mjs` (30 Prüfungen, ~1 Minute).

Er prüft **nicht** die CLS-Zahl, sondern die Eigenschaft dahinter: **die Seite
muss ohne JavaScript schon genauso dastehen wie mit.** Ein Browser mit
abgeschaltetem JavaScript ist die ehrlichste Nachstellung des ersten Bildes —
genau dort steht das Skript noch aus.

Geprüft wird für alle elf Seiten mit Navleiste. Die freigehaltene Dock-Breite
wird **am echten Widget nachgemessen**, nicht mitgeschrieben: sie veraltet also
nicht still, wenn jemand eine Lampe hinzufügt oder umbenennt.

**Er ist gegengeprüft** (sonst bewiese er nichts): Dock-Reserve raus → 7 rot ·
Knopf raus → 2 rot · Listen-Reserve raus → 1 rot · alter Vorlese-Name → 1 rot.
Alles wieder drin → 30/30 grün.

**Was er nicht kann, ehrlich gesagt:** Er misst nicht, was ein echtes Gerät auf
einer echten Leitung erlebt. Das sagt erst Klaus' nächste PageSpeed-Messung.

**Wer `werkzeuge.html` repariert, erweitert ihn** um dieselbe Prüfung für
`#toolGrid` — der Abschnitt „Marktplatz: unter der Liste steht beim ersten Bild
nichts im Sichtfeld" ist die Vorlage.

---

## 7. Was NICHT gemacht wurde — damit es niemand zweimal sucht

- **Die Bänder an den Karten.** Sie wachsen unterhalb des Sichtfelds und kosten
  keinen Punkt. Platz dafür freizuhalten wäre auch nicht sauber möglich: die
  Höhen reichen von 19,7 px („noch nicht gemessen") bis 195,6 px. Der Entwurf
  „Liste sofort, Ampeln gleich danach" bleibt.
- **„JavaScript komprimieren" (133–152 KiB).** Trifft fast nur `sbkim/*.js` —
  **byte-gleiche Kopien aus dem Sage-Kanon**; minifizieren erzeugt Drift. Wenn
  überhaupt: in Sage reparieren und von dort zurückholen.
- **„Nicht verwendetes JavaScript" (100 KiB).** Ausschließlich three.js.
  Wegzuschneiden bräuchte einen Bau-Schritt; die Seite ist bau-frei.
- **„Nicht zusammengesetzte Animationen".** Das ist die Holo-Schrift —
  Erkennungsmerkmal der Seite, und der Prüfpunkt ist unbewertet.
- **`relay.family-projekt.de` löst nicht auf.** Alter Befund, liegt bei Klaus.
  Die Meldung „WebSocket connection failed" kommt vom Browser selbst und ist
  aus dem Code **nicht** zu unterdrücken. Sie kostet die vier Punkte bei
  „Gute Praxis" (96).
- **1.503 KiB Vorschaubilder aus FREMDEN Repos** auf `markt.html`:
  BookLedgerPro `assets/img/og-image.png` 777 KiB · Mein-Rezeptbuch
  `icons/icon-book-blue-512.png` 389 KiB · Tomys-Hub `icons/icon-512.png`
  276 KiB · Mein-Mixarium `mixarium_icon.png` 64 KiB. **Von hier aus nicht
  behebbar.** Dort verkleinern (`docs/BILDER-VERKLEINERN.md`) hilft **beiden**
  Seiten. Eigene Sitzung.
- **Die vorberechneten Vektoren** für die Marktplatz-Suche — offene Bauaufgabe
  mit eigener Tafel-Entscheidung vom 2026-07-31 (unter ~20 Einträgen bleibt es
  lazy), **kein** Lighthouse-Fix.

---

## 8. Ein offener Nebenbefund

`tests/smoke_markt_melden.mjs` meldet **„Hintergrund scrollt nicht, solange das
Fenster offen ist"** als durchgefallen (31 von 32). Das besteht **auch auf
unverändertem `origin/main`** — mit `git stash` gegengeprüft, es kam nicht aus
PR #189. Eigener Fix, eigener Schritt. Wer ihn angeht: erst die Frage aus der
Arbeitsordnung stellen — *wann hat es zuletzt funktioniert, und was hat sich
seitdem geändert?*

---

## 9. Arbeitsweise (gilt unverändert)

- **Ursache statt Symptom.** Eine Zahl schöner machen, ohne zu verstehen, warum
  sie niedrig war, ist keine Verbesserung.
- **Ändern, dann messen.** Kein „das müsste helfen".
- **Immer eine Gegenprobe** — für die Reparatur **und** für den Wächter. Eine
  Prüfung, die nie rot war, beweist nichts.
- **Ehrlich auflisten, was NICHT gemacht wurde — und warum.**
- **Nie behaupten, die Punktzahl steige.** Das zeigt erst die nächste Messung.
  Die Leistungszahl schwankt auf der Bau-Maschine stark: ein Lauf zeigte für
  `index.html` 68, drei Läufe danach dreimal 55 — vorher wie nachher identisch.
  **Drei Läufe, sonst liest man Rauschen.**
- **Selbst mergen** nach dem netzweiten Freibrief.
- **Absolute Pfade in Befehlen.** Die Bash-Arbeitsumgebung springt zurück.
- **Am Ende einen neuen Brief schreiben** und als Codeblock im Chat ausgeben.
