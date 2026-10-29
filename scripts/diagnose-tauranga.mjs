import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../lib/rentals/sources/raywhite-tauranga.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const parserModule = { exports: {} };
const localRequire = (name) => {
  if (name === "../html-images") return { extractListingImages: () => [] };
  return require(name);
};
new Function("require", "module", "exports", compiled)(localRequire, parserModule, parserModule.exports);
const { parseTaurangaRayWhiteHtml, classifyTaurangaAddress } = parserModule.exports;

const checks = [
  ["94 Chadwick Road, Greerton", "Tauranga"],
  ["13a Farm Street, Mt Maunganui", "Mount Maunganui"],
  ["24/22 Ashley Place, Papamoa Beach", "Pāpāmoa Beach"],
  ["53 Otumoetai Road, Otumoetai", "Ōtūmoetai"],
  ["14 Links Avenue, Arataki", "Arataki"],
];
for (const [address, expected] of checks) {
  const actual = classifyTaurangaAddress(address)?.region;
  if (actual !== expected) throw new Error("Location mapping failed: " + address + ": " + actual);
}

const offices = [
  ["Ray White Tauranga", "raywhite-tauranga", "https://rwtauranga.co.nz"],
  ["Ray White Mount Maunganui", "raywhite-mount", "https://rwmountmaunganui.co.nz"],
];
let successful = 0;
for (const [name, key, origin] of offices) {
  try {
    const response = await fetch(origin + "/properties/residential-for-rent?category=&suburbPostCode=", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BlenheimRentals/1.0; +https://github.com/Archil3s/Blenheim-rentals)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const html = await response.text();
    const rentals = parseTaurangaRayWhiteHtml(html, {name,key,origin});
    const counts = Object.fromEntries(
      [...new Set(rentals.map(x => x.region))].map(region => [region, rentals.filter(x => x.region === region).length]),
    );
    console.log(JSON.stringify({
      source:name, status:response.status, rentals:rentals.length, regions:counts,
      samples:rentals.slice(0,5).map(x=>({address:x.address,rent:x.rent,region:x.region,bedrooms:x.bedrooms})),
    }, null, 2));
    if (rentals.length < 1) throw new Error("No listings parsed from live provider");
    successful++;
  } catch(error) {
    console.error(name + " provider smoke test: " + String(error));
  }
}
if (successful === 0) throw new Error("Both Tauranga providers failed the live parser smoke test");
