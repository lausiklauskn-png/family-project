/* Wächter der Forschungs-Tabelle (forschung/tabelle.html).
 *   node tests/smoke_tabelle.mjs
 *
 * Klaus wollte „eine HTML Datei, die ich dann jederzeit ergänzen kann“. Daraus
 * folgen zwei Eigenschaften, die man beim nächsten Umbau lautlos kaputtmacht:
 *
 *   1. Sie muss aus dem DOWNLOAD-ORDNER laufen (`file://`). Wer irgendwann eine
 *      externe Schrift, ein CDN oder ein `fetch` als Pflicht einbaut, merkt es
 *      hier nicht — auf dem Server läuft ja alles. Klaus' Kopie wäre tot.
 *      Deshalb wird hier ausdrücklich über `file://` geprüft, nicht über einen
 *      Testserver.
 *   2. Seine Notizen müssen ein Neuladen überleben — sie liegen im Browser,
 *      nicht in der Datei. Ginge das kaputt, wäre der Verlust still: die
 *      Tabelle sähe weiter richtig aus, nur die Arbeit wäre weg.
 *
 * Geprüft wird die GEBAUTE Datei. Steht sie nicht da oder ist sie älter als die
 * Messreihe, sagt der Test das — eine Tabelle mit gestrigen Zahlen ist schlimmer
 * als keine, weil man ihr ansieht, dass sie aktuell sein will.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEITE = path.join(ROOT, "forschung", "tabelle.html");
const REIHE = path.join(ROOT, "forschung", "messreihe.json");

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

console.log("\nForschungs-Tabelle:");

if (!fs.existsSync(SEITE)) {
  console.log("  ✗ forschung/tabelle.html fehlt — node tools/tabelle-bauen.mjs ausführen");
  process.exit(1);
}

const quelltext = fs.readFileSync(SEITE, "utf8");
const reihe = JSON.parse(fs.readFileSync(REIHE, "utf8"));

/* ---- Ohne Browser: was in der Datei stehen MUSS ---------------------------- */

ok(!/<(script|link|img)[^>]+(src|href)\s*=\s*["']https?:\/\//i.test(quelltext),
  "keine fremde Adresse eingebunden — die Datei läuft ohne Netz");
ok(quelltext.includes('id="daten"'), "die Zahlen stecken IN der Datei, werden nicht nachgeladen");

/* Der Datenblock steckt in einem <script>-Element. Ein `</script>` im JSON würde
 * es vorzeitig beenden — die Seite bliebe leer, und zwar nur bei bestimmten
 * Daten. Genau darum wird beim Bauen maskiert; hier wird es nachgeprüft. */
const block = quelltext.split('id="daten" type="application/json">')[1] || "";
ok(block && !block.split("</script>")[0].includes("</"),
  "im Datenblock steht kein `</`, das das Script vorzeitig beenden könnte");

/* Eine Tabelle mit gestrigen Zahlen sieht aus wie eine mit heutigen. */
const eingebettet = JSON.parse(block.split("</script>")[0].replace(/<\\\//g, "</"));
ok(eingebettet.gepflegt === (reihe.gepflegt || ""),
  `die gebaute Datei ist so frisch wie die Messreihe (${eingebettet.gepflegt} = ${reihe.gepflegt})`);
ok(Object.keys(eingebettet.reihen).length === Object.keys(reihe.reihen).length,
  `alle ${Object.keys(reihe.reihen).length} Seiten sind drin`);

/* ---- Im Browser, ausdrücklich über file:// -------------------------------- */

const pw = await import(process.env.PW_CORE || "playwright-core");
const chromium = pw.chromium || (pw.default && pw.default.chromium);
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({
  executablePath: exe,
  args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swrast"]
});
const page = await browser.newPage();
const fehler = [];
page.on("pageerror", (e) => fehler.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });

await page.goto("file://" + SEITE);
await page.waitForTimeout(400);

ok(fehler.length === 0, `keine Konsolen-Fehler aus dem Download-Ordner${fehler.length ? ": " + fehler[0].slice(0, 140) : ""}`);

const anzahl = Object.keys(reihe.reihen).length;
const zeilen = await page.$$eval("#rumpf tr:not(.detail)", (r) => r.length);
ok(zeilen === anzahl, `${anzahl} Zeilen gezeichnet (${zeilen})`);

/* Sortierung: ohne sie ist es eine Liste, keine Rangliste. */
const obenSchnitt = Number(await page.$eval("#rumpf tr td:nth-child(3)", (e) => e.textContent));
const untenSchnitt = Number(await page.$eval("#rumpf tr:not(.detail):last-child td:nth-child(3)", (e) => e.textContent));
ok(obenSchnitt >= untenSchnitt, `beste Seite steht oben (${obenSchnitt} ≥ ${untenSchnitt})`);
await page.click('[data-sort="l"]');
const nachL = Number(await page.$eval("#rumpf tr td:nth-child(4)", (e) => e.textContent));
const nachLunten = Number(await page.$eval("#rumpf tr:not(.detail):last-child td:nth-child(4)", (e) => e.textContent));
ok(nachL >= nachLunten, `Klick auf „Leistung“ sortiert danach (${nachL} ≥ ${nachLunten})`);
await page.click('[data-sort="schnitt"]');

await page.fill("#suche", "mixarium");
await page.waitForTimeout(120);
const gefiltert = await page.$$eval("#rumpf tr:not(.detail) .name", (r) => r.map((x) => x.textContent));
ok(gefiltert.length > 0 && gefiltert.every((n) => /mixarium/i.test(n)),
  `die Suche filtert (${gefiltert.length} Treffer für „mixarium“)`);
await page.fill("#suche", "");
await page.waitForTimeout(120);

await page.click("#rumpf tr .name");
await page.waitForTimeout(120);
ok(!!(await page.$("#rumpf tr.detail textarea")), "Klick auf den Namen klappt das Detail auf");
ok(/\d{4}-\d{2}-\d{2}/.test(await page.textContent("#rumpf tr.detail .verlauf")),
  "der Verlauf zeigt Datum und Werte");

/* Der Kern: „ergänzen können“. */
await page.fill("#rumpf tr.detail textarea", "Probe-Notiz aus dem Wächter.");
await page.waitForTimeout(150);
ok(/Probe-Notiz/.test(await page.evaluate(() => localStorage.getItem("fp_forschung_notizen_v1")) || ""),
  "die Notiz landet im Browser-Speicher");

await page.reload();
await page.waitForTimeout(400);
ok(!!(await page.$(".notizmarke")), "nach dem Neuladen zeigt die Zeile die Notiz-Marke");
await page.click("#rumpf tr .name");
await page.waitForTimeout(120);
ok(/Probe-Notiz/.test(await page.inputValue("#rumpf tr.detail textarea")),
  "und die Notiz selbst steht wieder da — sie überlebt das Neuladen");

const vorher = await page.getAttribute("html", "data-thema");
await page.click("#thema");
ok(vorher !== (await page.getAttribute("html", "data-thema")), "Hell/Dunkel schaltet um");

await page.setViewportSize({ width: 360, height: 740 });
await page.waitForTimeout(200);
ok(!(await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 1)),
  "auf schmalem Bildschirm läuft der Seitenkörper nicht über");

await browser.close();
console.log(`\n${fail === 0 ? "✓" : "✗"} smoke_tabelle: ${pass} grün, ${fail} rot`);
process.exit(fail === 0 ? 0 : 1);
