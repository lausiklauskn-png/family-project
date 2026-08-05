/* Headless-Smoke über ALLE Seiten: lädt jede Seite, prüft kritische Konsolen-
 * Fehler, Schlüssel-Elemente, Andock-Wizard, Marktplatz-Formular. Beweis der
 * Seiten-Logik; Klaus' Browser-Sichttest bleibt unersetzbar. */
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pw = await import(process.env.PW_CORE || "playwright-core");
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png" };
const server = http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(ROOT,p); if(!fp.startsWith(ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){res.writeHead(404);res.end("404");return;} res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"}); fs.createReadStream(fp).pipe(res);});
await new Promise(r=>server.listen(0,r)); const port=server.address().port; const base=`http://127.0.0.1:${port}`;

let pass=0, fail=0;
function ok(c,m){ if(c){pass++;console.log("  ✓",m);} else {fail++;console.log("  ✗",m);} }
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args:["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swrast"] });

async function load(rel){
  const page = await browser.newPage();
  // POSTs abfangen statt abschicken. Die Formulare gehen seit 2026-07-21 an
  // einreichung.php — ohne diesen Mitschnitt liefe der Test in eine echte
  // Einsendung oder in einen Netz-Fehler, und man saehe nicht, was gesendet wurde.
  await page.addInitScript(()=>{
    window.__posts=[];
    const rf=window.fetch;
    window.fetch=function(u,o){
      if(o&&o.method==="POST"){ let b=null; try{b=JSON.parse(o.body);}catch(_e){}
        window.__posts.push({url:String(u), body:b});
        return Promise.resolve({ok:true, json:async()=>({ok:true})}); }
      return rf.apply(this,arguments);
    };
  });
  const errors=[];
  page.on("console",(m)=>{ if(m.type()==="error") errors.push(m.text()); });
  page.on("pageerror",(e)=>errors.push("pageerror: "+e.message));
  await page.goto(base+rel,{waitUntil:"load"}); await page.waitForTimeout(1200);
  const real = errors.filter((e)=>!/transformers|jsdelivr|cdn|net::ERR|Failed to load resource.*(cdn|jsdelivr)/i.test(e));
  return { page, real };
}

console.log("Family Projekt — Smoke über alle Seiten");
for (const rel of ["/index.html","/netzwerk.html","/werkzeuge.html","/markt.html","/impressum.html","/werkzeuge/such-werkzeug.html","/werkzeuge/andock-werkzeug.html","/werkzeuge/knoten-werkzeug.html"]) {
  const { page, real } = await load(rel);
  ok(real.length===0, rel+" — keine kritischen Fehler"+(real.length?" — "+JSON.stringify(real.slice(0,3)):""));
  ok(await page.evaluate(()=>!!window.FP), rel+" — app.js geladen");
  ok(await page.evaluate(()=>!!window.MycelBg), rel+" — three.js-Hintergrund aktiv");
  await page.close();
}

// Vertiefte Checks
console.log("\nDetail-Checks");
{ const { page } = await load("/werkzeuge.html");
  ok(await page.evaluate(()=>document.querySelectorAll("#toolGrid .area").length===(window.FP_WERKZEUGE||[]).length && (window.FP_WERKZEUGE||[]).length>=8), "werkzeuge: alle Tool-/App-Karten gerendert");
  ok(await page.evaluate(()=>!!document.querySelector('#toolGrid a[href*="Mein-Rezeptbuch"][target="_blank"]')), "werkzeuge: öffentliche App-Karte (Rezeptbuch) extern verlinkt");
  await page.close(); }
// Seit 2026-08-05 stehen die Listen ZUSAETZLICH statisch im HTML (tools/
// statische-listen.mjs). `render()` setzt innerHTML und ERSETZT sie damit —
// das ist gewollt. Die Gefahr ist das Gegenteil: anhaengen statt ersetzen,
// dann stuende jeder Eintrag zweimal da. Genau dagegen zaehlen diese zwei
// Pruefungen. Der HTML-Waechter (smoke_statische_listen.mjs) kann das nicht
// sehen — er laesst bewusst kein JavaScript laufen.
{ const { page } = await load("/markt.html");
  ok(await page.evaluate(()=>document.querySelectorAll("#mkListings .listing").length===(window.FP_LISTINGS||[]).length && (window.FP_LISTINGS||[]).length>=10),
    "markt: jeder Eintrag steht genau einmal (statisch ersetzt, nicht ergaenzt)");
  ok(await page.evaluate(()=>{
    const hrefs=[...document.querySelectorAll('#mkListings a.ext')].map(a=>a.getAttribute("href"));
    return hrefs.length===new Set(hrefs).size;
  }), "markt: keine Adresse doppelt verlinkt");
  await page.close(); }
{ const { page } = await load("/werkzeuge.html");
  ok(await page.evaluate(()=>{
    const hrefs=[...document.querySelectorAll('#toolGrid a')].map(a=>a.getAttribute("href"));
    return hrefs.length===new Set(hrefs).size;
  }), "werkzeuge: keine Adresse doppelt verlinkt");
  await page.close(); }
{ const { page } = await load("/werkzeuge/such-werkzeug.html");
  ok(await page.evaluate(()=>document.querySelectorAll("#toolMain .feat .f").length===4), "such-werkzeug: 4 Vorteils-Kacheln");
  ok(await page.evaluate(()=>!!document.querySelector("#toolMain .price")), "such-werkzeug: Preis-Block");
  ok(await page.evaluate(()=>!document.querySelector("#mainlabel") && !document.querySelector(".shot .ph")), "such-werkzeug: kein leerer Screenshot-Platzhalter mehr");
  await page.close(); }
{ const { page } = await load("/werkzeuge/andock-werkzeug.html");
  ok(await page.evaluate(()=>document.querySelectorAll("#toolMain .rf-band .rf-step").length===3), "andock: roter Faden mit 3 Schritten");
  ok(await page.evaluate(()=>{const s=document.querySelector("#toolMain .rf-step.on .rf-txt b");return s && /Kennenlernen/.test(s.textContent);}), "andock: Schritt 1 (Kennenlernen) aktiv");
  ok(await page.evaluate(()=>!!document.querySelector("#toolMain .seal-sec #sealName") && !!document.querySelector("#toolMain #sealDl")), "andock: Siegel-Block mit Namensfeld + Download");
  ok(await page.evaluate(()=>document.querySelectorAll("#toolMain .lm-sec .lm-group").length>=5), "andock: Link-Landkarte mit mehreren Gruppen");
  ok(await page.evaluate(()=>[...document.querySelectorAll("#toolMain .lm-link,#toolMain .dl-item,#toolMain a.rf-step")].every(a=>a.getAttribute("href")&&a.getAttribute("href")!=="#")), "andock: kein Link ins Leere (jeder href gesetzt)");
  ok(await page.evaluate(()=>!!document.querySelector('#toolMain .dl-item[href$="sbkim-siegel-wappen.svg"][download]')), "andock: Siegel-SVG als echter Download");
  ok(await page.evaluate(()=>!document.querySelector("#mainlabel")), "andock: kein leerer Screenshot-Platzhalter");
  await page.close(); }
{ const { page } = await load("/werkzeuge/knoten-werkzeug.html");
  ok(await page.evaluate(()=>/Entwickler/.test(document.querySelector("#toolMain .eyebrow").textContent)), "knoten: als Entwickler-Thema gekennzeichnet");
  ok(await page.evaluate(()=>{const s=document.querySelector("#toolMain .rf-step.on .rf-txt b");return s && /Knoten erzeugen/.test(s.textContent);}), "knoten: Schritt 2 (Knoten erzeugen) aktiv");
  ok(await page.evaluate(()=>document.querySelectorAll("#toolMain .dl-sec .dl-item").length>=4), "knoten: Kopier-Bausteine vorhanden");
  ok(await page.evaluate(()=>[...document.querySelectorAll("#toolMain a.rf-step,#toolMain .lm-link,#toolMain .dl-item")].every(a=>a.getAttribute("href")&&a.getAttribute("href")!=="#")), "knoten: kein Link ins Leere");
  await page.close(); }
{ const { page } = await load("/netzwerk.html");
  ok(await page.evaluate(()=>{const s=[...document.querySelectorAll("section")].find(x=>x.querySelector('[data-i18n="nw_promise_h"]'));return !!s && s.querySelectorAll(".stage").length===3;}), "netzwerk: 3 Versprechen-Stufen");
  ok(await page.evaluate(()=>{const s=[...document.querySelectorAll("section")].find(x=>x.querySelector('[data-i18n="nw_ways_h"]'));return !!s && s.querySelectorAll(".stage").length===2 && !!s.querySelector('a[href="markt.html"]') && !!s.querySelector('a[href="#bauen"]');}), "netzwerk: zwei Wege-Karten (Marktplatz + Bauen)");
  ok(await page.evaluate(()=>!!document.querySelector('#bauen .nw-vorteil, section:has([data-i18n="nw_wayB_vorteil"]) .nw-vorteil') || !!document.querySelector('[data-i18n="nw_wayB_vorteil"]')), "netzwerk: Bau-Weg zeigt den Vorteil (sinnbasiert gefunden werden)");
  ok(await page.evaluate(()=>{const s=document.getElementById("bauen");return !!s && s.querySelectorAll(".stage").length===3 && !!document.getElementById("andock") && !!document.getElementById("andockWizard");}), "netzwerk: Bau-Detail mit 3 Schritten + Andock-Wizard erhalten");
  ok(await page.evaluate(()=>{const p=document.querySelector('[data-i18n="nw_vision_honest"]');return !!p && /2026-07-12/.test(p.textContent) && /bewiesen/.test(p.textContent);}), "netzwerk: ehrlicher Stand aufgefrischt (2026-07-12)");
  ok(await page.evaluate(()=>!document.querySelector('[data-i18n="nw_vision_sub"]') && !document.querySelector('.prep[data-i18n="nw_prep"]')), "netzwerk: chattiger Vision-Satz entfernt");
  ok(await page.evaluate(()=>!!document.getElementById("sbkim-aw-go")), "netzwerk: Andock-Wizard gemountet");
  ok(await page.evaluate(()=>!!document.querySelector("#andockWizard .field .mic")), "netzwerk: Mikrofon am Wizard-Feld nachgerüstet");
  ok(await page.evaluate(()=>!!document.getElementById("fpCopyAndock")), "netzwerk: 'Anleitung kopieren'-Knopf vorhanden");
  ok(await page.evaluate(async()=>{try{const r=await fetch("docs/MYCEL-ANDOCK-AUFTRAG.md");const t=await r.text();return r.ok && /Pflicht-Module/.test(t) && /generateOwnSpore/.test(t);}catch(e){return false;}}), "netzwerk: Mycel-Andock-Auftrag erreichbar + vollständig");
  // Newcomer-Komfort: nach „Spore-Vorlage erzeugen" gibt es Kopier-Knöpfe + einen
  // „in DEINEM Repo anlegen"-Link (aus der Repo-Eingabe gebaut). Modul 19 bleibt 1:1.
  ok(await page.evaluate(async()=>{
    document.getElementById("sbkim-aw-repo").value="https://github.com/maxmuster/meine-seite";
    document.getElementById("sbkim-aw-domain").value="Kochrezepte";
    document.getElementById("sbkim-aw-go").click();
    await new Promise(r=>setTimeout(r,30));
    const extra=document.getElementById("fp-aw-extra"); if(!extra) return false;
    const link=[...extra.querySelectorAll("a")].find(a=>/\/new\/main\?filename=sbkim%2Fspore\.json/.test(a.getAttribute("href")||""));
    const linkOk=link && /github\.com\/maxmuster\/meine-seite\/new\/main/.test(link.getAttribute("href"));
    const copyBtns=extra.querySelectorAll("button.slim, button.btn.slim, .fp-aw-row button");
    return !!(linkOk && copyBtns.length>=2);
  }), "netzwerk: Wizard-Ausgang geführt (Kopier-Knöpfe + 'in deinem Repo anlegen'-Link)");
  await page.close(); }
{ const { page } = await load("/index.html");
  ok(await page.evaluate(()=>document.querySelector(".fp-sw").classList.contains("docked")), "widget: startet angedockt");
  ok(await page.evaluate(()=>getComputedStyle(document.querySelector(".fp-sw .fp-sw-x")).display==="none"), "widget: angedockt ohne ✕");
  // Andocken/Lösen über die öffentliche API
  await page.evaluate(()=>window.FPStatusWidget.setMode("floating"));
  ok(await page.evaluate(()=>document.querySelector(".fp-sw").classList.contains("floating")), "widget: gelöst → floating");
  ok(await page.evaluate(()=>{const s=getComputedStyle(document.querySelector(".fp-sw"));return s.flexDirection==="row" && getComputedStyle(document.querySelector(".fp-sw .fp-sw-x")).display!=="none";}), "widget: floating bleibt waagerecht (gleiche Form) + ✕ sichtbar");
  // Echtes Ziehen nach unten zum Lösen (aus angedockt)
  await page.evaluate(()=>window.FPStatusWidget.setMode("docked"));
  const box = await page.evaluate(()=>{const r=document.querySelector(".fp-sw").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
  await page.mouse.move(box.x, box.y); await page.mouse.down();
  await page.mouse.move(box.x, box.y+120, {steps:6}); await page.mouse.move(box.x, box.y+260, {steps:6}); await page.mouse.up();
  ok(await page.evaluate(()=>document.querySelector(".fp-sw").classList.contains("floating")), "widget: Ziehen nach unten löst es (Maus)");
  // Schließen → Restore-Chip
  await page.evaluate(()=>document.querySelector('.fp-sw [data-act="close"]').click());
  ok(await page.evaluate(()=>{const r=document.querySelector(".fp-sw-restore");return r && r.style.display!=="none";}), "widget: X schließt → Restore-Chip erscheint");
  // Bild des Tages: 5-fach-Klick (schnell) öffnet das Wechsel-Fenster
  ok(await page.evaluate(()=>{const pad=document.getElementById("tagesbildPad");for(let i=0;i<5;i++)pad.dispatchEvent(new MouseEvent("click",{bubbles:true}));const m=document.querySelector(".fp-bild-modal");return !!(m&&m.classList.contains("open")&&m.querySelector("#fpDrop"));}), "Bild des Tages: 5-fach-Klick öffnet Drag&Drop-Fenster");
  // Bild des Tages: Feenstaub-Canvas (Funkel im Maus-Umfeld) ist gemountet + klick-durchlässig
  ok(await page.evaluate(()=>{const c=document.querySelector("#tagesbildPad canvas.fp-dust");return !!c && getComputedStyle(c).pointerEvents==="none";}), "Bild des Tages: Feenstaub-Canvas gemountet (pointer-events:none, 5-Klick unberührt)");
  // Weekly Discovery: 5-fach-Klick aufs Weekly-Bild öffnet das eigene Wechsel-Fenster (für den aktuellen Eintrag)
  ok(await page.evaluate(()=>{const shot=document.getElementById("discShot");for(let i=0;i<5;i++)shot.dispatchEvent(new MouseEvent("click",{bubbles:true}));const ms=document.querySelectorAll(".fp-bild-modal");const w=[...ms].find(m=>m.querySelector("#fpwDrop"));return !!(w&&w.classList.contains("open")&&w.querySelector("#fpwName"));}), "Weekly: 5-fach-Klick öffnet Bild-Wechsel-Fenster (eigener Eintrag)");
  // Das Wechsel-Fenster zielt auf den GERADE angezeigten Weekly-Eintrag
  ok(await page.evaluate(()=>{const ms=document.querySelectorAll(".fp-bild-modal");const w=[...ms].find(m=>m.querySelector("#fpwDrop"));const shown=(document.getElementById("discName").textContent||"").trim();return !!w && (w.querySelector("#fpwName").textContent||"").trim()===shown;}), "Weekly: Wechsel-Fenster zielt auf den angezeigten Eintrag");
  // PWA: Manifest + Service-Worker + Icons (installierbar + offline, Schritt 1)
  ok(await page.evaluate(async()=>{try{const r=await fetch("manifest.json");const j=await r.json();return r.ok&&j.name==="Family Projekt"&&j.display==="standalone"&&Array.isArray(j.icons)&&j.icons.length>=2;}catch(e){return false;}}), "PWA: manifest.json erreichbar + gültig (standalone, ≥2 Icons)");
  ok(await page.evaluate(async()=>{try{const a=await fetch("sw.js");const b=await fetch("icon-192.png");const c=await fetch("icon-512.png");return a.ok&&b.ok&&c.ok;}catch(e){return false;}}), "PWA: sw.js + Icons (192/512) erreichbar");
  ok(await page.evaluate(()=>!!document.querySelector('link[rel="manifest"]')&&!!document.querySelector('link[rel="apple-touch-icon"]')&&!!document.querySelector('script')&&/serviceWorker/.test(document.documentElement.innerHTML)), "PWA: index verlinkt manifest + apple-touch-icon + SW-Registrierung");
  await page.close(); }
{ const { page } = await load("/markt.html");
  /* Aufgeraeumt 2026-08-01: der Test verlangte frueher den SICHTBAREN Leer-Hinweis
   * — aus der Zeit, als der Marktplatz noch leer war. Inzwischen stehen 14 Apps
   * drin, also gehoert der Hinweis WEG. Geprueft wird jetzt beides zusammen:
   * Eintraege da UND Hinweis versteckt. So faellt sowohl eine leere Liste auf
   * als auch ein Hinweis, der ueber den Eintraegen kleben bleibt. */
  ok(await page.evaluate(()=>{
    const leer=document.getElementById("mkEmpty");
    const n=document.querySelectorAll("#mkListings .listing").length;
    return !!leer && n>0 && leer.hidden;
  }), "markt: Eintraege gerendert, Leer-Hinweis korrekt versteckt");
  ok(await page.evaluate(()=>document.querySelectorAll("#mkSubmit .mic").length>=1), "markt: Mikrofon im Einreich-Formular");
  ok(await page.evaluate(()=>!!window.SbkimOcr && typeof window.SbkimOcr.recognize==="function"), "markt: Modul 24 (SbkimOcr) geladen");
  // Klaus 2026-07-12: KEINE 📷-OCR-Knöpfe im Eintrag-Formular (sinnlos für
  // Titel/Link/Bild — getippte Adressen, keine abfotografierbaren Texte).
  ok(await page.evaluate(()=>document.querySelectorAll("#mkSubmit .cam").length===0), "markt: kein 📷 (OCR) im Eintrag-Formular (data-noocr)");
  // Bild-Feld: Live-Vorschau + „Bild vom Gerät wählen".
  ok(await page.evaluate(()=>!!document.getElementById("sbImgPrev") && !!document.getElementById("sbImgPick")), "markt: Bild-Feld mit Vorschau + Gerät-Auswahl");
  ok(await page.evaluate(()=>{const p=document.getElementById("sbImgPrev");return !!p.querySelector(".mk-imgprev-empty");}), "markt: Bild-Vorschau zeigt Leer-Zustand vor Eingabe");
  await page.fill("#sbImg","https://example.com/shot.jpg");
  ok(await page.evaluate(()=>{const im=document.querySelector("#sbImgPrev img");return !!im && /shot\.jpg$/.test(im.src);}), "markt: Bild-Link erzeugt sofort eine Vorschau");
  await page.fill("#sbImg","");
  // Formular-Validierung: ungültiges Bild -> Hinweis
  /* Aufgeraeumt 2026-08-01. Zwei Dinge hatten sich geaendert, seit der Test
   * geschrieben wurde, und beide machten ihn still wirkungslos:
   *   1. Das Formular hat ein PFLICHTFELD `sbContact` (E-Mail) bekommen. Der Test
   *      fuellte es nicht, also blockierte die Browser-eigene Pruefung das
   *      Absenden — es passierte GAR NICHTS, und der Test las ein leeres
   *      Ausgabefeld. Er pruefte damit nichts mehr, sah aber aus wie ein Test.
   *   2. Der Endpunkt ist seit 2026-07-21 live gesetzt, es gibt also keinen
   *      Kopier-Block mehr, sondern eine echte Einsendung.
   * Jetzt werden alle Pflichtfelder gefuellt und auf das ERGEBNIS gewartet. */
  const fuellen = async (img) => {
    await page.fill("#sbTitle","Test"); await page.fill("#sbBy","@test");
    await page.fill("#sbUrl","https://example.com/app/"); await page.fill("#sbImg",img);
    await page.fill("#sbText","Beschreibung mit genug Text.");
    await page.fill("#sbContact","test@example.com");
  };
  ok(await page.evaluate(()=>!!document.getElementById("sbContact")?.required),
    "markt: Kontakt-E-Mail ist Pflichtfeld im Einreich-Formular");
  await fuellen("https://example.com/x.svg");
  await page.evaluate(()=>{window.__posts=[];});
  await page.click("#mkSubmit button[type=submit]");
  await page.waitForFunction(()=>{const o=document.getElementById("sbOut");return (o&&(o.textContent||"").trim())||window.__posts.length;},null,{timeout:8000}).catch(()=>{});
  ok(await page.evaluate(()=>/SVG|ungültig/i.test(document.getElementById("sbOut").textContent) && window.__posts.length===0),
    "markt: SVG-Bild wird abgelehnt — und NICHT abgeschickt");
  await fuellen("https://example.com/shot.jpg");
  await page.evaluate(()=>{window.__posts=[];});
  await page.click("#mkSubmit button[type=submit]");
  await page.waitForFunction(()=>window.__posts.length>0,null,{timeout:8000}).catch(()=>{});
  ok(await page.evaluate(()=>{
    const p=window.__posts[0];
    return !!p && /einreichung\.php/.test(p.url) && p.body && p.body.app==="Test";
  }), "markt: gültiger Eintrag geht an einreichung.php (Warteschlange, keine Auto-Veröffentlichung)");
  // Spam-Schutz: Honigtopf-Feld in beiden Formularen (Einreichung + Kontakt)
  ok(await page.evaluate(()=>!!document.querySelector("#mkSubmit .fp-hp #sbHp") && !!document.querySelector("#mkContact .fp-hp #ctHp")), "markt: Honigtopf-Feld in Einreich- und Kontakt-Formular");
  // Kontakt-Formular (echtes Formular statt mailto, Klaus 2026-07-21)
  ok(await page.evaluate(()=>{const f=document.getElementById("mkContact");return !!(f&&f.querySelector("#ctEmail")&&f.querySelector("#ctMsg")&&f.querySelector('button[type=submit]'));}), "markt: Kontakt-Formular mit E-Mail + Nachricht + Absenden");
  // Kontakt ohne Endpoint: Pflichtfeld-Prüfung greift (leere Nachricht -> Hinweis, kein mailto-Sprung)
  /* Aufgeraeumt 2026-08-01: geprueft wurde frueher eine eigene Fehlermeldung bei
   * leerer Nachricht. Die gibt es nicht mehr — `ctMsg` ist Pflichtfeld, der
   * Browser blockiert das Absenden selbst. Das ist STRENGER als vorher, aber der
   * alte Test las nur ein leeres Ausgabefeld und meldete Fehlschlag. Jetzt beide
   * Richtungen: unvollstaendig geht NICHT raus, vollstaendig geht raus. */
  await page.fill("#ctEmail","a@b.de");
  await page.evaluate(()=>{document.getElementById("ctMsg").value=""; window.__posts=[];});
  await page.click("#mkContact button[type=submit]"); await page.waitForTimeout(300);
  ok(await page.evaluate(()=>window.__posts.length===0 && !document.getElementById("mkContact").checkValidity()),
    "markt: Kontakt ohne Nachricht wird gar nicht erst abgeschickt (Pflichtfeld)");
  await page.fill("#ctMsg","Eine echte Nachricht mit genug Text.");
  await page.evaluate(()=>{window.__posts=[];});
  await page.click("#mkContact button[type=submit]");
  await page.waitForFunction(()=>window.__posts.length>0,null,{timeout:8000}).catch(()=>{});
  ok(await page.evaluate(()=>{const p=window.__posts[0];return !!p && p.body && p.body.zweck==="kontakt";}),
    "markt: vollständiger Kontakt geht als zweck:\"kontakt\" raus");
  // Boot-Regression: der entfernte renderFreeCount-Aufruf darf nicht mehr werfen
  ok(await page.evaluate(()=>typeof window.renderFreeCount==="undefined"), "markt: kein renderFreeCount-Rest (Boot ohne ReferenceError)");
  // Spenden/Jahresbeitrag: Platzhalter (enabled:false) -> deaktivierte Knöpfe, kein echter Link
  /* Aufgeraeumt 2026-08-01: die Spenden waren als deaktivierte Platzhalter
   * gebaut (enabled:false) und sind inzwischen scharf — ein echter PayPal-Link.
   * Das ist eine bewusste Aenderung, kein Fehler. Der alte Test haette sie
   * dauerhaft rot gemeldet. Geprueft wird jetzt, was bei einem SCHARFEN
   * Zahlungs-Link wirklich zaehlt: er geht in einen neuen Tab, ohne der
   * Zielseite Zugriff auf unser Fenster zu geben (rel=noopener), und die Seite
   * fragt selbst KEINE Zahlungsdaten ab. */
  const spenden = await page.evaluate(()=>[...document.querySelectorAll("#spDonate a")].map(a=>({
    href:a.getAttribute("href")||"", target:a.getAttribute("target")||"", rel:a.getAttribute("rel")||"" })));
  ok(spenden.length>=1 && spenden.every(a=>/^https:\/\//.test(a.href)),
    `markt: Spenden-Link vorhanden und https (${spenden.length})`);
  ok(spenden.every(a=>a.target==="_blank" && /noopener/.test(a.rel)),
    "markt: Spenden-Link öffnet neuen Tab mit rel=noopener (kein Fenster-Zugriff für die Zielseite)");
  ok(await page.evaluate(()=>!document.querySelector('#spDonate input[type=number],#spDonate input[name*=iban i],#spDonate input[type=password]')),
    "markt: die Seite selbst fragt KEINE Zahlungsdaten ab (nur Weiterleitung)");
  await page.close(); }

// Footer-Bauleiste (Meine Apps) ist dev-only — öffentlich verborgen.
// Die ÖFFENTLICHE App-Leiste (.pubapplinks) ist dagegen IMMER sichtbar.
console.log("\nFooter-Bauleiste (dev-only) + öffentliche App-Leiste");
{ const { page } = await load("/index.html");
  /* Aufgeraeumt 2026-08-01: die Leiste `.applinks.toolbtns` war frueher eine
   * reine BAU-Leiste und dev-only. Inzwischen stehen dort oeffentliche Werkzeuge
   * (Such-Werkzeug, Pinnwand) — sie SOLL sichtbar sein. Der alte Test meldete
   * das dauerhaft als Fehler. Geprueft wird jetzt, was wirklich schuetzenswert
   * ist: dass dort nichts Internes auftaucht (kein ?dev-Link, kein Studio, kein
   * Postfach). */
  const leiste = await page.evaluate(()=>[...document.querySelectorAll("footer .applinks:not(.pubapplinks) a")]
    .map(a=>({text:(a.textContent||"").trim(), href:a.getAttribute("href")||""})));
  ok(leiste.length>0 && leiste.every(a=>/^https?:\/\//.test(a.href)),
    `footer: Werkzeug-Leiste zeigt öffentliche Werkzeuge (${leiste.map(a=>a.text).join(", ")})`);
  ok(!leiste.some(a=>/\?dev|studio|postfach|mailbox|freigabe|admin/i.test(a.href+a.text)),
    "footer: nichts Internes in der öffentlichen Leiste");
  ok(await page.evaluate(()=>!!document.querySelector("footer .pubapplinks a[href*='Mein-Rezeptbuch']")), "footer: öffentliche App-Leiste sichtbar (Rezeptbuch verlinkt)");
  // Öffentlicher „🌐 Mit dem Netz verbinden"-Knopf (Klaus 2026-07-08): sichtbar OHNE ?dev;
  // das Dev-Andock-Tool bleibt dabei verborgen (§6b nur für den Rendezvous-Knopf aufgehoben).
  /* Aufgeraeumt 2026-08-01: der Knopf hiess `fp-connect-btn` und heisst seit dem
   * netzweiten Modul-23-Rollout `sbkim-rdv-btn` („🌐 Mycel", aus
   * sbkim/23_rendezvous_ui.js). Die FUNKTIONEN sind alle noch da und sogar eine
   * mehr. Der alte Test suchte die alte Kennung und meldete dauerhaft Fehler,
   * obwohl nichts fehlte — genau die Sorte roter Zeile, die jede spaetere
   * Pruefung entwertet.
   *
   * Geprueft wird jetzt ueber die BESCHRIFTUNG statt ueber die Kennung: was der
   * Nutzer sieht, ueberlebt eine Umbenennung des Moduls. */
  ok(await page.evaluate(()=>!!document.getElementById("sbkim-rdv-btn") && !document.getElementById("fp-dev-mailbox-btn")),
    "connect: öffentlicher 🌐-Knopf sichtbar ohne ?dev (Dev-Andock-Tool bleibt verborgen)");
  ok(await page.evaluate(()=>{
    const b=document.getElementById("sbkim-rdv-btn"); if(!b) return false;
    b.click();
    const txt=[...document.querySelectorAll("button")].map(e=>(e.textContent||"").trim());
    return /verbinden/i.test(txt.join(" ")) && /wer ist im raum/i.test(txt.join(" ")) && /neu anmelden/i.test(txt.join(" "));
  }), "connect: 🌐-Panel öffnet mit Verbinden/Wer-ist-im-Raum/Nur-neu-anmelden");
  await page.close();
  const dev = await browser.newPage();
  await dev.goto(base+"/index.html?dev",{waitUntil:"load"}); await dev.waitForTimeout(600);
  ok(await dev.evaluate(()=>!!document.querySelector("footer .applinks:not(.pubapplinks) a")), "footer: Bauleiste mit ?dev sichtbar");
  // Dev-Briefkasten: geführter, KONSOLEN-FREIER Spore-Pfad (Klaus 2026-06-27).
  // Embedding-Modell (~30 MB) stubben, damit der Test ohne Netz/Modell läuft.
  ok(await dev.evaluate(async()=>{
    window.__fpErzeugeSpore = async()=>({ id:"node-test-123" });
    window.SbkimSpore = window.SbkimSpore || {};
    SbkimSpore.getOwnSpore = async()=>({ id:"node-test-123", domain:"family-projekt.de", nodeType:"hybrid", signature:"sig", domainVector:[0.1,0.2,0.3] });
    const btn=document.getElementById("fp-dev-spore"); if(!btn) return false;
    btn.click(); await new Promise(r=>setTimeout(r,150));
    const out=document.getElementById("fp-dev-out");
    const ta=out.querySelector("#fp-spore-json");
    const copy=out.querySelector("#fp-spore-copy");
    const link=out.querySelector("#fp-spore-newfile");
    const dl=out.querySelector("#fp-spore-dl");
    const noConsole=!/copy\(JSON|DevTools-Konsole|console/i.test(out.textContent);
    const linkOk=link && /\/new\/main\?filename=sbkim%2Fspore\.json/.test(link.getAttribute("href"));
    const jsonOk=ta && /node-test-123/.test(ta.value) && !/privat|privateKey|secret/i.test(ta.value);
    return !!(ta&&copy&&link&&dl&&noConsole&&linkOk&&jsonOk);
  }), "Dev-Briefkasten: Spore-Pfad geführt (Kopier-Knopf + GitHub-Link + Download, keine Konsole)");
  // Andock-Tool (vereinheitlicht): Panel heißt „Andock-Tool", vier Schritte,
  // Modul 20 Safe geladen + „Identität sichern"-Knopf + KI-Anleitung-Link.
  ok(await dev.evaluate(()=>!!window.SbkimSafe && typeof SbkimSafe.open==="function"), "Andock-Tool: Modul 20 Schlüssel-Safe geladen");
  ok(await dev.evaluate(()=>{const p=document.getElementById("fp-dev-mailbox");return !!p && /Andock-Tool/.test(p.textContent) && !!document.getElementById("fp-dev-safe") && !!document.getElementById("fp-dev-spore") && !!document.getElementById("fp-dev-test");}), "Andock-Tool: Panel mit Spore/Safe/Verbinden-Schritten");
  ok(await dev.evaluate(()=>{const a=[...document.querySelectorAll("#fp-dev-mailbox a")];return a.some(x=>/MYCEL-ANDOCK-AUFTRAG\.md/.test(x.getAttribute("href"))) && a.some(x=>/netzwerk\.html#andock/.test(x.getAttribute("href")));}), "Andock-Tool: KI-Anleitung + Andock-Wizard verlinkt");
  // Safe-Knopf öffnet das Modul-20-Modal (hasVault false -> Create-Modal)
  ok(await dev.evaluate(async()=>{document.getElementById("fp-dev-safe").click();for(let i=0;i<40;i++){if(document.querySelector("[data-sbkim-vault-modal]"))return true;await new Promise(r=>setTimeout(r,75));}return false;}), "Andock-Tool: Safe-Knopf öffnet Modul-20-Modal");
  // Stufe 2 verteilt: Modul 05b (Nostr-Relais-Client) geladen + Relais-Knöpfe im Andock-Tool ④
  ok(await dev.evaluate(async()=>{for(let i=0;i<40;i++){if(window.SbkimNostrRelay&&typeof SbkimNostrRelay.publish==="function")break;await new Promise(r=>setTimeout(r,75));}return !!(window.SbkimNostrRelay&&typeof SbkimNostrRelay.publish==="function"&&typeof SbkimNostrRelay.subscribe==="function");}), "Stufe 2: Modul 05b Nostr-Relais-Client geladen (SbkimNostrRelay)");
  ok(await dev.evaluate(()=>!!document.getElementById("fp-dev-relayselftest")&&!!document.getElementById("fp-dev-listen")&&typeof SbkimAnastomose.listenNostr==="function"), "Andock-Tool ④: Relais-Selbsttest + Lauschen-Knopf + listenNostr verfügbar");
  // Andock-Tool ⑤: echter Handshake-Knopf + Ziel-Auswahl (Mein-Mixarium als Schwellen-Beispiel) + handshake() verfügbar
  ok(await dev.evaluate(()=>{const b=document.getElementById("fp-dev-handshake");const s=document.getElementById("fp-dev-target");return !!b&&!!s&&typeof SbkimAnastomose.handshake==="function"&&[...s.options].some(o=>o.value==="Mein-Mixarium")&&[...s.options].some(o=>o.value==="Sage-Protokol");}), "Andock-Tool ⑤: Andock-/Handshake-Knopf + Ziel-Auswahl + handshake() verfügbar");
  // Andock-Tool ⑥: Gemeinsamer Raum (Rendezvous) — Anmelde- + Entdecken-Knopf + Relais-Publish/Subscribe verfügbar
  ok(await dev.evaluate(()=>!!document.getElementById("fp-dev-connect")&&!!document.getElementById("fp-dev-announce")&&!!document.getElementById("fp-dev-discover")&&!!window.SbkimNostrRelay&&typeof SbkimNostrRelay.publish==="function"&&typeof SbkimNostrRelay.subscribe==="function"), "Andock-Tool ⑥: Gemeinsamer-Raum-Knöpfe (Verbinden/Anmelden/Wer-ist-im-Raum) + Relais-Publish/Subscribe verfügbar");
  // Panel ist scrollbar (Überlauf-Fix): max-height + overflow gesetzt
  ok(await dev.evaluate(()=>{const p=document.getElementById("fp-dev-mailbox");if(!p)return false;const cs=getComputedStyle(p);return cs.overflowY==="auto"||cs.overflowY==="scroll";}), "Andock-Tool: Panel scrollbar (overflow-y:auto) — langer Text verdeckt Knöpfe nicht mehr");
  await dev.close(); }

// SBKIM-Siegel (Modul 16) — lebendige Selbst-Bezeugung.
// reducedMotion: der three.js-Hintergrund läuft headless auf Software-GL
// (swiftshader) und kann den Main-Thread + IndexedDB-Callbacks ausbremsen;
// mit reduzierter Bewegung läuft die Andock-Kette deterministisch durch.
// Auf echter GPU (Klaus' Tablet) ist das kein Thema.
console.log("\nSBKIM-Siegel (Modul 16)");
{ const page = await browser.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base+"/index.html",{waitUntil:"load"});
  let ready=false;
  for (let i=0;i<40;i++){ await page.waitForTimeout(200); ready=await page.evaluate(()=>window.SbkimSiegel&&SbkimSiegel._meta&&SbkimSiegel._meta.ready===true); if(ready)break; }
  ok(ready, "siegel: Andock-Kette läuft durch (Siegel.init ready)");
  ok(await page.evaluate(()=>!!window.SbkimApoptose && typeof SbkimApoptose.prepareSelfApoptose==="function"), "siegel: Modul 07 Apoptose geladen (Pflicht-Modul)");
  ok(await page.evaluate(()=>window.SbkimSiegel.isCertified()===true), "siegel: zertifiziert (alle Pflicht-Module 01/02/03/04/05/07/15)");
  ok(await page.evaluate(()=>SbkimSiegel.getCertifiedModules().includes("07")), "siegel: 07 in zertifizierten Modulen");
  ok(await page.evaluate(()=>!!document.getElementById("sbkim-siegel-badge")), "siegel: Badge gemountet (#sbkim-siegel-badge)");
  // SIEGEL-Slot im Status-Widget öffnet das Siegel-Modal (Proxy-Klick).
  await page.evaluate(()=>{const s=document.querySelector('.fp-sw [data-slot="siegel"]'); if(s) s.click();});
  await page.waitForTimeout(250);
  ok(await page.evaluate(()=>SbkimSiegel._meta.modalOpen===true), "siegel: SIEGEL-Slot öffnet das Erklärungs-Modal");
  // Bronze → Gold bei erfolgreichem Handshake (sbkim:handshake established).
  ok(await page.evaluate(()=>SbkimSiegel._meta.siegelStufe==="bronze"), "siegel: startet in Bronze");
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent("sbkim:handshake",{detail:{outcome:"established"}})));
  await page.waitForTimeout(250);
  ok(await page.evaluate(()=>SbkimSiegel._meta.siegelStufe==="gold"), "siegel: Handshake → Gold");
  ok(await page.evaluate(()=>{const b=document.getElementById("sbkim-siegel-badge");return b && b.getAttribute("data-stufe")==="gold";}), "siegel: Badge-Stufe data-stufe=gold");
  await page.close(); }

await browser.close(); server.close();
console.log(`\nErgebnis: ${pass}/${pass+fail} grün`+(fail?`, ${fail} rot`:""));
process.exit(fail?1:0);
