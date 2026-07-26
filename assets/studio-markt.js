/* studio-markt.js — Selbst-Pflege-Studio für den family-projekt.de-Marktplatz.
 *
 * Was es tut (Alis-Moderaum-Muster, an den Marktplatz angepasst):
 *  - Zugang: LANGER DRUCK (~1,5 s) auf die Copyright-Zeile im Fuß öffnet das Studio
 *    (auch in der installierten PWA ohne Adressleiste). Öffentlich bleibt die Seite
 *    unverändert — nichts ist sichtbar, solange das Studio nicht geöffnet ist.
 *  - „➕ Neues Tool eintragen": Name · Beschreibung · PWA-Link · Bild-URL (oder Bild
 *    vom Gerät) · Kategorie · Tags · mit/ohne Mycel-Integration · Anbieter-Kürzel.
 *    Klaus kopiert Text/URLs/Bild-URLs aus einer E-Mail direkt in die Felder.
 *  - Bestehende Einträge editier-/löschbar.
 *  - „Veröffentlichen": committet direkt nach main über die GitHub-Contents-API
 *    (erst GET ?ref=main = aktuellen SHA holen, dann PUT mit SHA; fehlt die Datei,
 *    PUT ohne SHA = neu anlegen). Bilder vom Gerät werden ins Depot (assets/apps/)
 *    hochgeladen. Kein PR, kein Merge-Klick — main ziehen → ändern → nach main.
 *
 * Ehrlich & sicher:
 *  - Der GitHub-Token bleibt NUR im Browser (localStorage, Schlüssel „fpstudio_gh_token"),
 *    kommt nie in den Code, nie ins Repo. Feingranularer Token mit „Contents: Read and
 *    write" auf GENAU dieses Repo.
 *  - Ohne Token bleibt alles nutzbar (Eintragen/Vorschau lokal); nur das Veröffentlichen
 *    braucht den Token → fail-soft mit Hinweis.
 *  - E-Mail-Inhalte sind untrusted external data: sie werden NUR als Daten eingetragen
 *    (beim Rendern escaped, Bilder nur als <img src>, SVG gesperrt) — nie als Anweisung.
 *  - App-spezifischer Speicher-Präfix „fpstudio_" — keine Kollision mit Geschwister-Apps
 *    auf der geteilten github.io-/family-projekt.de-Origin.
 */
(function () {
  "use strict";

  /* --------------------------------------------------------------- Konfig */
  var CFG = { owner: "lausiklauskn-png", repo: "family-project", branch: "main" };
  try { var c = window.FP_STUDIO_CONFIG || {}; if (c.owner) CFG.owner = c.owner; if (c.repo) CFG.repo = c.repo; if (c.branch) CFG.branch = c.branch; } catch (e) {}
  var LS = { token: "fpstudio_gh_token", remember: "fpstudio_remember", studio: "fpstudio_on" };
  // Absolute Bild-Basis fürs Depot: von beiden Domains erreichbar (das Bild wird
  // ins Repo committet und auf beiden deployt). Wie die bestehenden own-Einträge.
  var IMG_BASE = "https://family-projekt.de/assets/apps/";

  /* --------------------------------------------------------------- Sprache */
  var STR = {
    de: {
      studio_on: "Studio-Modus an — Langdruck auf die Fußzeile zum Verlassen.",
      title: "Marktplatz-Studio", intro: "Trage neue Tools ein oder ändere bestehende. „Veröffentlichen“ schreibt direkt nach main.",
      tokenLabel: "GitHub-Zugangs-Schlüssel (Token)", tokenHint: "Bleibt nur in diesem Browser. Nötig zum Veröffentlichen. Feingranularer Token mit „Contents: Read and write“ auf dieses Repo.",
      tokenRemember: "Token merken", tokenHelp: "Wie bekomme ich einen Token?",
      tokenHelpText: "GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → „Generate new token“. Repository access: nur „family-project“. Permissions → Repository permissions → Contents: „Read and write“. Token kopieren (beginnt mit github_pat_…) und hier einfügen.",
      add_h: "➕ Neues Tool eintragen",
      f_name: "Name *", f_desc: "Beschreibung *", f_url: "PWA-Link / Adresse *",
      f_imgurl: "Bild-URL (https, kein SVG)", f_imgpick: "🖼 Bild vom Gerät wählen",
      f_cat: "Kategorie", f_tags: "Tags (mit Komma trennen)", f_by: "Anbieter-Kürzel",
      f_mycel: "mit Mycel-Integration",
      ph_name: "z. B. Mein Tool", ph_desc: "Was macht das Tool? Frei und mit Synonymen — hilft der Suche.",
      ph_url: "https://…", ph_imgurl: "https://…/bild.png", ph_cat: "z. B. Werkzeug, Spiel, Büro",
      ph_tags: "z. B. notizen, offline, pwa", ph_by: "z. B. @extern",
      add_btn: "Hinzufügen", update_btn: "Änderung übernehmen", cancel_btn: "Abbrechen",
      list_h: "Einträge", edit: "Bearbeiten", del: "Löschen", del_confirm: "Diesen Eintrag wirklich löschen?",
      publish: "Veröffentlichen ✓", publish_close: "Schließen",
      need_name: "Bitte Name, Beschreibung und Link ausfüllen.",
      need_img: "Bitte eine Bild-URL (https, kein SVG) angeben oder ein Bild vom Gerät wählen.",
      bad_img: "Bild-URL ungültig (nur https, JPG/PNG/WebP — kein SVG).",
      bad_url: "Link ungültig (muss mit https:// beginnen).",
      need_token: "Zum Veröffentlichen fehlt der GitHub-Token. Bitte oben eintragen.",
      publishing: "Wird veröffentlicht …", published: "Veröffentlicht — in ~1 Minute für alle live.",
      pub_err: "Veröffentlichen fehlgeschlagen: ", nothing: "Nichts geändert.",
      added: "Hinzugefügt (noch nicht veröffentlicht).", updated: "Geändert (noch nicht veröffentlicht).",
      removed: "Entfernt (noch nicht veröffentlicht).", img_local: "Bild vom Gerät — wird beim Veröffentlichen hochgeladen.",
      dirty_badge: "· ungespeichert", by_default: "@extern"
    },
    en: {
      studio_on: "Studio mode on — long-press the footer to leave.",
      title: "Marketplace Studio", intro: "Add new tools or edit existing ones. “Publish” writes straight to main.",
      tokenLabel: "GitHub access token", tokenHint: "Stays in this browser only. Needed to publish. Fine-grained token with “Contents: Read and write” on this repo.",
      tokenRemember: "Remember token", tokenHelp: "How do I get a token?",
      tokenHelpText: "GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → “Generate new token”. Repository access: only “family-project”. Permissions → Repository permissions → Contents: “Read and write”. Copy the token (starts with github_pat_…) and paste it here.",
      add_h: "➕ Add a new tool",
      f_name: "Name *", f_desc: "Description *", f_url: "PWA link / address *",
      f_imgurl: "Image URL (https, no SVG)", f_imgpick: "🖼 Pick an image from your device",
      f_cat: "Category", f_tags: "Tags (comma-separated)", f_by: "Provider handle",
      f_mycel: "with Mycel integration",
      ph_name: "e.g. My Tool", ph_desc: "What does the tool do? Free text with synonyms — helps search.",
      ph_url: "https://…", ph_imgurl: "https://…/image.png", ph_cat: "e.g. Tool, Game, Office",
      ph_tags: "e.g. notes, offline, pwa", ph_by: "e.g. @extern",
      add_btn: "Add", update_btn: "Apply change", cancel_btn: "Cancel",
      list_h: "Entries", edit: "Edit", del: "Delete", del_confirm: "Really delete this entry?",
      publish: "Publish ✓", publish_close: "Close",
      need_name: "Please fill in name, description and link.",
      need_img: "Please provide an image URL (https, no SVG) or pick an image from your device.",
      bad_img: "Invalid image URL (https only, JPG/PNG/WebP — no SVG).",
      bad_url: "Invalid link (must start with https://).",
      need_token: "The GitHub token is missing. Please enter it above to publish.",
      publishing: "Publishing …", published: "Published — live for everyone in ~1 minute.",
      pub_err: "Publishing failed: ", nothing: "Nothing changed.",
      added: "Added (not published yet).", updated: "Changed (not published yet).",
      removed: "Removed (not published yet).", img_local: "Device image — uploaded on publish.",
      dirty_badge: "· unsaved", by_default: "@extern"
    }
  };
  function lang() { try { return (window.FP && FP.getLang && FP.getLang() === "en") ? "en" : "de"; } catch (e) { return "de"; } }
  function T(k) { return (STR[lang()] || STR.de)[k] || STR.de[k] || k; }

  /* --------------------------------------------------------------- Helfer */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { u = String(u || "").trim(); return /^https?:\/\//i.test(u) ? u : ""; }
  function safeImg(u) { u = String(u || "").trim(); return /^https?:\/\//i.test(u) && !/\.svg(\?|$)/i.test(u) ? u : ""; }
  function slugify(s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "tool"; }
  function utf8ToB64(s) { return btoa(unescape(encodeURIComponent(String(s)))); }
  function extFromType(t) { t = String(t || "").toLowerCase(); if (t.indexOf("png") >= 0) return "png"; if (t.indexOf("webp") >= 0) return "webp"; if (t.indexOf("jpeg") >= 0 || t.indexOf("jpg") >= 0) return "jpg"; return "png"; }
  function getToken() { try { return localStorage.getItem(LS.token) || ""; } catch (e) { return ""; } }
  function setToken(v, remember) { try { if (remember && v) localStorage.setItem(LS.token, v); else localStorage.removeItem(LS.token); localStorage.setItem(LS.remember, remember ? "1" : "0"); } catch (e) {} }

  var toastBox = null;
  function toast(msg, ok) {
    if (ok === undefined) ok = true;
    if (!toastBox) { toastBox = document.createElement("div"); toastBox.className = "fpst-toasts"; document.body.appendChild(toastBox); }
    var el = document.createElement("div"); el.className = "fpst-toast"; el.textContent = (ok ? "✓ " : "• ") + msg;
    toastBox.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transform = "translateY(10px)"; setTimeout(function () { el.remove(); }, 300); }, 2600);
  }

  /* --------------------------------------------------- GitHub Contents-API */
  function ghHeaders(token) { return { "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }; }
  function apiUrl(path) { return "https://api.github.com/repos/" + CFG.owner + "/" + CFG.repo + "/contents/" + path.split("/").map(encodeURIComponent).join("/"); }
  function getSha(path, token) {
    return fetch(apiUrl(path) + "?ref=" + encodeURIComponent(CFG.branch), { headers: ghHeaders(token), cache: "no-store" })
      .then(function (r) { return r.ok ? r.json().then(function (j) { return j.sha || null; }) : null; })
      .catch(function () { return null; });
  }
  // content = bereits base64 (Bild) ODER roher Text (wird hier base64-kodiert).
  function putFile(path, contentB64, token, message) {
    return getSha(path, token).then(function (sha) {
      var body = { message: message || ("Studio: " + path + " aktualisiert"), content: contentB64, branch: CFG.branch };
      if (sha) body.sha = sha;
      return fetch(apiUrl(path), { method: "PUT", headers: ghHeaders(token), body: JSON.stringify(body) }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error("PUT " + path + " → HTTP " + r.status + " " + t.slice(0, 140)); });
        return true;
      });
    });
  }
  function commitText(path, text, token) { return putFile(path, utf8ToB64(text), token, "Studio: " + path + " aktualisiert (Marktplatz)"); }
  function commitImage(path, base64, token) { return putFile(path, base64, token, "Studio: Bild " + path + " hochgeladen (Marktplatz)"); }

  /* --------------------------------------------------- Arbeits-Liste + Serialisierung */
  var WORK = [];            // Arbeitskopie von window.FP_LISTINGS
  var UPLOADS = {};         // path -> base64 (Geräte-Bilder, beim Veröffentlichen committen)
  var filePrefix = null;    // Kopf der listings.js (Kommentar + Endpunkt), vor „window.FP_LISTINGS"
  var dirty = false;
  var editIdx = -1;         // aktuell bearbeiteter Eintrag (Index in WORK) oder -1 = neu

  var MARKER =
    "  // FP_LISTINGS_INSERT_HERE — freigabe.php fügt freigegebene Einträge hier ein\n" +
    "  // (davor, mit abschließendem Komma). Die Marke NICHT entfernen.\n";

  function loadWork() {
    try { WORK = JSON.parse(JSON.stringify(window.FP_LISTINGS || [])); } catch (e) { WORK = (window.FP_LISTINGS || []).slice(); }
  }
  // Kopf der Datei erhalten (Kommentar + Endpunkt). Fail-soft rekonstruieren, falls kein Netz.
  function capturePrefix() {
    return fetch("assets/config/listings.js?ts=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (txt) {
        if (txt) { var i = txt.indexOf("window.FP_LISTINGS"); if (i > 0) { filePrefix = txt.slice(0, i); return; } }
        filePrefix = null;
      }).catch(function () { filePrefix = null; });
  }
  function fallbackPrefix() {
    var ep = "";
    try { ep = window.FP_MARKT_SUBMIT_ENDPOINT || ""; } catch (e) {}
    return "/* Marktplatz-Einträge (Apps/Seiten) = zugleich Such-Korpus. */\n" +
      "window.FP_MARKT_SUBMIT_ENDPOINT = " + JSON.stringify(ep) + ";\n\n";
  }
  // Eintrag in stabiler Feld-Reihenfolge, nur gesetzte Felder.
  function normEntry(e) {
    var o = {};
    o.label = String(e.label || "").trim();
    o.anchorId = e.anchorId || ("markt-" + slugify(o.label));
    o.text = String(e.text || "").trim();
    if (e.by) o.by = String(e.by).trim();
    o.url = String(e.url || "").trim();
    o.img = String(e.img || "").trim();
    if (e.category) o.category = String(e.category).trim();
    if (Array.isArray(e.tags) && e.tags.length) o.tags = e.tags.slice();
    if (e.mycel === true) o.mycel = true;
    if (e.own === true) o.own = true;
    return o;
  }
  function serialize() {
    var head = filePrefix != null ? filePrefix : fallbackPrefix();
    var items = WORK.map(function (e) {
      return JSON.stringify(normEntry(e), null, 2).split("\n").map(function (l) { return "  " + l; }).join("\n");
    }).join(",\n");
    return head + "window.FP_LISTINGS = [\n" + (items ? items + ",\n" : "") + MARKER + "];\n";
  }

  /* --------------------------------------------------------------- Studio-Zugang */
  function isStudio() { return document.body.classList.contains("fpstudio"); }
  function enterStudio() { try { localStorage.setItem(LS.studio, "1"); } catch (e) {} document.body.classList.add("fpstudio"); openPanel(); toast(T("studio_on")); }
  function exitStudio() { try { localStorage.setItem(LS.studio, "0"); } catch (e) {} document.body.classList.remove("fpstudio"); closePanel(); }
  function wireAccess() {
    var trig = null, wraps = document.querySelectorAll("footer .wrap");
    for (var i = 0; i < wraps.length; i++) { if (/©/.test(wraps[i].textContent || "")) { trig = wraps[i]; break; } }
    if (!trig) trig = wraps[wraps.length - 1] || document.querySelector("footer");
    if (!trig) return;
    trig.style.cursor = "default";
    var timer = null, sx = 0, sy = 0;
    var clear = function () { if (timer) { clearTimeout(timer); timer = null; } };
    trig.addEventListener("pointerdown", function (e) { sx = e.clientX; sy = e.clientY; clear(); timer = setTimeout(function () { timer = null; isStudio() ? exitStudio() : enterStudio(); }, 1500); });
    trig.addEventListener("pointermove", function (e) { if (timer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) clear(); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) { trig.addEventListener(ev, clear); });
  }

  /* --------------------------------------------------------------- UI */
  var panel = null, fileInput = null;
  function ensureFileInput() {
    if (fileInput) return fileInput;
    fileInput = document.createElement("input"); fileInput.type = "file"; fileInput.accept = "image/png,image/jpeg,image/webp";
    fileInput.style.position = "fixed"; fileInput.style.left = "-9999px"; fileInput.setAttribute("aria-hidden", "true");
    document.body.appendChild(fileInput);
    return fileInput;
  }
  function fieldVals() {
    return {
      label: panel.querySelector("[data-f=label]").value,
      text: panel.querySelector("[data-f=desc]").value,
      url: panel.querySelector("[data-f=url]").value,
      imgUrl: panel.querySelector("[data-f=imgurl]").value,
      category: panel.querySelector("[data-f=cat]").value,
      tags: panel.querySelector("[data-f=tags]").value,
      by: panel.querySelector("[data-f=by]").value,
      mycel: panel.querySelector("[data-f=mycel]").checked
    };
  }
  function clearForm() {
    editIdx = -1; _pendingImg = null;
    ["label", "desc", "url", "imgurl", "cat", "tags", "by"].forEach(function (f) { var el = panel.querySelector("[data-f=" + f + "]"); if (el) el.value = ""; });
    var m = panel.querySelector("[data-f=mycel]"); if (m) m.checked = false;
    setImgPreview("");
    panel.querySelector("[data-role=addbtn]").textContent = T("add_btn");
    panel.querySelector("[data-role=cancel]").style.display = "none";
  }
  var _pendingImg = null; // {base64, ext} vom Gerät
  function setImgPreview(src) {
    var box = panel.querySelector("[data-role=imgprev]");
    if (!box) return;
    box.innerHTML = src ? '<img src="' + esc(src) + '" alt="">' : "";
  }
  function tagsToArr(s) { return String(s || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); }
  function buildText(desc, tags, mycel) {
    var extra = [];
    if (tags && tags.length) extra.push(tags.join(" "));
    if (mycel) extra.push("mycel netzwerk sbkim verbunden");
    return (String(desc || "").trim() + (extra.length ? " " + extra.join(" ") : "")).trim();
  }

  function saveEntry() {
    var v = fieldVals();
    if (!v.label.trim() || !v.text.trim() || !v.url.trim()) { toast(T("need_name"), false); return; }
    if (!safeUrl(v.url)) { toast(T("bad_url"), false); return; }
    var img = "";
    if (_pendingImg) {
      var slug = slugify(v.label);
      var path = "assets/apps/" + slug + "-" + (WORK.length + 1) + "." + _pendingImg.ext;
      UPLOADS[path] = _pendingImg.base64;
      img = IMG_BASE + slug + "-" + (WORK.length + 1) + "." + _pendingImg.ext;
    } else {
      img = safeImg(v.imgUrl);
      if (!img) { toast(v.imgUrl ? T("bad_img") : T("need_img"), false); return; }
    }
    var tags = tagsToArr(v.tags);
    var entry = {
      label: v.label.trim(),
      text: buildText(v.text, tags, v.mycel),
      by: (v.by.trim() || T("by_default")),
      url: v.url.trim(),
      img: img,
      category: v.category.trim(),
      tags: tags,
      mycel: !!v.mycel
    };
    if (editIdx >= 0 && WORK[editIdx]) {
      entry.anchorId = WORK[editIdx].anchorId;      // ID stabil halten
      if (WORK[editIdx].own) entry.own = true;
      WORK[editIdx] = entry; toast(T("updated"));
    } else {
      entry.anchorId = "markt-" + slugify(v.label) + "-" + (WORK.length + 1);
      WORK.push(entry); toast(T("added"));
    }
    dirty = true;
    window.FP_LISTINGS = WORK;
    if (window.FP_MARKT && FP_MARKT.rerender) FP_MARKT.rerender();
    clearForm(); renderList(); markDirty();
  }
  function editEntry(idx) {
    var e = WORK[idx]; if (!e) return;
    editIdx = idx; _pendingImg = null;
    panel.querySelector("[data-f=label]").value = e.label || "";
    panel.querySelector("[data-f=desc]").value = e.text || "";
    panel.querySelector("[data-f=url]").value = e.url || "";
    panel.querySelector("[data-f=imgurl]").value = /^https?:/i.test(e.img || "") ? e.img : "";
    panel.querySelector("[data-f=cat]").value = e.category || "";
    panel.querySelector("[data-f=tags]").value = (e.tags || []).join(", ");
    panel.querySelector("[data-f=by]").value = e.by || "";
    panel.querySelector("[data-f=mycel]").checked = !!e.mycel;
    setImgPreview(safeImg(e.img));
    panel.querySelector("[data-role=addbtn]").textContent = T("update_btn");
    panel.querySelector("[data-role=cancel]").style.display = "";
    panel.querySelector("[data-role=form]").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function delEntry(idx) {
    if (!WORK[idx]) return;
    if (!window.confirm(T("del_confirm"))) return;
    WORK.splice(idx, 1); dirty = true;
    window.FP_LISTINGS = WORK;
    if (window.FP_MARKT && FP_MARKT.rerender) FP_MARKT.rerender();
    if (editIdx === idx) clearForm();
    renderList(); markDirty(); toast(T("removed"));
  }
  function renderList() {
    var box = panel.querySelector("[data-role=list]"); if (!box) return;
    box.innerHTML = WORK.map(function (e, i) {
      return '<div class="fpst-item">' +
        '<img src="' + esc(safeImg(e.img) || "") + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="fpst-item__b"><b>' + esc(e.label) + '</b>' + (e.own ? ' <span class="fpst-own">eigen</span>' : "") +
        (e.mycel ? ' <span class="fpst-myc">🧬</span>' : "") +
        '<small>' + esc((e.text || "").slice(0, 90)) + '</small></div>' +
        '<div class="fpst-item__a"><button data-edit="' + i + '">' + esc(T("edit")) + '</button>' +
        '<button data-del="' + i + '" class="fpst-danger">' + esc(T("del")) + '</button></div>' +
        '</div>';
    }).join("");
  }
  function markDirty() {
    var b = panel && panel.querySelector("[data-role=dirty]");
    if (b) b.textContent = dirty ? T("dirty_badge") : "";
  }

  function publish() {
    var tokenEl = panel.querySelector("[data-f=token]");
    var token = tokenEl ? tokenEl.value.trim() : getToken();
    if (!token) { toast(T("need_token"), false); if (tokenEl) tokenEl.focus(); return; }
    var remember = panel.querySelector("[data-f=remember]");
    setToken(token, !remember || remember.checked);
    if (!dirty && !Object.keys(UPLOADS).length) { toast(T("nothing")); return; }
    var btn = panel.querySelector("[data-role=publish]");
    if (btn) { btn.disabled = true; btn.textContent = T("publishing"); }
    // erst Bilder ins Depot, dann listings.js
    var imgPaths = Object.keys(UPLOADS);
    var chain = Promise.resolve();
    imgPaths.forEach(function (p) { chain = chain.then(function () { return commitImage(p, UPLOADS[p], token); }); });
    chain.then(function () { return commitText("assets/config/listings.js", serialize(), token); })
      .then(function () {
        UPLOADS = {}; dirty = false; markDirty();
        if (btn) { btn.disabled = false; btn.textContent = T("publish"); }
        toast(T("published"));
      })
      .catch(function (err) {
        if (btn) { btn.disabled = false; btn.textContent = T("publish"); }
        toast(T("pub_err") + (err && err.message ? err.message : err), false);
      });
  }

  function openPanel() {
    if (panel) { panel.style.display = "flex"; return; }
    panel = document.createElement("div");
    panel.className = "fpst-modal";
    var remembered = false; try { remembered = localStorage.getItem(LS.remember) !== "0"; } catch (e) {}
    panel.innerHTML =
      '<div class="fpst-box" role="dialog" aria-modal="true">' +
        '<div class="fpst-head"><b>' + esc(T("title")) + ' <span data-role="dirty" class="fpst-dirty"></span></b>' +
          '<button data-role="x" class="fpst-x" title="' + esc(T("publish_close")) + '">✕</button></div>' +
        '<p class="fpst-intro">' + esc(T("intro")) + '</p>' +
        '<div class="fpst-token">' +
          '<label>' + esc(T("tokenLabel")) +
            '<input type="password" data-f="token" placeholder="github_pat_…" autocomplete="off" value="' + esc(getToken()) + '"></label>' +
          '<label class="fpst-chk"><input type="checkbox" data-f="remember"' + (remembered ? " checked" : "") + '> ' + esc(T("tokenRemember")) + '</label>' +
          '<small>' + esc(T("tokenHint")) + '</small>' +
          '<details class="fpst-help"><summary>' + esc(T("tokenHelp")) + '</summary><p>' + esc(T("tokenHelpText")) + '</p></details>' +
        '</div>' +
        '<div class="fpst-form" data-role="form">' +
          '<h4>' + esc(T("add_h")) + '</h4>' +
          '<label>' + esc(T("f_name")) + '<input data-f="label" placeholder="' + esc(T("ph_name")) + '"></label>' +
          '<label>' + esc(T("f_desc")) + '<textarea data-f="desc" rows="3" placeholder="' + esc(T("ph_desc")) + '"></textarea></label>' +
          '<label>' + esc(T("f_url")) + '<input data-f="url" placeholder="' + esc(T("ph_url")) + '"></label>' +
          '<label>' + esc(T("f_imgurl")) + '<input data-f="imgurl" placeholder="' + esc(T("ph_imgurl")) + '"></label>' +
          '<div class="fpst-imgrow"><button type="button" data-role="imgpick" class="fpst-btn">' + esc(T("f_imgpick")) + '</button>' +
            '<div class="fpst-imgprev" data-role="imgprev"></div></div>' +
          '<div class="fpst-two">' +
            '<label>' + esc(T("f_cat")) + '<input data-f="cat" placeholder="' + esc(T("ph_cat")) + '"></label>' +
            '<label>' + esc(T("f_by")) + '<input data-f="by" placeholder="' + esc(T("ph_by")) + '"></label>' +
          '</div>' +
          '<label>' + esc(T("f_tags")) + '<input data-f="tags" placeholder="' + esc(T("ph_tags")) + '"></label>' +
          '<label class="fpst-chk"><input type="checkbox" data-f="mycel"> ' + esc(T("f_mycel")) + '</label>' +
          '<div class="fpst-formbtns">' +
            '<button type="button" data-role="addbtn" class="fpst-btn fpst-btn--go">' + esc(T("add_btn")) + '</button>' +
            '<button type="button" data-role="cancel" class="fpst-btn" style="display:none">' + esc(T("cancel_btn")) + '</button>' +
          '</div>' +
        '</div>' +
        '<h4>' + esc(T("list_h")) + '</h4>' +
        '<div class="fpst-list" data-role="list"></div>' +
        '<div class="fpst-foot">' +
          '<button type="button" data-role="publish" class="fpst-btn fpst-btn--go">' + esc(T("publish")) + '</button>' +
          '<button type="button" data-role="close" class="fpst-btn">' + esc(T("publish_close")) + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(panel);
    panel.querySelector("[data-role=x]").addEventListener("click", function () { panel.style.display = "none"; });
    panel.querySelector("[data-role=close]").addEventListener("click", function () { panel.style.display = "none"; });
    panel.querySelector("[data-role=addbtn]").addEventListener("click", saveEntry);
    panel.querySelector("[data-role=cancel]").addEventListener("click", clearForm);
    panel.querySelector("[data-role=publish]").addEventListener("click", publish);
    panel.querySelector("[data-role=imgpick]").addEventListener("click", function () {
      var fi = ensureFileInput(); fi.value = "";
      fi.onchange = function () {
        var f = fi.files && fi.files[0]; if (!f) return;
        if (/svg/i.test(f.type)) { toast(T("bad_img"), false); return; }
        var r = new FileReader();
        r.onload = function () {
          var dataUrl = String(r.result || "");
          var b64 = dataUrl.indexOf(",") >= 0 ? dataUrl.slice(dataUrl.indexOf(",") + 1) : "";
          _pendingImg = { base64: b64, ext: extFromType(f.type) };
          setImgPreview(dataUrl);
          toast(T("img_local"));
        };
        r.readAsDataURL(f);
      };
      fi.click();
    });
    panel.querySelector("[data-role=list]").addEventListener("click", function (e) {
      var ed = e.target.closest("[data-edit]"); if (ed) { editEntry(+ed.getAttribute("data-edit")); return; }
      var dl = e.target.closest("[data-del]"); if (dl) { delEntry(+dl.getAttribute("data-del")); return; }
    });
    renderList(); markDirty();
  }
  function closePanel() { if (panel) panel.style.display = "none"; }

  /* --------------------------------------------------------------- CSS */
  function injectCss() {
    if (document.getElementById("fpst-css")) return;
    var s = document.createElement("style"); s.id = "fpst-css";
    s.textContent =
      ".fpst-toasts{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:100000;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}" +
      ".fpst-toast{background:rgba(18,20,28,.96);color:#fff;padding:10px 16px;border-radius:12px;font:14px system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.4);max-width:90vw;transition:opacity .3s,transform .3s}" +
      ".fpst-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-start;justify-content:center;background:rgba(6,8,14,.6);padding:16px;overflow:auto}" +
      ".fpst-box{background:#141824;color:#eef1f7;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:18px;max-width:560px;width:100%;margin:16px 0;box-shadow:0 20px 60px rgba(0,0,0,.5)}" +
      ".fpst-head{display:flex;align-items:center;justify-content:space-between;gap:8px}" +
      ".fpst-head b{font-size:1.1rem}.fpst-dirty{color:#ffb26b;font-size:.8rem;font-weight:400}" +
      ".fpst-x{background:transparent;border:0;color:#cfd6e6;font-size:1.2rem;cursor:pointer;padding:2px 8px}" +
      ".fpst-intro{opacity:.8;font-size:.9rem;margin:.3rem 0 1rem}" +
      ".fpst-box label{display:block;font-size:.82rem;opacity:.9;margin:.55rem 0 0}" +
      ".fpst-box input[type=text],.fpst-box input:not([type]),.fpst-box input[type=password],.fpst-box textarea{width:100%;box-sizing:border-box;margin-top:4px;padding:9px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.16);background:#0e1119;color:#eef1f7;font:14px system-ui,sans-serif}" +
      ".fpst-box textarea{resize:vertical}" +
      ".fpst-chk{display:flex;align-items:center;gap:7px;margin-top:.7rem}.fpst-chk input{width:auto;margin:0}" +
      ".fpst-box small{display:block;opacity:.6;font-size:.76rem;margin-top:4px}" +
      ".fpst-help{margin-top:.5rem;font-size:.8rem}.fpst-help summary{cursor:pointer;opacity:.8}.fpst-help p{opacity:.75;line-height:1.4}" +
      ".fpst-token,.fpst-form{border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;margin:.6rem 0}" +
      ".fpst-form h4,.fpst-box>h4{margin:.4rem 0 .2rem;font-size:.95rem}" +
      ".fpst-two{display:flex;gap:10px}.fpst-two label{flex:1}" +
      ".fpst-imgrow{display:flex;gap:10px;align-items:center;margin-top:.6rem}" +
      ".fpst-imgprev{width:56px;height:56px;border-radius:8px;overflow:hidden;background:#0e1119;border:1px solid rgba(255,255,255,.12);flex:none}" +
      ".fpst-imgprev img{width:100%;height:100%;object-fit:cover}" +
      ".fpst-formbtns,.fpst-foot{display:flex;gap:10px;margin-top:.8rem;flex-wrap:wrap}" +
      ".fpst-btn{border:1px solid rgba(255,255,255,.2);background:transparent;color:#eef1f7;border-radius:10px;padding:9px 14px;cursor:pointer;font:600 14px system-ui,sans-serif}" +
      ".fpst-btn:hover{border-color:rgba(255,255,255,.5)}" +
      ".fpst-btn--go{background:linear-gradient(180deg,#6aa0ff,#3f6fd8);border-color:transparent;color:#fff}" +
      ".fpst-danger{color:#ff9a9a;border:1px solid rgba(255,120,120,.4);background:transparent;border-radius:8px;padding:5px 9px;cursor:pointer}" +
      ".fpst-list{display:flex;flex-direction:column;gap:8px;max-height:44vh;overflow:auto}" +
      ".fpst-item{display:flex;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px}" +
      ".fpst-item img{width:40px;height:40px;border-radius:7px;object-fit:cover;background:#0e1119;flex:none}" +
      ".fpst-item__b{flex:1;min-width:0}.fpst-item__b b{font-size:.9rem}.fpst-item__b small{display:block;opacity:.6;font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".fpst-item__a{display:flex;gap:6px;flex:none}.fpst-item__a button{font-size:.78rem;border-radius:7px;padding:5px 8px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#eef1f7;cursor:pointer}" +
      ".fpst-own{font-size:.68rem;background:rgba(120,160,255,.25);border-radius:5px;padding:1px 5px}.fpst-myc{font-size:.8rem}";
    document.head.appendChild(s);
  }

  /* --------------------------------------------------------------- Init */
  function init() {
    injectCss();
    loadWork();
    capturePrefix();
    wireAccess();
    // Persistenter Studio-Zustand (z.B. nach Reload)
    try { if (localStorage.getItem(LS.studio) === "1") { document.body.classList.add("fpstudio"); openPanel(); } } catch (e) {}
  }
  // öffentliche Testfläche (headless-Smoke) — harmlos in Produktion
  window.FPStudio = {
    _t: { serialize: serialize, normEntry: normEntry, safeImg: safeImg, safeUrl: safeUrl, slugify: slugify, buildText: buildText, utf8ToB64: utf8ToB64, apiUrl: apiUrl,
          setWork: function (a) { WORK = a; }, getWork: function () { return WORK; }, setPrefix: function (p) { filePrefix = p; }, MARKER: MARKER, CFG: CFG },
    open: function () { document.body.classList.add("fpstudio"); openPanel(); },
    close: exitStudio
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
