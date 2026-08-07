# Regeln für Bilder

> Gewerk „Bilder": Banner, Fotos, Icons, Logos, Hintergründe, Video-Vorschaubilder.
> Lies das hier, **bevor** du ein Bild einbaust, ersetzt oder von einer Bild-KI
> übernimmst.

**Bilder sind in diesem Netz der mit Abstand teuerste Einzelposten gewesen.**
Nicht der Code. Drei belegte Fälle, alle 2026:

| Seite | Datei | war | Folge |
|---|---|---|---|
| SB-KIMTool-Point | 3 Dekor-Banner PNG | **3051 KiB** = 90 % der Seite | Ladezeit 18,9 s · Leistung 60 |
| BookLedgerPro | `cover.png` | **2427 KiB** = 74 % der Seite | Ladezeit 20,1 s · Leistung 63 |
| Muttis Rezeptbuch | Bilder als base64 **in** der HTML | **1229 KiB** von 2039 KiB | erster Anstrich 8,8 s |

Nach dem Fix: Point **86**, BookLedgerPro **88**. Beides ohne eine Zeile
Funktionsänderung.

---

## Die Regeln

### 1 · WebP, nicht PNG oder JPG

Für Fotos, Banner und alles Gemalte: **WebP**. Bei Klaus' Bannern brachte das
**95 % weniger** bei nachweislich unverändertem Aussehen (3051 → 162 KiB).

Ausnahmen, in denen PNG bleibt:
- **Icons im Manifest** (`icon-192`, `icon-512`) — Android/iOS erwarten PNG.
- **Strichgrafik mit wenigen Farben** — da ist **SVG** meist noch besser.

Ein Favicon gehört als **inline `data:`-SVG** in die Seite, nicht als Datei
(spart eine Anfrage und umgeht das hartnäckige Favicon-Zwischenspeichern).

### 2 · Auf die Anzeigegröße rechnen, nicht auf die Quellgröße

**Miss zuerst nach, wie groß das Bild wirklich dargestellt wird**, dann rechne es
auf höchstens das **Doppelte** davon (für Bildschirme mit doppelter Pixeldichte).

Bei Point: Quelle 1400 px breit, dargestellt durch `object-fit: contain` in einer
180 px hohen Karte nie über ~450 px. 900 px reichen also im Überfluss — die
restlichen 500 px hat niemand je gesehen und jeder Besucher heruntergeladen.

So misst du es (nicht schätzen):

```js
// im Browser, an der echten Seite
document.querySelectorAll('img').forEach(i => console.log(
  i.currentSrc.split('/').pop(),
  'Datei', i.naturalWidth + 'x' + i.naturalHeight,
  '· gezeigt', Math.round(i.getBoundingClientRect().width) + 'x' +
               Math.round(i.getBoundingClientRect().height)));
```

### 3 · `loading="lazy"` für alles, was nicht sofort sichtbar ist

Bei Point standen drei Dekor-Banner auf `loading="eager"`, obwohl sie **unter**
dem ersten Abschnitt liegen. Sie wurden sofort geholt und blockierten die
Leitung für alles andere.

- **`lazy`** für alles unterhalb des ersten Bildschirms.
- **`eager`** nur für das eine Bild, das ganz oben steht **und** das
  LCP-Element ist. Wenn du nicht sicher bist, welches das ist: **nachmessen**
  (`--trace`), nicht raten.
- `loading="lazy"` bei einem Bild, das doch im ersten Bildschirm steht, ist
  ungefährlich: der Browser lädt es dann ohnehin sofort.

### 4 · `width` und `height` immer angeben

Ohne die beiden Angaben kennt der Browser das Seitenverhältnis nicht, das Bild
kommt später an und **schiebt die Seite** (CLS). Trag die **echten** Maße ein,
nicht ungefähre — bei Point standen dort `1200×400`, während die Datei
`1400×467` war.

CSS darf die Anzeige danach frei ändern (`height: 180px; object-fit: contain`) —
die Attribute liefern nur das Verhältnis.

### 5 · Dekoration als Dekoration kennzeichnen

Trägt ein Bild keine Information, dann `alt=""` **und** `aria-hidden="true"`.
Das ist ehrlicher gegenüber Vorlesehilfen — und es ist zugleich dein Prüfstein:
**Was Dekoration ist, darf niemals 1 MB kosten.** Bei Point trugen genau die drei
teuersten Dateien beide Merkmale. Das hätte auffallen müssen.

### 6 · Niemals Bilder als base64 in die HTML einbetten — außer Winzlinge

Muttis Rezeptbuch trägt **1229 KiB** eingebettete Bilder in einer 2039 KiB großen
`index.html`. Folge: der Browser muss **alles** herunterladen und durchparsen,
bevor ein einziges Pixel erscheint — erster Anstrich nach **8,8 Sekunden**.

Base64 ist zudem rund **33 % größer** als die Datei und lässt sich nicht einzeln
zwischenspeichern.

Erlaubt bleibt es für: Favicon-SVG, winzige Symbole (< 2 KiB), und dort, wo eine
**einzige** Datei ausdrücklich Bedingung ist (verteilbare Ein-Datei-Werkzeuge).
Dann gilt die Größe erst recht: klein rechnen, WebP, nicht mehrere Hundert KiB.

### 7 · Relative Bildpfade in CSS-Variablen — die stille Falle

**Eine relative `url()` in einer CSS-Variablen wird gegen das STYLESHEET
aufgelöst, in dem sie verbraucht wird — nicht gegen das HTML-Dokument.**

Belegt an SB-KIMTool-Point (2026-08-07). In der Seite stand:

```html
<!-- FALSCH: assets/ wird doppelt -->
<div class="page-banner" style="--art:url('assets/img/banner-markt.webp')">
```

`style.css` liegt selbst in `assets/`, also machte der Browser daraus
`assets/assets/img/banner-markt.webp` → **404**. Die Kopf-Streifen von drei
Unterseiten waren dadurch **seit dem ersten Tag unsichtbar**, und niemand hat es
gemerkt — weil ein Gradient-Fallback dahinterlag und ein leerer Farbverlauf
**nicht kaputt aussieht**.

```css
/* RICHTIG: Zuweisung ins Stylesheet, dort ist img/ der richtige Pfad */
.page-banner.pb-markt { --art: url('img/banner-markt.webp'); }
```
```html
<div class="page-banner pb-markt">
```

**Zwei Lehren daraus, die über Bilder hinausgehen:**

- **Ein Fallback verdeckt einen Fehler.** Wo etwas „progressive enhancement" ist,
  merkt niemand, wenn es gar nicht ankommt. Solche Stellen **aktiv prüfen** —
  einmal die Seite laden und auf **404 im Netzwerk-Protokoll** sehen, nicht nur
  hinschauen, ob es „irgendwie okay" aussieht.
- **Wenn ein Bild fehlt, zuerst die aufgelöste Adresse ansehen**, nicht den
  geschriebenen Pfad:

  ```js
  const e = document.querySelector('.page-banner');
  console.log(getComputedStyle(e).backgroundImage);   // zeigt die ECHTE URL
  ```

### 8 · WebGL-/Canvas-Hintergründe sind Bilder mit laufenden Kosten

Ein three.js-Hintergrund kostet nicht einmalig, sondern **in jedem Bild pro
Sekunde** — und die Kosten wachsen mit der Fensterfläche.

Gemessen an Tomys Hub (2026-08-06): Blockierzeit **40 ms am Handy**, aber
**3.750 ms am Computer** — allein weil das Fenster 1350 × 940 statt 412 × 823
groß ist. Gegenprobe mit abgeschaltetem Hintergrund: **69 → 100**.

Wenn du so etwas einbaust:
- Auf schmalen Geräten **ganz weglassen** (Muster: `data-kein-handy-hintergrund`
  in `Tomys-Hub/tomy-ui/mycel-bg.js`) — dort erst gar kein three.js holen.
- **`prefers-reduced-motion` beachten.**
- Einen **Pause-Schalter** anbieten und die Wahl merken.
- Und **beide Werte messen**. Eine Abschaltregel, die an der Fensterbreite hängt,
  erzeugt zwei verschiedene Seiten — siehe [`messen.md`](messen.md).

---

## Umrechnen ohne Bildwerkzeug

Im Container gibt es weder `cwebp` noch ImageMagick noch Pillow, und `pip` kommt
oft nicht durch. **Chromium ist da und kann WebP kodieren.** Bewährtes Muster
(Point, 2026-08-06): Bild als `data:`-URL in ein Canvas der Zielbreite zeichnen,
`canvas.toDataURL('image/webp', 0.80)` und die Bytes schreiben. Läuft über
`playwright-core` aus `family-project/node_modules`.

Güte **0,80** war bei Klaus' Bannern nicht vom Original zu unterscheiden.

## Pflicht: Aussehen prüfen, nicht nur die Zahl

**95 % kleiner ist kein Erfolg, wenn es schlechter aussieht.** Rendere alt und
neu **in der echten Anzeigegröße** nebeneinander und **sieh es dir an**, bevor du
die alten Dateien löschst. Beim Point-Fix hat genau das den Ausschlag gegeben.

## Pflicht: die Ablage-Anleitung nachziehen

Wenn ein Repo eine `assets/img/README.md` (oder ähnliche Anleitung) hat, die
sagt „lege hier eine Datei mit diesem Namen ab", dann **zieh sie mit um**.
Sonst legt die nächste Sitzung — oder Klaus — wieder ein 1-MB-PNG dorthin, und
die ganze Arbeit ist in einem Schritt rückgängig.

Nenn dort ausdrücklich: **Format, Maximalbreite, erwartete Dateigröße** und den
Hinweis, dass eine Bild-KI meist PNG liefert und man einmal umrechnen muss.

## Kurze Abhakliste

- [ ] WebP (oder SVG bei Strichgrafik; PNG nur für Manifest-Icons)
- [ ] auf höchstens das Doppelte der echten Anzeigebreite gerechnet
- [ ] `loading="lazy"`, außer beim LCP-Bild ganz oben
- [ ] `width`/`height` mit den **echten** Maßen
- [ ] Dekoration: `alt=""` + `aria-hidden="true"`
- [ ] kein base64 in der HTML (außer Winzlinge)
- [ ] relative Pfade: bei CSS-Variablen die **aufgelöste** Adresse geprüft
- [ ] Seite geladen und auf **404 im Netzwerk-Protokoll** gesehen
- [ ] alt und neu nebeneinander **angesehen**
- [ ] alte Dateien entfernt, Ablage-Anleitung nachgezogen
- [ ] vorher/nachher gemessen, **beide Geräte**
