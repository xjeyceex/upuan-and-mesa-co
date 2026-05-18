import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "public", "icons", "icon.svg");
const outDir = join(root, "public", "icons");

mkdirSync(outDir, { recursive: true });
const svg = readFileSync(svgPath);

for (const size of [192, 512]) {
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  const out = join(outDir, `icon-${size}.png`);
  writeFileSync(out, png);
  console.log(`Wrote ${out}`);
}
