# Werbevideo Family Projekt (60 s)

Ein Werbevideo über die Apps auf family-projekt.de, gebaut mit HyperFrames
(HTML + GSAP + three.js), 1920 × 1080, 60 Sekunden, 128 BPM.

## Neu bauen

```bash
node musik.mjs                    # schreibt assets/music.wav (liegt nicht im Depot)
npx --yes hyperframes@0.8.111 check .
npx --yes hyperframes@0.8.111 render . --quality delivery -o family-projekt-werbevideo.mp4
```

## Was drinsteckt

| Zeit | Szene |
|---|---|
| 0–7,5 s | Kosmos-Bild (Sonne → Erde), Logo und Titel |
| 7,5–15 s | Sende-Prüfer und Auslieferungsprüfer (Bildschirmfotos mit erfundenen Angaben) |
| 15–22,5 s | Mein Mixarium und Mein Rezeptbuch (Bildschirmaufnahmen der Apps) |
| 22,5–30 s | 25 Apps auf einem 3D-Ring, Flüssigmetall (three.js) |
| 30–37,5 s | eigene Zeichen: Tresore, Netzwerk, Betrieb, Küche & Lernen — zerplatzen und setzen sich neu zusammen |
| 37,5–45 s | sieben Apps mit Leistung 100 |
| 45–52,5 s | Finden · Entdecken · Anbieten · Kostenlos · Ohne Konto · Offline nutzbar |
| 52,5–60 s | Logo, family-projekt.de |

## Woher die Zahlen kommen

Jede Leistungszahl im Video ist eine Lighthouse-Messung (13.5.0, Handy, Leistung)
aus `assets/config/spore-stand.json` und trägt ihr Messdatum. Perfect Skin Beauty
steht dort als veraltet und bekommt im Video deshalb keine Zahl.

## Eigene Zeichen

Für Küchenzettel, Company Brain, WorkFloh, Muster Werbetechnik, SBKIM-Demo,
Jasons Tresor, Mein Tresor, KI-Schulung und Sage-Protokol sind die Zeichen im
Video eigene SVG-Entwürfe (in `index.html`, Objekt `EM`). Die Symbole der Apps
selbst sind unverändert.

Die Musik ist mit `musik.mjs` selbst erzeugt (keine fremde Aufnahme).
`vendor/` enthält GSAP 3.14.2 und three.js r160 unverändert.
