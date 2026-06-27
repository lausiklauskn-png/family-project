# Brief — Folge-Sitzung 5: Spore erzeugen, Netz-Quittung, Deploy

> Stand 2026-06-27, geschrieben am Ende von Bau-Sitzung 4 (Brief 04).
> Freibrief gilt (selbstständig bauen/testen/mergen, wenn logisch + getestet;
> im echten Zweifel Klaus fragen). Antworten auf Deutsch, Einzelschritte-Stil.
> Klaus testet live am Galaxy Tab S6 (Termux + Chrome).

## Stand (was steht — alles headless grün, smoke_all.mjs 60/60)

- **Modul 07 Apoptose** verdrahtet → SBKIM-Siegel **zertifiziert** (Pflicht-
  Module 01/02/03/04/05/07/15). Badge `#sbkim-siegel-badge`, Bronze → Gold bei
  Handshake, Band „FAMILY PROJEKT".
- **Briefkasten-Gerüst (§11.6):** `sbkim/SIGNAL.json` (seq 1) + `sbkim/AUSTAUSCH-Sage.md`
  + `sbkim/AUSTAUSCH-SB-KIMTool-Point.md`. **nodeId/sporeUrl PENDING** (warten auf die Spore).
- **Marktplatz PR-basiert** · **PayPal Platzhalter** (`spenden.js`, `enabled:false`)
  · **Footer-Bauleiste dev-only** (`?dev`).
- **NEU Bau-Sitzung 4 — Weekly-Discovery-Bild per Drag&Drop** (Brief-04-Schritt 4):
  5-fach-Klick auf das Weekly-Bild der Startseite öffnet ein Wechsel-Fenster
  (gleiche `.fp-bild-*`-Optik wie „Bild des Tages"), das **pro Weekly-Eintrag**
  ein Bild setzt (Drag&Drop/Tippen, Vorschau, Übernehmen lädt das alte herunter,
  „Auf Standard zurücksetzen"). Override in `localStorage` `fp_weekly_img:<url|name>`,
  `renderDiscover` zieht ihn vor, SVG gesperrt, fail-soft auf Config-`img`/Emoji.

## Branch-Hinweis (wichtig)

Bau-Sitzung 4 lief auf dem Session-vorgegebenen Branch
`claude/spore-generation-network-receipt-eyzz27`, **gebaut auf**
`claude/family-projekt-implementation-yeeogy` (PR #2). Es liegen **drei** Draft-PRs:
PR #1 (`bau-2ji792`, Website) · PR #2 (`implementation-yeeogy`, Technik, baut auf #1)
· PR der Bau-Sitzung 4 (Weekly-Bild, Base = `implementation-yeeogy`). **Merge-
Reihenfolge entscheidet Klaus:** #1 → #2 → Weekly-PR → `main`. Erst danach ist
`sporeUrl` (zeigt auf `main`) auflösbar.

## Pflichtlektüre vor Arbeit (in dieser Reihenfolge)

1. CLAUDE.md-Geist der Familie (Ehrlichkeit, kein PII, Klaus' Browser-Sichttest
   unersetzbar, „Merge entscheidet Klaus" sofern nicht klar getestet+abgegrenzt).
2. `docs/PULS.md` — Bau-Sitzung 4 + Offen-Liste.
3. Dieser Brief.
4. `Sage-Protokol/sbkim/SIGNAL.json` (§11.6-Format) + `Sage-Protokol/sbkim/NETZ-STAND.md`
   + `Sage-Protokol/sbkim/AUSTAUSCH-*.md` (Quittungs-Form) für den Knoten-Eintrag.

## Was zu tun ist (Reihenfolge — Schritte 1–3, 5–6 brauchen Klaus' Browser)

1. **Eigene Spore mit Klaus erzeugen** (NICHT headless — privater Schlüssel bleibt
   dauerhaft in Klaus' Browser, Klaus-Entscheid 2026-06-27). **Jetzt konsolen-frei**
   (Bau-Sitzung 4): Klaus' Schritte sind reine Knopf-Klicks:
   - Seite lokal (`python3 -m http.server`) oder deployed mit **`?dev`** öffnen
     → unten **🛠 Dev-Briefkasten** → Knopf **„Eigene Spore erzeugen"** (lädt das
     Embedding-Modell ~30 MB einmalig, dauert kurz).
   - Im Ergebnis-Block: **📋 JSON kopieren** → **→ Datei im Repo anlegen** (GitHub
     öffnet `sbkim/spore.json` mit vorbelegtem Pfad) → ins Textfeld einfügen →
     unten **Commit changes**. Alternativ **⬇ Als Datei herunterladen**.
   - **Kein privater Schlüssel ins Repo** — nur der öffentliche Teil
     (`getOwnSpore()`: id, domainVector, signature, …).
2. **nodeId nachtragen:** echte `nodeId` (= `spore.id`) + (falls anders) `sporeUrl`
   in `sbkim/SIGNAL.json` setzen, `_pending`-Feld entfernen, `seq` +1, `history`-Zeile,
   `headline` aktualisieren (Spore da, Identität verifizierbar).
3. **Netz-Quittung anstoßen** (reziprok): Family Projekt in **Sage** + **SB-KIMTool-Point**
   eintragen (`status.json` / `sbkim/NETZ-STAND.md` + Postfach-Quittung in deren
   `AUSTAUSCH-*` bzw. unser `AUSTAUSCH-<Gegenstelle>.md`), reziprok verifizieren
   (Modul 04 Cosinus auf dem signierten `domainVector`), `ack` beidseitig hochsetzen.
   Branch der Gegenstellen-PRs: jeweils der Session-Branch dort.
4. **(erledigt Bau-Sitzung 4)** Weekly-Discovery-Bild per Drag&Drop.
5. **Deploy mit Klaus** (Hetzner, Caddy-Block + git pull, `docs/DEPLOY.md`).
   Vor-Launch-Checkliste: Impressum füllen (kein PII außer Klaus' gewolltem
   Impressum), Dev-Schalter aus, Tagesbild/Listings setzen, PNG ggf. als WebP/JPG.
6. **Unabhängiger End-to-End-Mycel-Test** (Brief 03 §11): separate Mini-Seite,
   deren KI `docs/MYCEL-ANDOCK-AUFTRAG.md` 1:1 ausführt → Identität + Eintrag +
   Handshake + Siegel. (Autonom vorbereitbar als Gerüst; Live-Lauf braucht die Spore.)

## Datenverträge (nicht brechen)

- **Listing:** `{ label, anchorId, text, by, url, img, category }`, Bild-Pflicht,
  SVG gesperrt, alles escaped (`assets/config/listings.js`).
- **Weekly:** `{ name, emoji?, img?, de, en, url }` (`assets/config/weekly.js`);
  Override-Key `fp_weekly_img:<url|name>` in `localStorage`, SVG gesperrt.
- **Spore:** kanonisch wie Sage (Modul 02), `nodeType: hybrid`.
- **Init-Reihenfolge:** `SbkimWidget.init()` VOR `SbkimMembrane`/`SbkimSiegel`.
- **Smoke headless:** `reducedMotion: reduce` für die SBKIM-Kette (three.js auf
  Software-GL bremst sonst IndexedDB-Callbacks — kein echter Bug, GPU ok).

## Spätere, eigene Sitzungen

Auto-Handshake übers Relay · Marktplatz-Hintergrund-Dienst · PayPal scharf
(Steuer-Wort) · Bild-Generator · Qualitäts-/Sicherheits-Check für Listings.

## Abschluss-Befehl der Folge-Sitzung

PULS fortschreiben, neuen Brief anlegen, „Nächste Schritte"-Block + (bei offener
Frage an ein anderes Repo) Copy-Paste-Brief im Chat ausgeben. Briefkasten pflegen
(§11.6). Die Kette reißt nie ab.
