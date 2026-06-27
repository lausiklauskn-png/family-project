/* Weekly Discovery — Quelle für den Stöber-Knopf der Startseite.
 * FAIR: der Knopf zeigt zufällig einen Eintrag. NUR Einträge mit Bild (img)
 * erscheinen hier — ohne Bild wird der Eintrag übersprungen (Brief §4).
 * Featuring gibt nur Sichtbarkeit, NIE einen Such-Bonus.
 *
 * Eigene Werkzeuge dürfen Emoji statt Bild nutzen (sie sind keine Markt-
 * Einträge, der Bild-Zwang gilt für FREMDE Markt-Einträge). Für die faire
 * Discovery-Rotation hat hier aber jeder Eintrag entweder img ODER emoji;
 * Einträge ohne img UND ohne emoji werden übersprungen.
 *
 * Schema: { name, emoji?, img?, de, en, url } */
window.FP_WEEKLY = [
  { name: "Such-Werkzeug", emoji: "🔍", img: "",
    de: "Findet nach Bedeutung statt nach Stichwörtern.",
    en: "Finds by meaning, not by keywords.",
    url: "werkzeuge/such-werkzeug.html" },
  { name: "Andock-Werkzeug", emoji: "🔗", img: "",
    de: "Erzeugt deine Spore-Vorlage und dockt deine Seite ans Netzwerk an.",
    en: "Creates your spore template and docks your site to the network.",
    url: "werkzeuge/andock-werkzeug.html" },
  { name: "Knoten-Werkzeug", emoji: "🪢", img: "",
    de: "Macht deine PWA selbst zu einem Knoten im Netzwerk.",
    en: "Turns your PWA into a node in the network.",
    url: "werkzeuge/knoten-werkzeug.html" },
  { name: "Mein Rezeptbuch", emoji: "📖", img: "",
    de: "Digitales Kochbuch — Rezepte verwalten, planen, offline nutzen.",
    en: "Digital cookbook — manage and plan recipes, use offline.",
    url: "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/" },
  { name: "Mein Mixarium", emoji: "🍹", img: "",
    de: "Getränke-Labor für Cocktails, Mocktails und Smoothies.",
    en: "Drinks lab for cocktails, mocktails and smoothies.",
    url: "https://lausiklauskn-png.github.io/Mein-Mixarium/" },
  { name: "BookLedgerPro", emoji: "📊", img: "",
    de: "Verschlüsselte Offline-Buchhaltung für Deutschland.",
    en: "Encrypted offline accounting for Germany.",
    url: "https://lausiklauskn-png.github.io/BookLedgerPro/" },
  { name: "Mein Tresor", emoji: "🔐", img: "",
    de: "Verschlüsselter Tresor für Dateien und Schlüssel.",
    en: "Encrypted vault for files and keys.",
    url: "https://lausiklauskn-png.github.io/Mein-Tresor/" }
];
