---
name: verschluesselter-schluessel-tresor
description: Rezept, damit eine SBKIM-PWA einen BYOK-Schlüssel (z.B. den KI-Richter-API-Schlüssel, oder jedes andere kleine Geheimnis) VERSCHLÜSSELT ablegen kann, sodass er Hard-Reload und App-Schließen überlebt — ohne je im Klartext in localStorage/IndexedDB zu liegen und ohne dass eine andere App auf der geteilten github.io-/family-projekt.de-Adresse ihn lesen kann. Anwenden, wenn in eine App eine „Schlüssel merken / Tresor entsperren"-Funktion eingebaut wird (KI-Richter, Suche, OCR, jede BYOK-KI-Funktion), ODER wenn ein Nutzer klagt „ich muss meinen KI-Schlüssel jedes Mal neu eingeben/generieren". Nutzt den vorhandenen App-Tresor (Modul 20 Safe) — kein Klartext-Speicher, kein Parallel-Bau.
---

# Verschlüsselter Schlüssel-Tresor (BYOK-Geheimnisse merken)

Damit niemand mehr fragen muss „wie merke ich einen KI-Schlüssel sicher". Ein
BYOK-Schlüssel wird **einmal** mit einem Passwort im **App-eigenen Tresor
(Modul 20 Safe)** verschlüsselt abgelegt und überlebt Reload/App-Schließen.
**Kein Klartext** in localStorage/IndexedDB; eine andere App auf derselben
geteilten Adresse liest nur den Chiffretext (Fremdnutzer-/Marktplatz-Leitsatz).

## Kern-Entscheidung (warum so)

- **NICHT** im Klartext in localStorage speichern — auf der geteilten
  `github.io`-/`family-projekt.de`-Adresse könnten Geschwister-/Fremd-Apps ihn
  lesen. Genau das Risiko, das der Fremdnutzer-Leitsatz benennt.
- **NICHT** ein Parallel-Krypto-Ding bauen — der Safe (Modul 20) ist der
  App-eigene, verschlüsselte Tresor, der **mit jeder App mitkommt** (echte
  Krypto). Ihn nutzen, nicht neu erfinden.
- **NICHT** den Daten-Tresor (Rezept-Backup / Mein-Tresor-App) — der ist
  app-spezifisch + Datei-Export/Import, gibt's nicht in jeder App. Der KI-Richter
  ist ein GETEILTES Panel in ALLEN Apps → der Speicher muss überall gleich sein.

## TEIL 1 — Der Safe kann Geheimnisse (Modul 20, seit 2026-07-11)

`src/modules/20_schluessel_safe.js` (`SbkimSafe`) hat eine generische
Geheimnis-Ablage — **echte Krypto, PBKDF2-SHA256 600k → AES-GCM-256**, frisches
Salt + IV pro Geheimnis, unabhängig vom Identitäts-Vault (kein `createVault` nötig):

```
SbkimSafe.putSecret(name, klartext, passwort, opts?) -> Promise<true>   // verschlüsselt ablegen; opts.hint = KLARTEXT-Merkhilfe
SbkimSafe.getSecret(name, passwort)          -> Promise<string|null>  // null = falsch/manipuliert/fehlt
SbkimSafe.getSecretHint(name)                -> Promise<string|null>  // Merkhilfe OHNE Passwort lesen
SbkimSafe.hasSecret(name)                    -> Promise<boolean>
SbkimSafe.removeSecret(name)                 -> Promise<boolean>
```

- Ablage-Schlüssel-Konvention: `"ki_richter_key:<provider>"` (ein Schlüssel je
  KI-Anbieter). Beliebig andere Namen möglich (`"ocr_key"` …).
- **Fail-soft:** falsches Passwort / manipulierter Blob / kein WebCrypto → `null`,
  nie ein Klartext-Hinweis. `putSecret` wirft nur bei klarem Aufrufer-Fehler
  (leerer Name/Wert, Passwort < 8 Zeichen, kein WebCrypto).
- **Kein Klartext** wird gespeichert — der Blob trägt nur `{v, kdf, iterations,
  cipher, salt, iv, ct}` (alles base64url).
- Pflicht bei Änderung an Modul 20 (Sicherheits-Modul): `ZERTIFIKAT_ASPEKTE`-
  Eintrag in `16_siegel.js` (Datum + Modul-ID + ein Satz).

## TEIL 2 — Bedien-Verdrahtung (Beispiel: KI-Richter im Netz-Panel)

Referenz: `src/modules/23_rendezvous_ui.js` (KI-Richter-Zeile). Muster für jedes
BYOK-Feld:

1. **`safeMod()`** — nur nutzen, wenn `global.SbkimSafe.putSecret/getSecret`
   wirklich da sind (fail-soft für Forker ohne Modul 20 → alles läuft weiter mit
   RAM-Schlüssel).
2. **„🔒 im Tresor merken"** — sichtbar, wenn ein Schlüssel getippt ist + Safe da.
   Klick → Passwort abfragen (`prompt`, in Tests stubbar) →
   `SbkimSafe.putSecret("ki_richter_key:"+provider, key, pw)`. Ehrliche Notiz.
3. **„🔓 Tresor entsperren"** — sichtbar, wenn KEIN Schlüssel getippt ist + Safe da.
   Klick → Passwort → `getSecret(...)` → bei Treffer das Schlüsselfeld füllen +
   weiterverarbeiten; bei `null` ehrlich „kein gemerkter Schlüssel oder falsches
   Passwort".
4. **Fremdnutzer-klar benennen:** ein Passwort · verschlüsselt · überlebt Neuladen ·
   andere Apps sehen ihn nicht. Kein Auto-Speichern ohne Nutzer-Aktion.

## TEIL 2b — Passwort vergessen? (Vergessen-Schutz, Klaus 2026-07-11)

Ein BYOK-Schlüssel ist **gratis neu holbar** beim Anbieter (der Nutzer holt SEINEN
selbst — der App-Betreiber gibt NIE Schlüssel aus, sieht sie nie, trägt keine
Support-Last). Deshalb ist „Passwort vergessen" **kein Datenverlust** — anders als
beim echten Daten-/Identitäts-Tresor. Zwei einfache, offline-taugliche Bausteine
(KEINE E-Mail, KEIN Server, KEIN PII — beides bräche offline + Marktplatz-Tauglichkeit):

1. **Ehrlicher Hinweis (`FORGOT_HINT`)** — beim Merken/beim Fehlversuch ein Satz:
   „Passwort vergessen? Kein Drama — hol dir beim Anbieter gratis einen neuen
   Schlüssel und leg ihn neu ab." Das ist der eigentliche Vergessen-Schutz.
2. **Optionale Merkhilfe (`opts.hint`)** — beim Merken freiwillig abfragen (leer
   erlaubt, NICHT das Passwort selbst). Wird **unverschlüsselt** im **app-eigenen**
   Safe-Datensatz abgelegt (IndexedDB dbSuffix → kein Cross-App-Leck) und beim
   Entsperren via `getSecretHint(name)` OHNE Passwort in die Passwort-Frage
   eingeblendet.

> **Shamir 2-von-3** (`recoverPassword`) gibt es im Safe bereits — der ist für
> **wertvolle, nicht ersetzbare** Geheimnisse (Identität/Daten), NICHT für einen
> gratis-ersetzbaren KI-Schlüssel (dort wäre er Überkandidelung).

## TEIL 3 — Voraussetzungen in der App

- `index.html` lädt `20_schluessel_safe.js` (+ Abhängigkeiten `01_storage.js`,
  `02_spore.js` — Safe nutzt Modul-01-Storage; die Geheimnis-Ablage selbst
  braucht Modul 02 NICHT).
- Läuft die App ohne Modul 20 (Forker/älterer Stand): das BYOK-Feld bleibt voll
  nutzbar, nur die Merken/Entsperren-Knöpfe erscheinen nicht (fail-soft).

## TEIL 4 — Headless-Beweis (Pflicht)

- `tests/smoke_bau20_secret.mjs` — Krypto-Kern (Round-trip, falsches Passwort →
  null, Manipulation → null, kein Klartext im Blob, frisches Salt/IV, remove,
  Input-Validierung). **Echtes WebCrypto** (`node:crypto` webcrypto).
- `tests/smoke_bau23c_ki_richter.mjs` — Bedien-Verdrahtung (merken sichtbar,
  putSecret abgelegt, entsperren füllt Schlüssel, falsches PW fail-soft, ohne
  Modul 20 keine Knöpfe).
- Browser-Sichttest bleibt ehrlich „ungeprüft, wartet auf Klaus' Browser-Lauf",
  bis Klaus: merken → App schließen → öffnen → entsperren → Schlüssel da.

## Bauform-Checkliste (jeder Schlüssel-Tresor)

- [ ] `putSecret/getSecret/hasSecret/removeSecret` in Modul 20 vorhanden (byte-1:1
      Kanon), Drift-sha256 in den Recorded-Sha-Repos mitziehen.
- [ ] Bedien-Knöpfe „🔒 merken" / „🔓 entsperren" mit `safeMod()`-Guard (fail-soft).
- [ ] Passwort NIE gespeichert, Klartext NIE persistiert. `null` bei falschem PW.
- [ ] Vergessen-Schutz: ehrlicher `FORGOT_HINT` + optionale Merkhilfe (`opts.hint` /
      `getSecretHint`, app-eigen, unverschlüsselt, NIE das Passwort). Keine E-Mail/Server.
- [ ] Ablage-Name eindeutig (`ki_richter_key:<provider>` o.ä.).
- [ ] `ZERTIFIKAT_ASPEKTE`-Eintrag (Sicherheits-Modul berührt).
- [ ] `index.html` lädt Modul 20 (+ 01); ohne Modul 20 fail-soft.
- [ ] Headless-Smoke der Krypto + der Bedienung grün.

## Leitplanken (Verfassung)

- **Echte Krypto** (PBKDF2 600k + AES-GCM-256), kein selbstgebautes Verfahren.
- **Kein Klartext-Secret** persistent, **kein PII**, privater Schlüssel nie ins Repo.
- **Fremdnutzer-/Marktplatz-Brille:** ohne Modul 20 / ohne Passwort läuft alles
  weiter; Kosten/Daten-Abfluss/Schlüssel-Verbleib klar benannt.
- **Kopieren, nicht klonen:** Modul 20 byte-1:1 in jede App, Drift-Guard im Smoke.

## Kurz-Merksatz

**Der Safe (Modul 20) merkt sich Geheimnisse verschlüsselt** — `putSecret`/
`getSecret` (PBKDF2+AES-GCM). Ins BYOK-Feld zwei Knöpfe: **🔒 merken** (Passwort →
verschlüsselt ablegen) und **🔓 entsperren** (Passwort → Schlüssel zurück). Ohne
Modul 20 fail-soft, nie Klartext, andere Apps lesen nur Chiffretext.
