# Sitzungsbrief — nach dem CLS-Durchgang an `werkzeuge.html`

**Stand: 2026-08-03, früh.** Selbsterklärend, setzt kein Wissen aus der
Vorsitzung voraus.

---

## 0. Pflichtlektüre, bevor eine Zeile Code entsteht

1. **Diesen Brief.**
2. **`docs/PULS.md`**, die obersten zwei Einträge — was gemacht wurde, was
   bewusst nicht, und Klaus' Messungen vom Morgen.
3. **`docs/BRIEF_LIGHTHOUSE_VERBESSERUNGEN.md`** — die Arbeitsordnung gilt
   unverändert. Besonders **§ 5.1** (Bildmaße nur mit `height:auto`), **§ 3**
   (was gar nicht reparierbar ist) und **§ 4** (erst mergen, dann die nächste
   App).
4. **`docs/DEPLOY.md`** — family-projekt.de läuft **nicht** auf GitHub Pages.
   Tomys Hub dagegen **schon**. Das ist ein Unterschied, der gleich wichtig wird.

---

## 1. ⭐ HIER GEHT ES WEITER: **Tomys Hub `showcase`**

**Klaus' Wort vom 2026-08-03: „das geht besser."** Das ist der nächste Auftrag,
und er ist ungewöhnlich gut vorbereitet — Klaus hat den **kompletten Bericht in
Einzellisten** geschickt. Es muss also nichts geraten und wenig gemessen werden.

**Repo: `lausiklauskn-png/Tomys-Hub`.** Adresse:
`https://lausiklauskn-png.github.io/Tomys-Hub/showcase/`
Stand 03.08. 07:03 — **Leistung 62 · Barrierefreiheit 89** · Gute Praxis 100 ·
SEO 100.

Zum Vergleich, gleiche Uhrzeit: `Tomys-Hub/workfloh/` steht bei
**95 / 92 / 96 / 100**. Dieselbe Baustelle, zwei sehr verschiedene Werte —
der Unterschied ist ein Hinweis wert.

### Die sechs Befunde, nach Hebel sortiert

**① Hauptthread 40,7 s — davon „Other" 40.190 ms.** Script Evaluation sind nur
335 ms. Das ist **nicht** das Laden von three.js, das ist eine
**Dauer-Renderschleife**. Es ist **exakt die Signatur**, die am 2026-08-02 an
der eigenen Startseite gefunden wurde (`assets/mycel-bg.js`: 40.411 ms von
41.800 ms). Tomys Hub fährt eine Kopie als **`tomy-ui/mycel-bg.js`**.

⚠ **Das ist ein Verdacht, kein Befund.** Die Vorsitzung hat ihn an der eigenen
Seite durch **Ausbauen** bewiesen — ohne Hintergrund sprang die Leistung von 30
auf 68 und die Blockierzeit von 156.000 ms auf 120 ms. **Genau so gehört er
auch dort geprüft, bevor irgendetwas geändert wird.** Der Versuch schlägt die
Vermutung.

Und **wenn** er sich bestätigt: was daraus folgt, ist eine Gestaltungsfrage
(weniger Partikel? Selbst-Bremse früher? Hintergrund nur auf starken Geräten?)
— **das ändert das Aussehen, also Klaus fragen**, nicht selbst entscheiden.

**② Farbkontrast — davon kommt die Barrierefreiheit 89.** Sieben Fundstellen in
drei Gruppen:

| Gruppe | Fundstellen |
|---|---|
| `div.sub` | „Echter Durchlauf durch das Vorlagen-Werkzeug — mit Erklärungen" · „Ein Klick öffnet das Werkzeug mit dem passenden Produkt" · „Ergebnisse — neue Stücke erscheinen hier, sobald sie eingetragen sind" |
| `div.bigbrand` | „Tomy" |
| Links | `<a href="../">` „Werkzeugkasten" · `<a href="../promptgenerator/">` „Vorlagen-Werkzeug" · `<a href="../impressum.html">` „Impressum & Datenschutz" |

Vermutlich **drei CSS-Regeln**, nicht sieben Handgriffe — die drei Links sehen
nach einer gemeinsamen Fuß-/Navigations-Regel aus. Genau der Fall, der hier mit
`opacity:.7 → .85` gelöst wurde. Billigster Punkt im ganzen Bericht, hilft
echten Menschen. Vorlage außerdem: die Rechnung am Widget (Modul 17,
2026-08-01). **Nicht raten** — ausrechnen, bis ≥ 4,5 : 1 steht (≥ 3 : 1 bei
großer Schrift, `.bigbrand` fällt vermutlich darunter), dann nachmessen.

**②b Überschriften-Sprung — genau der Mangel, der hier heute behoben wurde.**
Fundstelle: `<h4>` „1 · Produkt aussuchen". **Die Vorlage liegt in diesem
Repo**: an `werkzeuge.html` gelöst, indem die Überschrift eine Ebene höher ging
und die CSS-Regel beide bedient (`.area h2,.area h3{…}`) — die Optik bleibt
unverändert. Auch die fertige Prüfung liegt da
(`tests/smoke_kein_sprung.mjs`, Abschnitt „Überschriften ohne übersprungene
Ebene"). ⚠ **Erst die ganze Kette der Seite ansehen** (h1 → h2 → …), nicht nur
die gemeldete h4 — sonst rutscht der Sprung eine Stelle weiter.

**③ Bildübermittlung, 192 KiB.** Alle drei liefern viel mehr Pixel als sie
zeigen:

| Bild | geliefert | angezeigt | Ersparnis |
|---|---|---|---|
| `assets/demo-poster.jpg` | 1280 × 720 · 107,8 KiB | 669 × 376 | 78,4 KiB |
| `assets/tomy-handschlag.webp` | 640 × 735 · 79,4 KiB | 215 × 247 | 70,7 KiB |
| `assets/workfloh-demo-poster.jpg` | 1280 × 720 · 58,7 KiB | 669 × 376 | 42,7 KiB |

Derselbe Handgriff wie beim „Bild des Tages" (2393 → 206 KiB) und beim
Marktplatz (1726 → 207 KiB). Rezept: **`docs/BILDER-VERKLEINERN.md`**
(rechnet über Chromium, kein Zusatzprogramm nötig, mit Qualitätsmessung).

**④ Bildmaße fehlen** bei `assets/tomy-handschlag.webp` (zählt auf CLS ein).
Das ist der **saubere** Fall aus § 5.1: das Bild trägt bereits `height:auto` in
seinem eigenen `style`-Attribut — `width`/`height` dazuzuschreiben ist dort
also gefahrlos. **Bei den beiden `.vposter`-Bildern gilt das nicht ungeprüft**;
dort erst die CSS-Regel nachsehen, sonst schnappt die Falle aus § 5.1 zu
(Messzahl besser, Seite schlechter).

**⑤ Rendering-blockierend: `tomy-ui/theme.css`**, 9,0 KiB, 150 ms,
geschätzte Ersparnis 300 ms. Eine einzige kleine Datei im kritischen Pfad.

**⑥ Nicht verwendetes JavaScript, 95,1 KiB** — ausschließlich
`vendor/three.module.min.js` (164,8 KiB übertragen). **Derselbe Punkt, der auf
family-projekt.de bewusst liegen blieb:** wegzuschneiden bräuchte einen
Bau-Schritt, und die Seiten sind bau-frei. Der lohnende Hebel ist nicht,
three.js kleiner zu machen, sondern zu klären, **ob `showcase` es überhaupt
braucht** — und wenn ja, ob es erst nach dem ersten Bild kommen darf.

### Und zwei, die NICHT reparierbar sind — Klaus muss es hören

**„Effiziente Verweildauer im Cache", 402 KiB, zehn Dateien, alle mit
Cache-TTL 10 Minuten.** Das setzt **GitHub Pages**, und dort gibt es keine
Konfiguration dafür (Arbeitsordnung § 3). **Nicht reparierbar, ohne umzuziehen**
— und der Prüfpunkt ist bei Google ohnehin „Nicht bewertet", bringt also keine
Punkte. Das gehört gesagt, sonst sucht die übernächste Sitzung dieselbe
Sackgasse noch einmal.

**„Fehlende Quellzuordnungen" bei `vendor/three.module.min.js`.** Eine fremde,
mitgelieferte Bibliothek ohne eigenen Bau-Schritt — eine Source-Map müsste von
three.js selbst kommen. Ebenfalls „Nicht bewertet". **Liegen lassen.**

*(Nebenbei der Unterschied zu hier: family-projekt.de liegt auf Klaus' Caddy,
dort **kann** man Kopfzeilen setzen — Anleitung `docs/CADDY-CACHE.md`. Bei
Tomys Hub geht das nicht.)*

### Reihenfolge-Vorschlag

② + ②b (billig, sicher, sofort — hebt die Barrierefreiheit) → ③ + ④ zusammen
(ein Durchgang Bilder, § 5.1 beachten) → ⑤ → dann ① **mit Ausbau-Versuch** und
Rückfrage an Klaus. **Erst ② – ⑤ mergen, bevor ① angefasst wird** — sonst weiß
am Ende niemand, welche Änderung welchen Wert bewegt hat.

Und: `Tomys-Hub/workfloh/` steht mit **95 / 92** deutlich besser da als
`showcase` mit **62 / 89**, obwohl beide im selben Repo liegen. **Der Vergleich
der beiden Seiten ist der schnellste Weg zur Ursache** — was macht `showcase`,
was `workfloh` nicht macht?

⚠ **Vor der ersten Zeile: `Tomys-Hub/CLAUDE.md` lesen.** Die Hausordnung ist in
jedem Repo anders, und ein Verstoß macht mehr kaputt als der Punktgewinn wert
ist. Und frisch aufsetzen:
`git -C Tomys-Hub fetch origin --quiet && git -C Tomys-Hub checkout -B <branch> origin/main`.

---

## 2. Was am 2026-08-03 früh geschehen ist (`werkzeuge.html`)

**CLS 0,188 → 0. Barrierefreiheit 98 → 100.** Drei Messläufe, null
Sprung-Ereignisse im Trace.

### Die Ursache wurde geprüft, nicht angenommen

Der Vorbrief vermutete dieselbe Bauart wie auf `markt.html` und hat recht
behalten — **wichtig ist trotzdem, wie das festgestellt wurde.** Der Bericht
allein hätte es nicht gezeigt; er nennt nur `body > footer`. Erst der Trace
sagt, ob etwas gewachsen oder verschoben ist:

```
score 0,1883   alt [0,488,412,155] → neu [0,0,0,0]
```

Die **Fußzeile** steht beim ersten Bild bei y = 488 px mitten im Sichtfeld
(823 px) und wird vollständig aus dem Bild geschoben, sobald `#toolGrid`
gezeichnet ist.

### Behoben mit

`#toolGrid:not(.gefuellt){min-height:70vh}`, und `render()` setzt `gefuellt`.
Die Reserve ist an **vier Fensterbreiten nachgemessen** (nötig: 224 / 335 /
627 / 533 px — `70vh` liefert 518 / 576 / 717 / 630 px) und bleibt weit unter
der echten Rasterhöhe von 1925–4844 px, kann also nie zurückschrumpfen.

Gezielt nach `#toolGrid`, **nicht** nach `.areas`: dasselbe Raster steht auch
auf der Startseite, dort aber fest im Markup gefüllt.

Dazu der Überschriften-Sprung: die Karten trugen eine **h3 direkt unter der
h1** und übersprangen eine Ebene. Jetzt **h2**; auf der Startseite stehen
dieselben Karten unter einer h2 und bleiben h3. `.area h2` teilt sich die
CSS-Regel mit `h3` — die Optik ist unverändert.

### Gegenprobe (Pflicht, für Reparatur **und** Wächter)

Reserve raus → CLS zurück auf exakt 0,188, identischer Trace · h2 → h3 zurück
→ Barrierefreiheit zurück auf 98, gleicher Selektor. Am Wächter: Reserve raus
→ 1 rot · `gefuellt` raus → 1 rot · h2 → h3 → 1 rot. Alles wieder drin →
**38/38 grün**, Suite **107/107**.

`ASSET_V`/`CACHE_VERSION` **v88 → v89**.

---

## 3. ⚠ Klaus' Sichttest steht aus — zwei Seiten inzwischen

1. **`markt.html`** (aus der Nacht): sitzt die Navleiste unverändert? Der
   „↻ Aktualisieren"-Knopf steht jetzt fest im Markup statt nachgereicht — er
   darf **genau einmal** erscheinen, links von „DE / EN".
2. **`werkzeuge.html`** (neu): das Werkzeug-Raster hält jetzt Platz frei,
   solange es leer ist. Zu sehen wäre — wenn überhaupt — ein kurzer Moment mit
   leerer Fläche statt eines Sprungs. **Klafft dort dauerhaft eine Lücke unter
   den Kacheln, ist `grid.classList.add("gefuellt")` nicht gelaufen.**

**Hard-Reload nicht vergessen** (Strg+Shift+R). Die Version steht auf **`v89`**.

**Und eine frische PageSpeed-Messung von `markt.html`** — Klaus' Bericht vom
02.08. 23:19 ist von **vor** dem Merge (00:14) und zeigt die Wirkung noch nicht.

---

## 4. Das Werkzeug — jetzt fest im Repo

**`tools/lh-messen.mjs`.** Damit niemand mehr einen eigenen Messaufbau baut und
dabei 0 misst.

```bash
cd /home/user/family-project
npm install lighthouse@13.4.1 playwright-core --no-save   # beide zusammen, sonst prunt npm
node tools/lh-messen.mjs werkzeuge.html --trace --laeufe=3
```

Es bildet Caddy nach (**gzip an, keine Cache-Kopfzeilen**), gibt auf Wunsch die
Trace-Ereignisse mit `old_rect`/`new_rect` aus und prüft die üblichen
Barrierefreiheits-Punkte gleich mit.

**Drei Dinge bleiben zwingend:**

1. **Ohne gzip misst man den Prüfserver, nicht die Seite.**
2. **Kein eigener CLS-Aufbau mit `PerformanceObserver`.** Ohne
   Prozessor-Drosselung laden die Skripte in Nullzeit, dann steht beim ersten
   Bild schon alles, und CLS ist 0 — ein Zufallstreffer führt in die Irre.
   **Lighthouse drosselt selbst vierfach; nimm Lighthouse.**
3. **Die Zahl allein sagt nicht, welches Element springt.** Der Bericht nennt
   `body > main` oder `body > footer`. Erst der Trace zeigt **verschoben statt
   gewachsen** — und genau darauf kam es beide Male an.

**Drei Läufe, sonst liest man Rauschen.** Die Leistungszahl schwankt auf dieser
Maschine stark (55 vorher, 64/62/63 nachher — das ist kein Befund).

---

## 5. Der Wächter

`tests/smoke_kein_sprung.mjs`, jetzt **38 Prüfungen** (~1 Minute).

Er prüft nicht die CLS-Zahl, sondern die Eigenschaft dahinter: **die Seite muss
ohne JavaScript schon genauso dastehen wie mit.** Neu dazu: die Raster-Reserve
auf `werkzeuge.html`, die Klasse `gefuellt` nach dem Zeichnen, und die
**Überschriften-Ebenen** auf drei Seiten.

**Was er nicht kann, ehrlich gesagt:** Er misst nicht, was ein echtes Gerät auf
einer echten Leitung erlebt. Das sagt erst Klaus' nächste PageSpeed-Messung.
Und er deckt nur die Seiten dieses Repos ab — für Tomys Hub gibt es ihn nicht.

---

## 6. Was in diesem Repo offen bleibt

- **Der `defer`-Umbau** für `werkzeuge.html` und `markt.html` (nur `index.html`
  hat ihn). ⚠ **Vorsicht:** `app.js` darf **nicht** verschoben werden, der
  Inline-Block braucht `FP.getLang()` synchron. Die Gegenprobe bricht sonst mit
  `FP is not defined`.
- **`index.html`, Aufbau der three.js-Szene** (~7–8 s Hauptthread, bevor die
  Selbst-Bremse greifen kann). Weniger Partikel auf schwachen Geräten wäre der
  Ansatz — **das ändert das Aussehen, also Klaus fragen.**
- **Cache-Kopfzeilen am Server** — liegt bei Klaus, `docs/CADDY-CACHE.md`,
  gehört auf den **Hetzner-Cloud-Server**. Bringt **keine Punkte** („Nicht
  bewertet"), hilft Wiederbesuchern.
- **Nebenbefund:** `tests/smoke_markt_melden.mjs` meldet „Hintergrund scrollt
  nicht, solange das Fenster offen ist" als durchgefallen (31/32). Besteht
  **auch auf unverändertem `origin/main`** (mit `git stash` gegengeprüft).
  Eigener Fix. Wer ihn angeht: erst die Frage aus der Arbeitsordnung stellen —
  *wann hat es zuletzt funktioniert, und was hat sich seitdem geändert?*
- **1.503 KiB Vorschaubilder aus FREMDEN Repos** auf `markt.html`. Von hier aus
  nicht behebbar; dort verkleinern hilft **beiden** Seiten. Eigene Sitzung.
- **Die vorberechneten Vektoren** für die Marktplatz-Suche — offene Bauaufgabe
  mit eigener Tafel-Entscheidung (unter ~20 Einträgen bleibt es lazy),
  **kein** Lighthouse-Fix.
- **`sbkim/*.js` minifizieren: nein.** Byte-gleiche Kopien aus dem Sage-Kanon;
  minifizieren erzeugt Drift. Wenn überhaupt: in Sage reparieren und von dort
  zurückholen.

---

## 7. Arbeitsweise (gilt unverändert)

- **Ursache statt Symptom.** Eine Zahl schöner machen, ohne zu verstehen, warum
  sie niedrig war, ist keine Verbesserung.
- **Ändern, dann messen.** Kein „das müsste helfen".
- **Der Versuch schlägt die Vermutung.** Etwas testweise ausbauen und noch
  einmal messen war zweimal der schnellste Weg zur Wahrheit.
- **Immer eine Gegenprobe** — für die Reparatur **und** für den Wächter. Eine
  Prüfung, die nie rot war, beweist nichts.
- **Ehrlich auflisten, was NICHT gemacht wurde — und warum.**
- **Nie behaupten, die Punktzahl steige.** Das zeigt erst die nächste Messung.
- **Erst mergen, dann prüft Klaus** — und erst dann die nächste App anfangen.
- **Selbst mergen** nach dem netzweiten Freibrief.
- **Absolute Pfade in Befehlen.** Die Bash-Arbeitsumgebung springt zurück.
- **Am Ende einen neuen Brief schreiben** und als Codeblock im Chat ausgeben.
