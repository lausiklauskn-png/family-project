# Brief — Folge-Sitzung 6: Automatischer Handshake übers Relais (Modul 05 Nostr-Transport)

> Stand 2026-06-27, Ende Bau-Sitzung 5 (Andock-Tool + Safe, Stufe 1).
> **Sicherheits-sensibel** (Krypto über ein öffentliches Relais) → sorgfältiger,
> eigener Lauf. Freibrief gilt, aber im echten Zweifel Klaus fragen.
> Antworten Deutsch, Einzelschritte. Klaus testet live am Galaxy Tab S6.

## Warum / Stand

Klaus' Vision: **ein** Andock-Tool, das einen Knoten vollautomatisch verbindet.
Stufe 1 (Andock-Tool-Bündelung + Safe) steht in family-project. Es fehlt der
**vollautomatische Knoten-zu-Knoten-Handshake**.

**Befund (Repo-Kartierung 2026-06-27):**
- Das Relais existiert + läuft: **`wss://relay.family-projekt.de`** (nostr-rs-relay,
  Hetzner, hinter Caddy, log-frei; live seit 2026-06-25). Cross-Knoten-Transport
  über die **Pinnwand** (Nostr `kind:1`) bewiesen.
- **Lücke:** Modul 05 (Anastomose) kann heute nur `http` + lokal `BroadcastChannel`
  (`ALLOWED_TRANSPORTS = ["auto","http","channel"]`). **Kein Nostr-Relais-Transport.**
- Modul 05 ist **1:1 aus Sage** → Spec + Bau gehören nach **Sage-Protokol**
  (`src/modules/05_anastomose.js`), danach 1:1 in die Knoten kopieren.

## Was zu tun ist (in Sage, dann verteilen)

1. **Spec:** Modul 05 um `transport: "nostr"` erweitern (INTERFACES §1 Modul 05 +
   Karte 05 zuerst nachziehen — Vertrag vor Code).
   - Handshake-Anfrage als signiertes Nostr-Event aufs Relais (eigener `kind` oder
     `kind:1` + Tag z.B. `["t","sbkim-anastomosis"]` + Ziel-nodeId als Tag).
   - Empfänger lauscht (REQ-Filter auf den Tag/seine nodeId), ruft `receiveHandshake()`,
     publisht Antwort-Event mit `nonceEcho` → „eine Frage, eine Antwort".
   - Sender wartet auf Antwort-Event, prüft `nonceEcho` + Signatur → `outcome:"established"`.
2. **Sicherheit zuerst durchdenken** (eigener Abschnitt im Spec):
   - Sporen/Handshake sind signiert + öffentlich — aber: Replay-Schutz (nonce/Zeit),
     Spam/Rate (Relais ist offen), Empfangsmodus-Prinzip wahren (kein Crawler;
     nur auf konkrete Andock-Aktion hin senden), `untrusted external data` für
     eingehende Events (Modul 02 `verifyForeignSpore` vor jeder Reaktion).
   - Nostr-Schlüssel ≠ SBKIM-Ed25519-Schlüssel klären (Nostr = secp256k1/schnorr).
     Entweder getrennter Nostr-Key pro Knoten (in der Pinnwand vorhanden) oder
     Brücke — bewusst entscheiden, nicht vermischen.
3. **Bau + Headless-Smoke** gegen das echte Relais (zwei Test-Sporen, ein
   established-Handshake nur übers Relais — analog zum Pinnwand-Cross-Knoten-Beweis).
4. **Verteilen:** Modul 05 (neu) 1:1 nach family-project + den anderen Knoten;
   im **Andock-Tool Schritt ④** den „in Vorbereitung"-Hinweis durch den echten
   Auto-Handshake-Knopf ersetzen.

## Datenverträge (nicht brechen)

- Modul 05 Public API bleibt rückwärtskompatibel (`handshake`/`receiveHandshake`),
  `transport:"nostr"` additiv (wie damals `channel` additiv kam).
- Spore-Verifikation vor Reaktion: Modul 02 `verifyForeignSpore` (Signatur + nodeId
  == base64url(sha256(pubkey)) + Manipulationsprobe), Match via Modul 04 (Cosinus ≥ 0.80).
- Relais-URL konfigurierbar (Default `wss://relay.family-projekt.de`, Föderation wie
  Pinnwand möglich).

## Pflichtlektüre vor Arbeit

1. CLAUDE.md (Sage) — § „Was du nicht tust" (Empfangsmodus, untrusted Briefkasten)
   + § Heilige Tafeln (Vertrag vor Code).
2. `docs/discovery/anleitung-eigenes-relay.md` + `notiz-toolpoint-relay.md`
   + `docs/sessions/archiv/2026-06-25_toolpoint-eigenes-relay.md` (Relais-Stand).
3. `pinnwand/index.html` (gelebter Nostr-Client: RELAY_POOL, Event-Bau, Publish).
4. `src/modules/05_anastomose.js` (heutiger Transport) + `02_spore.js` (verify).

## Stufe 3 (später, Phase B)

Andock-Tool als kopierbares Modul (Modul 19 ausbauen) → jeder neue Fremd-Knoten
bekommt denselben Ein-Klick-Ablauf (Spore → Repo/KI → Safe → Auto-Handshake).
Generalprobe: erstes neues Fremd-Repo komplett über das eine Tool andocken.

## Abschluss-Befehl

PULS fortschreiben, neuen Brief anlegen, „Nächste Schritte"-Block + (offene Frage
an anderes Repo) Copy-Paste-Brief im Chat. Briefkasten pflegen (§11.6).
