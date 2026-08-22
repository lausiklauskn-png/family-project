---
name: status-leiste-siegel
description: Das VOLLSTÄNDIGE Rezept für das SBKIM-Siegel + die Status-Lampen-Leiste, damit niemand mehr fragen muss „wie baue ich das Siegel". Anwenden, wenn eine PWA/Page ein Siegel bekommen soll ODER ein bestehendes Siegel unvollständig ist (nur Badge/Lampen, aber ohne das Andock-Werkzeug darin). Umfasst BEIDES: (1) die immer sichtbare Lampen-Leiste (Flying-Widget Modul 17 — LEBT/VERKEHR/FREMD/SIEGEL) + Wächter (Modul 15 Membran) + Bronze/Gold (Modul 16); UND (2) den PFLICHT-INHALT des Siegel-Modals — das Andock-Werkzeug, allen voran der ANDOCK-WIZARD als eigenes Modal-Modul (🔑 eigene Identität & Spore erzeugen/verwalten: Identität · Spore signieren+Download · verschlüsseltes Backup · Wiederherstellen · Identitäts-Wechsler), dazu ✍ Semantik-Beschreibung → Spore neu signieren, 🛡 Schutz-Block + Erklär-Overlay, ⛨ fremden Knoten andocken. Der Andock-Wizard ist NICHT mit Modul 19 (SbkimAndockWizard, Onboarding-Vorlage ohne Krypto) zu verwechseln. Regel: JEDES Siegel wird nach diesem Muster gebaut — mit dem Andock-Wizard + Werkzeug darin, nicht nur als Badge.
---

# SBKIM-Siegel + Status-Lampen-Leiste — das vollständige Rezept

Damit **niemand mehr fragen muss** „wie baue ich das Siegel". Ein Siegel ist
**nicht nur ein Badge mit Lampen** — im Modal steckt das **Andock-Werkzeug**:
eigene Identität & Spore erzeugen/verwalten, Beschreibung neu signieren, fremde
Knoten andocken. **Jedes Siegel wird nach diesem Muster gebaut.**

Modul-Dateien werden **byte-1:1 kopiert** (Drift-Guard im Smoke). Der host-seitige
Modal-Inhalt wird pro App aus der Referenz übernommen und nur in den Config-Werten
angepasst.

## FUNDORT — nie mehr suchen (Klaus 2026-07-08)

**Das echte Siegel-Bild (Gold-Wappen mit selbst-gravierendem Band):**
- **Kanonische SVG-Quelle:** `Sage-Protokol/assets/sbkim-siegel-wappen.svg`
  (19 KB) — DIE Datei zum **Kopieren/Clonen**. Wer ein Siegel baut, holt sie hier.
- **Als Code (inline dupliziert, byte-identisch):** die Konstante `WAPPEN_SVG` in
  **`Sage-Protokol/src/modules/16_siegel.js`** — das ist, was die Apps als Kopie
  (`modules/sbkim-siegel.js`) tatsächlich rendern. Bei SVG-Änderung **beide**
  Stellen nachziehen (SVG-Datei + `WAPPEN_SVG`).
- **Das Band füllt sich per `ribbonText`** (siehe TEIL 2b) — ohne den Wert bleibt
  es leer.

## Referenz-Dateien — **Sage ist die Quelle der Wahrheit** (Klaus 2026-07-14)

**Regel:** `Sage-Protokol` ist der **Ausgangspunkt der Wahrheit**. Alles andere
(SB-KIMTool-Point, Mixarium, Rezeptbuch, …) sind **Klone**, die **drift**en können —
sie werden **NIE** als Vorlage genommen, nur zum Vergleich. Wer ein Siegel baut oder
prüft: **schau in Sage nach.** Dort ist alles vollständig und dokumentiert; erst in
Sage richtig bauen, **dann** byte-genau in die Klone übernehmen.

- **`Sage-Protokol/index.html`** (~Z. 4006–4510) — **DAS ORIGINAL / die Vorlage.**
  Vollständige Baustein-Kette: `injectIdentityLinkIntoSiegel` / `buildSchutzInfoBlock` /
  `buildSemantikBlock` (✍ v0.2 + `embedSnippets`, Spore-Pflege) / `openAndockWizard` /
  `andockStep1..4Identity/Spore/Backup/Restore` / **`refreshAndockIdentities` /
  `andockSwitchIdentity` (Identitäts-Wechsler = Baustein 5)** + „⛨ Fremden Knoten andocken".
  Modul-SVG/Ribbon: `Sage-Protokol/src/modules/16_siegel.js` (`WAPPEN_SVG`) + Quelle
  `Sage-Protokol/assets/sbkim-siegel-wappen.svg`.
- **`SB-KIMTool-Point/assets/sbkim-siegel.js`** — **Klon, NICHT als Vorlage nehmen.**
  ⚠️ **Befund 2026-07-14 (Klaus' Browser):** diesem Klon **FEHLT der Identitäts-Wechsler
  (Baustein 5)** — dadurch legte jeder „Identität erzeugen"-Klick eine neue an →
  Doppel-/Dreifach-Identität. Beweis, warum man Klone nie als Quelle nimmt. Wird aus
  Sage neu bespielt, nicht selbst gepflegt.
- **`Mein-Mixarium/sbkim/sbkim-init.js`** — **Klon / Host-Injektions-Variante**:
  `watchForSiegelModal` (MutationObserver) → `injectIdentityLinkIntoSiegel`; der 🔑-Knopf
  öffnet hier den Modul-18-Andock-Wizard (`SbkimToolPwa.openAndockTab()`). Ebenfalls gegen
  Sage prüfen, nicht als Vorlage.

Beim Bau/Prüfen eines Siegels: **immer Sage als Vorlage** — die Config (Name, Domäne,
`dbSuffix`, `ribbonText`) anpassen, die Bausteine **vollständig** übernehmen (inkl.
Identitäts-Wechsler). Klone nur vergleichen; Abweichung = Klon aus Sage neu bespielen.
**Und: Ergebnisse immer zurück in Sage dokumentieren.**

---

## TEIL 1 — Die Status-Lampen-Leiste (immer sichtbar)

Eine selbst-mountende, verschiebbare Lampen-Pille (Modul 17), die den Live-Zustand
zeigt — **immer sichtbar, nicht im Siegel-Modal versteckt** (Klaus 2026-07-08).

| Lampe | Bedeutung | Event / Quelle |
|---|---|---|
| **LEBT** | Knoten lebt (Spore/Identität geladen). | Modul 02 → `sbkim:alive` + Self-Heartbeat |
| **VERKEHR** | **Grün, solange am Relais gelauscht wird**; pulst bei Handshakes/postMessages. | Modul 05/23 → `sbkim:nostr-listening {active}` · `sbkim:handshake` · `sbkim:postmessage` |
| **FREMD** | Rot bei echtem Fremdzugriff (Browser-KI-Agent / App-Brücke). | Modul 15 → `sbkim:fremd-alert` |
| **SIEGEL** | Erscheint bei Zertifizierung; Bronze → Gold. | Modul 16 → `sbkim:siegel-certified` |

## TEIL 2 — Wann das Siegel kommt (automatisch)

- **Bronze — beim Start**, sobald die **7 Pflicht-Module** geladen sind (Surface-
  Selbst-Prüfung): **01** Storage · **02** Spore · **03** Embedding · **04** Match ·
  **05** Anastomose · **07** Apoptose · **15** Membran. Fehlt eines → **kein** Siegel
  (Anti-Greenwashing). Embedding ist nur **eines** der sieben — nicht der Auslöser.
- **Gold — nach dem ersten Handshake** (`sbkim:handshake outcome:"established"`).

## TEIL 2b — Das echte Wappen-Bild + das SELBST-GRAVIERENDE Band (App-Name)

Das Siegel ist **kein flacher Text-Badge** — Modul 16 trägt ein vollständiges
**Gold-Auszeichnungs-Wappen als inline-SVG** (`WAPPEN_SVG`: Akkretions-Korona,
Gold-Ring, „OFFIZIELLE BESTÄTIGUNG / SBKIM / SIEGEL", drei Medaillons). Unten im
Wappen liegt ein **Ordens-Band (Ribbon)**, das den **Namen der App/des Repos**
trägt — das **SELF-INSCRIBING**-Element.

**So füllt sich das Band (Pflicht-Wissen, häufigste Fehlerquelle):**

- Der Band-Text kommt aus **`SbkimSiegel.init({ ribbonText: "<App-Name>" })`**.
- **Ohne `ribbonText` bleibt das Band LEER** (offen) — Klaus-Entscheidung
  2026-06-20: **kein** geratener Repo-Slug auf einer Auszeichnung. Es gibt
  **keine** Auto-Ableitung aus `repoUrl` (auch wenn `repoUrl` gesetzt ist).
- Technik (Modul 16): `effectiveRibbonText()` gibt `""` zurück, solange nicht
  `ribbonTextExplicit`; `renderWappenSvg()` ersetzt den `RIBBON_MARKER`
  (`>SAGE OBSERVATORIUM</textPath>`) durch den App-Namen (XML-escaped). Ist der
  Wert exakt der Default `"SAGE OBSERVATORIUM"`, bleibt das SVG byte-identisch.
- **Alt-Falle:** eine bloß kopierte SVG-Datei zeigte früher statisch
  „MEIN-TRESOR" (Kopie nie angepasst). Darum **immer** den eigenen `ribbonText`
  setzen — sonst leeres oder fremdes Band.

**Regel: JEDE App graviert ihren eigenen Namen ein** — `ribbonText: "<App-Name>"`
im `SbkimSiegel.init(...)`. Beispiele: Sage `"SAGE OBSERVATORIUM"` · Kim-Bell
`"Kim-Bell"` · SB-KIMTool-Point `"SB·KIMTool·Point"` · Rezeptbuch/Mixarium ihr
jeweiliger Name. Das Wappen mit gefülltem Band ist im Siegel-**Modal** groß und
lesbar; im 40-px-Badge klein, aber dasselbe SVG.

**Wo die SVG-Quelle liegt:** inline in `src/modules/16_siegel.js` (`WAPPEN_SVG`),
Quelle `assets/sbkim-siegel-wappen.svg` — bei Änderungen **beide** nachziehen
(byte-identisch, Konvention Karte 16 § Bauzustand).

## TEIL 3 — Verbindliche Lade-/Init-Reihenfolge

**Modul 17 (Widget) MUSS VOR Modul 15/16 inited werden** — das Widget legt die
Proxy-Spans `#lamp-fremd` + `#sbkim-siegel-badge` an, an die Membran + Siegel hängen.

```
1. SbkimStorage.init({ dbSuffix: "<app-suffix>" })                 // eigene Schublade
2. await SbkimWidget.init({ allowedOrigins, repoUrl })             // 17 — Proxy-Spans
3. SbkimMembrane.init({ allowedOrigins /* oder lampSelector */ })  // 15 — Wächter/FREMD
4. SbkimSiegel.init({ badgeSelector:"#sbkim-siegel-badge", mountModal:true, repoUrl,
                      ribbonText:"<App-Name>" })  // 16 — ribbonText graviert den Namen ins Band (Pflicht, sonst leer)
5. SbkimApoptose.init()                                             // 07 (Pflicht-Modul)
```

Reine Seiten mit eigener Statusleiste (Sage-Page/Point) nutzen statt Modul 17 die
Seiten-Lampen (`#lamp-alive`/`#lamp-traffic`/`#lamp-fremd` + `.lamps`) — siehe
`SB-KIMTool-Point/assets/sbkim-siegel.js` (`badgeSelector: ".lamps"`).

---

## TEIL 4 — DER PFLICHT-INHALT DES SIEGEL-MODALS (das Andock-Werkzeug)

**Das ist der Kern, der oft vergessen wird.** Modul 16 rendert nur das **Gerüst**
(Badge + Modal + Bronze/Gold-Marker + PFLICHT-MODULE-Selbstprüfliste + Aspekte).
Den **Inhalt** — das Andock-Werkzeug — injiziert die **App host-seitig**, sobald
Modul 16 sein Modal `#sbkim-siegel-modal` ins DOM hängt. Modul 16 bleibt dabei
**unangetastet** (netzweit geteiltes Render-Modul).

### Muster: MutationObserver + Injektion
```js
function watchForSiegelModal() {
  var m = document.getElementById("sbkim-siegel-modal");
  if (m) injectIntoSiegel(m);
  var obs = new MutationObserver(function (muts) {
    muts.forEach(function (mu) {
      [].forEach.call(mu.addedNodes, function (n) {
        if (n.id === "sbkim-siegel-modal") injectIntoSiegel(n);
        else if (n.querySelector) {
          var inner = n.querySelector("#sbkim-siegel-modal");
          if (inner) injectIntoSiegel(inner);
        }
      });
    });
  });
  if (document.body) obs.observe(document.body, { childList:true, subtree:true });
}
```
`injectIntoSiegel(modal)` hängt in `modal.querySelector('[role="dialog"]')` **vier
Blöcke** (idempotent — Guard via `data-…`-Attribut):

### (1) 🔑 Eigene Identität & Spore erzeugen / verwalten — DER ANDOCK-WIZARD (eigenes Modul)

**Das ist der Kern-Block und ein eigenes, spezielles Modul — nicht bloß ein paar
Inline-Zeilen.** Der 🔑-Knopf öffnet **den Andock-Wizard**: ein **eigenständiges
Modal** über dem Siegel-Modal (`<dialog>` bzw. eigenes Overlay, z-index **über**
Siegel(16)/Membran(15)/Modul-18-Wizard). In Sage ist das `#sage-andock-modal`, per
`openAndockWizard()`/`closeAndockWizard()` geöffnet, mit dem Titel „Andock-Wizard".
Er führt Klaus durch die **Erst-Identität** und ist der Ort, an dem der Knoten
überhaupt eine Identität + Spore bekommt.

Fünf Bausteine, alle über die **echten** Module 02/03:

1. **Identität erzeugen** — `SbkimSpore.getOrCreateIdentity()` (Ed25519, IndexedDB,
   im Browser; privater Schlüssel verlässt den Browser nie). Zeigt die `nodeId`.
   (Sage: `andockStep1Identity()`.)
2. **Spore signieren + herunterladen** — `SbkimEmbedding.init()` (~30 MB einmalig) →
   `embedPassage(beschreibung)` → **domainVector** → `SbkimSpore.generateOwnSpore({…})`
   → `spore.json` als Download. Datei nach `sbkim/spore.json` committen.
   **PFLICHT (siehe unten): während des ~30-MB-Modell-Ladens IMMER eine
   Prozent-Anzeige** — sonst wirkt es eingefroren und wird zu früh geschlossen.
   (Sage: `andockStep2Spore()`.)
3. **Verschlüsseltes Backup** — `SbkimSpore.exportBackup(passwort)` (PBKDF2-SHA256
   600k + AES-GCM-256) als Download. Passwort NICHT resetbar. (Sage: `andockStep3Backup()`.)
4. **Identität wiederherstellen** — `SbkimSpore.importBackup(blob, passwort)` (Datei +
   Passwort → Schlüssel + Spore zurück in die IndexedDB; `{force:true}` bei Kollision).
   (Sage: `andockStep4Restore()`.)
5. **Identitäts-Wechsler** — Auswahl der aktiven Identität für Knoten mit mehreren
   Personae (`refreshAndockIdentities()` füllt das `<select>`, `andockSwitchIdentity(key)`
   schaltet um; Multi-Identitäts-API aus Bau 02.Y). Bei Ein-Identitäts-Knoten trotzdem
   sichtbar (zeigt nur die eine). **Diesen Baustein NICHT vergessen** — er fehlt in
   frühen Kopien am häufigsten.

**Zwei Öffnungs-Varianten** (je nach App, gleicher Zweck):
- **Eigenes Modal / `<dialog>`** — Sage (`#sage-andock-modal`), SB-KIMTool-Point,
  Kim-Bell (`buildWizardDialog()` in `assets/siegel-inhalt.js`).
- **Modul-18-Tab** (Mixarium): der 🔑-Knopf öffnet `SbkimToolPwa.openAndockTab()`.

**Nicht verwechseln mit Modul 19** (`SbkimAndockWizard`, `src/modules/19_andock_wizard.js`):
das ist ein **separater, kopierbarer Onboarding-Helfer** (Repo-URL · Domain · Knotentyp
→ **unsignierte** Spore-Vorlage + `status.json`-Zeile + vorgelinkter PR) für die
„Andocken · 3 Klicks"-Karte — **kein** Krypto, **nicht** im Siegel. Der Andock-Wizard
hier (Baustein 1) macht die **echte, signierte** eigene Identität; Modul 19 macht nur
eine Vorlage fürs Netz-Onboarding. Beide heißen umgangssprachlich „Andock-Wizard" —
im Siegel steckt IMMER der echte (Baustein 1), Modul 19 ist optional daneben.

### (2) ✍ Semantische Beschreibung → Vektor & Spore neu signieren
Auto-wachsendes Textfeld (vorbefüllt aus der aktuellen Spore-`domainDescription`,
sonst App-Default) + Hinweis + Knopf **„Beschreibung übernehmen → Vektor & Spore neu
signieren"**. Pfad: gleiche Identität (`getOrCreateIdentity`) → `SbkimEmbedding.init`
→ `embedPassage(text)` → `generateOwnSpore` (gleiche `nodeId`, neuer `domainVector`)
→ Download. Fortschritt via `sbkim:embedding-progress`-Event anzeigen.

### (3) 🛡 Schutz-/Vertrauens-Block + Erklär-Overlay
Beruhigende Kurz-Erklärung („Das Siegel ist selbst-ausgestellt … es bewegt nur
Daten, nie Programme … dein privater Schlüssel verlässt diesen Browser nie") +
Knopf **„Ausführlich erklärt →"**, der `sicherheit.html` als **In-Page-Overlay**
(`<iframe>`, ✕/Backdrop/Esc) öffnet — **kein** neuer Tab.

### (4) ⛨ Fremden Knoten andocken (wo vorhanden — Sage)
„Fremden Knoten verbinden — ohne KI, direkt im Browser: Repo-/App-URL eingeben →
Spore prüfen → Match → Handshake." Lädt die fremde `sbkim/spore.json`
(raw.githubusercontent.com erlaubt CORS) → `SbkimSpore.verifyForeignSpore` →
`SbkimMatch` (Cosinus ≥ 0.80) → `SbkimAnastomose.handshake`.

---

## PFLICHT: Modell-Ladefortschritt IMMER anzeigen (Klaus 2026-07-08)

**Überall, wo das Siegel (oder ein Tool darin) das Embedding-Modell (~30 MB,
einmalig, CDN) lädt, MUSS eine Prozent-Anzeige sichtbar sein.** Betrifft im
Siegel konkret: Schritt 2 des 🔑-Wizards (Spore signieren) und den ✍ Semantik-
Block (Beschreibung neu signieren) — beide laden das Modell. Am Tablet dauert
das 1–2 Minuten; **ohne Balken denkt der Nutzer, es hängt, und schließt das
Modal, bevor es fertig geladen hat.**

1. **Quelle:** Modul-03-Event `sbkim:embedding-progress`, `detail.progress`
   (0–100), `detail.file`, `detail.status` (`"progress"`/`"done"`/`"ready"`).
2. **Vor** `SbkimEmbedding.init()` einen Listener setzen, nach `init()` / im
   Fehlerfall wieder abmelden.
3. Balken in **EINER** Zeile (kein Spam), fertig → `✓`. Fail-soft (fehlt das
   Anzeige-Element, bricht nichts).

**Referenz:** `Kim-Bell/assets/rendezvous-init.js` (`ensureProgressEl` / `onProg`
/ `stopProg`) — dasselbe Muster in jeden 🔑-Wizard / ✍-Block einsetzen.

---

## Datenverträge (nicht brechen)

- `generateOwnSpore(meta)` meta = `{ domain, endpoint, nodeType:"hybrid", nodeName,
  domainDescription, domainKeywords, domainVector, stammCategories?, guestCategories? }`.
- Der **öffentliche** Teil (`spore.json`) wird committet; der **private Schlüssel**
  kommt **nie** ins Repo, nie in einen Commit, nie in einen gepushten Chat.
- Andock-Handshake bleibt am **0.80-Riegel** (`PROVIDER_MIN_MATCH`) — **TABU**, nicht
  anfassen; ebenso `DB_VERSION`, `PROTOCOL_VERSION`.

## Bauform-Checkliste (jedes Siegel)

- [ ] Modul-Dateien byte-1:1 kopiert (17/15/16/07 + Kern 01–05), Drift-Guard-sha256 im Smoke.
- [ ] Init-Reihenfolge Widget(17) → Membran(15) → Siegel(16) (+ Apoptose 07).
- [ ] **Modal-Inhalt injiziert** (MutationObserver): 🔑 **Andock-Wizard** als eigenes Modal
      (5 Bausteine: Identität · Spore signieren · Backup · Wiederherstellen · **Identitäts-Wechsler**) ·
      ✍ Semantik · 🛡 Schutz + `sicherheit.html`-Overlay · (⛨ Fremden Knoten andocken, wo gewünscht).
- [ ] Config angepasst: `domain/endpoint/nodeType/nodeName/domainDescription/
      domainKeywords/stamm-+guestCategories`, `allowedOrigins`, `repoUrl`, `dbSuffix`.
- [ ] **`ribbonText: "<App-Name>"`** in `SbkimSiegel.init(...)` — sonst bleibt das
      Wappen-Band LEER (kein Auto-Slug). Jede App graviert ihren eigenen Namen ein.
- [ ] `sicherheit.html` vorhanden (für den Schutz-Overlay) — oder Block ohne Overlay-Link.
- [ ] SW: neue Dateien in `APP_SHELL`, `CACHE_VERSION` erhöht.
- [ ] **Modell-Ladefortschritt** (Prozent-Balken aus `sbkim:embedding-progress`)
      in Wizard-Schritt 2 **und** ✍ Semantik — überall, wo das ~30-MB-Modell lädt.
- [ ] Ehrlich: privater Schlüssel bleibt lokal; Lampen leuchten nur bei echtem Event.

## Leitplanken (Verfassung)

- **Jedes Siegel nach diesem Muster** — mit dem Andock-Werkzeug **darin**, nicht nur
  als Badge. Sonst muss Klaus wieder erklären, was fehlt.
- **Immer sichtbar**: die Lampen-Leiste ist der Dauer-Anzeiger; das Siegel-Modal ist
  der Detail-Klick.
- **Modul 16 bleibt unangetastet** (netzweit geteiltes Render-Modul) — der Inhalt wird
  **host-seitig injiziert**, nicht ins Modul geschrieben.
- **Kopieren, nicht klonen** (byte-1:1 + Drift-Guard). **Kein PII**, privater Schlüssel
  nie ins Repo. **Ehrliche Lampen**, kein Siegel ohne erfüllte Selbst-Prüfung.
- Wer Modul 15/16 berührt: `ZERTIFIKAT_ASPEKTE`-Eintrag nachziehen.

## Kurz-Merksatz

**Erst Widget (17), dann Membran (15) + Siegel (16).** Sieben Pflicht-Module → Bronze;
Handshake „established" → Gold. **Ins Siegel-Modal gehört das Andock-Werkzeug** — allen
voran **der Andock-Wizard als eigenes Modal-Modul** (🔑 Identität & Spore: erzeugen ·
signieren · Backup · wiederherstellen · **Identitäts-Wechsler**) · ✍ Beschreibung neu
signieren · 🛡 Schutz + Erklärung · ⛨ fremden Knoten andocken. Nicht mit **Modul 19**
(`SbkimAndockWizard`, Onboarding-Vorlage ohne Krypto) verwechseln. Vorlage:
`SB-KIMTool-Point/assets/sbkim-siegel.js` (Sage-Ursprung: `index.html` ~Z. 4006–4510,
Andock-Wizard-Modal `#sage-andock-modal` / `openAndockWizard()`).
