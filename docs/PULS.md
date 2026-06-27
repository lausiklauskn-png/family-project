# PULS — Family Projekt

Aktueller Stand, was offen ist, nächste Schritte. Zu Beginn jeder Sitzung lesen.

---

## Letzter Stand — 2026-06-27 (Bau-Sitzung 1: Grundgerüst + alle Seiten)

**Getan (Branch `claude/family-projekt-bau-2ji792`):**

- **Grundgerüst:** `vendor/three.module.min.js` + SBKIM-Module 01/02/03/04/05/15/16/17/19
  **1:1 aus Sage** kopiert (Modul 09 ist nur Doku, kein JS — entfällt).
- **assets/mycel-bg.js:** echter three.js-Mycel-Hintergrund (Punkt-Wolke +
  Hyphen-Linien + Funkel-Shader), **themed** (Dunkel/Neon/Hell), **Scroll-Zoom**,
  `prefers-reduced-motion`. Hell-Thema: NormalBlending + dunkle Fäden.
- **assets/style.css + app.js:** Tokens/Holo/Glas-Rand aus Mockup v3; Themen
  (persistiert, Hintergrund-Hook), DE/EN (persistiert), **Mikrofon automatisch
  an jedem Textfeld** (+ Nachrüstung blanker Felder für den Andock-Wizard).
- **assets/config/*.js:** wechselbare Konfig (Tagesbild, Weekly, Listings,
  Werkzeuge) — Klaus ändert ohne Code.
- **sbkim/sbkim-init.js:** Init-Kette **17 vor 15/16** (bewährtes Mixarium-
  Muster), Kopf-Status (LEBT/VERKEHR/FREMD/SIEGEL, event-getrieben),
  **Dev-Briefkasten + Verbindungs-Test** (nur `?dev`/`fp_dev=1`), `__fpErzeugeSpore()`.
- **Seiten:** `index.html` (Start: Bild des Tages, Weekly Discovery, Suche),
  `netzwerk.html` (dreistufiges Versprechen + Andock-Wizard Modul 19 +
  „in Vorbereitung"), `werkzeuge.html` + 3 Tool-Landingpages (such/andock/knoten,
  datengetrieben über `tool-landing.js`), `markt.html` (Listings=Such-Korpus,
  Wort- + lazy semantische Suche, Einreich-Formular mit Bild-Pflicht + SVG-Sperre
  + Freigabe-Hinweis + Jahresbeitrag-Platzhalter + Haftungshinweis),
  `impressum.html` (Vorlage, kein PII).
- **Deploy:** `docs/DEPLOY.md` + `Caddyfile.example` (Caddy-Site-Block + git pull).
- **Tests:** `tests/smoke_start.mjs` 14/14, `tests/smoke_all.mjs` **35/35 grün**
  (Chromium headless, swiftshader). Beweis der Seiten-Logik.

**Headless grün, aber Klaus' Browser-Sichttest steht aus** (unersetzbar):
Optik am Galaxy Tab S6, three.js-Hintergrund live, Mikrofon (echtes Web Speech),
und der **Verbindungs-Test** (`?dev` → Dev-Briefkasten → „Verbindung testen").

---

## Offen / nächste Schritte (priorisiert)

1. **Klaus' Browser-Sichttest** der Startseite + Räume (lokal via
   `python3 -m http.server` oder nach Deploy). Inkl. Verbindungs-Test.
2. **Repo `family-project` existiert** und Branch ist gepusht → **Deploy mit
   Klaus** (Caddy-Block + git pull, `docs/DEPLOY.md`).
3. **Eigene Spore erzeugen + committen** (`sbkim/spore.json`) — über den
   Dev-Briefkasten. Danach kann Family Projekt als echter Knoten in den
   Netz-Briefkästen (Sage/SB-KIMTool-Point) eingetragen werden (§11.6).
4. **Vor Launch:** Impressum füllen, Dev-Schalter aus, Tagesbild/Listings setzen.

## Spätere, eigene Sitzungen

- **Auto-Handshake übers Relay** (heute ehrlich „in Vorbereitung").
- **Einreich-Dienst + Freigabe-Workflow** (kleiner Hintergrund-Dienst).
- **Bezahlung / PayPal / Jahresbeitrag** (Höhe offen).
- **Bild-Generator-Helfer**, **Qualitäts-/Sicherheits-Check** für Listings.
- **Volles Such-Werkzeug (Modul 22) als Widget** falls gewünscht (bewusst NICHT
  Teil des Knotens — Brief §6b: nur Status/Schutz + Basis-Module).

## Lehren dieser Sitzung

- **ASCII-Anführungszeichen in deutschen JS-Strings** (`„vertrau mir"` mit
  ASCII-`"`) beenden den String vorzeitig → Syntaxfehler. Der Headless-Smoke
  hat alle vier Stellen gefangen. Konvention: in JS-Strings typografische `"`/
  Guillemets `» «` nutzen.
- **three.js im Headless** braucht `--use-gl=swiftshader` (Software-GL); der
  Hintergrund wirkt dort schwächer als auf echter GPU.
