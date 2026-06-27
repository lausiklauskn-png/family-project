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
  ok(await page.evaluate(()=>document.querySelectorAll("#toolGrid .area").length===3), "werkzeuge: 3 Tool-Karten");
  await page.close(); }
{ const { page } = await load("/werkzeuge/such-werkzeug.html");
  ok(await page.evaluate(()=>document.querySelectorAll("#toolMain .feat .f").length===4), "such-werkzeug: 4 Vorteils-Kacheln");
  ok(await page.evaluate(()=>!!document.querySelector("#toolMain .price")), "such-werkzeug: Preis-Block");
  ok(await page.evaluate(()=>document.querySelectorAll("#thumbs .thumb").length>=3), "such-werkzeug: Galerie-Thumbnails");
  await page.close(); }
{ const { page } = await load("/netzwerk.html");
  ok(await page.evaluate(()=>document.querySelectorAll(".stages .stage").length===3), "netzwerk: 3 Versprechen-Stufen");
  ok(await page.evaluate(()=>!!document.getElementById("sbkim-aw-go")), "netzwerk: Andock-Wizard gemountet");
  ok(await page.evaluate(()=>!!document.querySelector("#andockWizard .field .mic")), "netzwerk: Mikrofon am Wizard-Feld nachgerüstet");
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
  await page.close(); }
{ const { page } = await load("/markt.html");
  ok(await page.evaluate(()=>!document.getElementById("mkEmpty").hidden), "markt: Leer-Hinweis (noch keine Einträge)");
  ok(await page.evaluate(()=>document.querySelectorAll("#mkSubmit .mic").length>=1), "markt: Mikrofon im Einreich-Formular");
  // Formular-Validierung: ungültiges Bild -> Hinweis
  await page.fill("#sbTitle","Test"); await page.fill("#sbBy","@test");
  await page.fill("#sbUrl","https://example.com/app/"); await page.fill("#sbImg","https://example.com/x.svg");
  await page.fill("#sbText","Beschreibung mit genug Text.");
  await page.click("#mkSubmit button[type=submit]"); await page.waitForTimeout(100);
  ok(await page.evaluate(()=>/SVG|ungültig/i.test(document.getElementById("sbOut").textContent)), "markt: SVG-Bild wird abgelehnt");
  await page.fill("#sbImg","https://example.com/shot.jpg");
  await page.click("#mkSubmit button[type=submit]"); await page.waitForTimeout(100);
  ok(await page.evaluate(()=>/Freigabe|markt-/.test(document.getElementById("sbOut").textContent)), "markt: gültiger Eintrag -> Freigabe-Block (keine Auto-Veröffentlichung)");
  await page.close(); }

await browser.close(); server.close();
console.log(`\nErgebnis: ${pass}/${pass+fail} grün`+(fail?`, ${fail} rot`:""));
process.exit(fail?1:0);
