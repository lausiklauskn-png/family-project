/* Spenden — Konfiguration.
 *
 * Klaus' Entscheidung 2026-07-12: die freiwillige Unterstützung SCHARF schalten
 * (wie in Mein-Rezeptbuch / Mein-Mixarium), verweisend auf Klaus' PayPal. Es ist
 * eine reine SPENDE ohne Gegenleistung — kein Verkauf, kein Abo. Der Hinweistext
 * (keine Garantie, kein Anspruch) steht in markt.html (#support).
 *
 * `donateUrl` ist der öffentliche PayPal.Me-Link des Projekts.
 *
 * Umgestellt 2026-08-01. Vorher stand hier ein `_xclick`-Link, der die
 * Empfängeradresse im Klartext trug — sichtbar für jeden, der die
 * Seite oder ihren Quelltext ansieht. Am Geldfluss ändert der Wechsel nichts; er
 * nimmt nur eine private E-Mail-Adresse aus dem öffentlichen Netz, wo sie sonst
 * von Spam-Sammlern gefunden wird.
 *
 * Für künftige Änderungen: eine Zahlungsadresse gehört NIE in eine Adresse, die
 * im Browser lesbar ist. PayPal.Me zeigt stattdessen den Kontonamen — bei einem
 * Geschäftskonto also den Projektnamen statt des bürgerlichen Namens.
 *
 * `yearlyUrl` (Jahresbeitrag für FREMDE Marktplatz-Einträge) bleibt vorerst leer
 * = „(in Vorbereitung)" — das ist noch nicht geklärt.
 */
window.FP_SPENDEN = {
  enabled: true,
  donateUrl: "https://paypal.me/familyprojekt",
  yearlyUrl: ""   // Jahresbeitrag (leer = „in Vorbereitung")
};
