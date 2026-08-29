/* Cache-busting: stamps ?v=<id> onto js/css includes in every page so a new
   deploy can never pair a fresh HTML with a stale cached script (the cause of
   "Couldn't load milestone data"). Run before every commit that touches JS/CSS:
     node scripts/bump-version.js

   The asset list is DERIVED FROM DISK, not hand-maintained. It used to be a
   literal array, and adding js/curriculum.js silently left it pinned to the
   previous version — a stale script paired with fresh HTML, which is exactly
   the failure this script exists to prevent. Anything in js/ or css/ is stamped
   automatically, and the run FAILS if a stale stamp survives anywhere. */
const fs = require("fs");
const path = require("path");

const v = Date.now().toString(36);
const root = path.join(__dirname, "..");

const assets = [];
for (const dir of ["js", "css"]) {
  const d = path.join(root, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    if (/\.(js|css)$/.test(f)) assets.push(`${dir}/${f}`);
  }
}

let changed = 0;
const pages = fs.readdirSync(root).filter(f => f.endsWith(".html"));
pages.forEach(f => {
  const p = path.join(root, f);
  let html = fs.readFileSync(p, "utf8");
  const before = html;
  assets.forEach(a => {
    html = html.replace(new RegExp(`(["'])${a.replace(/\//g, "\\/")}(\\?v=[a-z0-9]*)?(["'])`, "g"), `$1${a}?v=${v}$3`);
  });
  if (html !== before) { fs.writeFileSync(p, html, "utf8"); changed++; }
});

// stamp the service-worker cache name too — a deploy must always retire the old offline cache
const swPath = path.join(root, "sw.js");
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, "utf8").replace(/const CACHE = "ats-[a-z0-9]*"/, `const CACHE = "ats-${v}"`);
  fs.writeFileSync(swPath, sw, "utf8");
  changed++;
}

/* Guard: no page may still reference a local js/css asset at an older stamp. */
const stale = [];
for (const f of pages) {
  const html = fs.readFileSync(path.join(root, f), "utf8");
  const re = /(?:src|href)="((?:js|css)\/[^"?]+)(?:\?v=([a-z0-9]*))?"/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[2] !== v) stale.push(`${f} → ${m[1]}${m[2] ? "?v=" + m[2] : " (unstamped)"}`);
  }
}
if (stale.length) {
  console.error(`FAILED: ${stale.length} stale asset reference(s) after stamping:`);
  stale.forEach(s => console.error("  " + s));
  process.exit(1);
}

console.log(`stamped v=${v} into ${changed} files (${assets.length} assets across ${pages.length} pages + sw.js)`);
