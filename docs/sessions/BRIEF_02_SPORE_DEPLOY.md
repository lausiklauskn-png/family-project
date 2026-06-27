# Brief — Folge-Sitzung 2: Spore erzeugen, Knoten eintragen, Deploy

> Stand 2026-06-27, geschrieben am Ende von Bau-Sitzung 1. Freibrief gilt
> (selbstständig bauen/mergen wenn logisch + getestet; im echten Zweifel Klaus
> fragen). Antworten auf Deutsch, Einzelschritte-Stil.

## Stand (was steht)

Die Website **Family Projekt** ist gebaut und headless grün (`tests/smoke_all.mjs`
35/35): Startseite + drei Räume (Netzwerk/Werkzeuge/Marktplatz) + 3 Tool-
Landingpages + Impressum-Vorlage. Echter three.js-Mycel-Hintergrund, 3 Themen,
DE/EN, Mikrofon überall, Holo-Schrift. Family Projekt ist als **SBKIM-Knoten**
verdrahtet (Module 1:1 aus Sage, Init-Kette 17→15→16), Kopf-Status lebt,
**Dev-Briefkasten + Verbindungs-Test** unter `?dev`. Deploy-Doku liegt
(`docs/DEPLOY.md` + `Caddyfile.example`).

**Noch nicht:** Klaus' Browser-Sichttest; eigene Spore (`sbkim/spore.json`);
Eintrag in die Netz-Briefkästen; tatsächliches Aufspielen auf Hetzner.

## Pflichtlektüre vor Arbeit (in dieser Reihenfolge)

1. `CLAUDE.md`-Geist der Familie (Ehrlichkeit, kein PII, Klaus' Browser-Sichttest
   unersetzbar, „Merge entscheidet Klaus" sofern nicht klar getestet+abgegrenzt).
2. `docs/PULS.md` — aktueller Stand + offene Schritte.
3. Dieser Brief.
4. `SB-KIMTool-Point/docs/family-project/BRIEF_FAMILY_PROJEKT.md` (Original-
   Übergabe, alle Entscheidungen; liegt auf Branch `claude/family-projekt-uebergabe`).
5. `Sage-Protokol/docs/INTERFACES.md` §11.6 (Briefkasten/Netz-Sync) +
   `Sage-Protokol/sbkim/SIGNAL.json` (Format) für den Knoten-Eintrag.

## Was zu tun ist (Reihenfolge)

1. **Eigene Spore** erzeugen: Seite lokal/deployed öffnen mit `?dev`, im
   Dev-Briefkasten „Eigene Spore erzeugen" (lädt das Embedding-Modell ~30 MB
   einmalig) → JSON nach `sbkim/spore.json` committen. (Alternativ
   `__fpErzeugeSpore()` in der Konsole.) **Kein privater Schlüssel ins Repo** —
   nur die öffentliche Spore.
2. **Netz-Briefkasten anlegen:** `sbkim/SIGNAL.json` (seq, nodeId, sporeUrl,
   mailboxes, ack) + `sbkim/AUSTAUSCH-*.md` für Sage + SB-KIMTool-Point nach dem
   §11.6-Muster. Eintrag bei den Gegenstellen anstoßen (Klaus relayt, oder PR).
3. **Verbindungs-Test** mit Klaus live (Dev-Briefkasten → „Verbindung testen").
4. **Deploy mit Klaus** nach `docs/DEPLOY.md` (Caddy-Block + git pull auf Hetzner).
5. **Vor Launch-Checkliste** (DEPLOY.md §4): Impressum füllen, Dev-Schalter aus,
   Tagesbild/Listings setzen, Hard-Reload.

## Datenverträge (nicht brechen)

- **Listing/Such-Korpus:** `{ label, anchorId, text, by, url, img, category }`
  (`assets/config/listings.js`). Bild-Pflicht, SVG gesperrt, alles escaped.
- **Spore:** kanonisch wie Sage (Modul 02). nodeType `hybrid`.
- **Init-Reihenfolge:** `SbkimWidget.init()` VOR `SbkimMembrane`/`SbkimSiegel`.

## Spätere, eigene Sitzungen

Auto-Handshake übers Relay · Einreich-Dienst + Freigabe · Bezahlung/PayPal/
Jahresbeitrag · Bild-Generator · Qualitäts-Check · ggf. volles Such-Widget (22).

## Abschluss-Befehl der Folge-Sitzung

PULS fortschreiben, neuen Brief für die nächste Sitzung anlegen, „Nächste
Schritte"-Block + (bei offener Frage an ein anderes Repo) Copy-Paste-Brief im
Chat ausgeben. Die Kette reißt nie ab.
