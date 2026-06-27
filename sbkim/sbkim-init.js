/* ============================================================================
 * Family Projekt — SBKIM-Andock (Knoten-Anbindung, Brief §6b).
 *
 * Family Projekt ist SELBST ein Mycel-Knoten. Init-Kette nach bewährtem
 * Endknoten-Muster (Mein-Mixarium/sbkim/sbkim-init.js):
 *   Storage(01) -> Widget(17, ZUERST: legt Proxy-Spans #lamp-fremd +
 *   #sbkim-siegel-badge an) -> Membran(15) -> Siegel(16) -> Anastomose(05).
 * Reihenfolge-Lehre (Sage CLAUDE.md Modul 17): SbkimWidget.init() VOR
 * SbkimMembrane.init() / SbkimSiegel.init().
 *
 * Kopf-Status (LEBT/VERKEHR/FREMD/SIEGEL): das Floating-Widget ist die
 * kanonische Ecke-Pille; zusätzlich spiegeln wir die vier Slots in eine
 * dezente Kopf-Leiste (#fp-head-status), getrieben von denselben Fenster-
 * Events (sbkim:alive / sbkim:postmessage / sbkim:handshake /
 * sbkim:fremd-alert / sbkim:siegel-certified). Kein Analogie-Text.
 *
 * BRIEFKASTEN-SONDERREGEL (Brief §6b): öffentlich VERSTECKT. Nur im Dev-Modus
 * (?dev in der URL oder localStorage fp_dev=1) erscheint der Dev-Briefkasten-
 * Knopf + Verbindungs-Test (Handshake/Sync mit Sage & SB-KIMTool-Point).
 * VOR dem öffentlichen Launch ausschalten (Default AUS).
 * ========================================================================== */
(function () {
  "use strict";

  var FP = {
    dbSuffix: "familyprojekt",
    allowedOrigins: [
      "https://family-projekt.de",
      "https://www.family-projekt.de",
      "https://family-projekt.com",
      "https://www.family-projekt.com"
    ],
    repoUrl: "https://github.com/lausiklauskn-png/family-project",
    // Gegenstellen für den Verbindungs-Test (raw SIGNAL.json lesen).
    peers: {
      "Sage-Protokol": "https://raw.githubusercontent.com/lausiklauskn-png/Sage-Protokol/main/sbkim/SIGNAL.json",
      "SB-KIMTool-Point": "https://raw.githubusercontent.com/lausiklauskn-png/SB-KIMTool-Point/main/sbkim/SIGNAL.json"
    }
  };

  // ---- Dev-Modus erkennen --------------------------------------------------
  function isDev() {
    try {
      if (/[?&]dev\b/.test(location.search)) { localStorage.setItem("fp_dev", "1"); return true; }
      if (/[?&]nodev\b/.test(location.search)) { localStorage.removeItem("fp_dev"); return false; }
      return localStorage.getItem("fp_dev") === "1";
    } catch (_e) { return false; }
  }

  // Kopf-Status zeigt das andockbare Widget (assets/status-widget.js), getrieben
  // von denselben Fenster-Events. Modul 17 bleibt geladen (Brief §6b) als
  // Plumbing + Siegel-Proxy, seine eigene Pille wird versteckt (keine Doppelung).

  // ---- Init-Kette ----------------------------------------------------------
  (async function () {
    try {
      if (!window.SbkimStorage) { console.warn("[FP-SBKIM] Module nicht geladen — Andock übersprungen."); return; }
      await SbkimStorage.init({ dbSuffix: FP.dbSuffix });

      if (window.SbkimWidget) {
        await SbkimWidget.init({ allowedOrigins: FP.allowedOrigins, repoUrl: FP.repoUrl });
        // Modul-17-Pille verstecken: die sichtbare Anzeige übernimmt das
        // andockbare Status-Widget (Klaus 2026-06-27, keine Doppelung).
        try { if (SbkimWidget.hide) SbkimWidget.hide(); } catch (_e) {}
      }
      if (window.SbkimMembrane) {
        await SbkimMembrane.init({ allowedOrigins: FP.allowedOrigins });
      }
      if (window.SbkimSiegel) {
        SbkimSiegel.init({ badgeSelector: "#sbkim-siegel-badge", repoUrl: FP.repoUrl });
      }
      if (window.SbkimAnastomose) {
        await SbkimAnastomose.init();
      }
      console.info("[FP-SBKIM] Andock bereit (Storage/Widget/Membran/Siegel/Anastomose). " +
        "Spore erzeugen: __fpErzeugeSpore() in der DevTools-Konsole.");
    } catch (e) {
      console.error("[FP-SBKIM] Init-Fehler:", e);
    }
  })();

  // ---- Spore-Erzeugung (Identität) — Klaus' Browser-Lauf -------------------
  // Erzeugt einmalig die Family-Projekt-Identität (Ed25519 via Modul 02) +
  // Domain-Vektor (Modul 03, ~30 MB Modell einmalig). Ergebnis als JSON
  // herunterladen und nach sbkim/spore.json committen.
  window.__fpErzeugeSpore = async function () {
    if (!window.SbkimEmbedding || !window.SbkimSpore) {
      console.error("[FP-SBKIM] Module 02/03 nicht geladen."); return;
    }
    console.info("[FP-SBKIM] Lade Embedding-Modell (~30 MB einmalig, dann gecacht) …");
    await SbkimEmbedding.init();
    var domainKeywords = ["Werkzeuge", "Apps", "Netzwerk", "Marktplatz", "Mycel",
      "semantische Suche", "Familie", "PWA", "offline", "Datenschutz"];
    var description =
      "Family Projekt bündelt brauchbare Werkzeuge und Apps an einem Ort: ein freies, " +
      "neutrales Netzwerk (Mycel-Knoten), Klaus' eigene Werkzeuge mit eigenen Seiten und " +
      "einen Marktplatz, auf dem andere ihre Apps eintragen. Semantische Suche nach Bedeutung, " +
      "mehrsprachig, datenschutzfreundlich und offline-fähig.";
    var vec = await SbkimEmbedding.embedPassage(description);
    var spore = await SbkimSpore.generateOwnSpore({
      domain: "family-projekt.de",
      endpoint: "https://family-projekt.de/",
      nodeType: "hybrid",
      nodeName: "Family Projekt",
      domainDescription: description,
      domainKeywords: domainKeywords,
      domainVector: Array.from(vec)
    });
    console.info("[FP-SBKIM] Spore erzeugt, nodeId =", spore.id, "| Signatur-Länge =", spore.signature.length);
    console.info("[FP-SBKIM] JSON kopieren: copy(JSON.stringify(await SbkimSpore.getOwnSpore(), null, 2)) -> nach sbkim/spore.json committen.");
    return spore;
  };

  // ---- Dev-Briefkasten + Verbindungs-Test ----------------------------------
  // Liest die SIGNAL.json der Gegenstellen (raw/main) und meldet Erreichbarkeit
  // + seq/headline. EHRLICH: das beweist Lese-Erreichbarkeit (Andock-Lese-Pfad),
  // NICHT den vollautomatischen Rück-Handshake übers Relay (der ist „in
  // Vorbereitung", Brief §4/§6b). Nur sichtbar im Dev-Modus.
  async function verbindungsTest(outEl) {
    function line(s) { if (outEl) outEl.textContent += s + "\n"; console.info("[FP-Test]", s); }
    if (outEl) outEl.textContent = "";
    line("Verbindungs-Test (Lese-Erreichbarkeit der Gegenstellen) …");
    // Eigene Spore-Status
    try {
      if (window.SbkimSpore && SbkimSpore.getOwnSpore) {
        var own = await SbkimSpore.getOwnSpore().catch(function () { return null; });
        line(own && own.id ? ("Eigene Spore: nodeId " + own.id) : "Eigene Spore: noch keine — __fpErzeugeSpore() ausführen.");
      }
    } catch (_e) { line("Eigene Spore: nicht lesbar."); }
    var names = Object.keys(FP.peers);
    for (var i = 0; i < names.length; i++) {
      var name = names[i], url = FP.peers[name];
      try {
        var res = await fetch(url, { cache: "no-store" });
        if (!res.ok) { line("✗ " + name + " — HTTP " + res.status); continue; }
        var sig = await res.json();
        line("✓ " + name + " erreichbar — seq " + sig.seq + " · nodeId " + (sig.nodeId || "?"));
        if (sig.headline) line("   » " + String(sig.headline).slice(0, 120) + (sig.headline.length > 120 ? "…" : ""));
      } catch (err) {
        line("✗ " + name + " — nicht erreichbar (" + (err && err.message ? err.message : err) + ")");
      }
    }
    line("Fertig. Auto-Handshake übers Relay: in Vorbereitung (eigene Folge-Sitzung).");
  }

  function mountDevMailbox() {
    if (!isDev() || document.getElementById("fp-dev-mailbox")) return;
    var btn = document.createElement("button");
    btn.id = "fp-dev-mailbox-btn";
    btn.type = "button";
    btn.textContent = "🛠 Dev-Briefkasten";
    btn.title = "Nur im Entwicklungs-Modus sichtbar (Brief §6b). Vor Launch aus.";
    btn.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:90;font:600 .8rem var(--mono,monospace);" +
      "padding:8px 12px;border-radius:10px;border:1px solid var(--gold,#e6b450);background:rgba(0,0,0,.55);" +
      "color:var(--gold,#e6b450);cursor:pointer;backdrop-filter:blur(6px)";
    var panel = document.createElement("div");
    panel.id = "fp-dev-mailbox";
    panel.style.cssText = "position:fixed;left:14px;bottom:58px;z-index:90;width:min(420px,92vw);display:none;" +
      "background:rgba(10,12,20,.92);border:1px solid var(--gold,#e6b450);border-radius:12px;padding:14px;" +
      "color:#eef2f8;font:.82rem/1.5 var(--sans,system-ui);backdrop-filter:blur(10px);box-shadow:0 12px 34px rgba(0,0,0,.5)";
    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">' +
      '<strong style="color:var(--gold,#e6b450)">Dev-Briefkasten · Verbindungs-Test</strong>' +
      '<button id="fp-dev-close" style="background:none;border:none;color:#9aa7b6;font-size:1.1rem;cursor:pointer">✕</button></div>' +
      '<p style="margin:0 0 10px;color:#9aa7b6">Versteckt auf der öffentlichen Seite. Testet die Lese-Erreichbarkeit der Gegenstellen (Sage, SB-KIMTool-Point). Der vollautomatische Rück-Handshake übers Relay ist <strong>in Vorbereitung</strong>.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
      '<button id="fp-dev-test" style="padding:7px 12px;border-radius:8px;border:1px solid var(--accent,#6ee7d3);background:rgba(110,231,211,.12);color:#eef2f8;cursor:pointer;font:inherit">Verbindung testen</button>' +
      '<button id="fp-dev-spore" style="padding:7px 12px;border-radius:8px;border:1px solid var(--line,#2a3340);background:transparent;color:#eef2f8;cursor:pointer;font:inherit">Eigene Spore erzeugen</button></div>' +
      '<pre id="fp-dev-out" style="margin:0;white-space:pre-wrap;word-break:break-word;font:.74rem/1.5 var(--mono,monospace);color:#cfe0ff;max-height:46vh;overflow:auto"></pre>';
    document.body.appendChild(btn);
    document.body.appendChild(panel);
    var out = panel.querySelector("#fp-dev-out");
    btn.addEventListener("click", function () { panel.style.display = panel.style.display === "none" ? "block" : "none"; });
    panel.querySelector("#fp-dev-close").addEventListener("click", function () { panel.style.display = "none"; });
    panel.querySelector("#fp-dev-test").addEventListener("click", function () { verbindungsTest(out); });
    panel.querySelector("#fp-dev-spore").addEventListener("click", function () {
      out.textContent = "Erzeuge Identität (Modell ~30 MB einmalig) … siehe DevTools-Konsole für Details.\n";
      window.__fpErzeugeSpore().then(function (sp) {
        out.textContent += "✔ Spore erzeugt — nodeId " + sp.id + "\nKopiere mit: copy(JSON.stringify(await SbkimSpore.getOwnSpore(),null,2))\nund committe nach sbkim/spore.json.";
      }).catch(function (e) { out.textContent += "Fehler: " + (e && e.message ? e.message : e); });
    });
  }
  if (document.readyState !== "loading") mountDevMailbox();
  else document.addEventListener("DOMContentLoaded", mountDevMailbox);

  window.__fpVerbindungsTest = verbindungsTest;
})();
