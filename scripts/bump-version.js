/* Cache-busting: stamps ?v=<id> onto js/css includes in every page so a new
   deploy can never pair a fresh HTML with a stale cached script (the cause of
   "Couldn't load milestone data"). Run before every commit that touches JS/CSS:
     node scripts/bump-version.js */
const fs = require("fs");
const path = require("path");

const v = Date.now().toString(36);
const root = path.join(__dirname, "..");
const assets = ["js/app.js", "js/tracker.js", "css/style.css"];

let changed = 0;
fs.readdirSync(root).filter(f => f.endsWith(".html")).forEach(f => {
  const p = path.join(root, f);
  let html = fs.readFileSync(p, "utf8");
  const before = html;
  assets.forEach(a => {
    html = html.replace(new RegExp(`(["'])${a.replace("/", "\\/")}(\\?v=[a-z0-9]*)?(["'])`, "g"), `$1${a}?v=${v}$3`);
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
console.log(`stamped v=${v} into ${changed} files (pages + sw.js)`);
