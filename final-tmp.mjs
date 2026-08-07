import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const ROOT=process.env.LH_ROOT;
const MIME={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".webmanifest":"application/manifest+json"};
const s=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]); if(p==="/")p="/index.html";
 const fp=path.join(ROOT,p); if(!fp.startsWith(ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"}); r.end(fs.readFileSync(fp));});
await new Promise(r=>s.listen(0,r));
const base=`http://127.0.0.1:${s.address().port}`;
const pw=await import("playwright-core");
const b=await pw.chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox","--use-gl=swiftshader","--enable-unsafe-swrast"]});
const page=await b.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});
await page.goto(`${base}/index.html`,{waitUntil:"load"}); await page.waitForTimeout(1500);
const y=await page.evaluate(()=>{const e=document.querySelector('.entries'); e.scrollIntoView(); return 0;});
await page.waitForTimeout(800);
await page.screenshot({path:"/tmp/claude-0/-home-user/631b1caf-7e2d-5951-8737-7c4a8796b469/scratchpad/final-start.png"});
await b.close(); s.close(); process.exit(0);
