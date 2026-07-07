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
 * Logos statt Emojis (Klaus 2026-07-07): img zeigt jetzt die echten App-Logos
 * aus assets/appicons/ (lokal gehostet, aus den Quell-Repos übernommen).
 * Das Emoji bleibt als Fallback, falls ein Bild nicht lädt. Die SVG-Sperre
 * gilt weiter für FREMDE Bilder; eigene Logos unter assets/appicons/ sind
 * davon ausgenommen (siehe weeklyImg in index.html).
 *
 * Bauphase-Komfort: 5-fach-Klick auf das Weekly-Bild der Startseite öffnet ein
 * Drag&Drop-Fenster (wie „Bild des Tages") — pro Eintrag ein Bild im Browser
 * setzen/zurücksetzen. Fürs öffentliche Veröffentlichen das Bild ins Repo legen
 * und hier beim Eintrag als img eintragen.
 *
 * Schema: { name, emoji?, img?, de, en, url } */
window.FP_WEEKLY = [
  { name: "Such-Werkzeug", emoji: "🔍", img: "assets/appicons/such.png",
    de: "Findet nach Bedeutung statt nach Stichwörtern.",
    en: "Finds by meaning, not by keywords.",
    url: "werkzeuge/such-werkzeug.html" },
  { name: "Pinnwand", emoji: "📌", img: "assets/appicons/pinnwand.png",
    de: "Offenes Frage-Antwort-Brett — Antworten nach Bedeutung sortiert.",
    en: "Open question-and-answer board — answers sorted by meaning.",
    url: "https://lausiklauskn-png.github.io/Sage-Protokol/pinnwand/" },
  { name: "Sage-Protokoll", emoji: "🍄", img: "assets/appicons/sage.svg",
    de: "Die Mycel-Bibliothek und der Bau-Hub des Netzwerks.",
    en: "The mycelium library and the build hub of the network.",
    url: "https://lausiklauskn-png.github.io/Sage-Protokol/" },
  { name: "SB-KIMTool-Point", emoji: "🛰️", img: "assets/appicons/point.png",
    de: "Der öffentliche Knoten-Punkt: Werkzeugkiste und Andock-Stelle.",
    en: "The public node point: toolbox and docking station.",
    url: "https://lausiklauskn-png.github.io/SB-KIMTool-Point/" },
  { name: "Andock-Werkzeug", emoji: "🔗", img: "",
    de: "Erzeugt deine Spore-Vorlage und dockt deine Seite ans Netzwerk an.",
    en: "Creates your spore template and docks your site to the network.",
    url: "werkzeuge/andock-werkzeug.html" },
  { name: "Knoten-Werkzeug", emoji: "🪢", img: "",
    de: "Macht deine PWA selbst zu einem Knoten im Netzwerk.",
    en: "Turns your PWA into a node in the network.",
    url: "werkzeuge/knoten-werkzeug.html" },
  { name: "Mein Rezeptbuch", emoji: "📖", img: "assets/appicons/rezeptbuch.png",
    de: "Digitales Kochbuch — Rezepte verwalten, planen, offline nutzen.",
    en: "Digital cookbook — manage and plan recipes, use offline.",
    url: "https://lausiklauskn-png.github.io/Mein-Rezeptbuch-Page/" },
  { name: "Mein Mixarium", emoji: "🍹", img: "assets/appicons/mixarium.png",
    de: "Getränke-Labor für Cocktails, Mocktails und Smoothies.",
    en: "Drinks lab for cocktails, mocktails and smoothies.",
    url: "https://lausiklauskn-png.github.io/Mein-Mixarium-Page/" },
  /* BookLedgerPro bewusst NICHT in der öffentlichen Rotation (Klaus 2026-07-07):
   * Preise/Inhalte noch nicht freigegeben — kommt nach der Freigabe zurück. */
  { name: "Jasons Tresor", emoji: "🔐", img: "assets/appicons/jasons.svg",
    de: "Verschlüsselter Daten-Tresor für JSON-Dateien und Schlüssel.",
    en: "Encrypted data vault for JSON files and keys.",
    url: "https://lausiklauskn-png.github.io/Jasons-Tresor/" },
  { name: "Mein Tresor", emoji: "🗝️", img: "assets/appicons/meintresor.svg",
    de: "Der Dreh-Safe mit 20 Fächern — jedes ein echter AES-Tresor.",
    en: "The dial safe with 20 compartments — each a real AES vault.",
    url: "https://lausiklauskn-png.github.io/Mein-Tresor/" }
];
