# Brief — Folge-Sitzung 4: Spore erzeugen, Netz-Quittung, Weekly-Bild, Deploy

> Stand 2026-06-27, geschrieben am Ende von Bau-Sitzung 3 (Brief 03 Technik).
> Freibrief gilt (selbstständig bauen/testen/mergen, wenn logisch + getestet;
> im echten Zweifel Klaus fragen). Antworten auf Deutsch, Einzelschritte-Stil.
> Klaus testet live am Galaxy Tab S6 (Termux + Chrome).

## Stand (was steht — alles headless grün, smoke_all.mjs 58/58)

- **Modul 07 Apoptose** verdrahtet → SBKIM-Siegel **zertifiziert** (Pflicht-
  Module 01/02/03/04/05/07/15 vollständig). Badge in `#sbkim-siegel-badge`,
  SIEGEL-Slot öffnet Modal, **Bronze → Gold** bei Handshake, Band „FAMILY PROJEKT".
- **Briefkasten-Gerüst (§11.6):** `sbkim/SIGNAL.json` (seq 1, Beitritts-Aushang) +
  `sbkim/AUSTAUSCH-Sage.md` + `sbkim/AUSTAUSCH-SB-KIMTool-Point.md`. nodeId/sporeUrl
  **PENDING** (warten auf die Spore).
- **Marktplatz PR-basiert** (vorgelinkter GitHub-PR auf listings.js).
- **PayPal Platzhalter** (`assets/config/spenden.js`, `enabled:false`).
- **Footer-Bauleiste dev-only** (`?dev`).

## Pflichtlektüre vor Arbeit (in dieser Reihenfolge)

1. CLAUDE.md-Geist der Familie (Ehrlichkeit, kein PII, Klaus' Browser-Sichttest
   unersetzbar, „Merge entscheidet Klaus" sofern nicht klar getestet+abgegrenzt).
2. `docs/PULS.md` — Bau-Sitzung 3 + Offen-Liste.
3. Dieser Brief.
4. `Sage-Protokol/sbkim/SIGNAL.json` (§11.6-Format) + `Sage-Protokol/sbkim/AUSTAUSCH-*.md`
   (Quittungs-Form) für den Knoten-Eintrag.

## Was zu tun ist (Reihenfolge)

1. **Eigene Spore mit Klaus erzeugen.** Seite lokal (`python3 -m http.server`)
   oder deployed mit `?dev` öffnen → Dev-Briefkasten → „Eigene Spore erzeugen"
   (lädt das Embedding-Modell ~30 MB einmalig). JSON kopieren
   (`copy(JSON.stringify(await SbkimSpore.getOwnSpore(),null,2))`) → nach
   `sbkim/spore.json` committen. **Kein privater Schlüssel ins Repo.** Privater
   Schlüssel bleibt dauerhaft in Klaus' Browser (Klaus-Entscheid 2026-06-27).
2. **nodeId nachtragen:** echte `nodeId` + (falls anders) `sporeUrl` in
   `sbkim/SIGNAL.json` setzen, `_pending`-Feld entfernen, seq +1.
3. **Netz-Quittung anstoßen:** Family Projekt in Sage + SB-KIMTool-Point
   eintragen (status.json / NETZ-STAND + Postfach-Quittung), reziprok verifizieren
   (Modul 04 Cosinus auf dem signierten domainVector), Übergabe beidseitig
   bestätigen. Branch überall `claude/family-projekt-implementation-yeeogy`.
4. **Weekly-Discovery-Bild per Drag&Drop** (analog Bild-des-Tages 5-Klick-Modal)
   — optionaler Bauphasen-Komfort; Weekly nimmt heute schon `img` via `weekly.js`.
5. **Deploy mit Klaus** (Hetzner, Caddy-Block + git pull, `docs/DEPLOY.md`),
   Vor-Launch-Checkliste (Impressum füllen, Dev-Schalter aus, Tagesbild/Listings).
6. **Unabhängiger End-to-End-Mycel-Test** (Brief 03 §11): separate Mini-Seite,
   deren KI `docs/MYCEL-ANDOCK-AUFTRAG.md` 1:1 ausführt → Identität + Eintrag +
   Handshake + Siegel.

## Datenverträge (nicht brechen)

- **Listing:** `{ label, anchorId, text, by, url, img, category }`, Bild-Pflicht,
  SVG gesperrt, alles escaped (`assets/config/listings.js`).
- **Spore:** kanonisch wie Sage (Modul 02), `nodeType: hybrid`.
- **Init-Reihenfolge:** `SbkimWidget.init()` VOR `SbkimMembrane`/`SbkimSiegel`.
- **Smoke headless:** `reducedMotion: reduce` für die SBKIM-Kette (three.js auf
  Software-GL bremst sonst IndexedDB-Callbacks — kein echter Bug, GPU ok).

## Spätere, eigene Sitzungen

Auto-Handshake übers Relay · Marktplatz-Hintergrund-Dienst (falls PR-Pfad nicht
reicht) · PayPal scharf (Steuer-Wort) · Bild-Generator · Qualitäts-/Sicherheits-
Check für Listings.

## Abschluss-Befehl der Folge-Sitzung

PULS fortschreiben, neuen Brief anlegen, „Nächste Schritte"-Block + (bei offener
Frage an ein anderes Repo) Copy-Paste-Brief im Chat ausgeben. Briefkasten pflegen
(§11.6). Die Kette reißt nie ab.
