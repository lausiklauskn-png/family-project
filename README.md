# Family Projekt

Öffentliche Website (Hetzner, NICHT GitHub Pages): bündelt Klaus' Werkzeuge/Apps,
ein freies Netzwerk (Mycel-Knoten) und einen Marktplatz.

- Startseite + drei Räume: **Netzwerk** · **Werkzeuge** · **Marktplatz**
- Echter three.js-Mycel-Hintergrund, 3 Themen (Dunkel/Neon/Hell), DE/EN,
  Mikrofon in jedem Textfeld, Holo-Schrift.
- Family Projekt ist selbst ein **SBKIM-Mycel-Knoten** (Module 1:1 aus Sage:
  Status/Schutz 15/16/17 + Basis 01/02/03/04/05). Init-Kette in
  `sbkim/sbkim-init.js` (Widget 17 vor Membran 15 / Siegel 16).
- **Dev-Briefkasten** (Verbindungs-Test) nur im Dev-Modus (`?dev` /
  `localStorage fp_dev=1`); öffentlich versteckt, vor Launch aus.

Aufbau / Deploy: siehe `docs/DEPLOY.md`. Stand/Aufgaben: `docs/PULS.md`.

## Lokaler Sichttest
```
python3 -m http.server 8000   # dann http://localhost:8000 im Browser
```
Headless-Smoke (Beweis der Logik): `node tests/smoke_start.mjs`
(braucht playwright-core + Chromium; Klaus' Browser-Sichttest bleibt unersetzbar).
