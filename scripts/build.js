/* ==========================================================
   scripts/build.js
   Zero-dependency build step for static hosting on Vercel.
   1. Loads SUPABASE_URL / SUPABASE_ANON_KEY from the environment
      (Vercel injects Project Settings → Environment Variables;
      locally it falls back to reading a .env file if present).
   2. Copies index.html, css/, js/, assets/ into /dist.
   3. Generates dist/js/supabase-client.js from
      js/supabase-client.template.js, substituting the real
      values — so credentials never have to be committed to git.
   Run with: node scripts/build.js
   ========================================================== */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist");

// ---- tiny .env loader (no dependency, only used for local builds) ----
function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("\n[build] Missing SUPABASE_URL / SUPABASE_ANON_KEY.");
  console.error("[build] Set them in Vercel → Project Settings → Environment Variables,");
  console.error("[build] or create a local .env file (copy .env.example) for local builds.\n");
  process.exit(1);
}

// ---- clean & prep dist ----
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// ---- copy static assets ----
function copy(rel) {
  const src = path.join(ROOT, rel);
  const dest = path.join(OUT, rel);
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.cpSync(src, dest, { recursive: true });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

["index.html", "css", "js", "assets", "data"].forEach(copy);

// The template shouldn't ship as-is (it has placeholder credentials).
const templateInDist = path.join(OUT, "js", "supabase-client.template.js");
if (fs.existsSync(templateInDist)) fs.rmSync(templateInDist);

// ---- generate the real client config from the template ----
const templatePath = path.join(ROOT, "js", "supabase-client.template.js");
let content = fs.readFileSync(templatePath, "utf8");
content = content
  .split("__SUPABASE_URL__").join(SUPABASE_URL)
  .split("__SUPABASE_ANON_KEY__").join(SUPABASE_ANON_KEY);

fs.writeFileSync(path.join(OUT, "js", "supabase-client.js"), content);

console.log("[build] Done — output in /dist, Supabase client configured from environment variables.");
