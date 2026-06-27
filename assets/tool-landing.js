/* ============================================================================
 * Family Projekt — Werkzeug-Landingpage (datengetrieben).
 * Rendert eine Verkaufsseite aus window.FP_TOOL (in der jeweiligen Tool-Seite
 * gesetzt). Struktur aus dem abgenommenen Mockup mockup-werkzeug-landingpage:
 * Held + 2 Knöpfe + Screenshot-Galerie (＋/×) + Vorteile + „Was es kostet"
 * (0 € + Spenden-Platzhalter) + Vertrauens-Punkte + Zurück-Link.
 * Bilder liegen beim Anbieter (Brief §4/§5) — hier Demo-Platzhalter.
 * ========================================================================== */
(function (global) {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function render() {
    var T = global.FP_TOOL; if (!T) return;
    var l = (global.FP && FP.getLang && FP.getLang() === "en") ? "en" : "de";
    var d = T[l] || T.de || {};
    var main = document.getElementById("toolMain"); if (!main) return;

    var feat = (T.features || []).map(function (f) {
      var fd = f[l] || f.de || {};
      return '<div class="glass f"><div class="ico">' + esc(f.icon) + '</div><h3>' + esc(fd.h) + '</h3><p>' + esc(fd.p) + '</p></div>';
    }).join("");

    var trust = (T.trust || []).map(function (tr) {
      var td = tr[l] || tr.de || {};
      return '<div class="t"><span class="d">✓</span><div><b>' + esc(td.b) + '</b> ' + esc(td.p) + '</div></div>';
    }).join("");

    main.innerHTML =
      '<section class="hero"><div class="wrap">' +
        '<a class="back" href="../werkzeuge.html">' + esc(d.back || "← zurück zu Family Projekt") + '</a>' +
        '<div style="height:14px"></div>' +
        '<span class="eyebrow">● ' + esc(d.eyebrow || "Werkzeug · läuft im Browser") + '</span>' +
        '<h1>' + esc(d.h1pre) + ' <span class="holo">' + esc(d.h1hl) + '</span> ' + esc(d.h1post) + '</h1>' +
        '<p class="lead">' + esc(d.lead) + '</p>' +
        '<div class="cta">' +
          '<a class="btn primary" href="' + esc(T.openUrl || "#") + '"' + (T.openUrl ? ' target="_blank" rel="noopener"' : '') + '>▶ ' + esc(d.open || "Jetzt öffnen") + '</a>' +
          (T.installUrl ? '<a class="btn ghost" href="' + esc(T.installUrl) + '" target="_blank" rel="noopener">⤓ ' + esc(d.install || "Installieren") + '</a>' : '') +
        '</div>' +
        '<div class="microcopy">' + esc(d.microcopy || "Kostenlos · keine Anmeldung · offline nach dem ersten Öffnen.") + '</div>' +
        '<div class="shot"><div class="shot-top"><i></i><i></i><i></i></div>' +
          '<div class="shot-body"><div class="bubble">' + esc(T.icon || "🖼️") + '</div>' +
          '<div class="ph" id="mainlabel">' + esc(d.shotLabel || "Screenshot 1 — [ vom Anbieter eingefügt ]") + '</div></div></div>' +
        '<div class="thumbs" id="thumbs">' +
          '<button class="thumb active" data-n="1">1<span class="x" title="entfernen">×</span></button>' +
          '<button class="thumb" data-n="2">2<span class="x" title="entfernen">×</span></button>' +
          '<button class="thumb" data-n="3">3<span class="x" title="entfernen">×</span></button>' +
          '<button class="addthumb" id="addthumb" title="Screenshot hinzufügen">＋</button>' +
        '</div>' +
        '<p class="galnote">' + esc(d.galnote || "Mehrere Screenshots möglich — der Anbieter fügt eigene hinzu (＋) oder entfernt sie (×). Die Bilder liegen auf der Seite des Anbieters, nicht auf diesem Server.") + '</p>' +
      '</div></section>' +

      '<section><div class="wrap"><h2>' + esc(d.featTitle || "Was es kann") + '</h2>' +
        '<p class="sub">' + esc(d.featSub || "") + '</p><div class="feat">' + feat + '</div></div></section>' +

      '<section><div class="wrap"><h2>' + esc(d.costTitle || "Was es kostet") + '</h2>' +
        '<p class="sub">' + esc(d.costSub || "") + '</p>' +
        '<div class="glass price"><div><div class="big">0 € <small>· ' + esc(d.cost0 || "kostenlos nutzen") + '</small></div>' +
        '<div class="note">' + esc(d.costNote || "Öffnen, nutzen, installieren — ohne Konto, ohne Tracker.") + '</div></div>' +
        '<div style="text-align:right"><a class="btn gold" href="#">♡ ' + esc(d.donate || "Spenden") + ' <span class="badge-soon">' + esc(d.soon || "bald") + '</span></a>' +
        '<div class="note" style="margin-top:8px">' + esc(d.donateNote || "Freiwillige Unterstützung (PayPal) — kommt später.") + '</div></div></div></div></section>' +

      '<section><div class="wrap"><h2>' + esc(d.trustTitle || "Worauf du dich verlassen kannst") + '</h2>' +
        '<p class="sub">' + esc(d.trustSub || "Ehrlich und nachprüfbar — kein »vertrau mir«.") + '</p>' +
        '<div class="trust">' + trust + '</div></div></section>';

    wireGallery(d);
  }

  // Demo-Galerie: Auswahl / Entfernen (×) / Hinzufügen (＋). Reine Vorschau —
  // echte Bilder kämen als <img src> von der Anbieter-Seite.
  function wireGallery(d) {
    var thumbs = document.getElementById("thumbs");
    var addBtn = document.getElementById("addthumb");
    var label = document.getElementById("mainlabel");
    if (!thumbs || !addBtn || !label) return;
    var counter = 3;
    var tmpl = d.shotLabel || "Screenshot {n} — [ vom Anbieter eingefügt ]";
    function lbl(n) { return tmpl.replace("1", n).replace("{n}", n); }
    function select(btn) {
      thumbs.querySelectorAll(".thumb").forEach(function (t) { t.classList.remove("active"); });
      btn.classList.add("active");
      label.textContent = lbl(btn.dataset.n);
    }
    thumbs.addEventListener("click", function (e) {
      var x = e.target.closest(".x"), thumb = e.target.closest(".thumb");
      if (x && thumb) {
        e.stopPropagation();
        var wasActive = thumb.classList.contains("active");
        thumb.remove();
        var first = thumbs.querySelector(".thumb");
        if (wasActive && first) select(first);
        else if (!first) label.textContent = d.galEmpty || "Noch keine Screenshots — mit ＋ hinzufügen";
        return;
      }
      if (thumb) select(thumb);
    });
    addBtn.addEventListener("click", function () {
      counter += 1;
      var b = document.createElement("button");
      b.className = "thumb"; b.dataset.n = counter;
      b.innerHTML = counter + '<span class="x" title="entfernen">×</span>';
      thumbs.insertBefore(b, addBtn);
      select(b);
    });
  }

  global.addEventListener("fp:lang", render);
  if (global.FP && FP.init) FP.init();
  render();
})(typeof window !== "undefined" ? window : this);
