/* Marktplatz-Einträge (FREMDE Apps/Seiten) = zugleich Such-Korpus.
 *
 * Schema pro Eintrag (Brief §4 + Sage-Such-Korpus-Schema {label,anchorId,text},
 * erweitert um Markt-Felder):
 *   {
 *     label:    anzeigbarer Titel,
 *     anchorId: opake ID (z.B. "markt-0001"),
 *     text:     Bedeutungs-Text für die Suche (mit Alltags-Synonymen),
 *     by:       Anbieter-Handle (KEIN Klarname / kein PII),
 *     url:      Link zur Anbieter-Seite (target=_blank rel=noopener),
 *     img:      PFLICHT — Bild-Link beim Anbieter (JPG/PNG/WebP; KEIN SVG),
 *     category: optionale Kategorie
 *   }
 *
 * SICHERHEIT (Brief §5): Einträge werden NICHT automatisch veröffentlicht.
 * Klaus gibt frei (Freigabe-Liste). Nur Link + Text + Bild-Link, alles wird
 * beim Rendern escaped. Kein fremder Code, Bilder nur als <img src> von der
 * Anbieter-URL, SVG gesperrt. Kein Bild -> kein Eintrag.
 *
 * Start: leer. Einträge kommen über den (späteren) Einreich-Dienst + Freigabe.
 * Beispiel (auskommentiert, zur Form):
 *   { label:"Beispiel-App", anchorId:"markt-0001",
 *     text:"Was die App tut, in eigenen Worten, mit Synonymen.",
 *     by:"@beispiel", url:"https://beispiel.example/app/",
 *     img:"https://beispiel.example/app/screenshot.jpg", category:"Werkzeug" }
 */
window.FP_LISTINGS = [
];
