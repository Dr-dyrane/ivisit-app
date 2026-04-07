import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const width = 1600;
const height = 1200;
const png = new PNG({ width, height, colorType: 6 });

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const idx = (width * y + x) << 2;
  const alpha = a / 255;
  const inv = 1 - alpha;
  png.data[idx] = Math.round(r * alpha + png.data[idx] * inv);
  png.data[idx + 1] = Math.round(g * alpha + png.data[idx + 1] * inv);
  png.data[idx + 2] = Math.round(b * alpha + png.data[idx + 2] * inv);
  png.data[idx + 3] = Math.min(255, Math.round(a + png.data[idx + 3] * inv));
}

function fillRect(x, y, w, h, color, radius = 0) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (radius > 0) {
        const rx = xx < x + radius ? x + radius - xx : xx > x + w - radius ? xx - (x + w - radius) : 0;
        const ry = yy < y + radius ? y + radius - yy : yy > y + h - radius ? yy - (y + h - radius) : 0;
        if (rx * rx + ry * ry > radius * radius) continue;
      }
      setPixel(xx, yy, color[0], color[1], color[2], color[3]);
    }
  }
}

function fillEllipse(cx, cy, rx, ry, color) {
  for (let y = Math.max(0, cy - ry); y <= Math.min(height - 1, cy + ry); y++) {
    for (let x = Math.max(0, cx - rx); x <= Math.min(width - 1, cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const dist = dx * dx + dy * dy;
      if (dist <= 1) {
        const alpha = color[3] * (1 - dist * 0.9);
        setPixel(x, y, color[0], color[1], color[2], alpha);
      }
    }
  }
}

function drawCircle(cx, cy, r, color) {
  fillEllipse(cx, cy, r, r, color);
}

function drawLine(x1, y1, x2, y2, thickness, color) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x1 + dx * t);
    const y = Math.round(y1 + dy * t);
    drawCircle(x, y, Math.max(1, Math.round(thickness / 2)), color);
  }
}

// transparent canvas with soft product shadow
fillEllipse(800, 845, 360, 72, [15, 23, 42, 58]);
fillEllipse(800, 855, 300, 42, [15, 23, 42, 36]);

// body shell
fillRect(360, 470, 520, 210, [249, 251, 255, 255], 42);
fillRect(760, 420, 260, 260, [252, 253, 255, 255], 36);
fillRect(340, 670, 700, 32, [209, 219, 229, 210], 14);

// roof light and accents
fillRect(760, 390, 92, 24, [14, 165, 233, 255], 10);
fillRect(854, 390, 64, 24, [59, 130, 246, 255], 10);

// windows
fillRect(430, 505, 150, 90, [220, 242, 254, 255], 18);
fillRect(595, 505, 150, 90, [219, 234, 254, 255], 18);
fillRect(790, 490, 155, 105, [219, 234, 254, 255], 18);

// stripe and cross
fillRect(390, 590, 590, 52, [14, 165, 233, 255], 18);
fillRect(600, 505, 28, 128, [255, 255, 255, 245], 8);
fillRect(550, 555, 128, 28, [255, 255, 255, 245], 8);

// subtle outline lines
for (let i = 0; i < 3; i++) {
  drawLine(360 + i, 680 + i, 1015 + i, 680 + i, 2, [203, 213, 225, 120]);
}

// bumper / front details
fillRect(958, 612, 62, 30, [56, 189, 248, 255], 12);
fillRect(928, 628, 40, 24, [255, 255, 255, 220], 10);
fillRect(380, 626, 74, 16, [191, 219, 254, 220], 8);

// wheels
for (const cx of [505, 860]) {
  drawCircle(cx, 720, 66, [15, 23, 42, 255]);
  drawCircle(cx, 720, 34, [203, 213, 225, 255]);
  drawCircle(cx, 720, 14, [148, 163, 184, 255]);
}

// ground reflection accents
fillEllipse(640, 800, 160, 18, [14, 165, 233, 24]);
fillEllipse(870, 802, 120, 16, [59, 130, 246, 20]);

const outPath = path.resolve('assets/emergency/transport/ambulance-bls.png');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
png.pack().pipe(fs.createWriteStream(outPath)).on('finish', () => {
  console.log(`Generated ${outPath}`);
});
