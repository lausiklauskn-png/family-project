# BRIEF für die nächste Sitzung — nach „Marktplatz online" (2026-07-12)

**Freibrief gilt** (siehe Sage `CLAUDE.md` § Freibrief, netzweit): eigenständig bauen +
eigene PRs selbst mergen, wenn getestet (Smoke/Drift/`node --check` grün), abgegrenzt und
nicht architektonisch zweifelhaft; bei echtem Zweifel erst Klaus fragen; **nie
stillschweigend** (Commit/PULS dokumentieren). Erst mergen → dann prüft Klaus live (Pages
deployt von `main`, Hard-Reload nach Pull).

## Was diese Sitzung fertig gemacht hat (alles auf `main`)

1. **Tooltips netzweit klar + kürzer + An/Aus-Schalter.** „Tab offen"-Hinweise
   verständlich umformuliert (gemeint ist die **App-Seite**, nicht das Panel — man darf das
   Fenster schließen und weiterarbeiten). **💬 An/Aus-Schalter** für Tooltips im
   Rendezvous-Panel-Kopf (Zustand in `localStorage sbkim_tips_off`). Kanon Modul 23 UI
   `903f00ab`, netzweit ausgerollt (Sage #645, Mixarium #132, Rezeptbuch #320, family #71,
   Tomys #109, Kimboard #28, Kimseek #31, Mein-Tresor #64, Jasons-Tresor #122,
   SB-KIMTool-Point #117).
2. **Marktplatz startklar & online (family #72).** `family-projekt.de/markt.html`:
   - **Klaus' 7 Apps als lebende Beispiele** in `assets/config/listings.js` — anklickbar,
     direkt verlinkt UND über Wort-/Bedeutungs-Suche auffindbar (Suchtexte mit Synonymen).
   - **Vorschaubilder = das eigene Icon/Bild jeder App** (Klaus' Wunsch): Rezeptbuch,
     Mixarium, BookLedgerPro (og-image), Mein-Tresor (safe-front.png), Such-Werkzeug,
     Pinnwand von github.io. Jasons-Tresor hat nur ein SVG-Icon → sein **eigenes** Icon per
     Chromium zu PNG gerendert, lokal `assets/apps/jasons-tresor.png`.
   - **Spende live**: ein Button „☕ Unterstützen (PayPal)" → Klaus' öffentliche PayPal-
     Adresse (wie Rezeptbuch/Mixarium), mit Hinweis: freiwillig, ohne Gegenleistung, keine
     Garantie, kein Kauf. Jahresbeitrag für **fremde** Einträge bleibt „(in Vorbereitung)".
   - „Tool anbieten" → „**Deine eigene App eintragen**" (verständlicherer Text, DE/EN).
   - `markt.html` lädt jetzt `21_spracheingabe.js` (🎤) + `23_rendezvous_ui.js` — „Mit dem
     Netz verbinden" + Spracheingabe laufen jetzt auch auf der Marktplatz-Seite.
   - SW-Cache `family-projekt-v30`.

## Was Klaus als Nächstes im Browser prüft (nicht ersetzbar, blockiert nichts)
Nach Hard-Reload (Strg+Umschalt+R) auf `family-projekt.de/markt.html`:
- (a) Zeigt der Marktplatz die 7 App-Karten mit den **richtigen App-Bildern**? Öffnet ein
  Klick die App? Findet die Suche (z.B. „Getränke", „Buchhaltung", „Passwort") die passende
  App — auch mit „Nach Bedeutung suchen"?
- (b) Ist der Spenden-Button **live** und führt zu PayPal? Hinweistext ok?
- (c) Läuft „🌐 Mit dem Knotennetz verbinden" jetzt **ohne** Modell-Fehler? (Der alte
  „Unexpected token '<'"-Fehler kam vom veralteten Deploy; der aktuelle Lader fällt sauber
  auf HuggingFace zurück.)

## Offene Punkte / Feinarbeit (Klaus: A4–A10 später)
1. **Tooltip-An/Aus auch im Such-Widget (Modul 22).** Der 💬-Schalter sitzt bisher nur im
   Rendezvous-Panel (Modul 23 UI). Modul 22 nutzt für seine Tooltips noch native `title`.
   Wenn gewünscht: denselben Schalter/dieselbe `sbkim_tips_off`-Konvention in Modul 22
   nachziehen.
2. **Embedding-Modell selbst hosten** (optional, echtes Offline): `models/Xenova/
   multilingual-e5-small/` ist noch Platzhalter → die Suche/Verbinden lädt das Modell live
   von HuggingFace (braucht beim ersten Mal Internet). GitHub-Action „Embedding-Modell ins
   Repo holen" ausführen, dann lädt family-projekt.de es vom eigenen Server.
3. **Fremde Marktplatz-Einträge**: der Einreich-Weg (PR-Vorschlag) steht; sobald echte
   fremde Apps kommen, Freigabe-Fluss testen.
4. **Jahresbeitrag** (fremde Einträge) klären + scharf schalten (heute bewusst „in
   Vorbereitung").
5. **`meineapps.js`** (Footer-Chips, „Bauphase") enthält u.a. **WorkFloh (privat)** — vor
   dauerhaftem öffentlichem Launch ausblenden/kuratieren. Für den Marktplatz-Korpus wurde
   WorkFloh bewusst NICHT aufgenommen.

## Hinweis Konto-Limit
Die parallelen Rollout-Subagenten sind heute mehrfach an einem **Konto-Ausgabelimit**
(„monthly spend limit") abgebrochen; der Rollout wurde dann **direkt in der Hauptsitzung**
fertiggestellt. Bei erneutem Wegbrechen von Subagenten: Limit unter claude.ai/settings/usage
prüfen, oder gleich direkt in der Hauptsitzung ausrollen.

## Pflichtlektüre vor Arbeit
1. Sage `CLAUDE.md` (§ Freibrief, § Was du nicht tust, § Fremdnutzer-/Marktplatz-Brille).
2. `family-project/docs/PULS.md` + dieser Brief.
3. Betroffener Code: `markt.html`, `assets/config/listings.js`, `assets/config/spenden.js`.

## Abschluss-Befehl (die Kette reißt nie ab)
Am Sitzungsende: PULS fortschreiben, **neuen Folge-Brief** anlegen + vollständig als
Codeblock im Chat ausgeben, Pflichtlektüre + diesen Abschluss-Befehl wiederholen. Freibrief
gilt.
