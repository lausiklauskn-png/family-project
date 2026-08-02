# Bilder verkleinern — bevor eines auf die Seite kommt

**Kurz:** Ein Bild, das mobil auf 644 × 258 Punkten angezeigt wird, muss nicht
1983 × 793 groß sein und darf keine 2,4 MB wiegen. Genau das war am 2026-08-02
der Fall — dieses eine Bild machte **82 % der gesamten Übertragung** der
Startseite aus.

Diese Seite sagt, wie man es richtig macht, ohne dass das Bild schlechter aussieht.

---

## Die zwei Fragen vor jedem Bild

1. **Wie groß wird es wirklich angezeigt?** Nicht wie groß die Datei ist.
   Für das Bild des Tages ist der Rahmen höchstens 1020 Punkte breit
   (`.wrap` ist auf 1060 begrenzt, minus Innenabstand). Mal zwei für scharfe
   Bildschirme → **rund 1500 Punkte Breite reichen völlig.**
2. **Welches Format?** **WebP** statt PNG oder JPG. Alle Browser seit 2020
   können es. Bei gleichem Aussehen ist es meist 80–90 % kleiner.

---

## Richtwerte (gemessen, nicht geschätzt)

| Zweck | Breite | Format | Zielgröße |
|---|---|---|---|
| Bild des Tages (`assets/tagesbilder/`) | 1536 | WebP, Qualität ~88 | unter 250 KiB |
| App-Symbol (`assets/appicons/`) | 192 oder 256 | WebP, Qualität ~95 | unter 20 KiB |

Beispiel vom 2026-08-02, echte Zahlen:

- `kosmos-mycel.png` 1983 × 793, **2393 KiB** → `.webp` 1536 × 614, **206 KiB**
- `point.png` 256 × 256, **96 KiB** → `.webp` 256 × 256, **18 KiB**
- Alle zehn App-Symbole zusammen: **668 KiB → 135 KiB**

---

## Wie man es macht (ohne Zusatzprogramm)

Auf dem Tablet ist kein Bildprogramm nötig — **der Browser selbst kann es.**
Eine Sitzung erledigt das auf Zuruf; sie benutzt dafür Chromium und rechnet
anschließend nach, wie weit sich das Ergebnis vom Original unterscheidet
(mittlerer und größter Farbunterschied). Nur so ist „sieht gleich aus" belegt
und nicht bloß behauptet.

**Bitte an eine Sitzung, wörtlich brauchbar:**

> Verkleinere `assets/tagesbilder/<datei>` auf 1536 Punkte Breite als WebP,
> miss den Unterschied zum Original und trage es in
> `assets/config/tagesbild.js` ein — mit dem alten Bild als Rückfall.

---

## Zwei Fallen

1. **Farbreduktion ohne Rasterung macht Streifen.** Klaus hat sie in einem
   früheren Versuch gesehen. WebP ist davon **nicht** betroffen (es arbeitet
   wie JPG, nicht mit einer verkleinerten Farbtabelle). Wer trotzdem eine
   Farbtabelle verkleinert: nur mit Floyd-Steinberg-Rasterung, sonst gar nicht.

2. **Maßangaben am Bild ohne passendes CSS verzerren es.**
   Steht `width`/`height` am `<img>`, gelten sie als feste Maße, solange das
   CSS nicht widerspricht. Beim Bild des Tages ist das in Ordnung, weil die
   Regel in `assets/style.css` Breite **und** Höhe setzt und mit
   `object-fit:cover` sauber zuschneidet. Bei einem neuen Bild an anderer
   Stelle gilt: entweder `height:auto` im CSS, oder Breite und Höhe zusammen
   mit `object-fit`.

---

## Rückfall nicht vergessen

In `assets/config/tagesbild.js` steht neben `img` ein `imgFallback`. Sollte ein
sehr alter Browser das WebP nicht laden können, wird stattdessen die
PNG-Fassung geholt. Deshalb bleibt die alte Datei im Repo liegen — sie kostet
nichts, solange sie niemand anfordert.

Dasselbe gilt für die App-Symbole: die `.png`-Dateien bleiben liegen, und die
Startseite wechselt selbsttätig darauf, wenn ein `.webp` nicht lädt.
