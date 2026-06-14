import fs from "node:fs";
import path from "node:path";
import gifenc from "gifenc";

const { GIFEncoder, applyPalette, quantize } = gifenc;

const width = 720;
const height = 220;
const frames = 18;
const output = path.resolve(process.cwd(), "assets/freefire-flames.gif");

fs.mkdirSync(path.dirname(output), { recursive: true });

const gif = GIFEncoder();

for (let frame = 0; frame < frames; frame += 1) {
  const rgba = new Uint8Array(width * height * 4);
  const time = frame / frames;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const nx = x / width;
      const ny = y / height;
      const edgeGlow = Math.max(0, 1 - Math.abs(nx - 0.5) * 1.8);
      const base = 8 + Math.round(24 * (1 - ny));
      const redVein = Math.max(0, wave(nx * 8 + ny * 2 - time * 2) - 0.35) * 95;
      const ember = Math.max(0, wave(nx * 24 - ny * 8 + time * 6) - 0.78) * 210;
      const flame = Math.max(0, wave(nx * 5 + time * 2) + wave(nx * 11 - ny * 4 - time * 4) - 1.05) * (1 - ny) * 150;

      rgba[i] = clamp(base + redVein + ember + flame + edgeGlow * 22);
      rgba[i + 1] = clamp(base + ember * 0.35 + flame * 0.45);
      rgba[i + 2] = clamp(base + redVein * 0.10);
      rgba[i + 3] = 255;
    }
  }

  drawVignette(rgba);
  drawBrandBars(rgba, frame);
  drawTextPlate(rgba);

  const palette = quantize(rgba, 256);
  const indexed = applyPalette(rgba, palette);
  gif.writeFrame(indexed, width, height, { palette, delay: 70 });
}

gif.finish();
fs.writeFileSync(output, Buffer.from(gif.bytes()));
console.log(`Generated ${output}`);

function drawBrandBars(rgba, frame) {
  const offset = (frame * 14) % 80;
  for (let y = 0; y < height; y += 1) {
    for (let x = -140; x < width + 140; x += 80) {
      drawSlash(rgba, x + offset, y, 42, 5, [239, 35, 60, 135]);
    }
  }
}

function drawTextPlate(rgba) {
  drawRoundedRect(rgba, 42, 44, 636, 132, 18, [8, 10, 14, 190]);
  drawRoundedRect(rgba, 44, 46, 632, 128, 16, [255, 255, 255, 12]);
  drawRect(rgba, 66, 64, 8, 92, [239, 35, 60, 255]);
}

function drawVignette(rgba) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const dx = (x / width - 0.5) * 2;
      const dy = (y / height - 0.5) * 2;
      const v = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 0.78);
      rgba[i] = clamp(rgba[i] * (1 - v * 0.55));
      rgba[i + 1] = clamp(rgba[i + 1] * (1 - v * 0.62));
      rgba[i + 2] = clamp(rgba[i + 2] * (1 - v * 0.72));
    }
  }
}

function drawSlash(rgba, cx, cy, length, thickness, color) {
  for (let y = Math.max(0, cy - length); y < Math.min(height, cy + length); y += 1) {
    for (let x = Math.max(0, cx - length); x < Math.min(width, cx + length); x += 1) {
      const d = Math.abs((x - cx) * 0.5 - (y - cy));
      if (d < thickness && x > cx - length && x < cx + length) {
        blend(rgba, x, y, color);
      }
    }
  }
}

function drawRoundedRect(rgba, x, y, w, h, r, color) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      const dx = Math.max(x - xx + r, 0, xx - (x + w - r - 1));
      const dy = Math.max(y - yy + r, 0, yy - (y + h - r - 1));
      if (dx * dx + dy * dy <= r * r) {
        blend(rgba, xx, yy, color);
      }
    }
  }
}

function drawRect(rgba, x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      blend(rgba, xx, yy, color);
    }
  }
}

function blend(rgba, x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = (Math.floor(y) * width + Math.floor(x)) * 4;
  const alpha = color[3] / 255;
  rgba[i] = clamp(rgba[i] * (1 - alpha) + color[0] * alpha);
  rgba[i + 1] = clamp(rgba[i + 1] * (1 - alpha) + color[1] * alpha);
  rgba[i + 2] = clamp(rgba[i + 2] * (1 - alpha) + color[2] * alpha);
  rgba[i + 3] = 255;
}

function wave(value) {
  return (Math.sin(value * Math.PI * 2) + 1) / 2;
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
