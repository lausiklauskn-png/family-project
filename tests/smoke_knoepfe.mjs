/* Wächter für die Bedien-Elemente: erreichbar, benannt, und sie TUN etwas.
 *   node tests/smoke_knoepfe.mjs
 *
 * Warum es diesen Test gibt (Befund 5.1 aus dem Brief vom 2026-08-01):
 * Symbol-Knöpfe trugen ihren Zweck nur in einem `title`-Attribut. Auf einem
 * Touch-Gerät erscheint ein `title` NIE — genau der Mangel, den der Melde-Knopf
 * hatte, bis er sichtbaren Text bekam.
 *
 * Beim Nachmessen war es größer als notiert. Vier Bedien-Elemente waren
 * `<span>`-Elemente mit einem Klick-Handler: Sprache (DE/EN), Thema (◐), die
 * SIEGEL-Lampe (öffnet das Siegel-Modal) und der „⊕ Status"-Chip (holt das
 * Widget zurück). Ein `<span>` bekommt keinen Tabulator-Halt. Wer die Seite mit
 * der Tastatur bedient, kam an diese vier Funktionen **gar nicht heran** — nicht
 * schwer erreichbar, sondern unerreichbar. Das Muster dagegen stand längst im
 * Repo: `.pill-reload` in assets/app.js macht es seit dem Hard-Reload-Knopf
 * richtig (role + tabindex + aria-label + keydown).
 *
 * Drei Teile, weil es DREI Arten gibt, das falsch zu machen — und jede einzelne
 * hält die anderen zwei Proben grün:
 *   A  Erreichbarkeit — hat das Element einen Tabulator-Halt?
 *   B  Name           — hat es einen zugänglichen Namen, der NICHT nur `title`
 *                       ist? (`title` ist ein Notnagel für die Vorlesehilfe und
 *                       auf Touch unsichtbar.)
 *   C  Wirkung        — tut die Enter-Taste wirklich etwas? `role="button"` und
 *                       `tabindex="0"` ohne keydown-Handler sehen in jeder
 *                       Prüfung richtig aus und bedienen nichts. Das ist die
 *                       eigentliche Falle, und nur Teil C fängt sie.
 *
 * Gegenproben beim Bauen, jede einzeln rot bekommen (damit sie niemand
 * wiederholen muss):
 *   1. `role`/`tabIndex` am Sprach-Knopf entfernt        → Teil A fiel durch.
 *   2. `aria-label` an den Pillen entfernt (2 Stellen → 0,
 *      nachgezählt)                                      → 12 × Teil B fiel durch.
 *      Teil B verlangt BEWUSST ein `aria-label` und lässt sichtbaren Text nicht
 *      als Ersatz gelten: der sichtbare Text dieser Pillen nennt einen ZUSTAND
 *      („DE / EN", „◐ Dunkel", „SIEGEL"), nicht die Handlung. Ein früherer
 *      Entwurf ließ „Text ODER aria-label" gelten — der hätte hier nie etwas
 *      gemeldet, weil jede Pille Text trägt.
 *   3. Nur den `keydown`-Handler entfernt, role/tabindex/
 *      aria-label stehen gelassen                        → **A und B blieben
 *      vollständig grün**, allein Teil C fiel durch (55/59). Das ist die Lehre
 *      vom 2026-08-01 zum dritten Mal: eine Gegenprobe, die den Fehler nicht
 *      fängt, ist keine.
 *
 * Und eine Lehre über die Gegenproben selbst: beim ersten Anlauf von Probe 2
 * blieb alles grün, weil die EINGEBAUTE Änderung gar nicht gegriffen hatte —
 * die gesuchte Zeile war anders eingerückt als angenommen. Ein Fehler, der
 * nicht wirklich im Code landet, beweist nichts über den Test. Seitdem wird bei
 * jeder Gegenprobe nachgezählt, dass der Eingriff tatsächlich stattgefunden hat.
 *
 * Grenze, ehrlich: Gemessen wird, was der Browser meldet — Tabulator-Halt,
 * Name, Wirkung. Ob ein sehender Nutzer am Tablet das Symbol VERSTEHT, sagt
 * dieser Test nicht. Das ist die zweite Hälfte von Befund 5.1 und Klaus' Frage.
 *
 * NICHT geprüft, und das mit Absicht: die namenlosen Knöpfe (💬, −, ✕, 🎤) aus
 * sbkim/23_rendezvous_ui.js. Diese Datei ist eine byte-1:1-Kopie aus
 * Sage-Protokol (md5 gleich, geprüft 2026-08-01). Sie hier zu reparieren wäre
 * Drift — der Fix gehört nach Sage und kommt von dort zurück.
 */
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pw = await import(process.env.PW_CORE || "playwright-core");
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/manifest+json" };
const server = http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split("?")[0]); if(p==="/")p="/index.html"; const fp=path.join(ROOT,p); if(!fp.startsWith(ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){res.writeHead(404);res.end("404");return;} res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"}); fs.createReadStream(fp).pipe(res);});
await new Promise(r=>server.listen(0,r));
const base = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args:["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swrast"] });

/* Die Seiten, die eine Navleiste mit den Bedien-Pillen tragen. */
const SEITEN = ["/index.html", "/markt.html", "/netzwerk.html", "/werkzeuge.html", "/referenzen.html", "/mycelkarte.html"];

/* Liest an EINEM Element ab, was der Browser wirklich meldet. */
const LIES = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  const eigen = /^(button|a|input|select|textarea)$/.test(tag) && !(tag === "a" && !el.getAttribute("href"));
  return {
    tag,
    // Tabulator-Halt: entweder ein echtes Bedien-Element oder tabindex >= 0.
    haltbar: eigen || el.tabIndex >= 0,
    aria: el.getAttribute("aria-label") || "",
    role: el.getAttribute("role") || "",
    title: el.getAttribute("title") || "",
    text: (el.textContent || "").trim(),
    sichtbar: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
  };
};

/* Auf das ERGEBNIS warten, nicht auf die Uhr: `load` wartet auch auf schwere
 * Nebensachen (Modell-Dateien, Bilder) und lief beim siebten Aufruf in einen
 * Zeitablauf. Gebraucht wird nur, dass assets/app.js durchgelaufen ist — der
 * Aktualisieren-Knopf wird dort als Letztes gehängt und ist damit das ehrliche
 * Zeichen dafür. */
async function seite(rel, vorLaden) {
  const page = await browser.newPage();
  if (vorLaden) await page.addInitScript(vorLaden);
  await page.goto(base + rel, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#fpReload", { timeout: 15000 });
  await page.waitForSelector(".fp-sw, .fp-sw-restore", { timeout: 15000 });
  return page;
}

/* ------------------------------------------------------------------ Teil A+B
 * Erreichbarkeit und Name, an jedem Bedien-Element auf jeder Seite.
 * `title` zählt hier BEWUSST nicht als Name: auf Touch erscheint er nie, und
 * genau das ist der Befund, um den es geht. */
console.log("\nTeil A+B — Tabulator-Halt und zugänglicher Name");
const PILLEN = [
  ["#langBtn",  "Sprache"],
  ["#themeBtn", "Thema"],
  ["#fpReload", "Aktualisieren"],
  ['.fp-sw-lamp[data-slot="siegel"]', "SIEGEL-Lampe"]
];
for (const rel of SEITEN) {
  const page = await seite(rel);
  for (const [sel, name] of PILLEN) {
    const r = await page.evaluate(LIES, sel);
    if (!r) { ok(false, `${rel} ${name} — Element gefunden`); continue; }
    ok(r.haltbar, `${rel} ${name} — hat einen Tabulator-Halt`);
    /* Name: hier wird ein `aria-label` VERLANGT, nicht bloß irgendein Text.
     * Der sichtbare Text dieser vier Pillen nennt einen ZUSTAND — „DE / EN",
     * „◐ Dunkel", „SIEGEL" —, nicht die Handlung. Wer nur hört „DE Schrägstrich
     * EN, Schaltfläche", weiß nicht, dass ein Druck die Sprache umstellt.
     * `title` zählt nicht: auf Touch erscheint er nie. */
    ok(r.aria.length > 0, `${rel} ${name} — nennt per aria-label, WAS der Druck tut`);
  }
  await page.close();
}

/* Der „⊕ Status"-Chip erscheint nur, wenn das Widget geschlossen wurde. */
console.log("\nTeil A+B — Status-Chip (⊕), nur im geschlossenen Zustand sichtbar");
{
  const page = await seite("/index.html", () => {
    try { localStorage.setItem("fp_widget_state", JSON.stringify({ mode: "closed", x: null, y: null, min: false })); } catch (_e) {}
  });
  const r = await page.evaluate(LIES, ".fp-sw-restore");
  ok(!!r, "Chip ist da");
  if (r) {
    ok(r.sichtbar, "Chip ist sichtbar, wenn das Widget geschlossen ist");
    ok(r.haltbar, "Chip hat einen Tabulator-Halt");
    ok(r.aria.length > 0, "Chip nennt per aria-label, WAS der Druck tut");
  }
  await page.close();
}

/* -------------------------------------------------------------------- Teil C
 * Wirkung. Das ist der Teil, der die stumpfe Probe verhindert: ein Element mit
 * role und tabindex, dem der keydown-Handler fehlt, besteht A und B und
 * bedient trotzdem nichts. Getippt wird mit echten Tasten. */
console.log("\nTeil C — die Enter-Taste bewirkt wirklich etwas");
{
  const page = await seite("/index.html");

  // Sprache: Enter auf dem Sprach-Knopf schaltet <html lang> um.
  const vorher = await page.evaluate(() => document.documentElement.lang);
  await page.focus("#langBtn");
  await page.keyboard.press("Enter");
  await page.waitForFunction((v) => document.documentElement.lang !== v, vorher, { timeout: 3000 })
    .then(() => ok(true, "Sprache — Enter schaltet die Sprache wirklich um"))
    .catch(() => ok(false, "Sprache — Enter schaltet die Sprache wirklich um"));

  /* Thema: applyTheme() setzt KEIN data-theme, sondern CSS-Variablen und den
   * sichtbaren Namen in #themeName. Gemessen wird deshalb der Name — das ist
   * ohnehin das, was der Nutzer sieht. (Der erste Anlauf dieses Tests las
   * data-theme ab und blieb rot, obwohl der Knopf schon tat, was er sollte:
   * eine Probe, die am falschen Merkmal misst, sagt nichts über die Sache.) */
  const nameVor = await page.evaluate(() => (document.getElementById("themeName") || {}).textContent);
  await page.focus("#themeBtn");
  await page.keyboard.press("Enter");
  await page.waitForFunction((v) => (document.getElementById("themeName") || {}).textContent !== v, nameVor, { timeout: 3000 })
    .then(() => ok(true, "Thema — Enter schaltet das Thema wirklich um"))
    .catch(() => ok(false, "Thema — Enter schaltet das Thema wirklich um"));

  // Leertaste muss ebenso gehen und darf die Seite NICHT scrollen.
  const nameVor2 = await page.evaluate(() => (document.getElementById("themeName") || {}).textContent);
  /* Erst fokussieren, DANN scrollen, dann erst die Höhe merken: page.focus()
   * holt das Element selbst in den Blick und scrollt dabei. Andersherum misst
   * die Probe ihr eigenes Zutun statt der Leertaste. */
  await page.focus("#themeBtn");
  /* Die Seite scrollt weich (scroll-behavior). Direkt nach scrollTo steht
   * scrollY noch auf dem alten Wert — wer sofort abliest, misst das Nachlaufen
   * des eigenen Scrollbefehls und nicht die Leertaste. Also auf das Ergebnis
   * warten, nicht auf die Uhr. */
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForFunction(() => window.scrollY >= 399, null, { timeout: 3000 });
  const yVor = await page.evaluate(() => window.scrollY);
  await page.keyboard.press(" ");
  await page.waitForFunction((v) => (document.getElementById("themeName") || {}).textContent !== v, nameVor2, { timeout: 3000 })
    .then(() => ok(true, "Thema — die Leertaste schaltet ebenfalls"))
    .catch(() => ok(false, "Thema — die Leertaste schaltet ebenfalls"));
  ok(await page.evaluate(() => window.scrollY) === yVor, "Thema — die Leertaste scrollt die Seite nicht weg");

  await page.close();
}

/* SIEGEL-Lampe: Enter muss dasselbe tun wie der Klick — den Proxy-Knopf des
 * Siegel-Modals auslösen. Gemessen wird am Proxy, nicht am Modal: ob Modul 16
 * geladen ist, hängt an der Seite; ob unsere Taste ankommt, hängt an uns. */
console.log("\nTeil C — SIEGEL-Lampe löst per Enter dasselbe aus wie per Klick");
{
  const page = await seite("/index.html");
  await page.evaluate(() => {
    window.__siegelKlicks = 0;
    let b = document.getElementById("sbkim-siegel-badge");
    if (!b) { b = document.createElement("span"); b.id = "sbkim-siegel-badge"; document.body.appendChild(b); }
    b.addEventListener("click", () => { window.__siegelKlicks++; });
  });
  await page.click('.fp-sw-lamp[data-slot="siegel"]');
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__siegelKlicks) === 1, "SIEGEL — der Klick löst aus (Ausgangspunkt)");
  await page.focus('.fp-sw-lamp[data-slot="siegel"]');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__siegelKlicks) === 2, "SIEGEL — Enter löst dasselbe aus");
  await page.close();
}

/* „⊕ Status"-Chip: Enter holt das Widget zurück. */
console.log("\nTeil C — Status-Chip (⊕) holt das Widget per Enter zurück");
{
  const page = await seite("/index.html", () => {
    try { localStorage.setItem("fp_widget_state", JSON.stringify({ mode: "closed", x: null, y: null, min: false })); } catch (_e) {}
  });
  await page.focus(".fp-sw-restore");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => {
    const w = document.querySelector(".fp-sw");
    return !!w && !!(w.offsetWidth || w.offsetHeight);
  }, null, { timeout: 3000 })
    .then(() => ok(true, "Chip — Enter holt das Widget zurück"))
    .catch(() => ok(false, "Chip — Enter holt das Widget zurück"));
  await page.close();
}

await browser.close(); server.close();
console.log(`\n${fail === 0 ? "✓" : "✗"} smoke_knoepfe: ${pass} bestanden, ${fail} durchgefallen`);
process.exit(fail === 0 ? 0 : 1);
