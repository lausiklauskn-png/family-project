# Sitzungsbrief — Sauberer Neu-Test (Clean Slate) + Andock-Tool

**Datum erstellt:** 2026-06-28 · **Branch (ALLE Repos):** `claude/spore-generation-network-receipt-eyzz27-f9lpew`
**Freibrief gilt** (siehe jeweilige `CLAUDE.md` § Freibrief). Deutsch, Einzelschritte, keine
Terminal-/Konsolen-Befehle für Klaus — Bedienung über benannte Knöpfe in der Seite.

---

## 0) Worum es in der nächsten Sitzung geht (Klaus' Wunsch, wörtlich sinngemäß)

Klaus ist überzeugt, dass „es nicht ganz funktioniert", und will **bei null anfangen, um
sauber zu testen** — **nicht heute, nicht morgen unbedingt, aber definitiv**:

1. **Alle SBKIM-Apps deinstallieren** (Rezeptbuch, Mixarium, Sage, SB-KIMTool-Point,
   Pinnwand, Such-Werkzeug, family-project).
2. **Browser tief reinigen** — alle Spuren vernichten: Cache, **Service-Worker**,
   **IndexedDB**, localStorage. (Wichtig: DeX-Chrome und Tablet-Chrome sind **getrennte**
   Instanzen — beide reinigen, falls beide genutzt.)
3. **Alle Apps frisch installieren.**
4. **Sporen neu erzeugen** (jede App bekommt ihre frische Ed25519-Identität).
5. **Mit dem „Andock-Tool" eine App ins Family Project aufnehmen** — der konkrete
   Anwendungsfall: *„Ich habe eine App und möchte, dass sie in die Family aufgenommen wird."*
   → Handshake machen + Spore erzeugen → dann **end-to-end testen**.

**Aufgabe der nächsten Sitzung:** diesen Clean-Slate-Test **begleiten** und das **Andock-Tool
knopf-bedienbar** machen (kein `__fpErzeugeSpore()` in der Konsole — Klaus bedient über Knöpfe).

---

## 1) Was diese Nacht (2026-06-28) erreicht wurde — Stand

- ✅ **family-projekt.de ist LIVE** auf Klaus' Hetzner-Server (CX23, `167.233.204.72`).
  - DNS bei **INWX** umgestellt: `family-projekt.de` + `www` → `167.233.204.72`
    (Wildcard `*` + `relay` unverändert).
  - Caddy (Docker, `/opt/relay/docker-compose.yml` + `/opt/relay/Caddyfile`) um einen
    Website-Block erweitert; `/srv/family-project` als `git clone` (main) + read-only Volume
    in den Caddy-Container gemountet. Let's-Encrypt-Zerts für `.de`/`www`/`relay` ausgestellt.
  - **Update-Pfad:** auf dem Server `cd /srv/family-project && git pull origin main`
    (Caddy liefert statisch aus, kein Reload nötig). Backups: `/opt/relay/*.bak.*`.
  - Browser-Sichttest grün (Startseite, Netzwerk, Footer, Impressum, PWA-Installierbar).
- ✅ **Sage Such-Werkzeug — 3 Fixes (alle gemergt, Browser-bestätigt):**
  - PR #470 → ersetzt durch **PR #471 (progressiv)**: Knoten-Suche hält die lokalen Treffer
    **nicht mehr** hinter der Live-Relais-Frage zurück (UX hing bis zu 5 min). Lokale Treffer
    sofort; Live-Antwort wird **progressiv nachgereicht** (`onLive`-Callback), 5-Min-Timeout
    bleibt großzügig (Klaus: kaltes Embedding-Modell auf schwachem Netz braucht das).
  - **PR #472**: „↗ Seite öffnen"-Link für Knoten-Treffer (Adresse stand in `anchorId`, nicht
    `url`; `queryCorpus` leitet `url` jetzt aus externem `anchorId` ab). Detail-Karte zeigt
    den App-Link → Browser-bestätigt (Mixarium öffnet).
  - Smoke `smoke_bau22_such_widget.mjs` **257/257**, Standalone **46/46**, Drift grün.

---

## 2) ⭐ ZENTRALER EHRLICHER BEFUND — der Lauschen-Rollout ist schon fertig

**Der Brief `SESSION_BRIEF_LAUSCHEN_ROLLOUT.md` war VERALTET.** Er behauptete, nur
family-project + Sage hätten das Nostr-Auto-Lauschen (Stufe 2). **Geprüft (2026-06-28): ALLE
7 Knoten haben die Stufe-2-Verdrahtung bereits auf `main`.** Nicht nochmal bauen!

Verifiziert pro Repo auf `origin/main`:
- **Mein-Tresor, Jasons-Tresor, BookLedgerPro, Mein-Mixarium, Mein-Rezeptbuch:**
  `index.html`/QC lädt `sbkim/05b_nostr_relay.js` (`type=module`), `sbkim/sbkim-init.js` ruft
  `SbkimAnastomose.listenNostr()` auf (fail-soft, Empfangsmodus), und
  `sbkim/05_anastomose.js` ist **byte-identisch mit Sage** (md5 `43df4f2f21a51e006770561dbf28eadc`,
  definiert `listenNostr` real). 05b + `noble-secp256k1.js` liegen im Repo.
- **SB-KIMTool-Point:** über `werkzeuge.html` (lädt `web/tools/sbkim-nostr-relay.js` +
  `assets/nostr-listen-init.js`, PR #91).
- **family-project + Sage:** hatten es ohnehin.

**Folge:** Die Aufgabe „Rollout in 6 Knoten" ist **erledigt**. Eine frühere Sitzung hat das
bereits nach `main` gemergt. Keine redundanten Rollout-PRs bauen.

### Wichtig fürs Test-Verständnis (VERKEHR-Lampe ≠ Event-Liste)
Klaus' Symptom „im Mixarium-Widget kam unter VERKEHR keine Meldung" ist **kein Beweis für
Nicht-Lauschen**:
- Die **VERKEHR-Lampe grün** = lauscht am Relais (gesetzt durch Event
  `sbkim:nostr-listening`). **Das** ist der Lausch-Indikator.
- „**VERKEHR — letzte 10 Events**" (die Liste) füllt sich **nur, wenn ein Handshake wirklich
  EMPFANGEN** wird (RAM-only FIFO, Tab-Reload leert sie). Leer = es kam (noch) kein Verkehr an,
  nicht „lauscht nicht".
- Warum evtl. nichts ankam: Sages Suche fragt nur die **top-2** Knoten nach Score live →
  an Mixarium ging evtl. gar keine Frage. **ODER stale Service-Worker-Cache** (alte Version
  ohne Wiring). Genau deshalb ist Klaus' **Clean-Slate-Test** (Abschnitt 0) goldrichtig.

---

## 3) Das „Andock-Tool" — wo es ist, was es kann, was zu tun ist

Klaus meint mit „Andock-Tool" den **Dev-Briefkasten** in family-project:
- **Datei:** `family-project/sbkim/sbkim-init.js`. Aktivierung: **`?dev`** an die URL hängen
  (oder `localStorage fp_dev=1`), `?nodev` schaltet aus. **Default AUS** (vor Launch versteckt,
  Brief §6b).
- **Kann heute:** Verbindungs-Test/Handshake-Sync mit Sage & SB-KIMTool-Point (liest deren
  `raw/main` `SIGNAL.json`), **`__fpErzeugeSpore()`** erzeugt die eigene Spore, Schlüssel-Safe
  (Modul 20) öffnet „auf Abruf über das Andock-Tool".
- **Begriffs-Klärung:** historisch „Dev-Briefkasten" → von Klaus „Andock-Tool" genannt. Das
  Tool, mit dem man „eine App ins Family Project aufnimmt" (Spore erzeugen + Handshake).

**Auftrag nächste Sitzung (Andock-Tool knopf-fähig machen):**
1. Den Dev-Briefkasten/Andock-Flow so aufbereiten, dass Klaus **ohne Konsole** per **benannten
   Knöpfen** (a) seine **Spore erzeugt** und (b) den **Handshake/Andock ans Family Project**
   auslöst. `__fpErzeugeSpore()` bekommt einen sichtbaren Knopf im Dev-/Andock-Panel.
2. Klar benennen, was „andocken" bedeutet (Spore erzeugen → am Relais lauschen → Handshake
   mit einem Family-Knoten → Quittung). Empfangsmodus wahren (nur antworten, nie crawlen).
3. Prüfen, ob für den Anwendungsfall „fremde/neue App andocken" der **Andock-Wizard (Modul 19)**
   gebraucht wird (bisher Schablone) — oder ob der family-project-Dev-Briefkasten reicht.
   Im Zweifel **Klaus fragen**.

---

## 4) Konkreter Clean-Slate-Testablauf (für die Test-Sitzung, mit Klaus am Browser)

> Voraussetzung: Klaus hat deinstalliert + Browser tief gereinigt (SW + IndexedDB + Cache).

1. **family-projekt.de** frisch öffnen → Hard-Reload. Werkzeuge-Seite zeigt die Apps.
2. Pro App **frisch installieren** + einmal öffnen (legt frische Ed25519-Identität in IndexedDB
   an). Bei jeder App: **VERKEHR-Lampe wird grün** (= lauscht) — das ist der erste Beleg.
3. **Andock-Tool** (family-project mit `?dev`): **Spore erzeugen**-Knopf → Spore liegt vor.
4. **Echten Cross-Knoten-Handshake auslösen** (der noch nicht end-to-end gezeigte Meilenstein):
   z. B. von Sage/Andock-Tool einen Handshake an Mixariums nodeId übers Relais — dann muss
   **Mixariums „VERKEHR — letzte 10 Events" sich füllen** (Zeile mit Zeit/Quelle/Richtung/
   Entscheidung). **Das** ist der Beweis, dass beide Seiten server-los reden.
5. Ergebnis ehrlich festhalten: was lief, was nicht (kein „grün ohne Klaus' Browser-Lauf").

---

## 5) Kleine offene Punkte (nicht blockierend)

- **Sage `sbkim/SIGNAL.json` §11.6 nachziehen:** Auto-Lauschen ans Netz melden (seq+1,
  headline, Postfach-Zeile). War schon im alten Brief offen; eigener kleiner Commit.
- **Session-Branches hinken `main` hinterher** (kosmetisch — `main` ist, was deployt wird).
  Vor neuer Arbeit pro Repo `git fetch origin main` + `git merge origin/main` (Fast-Forward).
  Heute schon gemacht für: SB-KIMTool-Point, Mein-Tresor, Jasons-Tresor, BookLedgerPro,
  Mein-Mixarium (0/0), Mein-Rezeptbuch (war 9 ahead/235 behind — vorsichtig mergen).
- **Mixarium-Disziplin:** `index.html` == `QC_Mixarium_*.html` byte-identisch (md5 prüfen).
  **Rezeptbuch:** `build.py` aus QC + `_CR`-Block.

---

## 6) Pflichtlektüre VOR der nächsten Arbeit (Kette reißt nie ab)

1. Dieser Brief (`family-project/docs/SESSION_BRIEF_CLEAN_RETEST_ANDOCK.md`).
2. Der vorige Brief `family-project/docs/SESSION_BRIEF_LAUSCHEN_ROLLOUT.md` (**veraltet bzgl.
   Rollout — siehe Abschnitt 2**) + `family-project/docs/DEPLOY.md`.
3. Pro berührtem Repo: dessen `CLAUDE.md` + `PULS.md`/`SESSIONS.md`.
4. Muster fürs Andock/Lauschen: `family-project/sbkim/sbkim-init.js` (Dev-Briefkasten +
   `__fpErzeugeSpore` + listenNostr) und `Sage-Protokol/sbkim-init.js`.
- **Freibrief gilt.** Headless-Smoke ist der Beweis; Klaus' Browser-Lauf ist die finale Abnahme.

## 7) Abschluss-Befehl (Pflicht am Sitzungsende)
`PULS.md`/`SESSIONS.md` fortschreiben · „Nächste Schritte"-Block im Chat · **neuen Brief**
schreiben + vollständig als Codeblock im Chat ausgeben · §11.6 SIGNAL.json pflegen, wo gebaut.
