# Sitzungsbrief — Modul 23 „Rendezvous" spezifizieren + ins ganze Netz ausrollen

**Datum erstellt:** 2026-06-28 · **Branch (ALLE Repos):** `claude/spore-generation-network-receipt-eyzz27-f9lpew`
**Freibrief gilt** (siehe jeweilige `CLAUDE.md` § Freibrief). Deutsch, Einzelschritte, keine
Konsolen-Befehle für Klaus — Bedienung über benannte Knöpfe.

---

## 0) Worum es geht

Heute (2026-06-28) wurde der **server-lose Live-Cross-Knoten-Handshake BEWIESEN** (Klaus'
Browser-Lauf Tablet↔Handy): „✓ ANDOCK ETABLIERT mit Family Projekt (lebende ID)". Der
Durchbruch war das **Rendezvous** (Schritt ⑥, „Gemeinsamer Raum") — Klaus' eigener Entwurf.
Siehe `docs/PULS.md` ⭐-Meilenstein-Eintrag + family `SIGNAL.json` seq 5.

**Aber:** das Rendezvous lebt **nur in family-project** (als family-spezifischer Tool-Code in
`sbkim/sbkim-init.js`). Alle anderen Knoten **lauschen** zwar schon (Stufe 2, `listenNostr`),
sind aber **nicht auffindbar** (keine Visitenkarte im Raum) und haben **keine** Anmelde-/
Such-/Andock-Knöpfe. „Halb verbunden".

**Ziel dieser Sitzung:** das Rendezvous aus dem family-Prototyp zu einem **sauberen,
geteilten Modul (Modul 23 „Rendezvous")** machen — in Sage spezifiziert + gebaut — und es
dann **1:1 in jede PWA ausrollen**, sodass **jede App** kann: Ein-Klick-Verbinden (Spore-
falls-fehlt + anmelden + lauschen), „Wer ist im Raum?", Handshake an die **lebende** ID.

## 1) Architektur-Wahrheit (nicht verhandelbar)

Das Anmelden **muss aus dem eigenen Browser jeder App** laufen — die **lebende Identität +
der private Schlüssel** liegen pro App/Origin getrennt. family-projekt.de **kann nicht** für
Rezeptbuch anmelden. Darum: das Modul muss **in jede App** (kopiert), nicht zentral. Die
Family-Seite darf der **Bezugsort** sein (wo man das Modul holt), **laufen** muss es überall.

## 2) Datenverträge (aus dem bewiesenen family-Prototyp — 1:1 übernehmen)

- **Gemeinsamer Raum** = geteiltes Nostr-Tag `["t","sbkim-rdv"]`, Event `kind: 1`.
- **Visitenkarte (Presence)** = Event-`content` JSON:
  `{ "kind":"sbkim-presence", "nodeId":"<lebende nodeId>", "nodeName":"<App-Name>", "spore":<volle eigene Spore>, "ts":<unix-sec> }`
- **Entdecken** = `subscribe({ kinds:[1], "#t":["sbkim-rdv"], since:<now-1800> })`, 4 s sammeln,
  dedupe nach `nodeId` (frischeste behalten), eigene `nodeId` rausfiltern.
- **Handshake** = bestehendes Modul 05 `handshake(card.spore, null, { transport:"nostr", timeoutMs:12000 })`
  → adressiert die **lebende** ID, die der Gegenknoten via `listenNostr` wirklich belauscht.
- **Verfassung:** Anmelden + Suchen sind **nutzer-ausgelöst** (Knöpfe). **KEIN getakteter
  Dauer-Piepser** (= Pulsation, fürs Mycel verboten). Empfangsmodus bleibt gewahrt.

Referenz-Implementierung (zum Ausgliedern): `family-project/sbkim/sbkim-init.js` — Funktionen
`doAnnounce` / `announcePresence` / `discoverRoom` / `renderRoomCards` / `handshakeLiveCard` /
`connectToNet`, plus Konstanten `RDV_TAG`, `RDV_PRESENCE_KIND`, `RDV_FRESH_SEC`, `RDV_LISTEN_MS`.

## 3) Plan (Reihenfolge, je eigener PR)

1. **Sage-Spec** `docs/components/23_rendezvous.md` + Eintrag in `docs/INTERFACES.md` (Surface,
   Tag, Presence-Schema, Verfassungs-Klausel). Spec-vor-Code.
2. **Sage-Bau** `src/modules/23_rendezvous.js` — sauber, **konfig-getrieben** (nodeName +
   Relais-Client injiziert, KEINE family-Hardcodes), Surface
   `SbkimRendezvous = { announce/discover/connectAndAnnounce/handshakeCard/_meta }`, fail-soft.
   Headless-Smoke + Panel in `tests/manual_check.html`. Modul 05/05b **unangetastet** (nur
   deren öffentliche `handshake`/`publish`/`subscribe` nutzen).
3. **family-project refaktorieren** — den Inline-Code in `sbkim/sbkim-init.js` durch
   `SbkimRendezvous`-Aufrufe ersetzen (family wird Konsument des Moduls). Muss live weiter
   funktionieren (⑥ + 🌐). Smoke grün halten.
4. **Endknoten-Ausrollung** — Modul 23 **byte-1:1** in jede PWA kopieren + ein kleines UI
   („🌐 Mit dem Netz verbinden / 👥 Wer ist im Raum?"). **Ein PR pro Repo.** Reihenfolge-
   Vorschlag: **Mein-Rezeptbuch zuerst** (vertraut, sichtbares Widget), dann Mixarium, dann
   SB-KIMTool-Point (ersetzt dort das „nackte" Andock-Modul), dann BookLedgerPro, Tresore.

## 4) Repo-Eigenheiten (beim Ausrollen beachten — sonst bricht was)

- **Mein-Rezeptbuch:** `build.py` aus `QC_MeinRezb_*.html` + `_cr_block.txt`. Änderung in der
  **QC-Datei**, dann `python3 build.py` → `index.html`. Pflicht-Checkliste anzeigen.
- **Mein-Mixarium:** `index.html` == `QC_Mixarium_*.html` **byte-identisch** — nach Änderung
  `md5sum` beider vergleichen (müssen gleich sein). Kein build.py.
- **Mein-Tresor / Jasons-Tresor:** byte-gleicher JASONLIB-Kern (`// JASONLIB-CORE-START..END`)
  NICHT anfassen; sbkim-Module liegen separat. `npm test` ist der Beweis.
- **SB-KIMTool-Point:** multi-file, `npm test`. Hat ein „nacktes" Andock-Modul → durch Modul 23
  ersetzen. Hub-Seite darf mehrteilig bleiben.
- **BookLedgerPro:** build-frei, native ES-Module, keine CDNs, `node tests/run.mjs`. DB-Suffix
  `bookledgerpro` nie ändern.
- **Sage:** Quelle/Hub; `manual_check.html`-Knopf-Panels, kein build.py.
- Überall: **„kopieren, nicht klonen"** — Modul-Datei 1:1, nur das UI-Stück ist app-eigen
  (nodeName!). Klaus' Browser-Sichttest bleibt die finale Abnahme (headless ersetzt ihn nicht).

## 5) Akzeptanzkriterien

- Modul 23 in Sage spec'd + gebaut + Headless-Smoke grün.
- family-project nutzt Modul 23 (⑥ + 🌐 laufen unverändert weiter, Smoke grün).
- Mindestens **ein** Endknoten ausgerollt — und **cross-App-Rendezvous live bewiesen**
  (z. B. family ↔ Rezeptbuch: ein Gerät 🌐, das andere 👥 → 🤝 → „ETABLIERT"), Klaus-Sichttest.
- §11.6: betroffene `SIGNAL.json` je +1 pro Repo, das gebaut wurde.

## 6) Offene Fragen an Klaus (vor/bei Start klären)

1. **Andock-Tool öffentlich machen?** Heute ist es `?dev`-versteckt (Brief §6b). Klaus' Vision:
   öffentlich „Mit dem Netz verbinden". Jetzt freischalten oder erst nach dem Rollout?
2. **UI-Einstiegspunkt in jeder App:** eigener Knopf? im Siegel-Modal? in den Einstellungen?
3. **nodeName pro App** bestätigen (Mein Rezeptbuch / Mein Mixarium / Mein Tresor / …).
4. **Marktplatz-Schicht (später):** Such-Werkzeug (Modul 22) über den Raum legen — eigener
   Folge-Strang nach dem Rollout.

## 7) Pflichtlektüre VOR der Arbeit (Kette reißt nie ab)

1. Dieser Brief. 2. `family-project/docs/PULS.md` (⭐-Meilenstein + Stand 2026-06-28).
3. Pro berührtem Repo: dessen `CLAUDE.md` + `PULS.md`/`SESSIONS.md`.
4. Referenz-Code: `family-project/sbkim/sbkim-init.js` (Rendezvous-Funktionen) + Sage
   `src/modules/05_anastomose.js` (`handshake`, `listenNostr`) + `05b_nostr_relay.js`
   (`publish`/`subscribe`). **Freibrief gilt.**

## 8) Abschluss-Befehl (Pflicht am Sitzungsende)

`PULS.md`/`SESSIONS.md` fortschreiben · „Nächste Schritte"-Block im Chat · **neuen Brief** als
Codeblock im Chat · §11.6 `SIGNAL.json` pflegen, wo gebaut · Modul-23-Bau schließt mit
„Sichttest ungeprüft, wartet auf Klaus' Browser-Lauf", bis Klaus es live gesehen hat.
