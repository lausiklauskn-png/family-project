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
      "--focus": "#ffe14d",
      "--glow": "0 0 26px rgba(157,92,255,.45),0 0 60px rgba(255,63,154,.20)",
      "--holo-text": "linear-gradient(100deg,#ff9ed4,#b69bff,#7fe8ff,#ffb0e0,#b69bff,#ff9ed4)",
      "--holo-border": "conic-gradient(from var(--rot),#ff3f9a,#9d5cff,#00c8f0,#ff3f9a,#b69bff,#ff3f9a)" } },
    { name: "Hell", vars: {
      "--bg": "#f4f6fa", "--bg2": "#eaeef4", "--card": "rgba(255,255,255,.72)", "--line": "rgba(20,30,45,.14)", "--header-bg": "rgba(244,246,250,.80)",
      "--text": "#16202c", "--muted": "#54637a", "--accent": "#0e8f86", "--accent2": "#6a4fd0", "--accent3": "#2f6df0",
      // Gold verschwindet auf Weiß. Auf dem hellen Thema markiert ein kräftiges
      // Blau — Kontrast gegen #f4f6fa rund 8:1, weit über der Norm-Grenze 3:1.
      "--focus": "#123fc9",
      "--glow": "0 8px 26px rgba(47,109,240,.16)",
      "--holo-text": "linear-gradient(100deg,#0e8f86,#2f6df0,#6a4fd0,#0e8f86,#2f6df0)",
      "--holo-border": "conic-gradient(from var(--rot),#0e8f86,#2f6df0,#6a4fd0,#0e8f86,#2f6df0)" } }
  ];
  var THEME_KEYS = ["--bg", "--bg2", "--card", "--line", "--text", "--muted", "--accent", "--accent2", "--accent3", "--header-bg", "--glow", "--holo-text", "--holo-border", "--focus"];
  var ti = 0;
  try { var st = parseInt(localStorage.getItem("fp_theme"), 10); if (st >= 0 && st < THEMES.length) ti = st; } catch (_e) {}
  /* Wird in init() gefüllt. applyTheme() läuft schon vorher (Theme aus dem
   * Speicher), darum muss es hier stehen und darf nichts tun, solange der
   * Knopf noch nicht verdrahtet ist. */
  var themeBtnNachziehen = function () {};

  function applyTheme(i) {
    ti = ((i % THEMES.length) + THEMES.length) % THEMES.length;
    try { localStorage.setItem("fp_theme", String(ti)); } catch (_e) {}
    var root = document.documentElement;
    THEME_KEYS.forEach(function (v) { root.style.removeProperty(v); });
    var th = THEMES[ti];
    Object.keys(th.vars).forEach(function (k) { root.style.setProperty(k, th.vars[k]); });
    var nameEl = document.getElementById("themeName");
    if (nameEl) nameEl.textContent = th.name;
    try { themeBtnNachziehen(); } catch (_e) {}   // Vorlese-Name folgt dem neuen Wort
    if (global.MycelBg && typeof global.MycelBg.setTheme === "function") {
      global.MycelBg.setTheme(th.name);
    }
  }

  /* ---- Mikrofon-Sprache ----------------------------------------------------
   *
   * Vorher stand hier `rec.lang = (lang === "en") ? "en-US" : "de-DE"` — die
   * Oberflächen-Sprache entschied, was das Mikrofon hört. Wer die Seite auf
   * Deutsch liest, aber Arabisch spricht, bekam Buchstabensalat. Klaus
   * 2026-08-11: „wenn ich in Arabisch etwas hineinspreche, muss auch Arabisch
   * als Text herauskommen."
   *
   * Die Browser-Spracherkennung hat KEINE Sprach-Erkennung: sie hört genau die
   * Sprache, die man ihr nennt, und eine abfragbare Liste der gekonnten
   * Sprachen gibt es nicht. Man kann eine Sprache also nur anbieten — und
   * sauber sagen, wenn es nicht ging (siehe micFehlerText/schriftPasstNicht).
   *
   * EINE Wahl für alle Mikrofone der Seite (Kopfleiste), nicht acht Auswahlen
   * neben acht Knöpfen: die 🎤 stecken absolut positioniert IN den Feldern,
   * dort ist kein Platz, und niemand stellt dieselbe Sprache achtmal ein. */
  var MIC_LANGS = [
    ["de-DE", "Deutsch"], ["en-US", "English"], ["ru-RU", "Русский (Russisch)"],
    ["ar-SA", "العربية (Arabisch)"], ["tr-TR", "Türkçe"], ["pl-PL", "Polski"],
    ["uk-UA", "Українська (Ukrainisch)"], ["fr-FR", "Français"],
    ["es-ES", "Español"], ["it-IT", "Italiano"],
    ["ps-AF", "پښتو (Paschtu)"], ["fa-IR", "دری / فارسی (Dari · Persisch)"]
  ];
  var LS_MICLANG = "fp_miclang";      // app-eigener Name: geteilter Origin

  /* Ohne Einstellung entscheidet die Geräte-Sprache. Das ist der Fall, der
   * zählt — wer erst eine Einstellung finden muss, um verstanden zu werden,
   * benutzt das Mikrofon nicht. Kennt die Liste die Sprache nicht, bleibt es
   * bei Deutsch: ehrliche Vorgabe statt Raten. */
  function micLangVorauswahl() {
    try {
      var gemerkt = localStorage.getItem(LS_MICLANG);
      for (var g = 0; g < MIC_LANGS.length; g++) if (MIC_LANGS[g][0] === gemerkt) return gemerkt;
    } catch (_e) {}
    var wunsch = [];
    try {
      wunsch = (navigator.languages && navigator.languages.length)
        ? navigator.languages : [navigator.language || ""];
    } catch (_e2) {}
    for (var i = 0; i < wunsch.length; i++) {
      var kurz = String(wunsch[i]).split("-")[0].toLowerCase();
      for (var j = 0; j < MIC_LANGS.length; j++) {
        if (MIC_LANGS[j][0].split("-")[0].toLowerCase() === kurz) return MIC_LANGS[j][0];
      }
    }
    return "de-DE";
  }
  var micLang = micLangVorauswahl();
  function micName(code) {
    for (var i = 0; i < MIC_LANGS.length; i++) if (MIC_LANGS[i][0] === code) return MIC_LANGS[i][1];
    return code;
  }

  /* Der STILLE Fehlschlag (Klaus' Sichttest 2026-08-11): Russisch und Arabisch
   * kamen richtig zurück, Paschtu kam als „Salaam" in LATEINISCHEN Buchstaben —
   * und OHNE Fehler. Chrome hat stillschweigend etwas anderes gehört. Eine
   * Fehlermeldung kann da nicht greifen, weil es keinen Fehler gibt; also wird
   * die Schrift geprüft. */
  var SCHRIFT_ERWARTET = {
    ar: [/[؀-ۿ]/, "arabischer"], fa: [/[؀-ۿ]/, "arabischer"],
    ps: [/[؀-ۿ]/, "arabischer"], ru: [/[Ѐ-ӿ]/, "kyrillischer"],
    uk: [/[Ѐ-ӿ]/, "kyrillischer"]
  };
  function schriftPasstNicht(text, code) {
    var kurz = String(code || "").split("-")[0].toLowerCase();
    var e = SCHRIFT_ERWARTET[kurz];
    if (!e || !text || text.trim().length < 4) return null;
    if (e[0].test(text)) return null;
    return "Der Browser hat vermutlich nicht in " + micName(code) +
      " gehört — der Text steht in lateinischer Schrift, nicht in " + e[1] +
      ". Du kannst ihn stehen lassen oder tippen.";
  }

  function micFehlerText(code, sprache) {
    var name = micName(sprache);
    if (code === "not-allowed" || code === "service-not-allowed") {
      return "Das Mikrofon ist nicht freigegeben. Im Browser die Erlaubnis erteilen — oder einfach tippen.";
    }
    if (code === "language-not-supported") {
      return "Dieser Browser kann " + name + " nicht hören. Eine andere Sprache wählen oder tippen.";
    }
    if (code === "no-speech") return "Nichts gehört. Noch einmal antippen und sprechen.";
    if (code === "audio-capture") return "Kein Mikrofon gefunden. Bitte tippen.";
    if (code === "network") return "Die Spracherkennung braucht Netz und bekam keines. Bitte tippen.";
    return "Die Spracherkennung in " + name + " hat nicht geklappt. Bitte tippen.";
  }

  /* Die Meldung braucht einen Platz, an dem man sie SIEHT. Vorher verschwand
   * jeder Fehler lautlos (`rec.onerror` tat nichts als das Leuchten abzuschalten).
   * `role="status"` heißt: Vorlese-Programme sagen sie an, ohne den Fokus zu
   * stehlen. */
  function micHinweisFeld(field) {
    var h = field.parentNode ? field.parentNode.querySelector(".mic-hinweis") : null;
    if (h) return h;
    h = document.createElement("div");
    h.className = "mic-hinweis";
    h.setAttribute("role", "status");
    if (field.parentNode) field.parentNode.insertBefore(h, field.nextSibling);
    return h;
  }
  function setMicHinweis(field, text) {
    try {
      var h = micHinweisFeld(field);
      h.textContent = text || "";
      h.style.display = text ? "" : "none";
    } catch (_e) {}
  }

  /* Ein Feld, in das arabisch gesprochen wird, muss von rechts lesen. `dir=auto`
   * lässt den Browser am INHALT entscheiden — richtiger als ein festes `dir`,
   * das lügt, sobald jemand die Sprache wechselt oder deutsch dazwischentippt. */
  function feldRichtung(input, code) {
    try {
      input.setAttribute("dir", "auto");
      input.setAttribute("lang", String(code || "").split("-")[0]);
    } catch (_e) {}
  }

  function mountMicLangPicker() {
    var nav = document.querySelector("nav.top");
    if (!nav) return;
    if (!document.querySelector(".mic")) return;              // keine Mikrofone → keine Wahl
    var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR) return;                                          // fail-soft: kein toter Knopf
    var sel = document.getElementById("fpMicLang");
    if (sel) return;                                          // idempotent
    sel = document.createElement("select");
    sel.id = "fpMicLang";
    sel.className = "pill pill-miclang";
    for (var i = 0; i < MIC_LANGS.length; i++) {
      var o = document.createElement("option");
      o.value = MIC_LANGS[i][0]; o.textContent = MIC_LANGS[i][1];
      sel.appendChild(o);
    }
    sel.value = micLang;
    var setLabel = function () {
      var de = getLang() === "de";
      sel.title = de ? "🎤 Sprache, in der du sprichst" : "🎤 language you speak";
      sel.setAttribute("aria-label", sel.title);
    };
    setLabel();
    global.addEventListener("fp:lang", setLabel);
    sel.addEventListener("change", function () {
      micLang = sel.value;
      try { localStorage.setItem(LS_MICLANG, micLang); } catch (_e) {}
    });
    var lb = document.getElementById("langBtn");
    if (lb && lb.parentNode === nav) nav.insertBefore(sel, lb.nextSibling); else nav.appendChild(sel);
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
    var on = false, gehoert = micLang, letzter = "";
    btn.addEventListener("click", function () {
      if (on) { try { rec.stop(); } catch (_e) {} return; }
      gehoert = micLang;                       // die Wahl gilt ab dem Antippen
      rec.lang = gehoert;
      letzter = "";
      feldRichtung(input, gehoert);
      setMicHinweis(field, "");
      try { rec.start(); } catch (_e) {}
    });
    rec.onstart = function () { on = true; btn.classList.add("live"); };
    rec.onend = function () {
      on = false; btn.classList.remove("live");
      var warnung = schriftPasstNicht(letzter, gehoert);
      if (warnung) setMicHinweis(field, warnung);
    };
    rec.onerror = function (e) {
      on = false; btn.classList.remove("live");
      setMicHinweis(field, micFehlerText(e && e.error, gehoert));
    };
    rec.onresult = function (e) {
      var txt = "";
      for (var i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      letzter = txt;
      input.value = txt;
      try { input.dispatchEvent(new Event("input", { bubbles: true })); } catch (_e) {}
    };
  }
  function wireAllMics() {
    mountMicLangPicker();
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
      (en ? "Text from photo: one-time setup" : "Text aus Foto: einmalig einrichten") + "</div>" +
      '<ol style="margin:0 0 12px;padding-left:20px;">' +
      "<li>" + (en ? "Open " : "Öffne ") +
      '<a href="https://console.mistral.ai/api-keys" target="_blank" rel="noopener" style="color:#7fb2ff;">console.mistral.ai/api-keys</a></li>' +
      "<li>" + (en ? "Create a key and copy it." : "Schlüssel erstellen und kopieren.") + "</li>" +
      "<li>" + (en ? "Paste it here. It stays only on this device." : "Hier einfügen. Bleibt nur auf diesem Gerät.") + "</li>" +
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
          alert(res && res.reason ? res.reason : (en ? "Text recognition not available, please type." : "Texterkennung nicht möglich, bitte tippen."));
        }
        done();
      }).catch(function (e) {
        alert(global.SbkimOcr ? global.SbkimOcr.ocrErrorHint(e) : (en ? "Not available, please type." : "Nicht möglich, bitte tippen."));
        done();
      });
    };
    fi.click();
  }

  // Fügt einem .field mit Text-Eingabe einen 📷-Knopf neben dem 🎤 hinzu.
  function addCamButton(field, input) {
    if (!field || !input || !global.SbkimOcr) return;   // ohne Modul 24 kein Knopf
    // Opt-out: Felder (oder ein Container) mit data-noocr bekommen KEINE Kamera.
    // Foto→Text ist z.B. im Marktplatz-Eintrag sinnlos (Titel/Link/Bild sind
    // getippte Adressen, keine abfotografierbaren Texte) — Klaus 2026-07-12.
    if (input.closest("[data-noocr]")) return;
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
      mountMicLangPicker();      // erst jetzt gibt es ein Mikrofon zu bedienen
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
  // NUR im Dev-Modus sichtbar (enthält u.a. WorkFloh — soll nicht
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
  // „Frisch laden"-Knopf: löscht Service-Worker-Registrierung + alle Caches und
  // lädt neu — so bekommt JEDER (auch am Handy, ohne Strg+Shift+R) die neueste
  // Version. Fail-soft + Sicherheits-Timeout, damit der Knopf nie hängen bleibt.
  function hardReload(btn) {
    if (btn) { btn.classList.add("spinning"); btn.setAttribute("aria-busy", "true"); }
    var reloaded = false;
    var done = function () {
      if (reloaded) return; reloaded = true;
      try { location.reload(); } catch (_e) { location.href = location.href; }
    };
    var tasks = [];
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
        tasks.push(navigator.serviceWorker.getRegistrations()
          .then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })
          .catch(function () {}));
      }
      if (global.caches && caches.keys) {
        tasks.push(caches.keys()
          .then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })
          .catch(function () {}));
      }
    } catch (_e) {}
    if (tasks.length) Promise.all(tasks).then(done, done); else done();
    setTimeout(done, 2500); // Fallback: nie hängen bleiben
  }

  /* ÜBERNIMMT den Knopf, der im HTML steht — er wird nicht mehr erzeugt.
   *
   * Warum das geändert wurde (Befund 2026-08-02, mit Lighthouse 13.4.1
   * gemessen): Bis hierher wurde die Pille erst zur Laufzeit in die Navleiste
   * gehängt. Auf einem langsamen Gerät ist die Seite da längst einmal gemalt.
   * Die Leiste wird durch den neuen Knopf breiter, bricht auf eine Zeile mehr
   * um, der Kopf wächst — und ALLES darunter rutscht nach. An markt.html war
   * das nach der Dock-Reserve der letzte verbliebene Sprung (0,164 CLS).
   *
   * Jetzt steht die Pille in jeder Seite fest im Markup, mit der deutschen
   * Beschriftung wie die Nachbar-Pillen auch. Hier wird sie nur noch verdrahtet
   * und übersetzt. Fehlt sie in einer Seite (Fremd-Kopie, alte Datei), wird sie
   * wie früher erzeugt — dann springt es dort eben, statt dass der Knopf fehlt.
   * Ein fehlender Knopf wäre der schlechtere Tausch. */
  function mountReloadButton() {
    var nav = document.querySelector("nav.top");
    if (!nav) return;
    var pill = document.getElementById("fpReload");
    var neu = !pill;
    if (neu) {
      pill = document.createElement("span");
      pill.className = "pill pill-reload";
      pill.id = "fpReload";
    }
    if (pill.dataset.fpWired === "1") return;   // nicht zweimal verdrahten
    pill.dataset.fpWired = "1";
    pill.setAttribute("role", "button");
    pill.tabIndex = 0;
    var setLabel = function () {
      var de = getLang() === "de";
      var wort = de ? "Aktualisieren" : "Refresh";
      pill.innerHTML = '<span class="rl-ic" aria-hidden="true">↻</span> ' + wort;
      pill.title = de ? "Seite frisch laden, holt die neueste Version (Cache leeren)"
                      : "Reload fresh, get the latest version (clear cache)";
      // Sichtbares Wort zuerst — sonst meldet Lighthouse zu Recht, dass
      // Gelesenes und Vorgelesenes auseinanderfallen (siehe nameMitSichtbarem).
      pill.setAttribute("aria-label", wort + (de ? " — Seite frisch laden" : " — reload page fresh"));
    };
    setLabel();
    global.addEventListener("fp:lang", setLabel);
    var go = function () { hardReload(pill); };
    pill.addEventListener("click", go);
    pill.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    if (neu) {
      var lb = document.getElementById("langBtn");
      if (lb && lb.parentNode === nav) nav.insertBefore(pill, lb); else nav.appendChild(pill);
    }
  }

  /* Macht aus einem <span> ein richtiges Bedien-Element (Befund 5.1, 2026-08-01).
   *
   * Sprache und Thema waren <span>-Elemente mit einem Klick-Handler. Ein <span>
   * bekommt keinen Tabulator-Halt — wer die Seite mit der Tastatur bedient, kam
   * an die beiden Funktionen GAR NICHT heran. Gemessen, nicht vermutet:
   * tests/smoke_knoepfe.mjs meldete es auf allen sechs Seiten.
   *
   * Warum kein echtes <button>: die Pillen stehen in jeder Seiten-Navleiste als
   * <span> im HTML. Sie umzuschreiben hieße, sechs Dateien anzufassen und das
   * gewachsene Aussehen der Leiste zu riskieren. `role` + `tabindex` + Tasten
   * geben dasselbe Verhalten, ohne die Optik anzurühren — dasselbe Muster, das
   * der Aktualisieren-Knopf (.pill-reload) schon fährt.
   *
   * Die Leertaste braucht `preventDefault`, sonst scrollt der Browser die Seite
   * weg, während er den Knopf bedient. */
  /* Der Vorlese-Name MUSS den sichtbaren Text enthalten (Befund 2026-08-02).
   *
   * Lighthouse meldete auf jeder Seite „label-content-name-mismatch" für die
   * drei Kopf-Knöpfe: sichtbar stand „DE / EN", vorgelesen wurde „Sprache
   * umschalten, Deutsch oder Englisch". Wer die Seite mit der Stimme bedient,
   * sagt aber, was er LIEST — und traf damit keinen dieser Knöpfe. Deshalb
   * steht der sichtbare Text jetzt vorn, die Erklärung dahinter.
   *
   * Der sichtbare Text wird bei jedem Aufruf frisch aus dem Element gelesen
   * statt mitgeschrieben. Sonst müsste jemand daran denken, ihn nachzuziehen,
   * wenn sich die Beschriftung ändert (das Thema heißt mal „Dunkel", mal
   * „Hell") — und genau daran denkt niemand. */
  function nameMitSichtbarem(el, erklaerung) {
    var sicht = String((el && el.textContent) || "").replace(/\s+/g, " ").trim();
    return sicht ? sicht + " — " + erklaerung : erklaerung;
  }

  function alsKnopf(el, aktion, label) {
    if (!el) return;
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    if (label) el.setAttribute("aria-label", label());
    el.addEventListener("click", aktion);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); aktion(); }
    });
    // Der Name muss die Sprache mitmachen, sonst ist er nach dem ersten
    // Umschalten falsch — schlimmer als keiner.
    if (label) global.addEventListener("fp:lang", function () { el.setAttribute("aria-label", label()); });
  }

  function init() {
    var lb = document.getElementById("langBtn");
    alsKnopf(lb, function () { applyLang(lang === "de" ? "en" : "de"); },
      function () { return nameMitSichtbarem(lb, getLang() === "de" ? "Sprache umschalten, Deutsch oder Englisch" : "switch language, German or English"); });
    var tb = document.getElementById("themeBtn");
    alsKnopf(tb, function () { applyTheme(ti + 1); },
      function () { return nameMitSichtbarem(tb, getLang() === "de" ? "Farbthema wechseln" : "switch colour theme"); });
    /* Der Themen-Knopf ändert seinen sichtbaren Text („Dunkel" → „Hell"), ohne
     * dass die Sprache wechselt. Ohne dieses Nachziehen bliebe der Vorlese-Name
     * beim alten Wort stehen — dann stimmte er wieder nicht mit dem überein,
     * was dasteht. `fp:lang` allein reicht dafür nicht. */
    themeBtnNachziehen = function () {
      if (tb) tb.setAttribute("aria-label",
        nameMitSichtbarem(tb, getLang() === "de" ? "Farbthema wechseln" : "switch colour theme"));
    };
    /* ── PAUSE-SCHALTER FUER DEN HINTERGRUND (Klaus 2026-09-02) ───────────
     *
     * Der Knopf steht fest im HTML, nicht nachtraeglich eingehaengt. Die
     * Kopfleiste hat `flex-wrap`, und ein spaeter dazukommendes Element
     * schiebt sie auf eine neue Zeile: 50 px auf einen Schlag, alles
     * darunter rutscht nach (Bauregeln Layout 1.2).
     *
     * ⚠ ER SCHALTET AUCH, WENN DER HINTERGRUND GAR NICHT LAEUFT. Auf einem
     * Geraet ohne Grafikchip wird three.js nie geholt, und `MycelBgPause`
     * gibt es dann nicht. Der Knopf sagt das dann und tut nichts, statt
     * stumm zu bleiben: ein toter Knopf mit Beschriftung ist die schlimmste
     * Sorte, er sieht aus wie Hilfe. */
    var pb = document.getElementById("bgPauseBtn");
    if (pb) {
      var pauseNachziehen = function () {
        /* Der Hintergrund ist die Auskunft, sobald es ihn gibt. Vorher steht
           die Wahrheit im Speicher — und die ist sofort lesbar, auch wenn
           three.js noch gar nicht geholt wurde. Der Schluessel steht auch in
           assets/mycel-bg.js; `smoke_hintergrund.mjs` haelt beide gleich. */
        var steht;
        if (window.MycelBgPause) {
          steht = window.MycelBgPause.steht();
        } else {
          try { steht = localStorage.getItem("fp_bg_pause") === "ja"; }
          catch (_e) { steht = false; }
        }
        var z = document.getElementById("bgPauseZeichen");
        var n = document.getElementById("bgPauseName");
        var de = getLang() === "de";
        /* Nur das Zeichen ist sichtbar; das Wort steht fuer Vorleseprogramme
           daneben und im `title`. Sonst waere der Knopf fuer Blinde stumm. */
        var wort = de
          ? (steht ? "Hintergrund-Bewegung fortsetzen" : "Hintergrund-Bewegung anhalten")
          : (steht ? "resume background motion" : "pause background motion");
        if (z) z.textContent = steht ? "\u25B6" : "\u23F8";
        if (n) n.textContent = wort;
        pb.setAttribute("title", wort);
        pb.setAttribute("aria-pressed", steht ? "true" : "false");
        pb.setAttribute("aria-label", wort);
      };
      alsKnopf(pb, function () {
        if (!window.MycelBgPause) {
          /* Kein bewegter Hintergrund auf diesem Geraet. Der Knopf sagt es
             an sich selbst, statt stumm zu bleiben oder eine Meldung zu
             rufen, die es nicht gibt. */
          var wort0 = getLang() === "de"
            ? "Der Hintergrund steht auf diesem Geraet ohnehin still."
            : "The background is already still on this device.";
          var n0 = document.getElementById("bgPauseName");
          if (n0) n0.textContent = wort0;
          pb.setAttribute("title", wort0);
          return;
        }
        window.MycelBgPause.umschalten();
        pauseNachziehen();
      }, function () {
        return nameMitSichtbarem(pb, getLang() === "de"
          ? "Hintergrund-Bewegung anhalten oder fortsetzen"
          : "pause or resume background motion");
      });
      /* Der Hintergrund wird erst nach `load` und im Leerlauf geholt. Beim
         ersten Nachziehen gibt es ihn also meistens noch nicht — deshalb
         meldet er sich, wenn er da ist. Eine feste Wartezeit waere ein
         Rennen: kommt er spaeter, stuende der Knopf dauerhaft falsch. */
      pauseNachziehen();
      global.addEventListener("fp:bg-bereit", pauseNachziehen);
      global.addEventListener("fp:lang", pauseNachziehen);
    }

    applyTheme(ti);
    applyLang(lang);
    wireAllMics();
    wireAllCams();
    wireHoloButtons();
    renderAppLinks();
    renderPublicAppLinks();
    renderToolButtons();
    mountReloadButton();
  }

  global.FP = {
    init: init, applyLang: applyLang, applyTheme: applyTheme,
    getLang: getLang, t: t, wireAllMics: wireAllMics,
    enhanceBareInputs: enhanceBareInputs, THEMES: THEMES
  };
})(typeof window !== "undefined" ? window : this);
