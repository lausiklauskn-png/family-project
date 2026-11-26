/* Marktplatz Spezial — das Herausgeber-Studio für Passkeys (Klaus 2026-11-26, Weg B).
 * Byte-gleich in family-project und PWA-Toolpoint. Die Seite gibt window.SPEZIAL mit (wie
 * assets/spezial-seite.js) und lädt vorher assets/spezial-kern.js.
 *
 * Wie in Private Brain Pro: der geheime Schlüssel entsteht und bleibt in DIESEM Browser,
 * verschlüsselt mit dem Studio-Passwort (PBKDF2 600 000 → AES-256-GCM). Klaus schickt nur
 * den öffentlichen Teil an Claude; er kommt in server/spezial/schluessel.json.
 * Je Markt ein eigener Schlüssel: family-projekt.de (FPK1) und PWA Toolpoint (TPK1).
 * Gesperrt wird mit einer vom selben Schlüssel unterschriebenen Erklärung — der Server
 * braucht dafür kein Passwort. */
(function () {
  "use strict";
  var C = window.SPEZIAL || {}, K = window.SpezialKern, M = K && K.MAERKTE[C.markt];
  var LS_KEY = "spezial_studio_" + C.markt, LS_LOG = "spezial_studio_log_" + C.markt;
  var noble = null, SERVER_KEYS = null;
  var SRC = document.currentScript ? document.currentScript.src : location.href;
  function nob() { return noble ? Promise.resolve(noble) : import(new URL("../sbkim/noble-secp256k1.js", SRC).href).then(function (m) { return (noble = m); }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lies(k, v) { try { var x = localStorage.getItem(k); return x ? JSON.parse(x) : v; } catch (e) { return v; } }
  function schreib(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function sag(id, text, gut) { var e = $(id); if (e) { e.textContent = text; e.className = "sps-meld" + (gut === true ? " sps-gut" : gut === false ? " sps-schlecht" : ""); } }
  function kopier(text, meld) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { sag(meld, "Kopiert.", true); }, function () { sag(meld, text); }); }

  function geheim(pw) {
    var box = lies(LS_KEY, null); if (!box) return Promise.reject(new Error("kein"));
    return K.oeffne(box, pw).catch(function () { throw new Error("pw"); });
  }

  function zeichne() {
    var box = lies(LS_KEY, null), log = lies(LS_LOG, []);
    var w = $("spezialStudio");
    var bekannt = box && SERVER_KEYS && SERVER_KEYS.indexOf(box.pub) >= 0;
    w.innerHTML =
      '<h2>🔑 Marktplatz Spezial · Passkeys für ' + esc(M.name) + "</h2>" +
      (!box
        ? '<section class="glass sps-teil"><h3>Herausgeber-Schlüssel anlegen</h3>' +
          '<p>Einmal je Seite. Der geheime Schlüssel bleibt verschlüsselt in diesem Browser. Danach den öffentlichen Schlüssel an Claude schicken.</p>' +
          '<input type="password" id="spsPw1" placeholder="Studio-Passwort (mindestens 10 Zeichen)" autocomplete="new-password">' +
          '<input type="password" id="spsPw2" placeholder="Passwort wiederholen" autocomplete="new-password">' +
          '<button class="btn primary" id="spsAnlegen">Schlüssel anlegen</button>' +
          '<h3>… oder aus einer Sicherung holen</h3>' +
          '<textarea id="spsSich" rows="2" placeholder="' + esc(M.studio) + '.…"></textarea>' +
          '<input type="password" id="spsSichPw" placeholder="Studio-Passwort der Sicherung">' +
          '<button class="btn" id="spsHolen">Aus Sicherung holen</button><p id="spsM0" class="sps-meld"></p></section>'
        : '<section class="glass sps-teil"><h3>Öffentlicher Schlüssel</h3>' +
          '<p><code class="sps-pub">' + esc(box.pub) + "</code></p>" +
          (bekannt ? '<p class="sps-gut">✓ Dieser Schlüssel steht auf dem Server. Passkeys gelten.</p>'
                   : SERVER_KEYS === null ? '<p class="sps-klein">Der Server antwortet gerade nicht; ob er den Schlüssel kennt, ist offen.</p>'
                   : '<p class="sps-schlecht">Noch nicht auf dem Server: diesen öffentlichen Schlüssel an Claude schicken. Bis dahin nimmt der Server keinen Passkey an.</p>') +
          '<button class="btn" id="spsPubKop">Öffentlichen Schlüssel kopieren</button> ' +
          '<button class="btn" id="spsSichKop">Schlüssel-Sicherung kopieren</button><p id="spsM1" class="sps-meld"></p>' +
          '<p class="sps-klein">Die Sicherung ist mit dem Studio-Passwort verschlüsselt. Gut aufheben (z. B. im Tresor). Ohne sie und ohne diesen Browser lassen sich keine neuen Passkeys machen.</p></section>' +
          '<section class="glass sps-teil"><h3>Passkey erstellen</h3>' +
          '<input type="text" id="spsName" maxlength="60" placeholder="Pseudonym des Käufers (wie beim Kauf angegeben)">' +
          '<fieldset class="sps-apps"><legend>Welche Apps?</legend>' + (C.apps || []).map(function (a) {
            return '<label><input type="checkbox" value="' + esc(a.id) + '"> ' + (a.bild ? '<img class="sps-sym" src="' + esc(a.bild) + '" alt="" width="22" height="22"> ' : "") + esc(a.name) + "</label>";
          }).join("") + "</fieldset>" +
          '<label class="sps-klein">Gültig bis (frei lassen = ohne Ablauf) <input type="date" id="spsBis"></label>' +
          '<input type="password" id="spsPw" placeholder="Studio-Passwort" autocomplete="current-password">' +
          '<button class="btn primary" id="spsMachen">Passkey erstellen</button><p id="spsM2" class="sps-meld"></p>' +
          '<textarea id="spsErgebnis" rows="3" readonly hidden></textarea><button class="btn" id="spsErgKop" hidden>Passkey kopieren</button></section>' +
          '<section class="glass sps-teil"><h3>Vergebene Passkeys (' + log.length + ")</h3>" +
          (log.length ? '<table class="sps-tab"><tr><th>Pseudonym</th><th>Apps</th><th>am</th><th></th></tr>' + log.slice().reverse().map(function (e) {
            return "<tr><td>" + esc(e.n) + "</td><td>" + esc(e.a.join(", ")) + "</td><td>" + esc(e.d) + (e.x ? " bis " + esc(e.x) : "") + "</td><td>" +
              (e.gesperrt ? "🚫 gesperrt" : '<button class="btn ghost" data-kop="' + esc(e.id) + '">Kopieren</button> <button class="btn ghost" data-sperr="' + esc(e.id) + '">Sperren</button>') + "</td></tr>";
          }).join("") + "</table>" : "<p>Noch keiner.</p>") +
          '<p class="sps-klein">Die Liste liegt nur in diesem Browser. Sperren braucht das Studio-Passwort (Feld oben) und Netz.</p><p id="spsM3" class="sps-meld"></p></section>');
    verdrahte();
  }

  function verdrahte() {
    var a = $("spsAnlegen");
    if (a) a.onclick = function () {
      var p1 = $("spsPw1").value, p2 = $("spsPw2").value;
      if (p1.length < 10 || p1 !== p2) return sag("spsM0", "Das Passwort braucht mindestens 10 Zeichen, beide Felder gleich.", false);
      sag("spsM0", "Wird angelegt …");
      nob().then(function (n) {
        var g = n.utils.randomPrivateKey(), pub = K.hex(n.schnorr.getPublicKey(g));
        return K.versiegle(g, p1, C.markt).then(function (box) { box.pub = pub; schreib(LS_KEY, box); zeichne(); });
      }).catch(function (e) { sag("spsM0", "Ging nicht: " + e.message, false); });
    };
    var h = $("spsHolen");
    if (h) h.onclick = function () {
      var m = new RegExp("^" + M.studio + "\\.([A-Za-z0-9_-]+)$").exec(String($("spsSich").value).replace(/\s+/g, ""));
      if (!m) return sag("spsM0", "Das ist keine Sicherung dieser Seite (sie beginnt mit „" + M.studio + ".“).", false);
      var box; try { box = JSON.parse(new TextDecoder().decode(K.unb64u(m[1]))); } catch (e) { return sag("spsM0", "Sicherung unlesbar.", false); }
      if (box.m !== C.markt) return sag("spsM0", "Diese Sicherung gehört zu einer anderen Seite.", false);
      Promise.all([K.oeffne(box, $("spsSichPw").value), nob()]).then(function (r) {
        if (K.hex(r[1].schnorr.getPublicKey(r[0])) !== box.pub) throw new Error("pub");
        schreib(LS_KEY, box); zeichne();
      }).catch(function () { sag("spsM0", "Die Sicherung passt nicht oder das Passwort stimmt nicht.", false); });
    };
    var pk = $("spsPubKop"); if (pk) pk.onclick = function () { kopier(lies(LS_KEY, {}).pub, "spsM1"); };
    var sk = $("spsSichKop"); if (sk) sk.onclick = function () { kopier(M.studio + "." + K.b64u(new TextEncoder().encode(JSON.stringify(lies(LS_KEY, {})))), "spsM1"); };
    var mk = $("spsMachen");
    if (mk) mk.onclick = function () {
      var name = $("spsName").value.trim(), apps = [].slice.call(document.querySelectorAll(".sps-apps input:checked")).map(function (i) { return i.value; });
      if (!name || !apps.length) return sag("spsM2", "Bitte Pseudonym eintragen und mindestens eine App wählen.", false);
      sag("spsM2", "Wird unterschrieben …");
      Promise.all([geheim($("spsPw").value), nob()]).then(function (r) {
        return K.erstelle(r[1], r[0], C.markt, name, apps, $("spsBis").value);
      }).then(function (c) {
        var log = lies(LS_LOG, []); log.push({ id: c.daten.id, n: c.daten.n, a: c.daten.a, d: c.daten.d, x: c.daten.x || "", text: c.text }); schreib(LS_LOG, log);
        zeichne();
        var e = $("spsErgebnis"); e.hidden = false; e.value = c.text; $("spsErgKop").hidden = false;
        $("spsErgKop").onclick = function () { kopier(c.text, "spsM2"); };
        sag("spsM2", "Passkey für " + c.daten.n + " — per Mail oder Nachricht schicken:", true);
      }).catch(function (e) { sag("spsM2", e.message === "pw" ? "Falsches Studio-Passwort." : "Ging nicht: " + e.message, false); });
    };
    var w = $("spezialStudio");
    w.onclick = function (ev) {
      var kb = ev.target.closest("[data-kop]");
      if (kb) { var e1 = lies(LS_LOG, []).find(function (x) { return x.id === kb.getAttribute("data-kop"); }); if (e1) kopier(e1.text, "spsM3"); return; }
      var sb = ev.target.closest("[data-sperr]"); if (!sb) return;
      var id = sb.getAttribute("data-sperr");
      if (!confirm("Diesen Passkey wirklich sperren? Das lässt sich nicht zurücknehmen.")) return;
      sag("spsM3", "Wird gesperrt …");
      Promise.all([geheim(($("spsPw") || {}).value || ""), nob()]).then(function (r) {
        return K.sperrErklaerung(r[1], r[0], C.markt, id);
      }).then(function (erkl) {
        return fetch(C.dienst + "/sperren", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erklaerung: erkl }) }).then(function (r) { return r.json(); });
      }).then(function (j) {
        if (!j || !j.ok) throw new Error(j && j.warum || "server");
        var log = lies(LS_LOG, []); log.forEach(function (x) { if (x.id === id) x.gesperrt = true; }); schreib(LS_LOG, log); zeichne();
        sag("spsM3", "✓ Gesperrt.", true);
      }).catch(function (e) { sag("spsM3", e.message === "pw" ? "Falsches Studio-Passwort (Feld „Studio-Passwort“ unter „Passkey erstellen“)." : "Ging nicht: " + e.message, false); });
    };
  }

  function start() {
    if (!$("spezialStudio") || !K || !M) return;
    zeichne();
    fetch(C.dienst + "/schluessel").then(function (r) { return r.json(); })
      .then(function (j) { SERVER_KEYS = (j && j[C.markt]) || []; zeichne(); }).catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
