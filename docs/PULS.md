# PULS — Family Projekt

Aktueller Stand, was offen ist, nächste Schritte. Zu Beginn jeder Sitzung lesen.

---

## ✅ 2026-07-21 (nachts): Marktplatz-Einreichung + Kontaktformular LIVE & Ende-zu-Ende getestet

**Scharfgeschaltet** (PR #98). Endpunkt live: `https://formular.family-projekt.de/einreichung.php`
(Hetzner-Webspace `public_html/formular`, Subdomain via CNAME `cjlb.your-vhost.de` bei INWX,
gültiges Let's-Encrypt-SSL bis **2026-10-19**, `.htaccess` schützt `warteschlange.jsonl`).

**Von Klaus im Browser bestätigt (beide Formulare):**
- Kontaktformular → Mail „Kontakt-Anfrage …" bei **info@ + Gmail** angekommen.
- Marktplatz-Einreichung → Mail „Marktplatz-Einreichung …" (App/Link/Bild/Kategorie/Kontakt/
  Beschreibung vollständig) bei **info@ + Gmail** angekommen.
- Doppelte Zustellung (info@ mit Kopie an Gmail + T-Online) funktioniert.

**Einrichtung Server-Seite** (mit Klaus live durchgeführt, konsoleH + INWX + WebFTP):
info@-Kopie an Gmail+T-Online · Subdomain `formular` + Ziel `/public_html/formular` ·
CNAME bei INWX · Let's-Encrypt via SSL Manager · `einreichung.php` + `.htaccess` per WebFTP.
Details/Zugänge: `docs/DEPLOY.md §4b`.

**Offen / Folge:**
- **SSL-Verlängerung** vor **2026-10-19** (INWX externe DNS → im SSL Manager einmal `↻` bei
  `formular.family-projekt.de`). Erinnerung einrichten empfohlen.
- **`freigabe.php` (Stufe 2)** optional: Freigabe-per-Klick statt von Hand (Token nur auf Server).

---

## 🔨 2026-07-21: Marktplatz-Einreichung EU-eigen (PHP) + echtes Kontaktformular + Datenschutz

Aufbauend auf dem 07-20-Schritt (Formular-Dienst) jetzt der **EU-eigene Weg ohne Dritt-Dienst**:
Klaus' Hetzner-Webhosting bringt PHP mit → ein eigenes kleines Skript nimmt den POST an,
schützt gegen Spam, legt den Eintrag in eine Warteschlange und mailt ihn **lokal** an info@
(gleiche Maschine wie das Postfach → kein Reputations-Problem). Der frühere „nur Caddy
statisch"-Blocker ist damit weg.

- **`server/einreichung.php`** (Stufe 1, Pflicht): nimmt den Formular-POST von markt.html an.
  **Vier Spam-Schutz-Schichten** (headless mit `php -S` bewiesen): Honigtopf-Feld · Mindest-
  Ausfüllzeit (`fp_elapsed`) · Rate-Limit pro IP (6/Stunde, dateibasiert) · CORS-Herkunftsprüfung
  (Allowlist family-projekt.de + Pages-Vorschau) + Feld-Validierung. Schreibt nach
  `warteschlange.jsonl` (mit **gekürztem IP-Hash**, keine Klar-IP) + `mail()` an info@ (fail-soft).
  Behandelt `zweck:"eintrag"` UND `zweck:"kontakt"`.
- **`server/freigabe.php`** (Stufe 2, .htpasswd): listet die Warteschlange, „✓ Freigeben"
  committet den Eintrag über einen **server-seitigen GitHub-Token** in `listings.js` (Einfüge-
  Marke `// FP_LISTINGS_INSERT_HERE`), „Ablehnen" → vorausgefüllte Antwort-Mail. Token liegt NUR
  in `freigabe-config.php` auf dem Server (Vorlage `.example`, .htaccess sperrt sie).
- **Echtes Kontaktformular** in markt.html (Klaus-Entscheid): der alte „✉ Unverbindlich
  anfragen"-**mailto-Knopf** ist jetzt ein Formular (Name/E-Mail/Nachricht, `zweck:"kontakt"`)
  → derselbe Endpunkt. **Fail-soft ohne Endpunkt: mailto-Vordruck** an info@.
- **Datenschutz** (`impressum.html`): neuer Punkt 7 „Marktplatz-Einreichung & Kontakt" (welche
  Daten, Zweck, EU-Verarbeitung auf eigenem Hetzner, IP-Hash statt Klar-IP, Aufbewahrung); Punkt 2
  („keine zentrale Speicherung") + Betroffenenrechte (Punkt 10) entsprechend angepasst.
- **Bugfix:** `renderFreeCount()`-Aufruf in markt.html entfernt — war ein toter Rest aus PR #92
  (Zähler-Ausbau) und warf beim Boot einen `ReferenceError` (brach die `?q=`-Übernahme).
- `FP_MARKT_SUBMIT_ENDPOINT` bleibt **einziger Schaltpunkt** (leer = fail-soft). sw v55→**v56**.

**Stand/offen (wenige Klicks für Klaus):** (1) Klaus' Mail-Test (Gmail↔info@) grün abwarten →
(2) `einreichung.php` + `.htaccess` per WebFTP hochladen → (3) volle URL in `listings.js`
`FP_MARKT_SUBMIT_ENDPOINT` eintragen → scharf. Anleitung: `server/README.md`. Stufe 2
(freigabe.php + Token + .htpasswd) optional danach.

**Verifikation:** `php -l` alle drei PHP grün; **einreichung.php funktional headless getestet**
(`php -S`): OPTIONS 204, gültiger Eintrag/Kontakt → Queue+ok, Honigtopf/zu-schnell → still ok
(nicht gespeichert), Fremd-Origin → 403, SVG-Bild → 400, Rate-Limit greift bei 6. Inline-JS parst,
i18n 62/62 DE/EN paritätisch, listings.js valide, smoke_all-Assertions aktualisiert (sbPr-Rest
raus, Honigtopf/Kontakt/Boot-Regression rein). **Voll-Smoke nicht lauffähig** (playwright-core in
Sandbox fehlt) — **Klaus' Browser-Sichttest nach Deploy + Hard-Reload (SW v56) steht aus.**

---

## 🔨 2026-07-20: Marktplatz — Einreichung ohne GitHub (Formular-Dienst) + „100-frei"-Zähler raus

Zwei gemergte Schritte (Freibrief), family deployt automatisch:
- **Sichtbaren „Noch {n} von 100 Gratis-Plätzen frei"-Zähler entfernt** (`#mkFreeCount` +
  `renderFreeCount` + `mk_free`): leere Plätze wirkten wie „noch niemand gelistet". Die
  100-gratis-Politik bleibt **intern** (Code-Kommentar). `mk_angebot` entschärft. sw v52→v53. (PR #92)
- **Einreich-Formular von GitHub-PR auf Formular-Dienst umgestellt (Stufe 1):** Der frühere
  „Als Pull-Request einreichen"-Weg (GitHub-Konto nötig = Hürde für Nicht-Entwickler) ist raus.
  Neuer Knopf **„Zur Prüfung einreichen"** → POST an einen Formular-Dienst (Formspree), Eintrag
  landet als **E-Mail bei Klaus** (Adresse via `window.FP_MARKT_SUBMIT_ENDPOINT` in
  `assets/config/listings.js`, **Klaus trägt sie ein**). Neues **Kontakt-E-Mail-Feld** des
  Einreichers (nur für Rückmeldung, nicht veröffentlicht). **Fail-soft:** ohne Endpoint zeigt
  das Formular den kopierbaren Block (kein Fehler). Nichts wird automatisch veröffentlicht —
  Klaus prüft + gibt frei. sw v53→v54.

**Stand/offen:** Klaus legt eine Gratis-Formspree-Form an → Adresse in `listings.js` eintragen →
Browser-Sichttest (Absenden landet als Mail). **Stufe 2** (Freigabe-Seite im Repo: Block
einfügen → prüfen → „Freigeben" committet via Klaus' Token / „Ablehnen" mit Grund) folgt als
eigene Sitzung. Prüfung der URL/App bleibt gemeinsamer Sitzungs-Schritt (keine „virenfrei"-Garantie).

**Verifikation:** i18n 43/43 DE/EN paritätisch, Inline-JS parst, `listings.js` valide, keine
PR-Reste. **Voll-Smoke nicht lauffähig** (playwright-core in Sandbox fehlt) — Klaus' Browser-
Sichttest nach Deploy + Hard-Reload (SW v54) steht aus.

---

## 🔨 2026-07-12: Netzwerk-Seite als zwei klare Wege umgebaut + Suche-Feinschliff

Mehrere gemergte Schritte (Freibrief, Fast-Forward auf `main`, family deployt автоmatisch):
- **Startseiten-Suche: Kamera raus** (`data-noocr` am Suchfeld) — OCR ist auf der Family-eigenen
  App-/Marktplatz-Suche sinnlos (kein Web, keine Barcodes). Mikro + Tippen bleiben. Kamera
  bleibt sinnvoll in Kimseek/Such-Tool (Internet-Modus). sw v38→v39.
- **Netzwerk-Überschrift/Lead verständlich** statt „herren-los, nicht herrschaftlich":
  „Bau dein eigenes Netzwerk — oder lass dich als Knoten im Marktplatz leichter finden." sw→v41.
- **Netzwerk-Seite neu strukturiert (zwei klare Wege):** Hero → **Auswahl-Karten** (🛒 „im
  Marktplatz gefunden werden" → markt.html · 🪢 „deine App selbst zum Knoten machen" → #bauen,
  **mit Vorteil-Box**: nach Sinn statt Stichwörtern gefunden, bidirektional, server-los) →
  3-stufiges Versprechen → **#bauen-Detail** (3 Schritte Identität→Spore→Handshake, Andock-Wizard
  als Schnellstart erhalten, „alle Bausteine (Knoten-Werkzeug)" + „zu kompliziert → Sage",
  **ehrlicher Stand aufgefrischt auf 2026-07-12**) → „Für Fortgeschrittene: fremde Seite ins
  Mycel holen". Chattiger „Vision"-Satz raus. Funktions-IDs (#andock/#andockWizard/#fpCopyAndock)
  + Wizard-Ausgang unverändert. sw v41→v42, `.nw-vorteil`-CSS.
- **Ehrlichkeits-Check:** „Stand 2026-06-28" war noch ehrlich (eher untertrieben) — Cross-Knoten-
  Handshake seit 07-10/07-11 sogar hub-unabhängig bewiesen; einzige Grenze (Antworter-Tab
  vorn+wach) weiter korrekt benannt. Text entsprechend aufgefrischt, nichts überzogen.

**Verifikation:** i18n 43/43 DE+EN paritätisch, keine toten Keys, Funktions-IDs erhalten,
Sektionen balanciert, Syntax grün; smoke_all um Netzwerk-Assertions erweitert. **Voll-Smoke
nicht lauffähig** (playwright-core in Sandbox fehlt) — **Klaus' Browser-Sichttest nach Deploy
+ Hard-Reload (SW v42) steht aus.**

---

## 🔨 2026-07-12: Werkzeug-Landingpages „Andock" & „Knoten" GEBAUT (Brief 09)

Nach der Klärung (siehe Eintrag darunter) umgesetzt — **nur Seiten-Text/Layout**, Kern-SBKIM
unberührt. Branch `claude/werkzeuge-andock-knoten-design-o0aztn`.

**`assets/tool-landing.js` (neu strukturiert, additive optionale Blöcke):**
- **Leere Screenshot-Galerie raus** (Klaus 2a): Galerie rendert nur noch bei echten
  `FP_TOOL.shots`. Ohne Bilder → keine Galerie (kein „vom Anbieter eingefügt"-Platzhalter mehr).
  Wirkt auf alle drei Seiten; Such-Werkzeug bleibt sonst unberührt (setzt die neuen Felder nicht).
- Neue optionale Felder: `steps` (roter Faden), `seal` (selbst-gravierendes Siegel), `linkmap`
  (jede Aussage ein Link), `downloads` (Bausteine zum Mitnehmen). Rendern nur wenn gesetzt.

**Andock-Seite** = der **Kennenlernen-/Überblick-Einstieg** (Klaus 3b): roter Faden
(1 kennenlernen aktiv → 2 Knoten → 3 andocken), **echtes SBKIM-Wappen mit Live-Namens-Gravur
+ SVG-Download** (Wappen aus Sage kopiert nach `assets/sbkim-siegel-wappen.svg`, Ribbon
`#ribbonText`), **Link-Landkarte** (7 Frage-Gruppen, je Sage + SB-KIMTool-Point-Ziele),
**Bausteine-Download** (Siegel-SVG, Werkzeugkiste, SBKIM-Module). openUrl → `netzwerk.html#andock`.

**Knoten-Seite** = **für Entwickler** gekennzeichnet (Klaus 1a/4a): Schritt 2 aktiv,
**Kopier-Bausteine** (Werkzeugkiste + Mycelknoten-Anleitung + 3 Roh-Module + Siegel-SVG),
Vorwärts-Link zum Andocken. openUrl korrigiert → `SB-KIMTool-Point/web/tools/mycelknoten.html`
(die Sage-`docs/observatorium/tools/`-URL war ungeprüft; die echte liegt bei SB-KIMTool-Point).

**`werkzeuge.js`**: Andock → „Ans Netz anschließen" (Start/Überblick), Knoten → „Deine App
zum Knoten" (Schritt 2, für Entwickler); Reihenfolge such → andock (kennenlernen) → knoten
(Schritt 2) folgt dem roten Faden. **`sw.js` v37→v38** (+ tool-landing.js + Siegel-SVG in CORE).
**`style.css`**: Stile für rf-/seal-/lm-/dl-Blöcke.

**Verifikation (ehrlich):** JS-Syntax (`node --check`) grün; beide `FP_TOOL`-Blöcke parsen; die
**Render-Logik** über einen Node-DOM-Shim geprüft — Andock 3 Schritte/Siegel/7 Landkarte-Gruppen/
Bausteine, Knoten 3 Schritte/6 Bausteine, Such kein Platzhalter/kein Faden; **alle 18+14
Inhalts-Links haben ein echtes Ziel** (kein Link ins Leere; einzige `#` ist der Spenden-„bald"-
Knopf). `smoke_all.mjs` um Andock-/Knoten-Assertions erweitert + Such-Galerie-Assertion an neue
Absicht angepasst — **Voll-Lauf hier nicht möglich** (`playwright-core` in der Sandbox nicht
installiert). **Klaus' Browser-Sichttest (nach Merge + Hard-Reload, SW v38) steht aus** —
besonders: Siegel-Gravur/Download am Tablet, alle Landkarte-Links live.

---

## 🧭 2026-07-12: Klärung Werkzeug-Landingpages „Andock" & „Knoten" (Brief 08 → Brief 09)

**Art:** Klärungs-Sitzung (Plan-vor-Code, kein Bau). Brief 08 stellte vier Richtungsfragen,
Klaus hat entschieden — Bau folgt in eigener Sitzung (`BRIEF_09_ANDOCK_KNOTEN_BAU.md`).

**Befund (bestätigt am Code):** Alle drei Werkzeug-Seiten (`werkzeuge/*.html`) rendern über
`assets/tool-landing.js` dieselbe **leere Screenshot-Galerie** („Screenshot 1 — [ vom Anbieter
eingefügt ]", ＋/×) — ein Mockup-Platzhalter, nie gefüllt → wirkt kaputt. **Andock** springt
nur nach `netzwerk.html#andock` (kryptisch), **Knoten** zu `mycelknoten.html` (sehr technisch).
**Such** ist gut (echtes Tool).

**Klaus' Entscheidungen (verbindlich für Brief 09):**
1. **Zielgruppe:** unterschiedlich — Andock **breiter** (auch Seiten-Betreiber), Knoten ehrlich
   als **„für Entwickler/Bastler"**.
2. **Screenshots:** leeren Platzhalter **RAUS**, echte Bilder nur wo es zeigbares UI gibt
   (Andock-Siegel), sonst weglassen — kein Fake.
3. **Andock:** **eigene Erklär-Seite** in Family-Optik mit **Links zu Sage-Page + Einladung**
   und einer **Anleitung mit echtem, selbst-ausfüllendem Siegel** (Skill `status-leiste-siegel`;
   Vorbild SB-KIMTool-Point-Andock-Werkzeug).
4. **Knoten:** **eigene Erklär-Anleitung mit Kopier-Bausteinen** statt undurchsichtigem
   Sprung-Link; `mycelknoten.html` nur noch als „mehr dazu".

**Zusatz (Klaus 2026-07-12):** Die Andock-Erklärseite soll eine **kontextuelle
Link-Landkarte** sein — jede Aussage/Frage ist selbst ein Link zum passenden Ziel (Mycel →
Sage-Mycel-Karte, schwarze Löcher → Sage-Browser-Observatorium, Einladung → Sage-Einladung,
Werkzeuge → SB-KIMTool-Point-Werkzeuge, je BEIDE Seiten wo sinnvoll), **nie ins Leere**. Die
verifizierte Ziel-Tabelle steht in `BRIEF_09` (§ Kontextuelle Link-Landkarte) — jeder Link
muss beim Bau live geprüft werden.

**Zusatz 2 (Klaus 2026-07-12) — logischer roter Faden:** feste Reihenfolge beim
Sich-Einbringen: **kennenlernen → Knoten erzeugen → andocken** („erst kennenlernen, dann
anbauen"). **Knoten kommt VOR Andock** (Andocken setzt einen erzeugten Knoten voraus).
Konsistent in Text, Links und `werkzeuge.html`-Reihenfolge — kein Zickzack. Technische
Reihenfolge für „Knoten erzeugen": Skill `saubere-netz-anmeldung`. Details in `BRIEF_09`
(§ Logischer roter Faden).

**Offen / nächster Schritt:** Bau-Sitzung nach `BRIEF_09_ANDOCK_KNOTEN_BAU.md` ausführen
(Reihenfolge + Akzeptanzkriterien dort). Nur Seiten-Text/Layout, Kern-SBKIM nicht anfassen,
`sw.js` `CACHE_VERSION`↑, Browser-Sichttest bleibt Klaus.

---

## ✅ 2026-07-12: Marktplatz-Feinschliff (Ladebalken + Eintrag-Formular sinnvoll)

Zwei gemergte Sitzungs-Schritte (Selbst-Merge-Freibrief, je eigener PR):

**PR #77 — Ladebalken in der Bedeutungs-Suche.** Beim „Nach Bedeutung suchen" lädt das
Sprachmodell (~30 MB) jetzt mit sichtbarem **Prozent-Balken** unter dem Suchfeld (gespeist
aus `sbkim:embedding-progress` von Modul 03, wie die Verbinden-UI). Fail-soft. `markt.html`
(`renderBar`+Listener in `semanticSearch`), `style.css` (`.mkbar`), `sw.js` v32→v33.

**PR #78 — Eintrag-Formular umgebaut (Klaus' Screenshot-Befund 2026-07-12).**
- **📷-OCR-Knöpfe raus** aus dem Marktplatz — klebten auf jedem Feld, sinnlos für
  Titel/Link/Bild. Neu: `data-noocr`-Opt-out in `app.js` (`addCamButton` überspringt Felder
  mit `data-noocr`-Vorfahr; greift für `wireAllCams` **und** `enhanceBareInputs`). Beide
  markt-Formulare tragen `data-noocr`. **Mikrofon bleibt** an den Textfeldern.
- **Bild-Feld neu mit Live-Vorschau:** Vorschau-Kachel + „🖼 Bild vom Gerät wählen"
  (data-URI nur zur Vorschau) + Link-Feld; ein eingegebener Link erzeugt sofort eine
  Vorschau bzw. einen Hinweis bei ungültigem Bild. Ehrlicher Hinweis: veröffentlicht wird
  ein öffentlicher https-Link (Bild bleibt beim Anbieter, wir speichern nur den Link).
- **Klarere Felder** (Beschriftung/Platzhalter/Hinweise) + **Gründer-Angebot Variante 2**
  (von Klaus abgenommen) statt „Jahresbeitrag (in Vorbereitung)": erste 100 Apps dauerhaft
  gratis; Schaufenster, kein Bezahl-Dienst (Verkauf über eigenen Store, ohne Provision). DE+EN.
- `style.css` `.mk-imgfield/.mk-imgprev/.mk-fieldhint`; `sw.js` v33→v34; `smoke_all.mjs`
  Kamera-Assertions an neue Absicht angepasst.
- **Fokus-Smoke (Marktplatz) 11/11 grün.** Der `smoke_all.mjs`-Volllauf ist in dieser
  Sandbox unter swiftshader grenzwertig langsam (umgebungsbedingte Timeouts, nicht durch
  die Änderung) — die Formular-Logik ist über den isolierten Fokus-Smoke bewiesen.

**Offen / wartet auf Klaus (Browser, nach Auto-Deploy + Hard-Reload wegen SW v34):**
Ladebalken beim echten ~30-MB-Download; das neue Bild-Feld am Tablet (Vorschau + Gerät-
Auswahl fühlen). Offen aus dem Brief: `X/100`-Platz-Zähler (Klaus hat den Zähler nicht
bestätigt — bewusst weggelassen, ein Einzeiler falls gewünscht); 💬-Tooltip-Schalter ins
Such-Widget (Modul 22); Embedding-Modell selbst hosten; `meineapps.js` vor Launch kuratieren.

---

## ✅ 2026-07-10: GitHub-Pages-Vorschau (immer-aktuell) als Fallback zum Hetzner-Deploy

**Befund (Klaus):** `family-projekt.de` (Hetzner) hing auf altem Stand — der Live-Server
lieferte `sw.js` v8 (Stand vor PR #37), obwohl `main` längst v11 ist. Der Server-Auto-Deploy
läuft unzuverlässig; Zugang zur Server-Konsole gerade umständlich. Klaus' Entscheidung:
die Seite **zusätzlich** über GitHub Pages automatisch aktuell halten.

**Gebaut:** `.nojekyll` (Root) → Pages liefert die App unverändert (ohne Jekyll). README-Abschnitt
„Zwei Adressen". Kein CNAME (Domain bleibt bewusst auf Hetzner — Pages ist die **Vorschau**
`https://lausiklauskn-png.github.io/family-project/`, „zusätzlich", nicht ersetzend).
Alle Pfade relativ (SW `register("sw.js")`, manifest `start_url:"."`) → läuft unter dem
`/family-project/`-Unterpfad. Subpfad-Smoke **5/5** (Seite lädt, Rendezvous-UI mit
Aufräumen-Knopf mountet, keine kritischen Fehler).

**Klaus' Einmal-Schritt:** GitHub → Settings → Pages → Source „Deploy from a branch" →
`main` / `/ (root)` → Save. Danach aktualisiert sich die Vorschau bei jedem Merge auf `main`.
**Offen:** Hetzner-Server irgendwann wieder ziehen lassen (v8→v11) ODER später bewusst
entscheiden, die Domain auf Pages zu zeigen (DNS bei INWX; Relay-Subdomain bleibt Hetzner).

---

## ✅ 2026-07-10: Embedding-Modell — Offline-first + „Unexpected token '<'"-Fix

**Befund (Klaus, Screenshots):** Auf `family-projekt.de` schlug „Mit dem Netz verbinden"
fehl: *Modell 'Xenova/multilingual-e5-small' konnte nicht geladen werden: Unexpected token
'<', "<!doctype "… is not valid JSON*. Auf Sage (github.io) klappte es zeitgleich — also
kein Konto-/Token-Problem (Klaus hatte parallel API-Keys gelöscht; unschuldig).

**Ursache:** transformers.js prüft per Default ZUERST einen lokalen Modell-Pfad. Der
Caddy-`try_files … /index.html` liefert für den (nicht existenten) lokalen Pfad die
HTML-Startseite mit **HTTP 200** (statt 404) → die Bibliothek liest `<!doctype …` als JSON.
GitHub Pages gibt echte 404 → dort fällt sie sauber auf HuggingFace zurück.

**Gebaut** (`sbkim/03_embedding.js`): eigene **Body-Probe** `detectModelSource()` — prüft den
**Inhalt** (nicht nur Status) von `/models/<modell>/config.json`. Echtes JSON → `allowLocalModels`
(offline, eigener Server); sonst `allowLocalModels=false` + HuggingFace (kein Trap). Fail-soft.
Auto-Erkennung, keine Config nötig. Surface `+getModelSource/_detectModelSource`, `_meta.localModel*`.
- `sw.js`: `/models/` nicht mehr abfangen/cachen (kein poisoned index.html); `CACHE_VERSION` v10→v11.
- `Caddyfile.example`: optionaler (auskommentierter) `handle /models/*`-Härtungsblock.
- **Selbst-hosten vorbereitet:** `models/Xenova/multilingual-e5-small/` (Platzhalter-Doku) +
  GitHub-Action `.github/workflows/modell-holen.yml` (Knopf: holt die ~30 MB von HuggingFace auf
  GitHubs Servern und committet sie — der Sandbox-Egress blockiert HuggingFace, daher nicht hier
  ladbar). README-Abschnitt „Embedding-Modell".

**Tests:** `tests/smoke_modell_quelle.mjs` **7/7** (JSON→local, SPA-Falle/404/offline→remote),
Start-Smoke **15/15**. **Browser-Sichttest an family-projekt.de wartet auf Klaus** (echter
SPA-Server + HuggingFace nur dort prüfbar).

---

## ✅ 2026-07-08: „🌐 Mit dem Netz verbinden" öffentlich sichtbar gemacht

**Befund (Klaus):** Auf family-projekt.de fehlte der „Mit dem Netz verbinden"-Knopf
bzw. löste nicht aus; im Netzwerk-Tab nichts zu sehen. **Ursache — kein Bug:** Der
Knopf saß nur im **dev-versteckten** Andock-Tool (`mountDevMailbox`, `if(!isDev())return`,
Brief §6b „vor Launch aus"). Ohne `?dev` wird das Panel gar nicht gebaut → kein Knopf,
nichts im Netz. (Zusätzlich: die Relais-Verbindung ist ein **WebSocket** `wss://relay.family-projekt.de`
→ erscheint in DevTools nur unter „WS", nicht „Fetch/XHR".)

**Entscheidung (Klaus 2026-07-08, AskUserQuestion):** öffentlich sichtbar machen — konsistent
mit SB-KIMTool-Point, das den Knopf schon öffentlich hat.

**Gebaut** (`sbkim/sbkim-init.js`): neue Funktion `mountPublicConnect()` — ein öffentlicher,
NICHT dev-gegateter Floating-Knopf „🌐 Mit dem Netz verbinden" (unten rechts) mit Panel
(Verbinden / Wer ist im Raum? / Nur neu anmelden + Ausgabe). Nutzt die **bestehenden,
live-bewiesenen** Funktionen `connectToNet`/`discoverRoom`/`announcePresence` — kein
Doppel-Code, Modul 23/05/05b unangetastet. Erscheint nur, wo Modul 23 geladen ist (fail-soft).
Das restliche Betreiber-Werkzeug (Spore erzeugen / Safe / Handshake-Auswahl / Verbindungs-Test)
bleibt dev-versteckt.

**Bewusste Regel-Aufhebung:** §6b „Rendezvous-Knopf vor Launch versteckt" ist NUR für diesen
einen öffentlichen Knopf aufgehoben (Klaus' ausdrückliche Entscheidung). Dokumentiert hier +
im Code-Kommentar.

**Verifikation:** `node --check sbkim/sbkim-init.js` ok; Smoke `tests/smoke_all.mjs` **81/82**
(zwei neue Connect-Assertions grün: öffentlicher Knopf sichtbar ohne `?dev`, Panel öffnet mit
den drei Aktionen). Das eine rote ist **vorbestehend** („footer: Bauleiste öffentlich verborgen",
auch ohne diese Änderung rot — eigener Befund, nicht in dieser Sitzung gefixt). **Browser-
Sichttest auf family-projekt.de wartet auf Klaus** (nach Deploy + Hard-Reload wegen SW-Cache).

---

## ✅ 2026-07-06 (Abend): family-projekt.com → 301 auf .de (gleiche Sitzung)

Klaus wollte die .com „mit denselben Inhalten füllen" — bewusst NICHT getan
(Duplicate Content würde Ranking-Signale zersplittern). Stattdessen der
Google-empfohlene Weg: **301-Redirect .com → .de**, alle Signale zahlen auf
eine Domain ein.

- **DNS (INWX, nicht Hetzner!):** Domains liegen bei INWX (`ns.inwx.de`),
  nur der Server bei Hetzner. Drei A-Records der .com-Zone (`*`, `@`, `www`)
  von Parking `185.181.104.242` auf `167.233.204.72` umgestellt (Klaus im
  INWX-Panel, 2026-07-06 ~18:00). `.de` war schon korrekt.
- **Caddy läuft im Docker-Container** `caddy` (caddy:2); Host-Caddyfile:
  **`/opt/relay/Caddyfile`** (gemountet nach /etc/caddy/Caddyfile; darum ist
  /etc/caddy auf dem Host leer). Webroot `/srv/family-project` 1:1 gemountet.
  Redirect-Block `family-projekt.com, www.family-projekt.com { redir
  https://family-projekt.de{uri} permanent }` ANGEHÄNGT (Backup:
  `Caddyfile.bak-20260706`), `docker exec caddy caddy reload`.
- **Live bestätigt:** `curl -sI https://family-projekt.com/` → HTTP/2 301
  (TLS-Zertifikat automatisch via Let's Encrypt). Die .com braucht KEINE
  eigene Search-Console-Anmeldung — der 301 reicht.
- Der Redirect-Block steht sinngemäß auch in `Caddyfile.example` im Repo.

---

## ✅ 2026-07-06: SEO-Grundausbau + Google Search Console LIVE (Sitzung „family-projekt-seo")

**Ziel:** family-projekt.de bei Google auffindbar machen (Seite war praktisch unsichtbar).
Alles gemergt (PR #23, #24, #25, Selbst-Merge-Freibrief) und **live verifiziert**.

**Gebaut (PR #23):** `robots.txt` + `sitemap.xml`; pro Seite: einzigartige keyword-Titel,
Meta-Descriptions, Canonical, robots-Meta, Open-Graph-/Twitter-Tags; Startseite bekam ihr
fehlendes `<h1>` (DE/EN via i18n, CSS `.hero-h1`); JSON-LD (WebSite + SearchAction +
Organization); Share-Bild `og-image.png` (1200×630, Chromium-gerendert); Caddyfile.example:
www→Apex 301, Cache-Header; `sw.js` CACHE_VERSION v4. Impressum bewusst `noindex`.
Headless verifiziert: je Seite genau 1 H1, gültiges JSON-LD, keine Konsolen-Fehler.

**Search Console (PR #24 + #25, mit Klaus Schritt für Schritt):** Bestätigungsdatei
`google9616ba6b6bbe62ad.html` + Meta-Tag `google-site-verification` in `index.html`
(BEIDE dauerhaft liegen lassen, sonst verfällt die Bestätigung!).
**Inhaberschaft bestätigt ✅ · sitemap.xml eingereicht ✅ · Indexierung der Startseite
beantragt ✅** (alles von Klaus im Browser bezeugt, 2026-07-06).

**Wichtiger Server-Befund (behoben):** Der Hetzner-Auto-Deploy-Cron aus
`deploy/AUTO_DEPLOY.md` war auf dem Server **nie eingerichtet** — die Live-Seite hing
Wochen hinter main. Klaus hat den Einrichtungs-Einzeiler per SSH (Server 167.233.204.72,
Verzeichnis `/srv/family-project`) ausgeführt: sofortiger Pull + 2-Minuten-Cron dauerhaft
aktiv. **Ab jetzt deployt jeder Merge nach main automatisch.**

**Nachtrag 2026-07-06 (Abend) — ALLES ERLEDIGT:**
1. ✅ Sitemap wird von Google gelesen (URL-Prüfung zeigt sitemap.xml als Quelle);
   netzwerk.html war schon INDEXIERT („URL ist auf Google", <1 Tag nach Anmeldung).
2. ✅ Alle drei Unterseiten per URL-Prüfung angemeldet (Klaus, „alle 3" bestätigt).
3. ✅ BING Webmaster Tools: per GSC-Import angemeldet (1 Website + 1 Sitemap
   übernommen, Rolle Administrator) — deckt auch DuckDuckGo/Ecosia ab.

**Ursprüngliche Punkte (erledigt bzw. obsolet):**
1. ~~Sitemap-Status prüfen~~ → von Google nachweislich gelesen.
2. ~~Unterseiten anmelden~~ → erledigt.
3. Backlinks setzen: ✅ ERLEDIGT 2026-07-06 (Abend) — Footer-Links zu family-projekt.de
   in Mein-Mixarium-Page (PR #7), Mein-Rezeptbuch-Page (PR #12, footerHTML + impressum),
   Tomys-Hub (PR #70, index + impressum); alle gemergt. App-Impressen (Mixarium/
   Rezeptbuch/Muttis) bewusst NICHT angefasst (JS-mehrsprachig gerendert, Risiko ohne
   Mehrwert — alle GitHub-Pages zählen ohnehin als EIN verweisender Host).
4. ✅ Impressum: ERLEDIGT 2026-07-06 (Abend). Befund: Betreiber-Daten waren bereits
   eingetragen (identisch zu Mein-/Muttis-Rezeptbuch); Klaus hat Adresse + E-Mail-
   Erreichbarkeit (t-online, wird gelesen) ausdrücklich bestätigt. Feinschliff:
   Nummerierung repariert (1–9), Datenschutz um §5 Relais (relay.family-projekt.de,
   nutzer-ausgelöst, E2E) + §8 KI-Modell-Download (Hugging Face, IP-Hinweis) ergänzt.
   Die alte „KEIN PII"-Vorlagen-Regel (Brief §5) ist damit bewusst abgelöst —
   Impressumspflicht §5 DDG verlangt echte Angaben (im Datei-Kopf dokumentiert).

---

## PLAN — 2026-07-02: Landingpage-Galerie „Meine Apps" + Kim-Benennung (Brief 07)

**Verankert für alle Folge-Sitzungen.** Klaus' Plan: den leeren Marktplatz / die Liste
verbundener PWAs **selbst füllen** — mit Klaus' **eigenen, echten Apps**, ehrlich als
**„Beispiel/Vorlage"** benannt (NICHT als erfundene fremde Anwender — Verfassungstreue,
Anti-Greenwashing/„keine verkleideten Reviews"). Zwei Ebenen: **einheitliche Hub-Liste**
(`listings.js`/`meineapps.js`) + **individuell gestaltete Landingpage pro App dahinter**
= Design-Galerie, jede als **kopierbare Vorlage** (Doppelnutzen: Vorstellung + verkaufbares
Design). Datengetrieben auf `assets/tool-landing.js` (Farbe pro App = ein Feld). Start mit
2–3 Design-Archetypen, organisch wachsen.

**Erster Bau-Schritt:** die schon gute vorhandene „IST"-Landingpage als Basis nehmen, alles
IST-/Platzhalter-Spezifische raus, **auf Mein Rezeptbuch umbranden**. 🔒 **GATE:** erst wenn
ein **sehr gutes Icon** für Mein Rezeptbuch vorliegt (kommt später, Klaus gibt Signal).
⚠️ Genaue „IST"-Datei zu Sitzungsbeginn mit Klaus bestätigen.

**Namen (Kim-Familie):** Kimboard (Pinnwand-App) · Kimseek (Suche) · Kimsync (Finden &
Verständigen) · Kim/Kimhub (Zusammenführung, offen). Volle Tafel: Sage `docs/NAMENSGEBUNG_KIM_FAMILIE.md`
(PR #527). DE „Pinnwand" (zwei n), Marke ein n.

**Wieder anknüpfen (davon abgewichen):** Lauschen-Rollout Stufe 2 (Nostr) restliche Knoten
+ Hetzner-Deploy (`SESSION_BRIEF_LAUSCHEN_ROLLOUT.md`); Sage semantic-matching-quality Strang A/B.

**Voller Plan + offene Fäden:** [`docs/sessions/BRIEF_07_LANDINGPAGE_GALERIE_MEINE_APPS.md`](sessions/BRIEF_07_LANDINGPAGE_GALERIE_MEINE_APPS.md).

## ⭐ MEILENSTEIN — 2026-06-28: Live-Cross-Knoten-Handshake BEWIESEN (cross-device, server-los)

**Der vollautomatische Relais-Handshake, der in Sages Meilenstein-Doku ehrlich als
„noch nicht end-to-end gezeigt" stand, ist heute LIVE gelungen** — bezeugt durch Klaus'
Browser-Lauf auf zwei getrennten Geräten (Tablet ↔ Handy, beide family-projekt.de,
getrennte Browser-Instanzen, getrennte lebende nodeIds):

> 🤝 Handshake an LEBENDE ID `7_tvfP1z…` (Relais) → **✓ ANDOCK ETABLIERT mit Family
> Projekt (lebende ID)!** Server-loser Live-Cross-Knoten-Handshake.

**Der Durchbruch war das Rendezvous (Schritt ⑥, „Gemeinsamer Raum"):** Klaus' eigener
Entwurf. Bisher adressierte der Handshake die **committete** GitHub-nodeId — laufende
Knoten lauschen aber auf einer **frisch erzeugten lebenden** nodeId → Brief kam nie an
(Timeout, unabhängig von der 0.80-Schwelle). Der gemeinsame Raum (geteiltes Relais-Tag
`sbkim-rdv`) lässt aktive Knoten ihre **lebende** Visitenkarte (echte Spore + lebende
nodeId) hinterlegen; der Suchende liest die Karte und handshaket die **lebende** ID →
trifft. **Verfassungstreu** (nutzer-ausgelöst, keine Pulsation). Der Beweis-Ablauf:
👥 fand die lebende Karte → 🤝 schlug erst fehl (Empfänger-Gerät hatte noch keine eigene
Spore) → nach ① auf dem zweiten Gerät → **ETABLIERT**.

**Honest eingeordnet — was BEWIESEN ist:** Identität/Spore ✅, Match/Verifikation ✅
(Briefkasten zeigt verified-match 0.80–0.85 zu allen Nachbarn), async-Briefkasten
(GitHub §11.6) ✅, **und jetzt: Live-Rendezvous + Cross-Knoten-Handshake server-los ✅.**

## Pflege — 2026-06-29 (Seiten auf den aktuellen Netz-Stand gezogen, Pinnwand-Text korrigiert)

Reiner Web-Text-Nachzug (Klaus' Zuruf „family wieder aktuell live bringen · an die live
laufenden Module denken"). Kein Modul-/Protokoll-Code berührt → kein SIGNAL-Bump.

- **`netzwerk.html` § „Verbindung herstellen" — ehrlicher Stand aktualisiert (DE inline +
  DE/EN i18n):** Der alte Text sagte „der vollautomatische Rück-Handshake ist noch nicht
  end-to-end bewiesen". Das ist seit dem Meilenstein 2026-06-28 überholt — der **server-lose
  Live-Cross-Knoten-Handshake IST bewiesen** (zwei Geräte, gemeinsamer Raum „Rendezvous",
  ✓ Andock etabliert). Neu formuliert: bewusst **nutzer-ausgelöst** (Empfangsmodus, keine
  Pulsation — Absicht, kein Mangel); offen bleibt nur der reine Komfort der ganz automatischen
  Rück-Quittung. Badge „in Vorbereitung" bleibt — er gilt jetzt für genau diesen Komfort.
- **`assets/config/werkzeuge.js` — Pinnwand-Beschreibung korrigiert (DE+EN):** beschrieb die
  Pinnwand generisch als „Notizen/Links sammeln". Tatsächlich ist sie ein **Frage-Antwort-Brett**
  mit Bedeutungs-Sortierung (gratis, als **Rangfolge**) + optionalem **KI-Richter** (Absicht/
  Verneinung). Such-Werkzeug + Pinnwand sind in `werkzeuge.js`/`publicapps.js`/`meineapps.js`
  bereits verlinkt — nur der Text war veraltet.
- **Verifikation:** Inline-JS (`netzwerk.html`) + `werkzeuge.js` `node --check` grün. Playwright-
  Smokes hier nicht lauffähig (kein `playwright-core`). **Browser-Sichttest wartet auf Klaus;**
  Hetzner zieht `main` automatisch (`deploy/auto-pull.sh`) → nach Push live.

## Stand — 2026-06-28 (Rendezvous als geteiltes Modul 23 ausgegliedert — family wird Konsument)

**Getan (Branch `claude/module-23-rendezvous-rollout-zqaa8u`):**

- Der bewiesene Rendezvous-Code (Schritt ⑥) ist jetzt ein **geteiltes Modul 23**
  (`SbkimRendezvous`). In Sage spezifiziert + gebaut (`src/modules/23_rendezvous.js`,
  Smoke 40/40); **byte-1:1 nach `family-project/sbkim/23_rendezvous.js` kopiert**.
- **`sbkim/sbkim-init.js` refaktoriert:** der Inline-Rendezvous-Code (Konstanten +
  `doAnnounce`/`announcePresence`/`connectToNet`/`discoverRoom`/`renderRoomCards`/
  `handshakeLiveCard`/`getOwnLiveSpore`) wurde durch **`SbkimRendezvous`-Aufrufe**
  ersetzt (`announce`/`connectAndAnnounce`/`discover`/`handshakeCard`). family liefert
  nur noch den **nodeName „Family Projekt"**, den app-eigenen **Identitäts-Erzeuger**
  (`__fpErzeugeSpore` mit Modell-Download-Fortschritt, als `createIdentity`-Callback)
  und die **Karten-Darstellung** (`renderRoomCards`). Das Dev-Tool-UI (Schritt ⑥
  Knöpfe) ist **unverändert**.
- `23_rendezvous.js` in **alle vier Seiten** geladen (index/werkzeuge/netzwerk/markt),
  vor `sbkim-init.js`.
- Kern-Module 05/05b/02 **unangetastet**. Verfassungstreu unverändert (nutzer-
  ausgelöst, kein Dauer-Piepser).
- Smoke `tests/smoke_all.mjs` **77/77 grün** (inkl. der Schritt-⑥-Knopf-Proben) —
  beweist im Headless-Chromium, dass die Seiten nach dem Refactor fehlerfrei laden
  und die Rendezvous-Knöpfe vorhanden bleiben.
- §11.6: `sbkim/SIGNAL.json` seq 6.

**Offen:** Klaus' Live-Cross-App-Sichttest (zwei Geräte/Tabs, echtes Relais) —
unverändert die finale Abnahme; headless ersetzt ihn nicht.

---

## Stand — 2026-06-28 (Andock-Tool ⑥ Rendezvous + 🌐-Verbinden + Lampe-Fix)

**Getan (Branch `claude/spore-generation-network-receipt-eyzz27-f9lpew`):**

- **Schritt ⑥ „Gemeinsamer Raum"** in `sbkim/sbkim-init.js`: `📌 Auffindbar machen`
  (lebende Visitenkarte ins Relais-Tag `sbkim-rdv` + `listenNostr`) · `👥 Wer ist im
  Raum?` (liest Karten 4 s, dedupe/Frische, 🤝 Andocken an die **lebende** ID) ·
  **`🌐 Mit dem Netz verbinden`** (EIN Klick: Identität erzeugen falls fehlt + anmelden
  + lauschen — entfernt den „erst ①, dann 📌"-Zwischenschritt; Klaus' Wunsch). Nur
  Tool-Code über die öffentliche 05b-`publish/subscribe`-Fläche; Kern-Module 05/05b
  **unangetastet**.
- **Kopf-Lampe VERKEHR ehrlich** (`assets/status-widget.js`): reagiert jetzt auch auf
  `sbkim:nostr-listening` → bleibt **an, solange der Knoten lauscht** (Klaus' Befund:
  der reine 1,4-s-Blitz beim Handshake war leicht zu verpassen). Handschlag blitzt,
  kehrt dann in den Lausch-Zustand zurück.
- **Panel scrollbar** (`max-height:84vh; overflow-y:auto`) — behebt den Überlauf, der
  langen Ausgabe-Text über die Knöpfe schob.
- Smoke `tests/smoke_all.mjs` **77/77 grün** (Proben ⑥ + Panel-Scroll).

**Vision (Klaus 2026-06-28, für Folge-Sitzungen):** der „Raum" als **öffentliche, lebende
Teilnehmer-Liste** → das Andock-Tool aus `?dev` zu einem **öffentlichen „Mit dem Netz
verbinden"** machen; jeder Plattform-Besucher kann einen **Knoten erzeugen + beitreten**
(suchen ja, verkaufen nein — Marktplatz bleibt eigener Eintrag). Dann **Such-Werkzeug
(Modul 22) über den Raum** legen → so findet man im Marktplatz semantisch die lebenden
Teilnehmer. Kleine UX-Lehre schon eingebaut: 🌐 nimmt den manuellen Spore-Schritt ab.

## Stand — 2026-06-28 (Andock-Tool ⑤: echter Handshake-Knopf)

**Getan (Branch `claude/spore-generation-network-receipt-eyzz27-f9lpew`):**

- **Andock-Tool (Dev-Briefkasten, `?dev`) um Schritt ⑤ „Andocken" erweitert**
  (`sbkim/sbkim-init.js`): Ziel-Knoten-Auswahl (Dropdown) + Knopf **🤝 Andocken
  (Handshake senden)** löst einen **echten** ausgehenden Handshake über das
  Live-Relais aus (`SbkimAnastomose.handshake(target, null, {transport:"nostr",
  timeoutMs:12000})`) — **konsolen-frei**, kein `__fpErzeugeSpore()`/DevTools mehr.
  Ziel-Spore wird live von `raw/main` geladen. Ergebnis wird **ehrlich** berichtet:
  `established` / `rejected` / `rejected-local` / `timeout`. Modul 05 **unangetastet**
  (1:1 aus Sage) — reines Tool-Code.
- **Ehrlicher Befund (Bedeutungs-Schwelle 0.80, Modul 04 `PROVIDER_MIN_MATCH`):**
  die Domänen-Cosinus von Family zu den Geschwistern: **Mixarium 0.7753 < 0.80**
  (→ `rejected-local`, sendet bewusst NICHTS ans Relais — gewollt, kein Bug),
  Rezeptbuch 0.807 · BookLedgerPro 0.803 · Sage 0.829 · SB-KIMTool 0.831 (alle ≥0.80).
  **Folge für den Clean-Slate-Test:** für die Live-VERKEHR-Demo (Empfänger-Liste
  füllt sich) einen Knoten **≥0.80** als Ziel wählen — **nicht** Mixarium. Der Befund
  ist im Knopf-Output + im Dropdown („Mixarium ≈0.78") sichtbar gemacht.
- **Smoke `tests/smoke_all.mjs` 75/75 grün** (neue ⑤-Probe: Knopf + Ziel-Auswahl +
  `handshake()` verfügbar). §11.6: `sbkim/SIGNAL.json` seq 3 → **4**.

**Offen / wartet auf Klaus:** der **Clean-Slate-Test** (deinstallieren → Browser tief
reinigen → frisch installieren → Sporen neu → VERKEHR-Lampen grün → **ein** echter
Cross-Knoten-Handshake via Schritt ⑤, Ziel ≥0.80, Empfänger-VERKEHR-Liste füllt sich).
Headless ist grün, ersetzt aber Klaus' Browser-Lauf nicht.

**Goal-3-Befund:** Sage `sbkim/SIGNAL.json` Auto-Lauschen war im Brief als offen
gelistet, ist aber auf `main` **bereits gemeldet** (Sage SIGNAL **seq 34**, 2026-06-27:
„Stufe 2 Auto-Lauschen … alle sieben Browser-Knoten lauschen jetzt"). Kein Redundanz-
Eintrag nötig.

---

## Stand — 2026-06-27 (Bau-Sitzung 1: Grundgerüst + alle Seiten)

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

**Netz-Quittung ERLEDIGT (beidseitig bestätigt, 2026-06-27):**

- Family-PRs #1→#2→#3 nach `main` gemerged → `spore.json` auf `main` erreichbar.
- **Sage** (PR #460, gemerged): Family als 7. Knoten in `status.json` +
  `familyproject_inbox.verify.md` + `AUSTAUSCH-FamilyProjekt.md` + NETZ-STAND +
  SIGNAL seq 33, `ack[Family Projekt]=2`. Reziprok nachgerechnet: verified-match
  **0.8287**, Signatur VALID, Manipulationsprobe fällt durch.
- **SB-KIMTool-Point** (PR #88, gemerged): Family in `status.json` +
  `familyproject_inbox.json/.verify.md` + `AUSTAUSCH-FamilyProject.md` +
  `web/data/marktplatz.json` + SIGNAL seq 25, `ack[Family Projekt]=2`. Repo-eigenes
  `verify_foreign_spore.mjs` → ✔ VALID, verified-match **0.8311**.
- **Family-Seite zurück-quittiert:** `SIGNAL.json` seq 3, `ack[Sage-Protokol]=33`,
  `ack[SB-KIMTool-Point]=25`; beide Postfächer „Übergabe beidseitig bestätigt".

**Family Projekt ist damit ein verifizierter Mycel-Knoten.** OFFEN bleibt nur der
**Deploy** (Hetzner, `family-projekt.de` — Endpoint noch nicht live; Verifikation
lief über `raw/main`).

## Bau-Sitzung 5 — Andock-Tool vereinheitlicht + Safe (Stufe 1) — 2026-06-27

Klaus' Wunsch: **ein** Tool, das alles kann (statt Dev-Briefkasten ≠ Wizard ≠
Anleitung), klick-geführt + KI-Anleitung, ohne Rätsel. Zuvor Repo-übergreifend
kartiert (2 Lese-Agenten): **das Relais existiert wirklich** —
`wss://relay.family-projekt.de` (nostr-rs-relay, Hetzner, log-frei, live seit
2026-06-25, Cross-Knoten-Transport über die Pinnwand bewiesen). **Lücke:** Modul 05
(Anastomose) spricht das Relais noch nicht → automatischer Handshake = Stufe 2.

**Stufe 1 gebaut (family-project, abgegrenzt, headless getestet):**

- **Dev-Briefkasten → „🔌 Andock-Tool"** umbenannt + als **vier geführte Schritte**
  neu aufgebaut (`sbkim/sbkim-init.js`): ① Spore erzeugen (konsolen-frei, Fortschritt
  + Retry) · ② ins Repo / an die KI (Links: `MYCEL-ANDOCK-AUFTRAG.md` +
  Andock-Wizard `netzwerk.html#andock`) · ③ **🔐 Identität im Safe sichern** ·
  ④ Verbinden (Verbindungs-Test; Auto-Handshake übers Relais = in Vorbereitung).
  Bleibt dev-gated (Betreiber-Werkzeug, `?dev`).
- **Modul 20 Schlüssel-Safe** 1:1 aus Sage kopiert (`sbkim/20_schluessel_safe.js`,
  byte-identisch), in index/markt/netzwerk/werkzeuge geladen, `SbkimSafe.init({autoPrompt:false})`
  fail-soft in die Kette. Safe-Knopf ruft `SbkimSafe.open()` (Modul-20-Modal:
  Passwort + Shamir 2/3, Krypto = Modul 02 `exportBackup`). Kein Klartext at rest.
- **Tests:** `tests/smoke_all.mjs` **66/66 grün** (+4: Safe geladen, Andock-Tool-Panel
  mit Schritten, KI-Anleitung+Wizard verlinkt, Safe-Knopf öffnet Modul-20-Modal).
- **Browser-Sichttest (Klaus) steht aus:** Safe-Modal anlegen/entsperren am Tablet.

**Stufe 2 (eigene Sitzung, sicherheits-sensibel):** Modul 05 Nostr-Relais-Transport
für den vollautomatischen Handshake → Brief `docs/sessions/BRIEF_06_RELAIS_HANDSHAKE.md`.
Modul 05 ist 1:1 aus Sage → Spec + Bau gehören nach **Sage**, dann runterkopieren.
**Stufe 3 (Phase B):** Andock-Tool als kopierbares Modul für fremde Repos (Modul 19
ausbauen).

## Nachtrag 2026-06-27 — Feenstaub über „Bild des Tages" (Klaus' Wunsch)

Dezenter Funkel-/Feenstaub-Effekt im Maus-Umfeld über dem Bild des Tages
(analog Sage-Truhe, aber leiser): Canvas `.fp-dust` über `#tagesbildPad`
(`z-index:1`, `pointer-events:none` → 5-fach-Klick unberührt), Partikel-System
spawnt bei `pointermove` nur über einem echten Bild, teal-gold-Palette, niedrige
Alpha (0.55·life), reduced-motion-sicher (kein Canvas). `index.html`
(Startseiten-IIFE `setupTagesDust()`) + CSS `.doodle .pad .fp-dust`.
Smoke `smoke_all.mjs` **67/67 grün** (+1 Feenstaub-Canvas gemountet/klick-durchlässig).
**Browser-Sichttest des Effekt-Gefühls wartet auf Klaus.**

## Nachtrag 2026-06-27 — Stufe 2 verteilt: Nostr-Relais-Handshake in family-project

Modul 05 Nostr-Transport (in Sage gebaut + live bestätigt, PR #461 gemerged) nach
family-project verteilt:

- **`sbkim/05_anastomose.js`** (mit `transport:"nostr"`), **`sbkim/05b_nostr_relay.js`**
  (browser-only WebSocket+schnorr-Client), **`sbkim/noble-secp256k1.js`** — alle
  **byte-identisch aus Sage** kopiert. 05b als `<script type="module">` in
  index/markt/netzwerk/werkzeuge geladen (self-mountet `global.SbkimNostrRelay`,
  Default `wss://relay.family-projekt.de`).
- **Andock-Tool Schritt ④** umgestellt: „in Vorbereitung" → **live**. Neue Knöpfe
  **🛰 Relais-Selbsttest** (publish→subscribe Round-Trip gegen das echte Relais)
  + **👂 Empfänger lauschen** (`SbkimAnastomose.listenNostr()`, macht den Knoten
  erreichbar). `relaisSelbsttest()` in `sbkim-init.js`.
- **Tests:** `smoke_all.mjs` **69/69 grün** (+2: 05b geladen; Relais-Knöpfe +
  listenNostr verfügbar), `smoke_spore.mjs` 6/6. 05b lädt headless ohne Fehler.
- **Browser-Sichttest:** Klaus drückt im Andock-Tool ④ „🛰 Relais-Selbsttest" →
  ✓ Echo = der family-Knoten spricht das Relais. Voller Cross-Knoten-Handshake
  (zwei laufende Knoten) = Generalprobe.

## Nachtrag 2026-06-27 — PWA installierbar + offline (Deploy-Schritt 1)

Vor dem Hetzner-Deploy: family-project zur installierbaren, offline-fähigen PWA
gemacht (war vorher normale Website ohne Manifest/SW).

- **`manifest.json`** (name „Family Projekt", `display:standalone`, `start_url:"."`,
  `scope:"."`, theme/bg `#0b0d14`, Icons 192+512 „any maskable").
- **`icon-192.png` / `icon-512.png`** — per Node erzeugt (Marken-Motiv: Gradient-
  Rundquadrat + weißes Λ-Knoten-Zeichen wie das Favicon).
- **`sw.js`** — App-Schale cache-first + Hintergrund-Update, **Fremd-Origins
  durchgereicht** (Relais/raw/Modell nicht gecacht), `CACHE_VERSION` für Cache-Bust.
- **4 Hauptseiten**: `<link rel=manifest>` + apple-/mobile-Meta + apple-touch-icon
  + fail-soft SW-Registrierung (`navigator.serviceWorker.register("sw.js")`).
- **Tests:** `smoke_all.mjs` **72/72 grün** (+3 PWA: Manifest gültig, sw.js+Icons
  erreichbar, index verlinkt Manifest/SW). SW stört den Headless-Lauf nicht.

**Wichtig (Identität ist pro Origin):** der deployte Knoten `family-projekt.de`
ist eine **andere Adresse** als `localhost` — die Identität (privater Schlüssel)
muss dort **einmalig über den Safe importiert** werden (Andock-Tool → Safe
entsperren), NICHT neu erzeugt. Die committete `spore.json` ist nur der
öffentliche Teil.

**Deploy-Schritt 2 (Hetzner):** einmaliges Setup `docs/DEPLOY.md` (Verzeichnis
klonen + Caddy-Block + reload), dann „veröffentlichen" = Server `git pull origin main`.
Browser-Sichttest der Installierbarkeit (Chrome „Installieren"-Angebot) wartet auf Klaus.

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
