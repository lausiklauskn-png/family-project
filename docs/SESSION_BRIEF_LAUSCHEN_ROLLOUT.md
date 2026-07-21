# Sitzungsbrief — Lauschen-Rollout (Stufe 2 / Nostr-Relais) + Deploy

**Datum:** 2026-06-27 · **Branch (ALLE Repos):** `claude/spore-generation-network-receipt-eyzz27`

## Ziel der nächsten Sitzung
1. **Auto-Lauschen (Nostr-Relais, Stufe 2) der Reihe nach** in die restlichen 6 Knoten integrieren.
2. Danach **Schritt für Schritt** weiter bis zum **Deploy von family-projekt.de auf Hetzner** (heute noch).

## Stand — diese Sitzung erledigt (beide PRs Draft, warten auf Klaus' Merge + Browser-Sichttest)
- **family-project — PR #9:** Apps öffentlich auf der Werkzeuge-Seite + öffentliche App-Leiste im Footer **jeder** Seite + echtes Impressum (Daten aus Mein-Rezeptbuch) + **Auto-Lauschen beim Öffnen**. Smoke **74/74 grün**.
- **Sage-Protokol — PR #462:** Impressum in `pinnwand/` + `such-tool/` gefüllt, `docs/einladung/` verlinkt das Haupt-Impressum; **Auto-Lauschen am Nostr-Relais** (`index.html` lädt `src/modules/05b_nostr_relay.js`, `sbkim-init.js` ruft `listenNostr()` nach `Anastomose.init()`). Nostr-Smoke **17/17 grün**.
- → **family-project + Sage lauschen jetzt selbsttätig** (Empfangsmodus mit Antwortrecht: antworten nur, initiieren nie).

## Korrigierter Netz-Stand (gegen `main` geprüft — wichtig!)
- **ALLE 7 SBKIM-Repos haben auf `main` einen vollen Knoten + GitHub-Briefkasten (§11.6):** Sage, SB-KIMTool-Point, Mein-Rezeptbuch, Mein-Mixarium, Mein-Tresor, Jasons-Tresor, BookLedgerPro.
- **Mein-WorkFloh** ist KEIN Knoten (privat, ISD⁺) → **bleibt außen vor**.
- **Nostr-Relais-Lauschen (Stufe 2)** haben bisher **nur family-project + Sage**.
- Der „Briefkasten" mit Sync/seq/ack/Postfach ist der **GitHub-Relais** (§11.6) — läuft überall. Das **Auto-Lauschen** ist der **Live-Nostr-Kanal** `wss://relay.family-projekt.de`.

## ⚠️ KRITISCH — Branch-Basis
Die **Session-Branches der Konsumenten-Apps hinken `main` hinterher** (z. B. Mein-Rezeptbuch Session-Branch = 0 SBKIM, `main` = voller Knoten). **NIEMALS Stufe 2 auf dem veralteten Session-Branch bauen.** Pro Repo ZUERST:
```
git fetch origin main
git merge origin/main      # main in den Session-Branch holen, Konflikte lösen
```
DANN erst Stufe 2 drauf. **Immer gegen den `main`-Stand arbeiten.**

## Rollout-Reihenfolge (einer nach dem anderen, je Draft-PR → Klaus merged + Browser-Test)
1. **SB-KIMTool-Point** (klein, multi-file, `npm test`)
2. **Mein-Tresor**
3. **Jasons-Tresor**
4. **BookLedgerPro**
5. **Mein-Mixarium** (Single-File 1,3 MB — `index.html` == `QC_Mixarium_*.html` byte-identisch, md5 sync!)
6. **Mein-Rezeptbuch** (Single-File — `build.py` aus QC + `_CR`-Block; nach QC-Änderung `python3 build.py`)

## Stufe-2-Rezept pro Repo („kopieren, nicht klonen" — byte-identisch aus Sage)
- **Quelle:** Sage `src/modules/05b_nostr_relay.js` + `src/modules/noble-secp256k1.js` + `05_anastomose.js` (enthält `listenNostr`).
- Dateien ins Repo legen; bei Single-File-Apps an passender Stelle einbinden, bei multi-file als Skript.
- **05b als `<script type="module">` laden** (self-mountet `window.SbkimNostrRelay`, importiert `noble` relativ → gleiche Mappe).
- In der Andock-Init-Kette **NACH `SbkimAnastomose.init()`** einfügen (nicht-blockierend, fail-soft):
```js
if (window.SbkimAnastomose && typeof SbkimAnastomose.listenNostr === "function" && window.SbkimNostrRelay) {
  try { SbkimAnastomose.listenNostr().catch(function (e) { console.warn(e); }); } catch (e) {}
}
```
- **Muster:** `family-project/sbkim/sbkim-init.js` + `Sage-Protokol/sbkim-init.js` (Commits dieser Sitzung).
- **Relais:** `wss://relay.family-projekt.de` (live). **Empfangsmodus:** nur antworten, nie selbst initiieren (kein Crawler). Schutz-Module 10/11/12/15 sind der Wächter (später aktivieren).
- **Testen:** vorhandenen headless-Smoke grün halten (Tresor/Jasons/SBKIMTool: `npm test`; Single-File: `node --check` + md5/build-Disziplin).
- **§11.6 bei Sitzungsende:** `sbkim/SIGNAL.json` `seq`+1 + Postfach-Zeile, pushen (Push = Signal). **Nachholen: Sage SIGNAL.json** (Auto-Lauschen wurde diese Sitzung noch nicht ins Signal geschrieben).

## Deploy (Ziel heute) — family-projekt.de auf Hetzner
- Anleitung: **`family-project/docs/DEPLOY.md`** (Hetzner + Caddy, `/srv/family-project`, Update via `git pull origin main`).
- Voraussetzung: **PR #9 nach `main` gemerged**. Dann auf dem Server: `git pull origin main` + Caddy reload.
- Produktion = Hetzner (nicht GitHub Pages); GitHub Pages bleibt Vorschau.

## Impressum-Daten (real, Quelle Mein-Rezeptbuch)
`Klaus Nitzsche · Märchenweg 14 · 21077 Hamburg · Deutschland · info@family-projekt.de`
- Optional **namenlos**: `info@family-projekt.de` (Klaus' Entscheidung, 1-Zeilen-Änderung). Rechtlich: **ladungsfähige Anschrift Pflicht**, E-Mail darf namenlos sein.

## Öffentliche Apps (family-project, freigegeben)
Rezeptbuch, Mixarium, Sage-Protokoll, Sage-Einladung, SB-KIMTool-Point, Pinnwand, Such-Werkzeug.
**NICHT:** Mein Tresor / Jasons Tresor (noch kein Impressum), BookLedgerPro (später), WorkFloh (ISD⁺/privat).

## Pflichtlektüre für die neue Sitzung
- Pro Repo: dessen `CLAUDE.md` + `PULS.md`/`SESSIONS.md`. **Dieser Brief.**
- Muster-Commits: `family-project` & `Sage` `sbkim-init.js` (Auto-Lauschen); `Sage src/modules/05b_nostr_relay.js`.
- **Freibrief gilt** (siehe jeweilige CLAUDE.md § Freibrief).
- Headless-Smoke family-project:
  `export PW_CORE=/opt/node22/lib/node_modules/playwright/node_modules/playwright-core/index.js; export PW_CHROMIUM=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome|head -1); node tests/smoke_all.mjs`

## Offen / Sichttest
- **Browser-Sichttest #9 + #462** (Hard-Reload Strg+Shift+R!) — wartet auf Klaus.
- Sage `SIGNAL.json` §11.6 nachziehen (Auto-Lauschen melden).
