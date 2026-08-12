/* Beweis: das Mikrofon hört die Sprache, die GESPROCHEN wird — nicht die, in
 * der die Seite geschrieben ist. Und ein Fehler wird SICHTBAR, statt lautlos
 * zu verschwinden.
 *
 * Klaus 2026-08-11: „wenn ich in Arabisch etwas hineinspreche, muss auch
 * Arabisch als Text herauskommen." Vorher stand in wireMic:
 *   rec.lang = (lang === "en") ? "en-US" : "de-DE";
 * Die Oberflächen-Sprache entschied also, was gehört wird — und `rec.onerror`
 * schaltete nur das Leuchten ab, ohne ein Wort zu sagen.
 *
 * GEPRÜFT WIRD DIE TAT, NICHT DER WORTLAUT: eine eigene SpeechRecognition wird
 * eingehängt, die mitschreibt, welches `lang` die Seite WIRKLICH gesetzt hat.
 * Ein Blick in den Quelltext („steht da `micLang`?") würde auch dann grün
 * melden, wenn die Zuweisung nie ausgeführt wird.
 *
 * Sabotage-Probe gemacht: `rec.lang` wieder fest auf die Oberflächen-Sprache →
 * Proben 1–3 rot.
 *
 * EHRLICHE EINORDNUNG: die Browser-Spracherkennung hat KEINE Sprach-Erkennung.
 * Sie hört genau die Sprache, die man ihr nennt; eine abfragbare Liste der
 * gekonnten Sprachen gibt es nicht. Man kann eine Sprache nur anbieten und dann
 * sauber sagen, wenn es nicht ging — darum die Fehler- und die Schrift-Probe.
 */
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pw = await import(process.env.PW_CORE || "playwright-core");
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png" };
const server = http.createServer((req,res)=>{ let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html";
  const fp=path.join(ROOT,p);
  if(!fp.startsWith(ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){res.writeHead(404);res.end("404");return;}
  res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"}); fs.createReadStream(fp).pipe(res);});
await new Promise(r=>server.listen(0,r));
const base = `http://127.0.0.1:${server.address().port}`;

let pass=0, fail=0;
const ok=(n,c,x="")=>{ (c?pass++:fail++); console.log(`${c?"  ✓":"  ✗"} ${n}${x?"  ("+x+")":""}`); };

/* Der Spion. Er liefert NICHT sofort aus start(): die Seite setzt erst nach
 * `start()` ihre Anzeige — käme das Ergebnis synchron, würde die Seite die
 * Meldung im selben Wimpernschlag wieder überschreiben und die Probe wäre
 * fälschlich rot. */
const SPION = `
  window.__gehoert = [];
  window.__fehlerAls = null;
  window.__ergebnis = null;
  window.SpeechRecognition = function () {
    var self = this;
    this.start = function () {
      window.__gehoert.push(self.lang);
      if (self.onstart) self.onstart();
      setTimeout(function () {
        if (window.__ergebnis !== null && self.onresult) {
          self.onresult({ results: [[{ transcript: window.__ergebnis }]] });
        }
        if (window.__fehlerAls && self.onerror) self.onerror({ error: window.__fehlerAls });
        if ((window.__ergebnis !== null || window.__fehlerAls) && self.onend) self.onend();
      }, 0);
    };
    this.stop = function () { if (self.onend) self.onend(); };
  };
  window.webkitSpeechRecognition = window.SpeechRecognition;
`;

const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args:["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swrast"] });

async function seite(locale) {
  const ctx = await browser.newContext({ locale });
  await ctx.addInitScript(SPION);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/index.html", { waitUntil: "load" });
  await page.waitForTimeout(900);
  return { ctx, page, errors };
}

// 1) Die GERÄTE-Sprache entscheidet vor — ohne dass jemand etwas einstellt.
//    Das ist der Fall, der zählt: wer erst eine Einstellung finden muss, um
//    verstanden zu werden, benutzt das Mikrofon nicht.
//    `ja-JP` ist die Gegenprobe für „Sprache nicht in der Liste": dann bleibt
//    Deutsch — ehrliche Vorgabe statt Raten.
for (const [locale, erwartet] of [["de-DE","de-DE"],["ar-EG","ar-SA"],["ps-AF","ps-AF"],["ru-RU","ru-RU"],["ja-JP","de-DE"]]) {
  const { ctx, page, errors } = await seite(locale);
  const r = await page.evaluate(async () => {
    const sel = document.getElementById("fpMicLang");
    const mic = document.querySelector(".mic");
    if (mic) mic.click();
    await new Promise((x) => setTimeout(x, 60));
    const feld = document.querySelector(".field input, .field textarea");
    return { anzahl: sel ? sel.options.length : 0, wahl: sel ? sel.value : null,
             dir: feld ? feld.getAttribute("dir") : null,
             gehoert: window.__gehoert[0] || null };
  });
  ok(`Gerät ${locale} → Mikrofon hört ${r.gehoert}`, r.gehoert === erwartet, "erwartet " + erwartet);
  if (locale === "de-DE") {
    ok("zwölf Sprachen zur Wahl (mit Paschtu und Dari)", r.anzahl >= 12, String(r.anzahl));
    ok("Suchfeld liest nach Inhalt (dir=auto)", r.dir === "auto", String(r.dir));
    ok("keine Seiten-Fehler", errors.length === 0, errors[0] || "");
  }
  await ctx.close();
}

// 2) Umschalten wirkt ab dem nächsten Antippen — und gilt für ALLE Mikrofone
//    der Seite (eine Wahl in der Kopfleiste, nicht acht Auswahlen).
{
  const { ctx, page } = await seite("de-DE");
  const r = await page.evaluate(async () => {
    const sel = document.getElementById("fpMicLang");
    const mic = document.querySelector(".mic");
    mic.click();                                   // Deutsch
    mic.click();                                   // Umschalter: stoppt wieder
    sel.value = "ar-SA"; sel.dispatchEvent(new Event("change"));
    mic.click();                                   // jetzt muss Arabisch kommen
    await new Promise((x) => setTimeout(x, 60));
    return window.__gehoert;
  });
  ok("nach dem Umschalten hört das Mikrofon Arabisch", r[r.length-1] === "ar-SA", String(r));
  await ctx.close();
}

// 2b) Die Wahl überlebt den Seitenwechsel — sonst müsste man sie auf jeder
//     Unterseite neu treffen, und niemand tut das.
{
  const ctx = await browser.newContext({ locale: "de-DE" });
  await ctx.addInitScript(SPION);
  const page = await ctx.newPage();
  await page.goto(base + "/index.html", { waitUntil: "load" }); await page.waitForTimeout(700);
  await page.evaluate(() => {
    const s = document.getElementById("fpMicLang");
    s.value = "ru-RU"; s.dispatchEvent(new Event("change"));
  });
  await page.goto(base + "/markt.html", { waitUntil: "load" }); await page.waitForTimeout(900);
  const r = await page.evaluate(async () => {
    document.querySelector(".mic").click();
    await new Promise((x) => setTimeout(x, 60));
    return { wahl: document.getElementById("fpMicLang").value, gehoert: window.__gehoert[0] };
  });
  ok("die Wahl gilt auch auf der nächsten Seite", r.wahl === "ru-RU" && r.gehoert === "ru-RU", JSON.stringify(r));
  await ctx.close();
}

// 3) Kann der Browser die Sprache NICHT, erscheint ein SATZ — und er bleibt
//    stehen. Vorher tat `rec.onerror` nichts als das Leuchten abschalten.
{
  const { ctx, page } = await seite("de-DE");
  const r = await page.evaluate(async () => {
    const s = document.getElementById("fpMicLang");
    s.value = "ps-AF"; s.dispatchEvent(new Event("change"));
    window.__fehlerAls = "language-not-supported";
    document.querySelector(".mic").click();
    await new Promise((x) => setTimeout(x, 200));
    const el = document.querySelector(".mic-hinweis");
    const sofort = el ? el.textContent.trim() : "";
    await new Promise((x) => setTimeout(x, 400));
    return { sofort, spaeter: el ? el.textContent.trim() : "" };
  });
  // Bewusst NICHT „ist lang genug": eine solche Prüfung wurde an der Schwester
  // Kimboard auf dem Text „kein Relay verbunden…" grün — sie prüfte nichts.
  ok("Fehlermeldung nennt die betroffene Sprache", /پښتو/.test(r.sofort), r.sofort);
  ok("kein roher Fehlercode in der Meldung", !/language-not-supported/.test(r.sofort), r.sofort);
  ok("die Meldung bleibt stehen", r.spaeter === r.sofort && r.spaeter.length > 0, r.spaeter);
  await ctx.close();
}

// 4) Der STILLE Fehlschlag (Klaus' Sichttest 2026-08-11).
//    Russisch kam als „Здравствуйте" zurück, Arabisch als „سلام عليكم" — beides
//    richtig. Paschtu kam als „Salaam" zurück, in LATEINISCHEN Buchstaben, und
//    OHNE Fehler. Die Fehlermeldung kann da nicht greifen, weil es keinen
//    Fehler gibt. Geprüft wird, dass die Schrift-Kontrolle anschlägt — UND dass
//    sie schweigt, wenn die Schrift stimmt (sonst wäre sie nur lästig).
{
  const { ctx, page } = await seite("de-DE");
  const r = await page.evaluate(async () => {
    const s = document.getElementById("fpMicLang");
    const mic = document.querySelector(".mic");
    const feld = document.querySelector(".field input, .field textarea");
    const hin = () => { const e = document.querySelector(".mic-hinweis"); return e ? e.textContent.trim() : ""; };

    s.value = "ps-AF"; s.dispatchEvent(new Event("change"));
    feld.value = ""; window.__ergebnis = "Salaam";
    mic.click(); await new Promise((x) => setTimeout(x, 200));
    const schief = hin();

    s.value = "ar-SA"; s.dispatchEvent(new Event("change"));
    feld.value = ""; window.__ergebnis = "سلام عليكم";
    mic.click(); await new Promise((x) => setTimeout(x, 200));
    const passt = hin();

    s.value = "de-DE"; s.dispatchEvent(new Event("change"));
    feld.value = ""; window.__ergebnis = "Guten Tag";
    mic.click(); await new Promise((x) => setTimeout(x, 200));
    return { schief, passt, deutsch: hin() };
  });
  ok("Hinweis beim stillen Fehlschlag (Paschtu → lateinischer Text)",
     /پښتو/.test(r.schief) && /lateinischer Schrift/.test(r.schief), r.schief);
  ok("kein falscher Alarm, wenn die Schrift stimmt (Arabisch)",
     !/lateinischer Schrift/.test(r.passt), r.passt);
  ok("kein falscher Alarm bei Deutsch", !/lateinischer Schrift/.test(r.deutsch), r.deutsch);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
