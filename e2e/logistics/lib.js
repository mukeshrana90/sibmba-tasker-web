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
const HARARE = { latitude: -17.8292, longitude: 31.0522 };

const results = [];
let section = "";
// Watch mode (E2E_HEADED=1): real Chrome window, slowed down, with a live status banner.
const HEADED = !!process.env.E2E_HEADED;
const pages = [];
const stage = (process.argv[1] || "").split("/").pop().replace(/\.js$/, "");
let lastCheck = "";
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
  console.log(`\n▶ ${name}`);
  paintBanner();
}
function check(ok, label, extra) {
  results.push({ section, ok: !!ok, label, extra: ok ? undefined : extra });
  lastCheck = `${ok ? "✔" : "✘"} ${label}`;
  paintBanner();
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && extra !== undefined ? "  → " + String(typeof extra === "string" ? extra : JSON.stringify(extra)).slice(0, 400) : ""}`);
  return !!ok;
}
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { return {}; }
}
function saveState(s) { fs.writeFileSync(STATE, JSON.stringify(s, null, 2)); }

let browser;
async function getBrowser() {
  if (!browser) browser = await chromium.launch(HEADED
    ? { headless: false, channel: "chrome", slowMo: Number(process.env.E2E_SLOWMO || 250), args: ["--ignore-certificate-errors"] }
    : { headless: true, args: ["--ignore-certificate-errors"] });
  return browser;
}

/** New isolated browser context for one actor; /api + /public go to the safe 4099 API. */
async function actor(name, { geo = HARARE, mobile = false } = {}) {
  const b = await getBrowser();
  const ctx = await b.newContext({
    ignoreHTTPSErrors: true,
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    geolocation: geo,
    permissions: ["geolocation", "notifications"],
    // E2E_VIDEO=<dir>: record each actor's session as .webm
    ...(process.env.E2E_VIDEO ? { recordVideo: { dir: process.env.E2E_VIDEO, size: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 } } } : {}),
  });
  const errors = [];
  const apiFails = [];
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

async function db() {
  if (mongoose.connection.readyState !== 1) await mongoose.connect(process.env.DB_URL);
  return mongoose.connection.db;
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

/** Hub customer straight in DB (Tasker sign-up is frozen / not logistics). */
async function makeCustomer(tag, role = 1) {
  await db();
  const { User } = require(path.join(BACKEND, "src/models"));
  const email = `${tag}@e2e.example.com`;
  const ex = await User.findOne({ email });
  if (ex) return { _id: String(ex._id), email, role, token: tokenFor(ex._id) };
  const u = await User.create({
    email, full_name: `E2E ${tag}`, role, country_code: "+263",
    phone_number: `71${String(Date.now()).slice(-7)}`,
    email_verified: 1, account_verified: 1, is_completeProfile: 1, password: "Passw0rd!",
  });
  return { _id: String(u._id), email, role, token: tokenFor(u._id) };
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
async function postTransportJob(a, { goods, mode = "date", price = "300", drop = "Chitungwiza", pickup = null, weight = "5", vehicle = vehicleForTons(Number(weight)) }) {
  await goto(a, "/logistics/post", "form.log-form-card--post");
  await pickLocation(a, 0, pickup);
  await pickLocation(a, 1, drop);
  await a.page.fill('input[placeholder="e.g. Construction materials"]', goods);
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
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  const fail = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fail.length}/${results.length} passed`);
  fs.writeFileSync(path.join(__dirname, `results-${process.argv[1].split("/").pop()}.json`), JSON.stringify(results, null, 2));
  if (fail.length) process.exitCode = 1;
}

module.exports = { WEB, API, HARARE, sec, check, actor, shot, seedAuth, goto, tokenFor, api, db, bodyText, waitText, done, pickDate, pickLocation, typeMoney, postTransportJob, vehicleSelect, setInviteVia, makeCustomer, loadState, saveState, mongoose, results };
