/*
 * SBKIM — Modul 23 — Rendezvous (gemeinsamer Raum)
 *
 * Löst die Adress-Wand: die in GitHub committete nodeId ist NICHT die
 * LEBENDE nodeId, die ein Knoten gerade im Browser belauscht (listenNostr).
 * Statt an eine committete ID zu adressieren, treffen sich lebende Knoten
 * in einem GETEILTEN Etikett (Nostr-Tag) auf demselben Relais — wie eine
 * Pinnwand mit einem "gemeinsamen Raum". Ein aktiver Knoten heftet auf
 * bewusste Nutzer-Aktion seine LEBENDE Visitenkarte (echte Spore inkl.
 * lebender nodeId) ans Brett; ein Suchender liest die Karten und handshaket
 * die LEBENDE ID — die der Gegenknoten ja gerade wirklich belauscht.
 *
 * Herkunft: bewiesen am 2026-06-28 (Klaus' Browser-Lauf Tablet↔Handy,
 * "✓ ANDOCK ETABLIERT mit Family Projekt (lebende ID)"). Dieser Code ist
 * die saubere, konfig-getriebene Ausgliederung des family-project-Prototyps
 * (sbkim/sbkim-init.js, Funktionen doAnnounce/announcePresence/discoverRoom/
 * handshakeLiveCard/connectToNet) — KEINE family-Hardcodes mehr. Jeder
 * Knoten injiziert seinen eigenen nodeName + (optional) seinen Relais-Client.
 *
 * VERFASSUNGSTREU (Empfangsmodus mit Antwortrecht, Mycel-Schicht 1):
 * Anmelden UND Suchen sind ausschliesslich NUTZER-AUSGELOeSTE Aktionen
 * (Knöpfe in der App). KEIN getakteter Dauer-Piepser (= Pulsation, fürs
 * Mycel verboten), KEIN Crawl, KEINE Eigenanfrage ins offene Netz beim
 * Laden. Das Anmelden ist eine bewusste Pilz-Schicht-Geste (Schicht 2),
 * der Knoten selbst bleibt Empfangsmodus.
 *
 * Bewusst NUR Tool-Code über die öffentlichen Flächen der geteilten Kern-
 * Module: Modul 05 (handshake/listenNostr) + Modul 05b (publish/subscribe).
 * Die Kern-Module 05/05b bleiben UNANGETASTET (kein Netz-Bruch).
 *
 * DOM-frei: dieses Modul liefert nur Daten/Logik. Die Knöpfe + die Karten-
 * Darstellung sind app-eigen (siehe Karte 23 § UI-Stück) — so bleibt die
 * Modul-Datei byte-1:1 in jeder PWA kopierbar.
 *
 * Public surface (registered on window.SbkimRendezvous):
 *   init(opts?) -> Promise<void>
 *       opts = { nodeName, relayClient, anastomose, spore, freshSec, listenMs }
 *       Alle optional. nodeName ist der Anzeigename der eigenen Visitenkarte
 *       (Default "SBKIM-Knoten"). relayClient/anastomose/spore werden sonst
 *       aus den Globals (SbkimNostrRelay / SbkimAnastomose / SbkimSpore)
 *       aufgelöst. init() ist idempotent + fail-soft.
 *   configure(opts) -> void           (Teil-Update der Konfig, gleiche Felder)
 *   announce(opts?) -> Promise<{ ok, nodeId?, reason? }>
 *       Lauscht (listenNostr) + heftet die lebende Visitenkarte ans Brett.
 *       Setzt eine vorhandene Identität voraus.
 *   connectAndAnnounce(opts?) -> Promise<{ ok, created, nodeId?, reason? }>
 *       Wie announce, erzeugt aber die Identität, falls noch keine da ist —
 *       über den optionalen opts.createIdentity-Callback (app-eigen, da die
 *       Domänen-Stichworte app-spezifisch sind). Ohne Callback + ohne
 *       Identität: { ok:false, created:false, reason }.
 *   discover(opts?) -> Promise<{ ok, cards, reason? }>
 *       Liest den Raum (Sammelfenster listenMs), dedupt nach nodeId
 *       (frischeste Karte gewinnt), filtert die eigene(n) nodeId(s) raus.
 *       cards = [{ nodeId, nodeName, spore, ts, ageSec }] (ts-absteigend).
 *   handshakeCard(card, opts?) -> Promise<{ outcome, score?, reason?, raw? }>
 *       Handshake an die LEBENDE ID der Karte (Modul 05, transport:"nostr").
 *       Fail-soft normalisiert: outcome ∈ {established, rejected,
 *       rejected-local, timeout, error}.
 *   _meta -> { version, tag, presenceKind, freshSec, listenMs, nodeName,
 *              hasRelay, hasAnastomose, hasSpore }
 *
 * Self-check: emits a console.info line on script load. Siehe
 * docs/components/23_rendezvous.md + INTERFACES.md §1 Modul 23.
 */
(function (global) {
  "use strict";

  var VERSION = "0.1";

  // ---- Datenverträge (1:1 aus dem bewiesenen family-Prototyp) ----
  var RDV_TAG = "sbkim-rdv";            // das geteilte Etikett = der gemeinsame Raum
  var RDV_PRESENCE_KIND = "sbkim-presence";
  var RDV_FRESH_SEC_DEFAULT = 1800;     // Karten der letzten 30 min berücksichtigen
  var RDV_LISTEN_MS_DEFAULT = 4000;     // Sammelfenster beim Lesen des Raums
  var RDV_HANDSHAKE_TIMEOUT_MS = 12000; // großzügig — Empfänger lädt evtl. Modell
  var NOSTR_KIND = 1;

  // ---- Konfig-Zustand ----
  var cfg = {
    nodeName: "SBKIM-Knoten",
    relayClient: null,   // null → global.SbkimNostrRelay
    anastomose: null,    // null → global.SbkimAnastomose
    spore: null,         // null → global.SbkimSpore
    freshSec: RDV_FRESH_SEC_DEFAULT,
    listenMs: RDV_LISTEN_MS_DEFAULT,
  };

  // ---- Resolver (Default aus den Globals, Override aus der Konfig) ----
  function resolveRelay() {
    var c = cfg.relayClient;
    if (c && typeof c.publish === "function" && typeof c.subscribe === "function") return c;
    var g = global.SbkimNostrRelay;
    if (g && typeof g.publish === "function" && typeof g.subscribe === "function") return g;
    return null;
  }
  function resolveAnastomose() {
    var a = cfg.anastomose || global.SbkimAnastomose;
    return (a && typeof a.handshake === "function") ? a : null;
  }
  function resolveSpore() {
    var s = cfg.spore || global.SbkimSpore;
    return (s && typeof s.getOwnSpore === "function") ? s : null;
  }

  function nowSec() { return Math.floor(Date.now() / 1000); }

  // VERKEHR-Lampe (Modul 17 / Status-Widget) ehrlich setzen: aktiv, solange
  // wir lauschen. Fail-soft — Render-Schicht ist optionaler Konsument.
  function signalListening(active) {
    try {
      if (typeof global.dispatchEvent === "function" && typeof global.CustomEvent === "function") {
        global.dispatchEvent(new global.CustomEvent("sbkim:nostr-listening", {
          detail: { active: active !== false },
        }));
      }
    } catch (_e) { /* fail-soft */ }
  }

  async function getOwnLiveSpore() {
    var spore = resolveSpore();
    if (!spore) return null;
    try {
      return await spore.getOwnSpore();
    } catch (_e) {
      return null;
    }
  }

  // ---- init / configure ----
  function applyOpts(opts) {
    if (!opts || typeof opts !== "object") return;
    if (typeof opts.nodeName === "string" && opts.nodeName.length > 0) cfg.nodeName = opts.nodeName;
    if (opts.relayClient !== undefined) cfg.relayClient = opts.relayClient;
    if (opts.anastomose !== undefined) cfg.anastomose = opts.anastomose;
    if (opts.spore !== undefined) cfg.spore = opts.spore;
    if (typeof opts.freshSec === "number" && isFinite(opts.freshSec) && opts.freshSec > 0) {
      cfg.freshSec = Math.floor(opts.freshSec);
    }
    if (typeof opts.listenMs === "number" && isFinite(opts.listenMs) && opts.listenMs > 0) {
      cfg.listenMs = Math.floor(opts.listenMs);
    }
  }

  async function init(opts) {
    applyOpts(opts);
    // init() baut KEINE Verbindung auf (Empfangsmodus). Nur Konfig setzen.
    return Promise.resolve();
  }

  function configure(opts) { applyOpts(opts); }

  // ---- Kern: lauschen + lebende Visitenkarte ans Brett heften ----
  // Geteilt von announce() und connectAndAnnounce().
  async function doAnnounce(own) {
    var relay = resolveRelay();
    if (!relay) {
      return { ok: false, reason: "Kein Nostr-Relais-Client (Modul 05b) verfügbar." };
    }
    // Erst lauschen, damit der Knoten erreichbar ist, wenn jemand andockt.
    var ana = resolveAnastomose();
    if (ana && typeof ana.listenNostr === "function") {
      try { await ana.listenNostr(); } catch (_e) { /* fail-soft: weiter, Karte hängt trotzdem */ }
    }
    var card = {
      kind: RDV_PRESENCE_KIND,
      nodeId: own.id,
      nodeName: cfg.nodeName,
      spore: own,
      ts: nowSec(),
    };
    try {
      await relay.publish({
        kind: NOSTR_KIND,
        created_at: nowSec(),
        tags: [["t", RDV_TAG]],
        content: JSON.stringify(card),
      });
    } catch (e) {
      return { ok: false, reason: "Anmelden fehlgeschlagen: " + (e && e.message ? e.message : e) };
    }
    signalListening(true);
    return { ok: true, nodeId: own.id };
  }

  // ---- announce(): nur (neu) anmelden — setzt Identität voraus ----
  async function announce() {
    var relay = resolveRelay();
    if (!relay) {
      return { ok: false, reason: "Kein Nostr-Relais-Client (Modul 05b) verfügbar." };
    }
    var own = await getOwnLiveSpore();
    if (!own || !own.id) {
      return { ok: false, reason: "Noch keine Identität — connectAndAnnounce() nutzen oder zuerst eine Spore erzeugen." };
    }
    return await doAnnounce(own);
  }

  // ---- connectAndAnnounce(): Identität erzeugen (falls keine) + anmelden ----
  // opts.createIdentity: optional async () -> spore. App-eigen (Domänen-
  // Stichworte sind app-spezifisch). Ohne Callback + ohne Identität → ok:false.
  async function connectAndAnnounce(opts) {
    opts = (opts && typeof opts === "object") ? opts : {};
    var relay = resolveRelay();
    if (!relay) {
      return { ok: false, created: false, reason: "Kein Nostr-Relais-Client (Modul 05b) verfügbar." };
    }
    var own = await getOwnLiveSpore();
    if (own && own.id) {
      var rA = await doAnnounce(own);
      return { ok: rA.ok, created: false, nodeId: rA.nodeId, reason: rA.reason };
    }
    // Keine Identität — über den app-eigenen Callback erzeugen.
    if (typeof opts.createIdentity !== "function") {
      return {
        ok: false, created: false,
        reason: "Keine Identität und kein createIdentity-Callback übergeben " +
          "(app-eigen, da Domänen-Stichworte app-spezifisch sind).",
      };
    }
    try {
      await opts.createIdentity();
    } catch (e) {
      return { ok: false, created: false, reason: "Identitäts-Erzeugung fehlgeschlagen: " + (e && e.message ? e.message : e) };
    }
    var fresh = await getOwnLiveSpore();
    if (!fresh || !fresh.id) {
      return { ok: false, created: false, reason: "Identität nach createIdentity nicht lesbar." };
    }
    var rB = await doAnnounce(fresh);
    return { ok: rB.ok, created: true, nodeId: rB.nodeId, reason: rB.reason };
  }

  // ---- discover(): lebende Visitenkarten lesen ----
  async function discover(opts) {
    opts = (opts && typeof opts === "object") ? opts : {};
    var relay = resolveRelay();
    if (!relay) {
      return { ok: false, cards: [], reason: "Kein Nostr-Relais-Client (Modul 05b) verfügbar." };
    }
    var listenMs = (typeof opts.listenMs === "number" && isFinite(opts.listenMs) && opts.listenMs > 0)
      ? Math.floor(opts.listenMs) : cfg.listenMs;
    var freshSec = (typeof opts.freshSec === "number" && isFinite(opts.freshSec) && opts.freshSec > 0)
      ? Math.floor(opts.freshSec) : cfg.freshSec;

    var own = await getOwnLiveSpore();
    var ownId = own && own.id;

    var sinceSec = nowSec() - freshSec;
    var byId = {};   // nodeId -> { card, ts }
    var unsub = null;
    try {
      unsub = relay.subscribe(
        { kinds: [NOSTR_KIND], "#t": [RDV_TAG], since: sinceSec },
        function onEvent(ev) {
          if (!ev || typeof ev.content !== "string") return;
          var card;
          try { card = JSON.parse(ev.content); } catch (e) { return; }
          if (!card || card.kind !== RDV_PRESENCE_KIND || !card.nodeId || !card.spore) return;
          var ts = (typeof card.ts === "number" ? card.ts : (typeof ev.created_at === "number" ? ev.created_at : 0));
          if (!byId[card.nodeId] || ts > byId[card.nodeId].ts) byId[card.nodeId] = { card: card, ts: ts };
        },
      );
    } catch (e) {
      return { ok: false, cards: [], reason: "Raum-Lesen fehlgeschlagen: " + (e && e.message ? e.message : e) };
    }

    return await new Promise(function (resolve) {
      setTimeout(function () {
        if (unsub) { try { unsub(); } catch (e) {} }
        var now = nowSec();
        var cards = Object.keys(byId)
          .filter(function (id) { return id !== ownId; })
          .map(function (id) {
            var entry = byId[id];
            var c = entry.card;
            return {
              nodeId: id,
              nodeName: (typeof c.nodeName === "string" && c.nodeName.length > 0) ? c.nodeName : "Knoten",
              spore: c.spore,
              ts: entry.ts,
              ageSec: Math.max(0, now - (entry.ts || now)),
            };
          })
          .sort(function (a, b) { return b.ts - a.ts; });
        resolve({ ok: true, cards: cards });
      }, listenMs);
    });
  }

  // ---- handshakeCard(): Handshake an die LEBENDE ID der Karte ----
  async function handshakeCard(card, opts) {
    opts = (opts && typeof opts === "object") ? opts : {};
    if (!card || !card.spore || !card.spore.id) {
      return { outcome: "error", reason: "Karte ohne gültige Spore." };
    }
    var ana = resolveAnastomose();
    if (!ana) {
      return { outcome: "error", reason: "Modul 05 (Anastomose) nicht geladen." };
    }
    var timeoutMs = (typeof opts.timeoutMs === "number" && isFinite(opts.timeoutMs) && opts.timeoutMs > 0)
      ? Math.floor(opts.timeoutMs) : RDV_HANDSHAKE_TIMEOUT_MS;
    var r;
    try {
      r = await ana.handshake(card.spore, null, { transport: "nostr", timeoutMs: timeoutMs });
    } catch (e) {
      var nm = e && e.name ? e.name : "";
      if (nm === "HandshakeTimeoutError") {
        return { outcome: "timeout", reason: "Keine Antwort in " + Math.round(timeoutMs / 1000) + " s — Gegenknoten offline/nicht wach (Visitenkarte veraltet)." };
      }
      return { outcome: "error", reason: (nm ? "(" + nm + ") " : "") + (e && e.message ? e.message : String(e)) };
    }
    var oc = (r && typeof r.outcome === "string") ? r.outcome : "rejected";
    return {
      outcome: oc,
      score: (r && typeof r.score === "number") ? r.score : undefined,
      reason: (r && r.reason) ? r.reason : undefined,
      raw: r,
    };
  }

  // ---- Public surface ----
  var api = {
    init: init,
    configure: configure,
    announce: announce,
    connectAndAnnounce: connectAndAnnounce,
    discover: discover,
    handshakeCard: handshakeCard,
    get _meta() {
      return {
        version: VERSION,
        tag: RDV_TAG,
        presenceKind: RDV_PRESENCE_KIND,
        freshSec: cfg.freshSec,
        listenMs: cfg.listenMs,
        nodeName: cfg.nodeName,
        hasRelay: resolveRelay() !== null,
        hasAnastomose: resolveAnastomose() !== null,
        hasSpore: resolveSpore() !== null,
      };
    },
  };

  global.SbkimRendezvous = api;

  if (typeof console !== "undefined" && console.info) {
    console.info(
      "MODUL 23 RENDEZVOUS bereit (gemeinsamer Raum, Empfangsmodus/nutzer-ausgelöst), " +
        "Funktionen: init/configure/announce/connectAndAnnounce/discover/handshakeCard",
    );
  }
})(typeof window !== "undefined" ? window : globalThis);
