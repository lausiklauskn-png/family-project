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

  // ── Übergabe an den Käufer: Link, QR-Bild, auf Wunsch mit getrenntem Code (Klaus 2026-11-26) ──
  function qrLib() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    return new Promise(function (ok, nein) {
      var sc = document.createElement("script"); sc.src = new URL("qrcode-generator.js", SRC).href;
      sc.onload = function () { window.qrcode ? ok(window.qrcode) : nein(new Error("qr")); }; sc.onerror = function () { nein(new Error("qr")); };
      document.head.appendChild(sc);
    });
  }
  function linkVon(e) { return new URL("markt-spezial.html", location.href).href.split("#")[0] + "#" + (e.zu ? "z=" + e.zu : "k=" + e.text); }
  function qrBild(link, e) {
    return qrLib().then(function (qrcode) {
      var q = qrcode(0, "M"); q.addData(link); q.make();
      var n = q.getModuleCount(), B = 720, H = 940, rand = 4, feld = 560, zelle = feld / (n + 2 * rand), x0 = (B - feld) / 2, y0 = 170;
      var cv = document.createElement("canvas"); cv.width = B; cv.height = H;
      var g = cv.getContext("2d");
      g.fillStyle = "#0c1a2e"; g.fillRect(0, 0, B, H);
      g.fillStyle = "#ffffff"; g.beginPath(); if (g.roundRect) g.roundRect(x0 - 14, y0 - 14, feld + 28, feld + 28, 24); else g.rect(x0 - 14, y0 - 14, feld + 28, feld + 28); g.fill();
      g.fillStyle = "#000000";
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(Math.floor(x0 + (c + rand) * zelle), Math.floor(y0 + (r + rand) * zelle), Math.ceil(zelle), Math.ceil(zelle));
      g.textAlign = "center"; g.fillStyle = "#f2c14e"; g.font = "bold 44px system-ui, sans-serif"; g.fillText("🔑 Marktplatz Spezial", B / 2, 78);
      g.fillStyle = "#cfe3f5"; g.font = "28px system-ui, sans-serif"; g.fillText(M.name, B / 2, 124);
      g.fillStyle = "#ffffff"; g.font = "bold 32px system-ui, sans-serif"; g.fillText("für " + e.n, B / 2, y0 + feld + 76);
      g.fillStyle = "#cfe3f5"; g.font = "24px system-ui, sans-serif";
      g.fillText(e.zu ? "🔒 Mit Code verschlossen — den Code bekommst du getrennt." : "Scannen oder antippen: der Marktplatz öffnet sich freigeschaltet.", B / 2, y0 + feld + 120);
      g.fillText("Gilt für: " + (e.a || []).length + (e.a && e.a.length === 1 ? " App" : " Apps") + (e.x ? " · bis " + e.x : ""), B / 2, y0 + feld + 156);
      return new Promise(function (ok) { cv.toBlob(function (b) { ok({ blob: b, url: cv.toDataURL("image/png") }); }, "image/png"); });
    });
  }
  function dateiname(e) { return "Schluessel-" + String(e.n).replace(/[^A-Za-z0-9äöüÄÖÜß_-]+/g, "-").slice(0, 40) + ".png"; }
  function uebergabe(ziel, e) {
    var box = $(ziel); if (!box) return;
    var link = linkVon(e), teilen = !!navigator.share;
    box.hidden = false;
    box.innerHTML =
      '<p class="sps-gut">Übergabe für ' + esc(e.n) + ":</p>" +
      '<textarea rows="2" readonly class="sps-link">' + esc(link) + "</textarea>" + '<p class="sps-klein" data-u-kurz></p>' +
      '<div class="sps-reihe"><button class="btn primary" data-u="link">Link kopieren</button>' + (teilen ? '<button class="btn" data-u="teilen">Link teilen</button>' : "") + "</div>" +
      (e.code ? '<p class="sps-code">Code: <strong>' + esc(e.code) + '</strong></p><p class="sps-schlecht">⚠ Am sichersten getrennt vom Link, z. B. am Telefon oder per SMS. Über Signal in einer Nachricht geht auch, dann schützt der Code aber nicht mehr, falls die Nachricht später weitergeleitet wird.</p>' +
        '<div class="sps-reihe"><button class="btn" data-u="code">Code kopieren</button></div>' : "") +
      '<div class="sps-qr"><p class="sps-klein">QR-Schlüssel wird gezeichnet …</p></div>' +
      (e.code ? "" : '<p class="sps-klein">Oder nur den Passkey als Text: <button class="btn ghost" data-u="text">Passkey-Text kopieren</button></p>') +
      '<p class="sps-meld" data-u-meld></p>';
    var meld = box.querySelector("[data-u-meld]"); meld.id = ziel + "M";
    var bild = null;
    box.onclick = function (ev) {
      var b = ev.target.closest("[data-u]"); if (!b) return;
      var w = b.getAttribute("data-u");
      if (w === "link") kopier(link, meld.id);
      else if (w === "code") kopier(e.code, meld.id);
      else if (w === "text") kopier(e.text, meld.id);
      else if (w === "teilen") navigator.share({ title: "Marktplatz Spezial", text: "Dein Schlüssel für den Marktplatz Spezial (" + M.name + "). Tipp auf den Link. Öffnet sich die App statt des Browsers: dort „Marktplatz Spezial“ öffnen und den Link ins Passkey-Feld einfügen.", url: link }).catch(function () {});
      else if (w === "bildteilen" && bild) {
        var f = new File([bild.blob], dateiname(e), { type: "image/png" });
        navigator.share({ files: [f], title: "Marktplatz Spezial" }).catch(function () {});
      }
    };
    function qrZeichnen() {
      qrBild(link, e).then(function (b) {
        bild = b;
        var kannBild = teilen && navigator.canShare && navigator.canShare({ files: [new File([b.blob], "x.png", { type: "image/png" })] });
        box.querySelector(".sps-qr").innerHTML = '<img src="' + b.url + '" alt="QR-Schlüssel für ' + esc(e.n) + '" width="240" height="313">' +
          '<div class="sps-reihe"><a class="btn" download="' + esc(dateiname(e)) + '" href="' + b.url + '">Bild speichern</a>' + (kannBild ? '<button class="btn" data-u="bildteilen">Bild teilen</button>' : "") + "</div>";
      }, function () { box.querySelector(".sps-qr").innerHTML = '<p class="sps-schlecht">Der QR-Schlüssel ließ sich nicht zeichnen. Der Link geht trotzdem.</p>'; });
    }
    // Kurzlink (Klaus 2026-11-27): nur für verschlossene Passkeys. Der Server legt NUR den verschlossenen Teil ab,
    // 3 Tage. Kommt er nicht, bleibt der lange Link – er geht genauso, nur unhandlicher.
    var kz = box.querySelector("[data-u-kurz]");
    if (e.zu && e.text && C.dienst && window.fetch) {
      kz.textContent = "Kurzlink wird geholt …";
      fetch(C.dienst + "/kurz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passkey: e.text, zu: e.zu }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok || !/^https:\/\/[^\s"<>]+\/k\/[A-Za-z0-9_-]+$/.test(j.url || "")) throw new Error("kurz");
          link = j.url; box.querySelector(".sps-link").value = link;
          kz.textContent = "Kurzlink, gilt 3 Tage (bis " + new Date(j.bis).toLocaleDateString("de-DE") + "). Danach hier neu holen.";
          kz.className = "sps-klein sps-gut";
        }, function () { kz.textContent = "Kurzlink gerade nicht zu bekommen – der lange Link geht genauso."; kz.className = "sps-klein"; })
        .then(qrZeichnen);
    } else qrZeichnen();
  }

  // Gerätebindung (Klaus 2026-11-27): je Passkey höchstens 2 Geräte. Die Zahl fragt der Dienst – ohne Gerätekennung,
  // also zählt das Studio selbst nie als Gerät.
  function geraeteZeigen() {
    if (!C.dienst || !window.fetch) return;
    var log = lies(LS_LOG, []);
    [].slice.call(document.querySelectorAll("[data-geraete]")).forEach(function (sp) {
      var id = sp.getAttribute("data-geraete"), e = log.find(function (x) { return x.id === id; });
      if (!e || !e.text) { sp.textContent = "–"; return; }
      fetch(C.dienst + "/pruefen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passkey: e.text }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok || typeof j.geraete !== "number") { sp.textContent = "–"; return; }
          sp.textContent = j.geraete + " von " + j.max;
          var b = document.querySelector('[data-frei="' + id + '"]'); if (b && j.geraete > 0) b.style.display = "";
        }, function () { sp.textContent = "–"; });
    });
  }

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
      (box ? '<p class="sps-schritte">So geht es: Namen des Kunden eintragen · Apps anhaken · Studio-Passwort · „Passkey erstellen“ · Link oder QR-Bild weitergeben.</p>' : "") +
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
        : '<section class="glass sps-teil"><h3>Passkey erstellen</h3>' +
          '<input type="text" id="spsName" maxlength="60" placeholder="Pseudonym des Käufers (wie beim Kauf angegeben)">' +
          '<fieldset class="sps-apps"><legend>Welche Apps?</legend>' + (C.apps || []).map(function (a) {
            return '<label><input type="checkbox" value="' + esc(a.id) + '"> ' + (a.bild ? '<img class="sps-sym" src="' + esc(a.bild) + '" alt="" width="22" height="22"> ' : "") + esc(a.name) + "</label>";
          }).join("") + '<p class="sps-klein sps-voll">Ein Passkey gilt je App für beide Fassungen: Android (APK) und Windows (Installer).</p></fieldset>' +
          '<label class="sps-klein">Gültig bis (frei lassen = ohne Ablauf) <input type="date" id="spsBis"></label>' +
          '<input type="password" id="spsPw" placeholder="Studio-Passwort" autocomplete="current-password">' +
          '<label class="sps-klein"><input type="checkbox" id="spsMitCode"> Mit Code verschließen: Link und QR-Bild gehen nur zusammen mit einem Code auf, den du getrennt sagst (z. B. am Telefon).</label>' +
          '<button class="btn primary" id="spsMachen">Passkey erstellen</button><p id="spsM2" class="sps-meld"></p>' +
          '<div id="spsUeb" class="sps-ueb" hidden></div></section>' +
          '<section class="glass sps-teil"><h3>Vergebene Passkeys (' + log.length + ")</h3>" +
          (log.length ? '<table class="sps-tab"><tr><th>Pseudonym</th><th>Apps</th><th>am</th><th>Geräte</th><th></th></tr>' + log.slice().reverse().map(function (e) {
            return "<tr><td>" + esc(e.n) + "</td><td>" + esc(e.a.join(", ")) + "</td><td>" + esc(e.d) + (e.x ? " bis " + esc(e.x) : "") + "</td><td>" +
              (e.gesperrt ? "" : '<span data-geraete="' + esc(e.id) + '">…</span>') + "</td><td>" +
              (e.gesperrt ? "🚫 gesperrt" : '<div class="sps-knoepfe">' + (e.code ? '<span class="sps-zu">🔒 mit Code</span>' : "") + '<button class="btn ghost" data-kop="' + esc(e.id) + '">Übergabe</button><button class="btn ghost" data-sperr="' + esc(e.id) + '">Sperren</button><button class="btn ghost" data-frei="' + esc(e.id) + '" style="display:none">Geräte zurücksetzen</button></div>') + "</td></tr>";
          }).join("") + "</table>" : "<p>Noch keiner.</p>") +
          '<div id="spsUeb3" class="sps-ueb" hidden></div>' +
          '<p class="sps-klein">Die Liste liegt nur in diesem Browser. Sperren braucht das Studio-Passwort (Feld bei „Passkey erstellen“) und Netz.</p><p id="spsM3" class="sps-meld"></p></section>' +
          '<section class="glass sps-teil"><h3>Öffentlicher Schlüssel</h3>' +
          '<p><code class="sps-pub">' + esc(box.pub) + "</code></p>" +
          (bekannt ? '<p class="sps-gut">✓ Dieser Schlüssel steht auf dem Server. Passkeys gelten.</p>'
                   : SERVER_KEYS === null ? '<p class="sps-klein">Der Server antwortet gerade nicht; ob er den Schlüssel kennt, ist offen.</p>'
                   : '<p class="sps-schlecht">Noch nicht auf dem Server: diesen öffentlichen Schlüssel an Claude schicken. Bis dahin nimmt der Server keinen Passkey an.</p>') +
          '<button class="btn" id="spsPubKop">Öffentlichen Schlüssel kopieren</button> ' +
          '<button class="btn" id="spsSichKop">Schlüssel-Sicherung kopieren</button><p id="spsM1" class="sps-meld"></p>' +
          '<p class="sps-klein">Die Sicherung ist mit dem Studio-Passwort verschlüsselt. Gut aufheben (z. B. im Tresor). Ohne sie und ohne diesen Browser lassen sich keine neuen Passkeys machen.</p></section>');
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
      var mitCode = $("spsMitCode").checked;
      Promise.all([geheim($("spsPw").value), nob()]).then(function (r) {
        return K.erstelle(r[1], r[0], C.markt, name, apps, $("spsBis").value);
      }).then(function (c) {
        var e = { id: c.daten.id, n: c.daten.n, a: c.daten.a, d: c.daten.d, x: c.daten.x || "", text: c.text };
        if (!mitCode) return e;
        e.code = K.neuerCode();
        return K.einwickeln(c.text, e.code, C.markt).then(function (zu) { e.zu = zu; return e; });
      }).then(function (e) {
        var log = lies(LS_LOG, []); log.push(e); schreib(LS_LOG, log);
        zeichne();
        uebergabe("spsUeb", e);
        sag("spsM2", "✓ Passkey für " + e.n + " erstellt.", true);
      }).catch(function (e) { sag("spsM2", e.message === "pw" ? "Falsches Studio-Passwort." : "Ging nicht: " + e.message, false); });
    };
    geraeteZeigen();
    var w = $("spezialStudio");
    w.onclick = function (ev) {
      var kb = ev.target.closest("[data-kop]");
      if (kb) { var e1 = lies(LS_LOG, []).find(function (x) { return x.id === kb.getAttribute("data-kop"); }); if (e1) { uebergabe("spsUeb3", e1); $("spsUeb3").scrollIntoView({ block: "nearest" }); } return; }
      var fb = ev.target.closest("[data-frei]");
      if (fb) {
        var fid = fb.getAttribute("data-frei");
        if (!confirm("Die Geräte dieses Passkeys zurücksetzen? Danach darf er wieder auf 2 neuen Geräten laden.")) return;
        sag("spsM3", "Wird zurückgesetzt …");
        Promise.all([geheim(($("spsPw") || {}).value || ""), nob()]).then(function (r) {
          return K.freigabeErklaerung(r[1], r[0], C.markt, fid);
        }).then(function (erkl) {
          return fetch(C.dienst + "/sperren", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erklaerung: erkl }) }).then(function (r) { return r.json(); });
        }).then(function (j) {
          if (!j || !j.ok) throw new Error(j && j.warum || "server");
          zeichne(); sag("spsM3", "✓ Geräte zurückgesetzt. Der Passkey darf wieder auf 2 neuen Geräten laden.", true);
        }).catch(function (e) { sag("spsM3", e.message === "pw" ? "Falsches Studio-Passwort (Feld bei „Passkey erstellen“)." : "Ging nicht: " + e.message, false); });
        return;
      }
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
