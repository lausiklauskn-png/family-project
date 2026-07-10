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

## Zwei Adressen — Produktion + immer-aktuelle Vorschau

- **Produktion:** `https://family-projekt.de` (Hetzner + Caddy, `git pull` auf dem
  Server; siehe `docs/DEPLOY.md`). Wenn das Server-Update mal hängt, ist die Seite
  dort veraltet.
- **Vorschau (GitHub Pages):** `https://lausiklauskn-png.github.io/family-project/`
  — aktualisiert sich bei **jedem Merge auf `main`** von selbst, ganz ohne Server.
  Einrichten: **GitHub → Settings → Pages → Source: „Deploy from a branch" →
  Branch `main` / `/ (root)` → Save.** Die Datei `.nojekyll` sorgt dafür, dass die
  App unverändert (ohne Jekyll) ausgeliefert wird. Alle Pfade sind relativ, läuft
  daher auch unter dem `/family-project/`-Unterpfad (headless bestätigt).
  Hinweis: Auf der Pages-Adresse lädt das Embedding-Modell von HuggingFace (das
  Selbst-Hosten unter `/models/` greift nur auf der Root-Domain).

## Lokaler Sichttest
```
python3 -m http.server 8000   # dann http://localhost:8000 im Browser
```
Headless-Smoke (Beweis der Logik): `node tests/smoke_start.mjs`
(braucht playwright-core + Chromium; Klaus' Browser-Sichttest bleibt unersetzbar).

## Embedding-Modell (Identität / Suche)

Die Identitäts-Erzeugung und die Bedeutungs-Suche brauchen das Modell
**`Xenova/multilingual-e5-small`** (~30 MB). Family-Projekt kann es aus **zwei
Quellen** laden — die App entscheidet **automatisch**:

- **Selbst-gehostet (offline-first, bevorzugt):** liegt das Modell unter
  `models/Xenova/multilingual-e5-small/…` im Repo, lädt die App es vom eigenen
  Server — keine HuggingFace-Abhängigkeit, funktioniert offline.
- **HuggingFace (Fallback):** fehlt das lokale Modell, lädt die App es beim
  ersten Anmelden von HuggingFace (einmal Internet nötig, danach im Browser
  gecacht).

Warum die Auto-Erkennung nötig ist: der Server liefert für fehlende Pfade die
`index.html` aus (`try_files … /index.html`). Prüft man nur den HTTP-Status,
hält die Modell-Bibliothek diese HTML-Seite für die Modell-Datei und wirft
„Unexpected token '<'“. Darum prüft `sbkim/03_embedding.js` (Funktion
`detectModelSource`) den **Inhalt** der Antwort, nicht nur den Status.

**Modell selbst ins Repo holen:** GitHub → **Actions** →
**„Embedding-Modell ins Repo holen"** → **Run workflow** (Branch wählen). Der
Lauf lädt die Dateien auf GitHubs Servern und committet sie nach
`models/…`. Danach `git pull` + auf der Seite einmal **Strg+Shift+R**. Details:
`models/Xenova/multilingual-e5-small/PLATZHALTER.md`.
