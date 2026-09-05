import "../scripts/preload-server-only";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > 0) {
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

import sitemap, { generateSitemaps } from "../app/sitemap";

async function main() {
  const chunks = await generateSitemaps();
  console.log("generateSitemaps chunks:", chunks);

  const chunk0 = await sitemap({ id: Promise.resolve("0") });
  console.log(`chunk 0 URL count: ${chunk0.length}`);
  console.log("All URLs in chunk 0:");
  for (const entry of chunk0) {
    console.log(" -", entry.url);
  }
}

main().catch(console.error);
