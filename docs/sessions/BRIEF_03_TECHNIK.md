# Brief — Folge-Sitzung 3: Technische Umsetzung (Mycel, Siegel, Marktplatz, PayPal)

> Stand 2026-06-27, geschrieben am Ende der Design-Sitzung. Freibrief gilt
> (selbstständig bauen/testen/mergen, wenn logisch + getestet; im echten Zweifel
> Klaus fragen). Antworten auf Deutsch, Einzelschritte-Stil, Klaus testet live
> am Galaxy Tab S6 (Termux `python3 -m http.server` + Chrome).

## Stand (was steht — Design ist fertig)

Die Website **Family Projekt** ist gebaut und durchgehend **headless grün**
(`tests/smoke_all.mjs` 42/42): Startseite + 3 Räume (Netzwerk/Werkzeuge/
Marktplatz) + 3 Tool-Landingpages + Impressum. Design mit Klaus live poliert:

- **Glas-Cabochon-Buttons überall** (Buttons, Pillen, Mikro, Navi-Links auf
  Hover, Karten, Bild des Tages, Markt-Karten): geschliffene Kante + maus-
  folgender Holo-Schimmer (Theme-Farben) + 3D-Neigung zum Cursor. Reduced-motion
  ohne Tilt. (`assets/style.css` + `assets/app.js` `wireHoloButtons`.)
- **Status-Widget** (LEBT/VERKEHR/FREMD/SIEGEL): andockbar in die Navleiste,
  per Maus lösbar (bleibt waagerechte Pille, kein „Status"-Text), ✕ → Restore-
  Chip. (`assets/status-widget.js`; Modul 17 versteckt, liefert Siegel-Proxy.)
- **Bild des Tages**: füllt den Rahmen vollflächig (Pad-Verhältnis = Bild-
  Verhältnis), Titel „Family Projekt" oben mittig, wackelt wie die Buttons,
  leicht transparent (Hintergrund schimmert durch). **5-fach-Klick** öffnet ein
  Drag&Drop-Wechsel-Fenster (neues Bild in localStorage, altes wird
  heruntergeladen). Erstes Bild: `assets/tagesbilder/kosmos-mycel.png`.
- **three.js-Mycel-Hintergrund**: Sterne leuchten **unter der Maus** heller.
- **Footer „Meine Apps (Bauphase)"**: schmale Glas-Buttons zu Klaus' PWAs
  (Rezeptbuch, Mixarium, BookLedgerPro, Tresore, WorkFloh, Such-Werkzeug,
  Pinnwand, SB-KIMTool-Point, Sage-Protokol, Sage-Einladung). `assets/config/
  meineapps.js`.
- **SBKIM-Knoten verdrahtet**: Module 01/02/03/04/05/15/16/17/19 1:1 aus Sage;
  Init-Kette `SbkimWidget.init()` vor Membran/Siegel; **Dev-Briefkasten +
  Verbindungs-Test** unter `?dev`/`fp_dev=1`.

**Noch NICHT:** eigene Spore (`sbkim/spore.json`), Deploy auf Hetzner, Siegel
sichtbar/lebendig, echter Marktplatz-Einreich-Dienst, PayPal, Weekly-Discovery-
Bild-Einfügen, fremde Seiten ins Mycel holen.

## Pflichtlektüre vor Arbeit (in dieser Reihenfolge)

1. `docs/PULS.md` (oben „Letzter Stand" + Nachträge).
2. Dieser Brief + der vorige `docs/sessions/BRIEF_02_SPORE_DEPLOY.md`.
3. `docs/DEPLOY.md` + `Caddyfile.example` (Hetzner/Caddy).
4. `SB-KIMTool-Point/docs/family-project/BRIEF_FAMILY_PROJEKT.md` (Original-
   Übergabe; liegt auf Branch `claude/family-projekt-uebergabe`).
5. Für Siegel/Mycel: `Sage-Protokol/src/modules/16_siegel.js`,
   `15_membran.js`, `05_anastomose.js`, `02_spore.js`, `19_andock_wizard.js`;
   `Sage-Protokol/docs/INTERFACES.md` §11.6 (Briefkasten/Netz-Sync) + §1 Modul 16;
   gelebtes Muster: `Mein-Mixarium/sbkim/sbkim-init.js` (Siegel-Modal-Injektion).
6. Für Markt/Such-Korpus: `assets/config/listings.js`, `markt.html`,
   `Sage-Protokol/docs/components/_toolpoint_marktplatz.md` (PR #459).

## Was zu bauen ist (Reihenfolge)

**Phase 1 — Fundament (Verbindung + Siegel zuerst, Klaus' Priorität):**

1. **Eigene Spore erzeugen + committen.** Seite mit `?dev` öffnen → Dev-
   Briefkasten → „Eigene Spore erzeugen" (lädt Embedding-Modell ~30 MB einmalig)
   → JSON nach `sbkim/spore.json` committen. **Nur öffentliche Spore, kein
   privater Schlüssel ins Repo.**
2. **Siegel sichtbar + lebendig (Modul 16).** SIEGEL-Slot im Status-Widget
   öffnet das Siegel-Modal (Proxy-Klick auf `#sbkim-siegel-badge` ist da). Modal
   mit Erklärung wie in den Geschwister-Apps (siehe `Mein-Mixarium/sbkim/
   sbkim-init.js` § Siegel-Injektion: Schutz-Block + „Ausführlich erklärt" +
   Identitäts-/Semantik-Block), **theme-adaptiv**. Bronze (self-issued) → Gold
   bei erstem echten Handshake (`sbkim:handshake outcome:"established"`).
3. **Einbindung ins Mycel vorbereiten (Klaus' Kern-Wunsch).**
   - Family Projekt als echten Knoten in die **Netz-Briefkästen** eintragen:
     `sbkim/SIGNAL.json` + `AUSTAUSCH-*.md` für Sage + SB-KIMTool-Point nach
     §11.6; Eintrag bei den Gegenstellen anstoßen (Klaus relayt oder PR).
   - **Self-contained „Verbinde mich mit dem Mycel"-Anleitung/Prompt** bauen
     (für FREMDE Seiten/KI, siehe § Klaus-Frage unten). Liegt im **Netzwerk-Raum
     / Knoten-Werkzeug**: ein copy-paste-Prompt + Datei-Liste (raw-URLs der
     Module) + Schritt-für-Schritt, **keine offenen Fragen, nur Antworten**.
     Ziel-Endzustand: Identität (Spore) + Module integriert + status.json-Eintrag
     + **self-issued Siegel**. **Ehrlich:** der vollautomatische Rück-Handshake
     übers Relay bleibt „in Vorbereitung" — das ist der einzige offene Punkt.

**Phase 2 — Marktplatz + Geld:**

4. **Marktplatz-Einreich-Dienst.** Heute ist das Formular ein Platzhalter
   (zeigt JSON für Klaus' Freigabe-Liste). Echten Weg bauen: Einreichung →
   **Freigabe-Liste** (Klaus gibt frei) → Eintrag in `listings.js`/Korpus. Klein
   anfangen (z.B. Einreichung erzeugt einen vorbereiteten PR/Issue, Klaus merged).
   Sicherheit: alles escaped, SVG gesperrt, Bild-Pflicht, kein fremder Code
   (Brief §5 des Original-Briefs).
5. **PayPal-Bezahlung vorbereiten.** Spenden-Platzhalter (Werkzeug-Seiten) +
   Jahresbeitrag (Marktplatz) auf **echte, opt-in PayPal-Knöpfe** vorbereiten
   (PayPal.me / Spenden-Button; echte Abwicklung erst nach Klaus' Steuer-/
   Selbstständigkeits-Klärung — NICHT scharf schalten ohne sein Wort). Höhe noch
   offen (ein paar Euro/Jahr, sehr niedrig).
6. **Weekly Discovery — Bild einfügen.** Mechanismus, um Discovery-Einträgen
   ein Bild zu geben (analog zum Bild-des-Tages-5-Klick-Drag&Drop, oder die
   Markt-Listings mit Bild speisen die Discovery). Fair-Regeln bleiben: zufällig,
   kein Such-Bonus, nur Einträge MIT Bild erscheinen.

**Phase 3 — Launch-Vorbereitung:**

7. **Footer-Bauleiste dev-only** schalten (enthält WorkFloh/ISD⁺ — nicht
   dauerhaft öffentlich). Nur sichtbar bei `?dev`/`fp_dev=1`.
8. **Impressum** mit echten Angaben füllen (Platzhalter raus). **Tagesbild** ggf.
   als WebP optimieren (PNG ~2,4 MB).
9. **Deploy auf Hetzner** mit Klaus (Caddy-Block + git pull, `docs/DEPLOY.md`).

## Datenverträge (nicht brechen)

- **Listing/Such-Korpus:** `{ label, anchorId, text, by, url, img, category }`
  (`assets/config/listings.js`). Bild-Pflicht, SVG gesperrt, alles escaped.
- **Spore:** kanonisch wie Sage (Modul 02), nodeType `hybrid`.
- **Init-Reihenfolge:** `SbkimWidget.init()` VOR `SbkimMembrane`/`SbkimSiegel`.
- **Netz-Sync §11.6:** SIGNAL.json `seq`/`ack`/`mailboxes`; das Pushen IST das
  Signal.
- **Konfig-Dateien** (`assets/config/*.js`) bleiben Klaus-editierbar ohne Code.

## Akzeptanzkriterien

- `tests/smoke_all.mjs` bleibt grün (neue Features mit Smoke-Punkt abdecken).
- Spore erzeugt + committet; Siegel-Modal öffnet sich + erklärt theme-adaptiv.
- „Verbinde mich"-Anleitung ist self-contained (eine fremde KI käme allein damit
  zum Endzustand Identität+Module+Eintrag+Siegel — keine offene Frage).
- PayPal/Marktplatz/Weekly-Bild sind **funktionsfähig vorbereitet**, nichts
  vorgetäuscht; Platzhalter klar benannt.
- Klaus' Browser-Sichttest steht über jedem „grün".

## Offene Fragen an Klaus

- PayPal: echter Spenden-Empfänger/Link schon hinterlegen, oder reiner
  Platzhalter bis zur Steuer-Klärung?
- Marktplatz-Freigabe: PR-basiert (Klaus merged) oder später kleiner Dienst?
- Deploy-Zeitpunkt: erst alle Phase-1/2-Punkte, oder früh deployen und live
  weiterbauen?

## Abschluss-Befehl der Folge-Sitzung

`docs/PULS.md` fortschreiben, neuen Brief für die nächste Sitzung anlegen,
„Nächste Schritte"-Block + (bei offener Frage an ein anderes Repo) Copy-Paste-
Brief im Chat ausgeben. Die Kette reißt nie ab.
