# Plan: Marktplatz Spezial – der feste Weg für jede Pro-App

**Verbindlich seit 2026-11-27 (Klaus):** *„Wenn andere Apps hineinkommen … dass dann genau derselbe Weg gegangen wird
und nicht abgewichen wird. Wenn andere nachkaufen wollen, andere Apps haben wollen, müsste das dann genauso möglich sein.“*

Diese Datei ist die **eine** Stelle, an der der Weg steht. Wer eine Pro-App aufnimmt, einen Passkey ausgibt, eine App
nachverkauft oder etwas an Passkey, Server oder Lizenz ändert, liest zuerst hier – und ändert, wenn nötig, **hier**,
statt nebenher einen zweiten Weg zu bauen. Gilt für **beide Märkte** (family-projekt.de `fp`, PWA Toolpoint `tp`).

Stand der Bausteine: ✅ gebaut · 🔨 in Arbeit · ⏳ geplant (Reihenfolge unten).

---

## 1 · Was es gibt

| Baustein | Wo | Stand |
|---|---|---|
| Passkey `FPK1.`/`TPK1.` – unterschrieben (BIP-340 Schnorr), trägt Pseudonym, Apps, Datum, optional „gültig bis“ | `assets/spezial-kern.js` (byte-gleich in tp) | ✅ |
| Herausgeber-Schlüssel je Markt, geheimer Teil nur im Browser des Studios | Studio `spezial-studio.html`, öffentliche Teile in `server/spezial/schluessel.json` | ✅ (fp und tp je 2: Tablet und Handy) |
| Käuferseite: Passkey eingeben, Download über 10-Minuten-Link | `markt-spezial.html`, `assets/spezial-seite.js` | ✅ |
| Übergabe: Link, QR-Bild, „Mit Code verschließen“ (`FPZ1.`/`TPZ1.`) | Studio | ✅ |
| Kurzlink `spezial.<markt>/k/<id>`, **3 Tage**, nur für verschlossene Passkeys | `server/spezial/dienst.mjs` | ✅ |
| Sperren (`FPS1.`/`TPS1.`) – wirkt sofort, löscht auch Kurzlinks | Studio + Dienst | ✅ |
| Spiegel: holt APK/Installer aus GitHub-Releases oder vom eigenen Update-Server (Ed25519-geprüft) | `server/spezial/spiegeln.mjs`, `quellen.json` | ✅ |
| **Gerätebindung: höchstens 2 Geräte je Passkey**, Zurücksetzen im Studio (Zufallskennung des Browsers, gezählt beim ersten Download) | Dienst + Seite + Studio | ✅ |
| **Nachkaufen: „Erweitern“** – neuer Passkey mit alten + neuen Apps, alter wird gesperrt | Studio | ⏳ |
| **Lizenzprüfung in den Pro-Apps** (Passkey in der App, Updates nur mit gültigem Passkey) | je Pro-Repo | ⏳ |
| Verkauf automatisch über PayPal | Dienst | ⏳ erst nach Gewerbeanmeldung |

---

## 2 · Eine neue Pro-App aufnehmen (immer genau so)

1. **Kennung festlegen**, klein, mit Bindestrich, endet auf `-pro` (z. B. `notizbuch-pro`).
   ⚠ **Nie umbenennen.** Die Kennung steht unter der Unterschrift jedes ausgegebenen Passkeys.
2. **`assets/config/spezial.js`** – Eintrag mit `id`, `name`, `bild`, `text`, `text_en`. Solange es noch keine Datei
   gibt: `bald: true` (Karte erscheint erst, wenn der Spiegel eine Datei hat; Passkeys lassen sich schon ausgeben).
3. **Symbol** nach `assets/spezial/<kennung>.png` (128 px, das App-Symbol der Pro-Fassung, kein Emoji),
   Herkunft in `assets/spezial/HERKUNFT.json`. Bei jedem späteren Tausch `?v=N` im `bild` hochzählen.
4. **`server/spezial/quellen.json`** – Repo und je Art (`android`, `windows`) der Weg: GitHub-Release **oder**
   eigener Update-Server (`server.<art>` mit `ordner`, `app`, `schluessel`).
5. **PWA Toolpoint gleich mitziehen:** derselbe Eintrag in `assets/config/spezial.js` dort, dasselbe Symbol.
   Stufe 1 gilt dort weiter: **kein Preis auf der Seite**.
6. **Cache-Bump** in beiden Repos (`sw.js`, `ASSET_V`, alle `?v=`).
7. **Proben:** `smoke_spezial_dienst`, `smoke_spezial_seite`, `smoke_cache_version` (fp) · `npm test` (tp).
8. **Lizenzprüfung** in die neue App einbauen, sobald es sie gibt (Abschnitt 5) – mit derselben Kennung.

---

## 3 · Einen Passkey ausgeben (Verkauf von Hand)

0. Meldet sich ein Käufer mit „schon auf 2 Geräten in Gebrauch“ (neues Handy, Browserdaten gelöscht): im Studio am
   Passkey **„Geräte zurücksetzen“**. Die Spalte „Geräte“ zeigt, wie viele es sind.
1. Studio öffnen (`family-projekt.de/spezial-studio.html` bzw. `pwa-toolpoint.de/spezial-studio.html`).
2. **Pseudonym** = z. B. die PayPal-Transaktionsnummer. Kein Name nötig.
3. Apps anhaken · optional „gültig bis“ · **„Mit Code verschließen“ anhaken** · Studio-Passwort · „Passkey erstellen“.
4. **Kurzlink** an den Käufer (Signal, E-Mail). Der **Code** am sichersten getrennt (Telefon, SMS); über Signal in
   einer Nachricht geht auch.
5. Kurzlink abgelaufen? Im Studio unter „Vergebene Passkeys“ → „Übergabe“ → neuer Kurzlink.

---

## 4 · Nachkaufen: weitere Apps für denselben Käufer

Der Browser des Käufers merkt sich **einen** Passkey je Markt. Ein zweiter Passkey würde den ersten verdrängen.
Deshalb gilt **immer**:

- **Ein Käufer = ein Passkey**, der alle seine Apps trägt.
- Nachkauf = im Studio **„Erweitern“** am vorhandenen Passkey: neuer Passkey mit den alten **und** den neuen Apps,
  selbes Pseudonym. Der alte wird **gesperrt**. Die Geräte, die der alte schon hatte, gehen auf den neuen über.
- Bis „Erweitern“ gebaut ist (⏳): von Hand neuen Passkey mit allen Apps erstellen, dann den alten sperren.

---

## 5 · Lizenzprüfung in den Pro-Apps (⏳, eine App nach der anderen)

Gleicher Aufbau in **jeder** Pro-App, damit nicht jede ihren eigenen Weg geht:

| | |
|---|---|
| Lizenz | **ist der Passkey** – kein zweites Format |
| Prüfen | beim Start, **ohne Internet**, Unterschrift gegen die öffentlichen Schlüssel des Marktes, die **in der App** stehen; die eigene Kennung muss in den Apps des Passkeys stehen |
| Gerät | an die Gerätekennung gebunden (nativ verfügbar); auf neuem Gerät fragt die App neu |
| Sperre | die App holt die Sperrliste, **wenn** sie online ist; offline läuft sie weiter (offline-first) |
| Updates | der Update-Server liefert neue Fassungen **nur gegen gültigen Passkey** – der stärkste Hebel |
| ohne Lizenz | App startet in einen klaren Zustand „Bitte Passkey eingeben“ – keine stillen Abschaltungen |

Reihenfolge: zuerst **Private Brain Pro** (dort gibt es die Freischalt-Codes schon), am Gerät bewähren, dann die
anderen. Vor dem Bau je App ein kurzer Plan an Klaus.

**Ehrliche Grenze:** wer viel Zeit hat, kann eine App verändern und die Prüfung herausnehmen. Gegen Gelegenheits-Teiler
reicht es; eine geknackte Kopie bekommt keine Updates. Die **Basic-/PWA-Fassungen** werden **nicht** geschützt
(Web-Code ist immer lesbar, Regel in PWA Toolpoint: kein Kopierschutz, keine Verschleierung). Dort schützen
Urheberrecht und Git-Historie; jedes Pro-Repo bekommt eine Lizenzdatei „alle Rechte vorbehalten“.

---

## 6 · Später: Verkauf automatisch (⏳, erst nach Gewerbeanmeldung)

PayPal-Geschäftskonto für info@family-projekt.de → PayPal meldet die Zahlung an den Dienst (Webhook, geprüft) →
der Dienst erstellt den Passkey mit einem **eigenen Server-Schlüssel nur für Verkäufe** (im Notfall einzeln aus
`schluessel.json` zu nehmen) → **Code auf der Danke-Seite**, **Kurzlink per E-Mail**, Code als zweite E-Mail nach
10 Minuten als Rückfall. Davor: Gewerbe, Preise, Datenschutzerklärung (E-Mail nur zum Zusenden).

---

## 7 · Regeln, die nie gebrochen werden

- Eine Kennung wird **nie** umbenannt.
- Der Server speichert **nie** einen offenen Passkey – nur verschlossene Teile, Kennungen und Zähler.
- Je Markt eigene Herausgeber-Schlüssel; ein Passkey gilt nur auf seinem Markt.
- Kein Name, keine E-Mail im Passkey und in den Server-Dateien – nur das Pseudonym.
- Jede Änderung an diesem Weg steht **zuerst hier**, dann im Code.
