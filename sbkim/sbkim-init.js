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

  // Echte Andock-Geste (Klaus' Wunsch 2026-06-28): EIN Knopf, der einen echten
  // ausgehenden Handshake über das Live-Relais an einen gewählten Knoten sendet —
  // konsolen-frei. Das ist der „Verbindung herstellen"-Schritt, der bisher als
  // „in Vorbereitung" markiert war; hier wird er klick-auslösbar und EHRLICH
  // berichtet (established / rejected / rejected-local / timeout). Modul 05
  // bleibt unangetastet (1:1 aus Sage) — reines Tool-Code, das handshake() ruft.
  //
  // Bedeutungs-Schwelle (Modul 04, PROVIDER_MIN_MATCH = 0.80): liegt die
  // semantische Ähnlichkeit beider Domänen darunter, antwortet handshake() lokal
  // mit „rejected-local" und sendet bewusst NICHTS ans Relais. Das ist Absicht
  // (kein Crawler, keine sinnlose Last), kein Fehler — und wird klar gemeldet.
  var FP_PEERS_NICE = {
    "Mein-Rezeptbuch": "Mein Rezeptbuch",
    "Sage-Protokol": "Sage-Protokoll",
    "SB-KIMTool-Point": "SB-KIMTool-Point",
    "BookLedgerPro": "BookLedgerPro",
    "Mein-Mixarium": "Mein Mixarium",
    "Mein-Tresor": "Mein Tresor",
    "Jasons-Tresor": "Jasons Tresor"
  };
  function targetSporeUrl(repo) {
    return "https://raw.githubusercontent.com/lausiklauskn-png/" + repo + "/main/sbkim/spore.json";
  }
  async function sendHandshake(out, repo, label) {
    function line(s) { if (out) out.textContent += s + "\n"; console.info("[FP-Handshake]", s); }
    if (out) out.textContent = "";
    if (!window.SbkimAnastomose || typeof SbkimAnastomose.handshake !== "function") {
      line("Modul 05 (Anastomose) nicht geladen."); return;
    }
    if (!window.SbkimNostrRelay) {
      line("Modul 05b (Relais-Client) nicht geladen (type=module?)."); return;
    }
    var own = (window.SbkimSpore && SbkimSpore.getOwnSpore)
      ? await SbkimSpore.getOwnSpore().catch(function () { return null; }) : null;
    if (!own || !own.id) { line("Noch keine eigene Spore — zuerst Schritt ① „Eigene Spore erzeugen“."); return; }
    line("Eigene Spore: " + own.id);
    line("→ Lade Ziel-Spore von " + label + " (GitHub raw/main) …");
    var target;
    try {
      var res = await fetch(targetSporeUrl(repo), { cache: "no-store" });
      if (!res.ok) { line("✗ Ziel-Spore nicht erreichbar — HTTP " + res.status + " (hat " + label + " sbkim/spore.json auf main?)"); return; }
      target = await res.json();
    } catch (e) { line("✗ Ziel-Spore nicht ladbar: " + (e && e.message ? e.message : e)); return; }
    if (!target || !target.id) { line("✗ Ziel-Spore ohne nodeId."); return; }
    line("Ziel: " + label + " · nodeId " + target.id);
    line("→ Sende Handshake über wss://relay.family-projekt.de (Antwort max ~12 s) …");
    line("   Hinweis: " + label + " muss in einem ANDEREN Tab geöffnet sein und lauschen (VERKEHR-Lampe grün).");
    try {
      var r = await SbkimAnastomose.handshake(target, null, { transport: "nostr", timeoutMs: 12000 });
      var oc = r && r.outcome;
      if (oc === "established") {
        line("✓ ANDOCK ETABLIERT mit " + label + " (established" + (r.score != null ? ", score " + Number(r.score).toFixed(3) : "") + ").");
        line("   " + label + " hat geantwortet — dort füllt sich jetzt die VERKEHR-Liste. Cross-Knoten-Handshake live bewiesen.");
      } else if (oc === "rejected-local") {
        line("• Lokal abgelehnt (rejected-local) — Bedeutungs-Ähnlichkeit " + (r.score != null ? Number(r.score).toFixed(4) : "?") + " < 0.80.");
        line("   Kein Fehler: die semantische Schwelle hält zu verschiedene Domänen auseinander. Es wurde NICHTS ans Relais gesendet.");
        line("   Tipp: für die Live-Demo einen Knoten mit ähnlicher Domäne wählen (Rezeptbuch / Sage / SB-KIMTool / BookLedgerPro liegen über 0.80; Mixarium bei 0.78).");
      } else if (oc === "rejected") {
        line("• Vom Gegenknoten abgelehnt (rejected): " + (r.reason || "(kein Grund genannt)"));
      } else {
        line("• Ergebnis: " + JSON.stringify(r).slice(0, 300));
      }
    } catch (e) {
      var nm = e && e.name ? e.name : "";
      if (nm === "HandshakeTimeoutError") {
        line("✗ Keine Antwort in 12 s (timeout). Ist " + label + " in einem anderen Tab offen und lauscht? (VERKEHR-Lampe grün)");
      } else {
        line("✗ Handshake-Fehler" + (nm ? " (" + nm + ")" : "") + ": " + (e && e.message ? e.message : e));
      }
    }
  }

  // ---- ⑥ Gemeinsamer Raum (Rendezvous) — Klaus' Entwurf 2026-06-28 ----------
  // Lösung der Adress-Wand: committete ID ≠ lebende ID. Statt an eine aus GitHub
  // gelesene (committete) ID zu adressieren, treffen sich lebende Knoten in einem
  // GETEILTEN Etikett (Tag) auf demselben Relais — wie Pinnwands „gemeinsamer
  // Raum". Ein aktiver Knoten heftet auf bewusste Nutzer-Aktion seine LEBENDE
  // Visitenkarte (echte Spore inkl. lebender nodeId) ans Brett; ein Suchender
  // liest die Karten und handshaket die LEBENDE ID — die der Knoten ja gerade
  // wirklich belauscht (listenNostr). Verfassungstreu: KEIN Dauer-Piepser
  // (Pulsation verboten), beide Schritte sind nutzer-ausgelöste Pilz-Aktionen.
  // Bewusst NUR Tool-Code über die öffentliche 05b-Publish/Subscribe-Fläche —
  // die geteilten Kern-Module 05/05b bleiben unangetastet (kein Netz-Bruch).
  var RDV_TAG = "sbkim-rdv";          // das geteilte Etikett = der gemeinsame Raum
  var RDV_PRESENCE_KIND = "sbkim-presence";
  var RDV_FRESH_SEC = 1800;           // Karten der letzten 30 min berücksichtigen
  var RDV_LISTEN_MS = 4000;           // Sammelfenster beim Lesen des Raums

  async function getOwnLiveSpore() {
    if (window.SbkimSpore && SbkimSpore.getOwnSpore) {
      return await SbkimSpore.getOwnSpore().catch(function () { return null; });
    }
    return null;
  }

  // Kern: lauschen + lebende Visitenkarte ans Brett heften (+ Lampe ehrlich
  // setzen). Von 📌 „Nur anmelden" und 🌐 „Mit dem Netz verbinden" geteilt.
  function doAnnounce(out, own) {
    function line(s) { if (out) out.textContent += s + "\n"; }
    return Promise.resolve()
      .then(function () {
        if (window.SbkimAnastomose && typeof SbkimAnastomose.listenNostr === "function") {
          return SbkimAnastomose.listenNostr().catch(function () {});
        }
      })
      .then(function () {
        var card = { kind: RDV_PRESENCE_KIND, nodeId: own.id, nodeName: "Family Projekt", spore: own, ts: Math.floor(Date.now() / 1000) };
        return SbkimNostrRelay.publish({
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["t", RDV_TAG]],
          content: JSON.stringify(card)
        });
      })
      .then(function () {
        // Lampe ehrlich: VERKEHR bleibt an, solange wir lauschen.
        try { window.dispatchEvent(new CustomEvent("sbkim:nostr-listening", { detail: { active: true } })); } catch (e) {}
        line("✓ Du bist im Raum — lebende Visitenkarte hängt, du lauschst (VERKEHR an).");
        line("  Lebende nodeId: " + own.id);
        line("  Lass diesen Tab offen — eine geschlossene Seite ist nicht erreichbar.");
      });
  }

  // 📌 Nur (neu) anmelden — setzt eine vorhandene Identität voraus.
  async function announcePresence(out) {
    function line(s) { if (out) out.textContent += s + "\n"; }
    if (out) out.textContent = "";
    if (!window.SbkimNostrRelay || typeof SbkimNostrRelay.publish !== "function") {
      line("Modul 05b (Relais-Client) nicht geladen (type=module?)."); return;
    }
    var own = await getOwnLiveSpore();
    if (!own || !own.id) { line("Noch keine Identität — nutze „🌐 Mit dem Netz verbinden“ (erzeugt sie + meldet an)."); return; }
    line("→ Hefte lebende Visitenkarte ins Relais (Raum „" + RDV_TAG + "“) …");
    doAnnounce(out, own).catch(function (e) { line("✗ Anmelden fehlgeschlagen: " + (e && e.message ? e.message : e)); });
  }

  // 🌐 Mit dem Netz verbinden (Klaus' Wunsch 2026-06-28): EIN Klick = Identität
  // erzeugen (falls noch keine da) + im Raum anmelden + lauschen. So entfällt der
  // „erst ① , dann 📌“-Zwischenschritt. Bleibt nutzer-ausgelöst (kein Dauer-
  // Piepser → Empfangsmodus gewahrt); das ist die saubere „Knoten erzeugen und
  // beitreten“-Geste, mit der auch ein Nicht-Programmierer ans Netz kommt.
  function connectToNet(out) {
    function line(s) { if (out) out.textContent += s + "\n"; }
    if (out) out.textContent = "";
    if (!window.SbkimNostrRelay || typeof SbkimNostrRelay.publish !== "function") {
      line("Modul 05b (Relais-Client) nicht geladen (type=module?)."); return;
    }
    getOwnLiveSpore().then(function (own) {
      if (own && own.id) {
        line("Identität vorhanden: " + own.id);
        line("→ Melde dich im Raum an …");
        return doAnnounce(out, own).catch(function (e) { line("✗ Anmelden fehlgeschlagen: " + (e && e.message ? e.message : e)); });
      }
      out.textContent = "Erzeuge Identität … lade Modell (~30 MB beim ersten Mal, danach offline). Bleib online.\n";
      var onProg = function (e) {
        var d = (e && e.detail) || {};
        if (d.status === "progress" && d.file) {
          var pct = (d.progress != null) ? Math.round(d.progress) : null;
          out.textContent = "Lade Modell: " + d.file + (pct != null ? " … " + pct + "%" : " …") +
            "\n(Einmalig ~30 MB. Bleib online — danach läuft es offline.)";
        }
      };
      window.addEventListener("sbkim:embedding-progress", onProg);
      return window.__fpErzeugeSpore()
        .then(function () { return getOwnLiveSpore(); })
        .then(function (fresh) {
          window.removeEventListener("sbkim:embedding-progress", onProg);
          out.textContent = "";
          line("✓ Identität erzeugt: " + (fresh && fresh.id));
          line("→ Melde dich im Raum an …");
          return doAnnounce(out, fresh);
        })
        .catch(function (e) {
          window.removeEventListener("sbkim:embedding-progress", onProg);
          var msg = (e && e.message) ? e.message : String(e);
          out.textContent = "✗ Verbinden fehlgeschlagen: " + msg +
            "\n(Bei Netz-/Modell-Fehler: WLAN prüfen und „🌐 Mit dem Netz verbinden“ nochmal.)";
        });
    });
  }

  // 👥 Wer ist im Raum?: lebende Visitenkarten lesen, dann pro Karte ein
  // „🤝 Andocken“ an die LEBENDE ID anbieten.
  function discoverRoom(out) {
    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;";
      });
    }
    if (!window.SbkimNostrRelay || typeof SbkimNostrRelay.subscribe !== "function") {
      out.textContent = "Modul 05b (Relais-Client) nicht geladen (type=module?)."; return;
    }
    out.textContent = "👥 Lese den gemeinsamen Raum (sammle ~" + Math.round(RDV_LISTEN_MS / 1000) + " s Visitenkarten) …\n";
    var sinceSec = Math.floor(Date.now() / 1000) - RDV_FRESH_SEC;
    var cards = {};            // nodeId -> { card, ts }
    var ownId = null;
    getOwnLiveSpore().then(function (own) { ownId = own && own.id; });
    var unsub = null;
    try {
      unsub = SbkimNostrRelay.subscribe({ kinds: [1], "#t": [RDV_TAG], since: sinceSec }, function (ev) {
        if (!ev || typeof ev.content !== "string") return;
        var card; try { card = JSON.parse(ev.content); } catch (e) { return; }
        if (!card || card.kind !== RDV_PRESENCE_KIND || !card.nodeId || !card.spore) return;
        var ts = card.ts || ev.created_at || 0;
        if (!cards[card.nodeId] || ts > cards[card.nodeId].ts) cards[card.nodeId] = { card: card, ts: ts };
      });
    } catch (e) {
      out.textContent += "✗ Raum-Lesen fehlgeschlagen: " + (e && e.message ? e.message : e); return;
    }
    setTimeout(function () {
      if (unsub) { try { unsub(); } catch (e) {} }
      renderRoomCards(out, cards, ownId, esc);
    }, RDV_LISTEN_MS);
  }

  function renderRoomCards(out, cards, ownId, esc) {
    var ids = Object.keys(cards).filter(function (id) { return id !== ownId; });
    if (ids.length === 0) {
      out.textContent = "Niemand (Fremdes) im Raum. Lass den Gegenknoten zuerst „📌 Auffindbar machen“ drücken — dann hier nochmal „👥 Wer ist im Raum?“.";
      return;
    }
    var nowSec = Math.floor(Date.now() / 1000);
    out.innerHTML = '<div style="color:#9ff7df;margin-bottom:6px">👥 ' + ids.length + ' lebende Visitenkarte(n) im Raum:</div>';
    var bs = "padding:5px 10px;border-radius:8px;border:1px solid var(--accent,#6ee7d3);" +
      "background:rgba(110,231,211,.12);color:#eef2f8;cursor:pointer;font:inherit";
    ids.forEach(function (id) {
      var c = cards[id].card;
      var age = nowSec - (cards[id].ts || nowSec);
      var ageTxt = age < 60 ? "gerade eben" : (Math.floor(age / 60) + " min");
      var row = document.createElement("div");
      row.style.cssText = "display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0;padding:6px 8px;" +
        "border:1px solid var(--line,#2a3340);border-radius:8px";
      row.innerHTML = '<span style="flex:1;min-width:150px"><b>' + esc(c.nodeName || "Knoten") + '</b>' +
        '<br><span style="font:.66rem/1.3 var(--mono,monospace);color:#9aa7b6;word-break:break-all">' + esc(id) + '</span>' +
        '<br><span style="font-size:.7rem;color:#9aa7b6">angemeldet ' + ageTxt + '</span></span>';
      var b = document.createElement("button");
      b.type = "button"; b.style.cssText = bs; b.textContent = "🤝 Andocken";
      b.addEventListener("click", function () { handshakeLiveCard(out, c); });
      row.appendChild(b);
      out.appendChild(row);
    });
  }

  function handshakeLiveCard(out, card) {
    function line(s) { out.textContent += "\n" + s; }
    if (!window.SbkimAnastomose || typeof SbkimAnastomose.handshake !== "function") { out.textContent = "Modul 05 nicht geladen."; return; }
    out.textContent = "🤝 Handshake an LEBENDE ID " + card.nodeId + " (über Relais, max ~12 s) …";
    SbkimAnastomose.handshake(card.spore, null, { transport: "nostr", timeoutMs: 12000 }).then(function (r) {
      var oc = r && r.outcome;
      if (oc === "established") {
        line("✓ ANDOCK ETABLIERT mit " + (card.nodeName || "Knoten") + " (lebende ID)!");
        line("   Server-loser Live-Cross-Knoten-Handshake bewiesen — der gemeinsame Raum hat die Adress-Wand gelöst. 🎉");
      } else if (oc === "rejected-local") {
        line("• Lokal abgelehnt — Bedeutungs-Ähnlichkeit " + (r.score != null ? Number(r.score).toFixed(4) : "?") + " < 0.80 (kein Fehler).");
      } else if (oc === "rejected") {
        line("• Vom Gegenknoten abgelehnt: " + (r.reason || "(kein Grund)"));
      } else {
        line("• Ergebnis: " + JSON.stringify(r).slice(0, 200));
      }
    }).catch(function (e) {
      var nm = e && e.name ? e.name : "";
      if (nm === "HandshakeTimeoutError") {
        line("✗ Keine Antwort in 12 s — der Knoten war angemeldet, ist aber offline/nicht mehr wach (Visitenkarte veraltet).");
      } else {
        line("✗ Fehler" + (nm ? " (" + nm + ")" : "") + ": " + (e && e.message ? e.message : e));
      }
    });
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
      "max-height:84vh;overflow-y:auto;-webkit-overflow-scrolling:touch;" +
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
      '<p style="margin:0;color:#9aa7b6">Werkzeug des Knoten-Betreibers (öffentlich versteckt). Sechs Schritte, um diesen Knoten ans Mycel zu bringen — klick-geführt, ohne Konsole.</p>' +
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
      '<div style="' + stepStyle + '">⑤ Andocken — echten Handshake an einen Knoten senden</div>' +
      '<div style="' + rowStyle + ';align-items:center">' +
      '<select id="fp-dev-target" style="padding:7px 10px;border-radius:8px;border:1px solid var(--line,#2a3340);background:rgba(0,0,0,.4);color:#eef2f8;font:inherit">' +
      '<option value="Mein-Rezeptbuch">Mein Rezeptbuch</option>' +
      '<option value="Sage-Protokol">Sage-Protokoll</option>' +
      '<option value="SB-KIMTool-Point">SB-KIMTool-Point</option>' +
      '<option value="BookLedgerPro">BookLedgerPro</option>' +
      '<option value="Mein-Mixarium">Mein Mixarium (≈0.78 – unter Schwelle)</option>' +
      '<option value="Mein-Tresor">Mein Tresor</option>' +
      '<option value="Jasons-Tresor">Jasons Tresor</option>' +
      '</select>' +
      '<button id="fp-dev-handshake" style="' + bs + '">🤝 Andocken (Handshake senden)</button></div>' +
      '<p style="margin:8px 0 0;color:#9aa7b6;font-size:.74rem">Relais-Transport (Modul 05 Nostr / <code>relay.family-projekt.de</code>) ist <b>live</b>. „Andocken“ sendet einen <b>echten</b> Handshake an den gewählten Knoten — der muss in einem anderen Tab offen sein und lauschen. Liegt die Domäne unter der Bedeutungs-Schwelle (0.80), lehnt der Knoten lokal ab und sendet bewusst nichts (kein Fehler).</p>' +
      '<div style="' + stepStyle + '">⑥ Gemeinsamer Raum — lebende Knoten finden (löst die Adress-Wand)</div>' +
      '<div style="' + rowStyle + '">' +
      '<button id="fp-dev-connect" style="' + bs + '">🌐 Mit dem Netz verbinden</button>' +
      '<button id="fp-dev-discover" style="' + bsGhost + '">👥 Wer ist im Raum?</button></div>' +
      '<div style="' + rowStyle + ';margin-top:6px">' +
      '<button id="fp-dev-announce" style="' + bsGhost + '">📌 Nur neu anmelden</button></div>' +
      '<p style="margin:6px 0 0;color:#9aa7b6;font-size:.72rem"><b>🌐 Mit dem Netz verbinden</b> = ein Klick: Identität erzeugen (falls keine da) + im Raum anmelden + lauschen. „Wer ist im Raum?“ liest die <b>lebenden</b> Visitenkarten und handshaket die <b>lebende</b> ID — genau das, was die committete ID nicht konnte. Beides ist nutzer-ausgelöst (kein Dauer-Funken → Empfangsmodus gewahrt). Test: ein Gerät 🌐, das andere 👥.</p>' +
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
    panel.querySelector("#fp-dev-handshake").addEventListener("click", function () {
      var sel = panel.querySelector("#fp-dev-target");
      var repo = sel ? sel.value : "Mein-Rezeptbuch";
      var label = (sel && sel.options[sel.selectedIndex]) ? FP_PEERS_NICE[repo] || sel.options[sel.selectedIndex].text : repo;
      sendHandshake(out, repo, label);
    });
    panel.querySelector("#fp-dev-connect").addEventListener("click", function () { connectToNet(out); });
    panel.querySelector("#fp-dev-announce").addEventListener("click", function () { announcePresence(out); });
    panel.querySelector("#fp-dev-discover").addEventListener("click", function () { discoverRoom(out); });
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
