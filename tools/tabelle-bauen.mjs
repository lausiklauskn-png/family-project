/* Baut forschung/tabelle.html aus der Messreihe.
 *
 * Klaus 2026-08-05: „Diese aktuelle Liste gib mir mal bitte als HTML Datei, die
 * ich dann jederzeit ergänzen kann.“
 *
 * Drei Anforderungen stecken in dem Satz, und alle drei sind gebaut:
 *
 *   „HTML Datei“     — EINE Datei, alles drin. Sie läuft aus dem Download-Ordner
 *                      (file://) genauso wie von der Seite. Deshalb sind die
 *                      Zahlen EINGEBETTET und werden nicht nachgeladen; über
 *                      http(s) versucht die Seite zusätzlich, sich frischere
 *                      Zahlen zu holen, aber sie braucht das nicht.
 *   „aktuelle Liste“ — sie darf nicht veralten. Darum baut die nächtliche Aktion
 *                      sie neu, gleich nachdem sie gemessen hat.
 *   „ergänzen“       — Klaus kann zu jeder App eine eigene Notiz schreiben. Die
 *                      liegt im Browser, NICHT in der Datei — sonst wäre sie
 *                      beim nächsten nächtlichen Bau weg. Zum Mitnehmen auf ein
 *                      anderes Gerät gibt es Sichern/Einlesen.
 *
 * Aufruf:  node tools/tabelle-bauen.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REIHE = path.join(WURZEL, "forschung", "messreihe.json");
const ZIEL = path.join(WURZEL, "forschung", "tabelle.html");

const reihe = JSON.parse(fs.readFileSync(REIHE, "utf8"));

/* Nur, was die Tabelle wirklich zeigt — die Datei soll klein bleiben. */
const daten = {
  gepflegt: reihe.gepflegt || "",
  reihen: Object.fromEntries(Object.entries(reihe.reihen || {}).map(([id, r]) => [id, {
    name: r.name, url: r.url,
    punkte: (r.punkte || []).map((p) => ({
      von: p.von, bis: p.bis,
      l: p.leistung, b: p.bedienbarkeit, p: p.gute_praxis, a: p.auffindbarkeit,
      q: p.quelle, m: p.mangel || []
    }))
  }]))
};

/* `</script>` im JSON würde das umschließende Script-Element vorzeitig beenden —
 * ein klassischer, still kaputter Einbau. Der Schrägstrich wird maskiert. */
const eingebettet = JSON.stringify(daten).replace(/<\//g, "<\\/");

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Forschungsstation — Messwerte</title>
<meta name="description" content="Die gemessenen Werte aller Apps und Seiten von Klaus, mit Verlauf und eigenen Notizen.">
<style>
:root{
  --bg:#0b0d14; --bg2:#11151f; --card:rgba(22,29,42,.6); --line:rgba(255,255,255,.12);
  --text:#eef2f8; --muted:#a7b3c2; --dim:#8e9bab;
  --accent:#6ee7d3; --accent2:#a78bfa; --gold:#e6b450;
  --gut:#46d27f; --mittel:#e6b450; --schwach:#ff8f6b;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --mono:ui-monospace,"SFMono-Regular",Menlo,Consolas,monospace;
  --focus:#ffd166;
}
:root[data-thema="hell"]{
  --bg:#f4f6fa; --bg2:#fff; --card:rgba(255,255,255,.9); --line:rgba(10,20,40,.14);
  --text:#131a26; --muted:#4d5a6b; --dim:#5d6b7d;
  --accent:#0d9488; --accent2:#6d4bd0; --gold:#8a6100;
  --gut:#0f7a41; --mittel:#8a6100; --schwach:#b23c17;
  --focus:#8a4b00;
}
@media (prefers-color-scheme: light){
  :root:not([data-thema]){
    --bg:#f4f6fa; --bg2:#fff; --card:rgba(255,255,255,.9); --line:rgba(10,20,40,.14);
    --text:#131a26; --muted:#4d5a6b; --dim:#5d6b7d;
    --accent:#0d9488; --accent2:#6d4bd0; --gold:#8a6100;
    --gut:#0f7a41; --mittel:#8a6100; --schwach:#b23c17;
    --focus:#8a4b00;
  }
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);line-height:1.6}
:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
.wrap{max-width:1080px;margin:0 auto;padding:20px 16px 80px}
h1{font-size:1.5rem;margin:0 0 .2rem}
.unter{color:var(--muted);margin:0 0 1.2rem;font-size:.92rem}
.hinweis{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--gold);
  border-radius:10px;padding:.8rem 1rem;margin:0 0 1.2rem;font-size:.9rem;color:var(--muted)}
.hinweis b{color:var(--text)}
.leiste{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:0 0 1rem}
.leiste input[type=search]{flex:1 1 200px;min-width:160px;padding:.5rem .7rem;border-radius:8px;
  border:1px solid var(--line);background:var(--bg2);color:var(--text);font:inherit;font-size:.92rem}
button{padding:.5rem .8rem;border-radius:8px;border:1px solid var(--line);background:var(--bg2);
  color:var(--text);font:inherit;font-size:.88rem;cursor:pointer}
button:hover{border-color:var(--accent)}
.tabelle{width:100%;border-collapse:collapse;font-size:.92rem}
.tabelle caption{text-align:left;color:var(--muted);font-size:.85rem;padding-bottom:.5rem}
.tabelle th{text-align:right;font-weight:600;color:var(--muted);font-size:.78rem;
  text-transform:uppercase;letter-spacing:.04em;padding:.4rem .5rem;border-bottom:1px solid var(--line);
  white-space:nowrap}
.tabelle th:first-child,.tabelle th.links{text-align:left}
.tabelle th button{background:none;border:none;padding:0;color:inherit;font:inherit;
  text-transform:inherit;letter-spacing:inherit;cursor:pointer}
.tabelle th button:hover{color:var(--accent)}
.tabelle td{padding:.5rem;border-bottom:1px solid var(--line);text-align:right;
  font-variant-numeric:tabular-nums;white-space:nowrap}
.tabelle td.links{text-align:left;white-space:normal}
.tabelle tbody tr:hover{background:var(--card)}
.name{background:none;border:none;padding:0;color:var(--text);font:inherit;text-align:left;
  cursor:pointer;text-decoration:underline;text-decoration-color:var(--line);text-underline-offset:.2em}
.name:hover{text-decoration-color:var(--accent)}
.schnitt{font-weight:700}
.gut{color:var(--gut)} .mittel{color:var(--mittel)} .schwach{color:var(--schwach)}
.quelle{font-size:.72rem;color:var(--dim);font-family:var(--mono)}
.notizmarke{color:var(--accent2);font-weight:700}
.detail td{background:var(--card);text-align:left;white-space:normal;padding:1rem}
.detail h3{margin:.2rem 0 .5rem;font-size:.95rem}
.detail .verlauf{font-family:var(--mono);font-size:.82rem;margin:0 0 .8rem}
.detail .verlauf div{padding:.15rem 0;border-bottom:1px solid var(--line)}
.detail ul{margin:.2rem 0 .9rem;padding-left:1.2rem;font-size:.88rem;color:var(--muted)}
.detail label{display:block;font-size:.85rem;color:var(--muted);margin-bottom:.3rem}
.detail textarea{width:100%;min-height:5rem;padding:.6rem;border-radius:8px;border:1px solid var(--line);
  background:var(--bg2);color:var(--text);font:inherit;font-size:.9rem;resize:vertical}
.fuss{margin-top:2rem;color:var(--dim);font-size:.82rem;border-top:1px solid var(--line);padding-top:1rem}
.rolle{overflow-x:auto}
@media (max-width:640px){
  .verstecken-klein{display:none}
  .wrap{padding:14px 10px 60px}
}
</style>
</head>
<body>
<div class="wrap">
<h1>Forschungsstation — Messwerte</h1>
<p class="unter" id="unter"></p>

<div class="hinweis">
<b>Bevor du eine Zahl für bare Münze nimmst.</b> An einer Seite, die sich
<i>nicht</i> geändert hat, schwankt die Leistungs-Zahl gemessen um bis zu
<b>19&nbsp;Punkte</b> — auch bei Google. Ein Unterschied unter 20 ist deshalb noch
kein Ereignis. Und wenn in der Spalte <span class="quelle">Quelle</span> zwischen zwei
Messungen etwas anderes steht, sagt der Sprung zuerst etwas über die
<b>Messung</b> aus, nicht über die App.
</div>

<div class="leiste">
  <input type="search" id="suche" placeholder="App suchen …" aria-label="App suchen">
  <button type="button" id="sichern">Notizen sichern</button>
  <button type="button" id="einlesen">Notizen einlesen</button>
  <button type="button" id="thema">Hell / Dunkel</button>
  <input type="file" id="datei" accept="application/json" hidden>
</div>

<div class="rolle">
<table class="tabelle">
  <caption>Klick auf einen Namen öffnet Verlauf, Beanstandungen und dein Notizfeld.</caption>
  <thead>
    <tr>
      <th scope="col" class="links">#</th>
      <th scope="col" class="links"><button type="button" data-sort="name">Seite</button></th>
      <th scope="col"><button type="button" data-sort="schnitt">Schnitt</button></th>
      <th scope="col"><button type="button" data-sort="l">Leistung</button></th>
      <th scope="col"><button type="button" data-sort="b">Bedien&shy;barkeit</button></th>
      <th scope="col" class="verstecken-klein"><button type="button" data-sort="p">Praxis</button></th>
      <th scope="col" class="verstecken-klein"><button type="button" data-sort="a">Auffind&shy;barkeit</button></th>
      <th scope="col" class="verstecken-klein">Quelle</th>
    </tr>
  </thead>
  <tbody id="rumpf"></tbody>
</table>
</div>

<p class="fuss">
Gebaut aus <code>forschung/messreihe.json</code>. Die nächtliche Aktion misst und baut diese
Seite neu — die Zahlen hier veralten also nicht, solange du sie von der Seite aus öffnest.
Als heruntergeladene Datei zeigt sie den Stand vom Tag des Herunterladens.<br>
<b>Deine Notizen liegen in diesem Browser</b>, nicht in der Datei — sonst wären sie beim
nächsten nächtlichen Bau weg. Zum Mitnehmen auf ein anderes Gerät: <i>Notizen sichern</i>.
</p>
</div>

<script id="daten" type="application/json">${eingebettet}</script>
<script>
(function(){
  "use strict";
  var daten = JSON.parse(document.getElementById("daten").textContent);

  /* Der Schlüssel trägt einen eigenen Namen. Auf family-projekt.de liegen mehrere
     Seiten auf derselben Adresse; ein allgemeiner Name wie "notizen" würde sich
     mit einer Geschwister-Seite in die Quere kommen. */
  var SCHLUESSEL = "fp_forschung_notizen_v1";
  var notizen = {};
  try { notizen = JSON.parse(localStorage.getItem(SCHLUESSEL) || "{}"); } catch(e){ notizen = {}; }
  function notizenSpeichern(){
    try { localStorage.setItem(SCHLUESSEL, JSON.stringify(notizen)); } catch(e){}
  }

  var MASSE = [["l","Leistung"],["b","Bedienbarkeit"],["p","Gute Praxis"],["a","Auffindbarkeit"]];
  var sortNach = "schnitt", sortAb = true, filter = "";
  var offen = {};

  function zeilen(){
    var raus = [];
    for (var id in daten.reihen){
      var r = daten.reihen[id];
      var p = r.punkte[r.punkte.length - 1];
      if (!p) continue;
      raus.push({
        id: id, name: r.name, url: r.url, punkte: r.punkte, jetzt: p,
        schnitt: (p.l + p.b + p.p + p.a) / 4
      });
    }
    return raus;
  }

  function note(w){ return w >= 90 ? "gut" : w >= 70 ? "mittel" : "schwach"; }
  function esc(t){
    return String(t).replace(/[&<>"]/g, function(z){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[z];
    });
  }

  function zeichnen(){
    var liste = zeilen().filter(function(z){
      return !filter || z.name.toLowerCase().indexOf(filter) >= 0;
    });
    liste.sort(function(a,b){
      var x, y;
      if (sortNach === "name"){ x = a.name.toLowerCase(); y = b.name.toLowerCase();
        return (x < y ? -1 : x > y ? 1 : 0) * (sortAb ? 1 : -1); }
      x = sortNach === "schnitt" ? a.schnitt : a.jetzt[sortNach];
      y = sortNach === "schnitt" ? b.schnitt : b.jetzt[sortNach];
      return (y - x) * (sortAb ? 1 : -1);
    });

    var rumpf = document.getElementById("rumpf");
    rumpf.textContent = "";
    liste.forEach(function(z, i){
      var p = z.jetzt;
      var tr = document.createElement("tr");
      var hatNotiz = (notizen[z.id] || "").trim().length > 0;
      tr.innerHTML =
        '<td class="links">' + (i+1) + '</td>' +
        '<td class="links"><button type="button" class="name" data-id="' + esc(z.id) + '"' +
          ' aria-expanded="' + (offen[z.id] ? "true" : "false") + '">' + esc(z.name) + '</button>' +
          (hatNotiz ? ' <span class="notizmarke" title="eigene Notiz vorhanden">✎</span>' : '') + '</td>' +
        '<td class="schnitt ' + note(z.schnitt) + '">' + z.schnitt.toFixed(1) + '</td>' +
        '<td class="' + note(p.l) + '">' + p.l + '</td>' +
        '<td class="' + note(p.b) + '">' + p.b + '</td>' +
        '<td class="verstecken-klein ' + note(p.p) + '">' + p.p + '</td>' +
        '<td class="verstecken-klein ' + note(p.a) + '">' + p.a + '</td>' +
        '<td class="verstecken-klein quelle">' + (p.q === "google" ? "Google" : "eigen") + '</td>';
      rumpf.appendChild(tr);

      if (!offen[z.id]) return;
      var d = document.createElement("tr");
      d.className = "detail";
      var td = document.createElement("td");
      td.colSpan = 8;

      var verlauf = z.punkte.map(function(x){
        var spanne = x.von === x.bis ? x.von : x.von + " … " + x.bis;
        return '<div>' + spanne + '  ·  L ' + x.l + '  B ' + x.b + '  P ' + x.p + '  A ' + x.a +
               '  <span class="quelle">' + (x.q === "google" ? "Google" : "eigen") + '</span></div>';
      }).join("");

      var mangel = p.m.length
        ? "<ul>" + p.m.map(function(m){ return "<li>" + esc(m) + "</li>"; }).join("") + "</ul>"
        : '<p class="quelle">Keine Beanstandung — sauber.</p>';

      td.innerHTML =
        '<h3>Verlauf</h3><div class="verlauf">' + verlauf + '</div>' +
        '<h3>Was zuletzt beanstandet wurde</h3>' + mangel +
        '<label for="n-' + esc(z.id) + '">Deine Notiz zu ' + esc(z.name) +
          ' — was ist hier zu tun, was hast du versucht?</label>' +
        '<textarea id="n-' + esc(z.id) + '" data-notiz="' + esc(z.id) + '"></textarea>' +
        (z.url ? '<p style="margin:.6rem 0 0"><a href="' + esc(z.url) + '" target="_blank" rel="noopener">Seite öffnen ↗</a></p>' : '');
      d.appendChild(td);
      rumpf.appendChild(d);

      var feld = td.querySelector("textarea");
      feld.value = notizen[z.id] || "";
      feld.addEventListener("input", function(){
        notizen[z.id] = feld.value;
        notizenSpeichern();
      });
    });

    document.getElementById("unter").textContent =
      liste.length + " von " + zeilen().length + " Seiten · Stand " + (daten.gepflegt || "unbekannt");
  }

  document.getElementById("rumpf").addEventListener("click", function(e){
    var k = e.target.closest(".name");
    if (!k) return;
    var id = k.getAttribute("data-id");
    offen[id] = !offen[id];
    zeichnen();
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-sort]"), function(k){
    k.addEventListener("click", function(){
      var s = k.getAttribute("data-sort");
      if (sortNach === s) sortAb = !sortAb; else { sortNach = s; sortAb = true; }
      zeichnen();
    });
  });

  document.getElementById("suche").addEventListener("input", function(e){
    filter = e.target.value.toLowerCase().trim();
    zeichnen();
  });

  document.getElementById("thema").addEventListener("click", function(){
    var jetzt = document.documentElement.getAttribute("data-thema");
    var hell = jetzt ? jetzt === "hell"
      : window.matchMedia("(prefers-color-scheme: light)").matches;
    document.documentElement.setAttribute("data-thema", hell ? "dunkel" : "hell");
    try { localStorage.setItem("fp_forschung_thema_v1", hell ? "dunkel" : "hell"); } catch(e){}
  });
  try {
    var t = localStorage.getItem("fp_forschung_thema_v1");
    if (t) document.documentElement.setAttribute("data-thema", t);
  } catch(e){}

  document.getElementById("sichern").addEventListener("click", function(){
    var b = new Blob([JSON.stringify(notizen, null, 1)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "forschung-notizen.json";
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
  });

  document.getElementById("einlesen").addEventListener("click", function(){
    document.getElementById("datei").click();
  });
  document.getElementById("datei").addEventListener("change", function(e){
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var leser = new FileReader();
    leser.onload = function(){
      try {
        var neu = JSON.parse(leser.result);
        /* Zusammenführen statt ersetzen — sonst löscht eine alte Sicherung
           still weg, was inzwischen auf diesem Gerät dazugekommen ist. */
        for (var k in neu) if (neu[k]) notizen[k] = neu[k];
        notizenSpeichern();
        zeichnen();
      } catch(err){ alert("Diese Datei konnte nicht gelesen werden."); }
    };
    leser.readAsText(f);
    e.target.value = "";
  });

  zeichnen();

  /* Von der Seite aus geöffnet: nachsehen, ob es inzwischen frischere Zahlen
     gibt. Aus dem Download-Ordner (file://) schlägt das fehl — dann bleibt es
     bei den eingebetteten Zahlen, und die Seite funktioniert trotzdem. */
  if (location.protocol === "http:" || location.protocol === "https:"){
    fetch("messreihe.json", { cache: "no-store" }).then(function(a){
      return a.ok ? a.json() : null;
    }).then(function(frisch){
      if (!frisch || !frisch.reihen) return;
      if ((frisch.gepflegt || "") <= (daten.gepflegt || "")) return;
      daten = {
        gepflegt: frisch.gepflegt,
        reihen: Object.fromEntries(Object.entries(frisch.reihen).map(function(e){
          return [e[0], { name: e[1].name, url: e[1].url, punkte: (e[1].punkte||[]).map(function(p){
            return { von:p.von, bis:p.bis, l:p.leistung, b:p.bedienbarkeit,
                     p:p.gute_praxis, a:p.auffindbarkeit, q:p.quelle, m:p.mangel||[] };
          })}];
        }))
      };
      zeichnen();
    }).catch(function(){});
  }
})();
</script>
</body>
</html>
`;

fs.writeFileSync(ZIEL, html);
const anzahl = Object.keys(daten.reihen).length;
console.log(`forschung/tabelle.html gebaut — ${anzahl} Seiten, Stand ${daten.gepflegt || "unbekannt"}.`);
