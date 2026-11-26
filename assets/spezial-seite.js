/* Marktplatz Spezial — die Käufer-Seite (Klaus 2026-11-26, Weg B).
 * Byte-gleich in family-project und PWA-Toolpoint; die Seite gibt nur window.SPEZIAL mit:
 *   { markt: "fp"|"tp", dienst: "https://spezial.…", apps: [{id, name, bild, text, text_en}] }
 * Die Datei selbst hält keine Download-Adresse. Erst der Server gibt gegen einen gültigen
 * Passkey einen Link heraus, der 10 Minuten gilt.
 * Der Passkey bleibt nur in diesem Browser (localStorage), damit man ihn nicht jedes Mal tippt. */
(function () {
  "use strict";
  var C = window.SPEZIAL || {};
  var LS = "spezial_passkey_" + C.markt;
  var W = {
    de: {
      feld: "Passkey", pruefen: "Freischalten", vergessen: "Passkey hier vergessen", laeuft: "Wird geprüft …",
      ok: "✓ Freigeschaltet für {n}", nichtfrei: "nicht in deinem Passkey", ohne: "Mit einem Passkey kannst du hier laden.",
      android: "Android (APK)", windows: "Windows", keine: "noch keine Datei", holt: "Link wird geholt …",
      offline: "Der Server antwortet gerade nicht. Bitte später noch einmal.", fassung: "Fassung",
      warum: { form: "Das ist kein Passkey dieser Seite. Er beginnt mit „{p}.“ — bitte genau so einfügen, wie du ihn bekommen hast.",
        unterschrift: "Dieser Passkey passt nicht. Bitte genau so einfügen, wie du ihn bekommen hast.",
        markt: "Dieser Passkey gehört zu einer anderen Seite. Hier gelten Passkeys, die mit „{p}.“ beginnen.", anderer_markt: "Dieser Passkey gehört zu einer anderen Seite.",
        keinschluessel: "Die Freischaltung ist hier noch nicht eingerichtet.", gesperrt: "Dieser Passkey ist gesperrt.",
        abgelaufen: "Dieser Passkey ist abgelaufen.", zu_oft: "Zu viele Versuche. Bitte in zehn Minuten noch einmal.",
        app_nicht_frei: "Diese App ist nicht in deinem Passkey.", keine_datei: "Für diese App liegt gerade keine Datei bereit." }
    },
    en: {
      feld: "Passkey", pruefen: "Unlock", vergessen: "Forget the passkey here", laeuft: "Checking …",
      ok: "✓ Unlocked for {n}", nichtfrei: "not in your passkey", ohne: "With a passkey you can download here.",
      android: "Android (APK)", windows: "Windows", keine: "no file yet", holt: "Fetching link …",
      offline: "The server is not answering right now. Please try again later.", fassung: "Version",
      warum: { form: "This is not a passkey for this site. It starts with “{p}.” — please paste it exactly as you received it.",
        unterschrift: "This passkey does not fit. Please paste it exactly as you received it.",
        markt: "This passkey belongs to another site. Passkeys here start with “{p}.”.", anderer_markt: "This passkey belongs to another site.",
        keinschluessel: "Unlocking is not set up here yet.", gesperrt: "This passkey has been blocked.",
        abgelaufen: "This passkey has expired.", zu_oft: "Too many attempts. Please try again in ten minutes.",
        app_nicht_frei: "This app is not in your passkey.", keine_datei: "No file is ready for this app right now." }
    }
  };
  function sp() { return String(document.documentElement.lang || "de").slice(0, 2) === "en" ? "en" : "de"; }
  function t(k) { return W[sp()][k]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function mb(n) { return n ? (n / 1048576).toLocaleString(sp() === "en" ? "en" : "de", { maximumFractionDigits: 0 }) + " MB" : ""; }
  function praefix() { return C.markt === "tp" ? "TPK1" : "FPK1"; }
  function warum(w) { return (W[sp()].warum[w] || W[sp()].warum.unterschrift).replace("{p}", praefix()); }
  function holen(pfad, body) {
    var o = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
    return fetch(C.dienst + pfad, o).then(function (r) { return r.json(); });
  }

  var KATALOG = { apps: [] }, FREI = null, el = {};
  function lies() { try { return localStorage.getItem(LS) || ""; } catch (e) { return ""; } }
  function merke(v) { try { if (v) localStorage.setItem(LS, v); else localStorage.removeItem(LS); } catch (e) {} }

  function zeichne() {
    var stand = {}; (KATALOG.apps || []).forEach(function (a) { stand[a.id] = a; });
    el.liste.innerHTML = (C.apps || []).map(function (a) {
      var s = stand[a.id] || {}, frei = FREI && FREI.indexOf(a.id) >= 0;
      var knoepfe = ["android", "windows"].map(function (art) {
        var d = s[art];
        if (!d) return '<span class="sp-keine">' + esc(t(art)) + " · " + esc(t("keine")) + "</span>";
        var titel = esc(t("fassung") + " " + d.version + (d.groesse ? " · " + mb(d.groesse) : "") + (d.sha256 ? " · SHA-256 " + d.sha256 : ""));
        return '<button type="button" class="btn ' + (frei ? "primary" : "ghost") + '" data-app="' + esc(a.id) + '" data-art="' + art + '"' +
          (frei ? "" : " disabled") + ' title="' + titel + '">' + esc(t(art)) + ' <small>' + esc(d.version) + "</small></button>";
      }).join("");
      return '<div class="glass listing sp-karte" data-sp-app="' + esc(a.id) + '">' +
        '<div class="body"><h3 translate="no">' + (a.bild ? '<img class="sp-sym" src="' + esc(a.bild) + '" alt="" width="40" height="40" loading="lazy">' : "") + esc(a.name) + "</h3>" +
        "<p>" + esc(sp() === "en" && a.text_en ? a.text_en : a.text) + "</p>" +
        '<div class="listing-actions"><div class="listing-foot">' + knoepfe + "</div></div>" +
        (FREI && !frei ? '<p class="sp-hin">🔒 ' + esc(t("nichtfrei")) + "</p>" : "") +
        "</div></div>";
    }).join("");
  }

  function melde(text, gut) { el.meldung.textContent = text; el.meldung.className = "sp-meldung" + (gut ? " sp-gut" : text ? " sp-schlecht" : ""); }

  function pruefen(leise) {
    var v = String(el.feld.value || "").replace(/\s+/g, "");
    if (!v) { FREI = null; melde(""); zeichne(); return; }
    // Das Präfix verrät die Seite: ein Passkey der anderen Seite geht gar nicht erst hinaus.
    if (v.slice(0, 5) !== praefix() + ".") { FREI = null; melde(warum(/^[A-Z]{3}1\./.test(v) ? "markt" : "form")); zeichne(); return; }
    if (!leise) melde(t("laeuft"));
    holen("/pruefen", { passkey: v }).then(function (j) {
      if (j && j.ok) { FREI = j.apps || []; merke(v); melde(t("ok").replace("{n}", j.n || ""), true); el.vergessen.hidden = false; }
      else { FREI = null; melde(warum(j && j.warum)); if (j && (j.warum === "gesperrt" || j.warum === "abgelaufen")) merke(""); }
      zeichne();
    }).catch(function () { melde(t("offline")); });
  }

  function laden(app, art, knopf) {
    var v = String(el.feld.value || "").replace(/\s+/g, ""), alt = knopf.innerHTML;
    knopf.disabled = true; knopf.textContent = t("holt");
    holen("/link", { passkey: v, app: app, art: art }).then(function (j) {
      knopf.disabled = false; knopf.innerHTML = alt;
      if (j && j.ok && /^https:\/\//.test(j.url)) { location.href = j.url; return; }
      melde(warum(j && j.warum));
    }).catch(function () { knopf.disabled = false; knopf.innerHTML = alt; melde(t("offline")); });
  }

  function start() {
    var wurzel = document.getElementById("spezial"); if (!wurzel) return;
    wurzel.innerHTML =
      '<form class="searchrow sp-form" id="spForm" data-noocr autocomplete="off">' +
        '<div class="field"><input id="spPasskey" type="text" spellcheck="false" autocapitalize="off" placeholder="' + esc(praefix()) + '.…" aria-label="' + esc(t("feld")) + '"></div>' +
        '<button class="btn primary" type="submit">' + esc(t("pruefen")) + "</button>" +
      "</form>" +
      '<p class="sp-meldung" id="spMeldung" role="status" aria-live="polite">' + esc(t("ohne")) + "</p>" +
      '<p><button type="button" class="btn ghost sp-vergessen" id="spVergessen" hidden>' + esc(t("vergessen")) + "</button></p>" +
      '<div class="grid listings sp-liste" id="spListe"></div>';
    el = { feld: document.getElementById("spPasskey"), meldung: document.getElementById("spMeldung"), liste: document.getElementById("spListe"), vergessen: document.getElementById("spVergessen") };
    document.getElementById("spForm").addEventListener("submit", function (e) { e.preventDefault(); pruefen(false); });
    el.vergessen.addEventListener("click", function () { merke(""); el.feld.value = ""; FREI = null; el.vergessen.hidden = true; melde(t("ohne")); zeichne(); });
    el.liste.addEventListener("click", function (e) { var b = e.target.closest("button[data-app]"); if (b && !b.disabled) laden(b.getAttribute("data-app"), b.getAttribute("data-art"), b); });
    zeichne();
    holen("/apps").then(function (j) { KATALOG = j || { apps: [] }; zeichne(); }).catch(function () { melde(t("offline")); });
    var alt = lies(); if (alt) { el.feld.value = alt; pruefen(true); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  window.SpezialSeite = { _neu: start };
})();
