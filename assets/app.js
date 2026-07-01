/* ============================================================================
 * Family Projekt — geteilte Seiten-Logik (alle Seiten).
 *   - Themen Dunkel/Neon/Hell (persistiert, Hintergrund-Farben mit-umschalten)
 *   - Sprache DE/EN (persistiert), data-i18n / data-i18n-ph
 *   - Mikrofon automatisch an JEDEM Textfeld (Web Speech, fail-soft)
 * Seiten ergänzen Texte über window.FP_PAGE_I18N (vor app.js gesetzt) und
 * rufen FP.init() am Ende auf.
 * ========================================================================== */
(function (global) {
  "use strict";

  // ---- Basis-Texte (Kopf/Fuß/Nav) — Seiten erweitern via FP_PAGE_I18N ------
  var BASE_I18N = {
    de: {
      nav_start: "Start", nav_tools: "Werkzeuge", nav_market: "Marktplatz",
      nav_network: "Netzwerk",
      imprint: "Impressum & Datenschutz",
      footer_back: "← zur Startseite",
      search_ph: "Beschreib in eigenen Worten, was du suchst …",
      search_btn: "Suchen"
    },
    en: {
      nav_start: "Home", nav_tools: "Tools", nav_market: "Marketplace",
      nav_network: "Network",
      imprint: "Imprint & Privacy",
      footer_back: "← back to home",
      search_ph: "Describe in your own words what you're looking for …",
      search_btn: "Search"
    }
  };

  function mergeI18N() {
    var page = global.FP_PAGE_I18N || {};
    var out = { de: {}, en: {} };
    ["de", "en"].forEach(function (l) {
      var src = BASE_I18N[l] || {}, ext = page[l] || {}, k;
      for (k in src) out[l][k] = src[k];
      for (k in ext) out[l][k] = ext[k];
    });
    return out;
  }
  var I18N = mergeI18N();

  // ---- Sprache -------------------------------------------------------------
  var lang = "de";
  try { var sl = localStorage.getItem("fp_lang"); if (sl === "de" || sl === "en") lang = sl; } catch (_e) {}

  function applyLang(l) {
    lang = (l === "en") ? "en" : "de";
    try { localStorage.setItem("fp_lang", lang); } catch (_e) {}
    document.documentElement.lang = lang;
    var dict = I18N[lang] || {};
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (dict[k] != null) el.textContent = dict[k];
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-ph");
      if (dict[k] != null) el.setAttribute("placeholder", dict[k]);
    });
    try { renderAppLinks(); } catch (_e) {}
    try { renderToolButtons(); } catch (_e) {}
    try { global.dispatchEvent(new CustomEvent("fp:lang", { detail: { lang: lang } })); } catch (_e) {}
  }
  function getLang() { return lang; }
  function t(key) { return (I18N[lang] && I18N[lang][key] != null) ? I18N[lang][key] : key; }

  // ---- Themen --------------------------------------------------------------
  var THEMES = [
    { name: "Dunkel", vars: {} },
    { name: "Neon", vars: {
      "--bg": "#08081a", "--bg2": "#0e0e22", "--card": "rgba(20,16,40,.55)", "--line": "rgba(157,92,255,.28)", "--header-bg": "rgba(8,8,26,.6)",
      "--text": "#ece4ff", "--muted": "#a79ad0", "--accent": "#ff3f9a", "--accent2": "#9d5cff", "--accent3": "#00c8f0",
      "--glow": "0 0 26px rgba(157,92,255,.45),0 0 60px rgba(255,63,154,.20)",
      "--holo-text": "linear-gradient(100deg,#ff9ed4,#b69bff,#7fe8ff,#ffb0e0,#b69bff,#ff9ed4)",
      "--holo-border": "conic-gradient(from var(--rot),#ff3f9a,#9d5cff,#00c8f0,#ff3f9a,#b69bff,#ff3f9a)" } },
    { name: "Hell", vars: {
      "--bg": "#f4f6fa", "--bg2": "#eaeef4", "--card": "rgba(255,255,255,.72)", "--line": "rgba(20,30,45,.14)", "--header-bg": "rgba(244,246,250,.80)",
      "--text": "#16202c", "--muted": "#54637a", "--accent": "#0e8f86", "--accent2": "#6a4fd0", "--accent3": "#2f6df0",
      "--glow": "0 8px 26px rgba(47,109,240,.16)",
      "--holo-text": "linear-gradient(100deg,#0e8f86,#2f6df0,#6a4fd0,#0e8f86,#2f6df0)",
      "--holo-border": "conic-gradient(from var(--rot),#0e8f86,#2f6df0,#6a4fd0,#0e8f86,#2f6df0)" } }
  ];
  var THEME_KEYS = ["--bg", "--bg2", "--card", "--line", "--text", "--muted", "--accent", "--accent2", "--accent3", "--header-bg", "--glow", "--holo-text", "--holo-border"];
  var ti = 0;
  try { var st = parseInt(localStorage.getItem("fp_theme"), 10); if (st >= 0 && st < THEMES.length) ti = st; } catch (_e) {}

  function applyTheme(i) {
    ti = ((i % THEMES.length) + THEMES.length) % THEMES.length;
    try { localStorage.setItem("fp_theme", String(ti)); } catch (_e) {}
    var root = document.documentElement;
    THEME_KEYS.forEach(function (v) { root.style.removeProperty(v); });
    var th = THEMES[ti];
    Object.keys(th.vars).forEach(function (k) { root.style.setProperty(k, th.vars[k]); });
    var nameEl = document.getElementById("themeName");
    if (nameEl) nameEl.textContent = th.name;
    if (global.MycelBg && typeof global.MycelBg.setTheme === "function") {
      global.MycelBg.setTheme(th.name);
    }
  }

  // ---- Mikrofon: automatisch an jedem .mic-Knopf in einem .field -----------
  function wireMic(btn) {
    var field = btn.closest(".field");
    var input = field ? field.querySelector("input,textarea") : null;
    if (!input) return;
    var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR) {
      btn.style.opacity = ".5";
      btn.title = (lang === "en") ? "Speech input not available in this browser" : "Spracheingabe in diesem Browser nicht verfügbar";
      btn.disabled = true;
      return;
    }
    var rec = new SR(); rec.interimResults = true; rec.continuous = false;
    var on = false;
    btn.addEventListener("click", function () {
      if (on) { try { rec.stop(); } catch (_e) {} return; }
      rec.lang = (lang === "en") ? "en-US" : "de-DE";
      try { rec.start(); } catch (_e) {}
    });
    rec.onstart = function () { on = true; btn.classList.add("live"); };
    rec.onend = function () { on = false; btn.classList.remove("live"); };
    rec.onerror = function () { on = false; btn.classList.remove("live"); };
    rec.onresult = function (e) {
      var txt = "";
      for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      input.value = txt;
      try { input.dispatchEvent(new Event("input", { bubbles: true })); } catch (_e) {}
    };
  }
  function wireAllMics() {
    document.querySelectorAll(".mic").forEach(wireMic);
  }

  // ---- Kamera/OCR: 📷 Foto → Text an jedem Feld (Geschwister zum 🎤) --------
  // Nutzt Modul 24 (SbkimOcr): Foto/Screenshot → Text, EU/Mistral BYOK, fail-soft.
  // Der 📷-Knopf erscheint NUR, wenn Modul 24 geladen ist; ohne Schlüssel führt
  // der erste Klick durch eine schlanke 1·2·3-Schlüssel-Fläche. Der Schlüssel
  // bleibt lokal (localStorage, nur dieses Gerät) — kein PII, kein Schlüssel im Code.
  var OCR_KEY_LS = "fp_ocr_key";
  function getOcrKey() {
    try { return localStorage.getItem(OCR_KEY_LS) || ""; } catch (_e) { return ""; }
  }
  function setOcrKey(k) {
    try { if (k) localStorage.setItem(OCR_KEY_LS, k); else localStorage.removeItem(OCR_KEY_LS); } catch (_e) {}
  }

  var _ocrFileInput = null;
  function ocrFileInput() {
    if (_ocrFileInput) return _ocrFileInput;
    var f = document.createElement("input");
    f.type = "file"; f.accept = "image/*"; f.style.display = "none";
    f.setAttribute("aria-hidden", "true");
    document.body.appendChild(f);
    _ocrFileInput = f;
    return f;
  }

  // Schlanke Schlüssel-Fläche (Schritte 1·2·3 + Direktlink). Kein Framework.
  function ocrKeyModal(onSaved) {
    var en = (lang === "en");
    var ov = document.createElement("div");
    ov.setAttribute("role", "dialog");
    ov.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:16px;";
    var box = document.createElement("div");
    box.style.cssText = "max-width:420px;width:100%;background:#12151c;color:#e7ecf3;border:1px solid #2a3140;border-radius:14px;padding:20px;font:15px/1.5 system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.5);";
    box.innerHTML =
      '<div style="font-size:17px;font-weight:600;margin-bottom:10px;">📷 ' +
      (en ? "Text from photo — one-time setup" : "Text aus Foto — einmalig einrichten") + "</div>" +
      '<ol style="margin:0 0 12px;padding-left:20px;">' +
      "<li>" + (en ? "Open " : "Öffne ") +
      '<a href="https://console.mistral.ai/api-keys" target="_blank" rel="noopener" style="color:#7fb2ff;">console.mistral.ai/api-keys</a></li>' +
      "<li>" + (en ? "Create a key and copy it." : "Schlüssel erstellen und kopieren.") + "</li>" +
      "<li>" + (en ? "Paste it here — stays only on this device." : "Hier einfügen — bleibt nur auf diesem Gerät.") + "</li>" +
      "</ol>";
    var inp = document.createElement("input");
    inp.type = "password"; inp.placeholder = en ? "Mistral API key" : "Mistral-API-Schlüssel";
    inp.style.cssText = "width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid #2a3140;background:#0c0f15;color:#e7ecf3;margin-bottom:12px;";
    inp.value = getOcrKey();
    box.appendChild(inp);
    var btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";
    function mkBtn(label, primary) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = label;
      b.style.cssText = "padding:8px 14px;border-radius:8px;border:1px solid #2a3140;cursor:pointer;font:inherit;" +
        (primary ? "background:#2f6bff;color:#fff;border-color:#2f6bff;" : "background:#1b1f28;color:#c7cfda;");
      return b;
    }
    var cancel = mkBtn(en ? "Cancel" : "Abbrechen", false);
    var save = mkBtn(en ? "Save" : "Speichern", true);
    btnRow.appendChild(cancel); btnRow.appendChild(save);
    box.appendChild(btnRow);
    ov.appendChild(box);
    function close() { try { document.body.removeChild(ov); } catch (_e) {} }
    cancel.addEventListener("click", close);
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    save.addEventListener("click", function () {
      var k = inp.value.trim();
      setOcrKey(k);
      close();
      if (k && typeof onSaved === "function") onSaved(k);
    });
    document.body.appendChild(ov);
    try { inp.focus(); } catch (_e) {}
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error || new Error("read failed")); };
      r.readAsDataURL(file);
    });
  }

  function runOcr(input, camBtn) {
    var en = (lang === "en");
    if (!global.SbkimOcr) return;
    var fi = ocrFileInput();
    fi.value = "";
    fi.onchange = function () {
      var file = fi.files && fi.files[0];
      if (!file) return;
      var key = getOcrKey();
      if (!key) { ocrKeyModal(function () { camBtn.click(); }); return; }
      var prev = camBtn.textContent;
      camBtn.disabled = true; camBtn.classList.add("live"); camBtn.textContent = "⏳";
      function done() { camBtn.disabled = false; camBtn.classList.remove("live"); camBtn.textContent = prev; }
      fileToDataUrl(file).then(function (dataUrl) {
        return global.SbkimOcr.recognize(dataUrl, { apiKey: key, mimeType: file.type || "image/png" });
      }).then(function (res) {
        if (res && res.available && res.text) {
          var cur = input.value ? (input.value + " ") : "";
          input.value = cur + String(res.text).replace(/\s+/g, " ").trim();
          try { input.dispatchEvent(new Event("input", { bubbles: true })); } catch (_e) {}
        } else {
          alert(res && res.reason ? res.reason : (en ? "Text recognition not available — please type." : "Texterkennung nicht möglich — bitte tippen."));
        }
        done();
      }).catch(function (e) {
        alert(global.SbkimOcr ? global.SbkimOcr.ocrErrorHint(e) : (en ? "Not available — please type." : "Nicht möglich — bitte tippen."));
        done();
      });
    };
    fi.click();
  }

  // Fügt einem .field mit Text-Eingabe einen 📷-Knopf neben dem 🎤 hinzu.
  function addCamButton(field, input) {
    if (!field || !input || !global.SbkimOcr) return;   // ohne Modul 24 kein Knopf
    if (field.querySelector(".cam")) return;             // idempotent
    var cam = document.createElement("button");
    cam.type = "button"; cam.className = "mic cam";
    cam.title = (lang === "en") ? "Text from photo" : "Text aus Foto";
    cam.setAttribute("aria-label", cam.title);
    cam.textContent = "📷";
    field.appendChild(cam);
    cam.addEventListener("click", function () { runOcr(input, cam); });
  }
  function wireAllCams() {
    if (!global.SbkimOcr) return;
    document.querySelectorAll(".field").forEach(function (field) {
      var input = field.querySelector("input,textarea");
      if (input) addCamButton(field, input);
    });
  }

  // Rüstet blanke Text-Eingaben (außerhalb eines .field, ohne data-nomic) mit
  // einem Mikrofon nach — für Klaus' Regel „Mikrofon in JEDEM Textfeld" auch
  // bei dynamisch eingehängten Feldern (z.B. Andock-Wizard). Idempotent.
  function enhanceBareInputs(root) {
    var scope = root || document;
    var sel = 'textarea, input[type="text"], input[type="search"], input[type="url"]';
    scope.querySelectorAll(sel).forEach(function (input) {
      if (input.closest(".field") || input.getAttribute("data-nomic") != null) return;
      var field = document.createElement("span");
      field.className = "field";
      field.style.flex = "1 1 auto";
      input.parentNode.insertBefore(field, input);
      field.appendChild(input);
      var mic = document.createElement("button");
      mic.type = "button"; mic.className = "mic";
      mic.title = "Sprechen statt tippen"; mic.setAttribute("aria-label", "Spracheingabe");
      mic.textContent = "🎤";
      field.appendChild(mic);
      wireMic(mic);
      addCamButton(field, input);
    });
  }

  // Holografischer Schimmer folgt der Maus IM Button (Theme-Farben via CSS).
  // Delegation am Dokument → gilt auch für dynamisch eingehängte Buttons.
  function wireHoloButtons() {
    if (wireHoloButtons._done) return; wireHoloButtons._done = true;
    // Gilt für alle Buttons UND große Flächen (Karten, Bild des Tages …).
    var SEL = ".btn,.pill,.mic,.area,.disc-shot,.listing,nav.top a,.fp-doodle-title";
    var CARD = ".area,.disc-shot,.listing";   // große Flächen → sanfter
    document.addEventListener("pointermove", function (e) {
      var b = e.target && e.target.closest && e.target.closest(SEL);
      if (!b) return;
      var max = b.matches(CARD) ? 5.5 : 9; // Grad — Neigung zum Cursor (3D-Brechung)
      var r = b.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      b.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      b.style.setProperty("--my", (py * 100).toFixed(1) + "%");
      b.style.setProperty("--ry", ((px - 0.5) * 2 * max).toFixed(2) + "deg");
      b.style.setProperty("--rx", (-(py - 0.5) * 2 * max).toFixed(2) + "deg");
    }, { passive: true });
    document.addEventListener("pointerout", function (e) {
      var b = e.target && e.target.closest && e.target.closest(SEL);
      if (!b) return;
      ["--mx", "--my", "--rx", "--ry"].forEach(function (v) { b.style.removeProperty(v); });
    }, { passive: true });
  }

  // Dev-Modus (gleiche Konvention wie sbkim-init.js): ?dev in der URL oder
  // localStorage fp_dev=1. Bauphasen-Elemente bleiben öffentlich verborgen.
  function isDev() {
    try {
      if (/[?&]dev\b/.test(location.search)) { localStorage.setItem("fp_dev", "1"); return true; }
      if (/[?&]nodev\b/.test(location.search)) { localStorage.removeItem("fp_dev"); return false; }
      return localStorage.getItem("fp_dev") === "1";
    } catch (_e) { return false; }
  }

  // Footer-Schnell-Links zu Klaus' PWAs (Bauphase), aus window.FP_MYAPPS.
  // NUR im Dev-Modus sichtbar (enthält u.a. WorkFloh/ISD⁺ — soll nicht
  // dauerhaft öffentlich verlinkt sein, Brief Phase 3 + meineapps.js-Hinweis).
  function renderAppLinks() {
    if (!isDev()) return;
    var cfg = global.FP_MYAPPS;
    var footer = document.querySelector("footer");
    if (!cfg || !cfg.apps || !cfg.apps.length || !footer) return;
    var bar = footer.querySelector(".applinks");
    if (!bar) {
      var row = document.createElement("div"); row.className = "wrap";
      bar = document.createElement("div"); bar.className = "applinks";
      var lbl = document.createElement("span"); lbl.className = "lbl"; bar.appendChild(lbl);
      cfg.apps.forEach(function (a) {
        if (!a || !/^https?:\/\//i.test(a.url || "")) return;
        var link = document.createElement("a");
        link.className = "btn ghost slim"; link.href = a.url;
        link.target = "_blank"; link.rel = "noopener noreferrer";
        link.textContent = a.name || a.url;
        bar.appendChild(link);
      });
      row.appendChild(bar);
      var frow = footer.querySelector(".frow");
      if (frow && frow.parentNode) frow.parentNode.insertBefore(row, frow.nextSibling);
      else footer.insertBefore(row, footer.firstChild);
    }
    var lblEl = bar.querySelector(".lbl");
    if (lblEl) lblEl.textContent = (lang === "en" ? cfg.labelEn : cfg.labelDe) || "";
  }

  // Öffentliche Footer-Schnell-Links zu Klaus' FREIGEGEBENEN Apps, aus
  // window.FP_PUBLICAPPS. IMMER sichtbar (nicht dev-gated, Klaus 2026-06-27:
  // „Platzierung auf jeder Seite unten"). Nur Apps mit eigenem Impressum sind
  // hier gelistet (Mein Tresor / Jasons Tresor / BookLedgerPro / WorkFloh nicht).
  function renderPublicAppLinks() {
    var cfg = global.FP_PUBLICAPPS;
    var footer = document.querySelector("footer");
    if (!cfg || !cfg.apps || !cfg.apps.length || !footer) return;
    var bar = footer.querySelector(".pubapplinks");
    if (!bar) {
      var row = document.createElement("div"); row.className = "wrap";
      bar = document.createElement("div"); bar.className = "applinks pubapplinks";
      var lbl = document.createElement("span"); lbl.className = "lbl"; bar.appendChild(lbl);
      cfg.apps.forEach(function (a) {
        if (!a || !/^https?:\/\//i.test(a.url || "")) return;
        var link = document.createElement("a");
        link.className = "btn ghost slim"; link.href = a.url;
        link.target = "_blank"; link.rel = "noopener noreferrer";
        link.textContent = a.name || a.url;
        bar.appendChild(link);
      });
      row.appendChild(bar);
      // Ganz unten in den Footer (unter die Standard-Zeile/frow).
      footer.appendChild(row);
    }
    var lblEl = bar.querySelector(".lbl");
    if (lblEl) lblEl.textContent = (lang === "en" ? cfg.labelEn : cfg.labelDe) || "";
  }

  // Prominente Werkzeug-Knöpfe ganz unten: das semantische Such-Werkzeug + die
  // Pinnwand (beide eigenständige PWAs aus Sage, als Knoten nicht verbunden —
  // reiner Direkt-Link). Auf jeder Seite, immer sichtbar (Klaus 2026-06-29).
  var FP_TOOL_BTNS = [
    { de: "🔍 Such-Werkzeug", en: "🔍 Search tool",
      url: "https://lausiklauskn-png.github.io/Sage-Protokol/such-tool/" },
    { de: "📌 Pinnwand", en: "📌 Pinboard",
      url: "https://lausiklauskn-png.github.io/Sage-Protokol/pinnwand/" }
  ];
  function renderToolButtons() {
    var footer = document.querySelector("footer");
    if (!footer || footer.querySelector(".toolbtns")) {
      // schon da → nur Labels nachziehen
      var ex = footer && footer.querySelector(".toolbtns");
      if (ex) {
        var lblE = ex.querySelector(".lbl");
        if (lblE) lblE.textContent = (lang === "en" ? "Tools:" : "Werkzeuge:");
        ex.querySelectorAll("a.btn").forEach(function (a, i) {
          if (FP_TOOL_BTNS[i]) a.textContent = lang === "en" ? FP_TOOL_BTNS[i].en : FP_TOOL_BTNS[i].de;
        });
      }
      return;
    }
    var row = document.createElement("div"); row.className = "wrap";
    var bar = document.createElement("div"); bar.className = "applinks toolbtns";
    var lbl = document.createElement("span"); lbl.className = "lbl";
    lbl.textContent = (lang === "en" ? "Tools:" : "Werkzeuge:");
    bar.appendChild(lbl);
    FP_TOOL_BTNS.forEach(function (a) {
      var link = document.createElement("a");
      link.className = "btn primary"; link.href = a.url;
      link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = lang === "en" ? a.en : a.de;
      bar.appendChild(link);
    });
    row.appendChild(bar);
    footer.appendChild(row);
  }

  // ---- Init ----------------------------------------------------------------
  function init() {
    var lb = document.getElementById("langBtn");
    if (lb) lb.addEventListener("click", function () { applyLang(lang === "de" ? "en" : "de"); });
    var tb = document.getElementById("themeBtn");
    if (tb) tb.addEventListener("click", function () { applyTheme(ti + 1); });
    applyTheme(ti);
    applyLang(lang);
    wireAllMics();
    wireAllCams();
    wireHoloButtons();
    renderAppLinks();
    renderPublicAppLinks();
    renderToolButtons();
  }

  global.FP = {
    init: init, applyLang: applyLang, applyTheme: applyTheme,
    getLang: getLang, t: t, wireAllMics: wireAllMics,
    enhanceBareInputs: enhanceBareInputs, THEMES: THEMES
  };
})(typeof window !== "undefined" ? window : this);
