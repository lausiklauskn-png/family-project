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

## Nachtrag 2026-06-27 (Klaus' Sichttest-Feedback, umgesetzt)

- **Doppelung behoben + andockbares Status-Widget** (`assets/status-widget.js`):
  die feste Kopf-Leiste war eine zweite Anzeige neben dem Modul-17-Widget. Jetzt
  EIN Element (LEBT/VERKEHR/FREMD/SIEGEL), das per Maus **angedockt** (Navleiste,
  ohne Minimieren/X) und durch **Runterziehen gelöst** (schwebende Pille mit
  –/✕) wird; ✕ → „⊕ Status"-Restore-Chip. Zustand+Position persistiert.
  Modul 17 bleibt geladen (Brief §6b, Plumbing + Siegel-Proxy), seine eigene
  Pille wird in `sbkim-init.js` per `SbkimWidget.hide()` versteckt. Klaus' live-
  Anweisung überschreibt hier die Brief-Default-Optik (dokumentiert).
- **Mikrofon-Knöpfe** jetzt vertikal **mittig** in jedem Feld (`.mic` top:50% +
  translateY).
- Smoke: `smoke_all.mjs` **41/41 grün** (inkl. echtem Maus-Ziehen Dock/Lösen,
  Minimieren/X, Restore-Chip).
- **Weiter offen für Klaus' Tablet-Sichttest:** Andocken/Lösen per Touch fühlen,
  Mikrofon-Position, Gesamteindruck.

## Nachtrag 2026-06-27 (Design-Politur mit Klaus, live)

- **Glas-Cabochon-Buttons** überall (Buttons, Pillen, Mikro, Navi-Links auf
  Hover, große Karten, Bild des Tages, Markt-Karten): geschliffene Kante +
  maus-folgender Holo-Schimmer (Theme-Farben via color-mix) + 3D-Neigung zum
  Cursor (`--rx/--ry`, app.js `wireHoloButtons`, SEL breit). Reduced-motion
  ohne Tilt. Mikrofon vertikal mittig.
- **Status-Widget** behält beim Lösen die waagerechte Lampen-Form (kein
  „Status"-Text, kein Hochkant); nur kleines ✕; Ziehen von überall.
- **Footer-Schnell-Links** (Bauphase) zu Klaus' PWAs: `assets/config/meineapps.js`
  + `.btn.slim`. **Vor Launch raus/dev-only** (offen). WorkFloh bewusst draußen.
- **Bild des Tages:** füllt den Rahmen vollflächig (Pad-Verhältnis = Bild-
  Verhältnis via JS), Titel „Family Projekt" oben mittig drüber, Titel wackelt
  wie die Buttons (`.fp-doodle-title`). Erstes Bild gesetzt:
  `assets/tagesbilder/kosmos-mycel.png` (Klaus-Generat). three.js-Sterne werden
  **heller unter der Maus** (`uMouse`-Uniform in `assets/mycel-bg.js`).
- Smoke `smoke_all.mjs` **41/41 grün** durchgängig.
- **Offen vor Launch:** Footer-App-Leiste ausblenden/dev-only; Bild ggf. als
  WebP/JPG optimieren (PNG ~2,4 MB).

## Bau-Sitzung 3 (Brief 03 — Technik) — 2026-06-27

Branch `claude/family-projekt-implementation-yeeogy` (Bau-Stand `…-bau-2ji792`
per fast-forward übernommen, darauf weitergebaut).

**Phase 1 — Fundament:**

- **Modul 07 Apoptose** 1:1 aus Sage nach `sbkim/07_apoptose.js` kopiert +
  Script-Tag in index/markt/netzwerk/werkzeuge (nach 05) + `SbkimApoptose.init()`
  fail-soft in die Andock-Kette. Damit sind die **Siegel-Pflicht-Module
  vollständig** (01/02/03/04/05/07/15).
- **Siegel lebendig:** `SbkimSiegel.isCertified() === true`; Badge mountet in
  `#sbkim-siegel-badge`; **SIEGEL-Slot** im Status-Widget öffnet das Erklärungs-
  Modal; **Bronze → Gold** bei `sbkim:handshake established`. Band graviert
  „FAMILY PROJEKT" (Modul-16-Konvention: Host graviert eigenen Namen).
- **Befund (wichtig):** Die Andock-Kette „hängt" headless intermittierend —
  der three.js-Hintergrund läuft headless auf **Software-GL (swiftshader)** und
  bremst den Main-Thread + IndexedDB-Callbacks aus. Mit `reducedMotion: reduce`
  läuft die Kette deterministisch durch (Storage→Widget→Membran→Siegel). **Kein
  echter Bug** — auf Klaus' GPU (Galaxy Tab S6) kein Thema; die Geschwister-Apps
  nutzen dasselbe Modul 01. Der Siegel-Smoke nutzt darum `reducedMotion`.
- **Briefkasten-Gerüst (§11.6):** `sbkim/SIGNAL.json` (seq 1, Beitritts-Aushang,
  mailboxes/ack/forNodes für Sage + SB-KIMTool-Point) + `sbkim/AUSTAUSCH-Sage.md`
  + `sbkim/AUSTAUSCH-SB-KIMTool-Point.md` (Beitritts-Briefe, Bitte um reziproke
  Quittung). **nodeId/sporeUrl bewusst PENDING** — siehe Spore-Schritt unten.

**Phase 2 — Marktplatz + Geld (Klaus' Richtungsentscheide 2026-06-27):**

- **Marktplatz PR-basiert:** Einreichen erzeugt zusätzlich einen vorgelinkten
  GitHub-PR (propose-changes auf `assets/config/listings.js`, `quick_pull=1`,
  Commit-Titel + PR-Beschreibung mit fertigem Eintrag) — wie Andock-Wizard
  Modul 19. Copy-Paste-Block bleibt als Fallback. Keine Auto-Veröffentlichung.
- **PayPal Platzhalter:** `assets/config/spenden.js` (`enabled:false`, leere URLs,
  kein PII). Spenden-/Jahresbeitrag-Knöpfe rendern deaktiviert „(in Vorbereitung)";
  scharf via `enabled:true` + echte PayPal-Links auf Klaus' Steuer-Wort.
  „Family Projekt unterstützen"-Sektion auf `markt.html`.

**Phase 3 vorgezogen:**

- **Footer-Bauleiste dev-only:** `renderAppLinks()` hinter `isDev()` (`?dev` /
  `fp_dev=1`). WorkFloh/ISD⁺ nicht mehr dauerhaft öffentlich verlinkt.

**Tests:** `tests/smoke_all.mjs` **58/58 grün** (neu: 9 Siegel-Punkte,
3 Marktplatz/Spenden, 2 Footer). Headless-Lauf:
`PW_CORE=/opt/node22/lib/node_modules/playwright/node_modules/playwright-core/index.js`
`PW_CHROMIUM=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome|head -1)`.

**OFFEN (braucht Klaus' Browser / Folge-Sitzung):**

1. **Eigene Spore** (`sbkim/spore.json`) — Klaus erzeugt im Browser
   (Dev-Briefkasten `?dev` → „Eigene Spore erzeugen"), damit der **private
   Schlüssel dauerhaft bei ihm** bleibt (Klaus-Entscheid 2026-06-27, empfohlen).
   Danach: `nodeId` in `SIGNAL.json` nachtragen + Eintrag/Quittung bei Sage +
   SB-KIMTool-Point (reziproke Übergabe-Bestätigung).
2. **Weekly-Discovery-Bild per Drag&Drop** (analog Bild-des-Tages) — noch offen;
   Weekly unterstützt heute Bilder via `weekly.js`-`img`-Feld.
3. **Deploy** (Hetzner, Caddy + git pull) — erst nach Phase 1/2 fertig
   (Klaus-Entscheid 2026-06-27).

## Bau-Sitzung 4 (Brief 04 — Spore/Netz/Weekly/Deploy) — 2026-06-27

Branch `claude/spore-generation-network-receipt-eyzz27` (Session-vorgegeben).
Bau-Stand `…-implementation-yeeogy` (PR #2, Brief 04 enthalten) per Reset
übernommen, darauf weitergebaut. Stacked Draft-PR mit Base
`claude/family-projekt-implementation-yeeogy` (saubere Inkrement-Diff). Merge-
Reihenfolge entscheidet Klaus: PR #1 → PR #2 → diese.

**Getan (autonom, Freibrief — logisch, abgegrenzt, headless getestet):**

- **Brief-04-Schritt 4 — Weekly-Discovery-Bild per Drag&Drop** gebaut (analog
  „Bild des Tages"). **5-fach-Klick** aufs Weekly-Bild (`#discShot`) öffnet ein
  Wechsel-Fenster (gleiche `.fp-bild-*`-Optik), das **pro Weekly-Eintrag** ein
  Bild setzt: Drag&Drop ODER Tippen (JPG/PNG/WebP), Vorschau, Übernehmen
  (lädt das bisherige herunter), „Auf Standard zurücksetzen" (zurück auf
  Config-`img`/Emoji). Gespeichert in `localStorage` Schlüssel
  `fp_weekly_img:<url|name>`; `renderDiscover` zieht den Override vor, fällt
  fail-soft auf Config-Bild bzw. Emoji zurück. SVG gesperrt (`isSvg`). Nur
  `index.html` (Startseiten-IIFE) berührt; `assets/config/weekly.js`-Kopf um
  Hinweis ergänzt.
- **Brief-04-Schritt 1 entschärft — Spore-Erzeugung KONSOLEN-FREI** (Klaus'
  Befund 2026-06-27: der Spore-Knopf endete mit einem DevTools-`copy(...)`-Befehl,
  den ein Neueinsteiger nicht ausführen kann). Der Dev-Briefkasten-Knopf „Eigene
  Spore erzeugen" zeigt jetzt nach dem Erzeugen einen **geführten Pfad**:
  nummerierte Schritte + JSON in readonly-`<textarea>` + **📋 JSON kopieren**
  (Clipboard, Fallback select+execCommand) + **→ Datei im Repo anlegen**
  (GitHub-Link `…/new/main?filename=sbkim/spore.json`, Pfad vorbelegt) +
  **⬇ Als Datei herunterladen** (Alternative). Kein Terminal, keine Konsole.
  Nur öffentlicher Teil (Hinweis: privater Schlüssel bleibt im Browser). Neue
  Funktion `renderSporeGuide()` in `sbkim/sbkim-init.js`.
- **Modell-Lade-Robustheit (Klaus' Befund 2026-06-27, Screenshots):** beim
  Spore-Erzeugen kam „Modell 'Xenova/multilingual-e5-small' konnte nicht geladen
  werden: network error". Diagnose: der **GitHub-Lese-Pfad funktioniert**
  (Klaus' „Verbindung testen" zeigte Sage seq 32 + SB-KIMTool-Point seq 24 ✓);
  nur der **HuggingFace-Modell-Download** (~30 MB, anderer Host) schlug fehl —
  transient/host-spezifisch beim Erstlauf. Fix in **family-project-eigenem Code**
  (`sbkim/sbkim-init.js`, Modul 03 bleibt 1:1 aus Sage): `startSporeGeneration()`
  zeigt **Download-Fortschritt** (Event `sbkim:embedding-progress`), bei Fehler
  einen **klaren Hinweis** (Erstlauf braucht stabile Verbindung, danach offline)
  + **↻ Erneut versuchen** (Modul 03 setzt seinen `pipePromise` bei Fehler
  zurück, Retry funktioniert). **Offene Tafel-Frage an Sage:** falls der
  HuggingFace-Download bei Klaus dauerhaft scheitert, ist ein Modell-Mirror/
  -Vendoring in **Sage Modul 03** die saubere Lösung (Tafel-Evolutions-Klausel,
  nicht stillschweigend umgehen) — Copy-Paste-Brief unten.
- **Newcomer-Andock-Wizard geführt (Klaus' Wunsch: „auch Fremde sollen sich so
  leicht mit jedem Repo verbinden"):** der Modul-19-Ausgang auf `netzwerk.html`
  wird um **Kopier-Knöpfe** (Spore-Vorlage, status.json-Zeile) + einen
  **„→ sbkim/spore.json in DEINEM Repo anlegen"**-Link erweitert, der aus der
  eingegebenen Repo-URL gebaut wird (`https://github.com/<owner>/<repo>/new/main
  ?filename=sbkim/spore.json`), plus nummerierte Schritte + ehrlicher Hinweis
  (unsignierte Start-Vorlage; echte signierte Identität entsteht auf der eigenen
  Seite). **Modul 19 bleibt byte-1:1 aus Sage** — die Erweiterung ist reines
  Seiten-Code in `netzwerk.html` (umschließt den Modul-Ausgang). CSS `.fp-aw-*`.
  **Wenn Klaus es überall will**, wird die Erweiterung in einer Sage-Sitzung in
  `src/modules/19_andock_wizard.js` gehoben (sonst Drift).
- **Tests:** `tests/smoke_all.mjs` **62/62 grün** (+2 Weekly; +1 Dev-Briefkasten
  geführter Spore-Pfad; +1 netzwerk: Wizard-Ausgang geführt — Kopier-Knöpfe +
  „in deinem Repo anlegen"-Link).

**OFFEN — braucht Klaus' Browser (NICHT autonom machbar):** Schritte 1–3 + 5–6
aus Brief 04 hängen an der **eigenen Spore**. Die erzeugt Klaus im Browser,
damit der **private Schlüssel dauerhaft bei ihm** bleibt (Klaus-Entscheid
2026-06-27) — eine headless erzeugte Spore hätte einen weggeworfenen privaten
Schlüssel und wäre wertlos. Reihenfolge sobald die Spore da ist:
`sbkim/spore.json` committen → `nodeId`/`sporeUrl` in `SIGNAL.json` (seq +1,
`_pending` raus) → reziproke Netz-Quittung Sage + SB-KIMTool-Point → Deploy
(Hetzner) → unabhängiger End-to-End-Mycel-Test. Schritt-für-Schritt für Klaus
in `docs/sessions/BRIEF_05_SPORE_NETZ_DEPLOY.md` + in der Chat-Antwort.

## Bau-Sitzung 4 — Nachtrag: Eigene Spore live + reziprok verifiziert (2026-06-27)

Klaus hat im Browser die **eigene Spore erzeugt** (geführter Pfad, der
Modell-Download klappte beim erneuten Versuch — die 404/„network error" vorher
waren transient). Spore in den Chat gegeben → Sitzung hat sie committet.

- **`sbkim/spore.json`** angelegt — nodeId
  `HLXUEJFWHGt6DlRFgzvN4d_YdHRfnrehlVdRb4BHvAE`, `nodeType: hybrid`. Nur
  öffentlicher Teil; privater Schlüssel bleibt in Klaus' Browser.
- **Selbst-Verifikation (Modul-02-Schema):** Ed25519-Signatur **VALID**,
  `nodeId == base64url(sha256(rawPublicKey))`, `domainVector` 384-dim, L2-Norm 1.000.
- **Reziproke Verifikation (Modul 04, Cosinus):** Family ↔ Sage **0.8287**,
  Family ↔ SB-KIMTool-Point **0.8311**; beide Nachbar-Signaturen ebenfalls VALID.
- **`sbkim/SIGNAL.json`** auf **seq 2** gehoben (nodeId eingetragen, `_pending`
  raus, headline + history). **`AUSTAUSCH-Sage.md`** + **`AUSTAUSCH-SB-KIMTool-Point.md`**
  je um Nachtrag „Spore liegt vor + reziprok verifiziert" ergänzt (Bitte um
  Aufnahme + Quittung).
- **Neuer Test `tests/smoke_spore.mjs`** (pure Node, kein Browser): 6/6 lokal,
  **10/10 mit `--net`** (reziproke Cosinus-/Signatur-Prüfung gegen die Nachbarn).

**OFFEN für die echte Netz-Quittung:** die `sporeUrl` zeigt auf **`main`** —
damit Sage + SB-KIMTool-Point die Family-Spore von `raw/main` holen können, muss
die Family-Spore **auf `main`** liegen (Merge der Family-PRs #1→#2→#3). Danach:
reziproke **Eintragung + Quittung in Sage + SB-KIMTool-Point** (status.json /
NETZ-STAND + deren Postfach) — eigener Schritt, Klaus entscheidet Merge + ob die
Sitzung in die beiden Nachbar-Repos committet.

## Nächster Brief: `docs/sessions/BRIEF_03_TECHNIK.md` (2026-06-27)

Technische Umsetzung: Spore + Siegel + **Einbindung ins Mycel** (inkl. self-
contained „Verbinde mich mit dem Mycel"-Anleitung für fremde Seiten/KI),
Marktplatz-Einreich-Dienst, PayPal vorbereiten, Weekly-Discovery-Bild,
Footer-Bauleiste dev-only, Deploy. Design ist abgeschlossen (Klaus abgenommen).

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
