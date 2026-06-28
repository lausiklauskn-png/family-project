/* Klaus' EIGENE Werkzeuge (Raum 2). Jedes hat eine eigene Landingpage unter
 * werkzeuge/<page>. Wechselbar ohne Code.
 *   open:    Link zum Öffnen/Starten (eigener Tab)
 *   install: Link/Hinweis zum Installieren (leer = nur öffnen)
 * Schema: { id, name, icon, de, en, page, open, install } */
window.FP_WERKZEUGE = [
  { id: "such", name: "Such-Werkzeug", icon: "🔍",
    de: "Findet nach Bedeutung statt nach Stichwörtern — komplett im Browser, ohne Server, ohne Konto.",
    en: "Finds by meaning, not by keywords — fully in the browser, no server, no account.",
    page: "werkzeuge/such-werkzeug.html",
    open: "https://lausiklauskn-png.github.io/Sage-Protokol/such-tool/",
    install: "https://lausiklauskn-png.github.io/Sage-Protokol/such-tool/" },
  { id: "andock", name: "Andock-Werkzeug", icon: "🔗",
    de: "Erzeugt aus drei Eingaben eine Spore-Vorlage + status.json-Zeile + PR-Link, um eine Seite ans Netzwerk anzudocken.",
    en: "Turns three inputs into a spore template + status.json line + PR link to dock a site to the network.",
    page: "werkzeuge/andock-werkzeug.html",
    open: "netzwerk.html#andock",
    install: "" },
  { id: "knoten", name: "Knoten-Werkzeug", icon: "🪢",
    de: "Macht deine eigene PWA selbst zu einem Knoten im Netzwerk (Identität, Handshake, Status).",
    en: "Turns your own PWA into a node in the network (identity, handshake, status).",
    page: "werkzeuge/knoten-werkzeug.html",
    open: "https://lausiklauskn-png.github.io/Sage-Protokol/docs/observatorium/tools/mycelknoten.html",
    install: "" },

  /* Klaus' EIGENE, öffentliche Apps (2026-06-27 freigeschaltet). external:true →
   * die Karte öffnet die LIVE-App direkt in einem neuen Tab (keine eigene
   * Zwischen-Landingpage nötig). Nur Apps mit eigenem Impressum sind hier gelistet
   * (Mein Tresor / Jasons Tresor / BookLedgerPro / WorkFloh bewusst NICHT). */
  { id: "rezeptbuch", name: "Mein Rezeptbuch", icon: "📖", external: true,
    de: "Rezepte sammeln, ordnen, kochen und teilen — mit Wochenplan, mehrsprachig, offline. Als App installierbar.",
    en: "Collect, organise, cook and share recipes — weekly plan, multilingual, offline. Installable as an app.",
    open: "https://lausiklauskn-png.github.io/Mein-Rezeptbuch/" },
  { id: "mixarium", name: "Mein Mixarium", icon: "🍹", external: true,
    de: "Dein Getränke-Labor: Cocktails, Mocktails, Smoothies, Limonaden, Tees & Sirupe — mehrsprachig, offline.",
    en: "Your drinks lab: cocktails, mocktails, smoothies, lemonades, teas & syrups — multilingual, offline.",
    open: "https://lausiklauskn-png.github.io/Mein-Mixarium/" },
  { id: "sage", name: "Sage-Protokoll", icon: "🍄", external: true,
    de: "Die Mycel-Bibliothek und der Bau-Hub des Netzwerks — Glossar, Protokoll-Doku und Werkzeuge.",
    en: "The mycelium library and the build hub of the network — glossary, protocol docs and tools.",
    open: "https://lausiklauskn-png.github.io/Sage-Protokol/" },
  { id: "einladung", name: "Sage-Einladung", icon: "✉️", external: true,
    de: "Die bebilderte Einladung ins Mycel: was das Netzwerk ist, wie es gedacht ist und wie man mitmacht.",
    en: "The illustrated invitation into the mycelium: what the network is and how to join.",
    open: "https://lausiklauskn-png.github.io/Sage-Protokol/docs/einladung/" },
  { id: "kimtoolpoint", name: "SB-KIMTool-Point", icon: "🛰️", external: true,
    de: "Der öffentliche Knoten-Punkt: Werkzeugkiste und Andock-Stelle, um eine eigene Seite ans Netzwerk zu bringen.",
    en: "The public node point: toolbox and docking station to bring your own site onto the network.",
    open: "https://lausiklauskn-png.github.io/SB-KIMTool-Point/" },
  { id: "pinnwand", name: "Pinnwand", icon: "📌", external: true,
    de: "Ein offenes Frage-Antwort-Brett: Antworten lassen sich nach Bedeutung sortieren (gratis, als Rangfolge) — optional versteht ein KI-Richter die Absicht, z. B. alkoholfrei = wirklich kein Alkohol. Im Browser, ohne Konto.",
    en: "An open question-and-answer board: answers can be sorted by meaning (free, as a ranking) — optionally an AI judge grasps intent, e.g. alcohol-free = really no alcohol. In the browser, no account.",
    open: "https://lausiklauskn-png.github.io/Sage-Protokol/pinnwand/" }
];
