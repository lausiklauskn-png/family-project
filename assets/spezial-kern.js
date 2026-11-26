/* Marktplatz Spezial — Kern der Passkeys (Klaus 2026-11-26, Weg B).
 *
 * EINE Datei für Browser (Studio) und Server (server/spezial/dienst.mjs). Sie ist
 * byte-gleich in family-project und PWA-Toolpoint; nie in einem Depot allein ändern.
 *
 * Bauweise wie die Freischalt-Codes in Private Brain Pro (native/native-license.js):
 *   Passkey  = "<P>.<daten>.<unterschrift>"   P = FPK1 (family-projekt.de) | TPK1 (PWA Toolpoint)
 *   daten    = base64url(JSON {v:1, m, id, n, a, d, x?})
 *              m  = Markt ("fp" | "tp"), steht unter der Unterschrift
 *              id = Zufallskennung (für Sperre und Zähler), n = Pseudonym des Käufers,
 *              a  = Liste der App-Kennungen, d = Ausstellungstag, x = Ablauftag (frei)
 *   unterschrift = BIP-340 Schnorr (noble-secp256k1 1.7.1, dieselbe Datei wie im SBKIM-Netz)
 *                  über SHA-256("<P>." + daten)
 *   Sperre   = "<S>.<daten>.<unterschrift>"   S = FPS1 | TPS1, daten {v:1, m, sperrt:id, d}
 *              vom selben Herausgeber-Schlüssel unterschrieben — der Server braucht dafür
 *              kein Passwort und kein Geheimnis.
 *
 * Der geheime Schlüssel liegt nur im Studio-Browser, verschlüsselt (PBKDF2-SHA256 600 000 →
 * AES-256-GCM). Nie im Depot, nie auf dem Server.
 */
(function (wurzel, bau) {
  var kern = bau();
  if (typeof module === "object" && module.exports) module.exports = kern;
  else wurzel.SpezialKern = kern;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var MAERKTE = {
    fp: { name: "family-projekt.de", code: "FPK1", sperre: "FPS1", studio: "FPSTUDIO1" },
    tp: { name: "PWA Toolpoint", code: "TPK1", sperre: "TPS1", studio: "TPSTUDIO1" }
  };
  var enc = new TextEncoder(), dec = new TextDecoder();
  function sub() { return globalThis.crypto.subtle; }
  function b64u(bytes) {
    var s = ""; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function unb64u(text) {
    text = String(text);
    var s = atob(text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4));
    var out = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function hex(b) { var s = ""; for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? "0" : "") + b[i].toString(16); return s; }
  function unhex(h) { h = String(h); var o = new Uint8Array(h.length / 2); for (var i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; }
  function sha(bytes) { return sub().digest("SHA-256", bytes).then(function (b) { return new Uint8Array(b); }); }
  function heute() { return new Date().toISOString().slice(0, 10); }
  function zufall(n) { var b = new Uint8Array(n); globalThis.crypto.getRandomValues(b); return b; }

  // App-Kennungen: klein, Ziffern, Bindestrich. Was anderes kommt nicht unter die Unterschrift.
  var APP_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

  function zerlege(text, praefixe) {
    var m = /^([A-Z]{3}[0-9])\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(String(text || "").replace(/\s+/g, ""));
    if (!m || praefixe.indexOf(m[1]) < 0) return null;
    var daten; try { daten = JSON.parse(dec.decode(unb64u(m[2]))); } catch (e) { return null; }
    if (!daten || typeof daten !== "object") return null;
    return { praefix: m[1], koerper: m[2], sig: m[3], daten: daten, text: m[1] + "." + m[2] + "." + m[3] };
  }

  /* Prüft die Unterschrift gegen die Liste der öffentlichen Schlüssel EINES Marktes.
   * Antwort: {ok:true, daten, text} oder {ok:false, warum} — warum ∈
   *   "form" (kein Passkey dieses Marktes), "markt" (Daten nennen anderen Markt),
   *   "keinschluessel" (Markt hat noch keinen Herausgeber-Schlüssel), "unterschrift", "abgelaufen". */
  function pruefe(noble, text, markt, schluessel, art) {
    var M = MAERKTE[markt]; if (!M) return Promise.resolve({ ok: false, warum: "form" });
    var p = zerlege(text, [art === "sperre" ? M.sperre : M.code]);
    if (!p) return Promise.resolve({ ok: false, warum: "form" });
    if (p.daten.v !== 1 || p.daten.m !== markt) return Promise.resolve({ ok: false, warum: "markt" });
    var keys = (schluessel || []).filter(function (k) { return /^[0-9a-f]{64}$/.test(k); });
    if (!keys.length) return Promise.resolve({ ok: false, warum: "keinschluessel" });
    return sha(enc.encode(p.praefix + "." + p.koerper)).then(function (msg) {
      var sig = unb64u(p.sig), i = 0;
      function weiter() {
        if (i >= keys.length) return { ok: false, warum: "unterschrift" };
        var k = keys[i++];
        return Promise.resolve().then(function () { return noble.schnorr.verify(sig, msg, k); })
          .catch(function () { return false; })
          .then(function (gut) {
            if (!gut) return weiter();
            if (art !== "sperre") {
              if (typeof p.daten.id !== "string" || !Array.isArray(p.daten.a)) return { ok: false, warum: "form" };
              if (p.daten.x && String(p.daten.x) < heute()) return { ok: false, warum: "abgelaufen", daten: p.daten };
            }
            return { ok: true, daten: p.daten, text: p.text, schluessel: k };
          });
      }
      return weiter();
    });
  }

  function unterschreibe(noble, geheim, praefix, daten) {
    var koerper = b64u(enc.encode(JSON.stringify(daten)));
    return sha(enc.encode(praefix + "." + koerper))
      .then(function (msg) { return noble.schnorr.sign(msg, geheim); })
      .then(function (sig) { return praefix + "." + koerper + "." + b64u(sig); });
  }

  /* Neuer Passkey. apps: Liste von Kennungen. ablauf: "JJJJ-MM-TT" oder leer. */
  function erstelle(noble, geheim, markt, pseudonym, apps, ablauf) {
    var M = MAERKTE[markt]; if (!M) return Promise.reject(new Error("markt"));
    pseudonym = String(pseudonym || "").trim().slice(0, 60);
    apps = (apps || []).filter(function (a) { return APP_RE.test(a); });
    if (!pseudonym || !apps.length) return Promise.reject(new Error("leer"));
    var daten = { v: 1, m: markt, id: b64u(zufall(9)), n: pseudonym, a: apps, d: heute() };
    if (ablauf && /^\d{4}-\d{2}-\d{2}$/.test(ablauf)) daten.x = ablauf;
    return unterschreibe(noble, geheim, M.code, daten).then(function (text) { return { text: text, daten: daten }; });
  }

  function sperrErklaerung(noble, geheim, markt, id) {
    var M = MAERKTE[markt]; if (!M) return Promise.reject(new Error("markt"));
    return unterschreibe(noble, geheim, M.sperre, { v: 1, m: markt, sperrt: String(id), d: heute() });
  }

  // ── Studio-Schlüssel verschlüsselt ablegen (wie pb-studio-v1, eigene Kennung) ──
  function wickel(passwort, salz) {
    return sub().importKey("raw", enc.encode(passwort), "PBKDF2", false, ["deriveKey"]).then(function (basis) {
      return sub().deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salz, iterations: 600000 }, basis, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    });
  }
  function versiegle(geheim, passwort, markt) {
    var salz = zufall(16), iv = zufall(12);
    return wickel(passwort, salz).then(function (k) {
      return sub().encrypt({ name: "AES-GCM", iv: iv, additionalData: enc.encode("spezial-studio-" + markt) }, k, geheim);
    }).then(function (ct) { return { v: 1, m: markt, salz: b64u(salz), iv: b64u(iv), ct: b64u(new Uint8Array(ct)) }; });
  }
  function oeffne(kiste, passwort) {
    return wickel(passwort, unb64u(kiste.salz)).then(function (k) {
      return sub().decrypt({ name: "AES-GCM", iv: unb64u(kiste.iv), additionalData: enc.encode("spezial-studio-" + kiste.m) }, k, unb64u(kiste.ct));
    }).then(function (b) { return new Uint8Array(b); });
  }

  return {
    MAERKTE: MAERKTE, APP_RE: APP_RE,
    pruefe: pruefe, erstelle: erstelle, sperrErklaerung: sperrErklaerung,
    versiegle: versiegle, oeffne: oeffne, zerlege: zerlege,
    b64u: b64u, unb64u: unb64u, hex: hex, unhex: unhex, heute: heute
  };
});
