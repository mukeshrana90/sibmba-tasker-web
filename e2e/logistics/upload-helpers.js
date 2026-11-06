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

/** One-page PDF holding a JPEG (a "scanned" paper). */
function jpegToPdf(jpgFile, out) {
  const img = fs.readFileSync(jpgFile);
  // JPEG size from the SOF marker
  let i = 2, w = 0, h = 0;
  while (i < img.length) {
    const marker = img[i + 1];
    const len = img.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc2) { h = img.readUInt16BE(i + 5); w = img.readUInt16BE(i + 7); break; }
    i += 2 + len;
  }
  const pw = 595, ph = Math.round((595 * h) / w);
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    null, // image
    null, // content
  ];
  const content = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
  const parts = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "binary")];
  const offsets = [];
  let pos = parts[0].length;
  const push = (b) => { parts.push(b); pos += b.length; };
  objs.forEach((o, k) => {
    offsets.push(pos);
    if (k === 3) {
      push(Buffer.from(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`));
      push(img);
      push(Buffer.from("\nendstream\nendobj\n"));
    } else if (k === 4) {
      push(Buffer.from(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`));
    } else push(Buffer.from(`${k + 1} 0 obj\n${o}\nendobj\n`));
  });
  const xref = pos;
  push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  fs.writeFileSync(out, Buffer.concat(parts));
  return out;
}

const REAL = path.join(FIX, "real");
const HEIC = path.join(REAL, "heic");

/**
 * Upload fixtures. Valid files look real (truck / goods / tractor / cab photos, phone
 * photos of papers, insurance + road-tax PDFs from docs.js, a real .docx); the
 * edge cases keep their exact size / format (oversize, exactly 10 MB, corrupt, zip,
 * HEIC variants, extensionless, JPEG named .heic).
 *   ctx = { unit: C.unit(...), owner: "<company>", operator: { name, face } }
 */
async function makeFixtures(ctx = {}) {
  fs.mkdirSync(GEN, { recursive: true });
  const unit = ctx.unit || {};
  const info = { owner: ctx.owner, holder: ctx.operator?.name, face: ctx.operator?.face, plate: unit.plate, make: unit.make, model: unit.model, year: unit.year, kind: "vehicle" };
  const withBrand = (src, out, brand) => {
    const b = Buffer.from(fs.readFileSync(src));
    b.write(brand, 8, "ascii"); // ftyp major brand
    fs.writeFileSync(out, b);
    return out;
  };
  const copy = (src, out) => (fs.copyFileSync(src, out), out);
  const f = {
    // HEIC from an iPhone (truck, goods, operator selfie, papers) and other HEIF flavours
    heic: path.join(HEIC, "IMG_4521.heic"), // truck, front
    heic2: path.join(HEIC, "IMG_4522.heic"), // truck, side
    goodsHeic: path.join(HEIC, "IMG_4533.heic"), // cement bags
    goodsHeic2: path.join(HEIC, "IMG_4534.heic"), // loaded mini truck
    selfieHeic: path.join(HEIC, "IMG_4610.heic"),
    selfieHeif: path.join(HEIC, "IMG_5140.heif"),
    licenceHeic: path.join(HEIC, "IMG_4612.heic"), // licence, reverse side
    insHeic: path.join(HEIC, "IMG_4527.heic"), // insurance certificate page
    insHeif: path.join(HEIC, "IMG_5108.heif"),
    medicalHeic: path.join(HEIC, "IMG_5150.heic"), // eye test report
    heif: path.join(HEIC, "IMG_5102.heif"), // taxi photo saved as .heif
    mif1: withBrand(path.join(HEIC, "20261012_110455.heic"), path.join(GEN, "20261012_110455.heic"), "mif1"), // Samsung: permit page
    mif1Goods: withBrand(path.join(HEIC, "20261013_093012.heic"), path.join(GEN, "20261013_093012.heic"), "mif1"), // Samsung: pallets
    disguised: copy(path.join(HEIC, "WhatsApp-Image-2026-10-14.heic"), path.join(GEN, "WhatsApp-Image-2026-10-14.jpg")), // HEIC named .jpg
    reallyJpeg: path.join(HEIC, "IMG_4590.heic"), // JPEG named .heic (truck)
    reallyJpegCab: path.join(HEIC, "IMG_5103.heic"), // JPEG named .heic (taxi)
    jpg: path.join(GEN, "IMG_20261011_164210.jpg"),
    exact10Jpg: path.join(GEN, "DSC_0457.jpg"),
    bigJpg: path.join(GEN, "big-photo.jpg"),
    corrupt: path.join(GEN, "corrupt-photo.jpg"),
    pdf: path.join(GEN, "insurance-policy.pdf"),
    roadTax: path.join(GEN, "road-tax-receipt.pdf"),
    competency: path.join(GEN, "competency-certificate.pdf"),
    dlPdf: path.join(GEN, "driving-licence-scan.pdf"),
    bigPdf: path.join(GEN, "big-paper.pdf"),
    pdf10: path.join(GEN, "road-tax-receipt-hq.pdf"),
    zip: path.join(GEN, "archive.zip"),
    docx: copy(path.join(REAL, "transport-permit.docx"), path.join(GEN, "transport-permit.docx")),
  };
  // 2400px truck photo so the resize to 1920 is visible
  await sharp(path.join(REAL, "zw/hino-2.jpg")).resize(2400, 1600, { fit: "cover" }).jpeg({ quality: 92 }).toFile(f.jpg);
  const jpgBuf = fs.readFileSync(f.jpg);
  // Valid JPEG padded to exactly 10 MB (decoders stop at the end-of-image marker)
  fs.writeFileSync(f.exact10Jpg, Buffer.concat([jpgBuf, Buffer.alloc(10 * MB - jpgBuf.length)]));
  fs.writeFileSync(f.bigJpg, Buffer.alloc(10 * MB + 1, 0xff));
  fs.writeFileSync(f.corrupt, Buffer.alloc(4096, 0xff));
  // Real-looking papers (docs.js) for this owner's truck / operator
  copy(await L.docFile("insurance", info), f.pdf);
  copy(await L.docFile("rego", info), f.roadTax);
  copy(await L.docFile("competency", info), f.competency);
  jpegToPdf(await L.docFile("licence", info), f.dlPdf);
  // Road-tax PDF padded to exactly 10 MB (a high-resolution scan); 11 MB one for the refusals
  const rt = fs.readFileSync(f.roadTax);
  fs.writeFileSync(f.pdf10, Buffer.concat([rt, Buffer.alloc(10 * MB - rt.length, 0x20)]));
  fs.writeFileSync(f.bigPdf, Buffer.concat([rt, Buffer.alloc(11 * MB, 0x20)]));
  fs.writeFileSync(f.zip, Buffer.from("PK\x03\x04e2e zip"));
  // In-memory HEIC without an extension (setInputFiles payload): tractor photo
  f.extless = { name: "IMG_2001", mimeType: "image/heic", buffer: fs.readFileSync(path.join(HEIC, "IMG_2001.heic")) };
  // file name → regex-safe, for toast / URL checks
  f.re = (file) => path.basename(typeof file === "string" ? file : file.name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  f.stem = (file) => f.re(file).replace(/\\\.(heic|heif|jpe?g)$/i, "");
  return f;
}

/** Equipment owner straight in DB from a cast person (C.slot("owner", …)): real name + company, +263 phone. */
async function makeOwner(person, extra = {}) {
  await L.db();
  const { User } = require(path.join(BACKEND, "src/models"));
  let u = await User.findOne({ email: person.email });
  if (!u) {
    u = await User.create({
      email: person.email, full_name: person.name, company_name: person.company, role: 4,
      country_code: person.cc, phone_number: person.phone,
      email_verified: 1, account_verified: 1, is_completeProfile: 1, password: "Passw0rd!", ...extra,
    });
  }
  return { _id: String(u._id), email: person.email, role: 4, token: L.tokenFor(u._id), name: person.name, company: person.company, phone: person.phone, cc: person.cc };
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

module.exports = { MB, BACKEND, REAL, diskOf, thumbOf, isJpeg, makeFixtures, makeOwner, jpegToPdf, upload, toastHas, imagesLoaded, baseName };
