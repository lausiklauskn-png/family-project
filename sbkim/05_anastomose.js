/*
 * SBKIM — Modul 05 — Anastomose
 *
 * Composes Modul 01 (Storage), Modul 02 (Spore) and Modul 04 (Match)
 * into a single protocol step: the bidirectional handshake. Modul 05
 * itself never computes a cosine, never verifies a spore signature on
 * its own, never touches IndexedDB directly — it orchestrates.
 *
 * Bau 05.Y transparenter Slot-Pfad (2026-05-20): Modul 05 schreibt
 * identitäts-spezifisch in `sbkim_siblings_<key>` und
 * `sbkim_anastomosis_log_<key>`. Receiver-Pfad nutzt eine
 * `nodeId → key`-Map (im `init()` einmal aus `listIdentities()` ×
 * `getOrCreateIdentity(key)` aufgebaut) zur Persona-Auflösung;
 * Sender-Pfad nutzt den aktiven Slot (Cache in `init()` via
 * `getActiveIdentityKey()`). Spec-Quelle: Brief 04 (PR #99,
 * INTERFACES § 1 Modul 05 + § 9.2 + § 9.4) + Bau 02.Y (PR #104,
 * Multi-Identitäts-API).
 *
 * Public surface (registered on window.SbkimAnastomose):
 *   init() -> Promise<void>
 *   handshake(targetSpore, ownDomainVector, options?) -> Promise<HandshakeResult>
 *     options.transport ∈ {"auto","http","channel"}, Default "auto"
 *     (Spec-Sitzung BroadcastChannel-Bridge 2026-05-17 — additiv, der
 *      bestehende HTTP-Pfad bleibt unverändert; same-origin-Fallback auf
 *      BroadcastChannel('sbkim') bei klaren HTTP-Defekt-Signalen.)
 *   receiveHandshake(request) -> Promise<HandshakeResponse>
 *   listSiblings() -> Promise<Array<{nodeId, domain, since, pubKey}>>
 *   forgetSibling(nodeId) -> Promise<void>
 *
 * Inoffiziell (Unterstrich-Präfix, nur für tests/manual_check.html):
 *   _invokeDirect(request)            -> alias auf receiveHandshake
 *   _setOwnDomainVector(vec|null)     -> setzt Empfänger-Vektor-Override
 *                                        (umgeht das domainVector-Feld
 *                                        in der eigenen Spore)
 *   _setTransport(t)                  -> forciert Default-Transport
 *                                        ("auto"|"http"|"channel"|null)
 *   _clearChannelState()              -> setzt Default-Transport zurück
 *                                        auf "auto"
 *   _postChannelEnvelope(request)     -> roher Channel-Sender für Panel
 *                                        (kein consume, kein sibling-put)
 *   _buildSignedRequest(...)          -> Test-Brücke für In-Memory-Peer
 *   _verifyResponseSignature(...)     -> Test-Brücke für Bidirektion
 *   _canonicalize / _base64urlEncode  -> Krypto-Helfer (Panel)
 *   _base64urlDecode
 *
 * Self-check: emits a console.info line on script load (synchronous,
 * before any call). See INTERFACES.md §1 Modul 05 + §2 „Anfrage (Query)"
 * und docs/components/05_anastomose.md für den verbindlichen Vertrag.
 *
 * Krypto-Pfad (canonicalize, base64url, sign, verify) ist bewusst aus
 * Modul 02 dupliziert — Single-File-PWA-Stil, keine geteilte Library.
 * Wer das stört, hebt es in eine Pflege-Sitzung.
 */
(function (global) {
  "use strict";

  // ---- Konstanten (gespiegelt aus INTERFACES.md §0 / §3) ----

  var PROTOCOL_VERSION = "0.1";
  var QUERY_TIMEOUT_MS = 4000;
  var ENDPOINT_ANASTOMOSIS = "/sbkim/anastomosis";
  var EMBEDDING_DIM = 384;
  var NONCE_BYTES = 16;

  // Bau 05.Y: identitäts-spezifische Stores via Slot-Suffix —
  // siblingsStoreName(slot) und anastomosisLogStoreName(slot) bauen
  // den vollen Store-Namen aus den Basis-Konstanten + aktivem Slot.
  var SIBLINGS_STORE_BASE = "sbkim_siblings";
  var LOG_STORE_BASE = "sbkim_anastomosis_log";
  var KEYS_STORE = "sbkim_keys";
  var DEFAULT_IDENTITY_KEY = "main";

  var REQUEST_REQUIRED_FIELDS = [
    "fromNodeId",
    "nonce",
    "protocolVersion",
    "senderSpore",
    "signature",
    "timestamp",
  ];

  // Pflichtfelder einer regulären HandshakeResponse — für Auto-Fallback-
  // Erkennung (Spec-Sitzung BroadcastChannel-Bridge 2026-05-17, Karte 05
  // § Auto-Fallback-Logik). Eine Antwort, der eines dieser Felder fehlt,
  // löst (bei transport:"auto") den Channel-Fallback aus.
  var RESPONSE_REQUIRED_FIELDS = [
    "fromNodeId",
    "nonceEcho",
    "outcome",
    "protocolVersion",
    "receiverSpore",
    "signature",
    "timestamp",
    "toNodeId",
  ];

  var ALLOWED_TRANSPORTS = ["auto", "http", "channel"];
  var BROADCAST_CHANNEL_NAME = "sbkim";
  var REPLY_CHANNEL_PREFIX = "sbkim:reply:";

  // ---- Fehler-Erzeugung ----

  function makeError(name, message, cause) {
    var e = new Error(message);
    e.name = name;
    if (cause !== undefined) e.cause = cause;
    return e;
  }

  // ---- Dependency-Probes (init wirft, wenn ein Stück fehlt) ----

  function getSubtle() {
    var c = global.crypto || (typeof crypto !== "undefined" ? crypto : null);
    if (!c || !c.subtle) {
      throw makeError(
        "AnastomoseDependenciesError",
        "WebCrypto (crypto.subtle) ist nicht verfügbar. Modul 05 braucht moderne Browser " +
          "(Chrome ≥ 113, Firefox ≥ 130, Safari ≥ 17). Kein Polyfill.",
      );
    }
    return c.subtle;
  }

  function probeDependencies() {
    var missing = [];
    if (!global.SbkimStorage) missing.push("SbkimStorage (Modul 01)");
    if (!global.SbkimSpore) missing.push("SbkimSpore (Modul 02)");
    if (!global.SbkimMatch) missing.push("SbkimMatch (Modul 04)");
    if (missing.length > 0) {
      throw makeError(
        "AnastomoseDependenciesError",
        "Fehlende Modul-Abhängigkeiten: " + missing.join(", ") + ". " +
          "Lade 01_storage.js, 02_spore.js und 04_match.js vor 05_anastomose.js.",
      );
    }
  }

  function getStorage() { return global.SbkimStorage; }
  function getSpore() { return global.SbkimSpore; }
  function getMatch() { return global.SbkimMatch; }

  // ---- Bau 05.Y: Slot-Helfer ----
  //
  // Modul 05 lebt nach Bau 05.Y in identitäts-spezifischen Stores
  // (`sbkim_siblings_<key>` + `sbkim_anastomosis_log_<key>`). Die
  // Closure-Helper bauen den vollen Namen aus Basis + Slot, und
  // `ensureSlotStores` legt beide Stores defensiv via Bau-01.Y
  // `ensureStore` an (idempotent — wer schon da war, bleibt da).

  function siblingsStoreName(slotKey) {
    return SIBLINGS_STORE_BASE + "_" + slotKey;
  }

  function anastomosisLogStoreName(slotKey) {
    return LOG_STORE_BASE + "_" + slotKey;
  }

  async function ensureSlotStores(slotKey) {
    var storage = getStorage();
    await storage.ensureStore(siblingsStoreName(slotKey));
    await storage.ensureStore(anastomosisLogStoreName(slotKey));
  }

  // ---- base64url ohne Padding (RFC 4648 §5, dupliziert aus Modul 02) ----

  function base64urlEncode(bytes) {
    var bin = "";
    var view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (var i = 0; i < view.length; i++) bin += String.fromCharCode(view[i]);
    var b64 = (global.btoa || btoa)(bin);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64urlDecode(str) {
    var pad = str.length % 4 === 0 ? "" : "====".slice(str.length % 4);
    var b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
    var bin = (global.atob || atob)(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function utf8Encode(str) {
    return new TextEncoder().encode(str);
  }

  // Recursive lexicographic key sort. Returns a new object, never mutates.
  function canonicalize(value) {
    if (value === null) return null;
    if (Array.isArray(value)) return value.map(canonicalize);
    if (typeof value === "object") {
      var keys = Object.keys(value).sort();
      var out = {};
      for (var i = 0; i < keys.length; i++) out[keys[i]] = canonicalize(value[keys[i]]);
      return out;
    }
    return value;
  }

  function canonicalJsonBytesWithoutSignature(envelopeLike) {
    var unsigned = {};
    var keys = Object.keys(envelopeLike);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === "signature") continue;
      unsigned[keys[i]] = envelopeLike[keys[i]];
    }
    return utf8Encode(JSON.stringify(canonicalize(unsigned)));
  }

  // ---- Sign / Verify auf Envelope-Ebene (Request UND Response) ----

  async function signEnvelope(unsigned, privateKey) {
    var bytes = utf8Encode(JSON.stringify(canonicalize(unsigned)));
    var sigBuf = await getSubtle().sign({ name: "Ed25519" }, privateKey, bytes);
    return base64urlEncode(sigBuf);
  }

  async function verifyEnvelope(envelope, publicKeyJwk) {
    if (!envelope || typeof envelope.signature !== "string") return false;
    var subtle = getSubtle();
    var pub;
    try {
      pub = await subtle.importKey("jwk", publicKeyJwk, { name: "Ed25519" }, true, ["verify"]);
    } catch (err) {
      return false;
    }
    var sigBytes;
    try {
      sigBytes = base64urlDecode(envelope.signature);
    } catch (err) {
      return false;
    }
    var bytes = canonicalJsonBytesWithoutSignature(envelope);
    try {
      return await subtle.verify({ name: "Ed25519" }, pub, sigBytes, bytes);
    } catch (err) {
      return false;
    }
  }

  // ---- Helfer ----

  function randomNonceB64() {
    var c = global.crypto || (typeof crypto !== "undefined" ? crypto : null);
    if (!c || !c.getRandomValues) {
      throw makeError("AnastomoseDependenciesError", "crypto.getRandomValues fehlt — Modul 05 braucht WebCrypto.");
    }
    var buf = new Uint8Array(NONCE_BYTES);
    c.getRandomValues(buf);
    return base64urlEncode(buf);
  }

  function majorVersion(v) {
    if (typeof v !== "string") return null;
    var dot = v.indexOf(".");
    return dot === -1 ? v : v.slice(0, dot);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  // ---- Modul-Zustand ----

  var ready = false;
  // Bau 05.Y: pro Slot ein cached CryptoKey (statt einem globalen).
  // Map<slotKey, CryptoKey> — wird lazy gefüllt bei loadOwnPrivateKey.
  var ownPrivateKeyCacheBySlot = new Map();
  var ownDomainVectorOverride = null;  // Float32Array, nur Tests
  var bridgeRegistered = false;
  var channelBridgeRegistered = false; // BroadcastChannel-Receiver (Spec-Sitzung 2026-05-17)
  var transportDefault = "auto";       // ohne options.transport, von _setTransport überschreibbar
  // Bau 05.Y: aktiver Slot wird im init() einmal aus
  // `getActiveIdentityKey()` gecached. Operations cachen ihn nochmal
  // lokal, um gegen Mid-Operation-Wechsel robust zu sein (Karte 02
  // § Risiken: Mid-Operation-Identitäts-Wechsel ist nicht spezifiziert).
  var activeSlotKey = null;
  // Bau 05.Y: Receiver-Map nodeId → slotKey, im init() einmal aus
  // `listIdentities()` × `getOrCreateIdentity(slot)` aufgebaut. Wer
  // einen neuen Slot anlegt, muss Modul 05 re-initialisieren (Tab-
  // Reload — Karte 05 § Receiver-Map-Schlank-Konvention).
  var receiverMap = new Map();

  // Re-entry-friendly log key: ein Counter pro Millisekunde, damit
  // zwei schnell nacheinander geschriebene Log-Zeilen einander nicht
  // überschreiben (passiert sonst bei Re-Handshake in derselben ms).
  var lastLogTs = "";
  var logSubCounter = 0;

  // Bau 17: sbkim:handshake-Custom-Event-Dispatcher (Karte 17 §
  // Event-Bus-Schema). Wird in den Public-Wrappern handshake/
  // receiveHandshake nach Result-Resolve pro Aufruf einmal gefeuert.
  // Fail-soft — Modul 17 ist optionaler Konsument.
  function dispatchHandshakeEvent(outcome, peerNodeId, direction) {
    try {
      if (typeof global.dispatchEvent === "function" && typeof global.CustomEvent === "function") {
        global.dispatchEvent(new global.CustomEvent("sbkim:handshake", {
          detail: {
            outcome:    typeof outcome === "string" ? outcome : "rejected",
            peerNodeId: typeof peerNodeId === "string" && peerNodeId.length > 0 ? peerNodeId : null,
            direction:  direction === "incoming" ? "incoming" : "outgoing",
          },
          bubbles:    false,
          cancelable: false,
        }));
      }
    } catch (_e) {
      // fail-soft — Render-Schicht.
    }
  }

  function nextLogKey() {
    var ts = nowIso();
    var key;
    if (ts === lastLogTs) {
      logSubCounter += 1;
      key = ts + "+" + logSubCounter;
    } else {
      lastLogTs = ts;
      logSubCounter = 0;
      key = ts;
    }
    return { key: key, ts: ts };
  }

  // ---- init() ----

  async function init() {
    probeDependencies();
    getSubtle();
    await getStorage().init();
    await getSpore().init();
    // Identität sicherstellen — sonst kann Modul 05 später nicht signieren.
    // Modul 02 ist beim ersten Aufruf lazy.
    await getSpore().getOrCreateIdentity();

    // Bau 05.Y: aktiven Slot cachen + slot-spezifische Stores anlegen.
    var spore = getSpore();
    activeSlotKey = await spore.getActiveIdentityKey();
    await ensureSlotStores(activeSlotKey);

    // Bau 05.Y: Receiver-Map nodeId → slotKey einmal aus
    // listIdentities × getOrCreateIdentity(slot) bauen. Async-Crypto-
    // Aufruf pro Slot ist ok, weil das einmal im init passiert
    // (Karte 05 § Receiver-Map-Schlank-Konvention).
    receiverMap = new Map();
    var slots = await spore.listIdentities();
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      var ident = await spore.getOrCreateIdentity(slot);
      receiverMap.set(ident.nodeId, slot);
    }

    setupServiceWorkerBridge();
    setupBroadcastChannelBridge();
    ready = true;
  }

  async function ensureReady() {
    if (!ready) await init();
  }

  async function loadOwnPrivateKey(slotKey) {
    // Bau 05.Y: pro Slot ein cached CryptoKey. Sender ruft mit dem
    // aktiven Slot, Receiver mit dem aus der receiverMap getroffenen.
    var sk = slotKey || activeSlotKey || DEFAULT_IDENTITY_KEY;
    if (ownPrivateKeyCacheBySlot.has(sk)) return ownPrivateKeyCacheBySlot.get(sk);
    var storage = getStorage();
    var stored = await storage.get(KEYS_STORE, sk);
    if (!stored || !stored.privateKey) {
      throw makeError(
        "AnastomoseDependenciesError",
        "Keine Identität in sbkim_keys[\"" + sk + "\"] — getOrCreateIdentity('" + sk +
          "') wurde nicht ausgeführt.",
      );
    }
    var subtle = getSubtle();
    var priv;
    try {
      priv = await subtle.importKey("jwk", stored.privateKey, { name: "Ed25519" }, true, ["sign"]);
    } catch (err) {
      throw makeError(
        "AnastomoseDependenciesError",
        "Privatschlüssel nicht importierbar (slot=" + sk + "): " +
          (err && err.message ? err.message : err),
        err,
      );
    }
    ownPrivateKeyCacheBySlot.set(sk, priv);
    return priv;
  }

  async function loadOwnDomainVector(slotKey) {
    if (ownDomainVectorOverride) return ownDomainVectorOverride;
    // Bau 05.Y: pro Slot eigene Spore; ohne Argument fällt auf den
    // aktiven Slot zurück (Bau-02.Y-Default).
    var ownSpore = await getSpore().getOwnSpore(slotKey);
    if (!ownSpore || !Array.isArray(ownSpore.domainVector)) return null;
    if (ownSpore.domainVector.length !== EMBEDDING_DIM) return null;
    return new Float32Array(ownSpore.domainVector);
  }

  // ---- Service-Worker-Brücke (Variante A: Page-Hosted via MessageChannel) ----
  //
  // Wenn ein Service-Worker einen POST /sbkim/anastomosis abfängt
  // (siehe src/sbkim-sw.js), schickt er ihn via postMessage an die
  // Page. Hier registriert sich Modul 05 als Empfänger. Im Test ohne
  // SW (file://, headless) tut der Listener nichts — die Test-Brücke
  // _invokeDirect ruft receiveHandshake direkt auf.

  function setupServiceWorkerBridge() {
    if (bridgeRegistered) return;
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    try {
      navigator.serviceWorker.addEventListener("message", async function (event) {
        if (!event || !event.data || event.data.type !== "SBKIM_ANASTOMOSIS_REQUEST") return;
        if (!event.ports || event.ports.length === 0) return;
        var port = event.ports[0];
        var response;
        try {
          response = await receiveHandshake(event.data.request);
        } catch (err) {
          // receiveHandshake wirft per Spec niemals. Verteidigt sicherheitshalber.
          response = { outcome: "rejected", reason: "Interner Fehler: " + (err && err.message ? err.message : err) };
        }
        try { port.postMessage(response); } catch (e2) { /* port already closed */ }
      });
      bridgeRegistered = true;
    } catch (err) {
      // Im headless-Test ggf. nicht verfügbar — kein Throw, kein Log-Spam.
      bridgeRegistered = false;
    }
  }

  // ---- BroadcastChannel-Bridge (same-origin Fallback, Spec 2026-05-17) ----
  //
  // Receiver-Seite: ein einziger Main-Channel-Listener pro Tab, eager in
  // init() registriert (Karte 05 § BroadcastChannel-Bridge, E3). Akzeptiert
  // nur Requests, die explizit an die eigene nodeId adressiert sind, und
  // antwortet auf einem dedizierten Reply-Channel, dessen Name aus der
  // request-nonce abgeleitet ist. Self-Hit-Schutz blockt Sender-im-selben-
  // Tab (E7). Wer-nicht-da-ist-schweigt: kein Wake-Lock, kein Auto-Start.

  function setupBroadcastChannelBridge() {
    if (channelBridgeRegistered) return;
    if (typeof BroadcastChannel === "undefined") return;
    try {
      var chan = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      chan.addEventListener("message", async function (event) {
        if (!event || !event.data) return;
        if (event.data.type !== "SBKIM_ANASTOMOSE_REQUEST") return;
        var payload = event.data.payload;
        if (!payload || typeof payload !== "object") return;
        var reply = event.data.replyChannelName;
        if (typeof reply !== "string" || reply.indexOf(REPLY_CHANNEL_PREFIX) !== 0) return;
        var ownId;
        try { ownId = await getSpore().getNodeId(); } catch (e1) { return; }
        if (payload.toNodeId !== ownId) return;       // an wen anders gerichtet
        if (payload.fromNodeId === ownId) return;     // Self-Hit-Schutz (E7)
        var response;
        try {
          response = await receiveHandshake(payload);
        } catch (err) {
          response = { outcome: "rejected", reason: "Interner Fehler: " + (err && err.message ? err.message : err) };
        }
        var replyChan = null;
        try {
          replyChan = new BroadcastChannel(reply);
          replyChan.postMessage({ type: "SBKIM_ANASTOMOSE_RESPONSE", payload: response });
        } catch (e2) {
          // wer-nicht-da-ist-schweigt — kein Log-Spam.
        } finally {
          if (replyChan) { try { replyChan.close(); } catch (e3) {} }
        }
      });
      channelBridgeRegistered = true;
    } catch (err) {
      channelBridgeRegistered = false;
    }
  }

  // Sender-Seite: postet ein Request-Envelope auf dem Main-Channel und
  // wartet mit Timeout auf das Reply auf dem dedizierten Reply-Channel.
  // Wirft synchron MissingToNodeIdError vor jedem Channel-Bau, wenn der
  // Request keine toNodeId trägt (Channel-Pfad kann ohne den Filter
  // nicht antworten — Karte 05 § Pflichtfeld-Schärfung).
  //
  // Liefert das rohe HandshakeResponse-Payload zurück; consume/verify ist
  // Sache des Aufrufers (consumeResponse für den regulären Handshake-Pfad).

  async function postChannelEnvelope(request, timeoutMs) {
    var replyTimeout = (typeof timeoutMs === "number" && isFinite(timeoutMs) && timeoutMs > 0)
      ? timeoutMs
      : QUERY_TIMEOUT_MS;
    if (!request || typeof request !== "object") {
      throw makeError("HandshakeNetworkError", "request fehlt für Channel-Pfad.");
    }
    if (typeof request.toNodeId !== "string" || request.toNodeId.length === 0) {
      throw makeError(
        "MissingToNodeIdError",
        "Channel-Pfad erfordert request.toNodeId — ohne ihn kann der Receiver " +
          "den Request nicht filtern (Karte 05 § Pflichtfeld-Schärfung).",
      );
    }
    if (typeof request.nonce !== "string" || request.nonce.length === 0) {
      throw makeError(
        "HandshakeNetworkError",
        "request.nonce fehlt — Reply-Channel-Name nicht ableitbar.",
      );
    }
    if (typeof BroadcastChannel === "undefined") {
      throw makeError(
        "HandshakeNetworkError",
        "BroadcastChannel-API in dieser Umgebung nicht verfügbar.",
      );
    }

    var replyChannelName = REPLY_CHANNEL_PREFIX + request.nonce;
    var replyChan = new BroadcastChannel(replyChannelName);
    var settled = false;

    var responsePromise = new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        try { replyChan.close(); } catch (e) {}
        reject(makeError(
          "HandshakeTimeoutError",
          "Channel-Reply > " + replyTimeout + " ms ausgeblieben.",
        ));
      }, replyTimeout);

      replyChan.addEventListener("message", function (event) {
        if (settled) return;
        if (!event || !event.data) return;
        if (event.data.type !== "SBKIM_ANASTOMOSE_RESPONSE") return;
        var payload = event.data.payload;
        if (!payload || typeof payload !== "object") return;
        if (payload.nonceEcho !== request.nonce) {
          settled = true;
          clearTimeout(timer);
          try { replyChan.close(); } catch (e) {}
          reject(makeError(
            "HandshakeSignatureInvalidError",
            "Channel-Reply nonceEcho weicht ab.",
          ));
          return;
        }
        settled = true;
        clearTimeout(timer);
        try { replyChan.close(); } catch (e) {}
        resolve(payload);
      });
    });

    var mainChan = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    try {
      mainChan.postMessage({
        type: "SBKIM_ANASTOMOSE_REQUEST",
        payload: request,
        replyChannelName: replyChannelName,
      });
    } finally {
      try { mainChan.close(); } catch (e) {}
    }

    return await responsePromise;
  }

  // Vollständiger Channel-Sender für handshake(): postet, wartet, loggt
  // im Timeout-Fall, hängt einen optionalen HTTP-cause an die Fehler-
  // Kette (Auto-Fallback) und konsumiert die Response wie der HTTP-Pfad.

  async function sendViaChannel(targetSpore, request, preScore, httpCause, opSlot, timeoutMs) {
    var responseJson;
    try {
      responseJson = await postChannelEnvelope(request, timeoutMs);
    } catch (err) {
      if (err.name === "HandshakeTimeoutError") {
        try { await logEntry(targetSpore.id, "timeout-channel", opSlot); } catch (e) {}
      }
      if (httpCause && err.cause === undefined) err.cause = httpCause;
      throw err;
    }
    return await consumeResponse(targetSpore, responseJson, preScore, opSlot);
  }

  function parseTransport(options) {
    if (options === undefined || options === null) return transportDefault;
    if (typeof options !== "object" || Array.isArray(options)) {
      throw makeError(
        "InvalidTransportError",
        "handshake options muss ein Objekt sein, war: " +
          (Array.isArray(options) ? "Array" : typeof options),
      );
    }
    if (options.transport === undefined) return transportDefault;
    if (typeof options.transport !== "string" ||
        ALLOWED_TRANSPORTS.indexOf(options.transport) === -1) {
      throw makeError(
        "InvalidTransportError",
        "handshake options.transport unbekannt: '" + options.transport +
          "'. Erlaubt: 'auto' | 'http' | 'channel'.",
      );
    }
    return options.transport;
  }

  function shouldAutoFallback(httpResponse, parsedJson) {
    if (!httpResponse) return false;                     // Netz-/DNS-/Abort-Fehler → kein Channel
    if (httpResponse.status >= 400) return true;         // 4xx/5xx
    var ct = "";
    try { ct = httpResponse.headers.get("Content-Type") || ""; } catch (e) {}
    if (ct.indexOf("application/json") === -1) return true;
    if (!parsedJson || typeof parsedJson !== "object") return true;
    for (var i = 0; i < RESPONSE_REQUIRED_FIELDS.length; i++) {
      var f = RESPONSE_REQUIRED_FIELDS[i];
      if (parsedJson[f] === undefined || parsedJson[f] === null) return true;
    }
    if (parsedJson.outcome !== "established" && parsedJson.outcome !== "rejected") return true;
    return false;
  }

  // ---- Storage-Helfer ----

  async function upsertSibling(entry, slotKey) {
    // Bau 05.Y: schreibt slot-spezifisch in sbkim_siblings_<slot>.
    var sk = slotKey || activeSlotKey || DEFAULT_IDENTITY_KEY;
    var storage = getStorage();
    var storeName = siblingsStoreName(sk);
    var existing = await storage.get(storeName, entry.nodeId);
    if (existing) {
      // Reentry-Idempotenz: since bleibt eingefroren, kein Überschreiben.
      return true;
    }
    await storage.put(storeName, entry.nodeId, {
      nodeId: entry.nodeId,
      domain: entry.domain,
      endpoint: entry.endpoint,
      pubKey: entry.pubKey,
      since: entry.since,
    });
    return false;
  }

  async function logEntry(peerId, outcome, slotKey) {
    // Bau 05.Y: schreibt slot-spezifisch in sbkim_anastomosis_log_<slot>.
    var sk = slotKey || activeSlotKey || DEFAULT_IDENTITY_KEY;
    var storage = getStorage();
    var k = nextLogKey();
    await storage.put(anastomosisLogStoreName(sk), k.key, {
      ts: k.ts,
      peerId: peerId,
      outcome: outcome,
    });
  }

  // ---- handshake() ----
  //
  // Bau 17: handshake() ist ein Wrapper um _doHandshake(), der nach
  // Result-Resolve einmal `sbkim:handshake` mit direction:"outgoing"
  // dispatcht. Throws aus _doHandshake werden ungekapselt weitergereicht
  // (keine Wertung). Result-Form bleibt unverändert.

  async function handshake(targetSpore, ownDomainVector, options) {
    var result = await _doHandshake(targetSpore, ownDomainVector, options);
    var outcome = (result && typeof result.outcome === "string") ? result.outcome : "rejected";
    var peerNodeId = (result && typeof result.peerNodeId === "string" && result.peerNodeId.length > 0)
      ? result.peerNodeId
      : (targetSpore && typeof targetSpore.id === "string" ? targetSpore.id : null);
    dispatchHandshakeEvent(outcome, peerNodeId, "outgoing");
    return result;
  }

  async function _doHandshake(targetSpore, ownDomainVector, options) {
    await ensureReady();
    var transport = parseTransport(options);     // wirft InvalidTransportError bei bad value
    // Pflege 2026-05-28: optionaler Timeout-Override (options.timeoutMs).
    // Protokoll-Default bleibt QUERY_TIMEOUT_MS (4 s) für automatisierte
    // Pfade; interaktive Aufrufer (Modul-18-Wizard) reichen einen
    // großzügigeren Wert, damit ein kurz aufgeweckter Geschwister-Tab in
    // Mobile-Chrome antworten kann (Observatorium-Lehre 3 § Tab-Suspendierung).
    var effTimeoutMs = QUERY_TIMEOUT_MS;
    if (options && typeof options.timeoutMs === "number" &&
        isFinite(options.timeoutMs) && options.timeoutMs > 0) {
      effTimeoutMs = options.timeoutMs;
    }
    var spore = getSpore();
    var match = getMatch();

    // Bau 05.Y: Operations-Slot zur Sender-Zeit cachen (gegen Mid-
    // Operation-Wechsel — Karte 02 § Risiken). Defensiv ensureStore.
    var opSlot = activeSlotKey || await spore.getActiveIdentityKey();
    await ensureSlotStores(opSlot);

    // Pflege 2026-05-28: ownDomainVector ist optional. Wird er weggelassen
    // (undefined/null), löst Modul 05 ihn kanonisch aus der eigenen Spore
    // auf (loadOwnDomainVector → ownSpore.domainVector). Das ist dieselbe
    // Quelle, die unten als senderSpore mitgesendet wird — single source
    // of truth, vermeidet einen request.domainVector, der nicht zur
    // senderSpore passt. Aufrufer (Modul 18 etc.) müssen den Vektor also
    // nicht mehr selbst korrekt ableiten. Explizit übergebener Vektor
    // wird weiter honoriert (Tests / Spezialpfade).
    if (ownDomainVector === undefined || ownDomainVector === null) {
      ownDomainVector = await loadOwnDomainVector(opSlot);
      if (ownDomainVector === null) {
        throw makeError(
          "AnastomoseDependenciesError",
          "Eigene Spore noch nicht erzeugt oder ohne domainVector (slot=" + opSlot + ") — " +
            "SbkimSpore.generateOwnSpore(meta) zuerst.",
        );
      }
    }
    if (!(ownDomainVector instanceof Float32Array) || ownDomainVector.length !== EMBEDDING_DIM) {
      throw makeError(
        "AnastomoseDependenciesError",
        "ownDomainVector muss Float32Array(" + EMBEDDING_DIM + ") sein — Aufruf von handshake.",
      );
    }

    // 1. Spore-Verify (Signatur, id-Konsistenz, Hauptversion in 02 mit drin)
    var verifyTarget = await spore.verifyForeignSpore(targetSpore);
    if (!verifyTarget.valid) {
      throw makeError(
        "InvalidPeerSporeError",
        "Empfänger-Spore ungültig: " + verifyTarget.reason,
        verifyTarget.reason,
      );
    }

    // 2. Hauptversion (zusätzlicher expliziter Check, vgl. §4)
    if (majorVersion(targetSpore.protocolVersion) !== majorVersion(PROTOCOL_VERSION)) {
      throw makeError(
        "ProtocolVersionMismatchError",
        "Inkompatible Hauptversion: target=" + targetSpore.protocolVersion +
          ", lokal=" + PROTOCOL_VERSION + ".",
      );
    }

    // 3. Lokaler Vor-Check (nur wenn targetSpore.domainVector da ist)
    var preScore = null;
    if (Array.isArray(targetSpore.domainVector) && targetSpore.domainVector.length === EMBEDDING_DIM) {
      var peerVec = new Float32Array(targetSpore.domainVector);
      preScore = match.match(ownDomainVector, peerVec);
      if (!match.isAboveProviderThreshold(preScore)) {
        await logEntry(targetSpore.id, "abgelehnt: lokal", opSlot);
        return { outcome: "rejected-local", score: preScore };
      }
    }

    // 4. eigene Spore + privateKey laden (Bau 05.Y: für den aktiven Slot)
    var ownSpore = await spore.getOwnSpore(opSlot);
    if (!ownSpore) {
      throw makeError(
        "AnastomoseDependenciesError",
        "Eigene Spore noch nicht erzeugt (slot=" + opSlot + ") — " +
          "SbkimSpore.generateOwnSpore(meta) zuerst.",
      );
    }
    var privKey = await loadOwnPrivateKey(opSlot);
    var ident = await spore.getOrCreateIdentity(opSlot);
    var ownNodeId = ident.nodeId;

    // 5. HandshakeRequest bauen (kanonisch, signiert) — derselbe Request
    //    wird sowohl im HTTP- als auch im Channel-Pfad weitergereicht.
    var unsigned = {
      domainVector: Array.from(ownDomainVector),
      fromNodeId: ownNodeId,
      nonce: randomNonceB64(),
      protocolVersion: PROTOCOL_VERSION,
      senderSpore: ownSpore,
      timestamp: nowIso(),
      toNodeId: targetSpore.id,
    };
    var sig = await signEnvelope(unsigned, privKey);
    var signedUnsorted = {};
    var unsignedKeys = Object.keys(unsigned);
    for (var i = 0; i < unsignedKeys.length; i++) signedUnsorted[unsignedKeys[i]] = unsigned[unsignedKeys[i]];
    signedUnsorted.signature = sig;
    var request = canonicalize(signedUnsorted);

    // 5b. transport === "channel": HTTP-Pfad überspringen, direkt zum Channel.
    if (transport === "channel") {
      return await sendViaChannel(targetSpore, request, preScore, null, opSlot, effTimeoutMs);
    }

    // 6. POST mit Abort-Timeout (transport ∈ {"http", "auto"})
    var url = String(targetSpore.endpoint).replace(/\/$/, "") + ENDPOINT_ANASTOMOSIS;
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, effTimeoutMs);
    var response = null;
    var fetchErr = null;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
    } catch (err) {
      fetchErr = err;
    }
    clearTimeout(timeoutId);

    // 6a. Netz-/DNS-/Abort-Fehler ohne HTTP-Status — KEIN Auto-Fallback
    //     (Karte 05 § Auto-Fallback-Logik Punkt 3: bei DNS-Fehler ist
    //     Channel chancenlos, sofort werfen). Auch bei transport:"http".
    if (fetchErr) {
      if (fetchErr.name === "AbortError") {
        await logEntry(targetSpore.id, "timeout", opSlot);
        throw makeError(
          "HandshakeTimeoutError",
          "Anfrage an " + url + " > " + effTimeoutMs + " ms abgebrochen.",
          fetchErr,
        );
      }
      throw makeError(
        "HandshakeNetworkError",
        "Netz-Fehler bei " + url + ": " + (fetchErr && fetchErr.message ? fetchErr.message : fetchErr),
        fetchErr,
      );
    }

    // 6b. Body als JSON parsen (für Schema-Check). Bei Parse-Fehler bleibt
    //     httpJson null — shouldAutoFallback erkennt das als „non-JSON".
    var httpJson = null;
    try {
      httpJson = await response.json();
    } catch (e) {
      httpJson = null;
    }

    // 6c. Auto-Fallback-Entscheidung (nur bei transport:"auto").
    if (transport === "auto" && shouldAutoFallback(response, httpJson)) {
      var ctHeader = "";
      try { ctHeader = response.headers.get("Content-Type") || "(kein)"; } catch (e2) {}
      var httpCause = makeError(
        "HandshakeNetworkError",
        "HTTP-Antwort nicht verwertbar (Status " + response.status +
          ", Content-Type " + ctHeader + ") — Auto-Fallback auf BroadcastChannel-Pfad.",
      );
      return await sendViaChannel(targetSpore, request, preScore, httpCause, opSlot, effTimeoutMs);
    }

    // 6d. transport === "http": altes Verhalten — bei 4xx/5xx oder
    //     defektem Body werfen.
    if (!response.ok) {
      throw makeError(
        "HandshakeNetworkError",
        "HTTP " + response.status + " " + response.statusText + " bei " + url + ".",
      );
    }
    if (!httpJson) {
      throw makeError(
        "HandshakeNetworkError",
        "Antwort kein gültiges JSON bei " + url + ".",
      );
    }

    // 7. Antwort konsumieren (Verify, sibling-put, Log).
    return await consumeResponse(targetSpore, httpJson, preScore, opSlot);
  }

  async function consumeResponse(targetSpore, responseJson, preScore, opSlot) {
    var spore = getSpore();
    if (!responseJson || typeof responseJson !== "object") {
      throw makeError("HandshakeNetworkError", "Antwort ist kein Objekt.");
    }
    if (typeof responseJson.outcome !== "string") {
      throw makeError("HandshakeNetworkError", "Antwort ohne outcome-Feld.");
    }

    // receiverSpore prüfen
    var verifyReceiver = await spore.verifyForeignSpore(responseJson.receiverSpore);
    if (!verifyReceiver.valid) {
      await logEntry(targetSpore.id, "abgelehnt: invalid-peer", opSlot);
      throw makeError(
        "InvalidPeerSporeError",
        "receiverSpore ungültig: " + verifyReceiver.reason,
        verifyReceiver.reason,
      );
    }

    // Response-Signatur prüfen
    var sigOk = await verifyEnvelope(responseJson, responseJson.receiverSpore.publicKey);
    if (!sigOk) {
      await logEntry(targetSpore.id, "abgelehnt: invalid-peer", opSlot);
      throw makeError(
        "HandshakeSignatureInvalidError",
        "Response-Signatur gegen receiverSpore.publicKey ungültig.",
      );
    }

    if (responseJson.outcome === "established") {
      await upsertSibling({
        nodeId: responseJson.receiverSpore.id,
        domain: responseJson.receiverSpore.domain,
        endpoint: responseJson.receiverSpore.endpoint,
        pubKey: responseJson.receiverSpore.publicKey,
        since: nowIso(),
      }, opSlot);
      await logEntry(responseJson.receiverSpore.id, "established", opSlot);
      return {
        outcome: "established",
        peerNodeId: responseJson.receiverSpore.id,
        peerDomain: responseJson.receiverSpore.domain,
        score: typeof responseJson.score === "number" ? responseJson.score : preScore,
      };
    }

    // outcome:"rejected" oder anderer Wert — als rejected behandeln
    await logEntry(targetSpore.id, "abgelehnt: peer", opSlot);
    var result = {
      outcome: "rejected",
      reason: typeof responseJson.reason === "string" ? responseJson.reason : "(kein Grund mitgeschickt)",
    };
    if (typeof responseJson.score === "number") result.score = responseJson.score;
    return result;
  }

  // ---- receiveHandshake() ---- (wirft NIEMALS)
  //
  // Bau 17: receiveHandshake() ist ein Wrapper um _doReceiveHandshake(),
  // der nach Result-Resolve einmal `sbkim:handshake` mit
  // direction:"incoming" dispatcht. _doReceiveHandshake wirft per Spec
  // niemals — der Wrapper braucht kein try/catch.

  async function receiveHandshake(request) {
    var response = await _doReceiveHandshake(request);
    var outcome = (response && typeof response.outcome === "string") ? response.outcome : "rejected";
    var peerNodeId = null;
    // Eingehender Handshake: Peer ist Sender. Bei established/re-handshake
    // ist response.toNodeId der Sender (an wen wir antworten). Bei
    // rejected ohne Sender-Kontext kann das leer bleiben.
    if (response && typeof response.toNodeId === "string" && response.toNodeId.length > 0) {
      peerNodeId = response.toNodeId;
    } else if (request && request.senderSpore && typeof request.senderSpore.id === "string") {
      peerNodeId = request.senderSpore.id;
    }
    dispatchHandshakeEvent(outcome, peerNodeId, "incoming");
    return response;
  }

  async function _doReceiveHandshake(request) {
    try {
      await ensureReady();
      var spore = getSpore();
      var match = getMatch();

      // 1. Form-Check (Slot noch nicht bestimmt — Antwort mit aktivem
      //    Default signieren, das ist der konservative Pfad für
      //    malformede Requests).
      var missing = checkRequestFields(request);
      if (missing) {
        return await buildResponse({ outcome: "rejected", reason: "Form ungültig: " + missing }, request);
      }

      // 2. Sender-Spore
      var verifySender = await spore.verifyForeignSpore(request.senderSpore);
      if (!verifySender.valid) {
        return await buildResponse({ outcome: "rejected", reason: verifySender.reason || "senderSpore ungültig" }, request);
      }

      // 3. Hauptversion (Spec macht diesen Schritt zusätzlich explizit)
      if (majorVersion(request.protocolVersion) !== majorVersion(PROTOCOL_VERSION)) {
        return await buildResponse({
          outcome: "rejected",
          reason: "Inkompatible Hauptversion: " + request.protocolVersion,
        }, request);
      }

      // 4. Request-Signatur
      var sigOk = await verifyEnvelope(request, request.senderSpore.publicKey);
      if (!sigOk) {
        return await buildResponse({ outcome: "rejected", reason: "Request-Signatur ungültig" }, request);
      }

      // 5. Bau 05.Y: Receiver-Map-Lookup. toNodeId → targetSlotKey.
      //    - toNodeId in der Map → targetSlot ist die getroffene Persona.
      //    - toNodeId angegeben, aber nicht in der Map → rejected.
      //    - toNodeId fehlt/leer → Pre-Brief-04-Rückwärts-Kompat: aktiver
      //      Slot wird verwendet (legacy single-identity-Flow).
      var targetSlot;
      if (typeof request.toNodeId === "string" && request.toNodeId.length > 0) {
        var mapped = receiverMap.get(request.toNodeId);
        if (mapped === undefined) {
          return await buildResponse(
            { outcome: "rejected", reason: "toNodeId stimmt nicht zum Empfänger" },
            request,
          );
        }
        targetSlot = mapped;
      } else {
        targetSlot = activeSlotKey || DEFAULT_IDENTITY_KEY;
      }

      // Bau 05.Y: ab hier alles im Kontext des targetSlot.
      await ensureSlotStores(targetSlot);

      // 6. domainVector (request oder senderSpore); eigener Vektor aus
      //    der Spore des getroffenen Slots.
      var peerVec = pickPeerDomainVector(request);
      if (!peerVec) {
        return await buildResponse({ outcome: "rejected", reason: "kein domainVector verfügbar" }, request, targetSlot);
      }
      var ownVec = await loadOwnDomainVector(targetSlot);
      if (!ownVec) {
        return await buildResponse({ outcome: "rejected", reason: "kein domainVector verfügbar (lokal)" }, request, targetSlot);
      }

      // 7. Match
      var score = match.match(ownVec, peerVec);
      if (!match.isAboveProviderThreshold(score)) {
        await logEntry(request.senderSpore.id, "abgelehnt: score", targetSlot);
        return await buildResponse({ outcome: "rejected", reason: "score unterhalb Schwelle", score: score }, request, targetSlot);
      }

      // 8. sibling speichern (Reentry idempotent) — in den targetSlot-
      //    Store, NICHT in den globalen aktiven (Brief 04 § 9.4).
      var reentered = await upsertSibling({
        nodeId: request.senderSpore.id,
        domain: request.senderSpore.domain,
        endpoint: request.senderSpore.endpoint,
        pubKey: request.senderSpore.publicKey,
        since: nowIso(),
      }, targetSlot);
      await logEntry(request.senderSpore.id, reentered ? "re-handshake" : "established", targetSlot);

      // 9. Antwort signieren mit der getroffenen Persona.
      return await buildResponse({ outcome: "established", score: score }, request, targetSlot);
    } catch (err) {
      // Spec: receiveHandshake wirft niemals. Wenn doch (z.B. Storage-Crash),
      // versuchen wir eine signierte Rejection zu bauen — wenn auch das
      // scheitert, schicken wir eine unsignierte Notbremse. Der Sender wird
      // die unsignierte Variante über verifyEnvelope ablehnen — das ist
      // korrekt: bei totalem Empfänger-Ausfall darf nichts „valide"
      // antworten.
      try {
        return await buildResponse({
          outcome: "rejected",
          reason: "Interner Fehler: " + (err && err.message ? err.message : err),
        }, request || {});
      } catch (err2) {
        return {
          fromNodeId: "",
          nonceEcho: (request && typeof request.nonce === "string") ? request.nonce : "",
          outcome: "rejected",
          protocolVersion: PROTOCOL_VERSION,
          reason: "Interner Fehler ohne Signatur: " + (err2 && err2.message ? err2.message : err2),
          timestamp: nowIso(),
          toNodeId: (request && typeof request.fromNodeId === "string") ? request.fromNodeId : "",
        };
      }
    }
  }

  function checkRequestFields(req) {
    if (!req || typeof req !== "object") return "Request ist kein Objekt";
    for (var i = 0; i < REQUEST_REQUIRED_FIELDS.length; i++) {
      var f = REQUEST_REQUIRED_FIELDS[i];
      if (req[f] === undefined || req[f] === null) return "Pflichtfeld fehlt: " + f;
    }
    if (typeof req.senderSpore !== "object") return "senderSpore kein Objekt";
    return null;
  }

  function pickPeerDomainVector(request) {
    if (Array.isArray(request.domainVector) && request.domainVector.length === EMBEDDING_DIM) {
      return new Float32Array(request.domainVector);
    }
    if (request.senderSpore && Array.isArray(request.senderSpore.domainVector) &&
        request.senderSpore.domainVector.length === EMBEDDING_DIM) {
      return new Float32Array(request.senderSpore.domainVector);
    }
    return null;
  }

  async function buildResponse(extra, request, slotKey) {
    var spore = getSpore();
    // Bau 05.Y: ohne slot-Argument fällt buildResponse auf den
    // aktiven Slot zurück (Pre-Receiver-Map-Pfad, z.B. malformede
    // Requests). Mit Argument signiert die Antwort mit der GETROFFENEN
    // Persona — Brief 04 § 9.4.
    var sk = slotKey || activeSlotKey || DEFAULT_IDENTITY_KEY;
    var ownSpore = await spore.getOwnSpore(sk);
    if (!ownSpore) {
      throw makeError(
        "AnastomoseDependenciesError",
        "Eigene Spore fehlt (slot=" + sk + ") — Antwort kann nicht signiert werden.",
      );
    }
    var privKey = await loadOwnPrivateKey(sk);
    var ident = await spore.getOrCreateIdentity(sk);
    var ownNodeId = ident.nodeId;

    var unsigned = {
      fromNodeId: ownNodeId,
      nonceEcho: (request && typeof request.nonce === "string") ? request.nonce : "",
      outcome: extra.outcome,
      protocolVersion: PROTOCOL_VERSION,
      receiverSpore: ownSpore,
      timestamp: nowIso(),
      toNodeId: (request && typeof request.fromNodeId === "string") ? request.fromNodeId : "",
    };
    if (extra.reason !== undefined) unsigned.reason = extra.reason;
    if (extra.score !== undefined) unsigned.score = extra.score;

    var sig = await signEnvelope(unsigned, privKey);
    var signed = {};
    var keys = Object.keys(unsigned);
    for (var i = 0; i < keys.length; i++) signed[keys[i]] = unsigned[keys[i]];
    signed.signature = sig;
    return canonicalize(signed);
  }

  // ---- listSiblings / forgetSibling ----

  async function listSiblings() {
    // Bau 05.Y: liest aus dem Slot der AKTIVEN Identität. Persona-
    // übergreifende Sicht ist Aufrufer-Pflicht (`listIdentities()`
    // iterieren + `setActiveIdentity` + Re-Init).
    await ensureReady();
    var rows = await getStorage().all(siblingsStoreName(activeSlotKey));
    return rows.map(function (r) {
      return {
        nodeId: r.value.nodeId,
        domain: r.value.domain,
        since: r.value.since,
        pubKey: r.value.pubKey,
      };
    });
  }

  async function forgetSibling(nodeId) {
    // Bau 05.Y: vergisst aus dem Slot der AKTIVEN Identität. Wer
    // einen Sibling aus einer anderen Persona vergessen will, muss
    // vorher `setActiveIdentity` rufen + Modul 05 re-initialisieren.
    await ensureReady();
    var storage = getStorage();
    var storeName = siblingsStoreName(activeSlotKey);
    var existing = await storage.get(storeName, nodeId);
    if (existing === undefined) return; // idempotent
    await storage.del(storeName, nodeId);
  }

  // ---- Test-Brücken (Unterstrich-Präfix, inoffiziell) ----

  // Baut einen signierten HandshakeRequest mit einem extern beigesteuerten
  // CryptoKey + Spore. Erlaubt dem Panel, einen In-Memory-Pseudo-Knoten als
  // Sender zu simulieren, ohne in Modul 02's Singleton einzugreifen.
  async function _buildSignedRequest(senderPrivateKey, senderSpore, senderDomainVector, toNodeId) {
    if (!senderPrivateKey || typeof senderPrivateKey !== "object") {
      throw makeError("AnastomoseDependenciesError", "senderPrivateKey (CryptoKey) fehlt.");
    }
    if (!senderSpore || typeof senderSpore !== "object" || typeof senderSpore.id !== "string") {
      throw makeError("AnastomoseDependenciesError", "senderSpore (mit id) fehlt.");
    }
    var unsigned = {
      domainVector: senderDomainVector instanceof Float32Array
        ? Array.from(senderDomainVector)
        : Array.isArray(senderDomainVector) ? senderDomainVector.slice() : undefined,
      fromNodeId: senderSpore.id,
      nonce: randomNonceB64(),
      protocolVersion: PROTOCOL_VERSION,
      senderSpore: senderSpore,
      timestamp: nowIso(),
      toNodeId: typeof toNodeId === "string" ? toNodeId : undefined,
    };
    // undefined-Keys entfernen (canonicalize würde sie sonst als undefined drinlassen
    // — JSON.stringify entfernt sie zwar, aber sauberer ist's explizit)
    if (unsigned.domainVector === undefined) delete unsigned.domainVector;
    if (unsigned.toNodeId === undefined) delete unsigned.toNodeId;

    var sig = await signEnvelope(unsigned, senderPrivateKey);
    var signed = {};
    var ks = Object.keys(unsigned);
    for (var i = 0; i < ks.length; i++) signed[ks[i]] = unsigned[ks[i]];
    signed.signature = sig;
    return canonicalize(signed);
  }

  async function _verifyResponseSignature(response, receiverPublicKeyJwk) {
    return await verifyEnvelope(response, receiverPublicKeyJwk);
  }

  function _setOwnDomainVector(vec) {
    if (vec === null || vec === undefined) {
      ownDomainVectorOverride = null;
      return;
    }
    if (!(vec instanceof Float32Array) || vec.length !== EMBEDDING_DIM) {
      throw makeError(
        "AnastomoseDependenciesError",
        "_setOwnDomainVector erwartet Float32Array(" + EMBEDDING_DIM + ").",
      );
    }
    ownDomainVectorOverride = vec;
  }

  // Setzt den Default-Transport für handshake()-Aufrufe ohne explizite
  // options.transport. Nur Tests — Panel 05 forciert damit den
  // Channel-Pfad oder den reinen HTTP-Pfad ohne API-Eingriff am
  // handshake-Aufruf selbst.
  function _setTransport(t) {
    if (t === null || t === undefined) {
      transportDefault = "auto";
      return;
    }
    if (typeof t !== "string" || ALLOWED_TRANSPORTS.indexOf(t) === -1) {
      throw makeError(
        "InvalidTransportError",
        "_setTransport: '" + t + "' ist kein erlaubter Transport. " +
          "Erlaubt: 'auto' | 'http' | 'channel'.",
      );
    }
    transportDefault = t;
  }

  // Setzt den Default-Transport auf "auto" zurück. Reine Test-Cleanup-
  // Hilfe (z.B. nach Test 9a/9b/9c, damit Folge-Tests nicht still im
  // Channel-Pfad hängen). Der Main-Channel-Listener bleibt bestehen —
  // BroadcastChannel-Receiver-Disziplin lebt über die Tab-Lebensdauer.
  function _clearChannelState() {
    transportDefault = "auto";
  }

  // ---- public surface ----

  var SbkimAnastomose = {
    init: init,
    handshake: handshake,
    receiveHandshake: receiveHandshake,
    listSiblings: listSiblings,
    forgetSibling: forgetSibling,

    // Test-Brücken
    _invokeDirect: receiveHandshake,
    _buildSignedRequest: _buildSignedRequest,
    _verifyResponseSignature: _verifyResponseSignature,
    _setOwnDomainVector: _setOwnDomainVector,
    _setTransport: _setTransport,
    _clearChannelState: _clearChannelState,
    _postChannelEnvelope: postChannelEnvelope,
    _canonicalize: canonicalize,
    _base64urlEncode: base64urlEncode,
    _base64urlDecode: base64urlDecode,
    _signEnvelope: signEnvelope,
    _verifyEnvelope: verifyEnvelope,

    _meta: {
      protocolVersion: PROTOCOL_VERSION,
      queryTimeoutMs: QUERY_TIMEOUT_MS,
      endpointAnastomosis: ENDPOINT_ANASTOMOSIS,
      embeddingDim: EMBEDDING_DIM,
      // Bau 05.Y: Stores leben jetzt slot-suffixed. Die Basis-Namen
      // bleiben als Read-Anker, der Live-Zustand kommt aus den
      // Gettern unten.
      siblingsStoreBase: SIBLINGS_STORE_BASE,
      logStoreBase: LOG_STORE_BASE,
      get activeSlotKey() { return activeSlotKey; },
      get receiverMapSize() { return receiverMap ? receiverMap.size : 0; },
      requestRequiredFields: REQUEST_REQUIRED_FIELDS.slice(),
      responseRequiredFields: RESPONSE_REQUIRED_FIELDS.slice(),
      allowedTransports: ALLOWED_TRANSPORTS.slice(),
      broadcastChannelName: BROADCAST_CHANNEL_NAME,
      replyChannelPrefix: REPLY_CHANNEL_PREFIX,
    },
  };

  global.SbkimAnastomose = SbkimAnastomose;

  // Self-check: synchronous on script load. Format uniform across SBKIM —
  // see INTERFACES.md §1 Modul 05.
  if (typeof console !== "undefined" && console.info) {
    console.info(
      "MODUL 05 ANASTOMOSE bereit, Funktionen: " +
        "init/handshake/receiveHandshake/listSiblings/forgetSibling",
    );
  }
})(typeof window !== "undefined" ? window : globalThis);
