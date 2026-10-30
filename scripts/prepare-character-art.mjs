// Resize/encode generated originals for mobile delivery; no creative edits.
// Usage: node scripts/prepare-character-art.mjs manifest.json [output-directory]
// Manifest: [{"slug":"merlin","source":"absolute/path/to/generated.png","width":720}]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
const assets = JSON.parse(await readFile(process.argv[2], "utf8"));
const outputDir = process.argv[3] || "public/assets/characters";
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const asset of assets) {
    if (!/^[a-z-]+$/.test(asset.slug))
      throw new Error("Invalid artwork filename");
    const source = await readFile(asset.source);
    const data = await page.evaluate(
      async ({ png, width }) => {
        const img = new Image();
        img.src = png;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(width, img.naturalWidth);
        canvas.height = Math.round(
          (canvas.width * img.naturalHeight) / img.naturalWidth,
        );
        const context = canvas.getContext("2d");
        context.imageSmoothingQuality = "high";
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/webp", 0.86).split(",")[1];
      },
      {
        png: `data:image/png;base64,${source.toString("base64")}`,
        width: asset.width || 720,
      },
    );
    const bytes = Buffer.from(data, "base64");
    await writeFile(`${outputDir}/${asset.slug}.webp`, bytes, {
      flag: "wx",
    });
    console.log(`${asset.slug}.webp: ${Math.round(bytes.length / 1024)} KiB`);
  }
} finally {
  await browser.close();
}
