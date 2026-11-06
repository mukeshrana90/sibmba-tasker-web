/* Fictional documents for the videos, each watermarked SPECIMEN. PDF, or JPG for card-style IDs. */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../../../..");
const { chromium } = require(path.join(ROOT, "sibmba-tasker-web/node_modules/playwright"));
const OUT = process.env.ZW_DOCS_DIR || path.join(__dirname, "gen");
fs.mkdirSync(OUT, { recursive: true });
const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const TITLES = {
  rego: "Road Licence (ZINARA)", insurance: "Motor Insurance Certificate", ownership: "Vehicle Registration Book", roadworthy: "Certificate of Fitness",
  licence: "Driver's Licence", medical: "Medical Fitness Certificate", business_registration: "Certificate of Incorporation", owner_id: "National ID", tax: "Tax Clearance Certificate", equipment: "Plant Inspection Certificate",
};
let browser;
async function doc(type, fields, file) {
  const out = path.join(OUT, file);
  if (fs.existsSync(out)) return out;
  browser = browser || await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 794, height: 560 } });
  const rows = Object.entries(fields).map(([k, v]) => `<tr><td class="k">${k}</td><td>${v}</td></tr>`).join("");
  await page.setContent(`<html><style>body{margin:0;font-family:"DejaVu Sans",Arial;color:#1d2433;background:#fff}.p{position:relative;padding:36px;height:560px;box-sizing:border-box;border:3px double #0f7a3f}
    h1{font-size:25px;margin:0 0 4px;color:#0b3d2a}.s{color:#667;font-size:12px;margin-bottom:20px}table{border-collapse:collapse;width:100%;font-size:14px}td{border:1px solid #c4cbd6;padding:9px}.k{background:#f2f6f4;width:34%;font-weight:600}
    .w{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}.w span{transform:rotate(-24deg);font-size:50px;font-weight:700;color:rgba(200,30,30,.14);letter-spacing:5px;white-space:nowrap}</style>
    <div class="p"><h1>${TITLES[type]}</h1><div class="s">Republic of Zimbabwe layout · sample for a software demonstration</div><table>${rows}</table><div class="w"><span>SPECIMEN · DEMO</span></div></div></html>`);
  if (file.endsWith(".pdf")) await page.pdf({ path: out, width: "794px", height: "560px", printBackground: true });
  else await page.screenshot({ path: out, type: "jpeg", quality: 85 });
  await page.close();
  return out;
}
const close = async () => { if (browser) await browser.close(); browser = null; };
module.exports = { doc, close, fmt };
