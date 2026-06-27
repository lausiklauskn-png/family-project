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
        SbkimSiegel.init({ badgeSelector: "#sbkim-siegel-badge", repoUrl: FP.repoUrl, ribbonText: "FAMILY PROJEKT" });
      }
      // Modul 07 Apoptose: Pflicht-Modul fürs Siegel (01/02/03/04/05/07/15) und
      // stellt die aktive Knoten-Identität sicher. init() ist fail-soft gekapselt
      // (legt Ed25519-Identität lokal in IndexedDB an — nichts verlässt das Gerät).
      if (window.SbkimApoptose) {
        try { await SbkimApoptose.init(); } catch (e) { console.warn("[FP-SBKIM] Apoptose-Init übersprungen:", e); }
      }
      if (window.SbkimAnastomose) {
        await SbkimAnastomose.init();
      }
      // Modul 20 Schlüssel-Safe: fail-soft, KEIN Auto-Prompt (Safe öffnet nur auf
      // Abruf über das Andock-Tool). Sichert die Identität lokal verschlüsselt.
      if (window.SbkimSafe) {
        try { await SbkimSafe.init({ autoPrompt: false }); } catch (e) { console.warn("[FP-SBKIM] Safe-Init übersprungen:", e); }
      }
      // Auto-Lauschen am Relais beim Öffnen (Klaus 2026-06-27): der Knoten ist
      // Empfangsmodus MIT Antwortrecht — er lauscht selbsttätig auf eingehende
      // Handshakes und ANTWORTET nur; er initiiert NIE von sich aus (kein Crawler,
      // keine Pulsation, keine Eigenanfrage ins offene Netz). Das offene Ohr ist
      // der Empfangskanal; die Schutz-Module (10 Reputation / 11 Rate-Limit /
      // 12 Blocklist / 15 Membran) sind sein Wächter, sobald sie aus der Schablone
      // ins echte Leben gehoben sind. Nicht-blockierend + fail-soft: ohne
      // Relais-Client (Modul 05b) oder bei Netz-Fehler passiert schlicht nichts.
      if (window.SbkimAnastomose && typeof SbkimAnastomose.listenNostr === "function" && window.SbkimNostrRelay) {
        try {
          SbkimAnastomose.listenNostr()
            .then(function () {
              console.info("[FP-SBKIM] Auto-Lauschen aktiv (Empfangsmodus mit Antwortrecht).");
              // Sichtbar im Floating-Widget (Modul 17): VERKEHR-Lampe ruhig grün.
              try { window.dispatchEvent(new CustomEvent("sbkim:nostr-listening", { detail: { active: true } })); } catch (e) {}
            })
            .catch(function (e) { console.warn("[FP-SBKIM] Auto-Lauschen übersprungen:", e); });
        } catch (e) { console.warn("[FP-SBKIM] Auto-Lauschen übersprungen:", e); }
      }
      console.info("[FP-SBKIM] Andock bereit (Storage/Widget/Membran/Siegel/Apoptose/Anastomose/Safe). " +
        "Knoten lauscht selbsttätig am Relais (Empfangsmodus). " +
        "Andock-Tool im Dev-Modus (?dev): Spore erzeugen / sichern / verbinden.");
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

  // Repo, in das die eigene Spore committet wird (sporeUrl zeigt auf main).
  var FP_REPO = "https://github.com/lausiklauskn-png/family-project";

  // Geführter, KONSOLEN-FREIER Spore-Pfad (Klaus' Wunsch 2026-06-27): nach dem
  // Erzeugen zeigt das Panel die JSON + Kopier-Knopf + einen GitHub-Link, der die
  // Datei-anlegen-Seite für sbkim/spore.json mit vorbelegtem Pfad öffnet, plus
  // einen Download als Alternative. Kein DevTools-Befehl mehr nötig.
  function renderSporeGuide(out, spore) {
    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;";
      });
    }
    var json = JSON.stringify(spore, null, 2);
    var newFileUrl = FP_REPO + "/new/main?filename=" + encodeURIComponent("sbkim/spore.json");
    var bs = "padding:6px 11px;border-radius:8px;border:1px solid var(--accent,#6ee7d3);" +
      "background:rgba(110,231,211,.12);color:#eef2f8;cursor:pointer;font:inherit;text-decoration:none;display:inline-block";
    out.innerHTML =
      '<div style="color:#9ff7df;margin-bottom:6px">✔ Spore erzeugt — nodeId <b>' + esc(spore.id || "?") + '</b></div>' +
      '<div style="color:#cfe0ff;margin-bottom:8px">So bringst du sie ins Repo — <b>ohne Terminal, ohne Konsole</b>:</div>' +
      '<div style="color:#9ff7df;margin-bottom:4px"><b>Die Spore muss in dein Repo</b> — als Datei <code>sbkim/spore.json</code>. Zwei Wege:</div>' +
      '<div style="color:#cfe0ff;margin-bottom:6px"><b>Weg A — selbst über GitHub:</b></div>' +
      '<ol style="margin:0 0 8px;padding-left:20px;color:#cfe0ff">' +
        '<li>Unten <b>📋 JSON kopieren</b> antippen.</li>' +
        '<li><b>→ Datei im Repo anlegen</b> antippen — GitHub öffnet die Seite für <code>sbkim/spore.json</code> (Pfad ist schon ausgefüllt).</li>' +
        '<li>Ins große Textfeld tippen → <b>einfügen</b> (lange drücken → Einfügen, oder Strg+V) → unten <b>Commit changes</b>.</li>' +
      '</ol>' +
      '<div style="color:#cfe0ff;margin-bottom:10px"><b>Weg B — mit KI-Sitzung (wie hier):</b> <b>📋 JSON kopieren</b> und die Spore einfach <b>in den Chat deiner KI-Sitzung einfügen</b> — sie legt <code>sbkim/spore.json</code> für dich an. (Die Spore ist öffentlich, sie darf in den Chat — kein privater Schlüssel dabei.)</div>' +
      '<textarea id="fp-spore-json" readonly rows="7" style="width:100%;box-sizing:border-box;resize:vertical;' +
        'background:rgba(0,0,0,.4);color:#cfe0ff;border:1px solid var(--line,#2a3340);border-radius:8px;padding:8px;' +
        'font:.72rem/1.45 var(--mono,monospace)">' + esc(json) + '</textarea>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
        '<button id="fp-spore-copy" style="' + bs + '">📋 JSON kopieren</button>' +
        '<a id="fp-spore-newfile" href="' + newFileUrl + '" target="_blank" rel="noopener noreferrer" style="' + bs + '">→ Datei im Repo anlegen</a>' +
        '<button id="fp-spore-dl" style="' + bs + ';border-color:var(--line,#2a3340);background:transparent">⬇ Als Datei herunterladen</button>' +
      '</div>' +
      '<div style="color:#9aa7b6;margin-top:8px;font-size:.72rem">Es wird nur der <b>öffentliche</b> Teil committet — dein privater Schlüssel bleibt in diesem Browser.</div>';
    var ta = out.querySelector("#fp-spore-json");
    var copyBtn = out.querySelector("#fp-spore-copy");
    copyBtn.addEventListener("click", function () {
      function done() { copyBtn.textContent = "✓ kopiert"; setTimeout(function () { copyBtn.textContent = "📋 JSON kopieren"; }, 1800); }
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(done, function () { ta.focus(); ta.select(); });
      } else { ta.focus(); ta.select(); try { document.execCommand("copy"); done(); } catch (e) {} }
    });
    out.querySelector("#fp-spore-dl").addEventListener("click", function () {
      var blob = new Blob([json], { type: "application/json" });
      var u = URL.createObjectURL(blob);
      var a = document.createElement("a"); a.href = u; a.download = "spore.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 0);
    });
  }

  // Spore-Erzeugung mit Fortschritt + Wiederholen (Klaus' Befund 2026-06-27:
  // der HuggingFace-Modell-Download ~30 MB kann beim ersten Lauf mit „network
  // error" scheitern, während der GitHub-Lese-Pfad einwandfrei läuft). Zeigt den
  // Download-Fortschritt (Event aus Modul 03), bei Fehler einen klaren Hinweis +
  // „Erneut versuchen". Modul 03 bleibt unangetastet (1:1 aus Sage); die
  // Wiederhol-Logik nutzt, dass init() seinen pipePromise bei Fehler zurücksetzt.
  function startSporeGeneration(out) {
    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;";
      });
    }
    out.textContent = "Erzeuge Identität … lade Modell (~30 MB beim ersten Mal, danach offline gecacht). Bleib online.\n";
    var onProg = function (e) {
      var d = (e && e.detail) || {};
      if (d.status === "progress" && d.file) {
        var pct = (d.progress != null) ? Math.round(d.progress) : null;
        out.textContent = "Lade Modell: " + d.file + (pct != null ? " … " + pct + "%" : " …") +
          "\n(Einmalig ~30 MB von HuggingFace. Bleib online — danach läuft es offline.)";
      }
    };
    window.addEventListener("sbkim:embedding-progress", onProg);
    function cleanup() { window.removeEventListener("sbkim:embedding-progress", onProg); }
    window.__fpErzeugeSpore().then(function (sp) {
      return (window.SbkimSpore && SbkimSpore.getOwnSpore ? SbkimSpore.getOwnSpore() : Promise.resolve(sp))
        .then(function (full) { cleanup(); renderSporeGuide(out, full || sp); });
    }).catch(function (e) {
      cleanup();
      var msg = (e && e.message) ? e.message : String(e);
      var netz = /network|laden|nicht geladen|load|fetch|abort/i.test(msg);
      var bs = "padding:6px 11px;border-radius:8px;border:1px solid var(--accent,#6ee7d3);" +
        "background:rgba(110,231,211,.12);color:#eef2f8;cursor:pointer;font:inherit";
      out.innerHTML =
        '<div style="color:#ffb4a8;margin-bottom:6px">Fehler: ' + esc(msg) + '</div>' +
        (netz
          ? '<div style="color:#cfe0ff;margin-bottom:10px">Das Modell (~30 MB) wird beim <b>ersten Mal</b> von HuggingFace geladen — dafür braucht es eine <b>stabile Internet-Verbindung</b>. Der GitHub-Lese-Pfad funktioniert (siehe „Verbindung testen"); nur dieser Download ist gescheitert. Bitte WLAN prüfen und erneut versuchen — danach ist das Modell offline gecacht.</div>'
          : '') +
        '<button id="fp-spore-retry" style="' + bs + '">↻ Erneut versuchen</button>';
      var rb = out.querySelector("#fp-spore-retry");
      if (rb) rb.addEventListener("click", function () { startSporeGeneration(out); });
    });
  }

  // Relais-Selbsttest: publish→subscribe Round-Trip über den echten 05b-Client
  // gegen wss://relay.family-projekt.de (Stufe 2, live). Beweist im Browser, dass
  // der Knoten das Relais spricht. Geht NICHT aus einer Sandbox (wss gesperrt).
  function relaisSelbsttest(out) {
    var R = window.SbkimNostrRelay;
    if (!R || typeof R.publish !== "function" || typeof R.subscribe !== "function") {
      out.textContent = "Modul 05b (SbkimNostrRelay) nicht geladen (type=module?)."; return;
    }
    var tag = "sbkim-selftest-" + Math.random().toString(36).slice(2, 10);
    out.textContent = "→ Verbinde mit wss://relay.family-projekt.de, publiziere Test-Event (tag " + tag + "), warte auf Echo (max 10 s) …\n";
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    (async function () {
      var got = false, gotId = null, unsub = null;
      try {
        unsub = R.subscribe({ kinds: [1], "#t": [tag] }, function (ev) { got = true; gotId = ev && ev.id; });
        await R.publish({ kind: 1, created_at: Math.floor(Date.now() / 1000), tags: [["t", tag]], content: "sbkim relay selftest" });
      } catch (e) {
        if (unsub) { try { unsub(); } catch (_e) {} }
        out.textContent += "✗ Relais-Fehler: " + (e && e.message ? e.message : e); return;
      }
      for (var i = 0; i < 50 && !got; i++) { await sleep(200); }
      if (unsub) { try { unsub(); } catch (_e) {} }
      out.textContent += got
        ? "✓ Echo vom Live-Relais empfangen (event " + gotId + "). Relais-Transport live bestätigt — dieser Knoten spricht relay.family-projekt.de."
        : "✗ Kein Echo in 10 s. Internet/Relais prüfen (nur echter Browser, nicht aus einer Sandbox).";
    })();
  }

  function mountDevMailbox() {
    if (!isDev() || document.getElementById("fp-dev-mailbox")) return;
    var btn = document.createElement("button");
    btn.id = "fp-dev-mailbox-btn";
    btn.type = "button";
    btn.textContent = "🔌 Andock-Tool";
    btn.title = "Werkzeug des Knoten-Betreibers. Nur im Entwicklungs-Modus sichtbar (Brief §6b). Vor Launch aus.";
    btn.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:90;font:600 .8rem var(--mono,monospace);" +
      "padding:8px 12px;border-radius:10px;border:1px solid var(--gold,#e6b450);background:rgba(0,0,0,.55);" +
      "color:var(--gold,#e6b450);cursor:pointer;backdrop-filter:blur(6px)";
    var panel = document.createElement("div");
    panel.id = "fp-dev-mailbox";
    panel.style.cssText = "position:fixed;left:14px;bottom:58px;z-index:90;width:min(420px,92vw);display:none;" +
      "background:rgba(10,12,20,.92);border:1px solid var(--gold,#e6b450);border-radius:12px;padding:14px;" +
      "color:#eef2f8;font:.82rem/1.5 var(--sans,system-ui);backdrop-filter:blur(10px);box-shadow:0 12px 34px rgba(0,0,0,.5)";
    var bs = "padding:7px 12px;border-radius:8px;border:1px solid var(--accent,#6ee7d3);" +
      "background:rgba(110,231,211,.12);color:#eef2f8;cursor:pointer;font:inherit;text-decoration:none;display:inline-block";
    var bsGhost = "padding:7px 12px;border-radius:8px;border:1px solid var(--line,#2a3340);" +
      "background:transparent;color:#eef2f8;cursor:pointer;font:inherit;text-decoration:none;display:inline-block";
    var stepStyle = "margin:12px 0 4px;color:var(--gold,#e6b450);font-weight:600;font-size:.78rem";
    var rowStyle = "display:flex;gap:8px;flex-wrap:wrap";
    panel.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px">' +
      '<strong style="color:var(--gold,#e6b450)">🔌 Andock-Tool</strong>' +
      '<button id="fp-dev-close" style="background:none;border:none;color:#9aa7b6;font-size:1.1rem;cursor:pointer">✕</button></div>' +
      '<p style="margin:0;color:#9aa7b6">Werkzeug des Knoten-Betreibers (öffentlich versteckt). Vier Schritte, um diesen Knoten ans Mycel zu bringen — klick-geführt, ohne Konsole.</p>' +
      '<div style="' + stepStyle + '">① Identität erzeugen</div>' +
      '<div style="' + rowStyle + '"><button id="fp-dev-spore" style="' + bs + '">Eigene Spore erzeugen</button></div>' +
      '<div style="' + stepStyle + '">② Ins Repo bringen / an deine KI geben</div>' +
      '<div style="' + rowStyle + '">' +
      '<a href="docs/MYCEL-ANDOCK-AUFTRAG.md" target="_blank" rel="noopener" style="' + bsGhost + '">↗ KI-Anleitung</a>' +
      '<a href="netzwerk.html#andock" style="' + bsGhost + '">↗ Andock-Wizard</a></div>' +
      '<div style="' + stepStyle + '">③ Identität sichern (Safe)</div>' +
      '<div style="' + rowStyle + '"><button id="fp-dev-safe" style="' + bs + '">🔐 Identität im Safe sichern</button></div>' +
      '<div style="' + stepStyle + '">④ Verbinden (Relais)</div>' +
      '<div style="' + rowStyle + '">' +
      '<button id="fp-dev-test" style="' + bsGhost + '">Verbindung testen</button>' +
      '<button id="fp-dev-relayselftest" style="' + bs + '">🛰 Relais-Selbsttest</button>' +
      '<button id="fp-dev-listen" style="' + bsGhost + '">👂 Empfänger lauschen</button></div>' +
      '<p style="margin:8px 0 0;color:#9aa7b6;font-size:.74rem">Relais-Transport (Modul 05 Nostr / <code>relay.family-projekt.de</code>) ist <b>live</b>. Der volle Cross-Knoten-Handshake (zwei laufende Knoten) ist die Generalprobe.</p>' +
      '<pre id="fp-dev-out" style="margin:10px 0 0;white-space:pre-wrap;word-break:break-word;font:.74rem/1.5 var(--mono,monospace);color:#cfe0ff;max-height:42vh;overflow:auto"></pre>';
    document.body.appendChild(btn);
    document.body.appendChild(panel);
    var out = panel.querySelector("#fp-dev-out");
    btn.addEventListener("click", function () { panel.style.display = panel.style.display === "none" ? "block" : "none"; });
    panel.querySelector("#fp-dev-close").addEventListener("click", function () { panel.style.display = "none"; });
    panel.querySelector("#fp-dev-test").addEventListener("click", function () { verbindungsTest(out); });
    panel.querySelector("#fp-dev-relayselftest").addEventListener("click", function () { relaisSelbsttest(out); });
    panel.querySelector("#fp-dev-listen").addEventListener("click", function () {
      if (!window.SbkimAnastomose || typeof SbkimAnastomose.listenNostr !== "function") { out.textContent = "Modul 05 listenNostr nicht verfügbar."; return; }
      if (!window.SbkimNostrRelay) { out.textContent = "Modul 05b (Relais-Client) nicht geladen (type=module?)."; return; }
      out.textContent = "Empfänger lauscht am Relais (relay.family-projekt.de) auf eingehende Handshakes …\n";
      SbkimAnastomose.listenNostr().then(function () {
        out.textContent += "✔ Lauscht. Dieser Knoten ist jetzt über das Relais erreichbar (Empfangsmodus mit Antwortrecht).";
      }).catch(function (e) { out.textContent += "Fehler: " + (e && e.message ? e.message : e); });
    });
    panel.querySelector("#fp-dev-spore").addEventListener("click", function () { startSporeGeneration(out); });
    panel.querySelector("#fp-dev-safe").addEventListener("click", function () {
      if (window.SbkimSafe && typeof SbkimSafe.open === "function") {
        out.textContent = "Safe wird geöffnet … (Passwort setzen oder entsperren im Fenster)\n";
        SbkimSafe.open().then(function () {
          return SbkimSafe.hasVault ? SbkimSafe.hasVault() : false;
        }).then(function (has) {
          out.textContent = has
            ? "✔ Safe bereit. Deine Identität ist lokal verschlüsselt gesichert (Shamir 2/3 — Anteile sicher verwahren)."
            : "Safe-Fenster geschlossen (noch nichts gesichert).";
        }).catch(function (e) { out.textContent = "Safe-Fehler: " + (e && e.message ? e.message : e); });
      } else {
        out.textContent = "Safe (Modul 20) nicht geladen.";
      }
    });
  }
  if (document.readyState !== "loading") mountDevMailbox();
  else document.addEventListener("DOMContentLoaded", mountDevMailbox);

  window.__fpVerbindungsTest = verbindungsTest;
})();
