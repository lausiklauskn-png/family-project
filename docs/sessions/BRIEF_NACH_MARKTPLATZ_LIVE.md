# BRIEF für die nächste Sitzung — Marktplatz ist LIVE, jetzt Angebot + Feinschliff (2026-07-12)

**Freibrief gilt** (Sage `CLAUDE.md` § Freibrief, netzweit): eigenständig bauen + eigene PRs
selbst mergen, wenn getestet (`node --check`/Smoke grün), abgegrenzt, nicht architektonisch
zweifelhaft; bei echtem Zweifel erst Klaus fragen; **nie stillschweigend** (Commit/PULS
dokumentieren). family-projekt.de deployt **automatisch** (2-Min-Cron auf dem Hetzner-Server)
→ erst mergen, dann Hard-Reload, dann sieht Klaus es live.

---

## ✅ Was heute lief (alles auf `main`, alles live)

1. **Marktplatz online** (`family-projekt.de/markt.html`): Klaus' 7 Apps als lebende,
   **suchbare + anklickbare** Beispiele (`assets/config/listings.js`) — Rezeptbuch, Mixarium,
   BookLedgerPro, Mein Tresor, Jasons Tresor, Such-Werkzeug, Pinnwand.
2. **Vorschaubilder = echte App-Bilder** (Klaus' Wunsch): App-Icons/og-Bilder von github.io;
   **Mein Tresor** + **Jasons Tresor** = Klaus' echte Eingangs-Screenshots (Browser-Leisten
   weggeschnitten, 16:9 960×540 PNG, lokal `assets/apps/`).
3. **Rezeptbuch + Mixarium** verlinken auf ihre **Erklär-Landingpages**
   (`Mein-Rezeptbuch-Page` / `Mein-Mixarium-Page`) statt direkt in die App.
4. **Spende live** (`assets/config/spenden.js`): ein Button „☕ Unterstützen (PayPal)" →
   Klaus' PayPal, mit Hinweis (freiwillig, ohne Gegenleistung, keine Garantie, kein Kauf).
5. **Besserer Text**: „Tool anbieten" → „Deine eigene App eintragen" (DE/EN).
6. **Verbinden + Spracheingabe auf markt.html** nachgezogen (`21_spracheingabe.js` +
   `23_rendezvous_ui.js` fehlten dort). Verbinden-UI = Kanon `903f00ab`.
7. **Deploy gelöst**: family-projekt.de läuft auf Klaus' **Hetzner-Server** (Caddy, Pull aus
   `main`) — **NICHT** GitHub Pages. Repo auf **öffentlich** gestellt (keine Geheimnisse
   drin, geprüft) + **2-Minuten-Auto-Deploy-Cron** eingerichtet → ab jetzt reicht Hard-Reload,
   kein Server-Eingriff mehr nötig. (Details: `docs/DEPLOY.md`, `deploy/AUTO_DEPLOY.md`.)
8. **Netzweit vorher**: Tooltips klar + kürzer + 💬-An/Aus-Schalter (Modul 23 UI, `903f00ab`),
   in allen 10 Apps ausgerollt.

---

## ▶ Was als Nächstes drankommt (Klaus 2026-07-12)

### 1. Ladebalken beim Sprachmodell in der Suche (Bug/UX)
**Befund Klaus:** Beim „Nach Bedeutung suchen" lädt das Sprachmodell (~30 MB), aber es ist
**kein Ladebalken / kein Fortschritt** zu sehen — nur der statische Text „Lade Sprachmodell …".
- Der Fortschritt existiert schon woanders: die Verbinden-UI zeigt „Lade Modell: config.json …
  100%". Modul 03 (`SbkimEmbedding.init`) kann einen **Progress-Callback** liefern.
- **To-do:** in `markt.html` (`semanticSearch`) den Modell-Ladefortschritt sichtbar machen —
  echter Balken oder Prozent im `#mkSearchNote`. Fail-soft, keine Barriere.

### 2. Marktplatz-Angebot / „Jahresbeitrag"-Text neu formulieren  ⭐ (Klaus' Idee)
Der Text unten am Einreich-Formular („Kleiner Jahresbeitrag — in Vorbereitung") soll durch ein
**konkretes Gründer-Angebot** ersetzt werden:

- **Die ersten 100 Apps sind LEBENSLANG kostenlos** gelistet. Wer jetzt dabei ist, bleibt
  gratis — ein Leben lang. **Sobald 100 drin sind, läuft das Angebot aus** (danach ggf. ein
  kleiner Jahresbeitrag, nur als Spam-Bremse — Höhe offen).
- **Wichtige Klarstellung (Verkauf):** Family Projekt ist ein **Schaufenster / Verzeichnis**,
  **kein Bezahl-Dienst**. Wer seine App **verkaufen** will, macht das über den **eigenen
  Store / das eigene Konto** — die Plattform **listet und verlinkt nur**, ohne Provision und
  ohne Zahlungsabwicklung.

**Vorgeschlagene Formulierung (DE, zur Abnahme/Verfeinerung):**
> **Gründer-Angebot: die ersten 100 Apps bleiben für immer kostenlos.**
> Trag deine App jetzt ein — wer unter den ersten 100 ist, bleibt **lebenslang gratis**
> gelistet. Ist die 100 voll, läuft das Angebot aus.
>
> **Verkaufen?** Family Projekt ist ein Schaufenster, kein Bezahl-Dienst. Deine App verkaufst
> du über deinen **eigenen Store / dein eigenes Konto** — wir listen und verlinken nur, ohne
> Provision, ohne Zahlungsabwicklung.

**EN-Entwurf:**
> **Founder offer: the first 100 apps stay free forever.** List your app now — if you're among
> the first 100, your listing stays **free for life**. Once 100 are in, the offer ends.
> **Selling?** Family Projekt is a showcase, not a payment service. You sell your app through
> **your own store / your own account** — we only list and link, no commission, no payments.

**Umsetzungs-Hinweise:**
- Text in `markt.html` (`mk_jahr` DE/EN + Inline-Default) ersetzen. Ggf. einen kleinen
  **Zähler** „X / 100 Plätze belegt" aus `FP_LISTINGS.length` einblenden (Klaus:
  „sei schneller als ich — wenn 100 drin sind, ist das Angebot abgelaufen").
- `spenden.js`: der **Jahresbeitrag-URL** bleibt leer / „(in Vorbereitung)" — passt zum
  Angebot (erst nach den 100 relevant). Die **Spende** (Projekt unterstützen) bleibt davon
  unberührt und aktiv.
- **Klaus möchte die Formulierung final abnehmen** → im Zweifel kurz zeigen, dann bauen.

### 3. Offene Feinarbeit (aus den vorigen Briefen)
- 💬 Tooltip-An/Aus-Schalter auch ins **Such-Widget (Modul 22)** (nutzt noch native `title`).
- **Embedding-Modell selbst hosten** (`models/` ist Platzhalter): GitHub-Action „Embedding-
  Modell ins Repo holen" ausführen → echtes Offline, kein HuggingFace-Erstladen mehr.
- **Weitere Apps → Landingpages** (BookLedgerPro/Tresore/Such-Werkzeug/Pinnwand), falls sie
  eigene Erklär-Seiten bekommen.
- `meineapps.js` (Footer-Chips „Bauphase", enthält privates **WorkFloh**) vor breitem Launch
  kuratieren/ausblenden.

---

## Deploy-Merkzettel (wichtig!)
- family-projekt.de = **Hetzner-Server**, nicht Pages. Auto-Deploy-Cron zieht `main` alle 2 Min.
- Nach Merge: einfach **Hard-Reload (Strg+Umschalt+R)** im Browser — fertig.
- SW-Cache bei Shell-Änderung hochzählen (`sw.js` `CACHE_VERSION`, aktuell `family-projekt-v32`).

## Hinweis Konto-Limit
Parallele Rollout-Subagenten brachen heute an einem „monthly spend limit" ab; Rollout wurde
direkt in der Hauptsitzung fertiggestellt. Bei Wiederholung: Limit prüfen oder direkt bauen.

## Pflichtlektüre vor Arbeit
1. Sage `CLAUDE.md` (§ Freibrief, § Fremdnutzer-/Marktplatz-Brille).
2. `family-project/docs/PULS.md` + dieser Brief.
3. Code: `markt.html`, `assets/config/listings.js`, `assets/config/spenden.js`,
   `sbkim/03_embedding.js` (Progress-Callback für den Ladebalken).

## Abschluss-Befehl (die Kette reißt nie ab)
Am Sitzungsende: PULS fortschreiben, neuen Folge-Brief anlegen + vollständig als Codeblock im
Chat ausgeben, Pflichtlektüre + diesen Abschluss-Befehl wiederholen. Freibrief gilt.
