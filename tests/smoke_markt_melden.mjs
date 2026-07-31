/* Headless-Smoke für den Melde-Knopf im Marktplatz (Stufe 4).
 *   node tests/smoke_markt_melden.mjs
 *
 * Der Melde-Knopf ist der rechtlich wichtigste Teil: Klaus haftet für einen
 * fremden Link nicht automatisch, muss aber handeln, sobald er davon weiß.
 * Jeder Besucher deckt damit das Zeitfenster ab, in dem keine Automatik
 * hinsieht. Geprüft wird die ganze Kette im echten Browser:
 *   1. jede Karte trägt einen Melde-Knopf
 *   2. Klick öffnet das Melde-Fenster mit allen Gründen
 *   3. Absenden schickt zweck:"meldung" mit Kennung + Grund an den Endpunkt
 *   4. ohne Endpunkt fail-soft auf einen mailto-Vordruck (nichts geht verloren)
 *   5. Honigtopf gefüllt (Bot) → still „ok", KEIN Netz-Aufruf
 *   6. Escape schließt das Fenster
 */
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pw = await import(process.env.PW_CORE || "playwright-core");
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png" };
const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
  fs.createReadStream(fp).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } }

const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swrast"] });

// Seite laden; setEndpoint=false simuliert „Formular-Dienst noch nicht eingerichtet".
async function open(setEndpoint) {
  const page = await browser.newPage();
  await page.addInitScript((useEp) => {
    window.__sent = [];        // fetch-Mitschnitt
    window.__mailto = null;    // mailto-Mitschnitt (statt echter Navigation)
    const realFetch = window.fetch;
    window.fetch = function (url, opt) {
      if (opt && opt.method === "POST") {
        let body = null; try { body = JSON.parse(opt.body); } catch (_e) {}
        window.__sent.push({ url: String(url), body });
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
      }
      return realFetch.apply(this, arguments);
    };
    // Der mailto-Zweig klickt einen unsichtbaren <a>. Den Klick abfangen, damit
    // der Test die Adresse sieht und der Browser nicht wegzunavigieren versucht.
    // (window.location selbst ist nicht überschreibbar — deshalb dieser Weg.)
    const realClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.href && this.href.indexOf("mailto:") === 0) { window.__mailto = this.href; return; }
      return realClick.apply(this, arguments);
    };
    window.__useEndpoint = useEp;
  }, setEndpoint);
  await page.goto(base + "/markt.html", { waitUntil: "load" });
  await page.evaluate(() => {
    window.FP_MARKT_SUBMIT_ENDPOINT = window.__useEndpoint ? "https://formular.example/einreichung.php" : "";
  });
  await page.waitForTimeout(700);
  return page;
}

console.log("Marktplatz — Melde-Knopf (Stufe 4)");

// 1 + 2: Knopf an jeder Karte, Fenster öffnet mit allen Gründen
{
  const page = await open(true);
  const counts = await page.evaluate(() => ({
    cards: document.querySelectorAll("#mkListings .listing").length,
    buttons: document.querySelectorAll("#mkListings .mk-report").length,
  }));
  ok(counts.cards > 0, `Marktplatz zeigt Karten (${counts.cards})`);
  ok(counts.cards === counts.buttons, `jede Karte hat einen Melde-Knopf (${counts.buttons}/${counts.cards})`);

  const btn = await page.evaluate(() => {
    const b = document.querySelector("#mkListings .mk-report");
    if (!b) return null;
    const cs = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    return {
      hasData: !!b.getAttribute("data-label"),
      // Klaus 2026-07-31: am Tablet gibt es kein Hover, also KEINEN Tooltip.
      // Der Knopf muss sein Wort selbst zeigen, nicht nur im title führen.
      visibleText: (b.innerText || "").trim(),
      isBtn: b.classList.contains("btn"),
      clip: cs.clipPath,
      shadow: cs.filter,
      w: Math.round(r.width), h: Math.round(r.height),
    };
  });
  ok(btn && btn.hasData, "Melde-Knopf trägt die Kennung des Eintrags");
  ok(btn && /melden|report/i.test(btn.visibleText),
    `Knopf zeigt sichtbaren Text, nicht nur einen Tooltip ("${btn && btn.visibleText}")`);
  ok(btn && btn.isBtn, "Knopf trägt die .btn-Klasse (erbt Schliff, Neigung, Holo-Schimmer)");
  ok(btn && /path\(/.test(btn.clip || ""), "dreieckige Form über clip-path: path() aktiv");
  ok(btn && /drop-shadow/.test(btn.shadow || ""), "Schweben über drop-shadow (folgt der Dreiecksform)");
  ok(btn && btn.w >= 44 && btn.h >= 44, `Klickfläche mindestens 44×44 (${btn && btn.w}×${btn && btn.h})`);

  await page.click("#mkListings .mk-report");
  await page.waitForTimeout(200);
  const dlg = await page.evaluate(() => {
    const d = document.getElementById("mkRepOv");
    if (!d) return { open: false };
    const r = d.getBoundingClientRect();
    return {
      open: true,
      tag: d.tagName,
      isOpen: d.hasAttribute("open"),
      reasons: d.querySelectorAll('input[name="mkRepReason"]').length,
      hasSend: !!d.querySelector("#mkRepSend"),
      labelled: d.getAttribute("aria-labelledby"),
      // DIE Prüfung, die gefehlt hat: liegt das Fenster im sichtbaren Bereich?
      // Am 2026-07-31 hing es unterhalb des Footers, weil altes CSS ausgeliefert
      // wurde. "Element existiert" war grün, der Nutzer sah es trotzdem nicht.
      inView: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.height > 0,
      rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight },
      focusInside: d.contains(document.activeElement),
    };
  });
  ok(dlg.open, "Klick öffnet das Melde-Fenster");
  ok(dlg.tag === "DIALOG" && dlg.isOpen, `natives <dialog>, geöffnet (${dlg.tag})`);
  ok(dlg.reasons === 4, `vier Melde-Gründe zur Auswahl (${dlg.reasons})`);
  ok(dlg.hasSend && dlg.labelled === "mkRepH", "Absende-Knopf da, Fenster über seine Überschrift benannt");
  ok(dlg.inView,
    `Fenster liegt im sichtbaren Bereich (oben ${dlg.rect.top}, unten ${dlg.rect.bottom}, Bild ${dlg.rect.vh})`);
  ok(dlg.focusInside, "Fokus steht nach dem Öffnen IM Fenster (man landet dort, wo es weitergeht)");

  // Hintergrund darf nicht mitscrollen, solange das Fenster offen ist.
  const bgLocked = await page.evaluate(async () => {
    const before = scrollY;
    scrollBy(0, 400);
    await new Promise((r) => setTimeout(r, 120));
    return { moved: Math.abs(scrollY - before) > 5 };
  });
  ok(!bgLocked.moved, "Hintergrund scrollt nicht, solange das Fenster offen ist");

  // 6: Escape schließt UND gibt den Fokus zurück
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const afterEsc = await page.evaluate(() => ({
    gone: !document.getElementById("mkRepOv"),
    focusBack: !!(document.activeElement && document.activeElement.classList
      && document.activeElement.classList.contains("mk-report")),
  }));
  ok(afterEsc.gone, "Escape schließt das Fenster");
  ok(afterEsc.focusBack, "Fokus kehrt auf den Melde-Knopf zurück");
  await page.close();
}

// 3: Absenden schickt den richtigen Datensatz
{
  const page = await open(true);
  await page.click("#mkListings .mk-report");
  const label = await page.evaluate(() => document.querySelector("#mkListings .mk-report").getAttribute("data-label"));
  await page.evaluate(() => {
    document.querySelectorAll('input[name="mkRepReason"]')[2].checked = true;  // „rechtswidrige Inhalte"
    document.getElementById("mkRepMsg").value = "Leitet auf eine fremde Seite weiter.";
  });
  await page.click("#mkRepSend");
  await page.waitForTimeout(400);
  const sent = await page.evaluate(() => window.__sent);
  ok(sent.length === 1, `genau ein Netz-Aufruf abgesetzt (${sent.length})`);
  const b = sent[0] ? sent[0].body : {};
  ok(b.zweck === "meldung", 'Zweck ist "meldung" (nicht eintrag/kontakt)');
  ok(b.eintrag === label && typeof b.eintrag_id === "string", "gemeldeter Eintrag wird mitgeschickt");
  ok(b.grund === "r_illegal", `gewählter Grund wird übertragen (${b.grund})`);
  ok(/fremde Seite/.test(b.nachricht || ""), "Freitext des Melders wird übertragen");
  ok(typeof b.fp_elapsed === "number" && "fp_hp_url" in b, "Spam-Schutz-Felder (Zeit + Honigtopf) mitgesendet");
  ok(await page.evaluate(() => /Danke/i.test(document.getElementById("mkRepOut").textContent)), "Nutzer sieht eine Bestätigung");
  await page.close();
}

// 4: ohne Endpunkt fail-soft auf mailto
{
  const page = await open(false);
  await page.click("#mkListings .mk-report");
  await page.click("#mkRepSend");
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ sent: window.__sent.length, mailto: window.__mailto }));
  ok(r.sent === 0, "ohne Endpunkt kein Netz-Aufruf");
  ok(/^mailto:info@family-projekt\.de/.test(r.mailto || ""), "fail-soft: mailto-Vordruck an info@ (nichts geht verloren)");
  ok(/subject=Marktplatz-MELDUNG|subject=Marktplatz-Meldung/i.test(decodeURI(r.mailto || "")), "mailto trägt einen sprechenden Betreff");
  await page.close();
}

// 5: Honigtopf gefüllt = Bot → still „ok", kein Netz-Aufruf
{
  const page = await open(true);
  await page.click("#mkListings .mk-report");
  await page.evaluate(() => { document.getElementById("mkRepHp").value = "http://spam.example"; });
  await page.click("#mkRepSend");
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({ sent: window.__sent.length, out: document.getElementById("mkRepOut").textContent }));
  ok(r.sent === 0, "Honigtopf gefüllt → kein Netz-Aufruf (Bot läuft ins Leere)");
  ok(/Danke/i.test(r.out), "Bot sieht dieselbe Bestätigung wie ein Mensch (kein Hinweis auf die Falle)");
  await page.close();
}

// Impressum: Haftung für fremde Links + Meldeweg
{
  const page = await browser.newPage();
  await page.goto(base + "/impressum.html", { waitUntil: "load" });
  const t = await page.evaluate(() => document.body.innerText);
  ok(/unverzüglich entfernt/i.test(t), "Impressum: Link wird bei bekannter Rechtsverletzung unverzüglich entfernt");
  ok(/nicht zumutbar/i.test(t), "Impressum: Grenze der zumutbaren Dauerkontrolle benannt");
  ok(/Melde-Knopf/i.test(t) && /info@family-projekt\.de/.test(t), "Impressum: Meldeweg genannt");
  await page.close();
}

await browser.close(); server.close();
console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
