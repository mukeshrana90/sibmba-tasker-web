/* Shared by s17-uploads / s18-uploads-more: upload fixtures + checks on stored files. */
const L = require("./lib");
const fs = require("fs");
const path = require("path");

const BACKEND = path.resolve(__dirname, "../../../sibmba-tasker-backend");
const sharp = require(path.join(BACKEND, "node_modules/sharp"));
const FIX = path.join(__dirname, "fixtures");
const GEN = path.join(FIX, "gen");
const MB = 1024 * 1024;

const diskOf = (url) => path.join(BACKEND, "public", String(url || "").replace(/^\/?(public\/)?/, ""));
const thumbOf = (p) => path.join(path.dirname(p), `thumb_${path.basename(p)}`);

/** Stored file is a real JPEG ≤1920px (thumb: whether thumb_ exists). */
async function isJpeg(url) {
  const p = diskOf(url);
  if (!url || !fs.existsSync(p)) return { ok: false, why: `missing ${url}` };
  const m = await sharp(p).metadata().catch((e) => ({ err: e.message }));
  return { ok: m.format === "jpeg" && m.width <= 1920, why: `${m.format} ${m.width}x${m.height}`, thumb: fs.existsSync(thumbOf(p)) };
}

async function makeFixtures() {
  fs.mkdirSync(GEN, { recursive: true });
  const heicBuf = fs.readFileSync(path.join(FIX, "iphone-photo.heic"));
  const f = {
    heic: path.join(FIX, "iphone-photo.heic"),
    heif: path.join(GEN, "iphone-photo.heif"),
    mif1: path.join(GEN, "samsung-photo.heic"),
    disguised: path.join(GEN, "whatsapp-photo.jpg"),
    reallyJpeg: path.join(GEN, "really-jpeg.heic"),
    jpg: path.join(GEN, "truck-photo.jpg"),
    exact10Jpg: path.join(GEN, "exactly-10mb-photo.jpg"),
    bigJpg: path.join(GEN, "big-photo.jpg"),
    corrupt: path.join(GEN, "corrupt-photo.jpg"),
    pdf: path.join(GEN, "insurance-paper.pdf"),
    bigPdf: path.join(GEN, "big-paper.pdf"),
    pdf10: path.join(GEN, "exactly-10mb.pdf"),
    zip: path.join(GEN, "archive.zip"),
    docx: path.join(GEN, "permit.docx"),
  };
  // 2400px photo so the resize to 1920 is visible
  await sharp({ create: { width: 2400, height: 1600, channels: 3, background: { r: 30, g: 120, b: 200 } } })
    .jpeg({ quality: 95 }).toFile(f.jpg);
  const jpgBuf = fs.readFileSync(f.jpg);
  // Same HEIC as .heif, as a "mif1"-branded HEIF, under a .jpg name; a JPEG named .heic
  fs.writeFileSync(f.heif, heicBuf);
  const mif1 = Buffer.from(heicBuf);
  mif1.write("mif1", 8, "ascii");
  fs.writeFileSync(f.mif1, mif1);
  fs.writeFileSync(f.disguised, heicBuf);
  fs.writeFileSync(f.reallyJpeg, jpgBuf);
  // Valid JPEG padded to exactly 10 MB (decoders stop at the end-of-image marker)
  fs.writeFileSync(f.exact10Jpg, Buffer.concat([jpgBuf, Buffer.alloc(10 * MB - jpgBuf.length)]));
  fs.writeFileSync(f.bigJpg, Buffer.alloc(10 * MB + 1, 0xff));
  fs.writeFileSync(f.corrupt, Buffer.alloc(4096, 0xff));
  fs.writeFileSync(f.pdf, Buffer.concat([Buffer.from("%PDF-1.4\n%e2e insurance\n"), Buffer.alloc(200 * 1024, 0x20)]));
  fs.writeFileSync(f.bigPdf, Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(11 * MB, 0x20)]));
  fs.writeFileSync(f.pdf10, Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(10 * MB - 9, 0x20)]));
  fs.writeFileSync(f.zip, Buffer.from("PK\x03\x04e2e zip"));
  fs.writeFileSync(f.docx, Buffer.from("PK\x03\x04e2e docx word file"));
  // In-memory file without an extension (setInputFiles payload)
  f.extless = { name: "IMG_2001", mimeType: "image/heic", buffer: heicBuf };
  return f;
}

/** Multipart straight to the test API (no browser checks in the way). */
async function upload(method, p, token, parts) {
  const fd = new FormData();
  for (const [field, val] of parts) {
    if (val && val.file) {
      const buf = fs.readFileSync(val.file);
      fd.append(field, new Blob([buf], { type: val.type || "application/octet-stream" }), val.name || path.basename(val.file));
    } else fd.append(field, val);
  }
  const res = await fetch(`${L.API}/api${p}`, { method, headers: { authorization: token }, body: fd });
  const t = await res.text();
  try { return { http: res.status, ...JSON.parse(t) }; } catch { return { http: res.status, raw: t.slice(0, 200) }; }
}

/** Toast with this text appears (then closed so it can't satisfy the next check). */
async function toastHas(a, re) {
  const ok = await L.waitText(a, re, 8000);
  await a.page.locator(".Toastify__close-button").first().click().catch(() => {});
  await a.page.waitForTimeout(300);
  return ok;
}

/** For each name: null = no <img> with it, else whether it loaded. */
async function imagesLoaded(a, names) {
  return a.page.evaluate((names) => names.map((n) => {
    const img = [...document.images].find((i) => i.currentSrc.includes(n) || i.src.includes(n));
    return img ? img.complete && img.naturalWidth > 0 : null;
  }), names);
}

const baseName = (url) => path.basename(String(url || "x")).replace(/\.jpg$/, "");

module.exports = { MB, BACKEND, diskOf, thumbOf, isJpeg, makeFixtures, upload, toastHas, imagesLoaded, baseName };
