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
    install: "" }
];
