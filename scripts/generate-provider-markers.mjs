/**
 * scripts/generate-provider-markers.mjs
 *
 * Generates colored provider marker PNGs for every non-hospital provider type.
 * Uses the existing hospital.png (54x91) and selected_hospital.png (68x114) as source.
 * Recolors each to the category's markerTint by replacing the hue+saturation of every
 * opaque pixel while preserving luminosity — keeps the 3D gloss/shadow intact.
 *
 * Output: assets/map/provider-markers/{type}.png and selected_{type}.png
 *
 * Run: node scripts/generate-provider-markers.mjs
 */

import { Jimp } from "jimp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── Category definitions (from constants/providerTypes.js) ──────────────────
const PROVIDERS = [
  { type: "pharmacy",     tint: "#2E7D32" },
  { type: "lab",          tint: "#1565C0" },
  { type: "radiology",    tint: "#6A1B9A" },
  { type: "urgent_care",  tint: "#E65100" },
  { type: "clinic",       tint: "#00695C" },
  { type: "mental_health",tint: "#4527A0" },
  { type: "womens_care",  tint: "#AD1457" },
  { type: "pediatrics",   tint: "#0277BD" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Recolor every opaque pixel of `image` to the target hue+saturation,
 * preserving per-pixel luminosity so highlights/shadows stay.
 * Pixels with alpha < 20 are left fully transparent.
 */
function recolorImage(image, tintHex) {
  const { r: tr, g: tg, b: tb } = hexToRgb(tintHex);
  const { h: targetH, s: targetS } = rgbToHsl(tr, tg, tb);

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const alpha = this.bitmap.data[idx + 3];
    if (alpha < 20) return;

    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    const { l } = rgbToHsl(r, g, b);

    // Blend toward target saturation — preserve very-low-saturation pixels (near-white highlights)
    // by blending saturation so they fade to the correct tint rather than becoming grey.
    const blendedS = l > 0.85 ? targetS * 0.35 : l < 0.15 ? targetS * 0.55 : targetS;

    const { r: nr, g: ng, b: nb } = hslToRgb(targetH, blendedS, l);
    this.bitmap.data[idx]     = nr;
    this.bitmap.data[idx + 1] = ng;
    this.bitmap.data[idx + 2] = nb;
  });

  return image;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const SRC_NORMAL   = path.join(ROOT, "assets/map/hospital.png");
const SRC_SELECTED = path.join(ROOT, "assets/map/selected_hospital.png");
const OUT_DIR      = path.join(ROOT, "assets/map/provider-markers");

fs.mkdirSync(OUT_DIR, { recursive: true });

console.log(`Generating ${PROVIDERS.length * 2} marker images → assets/map/provider-markers/\n`);

for (const { type, tint } of PROVIDERS) {
  // Normal marker
  const normal = await Jimp.read(SRC_NORMAL);
  recolorImage(normal, tint);
  const normalOut = path.join(OUT_DIR, `${type}.png`);
  await normal.write(normalOut);
  console.log(`  ✓ ${type}.png  (${tint})`);

  // Selected marker
  const selected = await Jimp.read(SRC_SELECTED);
  recolorImage(selected, tint);
  const selectedOut = path.join(OUT_DIR, `selected_${type}.png`);
  await selected.write(selectedOut);
  console.log(`  ✓ selected_${type}.png  (${tint})`);
}

console.log(`\nDone. ${PROVIDERS.length * 2} files written to assets/map/provider-markers/`);
