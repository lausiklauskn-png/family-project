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
 *  - „📥 Eingereicht": holt die Warteschlange (warteschlange.jsonl) über
 *    server/marktplatz-api.php — dieselbe Warteschlange, die einreichung.php füllt
 *    und die freigabe.php nutzt. Prüfen · Status setzen · Freigeben · Verwerfen.
 *  - „Veröffentlichen"/„Freigeben"/„Zurückziehen": committen SERVER-SEITIG über
 *    marktplatz-api.php (der Server hält den GitHub-Token in freigabe-config.php).
 *    Der Browser baut nur den Inhalt (listings.js) und schickt ihn zum Commit.
 *
 * Ehrlich & sicher:
 *  - KEIN GitHub-Token im Browser mehr. Ein einziges Studio-Passwort (studio_key,
 *    localStorage „fpstudio_srv_key") schützt die Server-API; der Token liegt NUR
 *    auf dem Server (freigabe-config.php), nie im Repo/Browser.
 *  - Ohne Passwort/Server bleibt alles lokal nutzbar (Eintragen/Vorschau); nur das
 *    Veröffentlichen/Freigeben braucht Passwort + erreichbaren Server → fail-soft.
 *  - E-Mail-/Einreichungs-Inhalte sind untrusted external data: nur als Daten
 *    eingetragen (beim Rendern escaped, Bilder nur als <img src>, SVG gesperrt).
 *  - App-spezifischer Speicher-Präfix „fpstudio_" — keine Kollision mit Geschwister-Apps
 *    auf der geteilten github.io-/family-projekt.de-Origin.
 */
(function () {
  "use strict";

  /* --------------------------------------------------------------- Konfig */
  var CFG = { owner: "lausiklauskn-png", repo: "family-project", branch: "main" };
  try { var c = window.FP_STUDIO_CONFIG || {}; if (c.owner) CFG.owner = c.owner; if (c.repo) CFG.repo = c.repo; if (c.branch) CFG.branch = c.branch; } catch (e) {}
  var LS = { token: "fpstudio_gh_token", remember: "fpstudio_remember", studio: "fpstudio_on",
             srvKey: "fpstudio_srv_key", srvRemember: "fpstudio_srv_remember" };
  // Absolute Bild-Basis fürs Depot: von beiden Domains erreichbar (das Bild wird
  // ins Repo committet und auf beiden deployt). Wie die bestehenden own-Einträge.
  var IMG_BASE = "https://family-projekt.de/assets/apps/";
  // Server-API für die Prüf-/Freigabe-Warteschlange (dein Server, siehe
  // server/README-marktplatz-api.md). Leer = Warteschlange aus, Rest unverändert.
  var API = ""; try { API = (window.FP_MARKT_API || "").trim(); } catch (e) {}

  /* --------------------------------------------------------------- Sprache */
  var STR = {
    de: {
      studio_on: "Studio-Modus an — Langdruck auf die Fußzeile zum Verlassen.",
      title: "Marktplatz-Studio", intro: "Prüfe eingereichte Apps und gib sie frei — oder trage selbst welche ein. Ein Studio-Passwort, der Server veröffentlicht.",
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
      publishing: "Wird veröffentlicht …", published: "Veröffentlicht — in ~1 Minute für alle live.",
      pub_err: "Veröffentlichen fehlgeschlagen: ", nothing: "Nichts geändert.",
      added: "Hinzugefügt (noch nicht veröffentlicht).", updated: "Geändert (noch nicht veröffentlicht).",
      removed: "Entfernt (noch nicht veröffentlicht).", img_local: "Bild vom Gerät — wird beim Veröffentlichen hochgeladen.",
      dirty_badge: "· ungespeichert", by_default: "@extern",
      q_h: "📥 Eingereicht (zur Prüfung)",
      q_intro: "Von Besuchern eingereichte Apps — nichts ist live, bis du „Freigeben“ klickst.",
      q_key: "Studio-Passwort (für den Server)", q_remember: "Passwort merken",
      q_key_hint: "Ein Passwort für alles: Warteschlange holen UND veröffentlichen (der Server committet mit seinem Token). Bleibt nur in diesem Browser.",
      need_srvkey: "Bitte zuerst dein Studio-Passwort eintragen (oben bei „Eingereicht“).",
      q_fetch: "Vom Server holen", q_none: "Keine offenen Einreichungen.",
      q_noapi: "Server-Adresse (FP_MARKT_API) noch nicht gesetzt — siehe server/README-marktplatz-api.md.",
      q_loading: "Hole Einreichungen …", q_err: "Server-Abruf fehlgeschlagen: ",
      q_take: "Übernehmen (bearbeiten)", q_approve: "✓ Freigeben", q_checked: "🔵 Geprüft",
      q_reject: "Verwerfen", q_reject_confirm: "Diese Einreichung verwerfen (aus der Liste entfernen)?",
      q_open: "↗ App öffnen", q_approveall: "Alle 🔵 geprüften freigeben",
      q_approved: "Freigegeben — in ~1 Minute live.", q_rejected: "Verworfen.",
      q_status_neu: "🟡 Neu", q_status_geprueft: "🔵 Geprüft – zur Freigabe bereit", q_status_verdacht: "🔴 Verdacht",
      withdraw: "Zurückziehen", withdraw_confirm: "Diesen Eintrag von der Live-Seite zurückziehen (mit Token entfernen)?",
      withdrawn: "Zurückgezogen — in ~1 Minute von der Seite verschwunden.",
      vec_h: "🧠 Vektoren bauen",
      vec_intro: "Rechnet die Bedeutungs-Vektoren aller Einträge EINMAL aus und legt sie als Datei ab. Danach muss kein Besucher sie mehr selbst rechnen — die Suche startet sofort.",
      vec_btn: "Vektoren bauen",
      vec_hint: "Nach jeder Änderung an Name, Beschreibung oder Tags neu bauen. Solange das nicht passiert, rechnet die Seite die geänderten Einträge selbst nach — es geht nichts kaputt, es dauert nur länger.",
      vec_noembed: "Sprachmodell nicht verfügbar — Vektoren können hier nicht gebaut werden.",
      vec_noentries: "Keine Einträge mit Bild — nichts zu rechnen.",
      vec_loading: "Lade Sprachmodell (~30 MB einmalig) …",
      vec_working: "Rechne Vektoren … ",
      vec_committing: "Schreibe die Datei …",
      vec_done: "Vektoren gebaut: ",
      vec_done2: " Einträge — in ~1 Minute live.",
      vec_err: "Vektoren bauen fehlgeschlagen: ",
      vec_fresh: "Hole den veröffentlichten Stand …",
      vec_local: "Server nicht erreichbar — rechne über den lokalen Stand.",
      vec_dirty: "Erst \u201eVer\u00f6ffentlichen\u201c dr\u00fccken \u2014 sonst passen die Vektoren nicht zu den Eintr\u00e4gen."
    },
    en: {
      studio_on: "Studio mode on — long-press the footer to leave.",
      title: "Marketplace Studio", intro: "Review submitted apps and release them — or add your own. One studio password, the server publishes.",
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
      publishing: "Publishing …", published: "Published — live for everyone in ~1 minute.",
      pub_err: "Publishing failed: ", nothing: "Nothing changed.",
      added: "Added (not published yet).", updated: "Changed (not published yet).",
      removed: "Removed (not published yet).", img_local: "Device image — uploaded on publish.",
      dirty_badge: "· unsaved", by_default: "@extern",
      q_h: "📥 Submitted (for review)",
      q_intro: "Apps submitted by visitors — nothing goes live until you click “Publish”.",
      q_key: "Studio password (for the server)", q_remember: "Remember password",
      q_key_hint: "One password for everything: fetch the queue AND publish (the server commits with its token). Stays in this browser only.",
      need_srvkey: "Please enter your studio password first (top, under “Submitted”).",
      q_fetch: "Fetch from server", q_none: "No open submissions.",
      q_noapi: "Server address (FP_MARKT_API) not set yet — see server/README-marktplatz-api.md.",
      q_loading: "Fetching submissions …", q_err: "Server request failed: ",
      q_take: "Take over (edit)", q_approve: "✓ Release", q_checked: "🔵 Checked",
      q_reject: "Discard", q_reject_confirm: "Discard this submission (remove from the list)?",
      q_open: "↗ Open app", q_approveall: "Release all 🔵 checked",
      q_approved: "Released — live in ~1 minute.", q_rejected: "Discarded.",
      q_status_neu: "🟡 New", q_status_geprueft: "🔵 Checked – ready to release", q_status_verdacht: "🔴 Suspicious",
      withdraw: "Withdraw", withdraw_confirm: "Withdraw this entry from the live site (remove via token)?",
      withdrawn: "Withdrawn — gone from the site in ~1 minute.",
      vec_h: "🧠 Build vectors",
      vec_intro: "Computes the meaning vectors of all entries ONCE and stores them as a file. After that no visitor has to compute them — search starts right away.",
      vec_btn: "Build vectors",
      vec_hint: "Rebuild after every change to name, description or tags. Until then the page recomputes the changed entries itself — nothing breaks, it just takes longer.",
      vec_noembed: "Language model unavailable — vectors cannot be built here.",
      vec_noentries: "No entries with an image — nothing to compute.",
      vec_loading: "Loading language model (~30 MB once) …",
      vec_working: "Computing vectors … ",
      vec_committing: "Writing the file …",
      vec_done: "Vectors built: ",
      vec_done2: " entries — live in ~1 minute.",
      vec_err: "Building vectors failed: ",
      vec_fresh: "Fetching the published state …",
      vec_local: "Server unreachable — computing from the local state.",
      vec_dirty: "Press “Publish” first — otherwise the vectors won\u2019t match the entries."
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

  var toastBox = null;
  function toast(msg, ok) {
    if (ok === undefined) ok = true;
    if (!toastBox) { toastBox = document.createElement("div"); toastBox.className = "fpst-toasts"; document.body.appendChild(toastBox); }
    var el = document.createElement("div"); el.className = "fpst-toast"; el.textContent = (ok ? "✓ " : "• ") + msg;
    toastBox.appendChild(el);
    setTimeout(function () { el.style.opacity = "0"; el.style.transform = "translateY(10px)"; setTimeout(function () { el.remove(); }, 300); }, 2600);
  }

  /* --- Commits laufen server-seitig über marktplatz-api.php (Server-Token). --- */
  /* Der Browser hält KEINEN GitHub-Token mehr; siehe publishViaServer(). */

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
    var ep = "", api = "";
    try { ep = window.FP_MARKT_SUBMIT_ENDPOINT || ""; } catch (e) {}
    try { api = window.FP_MARKT_API || ""; } catch (e) {}
    return "/* Marktplatz-Einträge (Apps/Seiten) = zugleich Such-Korpus. */\n" +
      "window.FP_MARKT_SUBMIT_ENDPOINT = " + JSON.stringify(ep) + ";\n" +
      "window.FP_MARKT_API = " + JSON.stringify(api) + ";\n\n";
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
    renderList();
    // Sofort server-seitig festschreiben, wenn ein Studio-Passwort vorliegt —
    // sonst kaeme der Eintrag beim naechsten Laden aus der Live-Liste zurueck
    // ("Loeschen ohne Wirkung"). Ohne Passwort: nur lokal + Hinweis.
    if (srvKeyVal()) {
      toast(T("publishing"));
      publishViaServer()
        .then(function () { markDirty(); toast(T("withdrawn")); })
        .catch(function (err) { markDirty(); toast(T("pub_err") + (err && err.message ? err.message : err), false); });
    } else {
      markDirty(); toast(T("removed"));
    }
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

  // Ein Studio-Passwort (studio_key) ist die einzige Zugangsdaten — der Server
  // committet mit SEINEM GitHub-Token. Kein GitHub-Token mehr im Browser.
  function publishViaServer() {
    var key = srvKeyVal();
    if (!key) return Promise.reject(new Error(T("need_srvkey")));
    setSrvKey(key, true);
    var imgPaths = Object.keys(UPLOADS);
    var chain = Promise.resolve();
    imgPaths.forEach(function (p) {
      chain = chain.then(function () {
        return apiPost("commit_image", { path: p, base64: UPLOADS[p] }).then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || "Bild"); });
      });
    });
    return chain.then(function () { return apiPost("commit_listings", { content: serialize() }); })
      .then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || "commit_listings"); UPLOADS = {}; dirty = false; markDirty(); return true; });
  }
  function publish() {
    if (!API) { toast(T("q_noapi"), false); return; }
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); var se = panel.querySelector("[data-f=srvkey]"); if (se) se.focus(); return; }
    if (!dirty && !Object.keys(UPLOADS).length) { toast(T("nothing")); return; }
    var btn = panel.querySelector("[data-role=publish]");
    if (btn) { btn.disabled = true; btn.textContent = T("publishing"); }
    publishViaServer()
      .then(function () { if (btn) { btn.disabled = false; btn.textContent = T("publish"); } toast(T("published")); })
      .catch(function (err) { if (btn) { btn.disabled = false; btn.textContent = T("publish"); } toast(T("pub_err") + (err && err.message ? err.message : err), false); });
  }

  /* ------------------------------------------- Vektoren bauen (Katalog-Spore Stufe 1)
   *
   * Gegenstück zur Leseseite in markt.html (§ „Vorberechnete Vektoren"). Dort
   * wird das Paket gelesen; hier entsteht es. Vier Punkte, an denen die beiden
   * Seiten zusammenpassen MÜSSEN — weicht einer ab, ist das Paket still
   * wertlos (die Seite rechnet dann klaglos alles selbst nach, man merkt es
   * nur an der Zeit):
   *
   *   1. Der Text je Eintrag ist `x.text || x.label` — exakt dieselbe Regel.
   *      Aus ihm entsteht der Vektor UND der Hash; jede Abweichung lässt jeden
   *      Hash-Vergleich scheitern.
   *   2. `model` und `dim` kommen aus SbkimEmbedding._meta, nicht aus einer
   *      Konstante hier. Wechselt das Modell, verwirft die Leseseite das ganze
   *      Paket — das geht nur, wenn hier die WAHRE Kennung eingetragen wird.
   *      Der Feldname ist `_meta`, nicht `info()`.
   *   3. Gepackt wird mit FPVecCodec (assets/vec-codec.js) — dieselbe Datei,
   *      die die Leseseite lädt. Kein Nachbau.
   *   4. Aufgenommen wird JEDER Eintrag mit anchorId und Text, auch einer ohne
   *      gültiges Bild. Die Leseseite zeigt nur Einträge MIT Bild und schlägt
   *      pro anchorId nach; überzählige Einträge im Paket kosten ~550 Bytes und
   *      stören nicht, ein fehlender kostet eine Live-Berechnung. Also lieber
   *      zu viel als zu wenig — so kann eine abweichende Bild-Regel zwischen
   *      den beiden Dateien nie zu einer Lücke führen.
   *
   * Niemals ein halbes Paket schreiben: erst wird alles gerechnet, und nur bei
   * vollständigem Erfolg geht der Commit raus. Bricht etwas ab, bleibt die alte
   * Datei stehen — schlimmster Fall ist damit der heutige Zustand.
   */
  /* Die Eintraege IMMER frisch vom Server holen, nie aus window.FP_LISTINGS.
   *
   * Befund 2026-08-01, gemessen und belegt: Klaus' erster Lauf baute 14 saubere
   * Vektoren — von denen die Leseseite nur 4 nutzen konnte. Die Hashes passten
   * 14/14 zur listings.js vom 26.07. und 4/14 zur aktuellen. Grund: markt.html
   * laedt `assets/config/listings.js` OHNE `?v=`, und Caddy cacht *.js sieben
   * Tage (Caddyfile.example). Im Browser lag also eine Monat-alte Liste,
   * waehrend die Seite live die neuen Texte vom 31.07. zeigte (PR #135 hat sie
   * umformuliert). Der Knopf rechnete brav ueber die alten Texte.
   *
   * Das ist die tueckischste Sorte Fehler: nichts stuerzte ab, die Meldung sagte
   * „14 Eintraege", der Hash-Waechter der Leseseite verwarf die falschen still
   * und rechnete nach. Alles funktionierte — es brachte nur nichts.
   *
   * `capturePrefix` holt die Datei ohnehin schon mit cache:"no-store". Genau
   * diese frische Fassung ist der richtige Bezugspunkt: die Vektoren gehoeren
   * zum VEROEFFENTLICHTEN Stand, nicht zu dem, was zufaellig im Cache liegt.
   * Fail-soft: geht der Abruf schief, wird mit WORK gerechnet und gesagt, dass
   * es der lokale Stand ist. */
  function frischeListings() {
    return fetch("assets/config/listings.js?ts=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (txt) {
        if (!txt) return null;
        var sand = {};
        // Eigener Code vom eigenen Server — dieselbe Datei, die die Seite ohnehin
        // als <script> laedt. Die Sandbox haelt sie nur von window fern.
        new Function("window", txt)(sand);
        return Array.isArray(sand.FP_LISTINGS) ? sand.FP_LISTINGS : null;
      })
      .catch(function () { return null; });
  }
  function vecEntries(liste) {
    var quelle = liste || WORK;
    var out = [];
    for (var i = 0; i < quelle.length; i++) {
      var x = quelle[i];
      if (!x || !x.anchorId) continue;
      var text = x.text || x.label;
      if (!text) continue;
      out.push({ id: x.anchorId, text: String(text) });
    }
    return out;
  }
  /* Fortschritt zeigen — Text UND Balken.
   *
   * Klaus' Befund 2026-08-01: „Das Sprachmodell hat wieder keinen Ladebalken
   * und ich sehe nicht, wie weit es ist oder ob gerade etwas hakt." Genau so
   * war es: hier stand nur ein starrer Satz. Der Modell-Download sind ~30 MB,
   * das dauert spürbar, und ohne Balken ist „lädt" von „hängt" nicht zu
   * unterscheiden. Die Suchseite (markt.html, renderBar) macht es richtig —
   * dasselbe jetzt auch hier.
   *
   * pct === null heißt „läuft, Länge unbekannt" und zeigt einen wandernden
   * Balken; das ist ehrlicher als ein Balken, der bei 0 % steht. */
  function vecStatus(msg, pct) {
    var el = panel && panel.querySelector("[data-role=vecstatus]");
    if (!el) return;
    if (!msg) { el.innerHTML = ""; return; }
    var unbekannt = (pct == null);
    var w = unbekannt ? 40 : Math.max(0, Math.min(100, Math.round(pct)));
    el.innerHTML = '<span class="fpst-vectext"></span>' +
      '<span class="fpst-vecbar"><span class="fpst-vecbar-fill' +
      (unbekannt ? " is-unbekannt" : "") + '" style="width:' + w + '%"></span></span>';
    // textContent, nicht innerHTML: der Text kann aus einer Fehlermeldung kommen.
    var t = el.querySelector(".fpst-vectext");
    if (t) t.textContent = msg;
  }
  function buildVectors() {
    var codec = window.FPVecCodec;
    var emb = window.SbkimEmbedding;
    if (!codec || !emb || typeof emb.embedPassageBatch !== "function") { toast(T("vec_noembed"), false); return; }
    if (!API) { toast(T("q_noapi"), false); return; }
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); var se = panel.querySelector("[data-f=srvkey]"); if (se) se.focus(); return; }
    // Ungespeicherte Aenderungen zuerst veroeffentlichen: sonst rechnet der Knopf
    // ueber den Server-Stand und laesst genau die Eintraege aus, die gerade
    // bearbeitet wurden — wieder ein Paket, das aussieht wie fertig und keins ist.
    if (dirty) { toast(T("vec_dirty"), false); return; }

    var btn = panel.querySelector("[data-role=vecbtn]");
    if (btn) btn.disabled = true;
    vecStatus(T("vec_loading"), null);

    // Modul 03 meldet den Modell-Download als window-Event
    // (03_embedding.js emitProgress: {status, file, progress 0-100, loaded, total}).
    // Der Listener gilt NUR für die Lade-Phase und wird in JEDEM Ausgang wieder
    // entfernt — auch im Fehlerfall, sonst hängt er beim nächsten Druck doppelt.
    var onProg = function (ev) {
      var d = (ev && ev.detail) || {};
      if (d.status === "progress" && d.file) {
        var pct = (d.progress != null) ? d.progress : null;
        vecStatus(T("vec_loading") + (pct != null ? " " + Math.round(pct) + "%" : ""), pct);
      }
    };
    var stopProg = function () { try { window.removeEventListener("sbkim:embedding-progress", onProg); } catch (_e) {} };
    window.addEventListener("sbkim:embedding-progress", onProg);

    // In Häppchen rechnen, damit der Fortschritt sichtbar ist. embedPassageBatch
    // ist dieselbe Funktion, die die Leseseite nutzt — die Aufteilung ändert am
    // Ergebnis nichts, nur an der Rückmeldung.
    var CHUNK = 8;
    var vecs = [];
    function schritt(k) {
      if (k >= items.length) return Promise.resolve();
      var fertig = Math.min(k + CHUNK, items.length);
      vecStatus(T("vec_working") + fertig + "/" + items.length, (k / items.length) * 100);
      var teil = items.slice(k, k + CHUNK).map(function (it) { return it.text; });
      return emb.embedPassageBatch(teil).then(function (res) {
        if (!res || res.length !== teil.length) throw new Error("embedPassageBatch: " + teil.length + " erwartet, " + ((res && res.length) || 0) + " bekommen");
        for (var j = 0; j < res.length; j++) vecs.push(res[j]);
        return schritt(k + CHUNK);
      });
    }

    var items = [];
    Promise.resolve()
      .then(function () { return frischeListings(); })
      .then(function (liste) {
        // Ehrlich benennen, WORUEBER gerechnet wird — der Unterschied ist der
        // ganze Befund von oben.
        vecStatus(liste ? T("vec_fresh") : T("vec_local"), null);
        items = vecEntries(liste);
        if (!items.length) throw new Error(T("vec_noentries"));
      })
      .then(function () { return emb.init ? emb.init() : null; })
      .then(function () { stopProg(); return schritt(0); })
      .then(function () {
        var meta = emb._meta || {};
        if (!meta.model || !meta.dim) throw new Error("SbkimEmbedding._meta ohne model/dim");
        var pack = {
          version: 1,
          model: meta.model,
          dim: meta.dim,
          quant: (codec._meta && codec._meta.quant) || "int8-sym-b64",
          built: new Date().toISOString().slice(0, 10),
          vectors: {}
        };
        for (var i = 0; i < items.length; i++) {
          var p = codec.encode(vecs[i]);
          p.h = codec.textHash(items[i].text);
          pack.vectors[items[i].id] = p;
        }
        if (!Object.keys(pack.vectors).length) throw new Error("leeres Paket");
        vecStatus(T("vec_committing"), 100);
        return apiPost("commit_vectors", { content: JSON.stringify(pack) });
      })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || "commit_vectors");
        stopProg();
        if (btn) btn.disabled = false;
        vecStatus("");
        toast(T("vec_done") + items.length + T("vec_done2"));
      })
      .catch(function (err) {
        stopProg();
        if (btn) btn.disabled = false;
        // Die Fehlermeldung BLEIBT stehen. Ein Toast verschwindet nach 2,6 s —
        // wer gerade nicht hinsieht, bekommt sonst nie zu lesen, woran es lag.
        vecStatus(T("vec_err") + (err && err.message ? err.message : err), 0);
        toast(T("vec_err") + (err && err.message ? err.message : err), false);
      });
  }

  // Live-Eintrag zurückziehen: aus WORK entfernen + server-seitig neu schreiben.
  function withdrawEntry(idx) {
    if (!WORK[idx]) return;
    if (!window.confirm(T("withdraw_confirm"))) return;
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); return; }
    WORK.splice(idx, 1); dirty = true; window.FP_LISTINGS = WORK;
    if (window.FP_MARKT && FP_MARKT.rerender) FP_MARKT.rerender();
    if (editIdx === idx) clearForm();
    toast(T("publishing"));
    publishViaServer()
      .then(function () { renderList(); markDirty(); toast(T("withdrawn")); })
      .catch(function (err) { toast(T("pub_err") + (err && err.message ? err.message : err), false); });
  }

  /* --------------------------------------------- Warteschlange (Server-API) */
  var QUEUE = [];
  function srvKeyStored() { try { return localStorage.getItem(LS.srvKey) || ""; } catch (e) { return ""; } }
  function srvKeyVal() { var el = panel && panel.querySelector("[data-f=srvkey]"); if (el && el.value.trim()) return el.value.trim(); return srvKeyStored(); }
  function setSrvKey(v, remember) { try { if (remember && v) localStorage.setItem(LS.srvKey, v); else localStorage.removeItem(LS.srvKey); localStorage.setItem(LS.srvRemember, remember ? "1" : "0"); } catch (e) {} }
  function apiGet(action, extra) {
    var q = "?action=" + encodeURIComponent(action) + "&key=" + encodeURIComponent(srvKeyVal());
    if (extra) Object.keys(extra).forEach(function (k) { q += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(extra[k]); });
    return fetch(API + q, { cache: "no-store" }).then(function (r) { return r.json(); });
  }
  function apiPost(action, bodyObj) {
    var body = bodyObj || {}; body.key = srvKeyVal();
    return fetch(API + "?action=" + encodeURIComponent(action), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function statusLabel(st) { return st === "geprueft" ? T("q_status_geprueft") : st === "verdacht" ? T("q_status_verdacht") : T("q_status_neu"); }
  function statusClass(st) { return st === "geprueft" ? "is-geprueft" : st === "verdacht" ? "is-verdacht" : "is-neu"; }
  function findQ(id) { for (var i = 0; i < QUEUE.length; i++) { if (String(QUEUE[i].id) === String(id)) return QUEUE[i]; } return null; }
  function entryFromRec(it) {
    return {
      label: String(it.label || "").trim(),
      text: String(it.text || "").trim(),
      by: (String(it.by || "").trim() || T("by_default")),
      url: String(it.url || "").trim(),
      img: safeImg(it.img),
      category: String(it.category || "").trim(),
      tags: [], mycel: false,
      anchorId: "markt-" + slugify(it.label) + "-" + String(it.id).slice(-6)
    };
  }
  function fetchQueue() {
    if (!API) { toast(T("q_noapi"), false); return; }
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); var se = panel.querySelector("[data-f=srvkey]"); if (se) se.focus(); return; }
    var box = panel.querySelector("[data-role=queue]"); if (box) box.innerHTML = '<div class="fpst-qempty">' + esc(T("q_loading")) + '</div>';
    var rem = panel.querySelector("[data-f=srvremember]");
    setSrvKey(srvKeyVal(), !rem || rem.checked);
    apiGet("list").then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "?");
      QUEUE = (j.items || []).filter(function (x) { return ["freigegeben", "abgelehnt", "erledigt"].indexOf(x.status) < 0; });
      renderQueue();
    }).catch(function (err) { toast(T("q_err") + (err && err.message ? err.message : err), false); if (box) box.innerHTML = ""; });
  }
  function renderQueue() {
    var box = panel.querySelector("[data-role=queue]"); if (!box) return;
    if (!QUEUE.length) { box.innerHTML = '<div class="fpst-qempty">' + esc(T("q_none")) + '</div>'; return; }
    box.innerHTML = QUEUE.map(function (it, i) {
      return '<div class="fpst-qitem ' + statusClass(it.status) + '">' +
        '<img src="' + esc(safeImg(it.img) || "") + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
        '<div class="fpst-qbody"><div class="fpst-qtop"><span class="fpst-qnum">#' + (i + 1) + '</span> <span class="fpst-qstatus">' + esc(statusLabel(it.status)) + '</span></div>' +
        '<b>' + esc(it.label) + '</b><small>' + esc((it.text || "").slice(0, 100)) + '</small>' +
        '<div class="fpst-qact">' +
          '<a href="' + esc(safeUrl(it.url) || "#") + '" target="_blank" rel="noopener" class="fpst-qbtn">' + esc(T("q_open")) + '</a>' +
          '<button data-qtake="' + esc(it.id) + '" class="fpst-qbtn">' + esc(T("q_take")) + '</button>' +
          '<button data-qcheck="' + esc(it.id) + '" class="fpst-qbtn">' + esc(T("q_checked")) + '</button>' +
          '<button data-qok="' + esc(it.id) + '" class="fpst-qbtn fpst-qbtn--go">' + esc(T("q_approve")) + '</button>' +
          '<button data-qno="' + esc(it.id) + '" class="fpst-qbtn fpst-danger">' + esc(T("q_reject")) + '</button>' +
        '</div></div></div>';
    }).join("") + '<div class="fpst-qfoot"><button data-role="qall" class="fpst-btn">' + esc(T("q_approveall")) + '</button></div>';
  }
  function queueTakeOver(id) {
    var it = findQ(id); if (!it) return;
    _pendingImg = null; editIdx = -1;
    panel.querySelector("[data-f=label]").value = it.label || "";
    panel.querySelector("[data-f=desc]").value = it.text || "";
    panel.querySelector("[data-f=url]").value = it.url || "";
    panel.querySelector("[data-f=imgurl]").value = safeImg(it.img) || "";
    panel.querySelector("[data-f=cat]").value = it.category || "";
    panel.querySelector("[data-f=tags]").value = "";
    panel.querySelector("[data-f=by]").value = it.by || "";
    panel.querySelector("[data-f=mycel]").checked = false;
    setImgPreview(safeImg(it.img));
    panel.querySelector("[data-role=addbtn]").textContent = T("add_btn");
    panel.querySelector("[data-role=cancel]").style.display = "";
    panel.querySelector("[data-role=form]").scrollIntoView({ behavior: "smooth", block: "start" });
    toast(T("q_take"));
  }
  function queueSetStatus(id, status) {
    apiPost("setstatus", { id: id, status: status }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "?");
      var it = findQ(id); if (it) it.status = status; renderQueue();
    }).catch(function (err) { toast(T("q_err") + (err && err.message ? err.message : err), false); });
  }
  function queueApprove(id) {
    var it = findQ(id); if (!it) return;
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); return; }
    var entry = entryFromRec(it);
    if (!entry.label || !entry.text || !safeUrl(entry.url) || !entry.img) { toast(T("bad_img"), false); return; }
    WORK.push(entry); dirty = true; window.FP_LISTINGS = WORK;
    if (window.FP_MARKT && FP_MARKT.rerender) FP_MARKT.rerender();
    toast(T("publishing"));
    publishViaServer()
      .then(function () { return apiPost("setstatus", { id: id, status: "freigegeben" }); })
      .then(function () { QUEUE = QUEUE.filter(function (x) { return String(x.id) !== String(id); }); renderQueue(); renderList(); markDirty(); toast(T("q_approved")); })
      .catch(function (err) { toast(T("pub_err") + (err && err.message ? err.message : err), false); });
  }
  function rejectMail(it) {
    if (!it.contact) return;
    var body = "Hallo,\n\ndanke für deine Einreichung „" + it.label + "\" im Family-Projekt-Marktplatz.\n\nLeider können wir sie so nicht veröffentlichen.\n\nDu kannst sie gern angepasst erneut einreichen.\n\nViele Grüße\nFamily Projekt";
    try { window.open("mailto:" + encodeURIComponent(it.contact) + "?subject=" + encodeURIComponent("Deine Marktplatz-Einreichung") + "&body=" + encodeURIComponent(body), "_blank"); } catch (e) {}
  }
  function queueReject(id) {
    var it = findQ(id); if (!it) return;
    if (!window.confirm(T("q_reject_confirm"))) return;
    apiPost("setstatus", { id: id, status: "abgelehnt" }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || "?");
      QUEUE = QUEUE.filter(function (x) { return String(x.id) !== String(id); }); renderQueue(); toast(T("q_rejected"));
      rejectMail(it);
    }).catch(function (err) { toast(T("q_err") + (err && err.message ? err.message : err), false); });
  }
  function approveAllChecked() {
    var checked = QUEUE.filter(function (it) { return it.status === "geprueft"; });
    if (!checked.length) { toast(T("q_none")); return; }
    if (!srvKeyVal()) { toast(T("need_srvkey"), false); return; }
    var good = [];
    checked.forEach(function (it) { var e = entryFromRec(it); if (e.label && e.text && safeUrl(e.url) && e.img) { WORK.push(e); good.push(it.id); } });
    if (!good.length) { toast(T("bad_img"), false); return; }
    dirty = true; window.FP_LISTINGS = WORK; if (window.FP_MARKT && FP_MARKT.rerender) FP_MARKT.rerender();
    toast(T("publishing"));
    publishViaServer()
      .then(function () { return Promise.all(good.map(function (id) { return apiPost("setstatus", { id: id, status: "freigegeben" }); })); })
      .then(function () { QUEUE = QUEUE.filter(function (x) { return good.indexOf(x.id) < 0; }); renderQueue(); renderList(); markDirty(); toast(T("q_approved")); })
      .catch(function (err) { toast(T("pub_err") + (err && err.message ? err.message : err), false); });
  }

  function openPanel() {
    if (panel) { panel.style.display = "flex"; return; }
    panel = document.createElement("div");
    panel.className = "fpst-modal";
    var remembered = false; try { remembered = localStorage.getItem(LS.remember) !== "0"; } catch (e) {}
    var srvRemembered = false; try { srvRemembered = localStorage.getItem(LS.srvRemember) !== "0"; } catch (e) {}
    panel.innerHTML =
      '<div class="fpst-box" role="dialog" aria-modal="true">' +
        '<div class="fpst-head"><b>' + esc(T("title")) + ' <span data-role="dirty" class="fpst-dirty"></span></b>' +
          '<button data-role="x" class="fpst-x" title="' + esc(T("publish_close")) + '">✕</button></div>' +
        '<p class="fpst-intro">' + esc(T("intro")) + '</p>' +
        '<div class="fpst-queue">' +
          '<h4>' + esc(T("q_h")) + '</h4>' +
          '<p class="fpst-qintro">' + esc(T("q_intro")) + '</p>' +
          '<label>' + esc(T("q_key")) +
            '<input type="password" data-f="srvkey" autocomplete="off" value="' + esc(srvKeyStored()) + '"></label>' +
          '<label class="fpst-chk"><input type="checkbox" data-f="srvremember"' + (srvRemembered ? " checked" : "") + '> ' + esc(T("q_remember")) + '</label>' +
          '<small>' + esc(T("q_key_hint")) + '</small>' +
          '<div class="fpst-qbtnrow"><button type="button" data-role="qfetch" class="fpst-btn">' + esc(T("q_fetch")) + '</button></div>' +
          '<div class="fpst-qlist" data-role="queue"></div>' +
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
        '<div class="fpst-vec">' +
          '<h4>' + esc(T("vec_h")) + '</h4>' +
          '<p class="fpst-qintro">' + esc(T("vec_intro")) + '</p>' +
          '<div class="fpst-qbtnrow"><button type="button" data-role="vecbtn" class="fpst-btn">' + esc(T("vec_btn")) + '</button>' +
            '<span class="fpst-vecstatus" data-role="vecstatus"></span></div>' +
          '<small>' + esc(T("vec_hint")) + '</small>' +
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
    var vb = panel.querySelector("[data-role=vecbtn]"); if (vb) vb.addEventListener("click", buildVectors);
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
      var wd = e.target.closest("[data-withdraw]"); if (wd) { withdrawEntry(+wd.getAttribute("data-withdraw")); return; }
      var dl = e.target.closest("[data-del]"); if (dl) { delEntry(+dl.getAttribute("data-del")); return; }
    });
    var qf = panel.querySelector("[data-role=qfetch]"); if (qf) qf.addEventListener("click", fetchQueue);
    var qbox = panel.querySelector("[data-role=queue]");
    if (qbox) qbox.addEventListener("click", function (e) {
      var t;
      if ((t = e.target.closest("[data-qtake]"))) { queueTakeOver(t.getAttribute("data-qtake")); return; }
      if ((t = e.target.closest("[data-qcheck]"))) { queueSetStatus(t.getAttribute("data-qcheck"), "geprueft"); return; }
      if ((t = e.target.closest("[data-qok]"))) { queueApprove(t.getAttribute("data-qok")); return; }
      if ((t = e.target.closest("[data-qno]"))) { queueReject(t.getAttribute("data-qno")); return; }
      if (e.target.closest("[data-role=qall]")) { approveAllChecked(); return; }
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
      ".fpst-tokenlink{display:inline-block;margin-top:8px;font-size:.82rem;font-weight:600;color:#8fb4ff;text-decoration:none;border:1px solid rgba(143,180,255,.35);border-radius:9px;padding:6px 11px}" +
      ".fpst-tokenlink:hover{border-color:rgba(143,180,255,.7);background:rgba(143,180,255,.08)}" +
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
      ".fpst-own{font-size:.68rem;background:rgba(120,160,255,.25);border-radius:5px;padding:1px 5px}.fpst-myc{font-size:.8rem}" +
      ".fpst-queue,.fpst-vec{border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;margin:.6rem 0}" +
      ".fpst-vec .fpst-qbtnrow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}" +
      ".fpst-vecstatus{font-size:.8rem;opacity:.85;flex:1;min-width:150px}" +
      ".fpst-vectext{display:block;margin-bottom:4px}" +
      ".fpst-vecbar{display:block;height:6px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden}" +
      ".fpst-vecbar-fill{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#6aa0ff,#5fce8f);transition:width .25s}" +
      "@keyframes fpst-vecwander{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}" +
      ".fpst-vecbar-fill.is-unbekannt{animation:fpst-vecwander 1.1s ease-in-out infinite}" +
      "@media (prefers-reduced-motion:reduce){.fpst-vecbar-fill.is-unbekannt{animation:none}}" +
      ".fpst-qintro{opacity:.8;font-size:.82rem;margin:.2rem 0 .4rem}" +
      ".fpst-qbtnrow{margin:.6rem 0}" +
      ".fpst-qlist{display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto}" +
      ".fpst-qempty{opacity:.6;font-size:.85rem;padding:8px 2px}" +
      ".fpst-qitem{display:flex;gap:10px;border:1px solid rgba(255,255,255,.1);border-left-width:3px;border-radius:10px;padding:8px}" +
      ".fpst-qitem.is-neu{border-left-color:#ffcf6b}.fpst-qitem.is-geprueft{border-left-color:#6aa0ff}.fpst-qitem.is-verdacht{border-left-color:#ff8080}" +
      ".fpst-qitem>img{width:44px;height:44px;border-radius:7px;object-fit:cover;background:#0e1119;flex:none}" +
      ".fpst-qbody{flex:1;min-width:0}.fpst-qbody b{font-size:.9rem;display:block}.fpst-qbody small{display:block;opacity:.65;font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".fpst-qtop{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:2px}" +
      ".fpst-qnum{font:600 .72rem ui-monospace,monospace;background:rgba(255,255,255,.08);border-radius:5px;padding:1px 6px}" +
      ".fpst-qstatus{font-size:.72rem;opacity:.85}" +
      ".fpst-qact{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}" +
      ".fpst-qbtn{font-size:.76rem;border-radius:7px;padding:5px 9px;border:1px solid rgba(255,255,255,.2);background:transparent;color:#eef1f7;cursor:pointer;text-decoration:none;display:inline-block}" +
      ".fpst-qbtn:hover{border-color:rgba(255,255,255,.5)}.fpst-qbtn.fpst-qbtn--go{background:linear-gradient(180deg,#5fce8f,#2f9d64);border-color:transparent;color:#08160e}" +
      ".fpst-qfoot{margin-top:8px}";
    document.head.appendChild(s);
  }

  /* --------------------------------------------------------------- Init */
  function init() {
    injectCss();
    loadWork();
    capturePrefix();
    wireAccess();
    // Studio startet IMMER geschlossen — nur der Lang-Druck (enterStudio) oeffnet
    // es. KEIN Auto-Oeffnen nach Reload/Hard-Reload, damit Besucher das Panel nie
    // offen vorfinden (Sicherheit: kein Fremdzugriff auf Freigeben/Loeschen).
    try { localStorage.setItem(LS.studio, "0"); } catch (e) {}
  }
  // öffentliche Testfläche (headless-Smoke) — harmlos in Produktion
  window.FPStudio = {
    _t: { serialize: serialize, normEntry: normEntry, safeImg: safeImg, safeUrl: safeUrl, slugify: slugify, buildText: buildText, utf8ToB64: utf8ToB64,
          entryFromRec: entryFromRec, statusLabel: statusLabel, statusClass: statusClass, vecEntries: vecEntries,
          setWork: function (a) { WORK = a; }, getWork: function () { return WORK; }, setPrefix: function (p) { filePrefix = p; }, MARKER: MARKER, CFG: CFG },
    open: function () { document.body.classList.add("fpstudio"); openPanel(); },
    close: exitStudio
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
