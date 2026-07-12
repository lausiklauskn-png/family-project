/* ============================================================================
 * Family Projekt — Werkzeug-Landingpage (datengetrieben).
 * Rendert eine Seite aus window.FP_TOOL (in der jeweiligen Tool-Seite gesetzt).
 *
 * Grundgerüst: Held + Knöpfe + „Was es kann" + „Was es kostet" + Vertrauen.
 * Optionale, ADDITIVE Blöcke (rendern nur, wenn das Feld gesetzt ist — so
 * bleibt das Such-Werkzeug unangetastet):
 *   T.shots    : [{src,alt}]        → echte Screenshot-Galerie (leer/fehlt → KEINE
 *                                      Galerie, kein leerer Platzhalter mehr)
 *   T.steps    : [{icon,active,href,de:{h,p},en:{…}}] → roter Faden (kennenlernen
 *                                      → Knoten erzeugen → andocken)
 *   T.seal     : {svg,ribbonDefault,de:{h,p,inputLabel,dl,note},en:{…}} → echtes
 *                                      selbst-gravierendes SBKIM-Siegel (Live-Gravur
 *                                      des App-Namens + SVG-Download)
 *   T.linkmap  : [{de:{q},links:[{href,tag,de:{label}}]}] → „jede Aussage ein Link"
 *   T.downloads: [{icon,href,dl?,de:{h,p}}] → Bausteine/Skills zum Mitnehmen
 * ========================================================================== */
(function (global) {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ext(href) { return /^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : ''; }
  function pick(o, l) { return (o && (o[l] || o.de)) || o || {}; }

  /* ---- optionale Blöcke ---------------------------------------------------- */

  function galleryHTML(T) {
    var shots = T.shots || [];
    if (!shots.length) return "";                 // kein leerer „vom Anbieter"-Rahmen mehr
    var thumbs = shots.map(function (s, i) {
      return '<button class="thumb' + (i === 0 ? ' active' : '') + '" data-src="' + esc(s.src) + '">' +
        '<img src="' + esc(s.src) + '" alt="' + esc(s.alt || '') + '" loading="lazy"></button>';
    }).join("");
    return '<div class="shot"><div class="shot-top"><i></i><i></i><i></i></div>' +
      '<div class="shot-body"><img id="shotMain" src="' + esc(shots[0].src) + '" alt="' + esc(shots[0].alt || '') + '"></div></div>' +
      (shots.length > 1 ? '<div class="thumbs" id="thumbs">' + thumbs + '</div>' : '');
  }

  function stepsHTML(T, l, d) {
    var steps = T.steps; if (!steps || !steps.length) return "";
    var items = steps.map(function (s, i) {
      var sd = pick(s, l);
      var inner = '<span class="rf-num">' + (i + 1) + '</span>' +
        '<span class="rf-ico">' + esc(s.icon || "") + '</span>' +
        '<span class="rf-txt"><b>' + esc(sd.h || "") + '</b><small>' + esc(sd.p || "") + '</small></span>';
      var cls = "rf-step" + (s.active ? " on" : "");
      return s.href
        ? '<a class="' + cls + '" href="' + esc(s.href) + '"' + ext(s.href) + '>' + inner + '</a>'
        : '<div class="' + cls + '">' + inner + '</div>';
    }).join('<span class="rf-arrow" aria-hidden="true">→</span>');
    return '<section class="rf-sec"><div class="wrap">' +
      (d.stepsTitle ? '<h2>' + esc(d.stepsTitle) + '</h2><p class="sub">' + esc(d.stepsSub || "") + '</p>' : '') +
      '<div class="rf-band">' + items + '</div></div></section>';
  }

  function sealHTML(T, l, d) {
    if (!T.seal) return "";
    var s = (typeof T.seal === "object") ? T.seal : {};
    var sd = pick(s, l);
    return '<section class="seal-sec"><div class="wrap">' +
      '<h2>' + esc(sd.h || "Das SBKIM-Siegel") + '</h2>' +
      '<p class="sub">' + esc(sd.p || "") + '</p>' +
      '<div class="seal-wrap">' +
        '<div class="seal-svg" id="sealSvg" aria-label="SBKIM-Siegel">…</div>' +
        '<div class="seal-ctl">' +
          '<label class="seal-lbl" for="sealName">' + esc(sd.inputLabel || "Namen ins Band gravieren:") + '</label>' +
          '<input id="sealName" class="seal-input" type="text" maxlength="28" placeholder="' + esc(s.ribbonDefault || "DEINE APP") + '" autocomplete="off">' +
          '<a class="btn ghost" id="sealDl" href="' + esc(s.svg || "../assets/sbkim-siegel-wappen.svg") + '" download="sbkim-siegel.svg">⤓ ' + esc(sd.dl || "Siegel als SVG herunterladen") + '</a>' +
          '<p class="note">' + esc(sd.note || "") + '</p>' +
        '</div>' +
      '</div></div></section>';
  }

  function linkmapHTML(T, l, d) {
    var groups = T.linkmap; if (!groups || !groups.length) return "";
    var body = groups.map(function (g) {
      var gd = pick(g, l);
      var links = (g.links || []).map(function (k) {
        var kd = pick(k, l);
        return '<a class="lm-link" href="' + esc(k.href) + '"' + ext(k.href) + '>' +
          esc(kd.label || "") + (k.tag ? '<span class="lm-tag">' + esc(k.tag) + '</span>' : '') + '</a>';
      }).join("");
      return '<div class="lm-group"><div class="lm-q">' + esc(gd.q || "") + '</div>' +
        '<div class="lm-links">' + links + '</div></div>';
    }).join("");
    return '<section class="lm-sec"><div class="wrap">' +
      '<h2>' + esc(d.linkmapTitle || "Willst du dies, willst du das?") + '</h2>' +
      '<p class="sub">' + esc(d.linkmapSub || "Jede Frage führt direkt zum passenden Ort — nie ins Leere.") + '</p>' +
      '<div class="lm-grid">' + body + '</div></div></section>';
  }

  function downloadsHTML(T, l, d) {
    var items = T.downloads; if (!items || !items.length) return "";
    var body = items.map(function (it) {
      var idt = pick(it, l);
      var attrs = it.dl ? ' download' : ext(it.href);
      return '<a class="dl-item" href="' + esc(it.href) + '"' + attrs + '>' +
        '<span class="dl-ico">' + esc(it.icon || "⤓") + '</span>' +
        '<span class="dl-txt"><b>' + esc(idt.h || "") + '</b><small>' + esc(idt.p || "") + '</small></span></a>';
    }).join("");
    return '<section class="dl-sec"><div class="wrap">' +
      '<h2>' + esc(d.dlTitle || "Bausteine zum Mitnehmen") + '</h2>' +
      '<p class="sub">' + esc(d.dlSub || "") + '</p>' +
      '<div class="dl-grid">' + body + '</div></div></section>';
  }

  /* ---- Seite zusammensetzen ------------------------------------------------ */

  function render() {
    var T = global.FP_TOOL; if (!T) return;
    var l = (global.FP && FP.getLang && FP.getLang() === "en") ? "en" : "de";
    var d = T[l] || T.de || {};
    var main = document.getElementById("toolMain"); if (!main) return;

    var feat = (T.features || []).map(function (f) {
      var fd = pick(f, l);
      return '<div class="glass f"><div class="ico">' + esc(f.icon) + '</div><h3>' + esc(fd.h) + '</h3><p>' + esc(fd.p) + '</p></div>';
    }).join("");

    var trust = (T.trust || []).map(function (tr) {
      var td = pick(tr, l);
      return '<div class="t"><span class="d">✓</span><div><b>' + esc(td.b) + '</b> ' + esc(td.p) + '</div></div>';
    }).join("");

    var featSec = feat ? ('<section><div class="wrap"><h2>' + esc(d.featTitle || "Was es kann") + '</h2>' +
      '<p class="sub">' + esc(d.featSub || "") + '</p><div class="feat">' + feat + '</div></div></section>') : "";

    main.innerHTML =
      '<section class="hero"><div class="wrap">' +
        '<a class="back" href="../werkzeuge.html">' + esc(d.back || "← zurück zu Family Projekt") + '</a>' +
        '<div style="height:14px"></div>' +
        '<span class="eyebrow">● ' + esc(d.eyebrow || "Werkzeug · läuft im Browser") + '</span>' +
        '<h1>' + esc(d.h1pre) + ' <span class="holo">' + esc(d.h1hl) + '</span> ' + esc(d.h1post) + '</h1>' +
        '<p class="lead">' + esc(d.lead) + '</p>' +
        '<div class="cta">' +
          '<a class="btn primary" href="' + esc(T.openUrl || "#") + '"' + (T.openUrl ? ext(T.openUrl) : '') + '>▶ ' + esc(d.open || "Jetzt öffnen") + '</a>' +
          (T.installUrl ? '<a class="btn ghost" href="' + esc(T.installUrl) + '"' + ext(T.installUrl) + '>⤓ ' + esc(d.install || "Installieren") + '</a>' : '') +
        '</div>' +
        '<div class="microcopy">' + esc(d.microcopy || "Kostenlos · keine Anmeldung · offline nach dem ersten Öffnen.") + '</div>' +
        galleryHTML(T) +
      '</div></section>' +

      stepsHTML(T, l, d) +
      featSec +
      sealHTML(T, l, d) +
      linkmapHTML(T, l, d) +
      downloadsHTML(T, l, d) +

      '<section><div class="wrap"><h2>' + esc(d.costTitle || "Was es kostet") + '</h2>' +
        '<p class="sub">' + esc(d.costSub || "") + '</p>' +
        '<div class="glass price"><div><div class="big">0 € <small>· ' + esc(d.cost0 || "kostenlos nutzen") + '</small></div>' +
        '<div class="note">' + esc(d.costNote || "Öffnen, nutzen, installieren — ohne Konto, ohne Tracker.") + '</div></div>' +
        '<div style="text-align:right"><a class="btn gold" href="#">♡ ' + esc(d.donate || "Spenden") + ' <span class="badge-soon">' + esc(d.soon || "bald") + '</span></a>' +
        '<div class="note" style="margin-top:8px">' + esc(d.donateNote || "Freiwillige Unterstützung (PayPal) — kommt später.") + '</div></div></div></div></section>' +

      '<section><div class="wrap"><h2>' + esc(d.trustTitle || "Worauf du dich verlassen kannst") + '</h2>' +
        '<p class="sub">' + esc(d.trustSub || "Ehrlich und nachprüfbar — kein »vertrau mir«.") + '</p>' +
        '<div class="trust">' + trust + '</div></div></section>';

    wireGallery();
    wireSeal(T);
  }

  // Echte Galerie: Thumbnail klicken → großes Bild wechseln.
  function wireGallery() {
    var thumbs = document.getElementById("thumbs");
    var mainImg = document.getElementById("shotMain");
    if (!thumbs || !mainImg) return;
    thumbs.addEventListener("click", function (e) {
      var b = e.target.closest(".thumb"); if (!b) return;
      thumbs.querySelectorAll(".thumb").forEach(function (t) { t.classList.remove("active"); });
      b.classList.add("active");
      mainImg.src = b.dataset.src;
    });
  }

  // Selbst-gravierendes Siegel: echtes Wappen-SVG laden, Namen ins Band gravieren,
  // aktuelles SVG als Download anbieten. Fail-soft: fällt auf ein statisches Bild zurück.
  function wireSeal(T) {
    if (!T.seal) return;
    var s = (typeof T.seal === "object") ? T.seal : {};
    var host = document.getElementById("sealSvg"); if (!host) return;
    var url = s.svg || "../assets/sbkim-siegel-wappen.svg";
    var def = s.ribbonDefault || "DEINE APP";
    var input = document.getElementById("sealName");
    var dl = document.getElementById("sealDl");

    function engrave(svgRoot, txt) {
      var tp = svgRoot.querySelector('textPath[href="#ribbonText"]') ||
        svgRoot.querySelector('#ribbonText ~ text textPath, textPath');
      if (tp) tp.textContent = (txt && txt.length) ? txt : def;
    }
    function refreshDl(svgRoot) {
      if (!dl) return;
      try {
        var str = new XMLSerializer().serializeToString(svgRoot);
        var blob = new Blob([str], { type: "image/svg+xml" });
        if (dl._u) URL.revokeObjectURL(dl._u);
        dl._u = URL.createObjectURL(blob); dl.href = dl._u;
      } catch (e) { /* fail-soft: href bleibt die Datei-URL */ }
    }
    if (!global.fetch) { host.innerHTML = '<img src="' + esc(url) + '" alt="SBKIM-Siegel">'; return; }
    fetch(url).then(function (r) { return r.text(); }).then(function (txt) {
      host.innerHTML = txt;
      var svgRoot = host.querySelector("svg"); if (!svgRoot) throw new Error("kein SVG");
      svgRoot.removeAttribute("width"); svgRoot.removeAttribute("height");
      svgRoot.setAttribute("class", "seal-svg-el");
      engrave(svgRoot, (input && input.value.trim()) || "");
      refreshDl(svgRoot);
      if (input) input.addEventListener("input", function () { engrave(svgRoot, input.value.trim()); refreshDl(svgRoot); });
    }).catch(function () {
      host.innerHTML = '<img src="' + esc(url) + '" alt="SBKIM-Siegel">';
      if (dl) dl.href = url;
    });
  }

  global.addEventListener("fp:lang", render);
  if (global.FP && FP.init) FP.init();
  render();
})(typeof window !== "undefined" ? window : this);
