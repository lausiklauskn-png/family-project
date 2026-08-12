# Marktplatz-Studio-API (`marktplatz-api.php`) — Server-Einrichtung

Diese **eine Datei** bringt die Prüf-/Freigabe-**Warteschlange direkt ins Studio**
(Langdruck aufs Copyright auf `markt.html`). Sie ist das **JSON-Geschwister von
`freigabe.php`**: dieselbe `freigabe-config.php`, derselbe GitHub-Token auf dem
Server, dieselbe Warteschlange `warteschlange.jsonl`. **`freigabe.php` bleibt
unberührt** daneben nutzbar.

**Der Clou:** im Studio brauchst du **keinen GitHub-Token mehr im Browser** — nur
**ein Studio-Passwort**. Der Server committet mit seinem Token. Nichts geht live
ohne deinen Freigabe-Klick.

## Wohin gehört die Datei
Auf dein **Hetzner-Webhosting per WebFTP**, in **denselben Ordner** wie
`einreichung.php` / `freigabe.php` (erreichbar als
`https://formular.family-projekt.de/marktplatz-api.php`).
**Nicht** auf den Caddy-Server — der liefert nur die Website aus.

## Einrichtung (2 Schritte)

1. **In `freigabe-config.php` eine Zeile ergänzen** (die Datei, die du für
   `freigabe.php` schon angelegt hast — mit dem GitHub-Token). Neu:
   ```php
   'studio_key'   => 'DEIN-STUDIO-PASSWORT',   // frei wählen, nur hier auf dem Server
   ```
   (Optional `allow_origins` — Standard passt für family-projekt.de. Vorlage:
   `freigabe-config.example.php`.)

2. **`marktplatz-api.php` per WebFTP** neben `einreichung.php` / `freigabe.php` laden.

> **Nachtrag 2026-08-03 — einmal neu hochladen.** `marktplatz-api.php` hat die Aktion
> `commit_wache` dazubekommen (Studio-Knopf „✓ Gesehen — Seite ist in Ordnung"). Ohne die
> neue Fassung auf dem Server bleibt der Knopf im Studio zwar sichtbar, das Veröffentlichen
> meldet dann aber einen Fehler. Die Konfig muss **nicht** angefasst werden: fehlt
> `wache_path`, nimmt die Datei von selbst `assets/config/wache-hand.json`.

Fertig. Im Studio (Langdruck aufs Copyright) oben bei **„📥 Eingereicht"** dein
Studio-Passwort eintragen (Haken „merken") → **„Vom Server holen"**.

## So läuft die Prüfung
1. **Vom Server holen** → alle offenen Einreichungen als 🟡 **Neu**.
2. Jede App prüfen: **„↗ App öffnen"** anschauen (später: KI-Prüfung, Phase 2).
3. Ist sie ok → **„🔵 Geprüft"**. Faul → **„Verwerfen"** (öffnet vorausgefüllte Absage-Mail).
4. **„✓ Freigeben"** (einzeln) oder **„Alle 🔵 geprüften freigeben"** (Stapel) →
   der **Server** committet in `listings.js` → in ~1 Minute live.
5. **„⤓ Zurückziehen"** an einem Live-Eintrag entfernt ihn wieder (auch server-seitig).

## Sicherheit
- **Kein GitHub-Token** im Browser oder Repo — nur in `freigabe-config.php` auf dem Server.
- **Jede** API-Aktion (Liste holen, Status, Freigeben, …) verlangt das **Studio-Passwort**
  (`hash_equals`). Kontakt-Anfragen bleiben `freigabe.php` vorbehalten.
- `commit_listings` schreibt nie eine leere/kaputte Datei (Schutz-Prüfung), `commit_image`
  nur ins Depot `assets/apps/`.
- `commit_wache` hat den **schärfsten** Prüfer, weil es die Ampel berührt.

  > **Hier stand bis zum 2026-08-12 etwas Überholtes.** Der Satz lautete: „erlaubt ist je
  > Eintrag ausschließlich `gesehen`; `ampel` und `grund` werden abgelehnt". Das galt bis
  > zum 2026-08-11 und gilt seitdem nur noch für **eine Richtung**.

  Erlaubt sind je Eintrag `gesehen` (Hex-Prüfsumme), `gesehen_am` (Datum) sowie
  `ampel`/`grund`/`seit` — **aber nur in Richtung strenger**. Der Prüfer rechnet dafür die
  Rangfolge `gruen 0 < (nichts) 1 < gelb 2 < rot 3` und weist jeden Schritt nach unten mit
  `entsperren_nur_in_datei` ab. **Sperren geht aus dem Browser, lösen nicht** — gelöst wird
  in `assets/config/wache-hand.json`. Eine neue Sperre ohne lesbaren Grund wird abgewiesen
  (`grund_fehlt`); lässt sich die vorhandene Fassung nicht lesen, wird gar nichts geschaltet
  (`vorlage_nicht_lesbar`, fail-closed). Alle übrigen Felder gehen nur **byte-gleich** durch.
- Seit dem **2026-08-12** kennt der Prüfer zusätzlich den Schlüssel **`_automatik`** — den
  Schalter aus Schritt 4 der Rauswurf-Regel (PWA Toolpoint). Er sagt, ob ein ohnehin
  gerechneter Befund öffentlich gezeigt wird, und trägt deshalb **keine Ampel**:
  `wache_automatik_pruefen()` lässt genau `an` (Ja/Nein), `naechte` (1–30), `meldungen`
  (1–100) und `grenze` (1–100) durch, dazu Erklär-Text, und weist alles andere mit
  `automatik_invalid` ab. Sperren oder lösen kann darüber niemand. Jeder andere Name mit
  Unterstrich bleibt weiterhin `bad_key`.
- Eine Warteschlange (`warteschlange.jsonl`) für Formular, `freigabe.php` und Studio —
  keine Dopplung. Der `.htaccess`-Schutz (Warteschlange/Config) gilt wie gehabt.

## Ehrlich
Nur **du** kannst den Live-Weg testen (Datei hochladen, echte Einreichung, Freigabe mit
Passwort). Headless geprüft: `php -l` + Funktionslauf (list/setstatus/Schutz-Prüfungen) +
`node tests/smoke_studio_markt.mjs`. Der Browser-/Server-Lauf wartet auf dich.
