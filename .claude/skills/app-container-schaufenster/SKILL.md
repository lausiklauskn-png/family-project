---
name: app-container-schaufenster
description: Bauweise B für Angebots-Container („so kann eine App-Karte aussehen") — die SCHAUFENSTER-Karte aus dem family-projekt.de-Marktplatz: breites Bild oben, Text darunter, ein Knopf am Fuß, Holo-Rand und Maus-Neigung. Anwenden, wenn für eine Internetseite, einen Marktplatz oder eine Übersicht Container für Apps, Produkte, Werkzeuge oder Dienstleistungen gebaut werden sollen UND das Angebot vom BILD lebt (Mode, Essen, Studio, Handwerk) oder es wenige, große Einträge sind. Enthält die Glas-Konstruktion (`.glass::before` mit Maskenlöchern), den Maus-Scheinwerfer, die Drei-Zeilen-Klemmung mit Mindesthöhe, das Messband und die Wächter-Ampel — und die zwei Fallen: eine Platzreserve, die nur bei VOLLER Liste richtig ist, und Bänder, die die Klemmung aufheben müssen. Das Gegenstück für lange Listen ist `app-container-kompakt` (PWA Toolpoint).
---

# Bauweise B — die Schaufenster-Karte

**Wofür:** wenige, große Angebote, die vom Bild leben.
**Gebaut an:** `family-projekt.de/markt.html`, Stand 2026-08-13.

Diese Karte zeigt **ein Angebot als Auslage**: breites Bild oben, Name, Anbieter,
drei Zeilen Text, ein Knopf. Sie ist das Gegenstück zur kompakten Karte — dort
zählt, wie viele Einträge auf den Schirm passen, hier, wie gut **einer** wirkt.

---

## Wann diese Bauweise — und wann NICHT

**Nimm sie, wenn:**

- das Angebot **ein Bild hat, das wirken soll** (Studio, Mode, Essen, Handwerk)
- es **wenige bis mittelviele** Einträge sind (bis etwa fünfzehn)
- die Seite eher am **Rechner oder Tablet** gelesen wird
- Vertrauen aus **Personen** kommt (`@name` unter dem Titel), nicht nur aus Zahlen

**Nimm sie NICHT, wenn:**

- die Liste lang wird und auf dem Handy gescrollt wird
  → dann `app-container-kompakt`
- jeder Eintrag vergleichbare **Kennzahlen** trägt, die man untereinander lesen
  will → die freie Anordnung hier stellt sie versetzt

---

## Der Aufbau

```
┌──────────────────────────────────┐
│                                  │
│      Bild, 16:9, volle Breite    │
│                                  │
├──────────────────────────────────┤
│ Name                             │
│ @anbieter                        │
│ Beschreibung, drei Zeilen        │
│ geklemmt, feste Mindesthöhe      │
│                                  │
│ [ → Zur Seite ]                  │
└──────────────────────────────────┘
```

### Das Gerüst

```html
<div class="glass listing">
  <div class="img"><img src="…" alt="Name" loading="lazy"
                        referrerpolicy="no-referrer"></div>
  <div class="body">
    <h3>Name</h3>
    <p class="by">@anbieter</p>
    <p>Beschreibung …</p>
    <div class="listing-actions">
      <div class="listing-foot">
        <a class="btn ghost ext" href="…" target="_blank" rel="noopener">→ Zur Seite</a>
      </div>
    </div>
  </div>
</div>
```

### Das Stylesheet (die tragenden Zeilen)

```css
.listings { display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 16px; }

.listing { padding: 0; overflow: hidden; display: flex; flex-direction: column;
  transform: perspective(1000px) rotateX(var(--rx,0deg))
             rotateY(var(--ry,0deg)) translateY(var(--lift,0px));
  transition: transform .18s ease, box-shadow .18s; }
.listing:hover { --lift: -3px; box-shadow: var(--shadow), var(--glow); }

.listing .img      { aspect-ratio: 16/9; overflow: hidden;
                     border-bottom: 1px solid var(--line); }
.listing .img img  { width: 100%; height: 100%; object-fit: cover; }
.listing .body     { padding: 14px 16px 16px; display: flex;
                     flex-direction: column; flex: 1 1 auto; min-width: 0; }
.listing h3        { -webkit-line-clamp: 2; }
.listing .by       { font-family: var(--mono); color: var(--accent); }
.listing p {
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: calc(1.4em * 3);      /* ⚠ das ist der wichtige Teil */
}
```

`min-height` auf **genau drei Zeilen** ist der Grund, warum die Karten in einer
Reihe gleich hoch stehen, auch wenn eine Beschreibung kürzer ist. Ohne sie
rutscht der Knopf pro Karte auf eine andere Höhe, und die Reihe franst aus.

---

## Die Glas-Konstruktion

Der schimmernde Rand ist **kein** `border` — er ist eine zweite Ebene mit einem
Loch in der Mitte:

```css
.glass { position: relative; background: var(--card);
         border: 1px solid transparent; border-radius: 16px;
         backdrop-filter: blur(14px) saturate(1.2); }
.glass::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  padding: 1.4px;                       /* das wird der Rand */
  background: var(--holo-border);
  animation: holo-rot 16s linear infinite;
  -webkit-mask: linear-gradient(#000 0 0) content-box,
                linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none; opacity: .5; transition: opacity .2s;
}
.glass:hover::before { opacity: 1; }
```

Zwei Masken übereinander, die eine auf den Inhaltsbereich beschränkt, per `xor`
voneinander abgezogen — übrig bleibt ein 1,4 px breiter Ring, in dem der
Farbverlauf rotiert. Ein echter `border` kann keinen Verlauf tragen; ein
`background-clip`-Trick verliert die runden Ecken.

**`pointer-events: none` ist Pflicht.** Ohne das liegt die Ebene über der Karte
und schluckt jeden Klick.

## Der Maus-Scheinwerfer

```css
.listing::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  pointer-events: none; z-index: 1;
  background: radial-gradient(260px 200px at var(--mx,50%) var(--my,50%),
                              rgba(255,255,255,.13), transparent 60%);
  opacity: 0; transition: opacity .25s; mix-blend-mode: screen;
}
.listing:hover::after { opacity: 1; }
```

Gespeist aus einem einzigen `pointermove`-Zuhörer, der `--mx/--my` (Prozent) und
`--rx/--ry` (Grad) setzt:

```js
var max = 5.5;                        /* Karten: sanft. Knöpfe: 9 */
var px = (x - r.left) / r.width, py = (y - r.top) / r.height;
el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
el.style.setProperty("--ry", ((px - .5) * 2 * max).toFixed(2) + "deg");
el.style.setProperty("--rx", (-(py - .5) * 2 * max).toFixed(2) + "deg");
```

> **Beim Verlassen alle vier zurücksetzen**, nicht nur die zwei Winkel — sonst
> bleibt der Schimmer kleben. Und `pointerout` nehmen, nicht `pointerleave`.

> **Ein Kommentar kann über den Code lügen.** In einer Kopie stand „5,5° wie in
> family-project", während der Code höchstens 1,9° erzeugte. Der Satz war lange
> da und klang richtig. **Wer eine Zahl kommentiert, rechnet sie einmal nach.**

## Ohne Maus: `cursor: none` ist keine Option

Android und DeX ignorieren es. Wer einen eigenen Zeiger zeichnen will, muss den
echten anders loswerden — sonst stehen zwei da.

---

## Die Bänder auf der Karte

Der Marktplatz hängt drei Dinge in die Karte, alle **zwischen Text und Knopf**:

| Band | Klasse | wofür |
|---|---|---|
| Wächter-Ampel | `p.mk-wache.is-gelb` / `.is-rot` | Warnung bzw. Sperre, Grund lesbar |
| Messband | `.mk-mess` mit `.mk-ms-w`-Pillen | Ladezeit-Werte mit Datum |
| Quittung | `p.mk-wache.is-quittiert` | kurzlebig, bis der nächtliche Lauf bestätigt |

**Falle:** `.listing p` ist auf drei Zeilen geklemmt. Jedes Band, das ein `<p>`
ist, muss die Klemmung **ausdrücklich aufheben**:

```css
.listing p.mk-wache, .listing .mk-mess p {
  display: block; -webkit-line-clamp: none; overflow: visible; min-height: 0;
}
```

Ein Warnhinweis, von dem man drei Zeilen sieht, ist kein Warnhinweis.

**Rot heißt nicht „weg".** Der Eintrag bleibt sichtbar, der Grund steht dabei,
nur der Link geht aus. Ein gesperrter Eintrag, der trotzdem weiterleitet, wäre
eine Sperre, die nichts sperrt.

**Die Farbe steht nie allein.** Die Zahl steht immer daneben — niemand soll auf
die Farbe angewiesen sein.

### Die Messwert-Pillen fließen hier frei

```css
.mk-ms-zeile { display: flex; flex-wrap: wrap; gap: 6px; }
.mk-ms-w     { display: inline-flex; padding: 3px 8px; border-radius: 999px;
               border: 1px solid currentColor; white-space: nowrap; }
.mk-ms-w b   { font-variant-numeric: tabular-nums; }
```

Das ist ein **bewusster Unterschied** zur kompakten Bauweise, die ein festes
2×2-Raster nimmt. Frei fließend sieht jede Karte etwas anders aus, dafür bricht
nie etwas um (`white-space: nowrap`). Im Raster stehen die Zahlen untereinander
und lassen sich zwischen zwei Angeboten wirklich vergleichen — dafür muss man
`minmax(0, 1fr)` nehmen, sonst nimmt sich die längere Spalte den Platz der
kürzeren. **Beide Wege sind richtig; sie beantworten verschiedene Fragen.**

`font-variant-numeric: tabular-nums` gehört an jede Zahl, die untereinander
gelesen wird — sonst tanzen die Ziffern.

---

## Die zwei Fallen

### Falle 1 — eine Platzreserve ist nur richtig für Inhalt, der KOMMT

```css
.listings:not(.gefuellt) { min-height: 70vh; }
```

Diese Zeile hält Platz frei, solange die Karten noch nicht gezeichnet sind, und
gibt ihn dann ab. Bei **vierzehn** Einträgen ist sie richtig und verhindert, dass
der Kasten „Eigene App gewünscht?" mitten im Bild steht.

Wörtlich in einen Marktplatz mit **null** Einträgen übernommen hat dieselbe Zeile
den Layout-Sprung **verschlechtert** (dort gemessen: CLS 0,105 → 0,136) — beim
Freigeben verschwand ein halber Bildschirm.

> **Die allgemeine Lehre:** eine Regel, die anderswo gemessen wurde, gilt unter
> den Bedingungen, unter denen sie gemessen wurde. Übernehmen heißt prüfen, nicht
> abschreiben.

Die reifere Hälfte derselben Vorlage ist: die Einträge **als echtes HTML** in die
Seite schreiben. Dann ist nichts zu reservieren und nichts freizugeben.

### Falle 2 — eine leere Zeile, die zu einer vollen wird, schiebt alles

Die Zählzeile über der Liste („14 / 14") ist beim ersten Bild leer und bekommt
ihren Text erst vom Zeichnen — das schob alles darunter um **31 px**. Jede Zeile,
die später gefüllt wird, braucht ihre Höhe **vorher**.

---

## Zwei Instanzen, eine Bauweise

Dieselbe Software trägt zwei Märkte mit gegensätzlichen Aufgaben:

| | family-projekt.de | PWA Toolpoint |
|---|---|---|
| für wen | den inneren Kreis | **Fremde** |
| Vertrauen kommt | von den Personen | **muss die Software herstellen** |
| Ton | persönlich | sachlich, nachprüfbar |

Daraus folgt die Regel, die beide zusammenhält: **nie die Kopie ändern — die
Quelle ändern und neu kopieren.** Ein SHA-256-Wächter im Testlauf passt darauf
auf. Sonst laufen zwei Marktplätze auseinander, und niemand merkt es, bis ein
Fehler nur an einer Stelle behoben ist.
