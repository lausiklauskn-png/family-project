# Regeln für Layout, Farben und Bedienbarkeit

> Lies das hier, bevor du am Layout, an Kopf-/Fußleisten, an Farben, Knöpfen oder
> Links arbeitest — und immer, wenn Barrierefreiheit unter 100 liegt oder das
> Layout beim Laden springt.

## Teil 1 — Nichts darf springen (CLS)

Ein Layout-Sprung ist der ärgerlichste Fehler für einen echten Nutzer: er tippt
auf einen Knopf, und der ist plötzlich woanders.

### Regel 1.1 — Was später kommt, braucht vorher Platz

Jedes Element, das erst nach dem Laden erscheint — Lampen-Leiste, Siegel-Abzeichen,
Hinweis-Banner, nachgeladene Bilder — reserviert seinen Platz **vorher**.

```css
/* Modul 16 hängt das Siegel-Abzeichen (34x34) erst nach dem Laden hier ein.
   Ohne Reservierung wächst die Leiste von 9 px auf 34 px und schiebt die Seite. */
.lamps { min-height: 34px; align-items: center; }
```

Gemessen an SB-KIMTool-Point: CLS **0,103 → 0,052** durch diese eine Zeile.

### Regel 1.2 — `flex-wrap` in einer Kopfleiste ist eine Sprungfalle

Eine Statusleiste mit `display: flex; flex-wrap: wrap` bricht um, sobald **ein
einziges** Kind breiter wird. Bei Point wuchs die Leiste dabei von drei auf vier
Zeilen — **50 px auf einen Schlag**, und alles darunter rutschte nach.

Wenn eine Leiste umbrechen darf, gib ihr für die schmale Breite eine
**`min-height`**, die schon die Endhöhe hat. Oder teile die Zeilen fest auf,
statt sie frei umbrechen zu lassen.

### Regel 1.3 — Bilder immer mit `width`/`height`

Siehe [`bilder.md`](bilder.md) Regel 4.

### Regel 1.4 — Beim Sprung sagt nur der Trace die Wahrheit

`--trace` nennt den Knoten mit Koordinaten vorher/nachher. Der Bericht sagt
bestenfalls `body > main`, und damit findet man nichts. Siehe
[`messen.md`](messen.md) Regel 4.

---

## Teil 2 — Farbkontrast

**Gefordert: 4,5 : 1** für normalen Text, 3 : 1 für großen (ab 18,66 px fett oder
24 px normal).

### Regel 2.1 — Nachrechnen, nicht nach Gefühl

Grau auf Weiß ist der Klassiker. Belegte Werte aus Mein-WorkFloh:

| Element | Farbe auf Grund | ist | gefordert |
|---|---|---|---|
| Nav-Beschriftung hell | `#90a0b4` auf `#ffffff` | **2,67 : 1** | 4,5 |
| Nav-Beschriftung dunkel | `#6f8098` auf `#161e2c` | **4,15 : 1** | 4,5 |
| Fußzeile hell | `#5b6b7a` @ 78 % auf `#f4f6fb` | **3,27 : 1** | 4,5 |

Alle drei sehen „eigentlich okay" aus. Sie sind es nicht.

### Regel 2.2 — Deckkraft mitrechnen

`opacity: .78` verändert den echten Kontrast. Erst mit dem Untergrund mischen,
dann rechnen — sonst misst man eine Farbe, die niemand sieht.

### Regel 2.3 — Jedes Thema einzeln prüfen

Bei mehreren Themen (hell/dunkel oder mehr) gilt der Kontrast **pro Thema**. Am
Tomys Promptgenerator standen zwei Elemente in **fünf bzw. vier von sieben**
Themen zu schwach (bis herunter auf 1,88 : 1).

**Zwei Messfehler, die dort echtes Geld gekostet haben** — beide führen zu sauber
gemessenem Unsinn:

1. Die Themen-Namen kamen aus `Object.keys(...)` und waren **Indizes 0–7**.
   `data-theme="0"` schaltet nichts — alle Messungen galten demselben Thema.
   **Prüf zuerst, ob dein Umschalter überhaupt umschaltet.**
2. `color(srgb 0.38 0.33 0.27)` wurde als 0–255 gelesen und ergab **16 : 1**, wo
   in Wirklichkeit 5,5 stehen. **Lass den Browser die Farbe umrechnen**, statt
   den Zahlenraum zu raten.

### Regel 2.4 — Die Menge ausrechnen, nicht greifen

Wenn du eine Farbe korrigierst: rechne aus, wie viel Beimischung nötig ist
(„40 % reicht nicht, 60 % ist unnötig dunkel"), statt zu probieren, bis es
durchgeht.

### Regel 2.5 — Sichtbares Aussehen ist Klaus' Entscheidung

Eine Kontrast-Korrektur an einer Leiste, die Klaus täglich benutzt, ändert das
**Aussehen** seiner App. Das ist kein Nebenbei-Schritt: Zahlen zeigen, Vorschlag
machen, Klaus entscheiden lassen. Am Grundsatz „nie stillschweigend" hängt hier
mehr als an der Technik.

---

## Teil 3 — Knöpfe, Ziele, Bedienung

### Regel 3.1 — Berührungsziele mindestens 24 × 24 px

Kleiner geht am Tablet mit dem Finger nicht sicher zu treffen. Zwischen zwei
Zielen gehört Abstand.

### Regel 3.2 — Jede Beschriftung gehört an ihr Feld

Ein `<label>`, das nur **neben** einem Feld steht, ist optisch beschriftet, für
eine Vorlesehilfe aber nicht. Es braucht `for="id"` — oder das Feld liegt **im**
Label.

Am Tomys Promptgenerator standen **fünfzehn** Labels als Geschwister neben ihren
Feldern. Vierzehn wurden nachgezogen — **zwei Textfelder hat Lighthouse gar nicht
gemeldet**, gefunden hat sie erst eine eigene Gegenprobe, die *jedes*
`input`/`select`/`textarea` durchgeht.

**Merksatz: Lighthouse ist eine Stichprobe, keine Vollprüfung.** Wo du eine
Fehlerklasse gefunden hast, such sie selbst vollständig ab.

```js
// Gegenprobe: Felder ohne erreichbare Beschriftung
document.querySelectorAll('input,select,textarea').forEach(f => {
  const hat = f.labels?.length || f.getAttribute('aria-label') || f.getAttribute('aria-labelledby');
  if (!hat) console.warn('ohne Beschriftung:', f.id || f.name || f.outerHTML.slice(0, 80));
});
```

### Regel 3.3 — Link oder Knopf, nicht beides

Ein `<a>` **muss** ein `href` haben. Löst etwas nur JavaScript aus, ist es ein
`<button>`. Sonst meldet Google `crawlable-anchors`, und für die Tastatur ist es
ohnehin kaputt.

### Regel 3.4 — Sichtbarer Fokus

`outline: none` ohne Ersatz macht die Seite für Tastatur-Bedienung unbrauchbar.
Wenn du den Umriss ersetzt, dann durch etwas **deutlich Sichtbares**
(`:focus-visible`).

### Regel 3.5 — Bewegung abschaltbar

`prefers-reduced-motion` beachten und einen Pause-Schalter anbieten, der sich die
Wahl merkt. Gilt besonders für Hintergrund-Animationen (siehe
[`bilder.md`](bilder.md) Regel 7).

---

## Teil 4 — Geteilte Adresse

Alle GitHub-Pages-Apps liegen unter **einer** Origin. `localStorage`, IndexedDB,
Service-Worker und Caches hängen an der **Origin**, nicht am Pfad.

**Jeder Speicher-Schlüssel bekommt ein App-Suffix.** Sonst stören sich
Geschwister-Apps gegenseitig — belegt an der Widget-Sichtbarkeits-Kollision
2026-07-11. Für Identitäten gilt das erst recht; dafür gibt es den Skill
`saubere-netz-anmeldung`.

---

## Abhakliste

- [ ] Platz für später erscheinende Elemente reserviert
- [ ] umbrechende Leisten mit `min-height` abgesichert
- [ ] Bilder mit `width`/`height`
- [ ] Kontrast **gerechnet**, pro Thema, mit Deckkraft
- [ ] Berührungsziele ≥ 24 px, mit Abstand
- [ ] jedes Feld hat eine erreichbare Beschriftung (**eigene Gegenprobe**, nicht nur Lighthouse)
- [ ] `<a>` nur mit `href`, sonst `<button>`
- [ ] Fokus sichtbar
- [ ] Bewegung abschaltbar
- [ ] Speicher-Schlüssel app-spezifisch
- [ ] sichtbare Design-Änderungen Klaus vorgelegt, nicht nebenbei gemacht
