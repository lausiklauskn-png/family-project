---
name: saubere-netz-anmeldung
description: Kanonische Reihenfolge, damit eine SBKIM-PWA eine saubere, EIGENE Identität, eine saubere Spore und eine saubere Anmeldung im gemeinsamen Netz-Raum bekommt. Anwenden, wenn in eine von Klaus' PWAs (Mixarium, Rezeptbuch, BookLedgerPro, SB-KIMTool-Point, family-project, Such-Tool, Pinnwand, künftige Tools) die Netz-Anmeldung / Rendezvous / Identität eingebaut wird — ODER wenn Apps auf der Karte kollidieren (mehrere Apps zeigen dieselbe nodeId, "nur N verbinden sich", "Mixarium dockt als Rezeptbuch an"). Sichert stabile, getrennte Identitäten auf der geteilten GitHub-Pages-Adresse.
---

# Saubere Netz-Anmeldung (SBKIM-Identitäts-Hygiene)

Die feste Reihenfolge, mit der eine SBKIM-PWA zu **einer eigenen, stabilen
Identität** kommt und sich **sauber** im gemeinsamen Raum anmeldet. Diese
Reihenfolge ist verbindlich für **jedes** Werkzeug, das ans Netz andockt — sie
wird eingebaut, nicht jedes Mal neu erfunden.

## Warum es das Problem gibt (der Browser als schwarzes Loch)

Alle Endknoten-PWAs liegen unter **einer** Adresse: `lausiklauskn-png.github.io`.
GitHub Pages gibt jedem Repo einen Unterpfad, aber **dieselbe Origin** — und
IndexedDB, localStorage, Service-Worker und Caches hängen an der **Origin**, nicht
am Pfad. Ohne Trennung teilen sich also **alle** Apps *eine* Datenbank `sbkim`,
*eine* Identität, *einen* Service-Worker. Ergebnis: mehrere Apps melden sich mit
**derselben** `nodeId` im Raum an, docken falsch an, "nur N verbinden sich". Der
Browser verschluckt die getrennten Identitäten in einen Topf.

## Der Ziel-Zustand (E1–E4) — dahin muss jede App

- **E1** — die App läuft in ihrer **eigenen** Schublade `sbkim_<suffix>`, nicht in
  der geteilten Default-DB `sbkim`.
- **E2** — sie hat **genau eine** eigene, **stabile** Identität (nodeId + privater
  Schlüssel) in dieser Schublade.
- **E3** — sie hat eine **eigene gültige Spore** aus dieser Identität.
- **E4** — sie ist mit der **lebenden** Identität im gemeinsamen Raum angemeldet.

## Ehrliche Grenze (wichtig)

Eine Web-Seite kann **nur die Daten ihrer eigenen Origin** löschen — NICHT den
ganzen Browser, NICHT fremde Seiten. Das ist hier **genau richtig**: der
vergiftete geteilte Topf (`sbkim`) liegt auf *dieser* Origin, also darf ein Knopf
in *irgendeiner* der Apps ihn für alle säubern. Kein Server, keine Fremd-Rechte.

## Zwei Modi — nie vermischen

### Modus A — Normaler Start (automatisch, bei jedem Laden, NICHT zerstörend)

Läuft bei jedem `init()`. **Idempotent** — beim zweiten, dritten Laden passiert
nichts mehr. **Löscht nie von selbst.** So bleibt die Identität stabil und das Netz
kann feste Beziehungen aufbauen.

1. `SbkimStorage.init({ dbSuffix: "<app-suffix>" })` — **immer zuerst**, vor Spore
   und Rendezvous. Öffnet `sbkim_<suffix>` statt der Default-DB `sbkim`.
2. Prüfen, ob in dieser Schublade schon eine eigene Identität liegt
   (Modul 02 `loadIdentity`). 
   - **Ja** → nichts tun. Fertig.
   - **Nein** → **einmal** anlegen (Modul 02 `getOrCreateIdentity`).
3. **Kein** Löschen, **kein** Wipe, **kein** Auto-Anmelden ins Netz
   (Empfangsmodus — Anmelden ist nutzer-ausgelöst).

### Modus B — Reparatur / Neu-Anmelden (EIN Knopf, vom Nutzer ausgelöst)

Der sichtbare Knopf im "🌐 Mit dem Netz verbinden"-Werkzeug. Kraftvoll, aber immer
vom Menschen ausgelöst. Genaue Reihenfolge (Klaus' Reihenfolge, bestätigt):

1. **Reinigen (nur diese Origin):**
   - Default-DB `sbkim` löschen (`indexedDB.deleteDatabase("sbkim")`) — der
     geteilte Alt-Topf, die eigentliche Kollisions-Quelle.
   - Veraltete Service-Worker abmelden (`registration.unregister()` für alle).
   - Alte Caches leeren (`caches.keys()` → `caches.delete(...)`).
   - **NICHT** die eigene Schublade `sbkim_<suffix>` anfassen, außer der Nutzer
     will ausdrücklich eine ganz neue Identität.
2. **Neue Identität** in der eigenen Schublade `sbkim_<suffix>` frisch anlegen
   (Modul 02 `getOrCreateIdentity`, ggf. nach Löschen des alten Schlüssels).
3. **Spore erzeugen** aus der neuen Identität (Modul 02 `getOwnSpore`).
4. **Im Netz anmelden** — lebende Visitenkarte in den Raum heften
   (Modul 23 `SbkimRendezvous.connectAndAnnounce`), Karte
   `{kind:"sbkim-presence", nodeId, nodeName, spore, ts}`, Tag `sbkim-rdv`.
5. **Hart neu laden** (Strg+Shift+R bzw. Chrome "Cache leeren und neu laden"),
   damit der frische Service-Worker greift.

## Wo das Werkzeug lebt (Bauform — Klaus 2026-07-08)

- **Erweiterung von Modul 23** ("🌐 Mit dem Netz verbinden"), das ohnehin in jede
  PWA wandert. Die Hygiene-Schritte (Modus B, Schritt 1) kommen **vor** das
  bestehende Anmelden. Gleiche Knopf-Familie wie Such-Tool und Pinnwand.
- Dazu ein kleines eigenständiges **Demo-/Vorlage-Repo** (wie `such-tool/`), das
  die Schritte vorführt und 1:1-kopierbar ist.
- Das Werkzeug darf in der App **versteckt / in der Ecke** liegen — Hauptsache
  Modus A läuft automatisch und der Reparatur-Knopf (Modus B) ist erreichbar.

## Per-App-Checkliste (bevor eine App als "sauber" gilt)

- [ ] `SbkimStorage.init({ dbSuffix: "<suffix>" })` läuft **als Erstes**, vor Spore
      und Rendezvous. Suffix ist **eindeutig** pro App.
- [ ] Bekannte Suffixe: Mixarium `mixarium` · Rezeptbuch `rezeptbuch` ·
      BookLedgerPro `bookledgerpro` · **Sage `sage`** (in `sbkim-init.js`
      `SbkimStorage.init({dbSuffix:"sage"})` — NICHT in index.html) · Kim-Bell
      `kimbell` · **SB-KIMTool-Point `toolpoint`** (war ursprünglich ohne Suffix →
      Kollisions-Quelle, muss gesetzt sein).
- [ ] Rendezvous mountet mit dem **richtigen** `nodeName` der App.
- [ ] Modus A ist idempotent (löscht nie von selbst).
- [ ] **Modus B ist in JEDEM Panel** (Knopf „🧹 Aufräumen & neu anmelden"), nur
      hinter Nutzer-Knopf, und **behält die stabile Identität** (neue nur auf
      `newIdentity:true`).
- [ ] **Modell-Ladefortschritt** sichtbar bei Verbinden/Anmelden **und „Wer ist im
      Raum?"** (kein Doppel-Balken, siehe PFLICHT-Abschnitt).
- [ ] Nach jedem Deploy: hart neu laden (Service-Worker-Cache).

## PFLICHT: Modell-Ladefortschritt IMMER anzeigen (Klaus 2026-07-08)

Wenn die Identitäts-Erzeugung das **Embedding-Modell (~30 MB, einmalig, CDN)**
lädt, MUSS **immer** eine **Prozent-Anzeige** sichtbar sein — direkt im Panel,
nicht nur in der Konsole. Am Tablet dauert der Download 1–2 Minuten; **ohne
Balken denkt der Nutzer, es hängt/ist eingefroren, und schließt zu, bevor es
fertig geladen hat.** Das ist der häufigste Grund für einen falsch-negativen
„es passiert nichts".

**Verbindlich — überall, wo ein Embedding-Modell lädt:**

1. **Quelle:** das Modul-03-Event `sbkim:embedding-progress` mit
   `detail.progress` (0–100), `detail.file`, `detail.status`
   (`"progress"`/`"done"`/`"ready"`).
2. **Vor** `SbkimEmbedding.init()` einen `window.addEventListener(
   "sbkim:embedding-progress", …)` setzen; nach `init()`/im Fehlerfall
   wieder abmelden (`removeEventListener`).
3. Den Balken in **EINER** Zeile aktualisieren (kein Log-Spam): z.B.
   `"█".repeat(pct/5) + "░".repeat(20 - pct/5) + "  NN %"`. Fertig → `✓`.
4. **Fail-soft:** fehlt das Panel-Element, bricht nichts — nur der Balken
   entfällt.

**Gilt für:** die Netz-Anmeldung / Spore-Erzeugung (Modus A **und** B), **„👥 Wer
ist im Raum?"** (`discover()` lädt via `getOwnLiveSpore` evtl. das Modell!), den
**Siegel-Bau** (Bronze-Zertifizierung lädt zum Prüfen das Modell), das
Such-Werkzeug und **jedes** weitere Tool, das `SbkimEmbedding` anfasst.

**Referenz-Umsetzung:** app-eigener Callback `Kim-Bell/assets/rendezvous-init.js`
(`ensureProgressEl`/`onProg`/`stopProg` in `createIdentity`) **oder** UI-seitig
`23_rendezvous_ui.js` (`startModelProgress`/`stopModelProgress`, in
`onConnect`/`onAnnounce`/`onDiscover`). **Nicht doppeln:** wo der app-eigene
`createIdentity` schon einen Balken zeigt (onConnect/onAnnounce), zeigt die UI dort
KEINEN zweiten; `onDiscover` hat keinen createIdentity → dort zeigt die UI ihn.

## Live-Handshake über das Relais — erprobte Lehren (Klaus 2026-07-08)

Am 2026-07-08 lief der erste server-lose Live-Cross-Knoten-Handshake **Sage ↔
Kim-Bell** im Browser („✓ ANDOCK ETABLIERT"). Dabei bestätigte Lehren:

- **Handshake-Timeout 5 min, nicht 12 s.** `RDV_HANDSHAKE_TIMEOUT_MS = 300000`
  (Modul 23). Beim ersten Andocken lädt eine Seite evtl. das ~30-MB-Modell; 12 s
  liefen in den Timeout und die Meldung „Request-Signatur ungültig" war nur ein
  **Abbruch-Artefakt** (nach 5 min verschwand sie). Dokumentierter Wert:
  INTERFACES §Modul 05 / PULS Modul-18-Handshake.
- **„Aufräumen & neu anmelden" (Modus B) gehört in JEDES Panel** (nicht nur ins
  Demo-Tool). Modul 23 muss `ensureIdentity` (Modus A) + `cleanupSharedOrigin` +
  `repairAndReconnect` (Modus B) tragen; die geteilte UI den Knopf.
- **Stabile Identität ist Default — Modus B vermehrt NICHT.** `repairAndReconnect`
  **behält** die eigene Identität (`sbkim_<suffix>` überlebt die Reinigung des
  geteilten `sbkim`-Topfs) und meldet sie nur neu an. Eine **neue** Identität nur
  auf ausdrückliches `newIdentity:true` (Notfall-Knopf). Sonst entstehen bei
  ungeduldigem Mehrfach-Klick mehrere Identitäten → mehrere eigene Karten im Raum.
- **Alte eigene Visitenkarten:** Nostr-Karten lassen sich **nicht sicher** aus dem
  Relais löschen; sie **verfallen** aber nach dem Frische-Fenster
  (`RDV_FRESH_SEC_DEFAULT = 1800` = 30 min) von selbst aus der Anzeige. Zusätzlich
  (Klaus 2026-07-08 gewählt): (a) **Vermehrung stoppen** (siehe oben), (b) **eigene
  frühere `nodeId`s merken + aus Raum-Ansicht UND Mycel-Karte ausblenden**
  (relais-unabhängig), (c) **best-effort NIP-09-Löschung** (kind:5) fürs eigene
  aktuelle Kärtchen beim Aufräumen (nur solange der Schlüssel da ist; Relais darf
  ignorieren). Die **Mycel-Karte** (`Sage-Protokol/mycel-karte/`) ist ein LIVE-
  Relais-Visualisierer — Dedupe/Ausblenden gehört dort mit hinein.

## Verfassungs-Treue (Leitplanken)

- **Empfangsmodus:** Anmelden ist immer nutzer-ausgelöst, kein Dauer-Piepser,
  `init()` baut nichts ins offene Netz auf.
- **Kein PII:** nur nodeId / Schlüssel / Spore, nie Klarnamen, nie ins Netz außer
  der Spore.
- **TABU unberührt:** `PROVIDER_MIN_MATCH` (0.80-Andock-Riegel), `DB_VERSION`,
  `PROTOCOL_VERSION` werden von der Hygiene NICHT verändert. Kern-Module 01/02/05/23
  werden benutzt, nicht umgebaut.
- **Kopieren, nicht klonen:** das Modul byte-gleich in jede App, Drift-Guard im
  Smoke-Test.

## Kurz-Merksatz

**Erst die eigene Schublade (Suffix), dann prüfen/anlegen (sanft, automatisch).**
Der Nutzer-Knopf reinigt den geteilten Topf → neue Identität → Spore → anmelden →
hart neu laden. Reinigen ist zerstörend und bleibt beim Menschen; der Start ist
sanft und automatisch.
