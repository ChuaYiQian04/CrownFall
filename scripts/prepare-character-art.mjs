// Resize/encode generated originals for mobile delivery; no creative edits.
// Usage: node scripts/prepare-character-art.mjs path-to-source-manifest.json
// Manifest: [{"slug":"merlin","source":"absolute/path/to/generated.png"}]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
const assets = JSON.parse(await readFile(process.argv[2], "utf8"));
await mkdir("public/assets/characters", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const asset of assets) {
    if (!/^[a-z-]+$/.test(asset.slug))
      throw new Error("Invalid artwork filename");
    const source = await readFile(asset.source);
    const data = await page.evaluate(
      async (png) => {
        const img = new Image();
        img.src = png;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 720;
        canvas.height = Math.round(
          (720 * img.naturalHeight) / img.naturalWidth,
        );
        const context = canvas.getContext("2d");
        context.imageSmoothingQuality = "high";
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/webp", 0.86).split(",")[1];
      },
      `data:image/png;base64,${source.toString("base64")}`,
    );
    const bytes = Buffer.from(data, "base64");
    await writeFile(`public/assets/characters/${asset.slug}.webp`, bytes, {
      flag: "wx",
    });
    console.log(`${asset.slug}.webp: ${Math.round(bytes.length / 1024)} KiB`);
  }
} finally {
  await browser.close();
}
