/* Shared harness for the logistics browser E2E. */
const path = require("path");
const fs = require("fs");
const ROOT = path.resolve(__dirname, "../../..");
const BACKEND = path.join(ROOT, "sibmba-tasker-backend");
require(path.join(BACKEND, "node_modules/dotenv")).config({ path: path.join(BACKEND, ".env") });
const mongoose = require(path.join(BACKEND, "node_modules/mongoose"));
const JWT = require(path.join(BACKEND, "node_modules/jsonwebtoken"));
const { chromium } = require(path.join(ROOT, "sibmba-tasker-web/node_modules/playwright"));

const WEB = process.env.E2E_WEB || "https://localhost:3001";
const API = process.env.E2E_API || "http://127.0.0.1:4099";
const SHOTS = path.join(__dirname, "shots");
const STATE = path.join(__dirname, "state.json");
// Realistic cast (cast.js): Zimbabwean names, Harare, +263, @yopmail.com, real photos / documents (docs.js)
const castFor = require("./cast");
const DOCS = require("./docs");
const HOME = { latitude: castFor.PLACES.home.latitude, longitude: castFor.PLACES.home.longitude }; // Harare CBD
const HARARE = HOME; // old name kept for stages that still import it

const results = [];
let section = "";
// Watch mode (E2E_HEADED=1): real Chrome window, slowed down, with a live status banner.
const HEADED = !!process.env.E2E_HEADED;
const pages = [];
const stage = (process.argv[1] || "").split("/").pop().replace(/\.js$/, "");
let lastCheck = "";
// Outbox viewer (outbox-viewer.js) timeline: which stage / section / check was running when a message went out
const PROGRESS = path.join(__dirname, "progress.jsonl");
function progress(kind, text, ok) {
  try { fs.appendFileSync(PROGRESS, JSON.stringify({ ts: new Date().toISOString(), stage, kind, text, ok }) + "\n"); } catch {}
}
function paintBanner() {
  if (!HEADED) return;
  const tally = `${results.filter((r) => r.ok).length} pass · ${results.filter((r) => !r.ok).length} fail`;
  for (const { page, name } of pages) {
    if (page.isClosed()) continue;
    page.evaluate((d) => window.__e2eBanner && window.__e2eBanner(d), { stage, actor: name, section, lastCheck, tally }).catch(() => {});
  }
}
function sec(name) {
  section = name;
  progress("section", name);
  console.log(`\n▶ ${name}`);
  paintBanner();
}
function check(ok, label, extra) {
  results.push({ section, ok: !!ok, label, extra: ok ? undefined : extra });
  lastCheck = `${ok ? "✔" : "✘"} ${label}`;
  progress("check", label, !!ok);
  paintBanner();
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && extra !== undefined ? "  → " + String(typeof extra === "string" ? extra : JSON.stringify(extra)).slice(0, 400) : ""}`);
  return !!ok;
}
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { return {}; }
}
function saveState(s) { fs.writeFileSync(STATE, JSON.stringify(s, null, 2)); }

/**
 * Chromium hands intercepted requests over WITHOUT the bytes of attached files,
 * so uploads can't go through route.fetch (the API got empty files), and
 * route.continue can't send a request with a body to another origin. So the
 * page itself (uploadInitScript) sends FormData requests to this HTTPS relay,
 * which pipes them to the test API untouched (the API sends the CORS headers).
 */
let relayPort;
async function uploadRelay() {
  if (relayPort) return relayPort;
  const https = require("https");
  const http = require("http");
  const pems = require(path.join(ROOT, "sibmba-tasker-web/node_modules/selfsigned")).generate([{ name: "commonName", value: "localhost" }], { days: 1, keySize: 2048 });
  const target = new URL(API);
  const server = https.createServer({ key: pems.private, cert: pems.cert }, (req, res) => {
    const up = http.request({ host: target.hostname, port: target.port, path: req.url, method: req.method, headers: { ...req.headers, host: target.host } }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    up.on("error", (e) => { res.writeHead(502); res.end(e.message); });
    req.pipe(up);
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  server.unref();
  relayPort = server.address().port;
  return relayPort;
}

/**
 * Runs in the page: XHR (axios) and fetch calls to /api with a FormData body
 * go to the upload relay instead of the same-origin /api (see uploadRelay).
 */
function uploadInitScript(relay) {
  const toRelay = (u) => {
    const url = new URL(u, window.location.href);
    return url.origin === window.location.origin && url.pathname.startsWith("/api/") ? relay + url.pathname + url.search : null;
  };
  const X = XMLHttpRequest.prototype;
  const open = X.open, setHeader = X.setRequestHeader, send = X.send;
  X.open = function (method, url, ...rest) { this.__e2e = { method, url, rest, headers: [] }; };
  X.setRequestHeader = function (k, v) { if (this.__e2e && !this.__e2eOpen) this.__e2e.headers.push([k, v]); else setHeader.call(this, k, v); };
  X.send = function (body) {
    const q = this.__e2e;
    if (q && !this.__e2eOpen) {
      const relayed = body instanceof FormData ? toRelay(q.url) : null;
      open.call(this, q.method, relayed || q.url, ...q.rest);
      this.__e2eOpen = true;
      q.headers.forEach(([k, v]) => setHeader.call(this, k, v));
    }
    return send.call(this, body);
  };
  const f = window.fetch;
  window.fetch = function (input, init) {
    const relayed = init && init.body instanceof FormData && typeof input === "string" ? toRelay(input) : null;
    return f.call(this, relayed || input, init);
  };
}

const CAMERA_ARGS = ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"];
let browser;
async function getBrowser() {
  if (!browser) browser = await chromium.launch(HEADED
    ? { headless: false, channel: "chrome", slowMo: Number(process.env.E2E_SLOWMO || 250), args: ["--ignore-certificate-errors", ...CAMERA_ARGS] }
    : { headless: true, args: ["--ignore-certificate-errors", ...CAMERA_ARGS] });
  return browser;
}

/**
 * v2.7.66 face photos are live camera only. The page's camera shows a test face (set by
 * addFacePhoto). window.__e2eCameraError = "NotFoundError" etc. makes it fail;
 * window.__e2eRealCamera = true uses Chrome's own fake camera device instead.
 */
function mockCameraScript() {
  if (!navigator.mediaDevices) return;
  const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (c) => {
    if (window.__e2eCameraError) throw new DOMException("mock camera failure", window.__e2eCameraError);
    if (window.__e2eRealCamera) return real(c);
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const x = canvas.getContext("2d");
    const img = new Image();
    if (window.__e2eFaceSrc) img.src = window.__e2eFaceSrc;
    const paint = () => {
      x.fillStyle = "#777";
      x.fillRect(0, 0, 640, 480);
      if (img.complete && img.naturalWidth) x.drawImage(img, 0, 0, 640, 480);
    };
    paint();
    setInterval(paint, 80);
    return canvas.captureStream(15);
  };
}

/** New isolated browser context for one actor; /api + /public go to the safe 4099 API. */
async function actor(name, { geo = HOME, mobile = false, viewport = null, scale = 1 } = {}) {
  const b = await getBrowser();
  const ctx = await b.newContext({
    ignoreHTTPSErrors: true,
    viewport: viewport || (mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }),
    deviceScaleFactor: scale,
    geolocation: geo,
    permissions: ["geolocation", "notifications", "camera"],
    // E2E_VIDEO=<dir>: record each actor's session as .webm
    ...(process.env.E2E_VIDEO ? { recordVideo: { dir: process.env.E2E_VIDEO, size: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 } } } : {}),
  });
  const errors = [];
  const apiFails = [];
  await ctx.addInitScript(uploadInitScript, `https://localhost:${await uploadRelay()}`);
  await ctx.addInitScript(mockCameraScript);
  await ctx.route(/^https:\/\/localhost:3001\/(api|public)\//, async (route) => {
    const url = route.request().url().replace("https://localhost:3001", API);
    try {
      const resp = await route.fetch({ url });
      await route.fulfill({ response: resp });
    } catch (e) {
      // Page closed / navigated while the request was in flight
      await route.abort().catch(() => {});
    }
  });
  // socket.io → keep it off the 4041 instance
  await ctx.route(/\/socket\.io\//, (r) => r.abort());
  if (HEADED) {
    // Banner lives in a closed shadow root on <html>, outside <body>: it never shows up in
    // body.innerText, can't be clicked, and doesn't affect layout/overflow checks.
    await ctx.addInitScript(() => {
      let host, box;
      window.__e2eBanner = (d) => {
        window.__e2eLast = d;
        if (!document.documentElement) return;
        if (!host || !host.isConnected) {
          host = document.createElement("e2e-banner");
          const root = host.attachShadow({ mode: "closed" });
          box = document.createElement("div");
          box.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;pointer-events:none;max-width:520px;font:12px/1.4 system-ui,sans-serif;background:rgba(17,24,39,.88);color:#fff;padding:8px 10px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.3)";
          root.appendChild(box);
          document.documentElement.appendChild(host);
        }
        const esc = (t) => String(t || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
        box.innerHTML = `<b style="color:#fbbf24">${esc(d.actor)}</b> · ${esc(d.stage)} · <span style="color:#93c5fd">${esc(d.tally)}</span><br>▶ ${esc(d.section)}<br><span style="color:${/^✘/.test(d.lastCheck) ? "#fca5a5" : "#86efac"}">${esc(d.lastCheck)}</span>`;
      };
      const again = () => window.__e2eLast && window.__e2eBanner(window.__e2eLast);
      document.addEventListener("DOMContentLoaded", again);
      // Visible cursor: a red dot follows Playwright's mouse and pulses on each click
      let dot;
      const ensureDot = () => {
        if (dot && dot.isConnected) return dot;
        const h = document.createElement("e2e-cursor");
        const r = h.attachShadow({ mode: "closed" });
        dot = document.createElement("div");
        dot.style.cssText = "position:fixed;left:-50px;top:-50px;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(220,38,38,.55);border:2px solid #fff;box-shadow:0 0 0 2px rgba(220,38,38,.8);z-index:2147483647;pointer-events:none;transition:transform .15s";
        r.appendChild(dot);
        (document.documentElement || document).appendChild(h);
        return dot;
      };
      const move = (e) => { if (!document.documentElement) return; const d = ensureDot(); d.style.left = `${e.clientX}px`; d.style.top = `${e.clientY}px`; };
      window.addEventListener("mousemove", move, true);
      window.addEventListener("mousedown", (e) => { move(e); const d = ensureDot(); d.style.transform = "scale(1.8)"; setTimeout(() => { d.style.transform = "scale(1)"; }, 220); }, true);
    });
  }
  const page = await ctx.newPage();
  pages.push({ page, name });
  page.on("load", () => paintBanner());
  page.on("pageerror", (e) => errors.push(`pageerror @${page.url().replace(WEB, "")}: ${e.message}`));
  page.on("console", async (m) => {
    if (m.type() === "error") {
      const t = m.text();
      if (/socket\.io|ERR_FAILED|favicon|maps\.googleapis|Google Maps|Failed to load resource|websocket|firebase|messaging|Push API in incognito/i.test(t)) return;
      const url = page.url().replace(WEB, "");
      let extra = "";
      try { extra = (await Promise.all(m.args().slice(1, 3).map((x) => x.jsonValue()))).map((v) => String(v).split("\n").slice(0, 3).join(" ")).join(" | "); } catch {}
      errors.push(`console @${url}: ${t.slice(0, 120)} ${extra.slice(0, 200)}`);
    }
  });
  page.on("response", (r) => {
    const u = r.url();
    if (/\/api\//.test(u) && r.status() >= 500) apiFails.push(`${r.status()} ${r.request().method()} ${u.replace(/^https?:\/\/[^/]+/, "")}`);
  });
  return { name, ctx, page, errors, apiFails };
}

async function shot(a, label) {
  const f = path.join(SHOTS, `${a.name}-${label}.png`.replace(/[^\w.-]+/g, "_"));
  await a.page.screenshot({ path: f, fullPage: false }).catch(() => {});
  return f;
}

/** Seed auth like the real login does. */
async function seedAuth(a, { token, user }) {
  await a.page.goto(`${WEB}/login`, { waitUntil: "domcontentloaded" });
  await a.page.evaluate(({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userId", user._id);
    localStorage.setItem("role", String(user.role));
    if (user.owner_id) localStorage.setItem("owner_id", user.owner_id);
  }, { token, user });
}

async function goto(a, p, waitSel) {
  await a.page.goto(`${WEB}${p}`, { waitUntil: "domcontentloaded" });
  await a.page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  if (waitSel) await a.page.waitForSelector(waitSel, { timeout: 15000 });
}

const tokenFor = (id) => JWT.sign({ userId: String(id) }, process.env.JWT_SECRET, { expiresIn: "1d" });

async function api(method, p, { token, body } = {}) {
  const res = await fetch(`${API}/api${p}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  try { return JSON.parse(t); } catch { return { raw: t, http: res.status }; }
}

// doc 12 (v2.7.58): new units need 2 photos and new operators a face photo — real photos (fixtures/real)
const UNIT_PHOTOS = {
  truck: ["zw/hino-1.jpg", "zw/hino-2.jpg"],
  truck2: ["zw/seddon-1.jpg", "zw/seddon-2.jpg"],
  truck3: ["zw/tipper-1.jpg", "zw/tipper-2.jpg"],
  tractor: ["zw/mf-tractor-1.jpg", "zw/mf-tractor-2.jpg"],
  equipment: ["zw/cat-1.jpg", "zw/cat-2.jpg"],
  jcb: ["zw/jcb3cx-1.jpg", "zw/jcb3cx-2.jpg"],
  cab: ["zw/fit-taxi-1.jpg", "zw/fit-taxi-2.jpg"],
};
/** Two real photos for a unit kind (truck | truck2 | truck3 | tractor | jcb | cab). */
async function photoFixtures(kind = "truck") {
  if (Array.isArray(kind)) return DOCS.photos(kind); // a cast unit's own photos: C.unit(...).photos
  if (kind && typeof kind === "object" && kind.photos) return DOCS.photos(kind.photos);
  return DOCS.photos(UNIT_PHOTOS[kind] || UNIT_PHOTOS.truck);
}

/** Add-unit / edit-unit form: attach the 2 required photos (kind name, photo list or a cast unit). */
async function addUnitPhotos(page, form = "form.log-fleet-form", kind = "truck") {
  await page.locator(`${form} .log-photo-slot--add input[type=file]`).first().setInputFiles(await photoFixtures(kind));
}

/** Operator invite form: attach the required face photo (AI face #i). */
async function addFacePhoto(page, i = 1) {
  const src = `data:image/jpeg;base64,${fs.readFileSync(DOCS.face(i)).toString("base64")}`;
  await page.evaluate((s) => { window.__e2eFaceSrc = s; }, src);
  await page.locator('[data-field="profile_photo"] [data-testid="face-photo-take"]').first().click();
  await page.locator('[data-testid="face-camera-capture"]:not([disabled])').click({ timeout: 15000 });
  await page.locator('[data-testid="face-camera-use"]').click();
  await page.locator('[data-testid="face-camera-use"]').waitFor({ state: "detached", timeout: 10000 });
}

/**
 * 12 Nov 2026 (v2.7.68): an invited operator's first screen (/logistics/driver/setup) needs a live
 * selfie and their driving / plant licence. Fills it through the UI and saves.
 */
async function completeOperatorSetup(page, { holder = "Operator", face = 2, kind = "vehicle", monthsAhead = 8, licence = true } = {}) {
  const root = page.locator('[data-testid="operator-setup"]');
  await root.waitFor({ timeout: 20000 });
  const src = `data:image/jpeg;base64,${fs.readFileSync(DOCS.face(face)).toString("base64")}`;
  await page.evaluate((s) => { window.__e2eFaceSrc = s; }, src);
  await root.locator('[data-testid="face-photo-take"]').first().click();
  await page.locator('[data-testid="face-camera-capture"]:not([disabled])').click({ timeout: 15000 });
  await page.locator('[data-testid="face-camera-use"]').click();
  await page.locator('[data-testid="face-camera-use"]').waitFor({ state: "detached", timeout: 10000 });
  // licence: false — the owner already sent it with the invite, so only the selfie is due
  if (licence) {
    const file = await DOCS.docFor("licence", { holder, face: DOCS.face(face), expires: DOCS.addMonths(monthsAhead), kind });
    await root.locator('.log-doc-row__add input[type="file"]').first().setInputFiles(file);
    await pickDate(page, root.locator(".log-doc-row__expiry input").first(), monthsAhead);
  }
  await root.locator('[data-testid="operator-setup-save"]').click();
  await page.waitForURL((u) => !/\/setup/.test(new URL(u).pathname), { timeout: 20000 });
}

/** Cast for the current run (state.json RUN). */
function cast(RUN) {
  return castFor(RUN || loadState().RUN || "run");
}

/**
 * Real-looking document file for an app document type (rego | insurance | ownership | roadworthy |
 * taxi_permit | pollution | licence | medical | competency). `info` = { holder, owner, plate, make,
 * model, year, kind, face, expires }.
 */
async function docFile(type, info = {}) {
  return DOCS.docFor(type, info);
}

/**
 * Type a phone number into a react-international-phone field: picks the country
 * from the field's own dropdown (default is Zimbabwe), then types the national
 * number, e.g. typePhone(loc, "+263", "772415836").
 */
const CC_ISO = { "+91": "in", "+263": "zw", "+27": "za", "+44": "gb", "+1": "us" };
async function typePhone(locator, cc, number) {
  const iso = CC_ISO[cc];
  const box = locator.locator("xpath=ancestor::*[contains(@class,'react-international-phone-input-container')][1]");
  if (iso && (await box.count())) {
    await box.locator(".react-international-phone-country-selector-button").first().click();
    // the list of THIS field (a page can hold several phone inputs, e.g. /edit-profile)
    const sel = `.react-international-phone-country-selector-dropdown li[data-country="${iso}"]`;
    const item = (await box.locator(sel).count()) ? box.locator(sel).first() : box.page().locator(sel).first();
    await item.scrollIntoViewIfNeeded().catch(() => {});
    await item.click();
  }
  await locator.click();
  await locator.press("End");
  // drop anything typed after the dial code, then the national number
  const v = await locator.inputValue();
  const keep = (v.match(/^\+\d+\s?/) || [""])[0];
  for (let i = v.length; i > keep.length; i--) await locator.press("Backspace");
  await locator.pressSequentially(String(number), { delay: 15 });
}

/** Multipart API call; `files` = [[field, path], …]. Arrays/objects in `body` are sent as JSON strings. */
async function apiForm(method, p, { token, body = {}, files = [] } = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null) continue;
    fd.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  for (const [field, file] of files) {
    const ext = path.extname(file).toLowerCase();
    const type = { ".pdf": "application/pdf", ".png": "image/png", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".heic": "image/heic" }[ext] || "image/jpeg";
    fd.append(field, new Blob([fs.readFileSync(file)], { type }), path.basename(file));
  }
  const res = await fetch(`${API}/api${p}`, { method, headers: token ? { authorization: token } : {}, body: fd });
  const t = await res.text();
  try { return JSON.parse(t); } catch { return { raw: t, http: res.status }; }
}

async function db() {
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.DB_URL);
  return mongoose.connection.db;
}

/** Admin JWT for the first admin in the DB (admin API calls from tests). */
async function adminToken() {
  const d = await db();
  const admin = await d.collection("admins").findOne({}, { projection: { _id: 1 } });
  if (!admin) throw new Error("no admin account in the DB");
  const JWT = require(require("path").resolve(__dirname, "../../../sibmba-tasker-backend/node_modules/jsonwebtoken"));
  return JWT.sign({ _id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: "1d" });
}

/**
 * v2.7.49: new logistics owners start "pending" until Simba admin approves the
 * company. Stages that need a working fleet approve their fresh owner through
 * the admin API (same path as the admin panel button).
 */
async function approveOwner(ownerId, status = "approved", reason = "", { withDocs = true } = {}) {
  // 29 Oct 2026: approval needs business documents — owners created straight in the DB
  // (or signed up without them) upload real-looking ones first, as the owner would
  if (status === "approved" && withDocs) {
    const d = await db();
    const o = await d.collection("users").findOne({ _id: new mongoose.Types.ObjectId(String(ownerId)) }, { projection: { full_name: 1, company_name: 1, logistics_business_documents: 1 } });
    const have = new Set((o?.logistics_business_documents || []).filter((x) => x.review?.status !== "rejected").map((x) => x.type));
    if (o && !(have.has("business_registration") && have.has("owner_id"))) {
      const f = await businessDocFiles({ name: o.full_name || o.company_name || "Owner", company: o.company_name || o.full_name });
      await apiForm("POST", "/logistics/business-docs", {
        token: tokenFor(ownerId),
        body: { owner_id_kind: "national_id", owner_id_expires: docExpiryYmd() },
        files: [["business_registration", f.business_registration], ["owner_id", f.owner_id]],
      });
    }
  }
  return api("POST", `/admin/logistics/owners/${ownerId}/approval`, {
    token: await adminToken(),
    body: { status, ...(reason ? { reason } : {}) },
  });
}

/**
 * 29 Oct 2026 approval flow: real-looking business documents for an owner sign-up.
 * Returns { business_registration, owner_id, tax } file paths (owner_id = driving licence card).
 */
async function businessDocFiles(person, face = 5) {
  const info = { holder: person.name, owner: person.name, company: person.company || person.name, face: DOCS.face(face) };
  return {
    business_registration: await DOCS.docFor("business_registration", info),
    owner_id: await DOCS.docFor("owner_id", info),
    tax: await DOCS.docFor("tax", info),
  };
}

/** Sign-up form (Equipment Owner): attach the business documents (required two + tax). */
/** 30 Oct 2026: owner ID + tax certificate need an expiry date — ~3 years ahead. */
function docExpiryYmd(years = 3) {
  return new Date(Date.now() + years * 365 * 864e5).toISOString().slice(0, 10);
}

async function fillSignupBusinessDocs(page, person, { tax = true, face = 5, taxExpiry = true, ownerType = "company" } = {}) {
  const f = await businessDocFiles(person, face);
  // 30 Oct 2026: documents live on sign-up step 2 — open it (step 1 must be filled)
  const next = page.locator(".signup-step-next");
  if (await next.isVisible().catch(() => false)) await next.click();
  // 12 Nov 2026: "I'm registering as" Individual / Company is required once documents are attached
  if (ownerType) await page.locator(`input[name="logistics_owner_type"][value="${ownerType}"]`).check({ force: true }).catch(() => {});
  await page.locator("#biz-business_registration").setInputFiles(f.business_registration);
  await page.locator("#biz-owner_id").setInputFiles(f.owner_id);
  await page.locator('select[name="owner_id_kind"]').selectOption("national_id").catch(() => {});
  // 23 Nov (client): a national ID has no expiry field; other kinds still do
  const idExpiry = page.locator('input[name="owner_id_expires"]');
  if (await idExpiry.count()) await idExpiry.fill(docExpiryYmd());
  if (tax) {
    await page.locator("#biz-tax").setInputFiles(f.tax).catch(() => {});
    if (taxExpiry) await page.locator('input[name="tax_expires"]').fill(docExpiryYmd(1)).catch(() => {});
  }
  return f;
}

/**
 * Make a fleet ready for customers (29 Oct 2026 rules): verify every unit document and give
 * each operator a verified licence. units = asset ids; operators = [{ _id, name, face }].
 */
async function makeFleetReady(ownerToken, { units = [], operators = [] } = {}) {
  for (const id of units) await verifyDocs("asset", id);
  for (const op of operators) {
    const d = await db();
    const u = await d.collection("users").findOne({ _id: new mongoose.Types.ObjectId(String(op._id)) }, { projection: { logistics_documents: 1 } });
    const hasLicence = (u?.logistics_documents || []).some((x) => x.type === "licence");
    if (!hasLicence) await giveOperatorLicence(ownerToken, op._id, { holder: op.name || "Operator", face: op.face || 1, verify: false });
    await verifyDocs("operator", op._id);
  }
}

/**
 * Admin check of documents through the admin API (same path as the Verify / Reject buttons).
 * subject: "asset" | "operator" | "business"; status "verified" | "rejected"; only = doc types (default all waiting).
 */
async function reviewDocs(subject, id, { status = "verified", reason = "", only = null } = {}) {
  const d = await db();
  const oid = new mongoose.Types.ObjectId(String(id));
  const holder =
    subject === "asset"
      ? await d.collection("logistics_assets").findOne({ _id: oid }, { projection: { documents: 1 } })
      : await d.collection("users").findOne({ _id: oid }, { projection: { logistics_documents: 1, logistics_business_documents: 1 } });
  const docs = subject === "asset" ? holder?.documents : subject === "business" ? holder?.logistics_business_documents : holder?.logistics_documents;
  const token = await adminToken();
  const out = [];
  for (const doc of docs || []) {
    if (only && !only.includes(doc.type)) continue;
    if (!only && doc.review?.status === status) continue;
    out.push(await api("POST", "/admin/logistics/documents/review", {
      token,
      body: { subject, id: String(id), doc_id: String(doc._id), status, ...(status === "rejected" ? { reason: reason || "Not readable — please upload a clear copy" } : {}) },
    }));
  }
  return out;
}
const verifyDocs = async (subject, id, { roadworthy = false, face = true, ...opts } = {}) => {
  if (subject === "asset" && roadworthy && !opts.only) await ensureRoadworthy(id);
  const out = await reviewDocs(subject, id, { ...opts, status: "verified" });
  if (subject === "operator" && face && !opts.only) await verifyFace(id);
  return out;
};

/** v2.7.66: the face photo is what lets an operator work. Gives one first if the operator has none. */
async function verifyFace(id, { face = 1 } = {}) {
  const d = await db();
  const oid = new mongoose.Types.ObjectId(String(id));
  const u = await d.collection("users").findOne({ _id: oid }, { projection: { profile_image: 1, logistics_face_review: 1 } });
  if (u?.logistics_face_review?.status === "verified") return null;
  if (!u?.logistics_face_review?.url && !u?.profile_image) {
    const owner = await d.collection("users").findOne({ _id: oid }, { projection: { owner_id: 1 } });
    await apiForm("PATCH", `/logistics/sub-user/${id}`, { token: tokenFor(owner.owner_id), files: [["profile_photo", DOCS.face(face)]] });
  }
  return api("POST", "/admin/logistics/documents/review", {
    token: await adminToken(),
    body: { subject: "face_photo", id: String(id), status: "verified" },
  });
}

/**
 * v2.7.61: every truck needs a roadworthy certificate. Tests that make a truck ready upload one
 * (as the owner, same path as Add / Edit unit); pass { roadworthy: false } to verifyDocs to keep one out.
 */
async function ensureRoadworthy(assetId) {
  const d = await db();
  const a = await d.collection("logistics_assets").findOne({ _id: new mongoose.Types.ObjectId(String(assetId)) });
  if (!a || a.kind === "equipment" || a.kind === "cab") return null;
  if ((a.documents || []).some((x) => x.type === "roadworthy" && x.review?.status !== "rejected")) return null;
  const expires = DOCS.addMonths(8);
  const file = await DOCS.docFor("roadworthy", { owner: a.name || "Owner", plate: a.plate_number || a.plate || "", kind: "vehicle", expires });
  return apiForm("PATCH", `/logistics/asset/${assetId}`, {
    token: tokenFor(a.owner_id),
    body: { document_types: ["roadworthy"], document_expires: [expires.toISOString().slice(0, 10)] },
    files: [["documents", file]],
  });
}

/**
 * Give an operator a real-looking driving licence (owner uploads it via PATCH /logistics/sub-user/:id)
 * and, unless verify:false, verify it as Simba admin so the operator can go live.
 */
async function giveOperatorLicence(ownerToken, opId, { holder = "Operator", face = 1, months = 8, verify = true, kind = "vehicle" } = {}) {
  const expires = DOCS.addMonths(months);
  const file = await DOCS.docFor("licence", { holder, face: DOCS.face(face), expires, kind });
  const res = await apiForm("PATCH", `/logistics/sub-user/${opId}`, {
    token: ownerToken,
    body: { doc_licence_expires: expires.toISOString().slice(0, 10) },
    files: [["doc_licence", file]],
  });
  if (verify) await verifyDocs("operator", opId);
  return res;
}

/**
 * v2.7.50: put a fleet owner on "paid" (WhatsApp notifications on) or back on "free".
 * Writes the plan directly — paid plans can't be bought while LOGISTICS_PAID_PLANS_ENABLED is off.
 */
async function restartFreePeriod(ownerId) {
  const d = await db();
  await d.collection("users").updateOne({ _id: new mongoose.Types.ObjectId(String(ownerId)) }, { $set: { "logistics_plan.trial_started_at": new Date(), "logistics_plan.trial_ends_at": new Date(Date.now() + 60 * 86400000), "logistics_plan.trial_ended_at": null, isSubscribed: 1 } });
}

async function setPlan(ownerId, plan = "paid") {
  const d = await db();
  const { ObjectId } = mongoose.Types;
  const now = new Date();
  const logistics_plan = plan === "paid"
    ? { id: "paid", started_at: now, changed_at: now, expires_at: new Date(Date.now() + 30 * 86400000), source: "e2e" }
    // Plain Free: the free period has already passed (v2.7.64)
    : { id: "free", changed_at: now, expires_at: null, source: "e2e", trial_started_at: new Date(Date.now() - 90 * 86400000), trial_ends_at: new Date(Date.now() - 30 * 86400000), trial_ended_at: now };
  await d.collection("users").updateOne({ _id: new ObjectId(String(ownerId)) }, { $set: { logistics_plan, isSubscribed: plan === "paid" ? 1 : 0 } });
}

/** Visible text of page body (trimmed). */
async function bodyText(a) {
  return (await a.page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
}

/** Wait for a toast/text to appear. */
async function waitText(a, re, timeout = 12000) {
  try {
    await a.page.waitForFunction((src) => new RegExp(src, "i").test(document.body.innerText), re.source || re, { timeout });
    return true;
  } catch { return false; }
}

/** react-datepicker: open, go N months ahead (or back with negative), click day. */
async function pickDate(page, input, monthsAhead = 6, day = 15) {
  await input.click();
  await page.waitForSelector(".react-datepicker", { timeout: 5000 });
  const nav = monthsAhead >= 0 ? ".react-datepicker__navigation--next" : ".react-datepicker__navigation--previous";
  for (let i = 0; i < Math.abs(monthsAhead); i++) await page.locator(nav).first().click();
  const dd = String(day).padStart(3, "0");
  await page.locator(`.react-datepicker__day--${dd}:not(.react-datepicker__day--outside-month)`).first().click();
  await page.waitForTimeout(200);
}

/**
 * Hub customer straight in DB (Tasker sign-up is frozen / not logistics).
 * The person comes from the cast: role 1 → customer, 2 → service provider, 3 → corporate.
 * `tag` keeps the account stable across stages (cast-state.json maps tag → person).
 */
const CAST_STATE = path.join(__dirname, "cast-state.json");
function castPersonFor(tag, role) {
  let cs = {};
  try { cs = JSON.parse(fs.readFileSync(CAST_STATE, "utf8")); } catch {}
  const RUN = loadState().RUN || "run";
  if (cs.RUN !== RUN) cs = { RUN, tags: {}, next: {} };
  const kind = role === 2 ? "provider" : role === 3 ? "corporate" : "customer";
  if (!cs.tags[tag]) {
    const i = cs.next[kind] || 0;
    cs.next[kind] = i + 1;
    cs.tags[tag] = { kind, i };
    fs.writeFileSync(CAST_STATE, JSON.stringify(cs, null, 2));
  }
  const { kind: k, i } = cs.tags[tag];
  return cast(RUN).person(k, i);
}
async function makeCustomer(tag, role = 1) {
  await db();
  const { User } = require(path.join(BACKEND, "src/models"));
  const person = castPersonFor(tag, role);
  const email = person.email;
  const ex = await User.findOne({ email });
  if (ex) return { _id: String(ex._id), email, role, token: tokenFor(ex._id), name: person.name, phone: ex.phone_number, cc: ex.country_code };
  const u = await User.create({
    email, full_name: person.name, ...(person.company && role !== 1 ? { company_name: person.company } : {}), role,
    country_code: person.cc, phone_number: person.phone,
    email_verified: 1, account_verified: 1, is_completeProfile: 1, password: "Passw0rd!",
  });
  return { _id: String(u._id), email, role, token: tokenFor(u._id), name: person.name, phone: person.phone, cc: person.cc };
}

async function pickLocation(a, fieldIndex, search) {
  await a.page.locator(".log-location-btn").nth(fieldIndex).click();
  await a.page.waitForSelector(".simba-book-loc-modal", { timeout: 10000 });
  await a.page.waitForFunction(() => !/Finding your location/.test(document.querySelector(".simba-book-loc-modal")?.innerText || ""), null, { timeout: 15000 }).catch(() => {});
  await a.page.waitForTimeout(1500);
  if (search) {
    const inp = a.page.locator('.simba-book-loc-modal input[placeholder="Enter a location"]');
    await inp.fill("");
    await inp.pressSequentially(search, { delay: 40 });
    const sug = a.page.locator(".bk-loc-suggestions li:not(.bk-loc-suggestion-muted)").first();
    await sug.waitFor({ timeout: 10000 });
    await sug.dispatchEvent("mousedown");
    await a.page.waitForTimeout(2000);
  }
  await a.page.locator(".simba-book-loc-modal .btn-primary").click();
  await a.page.waitForSelector(".simba-book-loc-modal", { state: "detached", timeout: 5000 }).catch(() => {});
}

/** Human-style money entry: focus, select all, type. Returns displayed value. */
async function typeMoney(page, sel, value) {
  const el = page.locator(sel);
  await el.click();
  await el.press("Control+A");
  await el.pressSequentially(String(value), { delay: 30 });
  await el.blur();
  return el.inputValue();
}

/** Smallest Vehicle needed size that carries `tons` (Weight is capped at the chosen size). */
function vehicleForTons(tons) {
  return [["below 2 ton", 2], ["4 ton", 4], ["6 ton", 6], ["10 ton", 10], ["20 ton", 20]].find(([, max]) => tons <= max)?.[0] || "50 ton";
}
const vehicleSelect = (page) => page.locator("label.log-field").filter({ hasText: "Vehicle needed" }).locator("select");

/** Post a transport job via the UI. mode: "date" | "now". Returns job id. */
/** Document row by its title (not by any text inside — a file named "insurance-paper.pdf" sits in other rows). */
function docRow(page, label) {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return page.locator(".log-doc-row").filter({ has: page.locator(".log-doc-row__body > b", { hasText: new RegExp(`^${esc}`) }) });
}

/** Post job goods: cards since 26 Oct — free text only behind "Describe it yourself". */
async function fillGoods(page, goods) {
  const input = page.locator('input[placeholder="e.g. Construction materials"]');
  if (!(await input.isVisible().catch(() => false))) await page.locator(".log-goods__opt--custom").click();
  await input.fill(goods);
}

async function postTransportJob(a, { goods, mode = "date", price = "300", drop = castFor.PLACES.drops[0], pickup = null, weight = "5", vehicle = vehicleForTons(Number(weight)) }) {
  await goto(a, "/logistics/post", "form.log-form-card--post");
  await pickLocation(a, 0, pickup);
  await pickLocation(a, 1, drop);
  await fillGoods(a.page, goods);
  await vehicleSelect(a.page).selectOption(vehicle);
  await a.page.fill('input[placeholder="8"]', weight);
  if (mode === "now") {
    await a.page.locator(".log-when__opt", { hasText: "Now" }).click();
  } else {
    await a.page.locator(".log-when__opt", { hasText: "Schedule" }).click();
    const dateInput = a.page.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first();
    await pickDate(a.page, dateInput, 1, 15);
  }
  await typeMoney(a.page, 'input[aria-label="Price"]', price);
  await a.page.locator('form.log-form-card--post button[type="submit"]').click();
  await a.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 20000 });
  return a.page.url().match(/jobs\/([a-f0-9]{24})/)[1];
}

/** Operator invite form: tick exactly these "Send invite link via" channels ("email", "whatsapp"). */
async function setInviteVia(page, channels) {
  for (const [id, label] of [["email", "Email"], ["whatsapp", "WhatsApp"]]) {
    const box = page.locator(".log-invite-via__opt", { hasText: label }).locator("input[type=checkbox]");
    if (await box.isDisabled()) continue; // WhatsApp without a phone number
    if ((await box.isChecked()) !== channels.includes(id)) await box.click();
  }
}

async function done() {
  if (browser) await browser.close();
  await DOCS.close();
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  const fail = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fail.length}/${results.length} passed`);
  fs.writeFileSync(path.join(__dirname, `results-${process.argv[1].split("/").pop()}.json`), JSON.stringify(results, null, 2));
  if (fail.length) process.exitCode = 1;
}

module.exports = { completeOperatorSetup, verifyFace, ensureRoadworthy, docExpiryYmd, fillSignupBusinessDocs, makeFleetReady, businessDocFiles, reviewDocs, verifyDocs, giveOperatorLicence, HOME, PLACES: castFor.PLACES, cast, docFile, typePhone, castPersonFor, closeDocs: DOCS.close, docRow, fillGoods, photoFixtures, addUnitPhotos, addFacePhoto, apiForm, setPlan, restartFreePeriod, adminToken, approveOwner, WEB, API, HARARE, sec, check, actor, shot, seedAuth, goto, tokenFor, api, db, bodyText, waitText, done, pickDate, pickLocation, typeMoney, postTransportJob, vehicleSelect, setInviteVia, makeCustomer, loadState, saveState, mongoose, results };
