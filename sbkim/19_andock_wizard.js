/*
 * SBKIM — Modul 19 — Andock-Wizard (kopierbar)
 *
 * Extrahiert aus dem Sage-Page-Andock-Wizard (index.html Karte „Andocken").
 * Ein kopierbares Helfer-Modul: aus drei Eingaben (Repo-URL · Domain ·
 * Knotentyp) erzeugt es eine unsignierte Spore-VORLAGE, die passende
 * status.json-Zeile und einen vorgelinkten GitHub-PR. KEINE Krypto, KEIN
 * Storage, KEIN Netz, KEIN Signieren — das echte Signieren liegt in Modul 02,
 * der echte Andock-Pfad in Modul 09. Dieses Modul ist reine Eingabe→Text-Hilfe
 * (Onboarding/Wizard).
 *
 * Public surface (window.SbkimAndockWizard):
 *   repoToPagesUrl(repo)               -> "https://owner.github.io/name/"
 *   repoToNodeName(repo, fallback)     -> "Name" (kapitalisiert)
 *   buildSporeTemplate(opts)           -> { …Spore-Vorlage… } (unsigniert)
 *   buildStatusLine({name,domain,url}) -> '    { "name": … }'
 *   buildPrUrl(opts)                   -> prelinked GitHub-edit-URL
 *   generate(opts)                     -> { spore, statusLine, prUrl, pagesUrl, name }
 *   mount({ container, statusRepoUrl, protocolVersion, embeddingModel })  // Browser-only DOM-Injektion
 *   _meta
 *
 * Reproduzierbar 1:1 zur Sage-Page (generateSpore): gleiche Felder, gleiche
 * Pages-URL-Ableitung, gleiche status.json-Zeile.
 */
(function (global) {
  "use strict";

  var DEFAULT_PROTOCOL_VERSION = "0.1";
  var DEFAULT_EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
  var DEFAULT_STATUS_REPO = "https://github.com/lausiklauskn-png/sage-protokol";
  var NODE_TYPES = ["hybrid", "consumer", "provider"];

  function makeId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    // Fallback (kein Krypto-Anspruch — nur eine Vorlagen-ID).
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function repoToPagesUrl(repo) {
    var url = String(repo || "").trim();
    try {
      var u = new URL(url);
      var parts = u.pathname.replace(/^\/|\/$/g, "").split("/");
      if (u.hostname === "github.com" && parts.length >= 2) {
        return "https://" + parts[0] + ".github.io/" + parts[1] + "/";
      }
    } catch (_e) { /* keine gültige URL → unverändert zurück */ }
    return url;
  }

  function repoToNodeName(repo, fallback) {
    var name = String(fallback || "").trim();
    try {
      var seg = new URL(String(repo || "")).pathname.replace(/^\/|\/$/g, "").split("/").pop();
      if (seg) name = seg;
    } catch (_e) { /* Fallback bleibt */ }
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function buildSporeTemplate(opts) {
    opts = opts || {};
    var nodeType = NODE_TYPES.indexOf(opts.nodeType) >= 0 ? opts.nodeType : "hybrid";
    return {
      schemaVersion: 1,
      protocolVersion: opts.protocolVersion || DEFAULT_PROTOCOL_VERSION,
      id: opts.id || makeId(),
      domain: String(opts.domain || "").trim(),
      nodeType: nodeType,
      endpoint: repoToPagesUrl(opts.repo),
      embeddingModel: opts.embeddingModel || DEFAULT_EMBEDDING_MODEL,
      createdAt: opts.createdAt || new Date().toISOString()
      // Optionale Felder (domainKeywords, domainVector, stammCategories,
      // guestCategories) ergänzt der echte Andock-Pfad (Modul 09 Schritt 5).
    };
  }

  function buildStatusLine(o) {
    o = o || {};
    return '    { "name": "' + (o.name || "") + '", "domain": "' + (o.domain || "") +
      '", "integrated": true, "url": "' + (o.url || "") + '" }';
  }

  function buildPrUrl(o) {
    o = o || {};
    var base = (o.statusRepoUrl || DEFAULT_STATUS_REPO).replace(/\/$/, "");
    var cap = o.name || "";
    var prBody = "Endknoten andocken: " + cap + "\n\n- Domain: " + (o.domain || "") +
      "\n- Knotentyp: " + (o.nodeType || "hybrid") + "\n- Endpoint: " + (o.pagesUrl || "") +
      "\n- Spore: " + (o.pagesUrl || "") + "sbkim/spore.json";
    return base + "/edit/main/status.json?quick_pull=1" +
      "&message=" + encodeURIComponent("andocken: " + cap) +
      "&description=" + encodeURIComponent(prBody);
  }

  function generate(opts) {
    opts = opts || {};
    var spore = buildSporeTemplate(opts);
    var pagesUrl = spore.endpoint;
    var name = repoToNodeName(opts.repo, opts.domain);
    return {
      spore: spore,
      pagesUrl: pagesUrl,
      name: name,
      statusLine: buildStatusLine({ name: name, domain: spore.domain, url: pagesUrl }),
      prUrl: buildPrUrl({
        statusRepoUrl: opts.statusRepoUrl, name: name, domain: spore.domain,
        nodeType: spore.nodeType, pagesUrl: pagesUrl
      })
    };
  }

  // ---- Optionale DOM-Injektion (Browser) ------------------------------------
  // Baut eine schlanke Drei-Felder-Wizard-UI in den Container. Fail-soft: ohne
  // DOM passiert nichts (z.B. headless). Kein eigenes CSS-Zwang — erbt vom Host.
  function mount(opts) {
    opts = opts || {};
    var doc = global.document;
    if (!doc) return null;
    var container = typeof opts.container === "string"
      ? doc.querySelector(opts.container) : opts.container;
    if (!container) {
      if (global.console && console.warn) {
        console.warn("MODUL 19 ANDOCK-WIZARD: Container nicht gefunden — mount übersprungen.");
      }
      return null;
    }
    var idp = "sbkim-aw-";
    container.innerHTML =
      '<div class="sbkim-aw-grid">' +
        '<label>GitHub-Repo<input type="url" id="' + idp + 'repo" placeholder="https://github.com/user/repo"></label>' +
        '<label>Domain<input type="text" id="' + idp + 'domain" placeholder="z.B. Kochrezepte"></label>' +
        '<label>Knotentyp<select id="' + idp + 'type">' +
          '<option value="hybrid" selected>hybrid (empfohlen)</option>' +
          '<option value="consumer">consumer (nur fragen)</option>' +
          '<option value="provider">provider (nur antworten)</option>' +
        '</select></label>' +
      '</div>' +
      '<button type="button" id="' + idp + 'go">Spore-Vorlage erzeugen</button>' +
      '<span id="' + idp + 'status"></span>' +
      '<div id="' + idp + 'out" hidden>' +
        '<h4>Spore-Vorlage</h4><pre id="' + idp + 'spore"></pre>' +
        '<h4>Eintrag für status.json</h4><pre id="' + idp + 'line"></pre>' +
        '<a id="' + idp + 'pr" target="_blank" rel="noopener noreferrer">→ PR auf status.json öffnen</a>' +
      '</div>';
    var $ = function (s) { return doc.getElementById(idp + s); };
    $("go").addEventListener("click", function () {
      var repo = $("repo").value.trim(), domain = $("domain").value.trim();
      if (!repo || !domain) {
        $("status").textContent = "Bitte Repo-URL und Domain ausfüllen.";
        return;
      }
      var res = generate({
        repo: repo, domain: domain, nodeType: $("type").value,
        statusRepoUrl: opts.statusRepoUrl,
        protocolVersion: opts.protocolVersion, embeddingModel: opts.embeddingModel
      });
      $("spore").textContent = JSON.stringify(res.spore, null, 2);
      $("line").textContent = res.statusLine;
      $("pr").setAttribute("href", res.prUrl);
      $("out").hidden = false;
      $("status").textContent = "✓ Spore-Vorlage erzeugt.";
    });
    return container;
  }

  var SbkimAndockWizard = {
    repoToPagesUrl: repoToPagesUrl,
    repoToNodeName: repoToNodeName,
    buildSporeTemplate: buildSporeTemplate,
    buildStatusLine: buildStatusLine,
    buildPrUrl: buildPrUrl,
    generate: generate,
    mount: mount,
    _meta: {
      nodeTypes: NODE_TYPES,
      defaultProtocolVersion: DEFAULT_PROTOCOL_VERSION,
      defaultEmbeddingModel: DEFAULT_EMBEDDING_MODEL
    }
  };

  global.SbkimAndockWizard = SbkimAndockWizard;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = SbkimAndockWizard;
  }
})(typeof window !== "undefined" ? window : globalThis);
