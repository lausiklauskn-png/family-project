# Marktplatz-Prüf-/Freigabe-Warteschlange — Server-Einrichtung

Diese **eine Datei** (`marktplatz-api.php`) macht aus eingereichten Apps eine
**Warteschlange**, die du im Marktplatz-Studio prüfen und per Nummer freigeben kannst.
Sie ist **frisch/eigenständig** und rührt deine bestehende `einreichung.php` (E-Mail)
**nicht** an.

## Was die Datei tut
- **speichern:** jede Einreichung wird als kleine `.json`-Datei abgelegt + bekommt eine **Nummer**.
- **auflisten / Status / erledigt:** das Studio holt die offenen Einreichungen ab — **nur mit deinem Passwort**.
- **Quellcode holen:** (für die spätere KI-Prüfung, Phase 2) — ebenfalls passwortgeschützt.

Öffentliche Besucher können **nur** einreichen (kein Passwort, aber streng geprüft:
nur https-Link, Bild als https-Link ohne SVG, Längen gedeckelt, Honigtopf gegen Bots).
Alles andere verlangt **dein Passwort**.

## Einrichtung (einmalig — 4 Schritte)

1. **Öffne** `marktplatz-api.php` und trage oben im Block „KONFIG" ein:
   - `$ADMIN_KEY` = ein **selbst gewähltes Passwort** (merkst nur du dir — kommt später ins Studio, **nicht** ins Repo).
   - `$DATA_DIR` kannst du lassen (Standard: Ordner `marktplatz-data` neben der Datei — wird automatisch angelegt und per `.htaccess` gegen Fremd-Zugriff gesperrt).
   - `$ALLOW_ORIGINS` passt für `family-projekt.de` schon.
   - `$FORWARD_URL` **leer lassen** (deine `einreichung.php` verschickt die E-Mail bereits — sonst käme sie doppelt).

2. **Lade** `marktplatz-api.php` auf deinen Server — **neben** `einreichung.php`
   (also so erreichbar wie `https://formular.family-projekt.de/marktplatz-api.php`).

3. **Prüfe die Adresse:** im Repo steht in `assets/config/listings.js`:
   ```
   window.FP_MARKT_API = "https://formular.family-projekt.de/marktplatz-api.php";
   ```
   Stimmt die Adresse mit deinem Upload überein? Wenn nein → dort anpassen (oder mir sagen).

4. **Im Studio** (Langdruck aufs Copyright) erscheint jetzt oben **„📥 Eingereicht (zur Prüfung)"**.
   Trage dort **einmal dein Passwort** ein (Haken „Passwort merken") → **„Vom Server holen"**.

## So läuft die Prüfung danach
1. **„Vom Server holen"** → alle offenen Einreichungen als 🟡 **Neu**.
2. Jede App prüfen: **„↗ App öffnen"** anschauen (später: KI-Prüfung, Phase 2).
3. Ist sie ok → **„🔵 Geprüft"** (Status). Faul → **„Verwerfen"**.
4. **„✓ Freigeben"** (einzeln) oder **„Alle 🔵 geprüften freigeben"** (Stapel) →
   schreibt mit deinem GitHub-Token nach `main` → in ~1 Minute live.
5. **„⤓ Zurückziehen"** an einem Live-Eintrag entfernt ihn wieder von der Seite (Token).

## Sicherheit (kurz)
- **Kein GitHub-Token** liegt je auf dem Server oder in der öffentlichen Seite — nur bei dir im Studio.
- Der Server ist der **sichere Puffer**: Besucher schicken dorthin (ohne Token), **du** gibst mit Token frei.
- Die Warteschlange (mit Kontakt-Mails) ist **passwortgeschützt** — Fremde sehen sie nicht.
- Der Datenordner ist per `.htaccess` gegen direktes Auflisten gesperrt.

## Ehrlich
Diese Datei ist auf einem echten Server nur von **dir** testbar (Upload + echte Einreichung).
Die Logik wurde headless geprüft (`php -l` + Funktionslauf submit/list/status/done); der
Live-Lauf im Browser wartet auf dich.
