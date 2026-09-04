// Builds a photobooth receipt (logo/app name -> QR -> AI photo -> thanks/quote/footer)
// as a dithered ESC/POS raster image and sends it to the local print bridge
// (print-bridge/print_bridge.py or print_bridge_windows.py) over HTTP.
//
// Used as a second print path alongside the browser's window.print() dialog
// in ResultView.tsx — this one talks directly to a 58mm thermal printer
// (RPP02N / POS58) via a bridge running on the kiosk machine, so it works
// even when the site itself is hosted remotely (the fetch always targets
// 127.0.0.1 on the browser's own machine).
import { qrcode } from "./qrcode-generator.js";

// Printable dot width for a 58mm roll (~48mm print head) at 203dpi.
const PRINTER_WIDTH = 384;
const BRIDGE_URL = "http://127.0.0.1:9100";

export interface EscPosReceiptOptions {
  appName: string;
  topLogoUrl?: string;
  photoUrl: string;
  shareUrl?: string;
  thanksText?: string;
  quoteText?: string;
  footerLogoUrl?: string;
  footerText?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawQrCode(
  ctx: CanvasRenderingContext2D,
  value: string,
  cx: number,
  y: number,
  sizePx: number
): number {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  const cell = sizePx / count;
  const qx = cx - sizePx / 2;
  ctx.fillStyle = "#000";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(qx + c * cell, y + r * cell, cell + 0.6, cell + 0.6);
      }
    }
  }
  return sizePx;
}

async function buildReceiptCanvas(opts: EscPosReceiptOptions): Promise<HTMLCanvasElement> {
  const work = document.createElement("canvas");
  work.width = PRINTER_WIDTH;
  work.height = 2400; // generous, cropped to actual content height at the end
  const ctx = work.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, work.width, work.height);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";

  const cx = PRINTER_WIDTH / 2;
  const marginX = 16; // ~2mm each side within the 48mm printable width
  const contentWidth = PRINTER_WIDTH - marginX * 2;
  let y = 20;

  // Top logo or app name
  if (opts.topLogoUrl) {
    try {
      const logo = await loadImage(opts.topLogoUrl);
      const maxW = 200,
        maxH = 90;
      const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
      const w = logo.width * scale,
        h = logo.height * scale;
      ctx.drawImage(logo, cx - w / 2, y, w, h);
      y += h + 14;
    } catch {
      // fall through to text app name if the logo fails to load
      ctx.font = "bold 22px Consolas, 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText((opts.appName || "PHOTOBOOTH").toUpperCase(), cx, y);
      y += 30;
    }
  } else {
    ctx.font = "bold 22px Consolas, 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText((opts.appName || "PHOTOBOOTH").toUpperCase(), cx, y);
    y += 30;
  }

  // QR code
  if (opts.shareUrl) {
    y += 6;
    const qrSize = 190;
    drawQrCode(ctx, opts.shareUrl, cx, y, qrSize);
    y += qrSize + 10;
    ctx.font = "12px Consolas, 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Scan untuk melihat & simpan foto", cx, y);
    y += 24;
  }

  // AI result photo — placed below the QR code
  try {
    const photo = await loadImage(opts.photoUrl);
    const w = contentWidth;
    const h = (photo.height / photo.width) * w;
    ctx.drawImage(photo, marginX, y, w, h);
    y += h + 20;
  } catch {
    ctx.font = "12px Consolas, 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("[Foto tidak dapat dimuat]", cx, y);
    y += 24;
  }

  // Thanks text
  if (opts.thanksText) {
    ctx.font = "bold 18px Consolas, 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(opts.thanksText.toUpperCase(), cx, y);
    y += 28;
  }

  // Quote
  if (opts.quoteText) {
    ctx.fillRect(cx - 40, y, 80, 1);
    y += 16;
    ctx.font = "13px Consolas, 'Courier New', monospace";
    ctx.textAlign = "center";
    const lines = wrapText(ctx, opts.quoteText, contentWidth);
    lines.forEach((line) => {
      ctx.fillText(line, cx, y);
      y += 18;
    });
    y += 8;
  }

  // Footer
  if (opts.footerLogoUrl) {
    try {
      const logo = await loadImage(opts.footerLogoUrl);
      const maxW = 140,
        maxH = 60;
      const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
      const w = logo.width * scale,
        h = logo.height * scale;
      ctx.drawImage(logo, cx - w / 2, y, w, h);
      y += h + 10;
    } catch {
      // ignore — footer logo is optional
    }
  }
  if (opts.footerText) {
    ctx.font = "bold 11px Consolas, 'Courier New', monospace";
    ctx.textAlign = "center";
    const lines = wrapText(ctx, opts.footerText.toUpperCase(), contentWidth);
    lines.forEach((line) => {
      ctx.fillText(line, cx, y);
      y += 16;
    });
  }
  y += 20;

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = PRINTER_WIDTH;
  finalCanvas.height = y;
  const fctx = finalCanvas.getContext("2d")!;
  fctx.fillStyle = "#fff";
  fctx.fillRect(0, 0, PRINTER_WIDTH, y);
  fctx.drawImage(work, 0, 0, PRINTER_WIDTH, y, 0, 0, PRINTER_WIDTH, y);
  return finalCanvas;
}

// Floyd–Steinberg dithering — thermal printers only support black/white dots.
function ditherCanvas(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width,
    h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const idx = yy * w + xx;
      const old = gray[idx];
      const newVal = old < 128 ? 0 : 255;
      const err = old - newVal;
      gray[idx] = newVal;
      if (xx + 1 < w) gray[idx + 1] += (err * 7) / 16;
      if (yy + 1 < h) {
        if (xx > 0) gray[idx + w - 1] += (err * 3) / 16;
        gray[idx + w] += (err * 5) / 16;
        if (xx + 1 < w) gray[idx + w + 1] += (err * 1) / 16;
      }
    }
  }
  const bitmap = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) bitmap[p] = gray[p] < 128 ? 1 : 0;
  return bitmap;
}

function buildEscPosBytes(canvas: HTMLCanvasElement): Uint8Array {
  const w = canvas.width,
    h = canvas.height;
  const bitmap = ditherCanvas(canvas);
  const widthBytes = Math.ceil(w / 8);
  const bandHeight = 48;
  const chunks: Uint8Array[] = [new Uint8Array([0x1b, 0x40])]; // ESC @ init

  for (let y0 = 0; y0 < h; y0 += bandHeight) {
    const bh = Math.min(bandHeight, h - y0);
    const header = new Uint8Array([
      0x1d,
      0x76,
      0x30,
      0x00, // GS v 0, normal mode
      widthBytes & 0xff,
      (widthBytes >> 8) & 0xff,
      bh & 0xff,
      (bh >> 8) & 0xff,
    ]);
    const data = new Uint8Array(widthBytes * bh);
    for (let yy = 0; yy < bh; yy++) {
      for (let xx = 0; xx < w; xx++) {
        if (bitmap[(y0 + yy) * w + xx]) {
          data[yy * widthBytes + (xx >> 3)] |= 0x80 >> (xx & 7);
        }
      }
    }
    chunks.push(header, data);
  }
  chunks.push(new Uint8Array([0x0a, 0x0a, 0x0a, 0x0a])); // feed + cut margin

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export async function checkPrintBridge(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/status`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function printReceiptViaBridge(opts: EscPosReceiptOptions): Promise<void> {
  const canvas = await buildReceiptCanvas(opts);
  const bytes = buildEscPosBytes(canvas);
  const res = await fetch(`${BRIDGE_URL}/print`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: bytes,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Gagal mengirim ke printer");
  }
}
