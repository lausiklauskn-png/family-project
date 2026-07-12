/* Spenden — Konfiguration.
 *
 * Klaus' Entscheidung 2026-07-12: die freiwillige Unterstützung SCHARF schalten
 * (wie in Mein-Rezeptbuch / Mein-Mixarium), verweisend auf Klaus' PayPal. Es ist
 * eine reine SPENDE ohne Gegenleistung — kein Verkauf, kein Abo. Der Hinweistext
 * (keine Garantie, kein Anspruch) steht in markt.html (#support).
 *
 * `donateUrl` ist Klaus' öffentliche PayPal-Spendenadresse — dieselbe, die bereits
 * in seinen deployten Apps öffentlich steht (ausdrücklich von Klaus so gewünscht).
 *
 * `yearlyUrl` (Jahresbeitrag für FREMDE Marktplatz-Einträge) bleibt vorerst leer
 * = „(in Vorbereitung)" — das ist noch nicht geklärt.
 */
window.FP_SPENDEN = {
  enabled: true,
  donateUrl: "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=Klaus-nitzsche@t-online.de&currency_code=EUR&item_name=Family+Projekt",
  yearlyUrl: ""   // Jahresbeitrag (leer = „in Vorbereitung")
};
