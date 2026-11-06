/*
 * Real-looking test documents for the logistics E2E (Zimbabwean formats), rendered
 * with the suite's own Chromium:
 *   - PDF  → printed A4 page (page.pdf)
 *   - JPG  → the page as if photographed on a desk with a phone (slight tilt, shadow)
 *
 * Every document is fictional and carries a "SPECIMEN · TEST DATA" watermark.
 * Issuer names, reference numbers, insurers, clinics and training centres are made up.
 *
 *   const D = require("./docs");
 *   const file = await D.docFor("rego", { holder, plate, unit, expires });   // app doc type → file
 *
 * Files are cached in fixtures/gen/real/ by their content, so a run renders each once.
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "../../..");
const BACKEND = path.join(ROOT, "sibmba-tasker-backend");
const { chromium } = require(path.join(ROOT, "sibmba-tasker-web/node_modules/playwright"));
const sharp = require(path.join(BACKEND, "node_modules/sharp"));

const OUT = path.join(__dirname, "fixtures", "gen", "real");
const REAL = path.join(__dirname, "fixtures", "real");

const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
const addMonths = (m, from = new Date()) => {
  const d = new Date(from);
  d.setMonth(d.getMonth() + m);
  return d;
};
const dataUri = (file) => `data:image/jpeg;base64,${fs.readFileSync(file).toString("base64")}`;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** "AEZ4821" → "AEZ 4821" (Zimbabwe plates: 3 letters + 4 digits); anything else is left as is. */
const fmtPlate = (p) => String(p || "").toUpperCase().replace(/^([A-Z]{3})\s*(\d{4})$/, "$1 $2");

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "DejaVu Sans", "Noto Sans", Arial, sans-serif; color: #1d2433; }
  .wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 5; }
  .wm span { transform: rotate(-28deg); font-size: 46px; font-weight: 700; letter-spacing: 6px; color: rgba(200, 30, 30, 0.13); white-space: nowrap; }
  .stamp { position: absolute; width: 120px; height: 120px; border: 3px double rgba(30, 60, 160, .55); border-radius: 50%;
    color: rgba(30, 60, 160, .6); display: flex; align-items: center; justify-content: center; text-align: center;
    font-size: 10px; font-weight: 700; line-height: 1.25; transform: rotate(-14deg); padding: 10px; }
  .sig { font-family: "URW Chancery L", "Z003", "DejaVu Serif", serif; font-style: italic; font-size: 22px; color: #1b3a8a; }
  table.kv { border-collapse: collapse; width: 100%; font-size: 13px; }
  table.kv td { border: 1px solid #b9c0cc; padding: 6px 8px; vertical-align: top; }
  table.kv td.k { width: 36%; background: #f2f4f8; font-weight: 600; color: #3a4356; }
  .muted { color: #687087; font-size: 11px; }
  .flag { display: inline-flex; flex-direction: column; width: 54px; height: 34px; border: 1px solid rgba(0,0,0,.25); }
  .flag i { flex: 1; display: block; }
`;
// Hand-drawn looking signature
const SIG = (seed = 1) =>
  `<svg width="150" height="44" viewBox="0 0 150 44"><path d="M4 30 C 18 ${8 + seed} 26 40 36 22 S 52 ${10 + seed} 60 28 S 78 36 86 18 S 104 30 112 24 S 128 ${14 + seed} 146 20" fill="none" stroke="#1b3a8a" stroke-width="2" stroke-linecap="round"/></svg>`;
const WATERMARK = `<div class="wm"><span>SPECIMEN · TEST DATA</span></div>`;
// Simple green-yellow-red-black-red-yellow-green band (national colours, no emblem)
const FLAG = `<span class="flag"><i style="background:#319208"></i><i style="background:#ffd200"></i><i style="background:#de2010"></i><i style="background:#000"></i><i style="background:#de2010"></i><i style="background:#ffd200"></i><i style="background:#319208"></i></span>`;

// Fixed Harare offices (not tied to the plate)
const CVR = "Central Vehicle Registry, Harare";
const VID = "Vehicle Inspectorate Department, Belvedere Depot, Harare";
const ZINARA = "Zimbabwe National Road Administration";

// ── Templates ────────────────────────────────────────────────────────────
const T = {};

/** Driver's licence (card, JPG) — Zimbabwe, issued by VID. */
T.dl = (d) => ({
  size: { width: 860, height: 540 },
  html: `<div style="position:relative;width:860px;height:540px;border-radius:26px;overflow:hidden;
      background:linear-gradient(135deg,#eef6ea 0%,#fbfdf7 45%,#fdf6e0 100%);border:1px solid #9fb59a">
    <div style="height:86px;background:linear-gradient(90deg,#1e5e2a,#2f7d3a);color:#fff;padding:14px 26px;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;gap:16px;align-items:center">${FLAG}
        <div><div style="font-size:13px;letter-spacing:2px;opacity:.9">REPUBLIC OF ZIMBABWE</div>
          <div style="font-size:26px;font-weight:700;letter-spacing:1px">DRIVER'S LICENCE</div></div></div>
      <div style="text-align:right;font-size:12px;opacity:.92">Road Traffic Act [Chapter 13:11]<br>Vehicle Inspectorate Department</div>
    </div>
    <div style="display:flex;gap:26px;padding:22px 26px">
      <div><img src="${d.face}" style="width:170px;height:206px;object-fit:cover;border:2px solid #fff;box-shadow:0 0 0 1px #9fb59a;border-radius:6px">
        <div style="margin-top:10px">${SIG(3)}</div><div class="muted">Holder's signature</div></div>
      <div style="flex:1;font-size:15px;line-height:1.55">
        <div class="muted">Licence No.</div><div style="font-size:24px;font-weight:700;letter-spacing:1px;color:#1e5e2a">${esc(d.number)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-top:8px">
          <div><span class="muted">Surname</span><br><b>${esc(d.surname.toUpperCase())}</b></div>
          <div><span class="muted">First name(s)</span><br><b>${esc(d.first.toUpperCase())}</b></div>
          ${d.father
            ? `<div><span class="muted">Father's name</span><br>${esc(d.father)}</div><div><span class="muted">National ID No.</span><br>${esc(d.nid)}</div>`
            : `<div style="grid-column:span 2"><span class="muted">National ID No.</span><br><span style="font-family:'DejaVu Sans Mono',monospace">${esc(d.nid)}</span></div>`}
          <div><span class="muted">Date of birth</span><br>${esc(d.dob)}</div>
          <div><span class="muted">Sex</span><br>${esc(d.sex)}</div>
          <div><span class="muted">Date of issue</span><br>${fmt(d.issued)}</div>
          <div><span class="muted">Expiry date</span><br><b>${fmt(d.expires)}</b></div>
        </div>
        <div style="margin-top:8px"><span class="muted">Address</span><br>${esc(d.address)}</div>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="muted">Class(es)</span>${d.classes.map((c) => `<span style="border:1px solid #1e5e2a;color:#1e5e2a;border-radius:4px;padding:1px 8px;font-size:12px;font-weight:700">${c}</span>`).join("")}</div>
      </div>
    </div>
    ${WATERMARK}
  </div>`,
});

/** Vehicle Registration Book (JPG) — "Ownership papers", Central Vehicle Registry. */
T.regbook = (d) => ({
  size: { width: 900, height: 600 },
  html: `<div style="position:relative;width:900px;height:600px;border-radius:10px;overflow:hidden;background:linear-gradient(160deg,#f6f1e2,#fdfdf8 50%,#eef3ea);border:1px solid #b6a879">
    <div style="background:#5b4a1c;color:#fff;padding:14px 26px;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;gap:14px;align-items:center">${FLAG}<div><div style="font-size:12px;letter-spacing:2px;opacity:.9">REPUBLIC OF ZIMBABWE</div>
        <div style="font-size:23px;font-weight:700;letter-spacing:1px">VEHICLE REGISTRATION BOOK</div></div></div>
      <div style="font-size:12px;text-align:right;padding-right:40px">${esc(d.cvr).replace(", ", "<br>")}</div>
    </div>
    <div style="padding:18px 66px 18px 26px">
      <table class="kv">
        <tr><td class="k">Registration mark</td><td><b style="font-size:20px;letter-spacing:2px">${esc(d.plate)}</b></td></tr>
        <tr><td class="k">Registered owner</td><td>${esc(d.owner)}</td></tr>
        <tr><td class="k">Postal / physical address</td><td>${esc(d.address)}</td></tr>
        <tr><td class="k">Make / Model</td><td>${esc(d.make)} / ${esc(d.model)}</td></tr>
        <tr><td class="k">Vehicle type · Body</td><td>${esc(d.vclass)}</td></tr>
        <tr><td class="k">Chassis / VIN</td><td style="font-family:'DejaVu Sans Mono',monospace">${esc(d.chassis)}</td></tr>
        <tr><td class="k">Engine No.</td><td style="font-family:'DejaVu Sans Mono',monospace">${esc(d.engine)}</td></tr>
        <tr><td class="k">Date first registered</td><td>${fmt(d.registered)} &nbsp;·&nbsp; Fuel: Diesel &nbsp;·&nbsp; Year of make: ${esc(d.year)}</td></tr>
        <tr><td class="k">Book serial No.</td><td style="font-family:'DejaVu Sans Mono',monospace">${esc(d.ref)}</td></tr>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:12px;gap:20px;align-items:flex-end">
        <div style="text-align:center">${SIG(6)}<div class="muted">Registrar of Motor Vehicles</div></div>
      </div>
    </div>
    <div class="stamp" style="left:60px;bottom:22px">CENTRAL<br>VEHICLE<br>REGISTRY<br>HARARE</div>
    ${WATERMARK}
  </div>`,
});

/** A4 page wrapper for the PDF documents. */
const page = (title, issuer, body, { color = "#1e5e2a", stamp = "" } = {}) => ({
  pdf: true,
  html: `<div style="position:relative;width:794px;min-height:1123px;padding:46px 54px;background:#fff">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${color};padding-bottom:14px">
      <div><div style="font-size:22px;font-weight:700;color:${color}">${esc(issuer.name)}</div>
        <div class="muted" style="font-size:12px;margin-top:3px">${esc(issuer.line)}</div></div>
      <div style="text-align:right;font-size:12px;color:#3a4356">${issuer.right || ""}</div>
    </div>
    <h1 style="font-size:19px;letter-spacing:.5px;margin:22px 0 14px;color:#1d2433;text-transform:uppercase">${esc(title)}</h1>
    ${body}
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:46px">
      <div class="muted" style="max-width:420px">This is a computer generated document. Verify with the issuing office using the reference above.</div>
      <div style="text-align:center">${SIG(2)}<div class="muted">Authorised signatory</div></div>
    </div>
    ${stamp ? `<div class="stamp" style="right:250px;bottom:70px">${stamp}</div>` : ""}
    ${WATERMARK}
  </div>`,
});

/** ZINARA vehicle licence (PDF) — the app's "Road licence" document, with the licence disc. */
T.zinara = (d) =>
  page(
    "Vehicle Licence — Licence Disc & Receipt",
    { name: ZINARA, line: "Vehicle licensing · Harare licensing office · Specimen layout", right: `Receipt No. <b>${esc(d.ref)}</b><br>Date: ${fmt(d.issued)}` },
    `<div style="display:flex;gap:26px;align-items:flex-start">
      <table class="kv" style="flex:1">
        <tr><td class="k">Registration mark</td><td><b>${esc(d.plate)}</b></td></tr>
        <tr><td class="k">Licensee</td><td>${esc(d.owner)}</td></tr>
        <tr><td class="k">Vehicle type</td><td>${esc(d.vclass)}</td></tr>
        <tr><td class="k">Make / Model</td><td>${esc(d.make)} ${esc(d.model)}</td></tr>
        <tr><td class="k">Gross vehicle mass</td><td>${esc(d.gvm)}</td></tr>
        <tr><td class="k">Licence period</td><td>${esc(d.term)}</td></tr>
        <tr><td class="k">Valid from</td><td>${fmt(d.issued)}</td></tr>
        <tr><td class="k">Expiry date</td><td><b>${fmt(d.expires)}</b></td></tr>
        <tr><td class="k">Licence fee</td><td>USD ${esc(d.amount)}</td></tr>
        <tr><td class="k">Payment</td><td>EcoCash / bank transfer · Txn ${esc(d.txn)}</td></tr>
      </table>
      <div style="position:relative;width:200px;height:200px;border-radius:50%;border:5px solid #1e5e2a;background:radial-gradient(circle,#fffbe6 55%,#e9f3d9);
          display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:11px;line-height:1.45;color:#1d2433">
        <div style="font-weight:700;color:#1e5e2a;letter-spacing:1px">ZINARA</div>
        <div class="muted">VEHICLE LICENCE</div>
        <div style="font-size:20px;font-weight:700;letter-spacing:2px;margin:4px 0">${esc(d.plate)}</div>
        <div>Expires</div><div style="font-size:15px;font-weight:700">${fmt(d.expires)}</div>
        <div class="muted" style="margin-top:4px">Disc ${esc(d.disc)}</div>
      </div>
    </div>
    <p class="muted" style="margin-top:14px">The licence disc must be displayed on the windscreen of the vehicle at all times.</p>`,
    { color: "#1e5e2a", stamp: "ZINARA<br>LICENCE<br>PAID" }
  );

/** Commercial motor insurance policy schedule (PDF) — fictional insurer. */
T.insurance = (d) =>
  page(
    "Commercial Motor Policy — Schedule & Cover Note",
    { name: "Msasa Mutual Insurance Co.", line: "14 Kenneth Kaunda Avenue, Harare · Licensed short-term insurer (specimen)", right: `Policy No. <b>${esc(d.ref)}</b><br>Issued: ${fmt(d.issued)}` },
    `<table class="kv">
      <tr><td class="k">Insured</td><td>${esc(d.owner)}</td></tr>
      <tr><td class="k">Address</td><td>${esc(d.address)}</td></tr>
      <tr><td class="k">Registration mark</td><td><b>${esc(d.plate)}</b></td></tr>
      <tr><td class="k">Make / Model / Year</td><td>${esc(d.make)} ${esc(d.model)} · ${esc(d.year)}</td></tr>
      <tr><td class="k">Chassis / Engine</td><td style="font-family:'DejaVu Sans Mono',monospace">${esc(d.chassis)} / ${esc(d.engine)}</td></tr>
      <tr><td class="k">Period of insurance</td><td>${fmt(d.issued)} 00:00 to <b>${fmt(d.expires)} midnight</b></td></tr>
      <tr><td class="k">Sum insured</td><td>USD ${esc(d.idv)}</td></tr>
      <tr><td class="k">Cover</td><td>Comprehensive — own damage, third-party liability, goods in transit USD 20,000, passenger liability</td></tr>
      <tr><td class="k">Annual premium</td><td>USD ${esc(d.premium)} (incl. stamp duty & government levy)</td></tr>
      <tr><td class="k">Excess</td><td>10% of claim, minimum USD 250</td></tr>
    </table>
    <p class="muted" style="margin-top:14px">Use only for social, domestic and business purposes including the carriage of goods for hire or reward within Zimbabwe and SADC.</p>`,
    { color: "#0d5c63", stamp: "MSASA<br>MUTUAL<br>INSURANCE" }
  );

/** Certificate of fitness (PDF) — "Roadworthy / fitness", VID. */
T.fitness = (d) =>
  page(
    "Certificate of Fitness",
    { name: "Vehicle Inspectorate Department", line: `Ministry of Transport · ${d.vid}`, right: `Certificate No. <b>${esc(d.ref)}</b>` },
    `<table class="kv">
      <tr><td class="k">Registration mark</td><td><b>${esc(d.plate)}</b></td></tr>
      <tr><td class="k">Owner</td><td>${esc(d.owner)}</td></tr>
      <tr><td class="k">Make / Model</td><td>${esc(d.make)} ${esc(d.model)}</td></tr>
      <tr><td class="k">Vehicle type</td><td>${esc(d.vclass)}</td></tr>
      <tr><td class="k">Date of inspection</td><td>${fmt(d.issued)}</td></tr>
      <tr><td class="k">Result</td><td><b style="color:#11803d">PASSED — brakes, lights, steering, tyres, suspension, body</b></td></tr>
      <tr><td class="k">Valid until</td><td><b>${fmt(d.expires)}</b></td></tr>
    </table>`,
    { color: "#5a3e8f", stamp: "VID<br>BELVEDERE<br>HARARE" }
  );

/** Plant operator certificate of competency (PDF). */
T.competency = (d) =>
  page(
    "Certificate of Competency — Plant & Earthmoving Equipment Operator",
    { name: "Workington Plant Operator Training Centre", line: "22 Coventry Road, Workington, Harare · Specimen layout", right: `Certificate No. <b>${esc(d.ref)}</b>` },
    `<p style="font-size:15px;line-height:1.7">This is to certify that <b>${esc(d.holder)}</b> has completed 120 hours of practical and theory
      training on <b>front-end loader, TLB and excavator</b> operation and has been assessed as <b>competent</b>.</p>
    <table class="kv"><tr><td class="k">Date of assessment</td><td>${fmt(d.issued)}</td></tr><tr><td class="k">Valid until</td><td><b>${fmt(d.expires)}</b></td></tr></table>`,
    { color: "#a1471a", stamp: "WPOTC<br>HARARE" }
  );

/** Medical fitness certificate for drivers (JPG) — fictional Harare clinic. */
T.medical = (d) => ({
  size: { width: 794, height: 1000 },
  html: `<div style="position:relative;width:794px;height:1000px;padding:44px 52px;background:#fffdf8">
    <div style="text-align:center;border-bottom:2px solid #8a1c1c;padding-bottom:10px">
      <div style="font-size:22px;font-weight:700;color:#8a1c1c">Avondale Medical Centre</div>
      <div class="muted">Dr. Rutendo Moyo, MBChB · 7 King George Road, Avondale, Harare · MDPCZ Reg. No. 00XX1 (specimen)</div>
    </div>
    <h2 style="text-align:center;font-size:18px;margin:20px 0 4px">MEDICAL CERTIFICATE OF FITNESS TO DRIVE</h2>
    <div class="muted" style="text-align:center;margin-bottom:18px">(For drivers of heavy, public service and commercial vehicles)</div>
    <div style="display:flex;gap:22px">
      <img src="${d.face}" style="width:130px;height:160px;object-fit:cover;border:1px solid #999">
      <table class="kv" style="font-size:14px">
        <tr><td class="k">Name</td><td>${esc(d.holder)}</td></tr>
        <tr><td class="k">Age / Sex</td><td>${esc(d.age)} / Male</td></tr>
        <tr><td class="k">Vision (with/without glasses)</td><td>6/6 both eyes · colour vision normal</td></tr>
        <tr><td class="k">Hearing</td><td>Normal</td></tr>
        <tr><td class="k">Blood pressure</td><td>124/80 mmHg</td></tr>
        <tr><td class="k">Date of examination</td><td>${fmt(d.issued)}</td></tr>
        <tr><td class="k">Valid until</td><td><b>${fmt(d.expires)}</b></td></tr>
      </table>
    </div>
    <p style="font-size:14px;line-height:1.8;margin-top:20px">I certify that I have personally examined the above-named person and that, in my
      opinion, he is medically fit to drive heavy and commercial vehicles.</p>
    <div style="display:flex;justify-content:flex-end;margin-top:40px"><div style="text-align:center">${SIG(8)}<div class="muted">Signature of the medical practitioner</div></div></div>
    <div class="stamp" style="left:80px;bottom:90px">AVONDALE<br>MEDICAL<br>CENTRE</div>
    ${WATERMARK}
  </div>`,
});

/** Taxi / operator's permit (JPG). */
T.permit = (d) => ({
  size: { width: 860, height: 600 },
  html: `<div style="position:relative;width:860px;height:600px;padding:30px 36px;background:#fdfcf4;border:8px double #2c6e49">
    <div style="text-align:center;font-size:24px;font-weight:700;color:#2c6e49">OPERATOR'S PERMIT — TAXI</div>
    <div class="muted" style="text-align:center;margin-bottom:16px">Harare Metropolitan Route Authority · Permit No. ${esc(d.ref)}</div>
    <table class="kv" style="font-size:14px">
      <tr><td class="k">Permit holder</td><td>${esc(d.owner)}</td></tr>
      <tr><td class="k">Vehicle</td><td>${esc(d.plate)} · ${esc(d.make)} ${esc(d.model)} (4+1 seats)</td></tr>
      <tr><td class="k">Area of operation</td><td>Harare Metropolitan (Harare, Chitungwiza, Epworth, Ruwa, Norton)</td></tr>
      <tr><td class="k">Rank / base</td><td>Copacabana rank, Harare CBD</td></tr>
      <tr><td class="k">Valid from</td><td>${fmt(d.issued)}</td></tr>
      <tr><td class="k">Valid until</td><td><b>${fmt(d.expires)}</b></td></tr>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-top:26px"><div style="text-align:center">${SIG(4)}<div class="muted">Permits Officer</div></div></div>
    <div class="stamp" style="left:70px;bottom:40px">ROUTE<br>AUTHORITY<br>HARARE</div>
    ${WATERMARK}
  </div>`,
});

/** Exhaust emissions test slip (JPG) — the app's "pollution" type (Zimbabwe has no PUC). */
T.emissions = (d) => ({
  size: { width: 700, height: 480 },
  html: `<div style="position:relative;width:700px;height:480px;padding:24px 30px;background:#fff;border:2px solid #333">
    <div style="font-size:20px;font-weight:700">EXHAUST EMISSIONS TEST SLIP</div>
    <div class="muted">Graniteside Vehicle Testing Station, Harare · Slip No. ${esc(d.ref)}</div>
    <table class="kv" style="margin-top:14px"><tr><td class="k">Registration mark</td><td>${esc(d.plate)}</td></tr>
      <tr><td class="k">Make / Model</td><td>${esc(d.make)} ${esc(d.model)} · Diesel</td></tr>
      <tr><td class="k">Test date</td><td>${fmt(d.issued)}</td></tr><tr><td class="k">Retest due</td><td><b>${fmt(d.expires)}</b></td></tr>
      <tr><td class="k">Smoke opacity (k)</td><td>1.18 m⁻¹ (limit 2.5) — PASS</td></tr></table>
    <div class="muted" style="margin-top:12px">Tested in line with EMA emission guidelines (specimen layout).</div>
    ${WATERMARK}
  </div>`,
});

/** Certificate of incorporation (PDF) — "Business registration certificate". */
T.business_registration = (d) =>
  page(
    "Certificate of Incorporation",
    { name: "Registrar of Companies, Zimbabwe", line: "Companies and Other Business Entities Act [Chapter 24:31] · Specimen layout", right: `Company No. <b>${esc(d.ref)}</b><br>Date: ${fmt(d.issued)}` },
    `<p style="font-size:15px;line-height:1.8">I hereby certify that <b>${esc(d.company)} (Private) Limited</b> is this day incorporated
      under the Companies and Other Business Entities Act, and that the company is <b>limited by shares</b>.</p>
    <table class="kv">
      <tr><td class="k">Company name</td><td><b>${esc(d.company)} (Private) Limited</b></td></tr>
      <tr><td class="k">Director</td><td>${esc(d.owner)}</td></tr>
      <tr><td class="k">Registered office</td><td>${esc(d.address)}</td></tr>
      <tr><td class="k">Principal business</td><td>Road haulage (goods for hire or reward), hire of earth-moving & agricultural equipment</td></tr>
      <tr><td class="k">Date of incorporation</td><td>${fmt(d.started)}</td></tr>
    </table>`,
    { color: "#5b4a1c", stamp: "REGISTRAR<br>OF COMPANIES<br>HARARE" }
  );

/** ZIMRA tax clearance (ITF 263) (PDF) — optional business document. */
T.tax = (d) =>
  page(
    "Tax Clearance Certificate (ITF 263)",
    { name: "Zimbabwe Revenue Authority", line: "Income Tax Act [Chapter 23:06] · Harare Region · Specimen layout", right: `BP No. <b>${esc(d.ref)}</b>` },
    `<p style="font-size:14px;line-height:1.7">This certifies that the taxpayer named below has complied with the requirements of the Act and is
      cleared for purposes of section 80 (withholding tax on contracts).</p>
    <table class="kv">
      <tr><td class="k">Taxpayer name</td><td><b>${esc(d.company)}</b></td></tr>
      <tr><td class="k">Trading as / director</td><td>${esc(d.owner)}</td></tr>
      <tr><td class="k">Address</td><td>${esc(d.address)}</td></tr>
      <tr><td class="k">Business partner (BP) No.</td><td style="font-family:'DejaVu Sans Mono',monospace">${esc(d.ref)}</td></tr>
      <tr><td class="k">Registered for tax since</td><td>${fmt(d.started)}</td></tr>
      <tr><td class="k">Valid from</td><td>01/01/${new Date().getFullYear()}</td></tr>
      <tr><td class="k">Valid until</td><td><b>31/12/${new Date().getFullYear()}</b></td></tr>
    </table>`,
    { color: "#0f4c81", stamp: "ZIMRA<br>HARARE<br>REGION" }
  );

// ── Rendering ────────────────────────────────────────────────────────────
let browser = null;
async function getBrowser() {
  if (!browser) browser = await chromium.launch();
  return browser;
}
async function close() {
  if (browser) await browser.close().catch(() => {});
  browser = null;
}

/** Turn a flat render into a "phone photo" of the paper on a desk. */
async function asPhoto(png, out) {
  const meta = await sharp(png).metadata();
  const pad = Math.round(Math.max(meta.width, meta.height) * 0.09);
  const W = meta.width + pad * 2;
  const H = meta.height + pad * 2;
  const desk = Buffer.from(
    `<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d6e52"/><stop offset=".55" stop-color="#a5835f"/><stop offset="1" stop-color="#7a5c43"/></linearGradient>
     <radialGradient id="l" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient></defs>
     <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#l)"/></svg>`
  );
  const shadow = await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.45 } } }).png().toBuffer();
  const angle = -1.6 + Math.random() * 3.2;
  const paper = await sharp(png).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const sh = await sharp(shadow).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).blur(14).png().toBuffer();
  const pm = await sharp(paper).metadata();
  const left = Math.round((W - pm.width) / 2);
  const top = Math.round((H - pm.height) / 2);
  await sharp(desk)
    .composite([{ input: sh, left: left + 10, top: top + 14 }, { input: paper, left, top }])
    .modulate({ brightness: 0.98, saturation: 0.92 })
    .resize({ width: Math.min(W, 1400) })
    .jpeg({ quality: 84 })
    .toFile(out);
}

async function render(tpl, data, ext) {
  const { html, size, pdf } = T[tpl](data);
  const key = crypto.createHash("sha1").update(tpl + ext + html).digest("hex").slice(0, 12);
  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, `${data.fileName || tpl}-${key}.${ext}`);
  if (fs.existsSync(out)) return out;
  const b = await getBrowser();
  const pg = await b.newPage({ viewport: size || { width: 794, height: 1123 }, deviceScaleFactor: 1.5 });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${html}</body></html>`);
  if (ext === "pdf") {
    await pg.pdf({ path: out, format: "A4", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
  } else {
    const png = await pg.locator("body > div").first().screenshot({ type: "png" });
    await asPhoto(png, out);
  }
  await pg.close();
  return out;
}

const ADDRESSES = [
  "14 Beverley Road, Msasa, Harare",
  "Stand 3307, Southerton Industrial Area, Harare",
  "41 Coventry Road, Workington, Harare",
  "9 Dagenham Road, Graniteside, Harare",
  "112 Lomagundi Road, Mabelreign, Harare",
  "27 Glenara Avenue, Hatfield, Harare",
  "6 Fifth Street, Eastlea, Harare",
  "House 4521, Unit L, Seke, Chitungwiza",
  "Stand 812, Ruwa Industrial Park, Ruwa",
  "18 Galloway Road, Norton",
];
const FIRST = ["Tendai", "Kudakwashe", "Tafadzwa", "Blessing", "Tinashe", "Simbarashe"];

/**
 * File for one of the app's document types.
 *   type: rego | insurance | ownership | roadworthy | taxi_permit | pollution | licence | medical | competency | other
 *   info: { holder, owner, plate, make, model, year, kind, expires (Date), face (path), number }
 */
async function docFor(type, info = {}) {
  const n = Math.abs([...(info.plate || info.holder || type)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  const ref = (p) => `${p}${String(n).slice(-7).padStart(7, "0")}`;
  const expires = info.expires || addMonths(6);
  const issued = addMonths(-6, expires) < new Date() ? addMonths(-6, expires) : addMonths(-1);
  const owner = info.owner || info.holder || "Tatenda Mutasa";
  const address = ADDRESSES[n % ADDRESSES.length];
  const kind = info.kind;
  const v = {
    plate: fmtPlate(info.plate || "AEZ4821"),
    make: info.make || "Hino",
    model: info.model || "500 Ranger",
    year: info.year || "2019",
    vclass: kind === "cab" ? "Light passenger vehicle · Sedan (taxi)" : kind === "equipment" ? "Construction / earthmoving equipment" : "Heavy goods vehicle · Rigid truck",
    gvm: kind === "cab" ? "1,600 kg" : kind === "equipment" ? "8,200 kg" : "14,000 kg",
    chassis: `JHD${String(n).padStart(9, "0").slice(0, 9)}ZW${String(n).slice(-5).padStart(5, "0")}`,
    engine: `J08E${String(n * 7).slice(-6).padStart(6, "0")}${String(n).slice(-3).padStart(3, "0")}`,
  };
  const face = info.face ? dataUri(info.face) : dataUri(path.join(REAL, "face-1.jpg"));
  const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const digits = (k) => String(n * k).slice(-6).padStart(6, "0");
  // Zimbabwe national ID: "63-123456 A 42" (district - serial check-letter district)
  const nid = (k = 1) => `${63 + (n % 20)}-${digits(k)} ${"ABCDEFGHJKLMNPQRSTVWXYZ"[n % 23]} ${String(10 + (n % 80)).padStart(2, "0")}`;
  const splitName = (full) => {
    const parts = String(full).trim().split(/\s+/);
    return parts.length > 1 ? { first: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] } : { first: FIRST[n % FIRST.length], surname: parts[0] };
  };
  const card = (fileName, holder, extra) => render("dl", {
    fileName, ...splitName(holder), father: info.father || "", nid: info.nid || nid(extra.k), sex: info.sex || "M",
    dob: info.dob || extra.dob, issued: extra.issued, expires: extra.expires, address, face, number: info.number || extra.number, classes: extra.classes,
  }, "jpg");
  switch (type) {
    case "rego":
      return render("zinara", { ...v, fileName: `zinara-vehicle-licence-${slug(v.plate)}`, owner, ref: ref("ZNR"), txn: ref("EC"), disc: ref("D"), issued, expires,
        term: "Four months (term licence)", amount: kind === "cab" ? "40.00" : kind === "equipment" ? "90.00" : "150.00" }, "pdf");
    case "insurance":
      return render("insurance", { ...v, fileName: `insurance-policy-${slug(v.plate)}`, owner, address, ref: ref("MMI/CM/"), issued, expires, idv: "48,500.00", premium: "1,940.00" }, "pdf");
    case "ownership":
      return render("regbook", { ...v, fileName: `registration-book-${slug(v.plate)}`, owner, address, cvr: CVR, ref: ref("RB"), registered: addMonths(-30) }, "jpg");
    case "roadworthy":
      return render("fitness", { ...v, fileName: `certificate-of-fitness-${slug(v.plate)}`, owner, vid: VID, ref: ref("COF/"), issued, expires }, "pdf");
    case "taxi_permit":
      return render("permit", { ...v, fileName: `taxi-permit-${slug(v.plate)}`, owner, ref: ref("HRA/OP/"), issued, expires }, "jpg");
    case "pollution":
      return render("emissions", { ...v, fileName: `emissions-test-${slug(v.plate)}`, ref: ref("EMT"), issued, expires }, "jpg");
    case "licence":
      return card(`drivers-licence-${slug(info.holder)}`, info.holder || "Farai Chikore", {
        k: 3, dob: "14/08/1988", issued: addMonths(-40), expires, number: ref("DL"),
        classes: kind === "equipment" ? ["Class 2", "Class 4"] : kind === "cab" ? ["Class 4", "Class 5"] : ["Class 1", "Class 2", "Class 4"],
      });
    case "medical":
      return render("medical", { fileName: `medical-certificate-${slug(info.holder)}`, holder: info.holder || "Farai Chikore", age: info.age || "36", issued: addMonths(-1), expires, face }, "jpg");
    case "business_registration":
      return render("business_registration", { fileName: `certificate-of-incorporation-${slug(info.company)}`, company: info.company || owner, owner: info.holder || owner, address,
        ref: `${String(n).slice(-4).padStart(4, "0")}/${addMonths(-27).getFullYear()}`, issued: addMonths(-26), started: addMonths(-27) }, "pdf");
    case "tax":
      return render("tax", { fileName: `tax-clearance-${slug(info.company)}`, company: info.company || owner, owner: info.holder || owner, address, ref: `2000${String(n).slice(-6).padStart(6, "0")}`, started: addMonths(-24) }, "pdf");
    case "owner_id":
      // Owner ID = the owner's driver's licence card
      return card(`owner-id-${slug(info.holder)}`, info.holder || owner, {
        k: 5, dob: "02/03/1979", issued: addMonths(-60), expires: addMonths(60), number: ref("DL"), classes: ["Class 2", "Class 4"],
      });
    case "competency":
      return render("competency", { fileName: `competency-${slug(info.holder)}`, holder: info.holder || "Farai Chikore", ref: ref("WPOTC/PO/"), issued: addMonths(-3), expires }, "pdf");
    default:
      return render("insurance", { ...v, fileName: `document-${slug(v.plate)}`, owner, address, ref: ref("DOC"), issued, expires, idv: "—", premium: "—" }, "pdf");
  }
}

/** Real vehicle photo paths for a cast unit (C.unit(...).photos). */
const photos = (names) => names.map((n) => path.join(REAL, n));
/** AI face photo #i (1–6) for operators. */
const face = (i = 1) => path.join(REAL, `face-${((i - 1) % 6) + 1}.jpg`);

module.exports = { docFor, photos, face, close, REAL, OUT, addMonths };
