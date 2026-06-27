/* Spenden / Jahresbeitrag — Platzhalter-Konfiguration (Phase 2).
 *
 * Klaus' Entscheidung 2026-06-27: PayPal-Knöpfe als opt-in-PLATZHALTER bauen,
 * aber NICHT scharf schalten, bis das Steuer-Wort gegeben ist. Solange
 * `enabled:false`, zeigen die Knöpfe „(in Vorbereitung)" und sind deaktiviert —
 * es gibt KEINEN echten Einzug.
 *
 * Scharf schalten (später, auf Klaus' Wort):
 *   1. enabled: true setzen.
 *   2. donateUrl / yearlyUrl mit den echten PayPal-Links füllen
 *      (z.B. https://www.paypal.com/donate/?hosted_button_id=... oder paypal.me/…).
 * Kein PII / kein echter Empfänger ist hier hartcodiert (Leitplanke: kein
 * Klarname/Secret im Repo).
 */
window.FP_SPENDEN = {
  enabled: false,
  donateUrl: "",   // einmalige Spende (leer = Platzhalter)
  yearlyUrl: ""    // Jahresbeitrag (leer = Platzhalter)
};
