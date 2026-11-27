# Brief nächste Sitzung – Marktplatz Spezial (Stand 27.11.2026)

**Zuerst lesen:** `docs/PLAN_MARKTPLATZ_SPEZIAL.md` (verbindlicher Weg, gilt für fp und tp).

## Erledigt und auf main (fp = family-project, tp = PWA-Toolpoint)
- Klaus' Studio-Schlüssel (Tablet + Handy) in `server/spezial/schluessel.json`, Server zeigt beide.
- `launch_handler`: geteilter Link öffnet in der installierten App das Code-Feld.
- Kurzlink `/k/<id>`, 3 Tage, nur verschlossene Passkeys.
- Gerätebindung: höchstens 2 Geräte je Passkey, „Geräte zurücksetzen“ im Studio.
- PRs fp #395 #398 #400 #401 #402 · tp #196 #200 #201 #202 #203. Cache fp v184, tp v122.

## Offen bei Klaus (zuerst fragen, ob erledigt)
1. Hetzner **Cloud**-Konsole (console.hetzner.cloud → Projekt family-projekt → Server `ubuntu-4gb-fsn1-1` → `>_`),
   Login `root` mit dem **Server**-Passwort (nicht Konto-Passwort; unbekannt → Reiter Rescue → Root-Passwort zurücksetzen),
   dann `docker restart spezial` → Antwort `spezial`. Ohne das wirken Kurzlink und Gerätebindung nicht.
2. Danach mit Klaus testen: Kurzlink öffnen, Passkey auf zwei Geräten, drittes Gerät wird abgewiesen, Zurücksetzen.

## Als Nächstes (nur auf Klaus' Wort, je erst kurzer Plan)
- Studio „Erweitern“ (Nachkauf: neuer Passkey mit alten + neuen Apps, alter gesperrt, Geräte gehen mit).
- Lizenzprüfung in den Pro-Apps, zuerst Private Brain Pro (Plan Abschnitt 5).
- Lizenzdatei „alle Rechte vorbehalten“ je Pro-Repo. PayPal erst nach Gewerbe.

## Regeln
Keine Geheimnisse in Repo/Chat · kein PII aus Klaus' Bildern wiederholen · spezial-kern/-seite/-studio.js byte-gleich fp↔tp
(Drift-Guard tp) · Cache-Bump bei Asset-Änderung · tp ohne Preise · Kennungen nie umbenennen · Server speichert nie
offenen Passkey · Klaus kein Programmierer: Deutsch, Einzelschritte, immer sagen, auf welcher Maschine ein Befehl läuft.
