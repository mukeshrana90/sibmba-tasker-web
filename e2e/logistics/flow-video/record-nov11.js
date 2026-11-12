/* Client videos for the 11 Nov 2026 review: one MP4 per point in docs/logistics/videos/client-review-nov11.
 * Demo DB only. Run: reset the demo DB, start the demo API on :4099 (messaging mocked, cab off), the admin panel
 * on :3012 and the outbox viewer on :4098, then
 *   DB_URL=…/SimbaTaskerFlowDemo MOCK_OUTBOX=<outbox> WORK_DIR=<tmp> node record-nov11.js
 * ONLY=01,04 records just those videos (the others still run, unrecorded, so the data matches).
 * FAST=1 DEBUG_DIR=<dir> = dry run with a screenshot per caption. */
if (!/SimbaTaskerFlowDemo/.test(process.env.DB_URL || "")) { console.error("DB_URL must be the demo DB"); process.exit(2); }
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const L = require("../lib");
const F = require("../fleet-helpers");
const DOCS = require("../docs");
const S = require("./nov11-seed");
const { Rec, FAST, hold, say, card, pan, moveTo, patchPlaywright, sleep } = require("./recorder");

const WORK = process.env.WORK_DIR;
const OUT = path.resolve(__dirname, "../../../../docs/logistics/videos/client-review-nov11");
const ADMIN_WEB = process.env.E2E_ADMIN_WEB || "http://localhost:3012";
const VIEWER = process.env.OUTBOX_VIEWER || "http://localhost:4098";
const VIEW = { width: 1280, height: 720 };
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const REAL = DOCS.REAL;
const OID = F.OID;
const pages = new Map();
const actors = {};
let st;
let video = null; // { key, parts: [], rec: bool }

// ───────────── actors and recording ─────────────
async function actor(key, label, user, { visitor = false } = {}) {
  if (actors[key]) return actors[key];
  const a = await L.actor(key, { geo: L.HARARE, viewport: VIEW, scale: 1.5 });
  if (visitor) await a.ctx.clearPermissions();
  a.page.on("dialog", (d) => d.accept());
  pages.set(a.page, a);
  if (pages.size === 1) patchPlaywright(pages, a.page);
  // The role pill sits right of centre, clear of the header's Services | Logistics toggle
  await a.ctx.addInitScript(() => {
    setInterval(() => {
      const t = document.querySelector("video-overlay")?.shadowRoot?.getElementById("tag");
      if (t && !t.dataset.moved) { t.style.left = "70%"; t.dataset.moved = "1"; }
    }, 100);
  });
  a.rec = new Rec(a, label, WORK); await a.rec.attach();
  if (user) await L.seedAuth(a, { token: L.tokenFor(user._id), user: { _id: String(user._id), role: user.role, ...(user.owner_id ? { owner_id: String(user.owner_id) } : {}) } });
  actors[key] = a;
  return a;
}
async function adminActor() {
  if (actors.admin) return actors.admin;
  const a = await actor("admin", "Simba Admin");
  const token = await L.adminToken();
  await a.ctx.addInitScript((t) => { try { sessionStorage.setItem("token", t); localStorage.setItem("adminModule", "logistics"); } catch {} }, token);
  return a;
}
const recording = () => !!video?.rec;
async function rec(a) { if (recording()) await a.rec.start(); }
async function cut(a) {
  if (!recording() || !a.rec.on) return;
  await a.rec.stop();
  const part = path.join(WORK, "parts", `${video.key}-${String(video.parts.length).padStart(2, "0")}.mp4`);
  fs.mkdirSync(path.dirname(part), { recursive: true });
  a.rec.encode(part);
  for (const f of a.rec.frames) if (f.file) fs.rmSync(f.file, { force: true });
  a.rec.frames = [];
  video.parts.push(part);
}
function finishVideo() {
  if (!recording() || !video.parts.length) return;
  const list = path.join(WORK, "parts", `${video.key}.txt`);
  fs.writeFileSync(list, video.parts.map((p) => `file '${p}'`).join("\n"));
  fs.mkdirSync(OUT, { recursive: true });
  const out = path.join(OUT, `${video.key}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", out], { stdio: "inherit" });
  console.log("  →", out);
}

// ───────────── page helpers ─────────────
const settle = async (a, ms = 1200) => { await a.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {}); await a.page.waitForTimeout(FAST ? 300 : ms); };
const clearCap = async (a) => { if (a.rec?.on) { a.rec.cap = ""; await a.page.evaluate(() => window.__v?.caption("")).catch(() => {}); } };
const go = async (a, p, waitSel) => { await clearCap(a); await L.goto(a, p, waitSel); await settle(a); };
const goAdmin = async (a, p, waitSel) => { await clearCap(a); await a.page.goto(`${ADMIN_WEB}${p}`, { waitUntil: "domcontentloaded" }); await settle(a, 1500); if (waitSel) await a.page.waitForSelector(waitSel, { timeout: 15000 }); };
async function top(a) { await a.page.evaluate((b) => window.scrollTo({ top: 0, behavior: b }), FAST ? "auto" : "smooth").catch(() => {}); await hold(a, 1100); }
async function show(a, loc, { block = "center" } = {}) {
  const l = typeof loc === "string" ? a.page.locator(loc).first() : loc.first();
  await l.evaluate((e, b) => e.scrollIntoView({ behavior: "smooth", block: b }), block, { timeout: 10000 }).catch(() => {});
  await hold(a, 900);
  const box = await l.boundingBox().catch(() => null);
  if (box) await moveTo(a, box.x + Math.min(box.width / 2, 260), box.y + Math.min(box.height / 2, 40));
}
const showText = (a, text) => show(a, a.page.getByText(text, { exact: false }));
const closeToasts = async (a) => { await a.page.evaluate(() => document.querySelectorAll(".Toastify__close-button").forEach((b) => b.click())).catch(() => {}); };
const expiryInput = (row) => row.locator(".log-doc-row__expiry input");
/** Live camera: wait until the stream has drawn the face, then take the photo. */
async function snap(page) {
  const c = page.locator('[data-testid="face-camera-capture"]:not([disabled])');
  await c.waitFor({ timeout: 15000 });
  await page.waitForTimeout(1800);
  await c.click();
}
const faceSrc = (file) => `data:image/jpeg;base64,${fs.readFileSync(file).toString("base64")}`;
async function intro(a, n, title, para) {
  await card(a, `Client review 11 Nov · Point ${n}`, title, para);
}
async function outro(a, title, para) { await card(a, "Done", title, para, 5500); }
function check(ok, label, extra) { console.log(`  ${ok ? "✔" : "✘"} ${label}${extra !== undefined && !ok ? ` — ${JSON.stringify(extra).slice(0, 300)}` : ""}`); if (!ok) failures.push(label); }
const failures = [];
const bodyText = (a) => L.bodyText(a);
const db = () => L.db();

// ───────────── the videos ─────────────
const VIDEOS = {
  async "01-home-choice"() {
    const c = await actor("customer", "Customer · Rudo", st.customer);
    await c.page.evaluate(() => localStorage.removeItem("lastSection"));
    await go(c, "/", '[data-testid="market-switch"]');
    await rec(c);
    await intro(c, 1, "Services or Logistics on the first page", "Signed-in customers, service providers and corporate accounts now see a large choice. Owners and operators keep the small toggle.");
    await show(c, '[data-testid="market-switch"]');
    check(await c.page.locator('[data-testid="market-switch"]').isVisible(), "customer: large choice on /");
    check(!(await c.page.locator(".module-switcher--nav").count()), "customer: header toggle hidden on /");
    await say(c, "Rudo is signed in as a customer. Her first page opens with a large choice: Services or Logistics.");
    await moveTo(c, 640, 40);
    await say(c, "The small Services | Logistics toggle in the header is hidden here, because the large choice replaces it.");
    await c.page.locator('[data-testid="market-logistics"]').click();
    await c.page.waitForURL(/\/logistics/, { timeout: 15000 }); await settle(c, 1500);
    check(/Track your jobs/.test(await bodyText(c)), "customer: /logistics is the landing page with Track your jobs");
    check(!(await c.page.locator(".module-switcher--nav").count()), "customer: header toggle hidden on /logistics");
    await say(c, "Logistics opens the same landing page that visitors see, with the choice at the top and no header toggle.");
    await showText(c, "Track your jobs");
    await say(c, "Because Rudo is signed in, the landing page also offers Track your jobs, which opens her own jobs.");
    await top(c);
    await c.page.locator('[data-testid="market-services"]').click();
    await c.page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 15000 }); await settle(c, 1200);
    await say(c, "Services takes her back to the Services home page.");
    await cut(c);

    const p = await actor("provider", "Service provider · Tinashe", st.provider);
    await go(p, "/requests", '[data-testid="market-switch"]');
    await rec(p);
    check(await p.page.locator('[data-testid="market-switch"]').isVisible(), "provider: large choice on /requests");
    await show(p, '[data-testid="market-switch"]');
    await say(p, "A service provider sees the same choice on their first page, Requests.");
    await cut(p);

    const k = await actor("corporate", "Corporate · Avondale Retail Hub", st.corporate);
    await go(k, "/corporate", '[data-testid="market-switch"]');
    await rec(k);
    check(await k.page.locator('[data-testid="market-switch"]').isVisible(), "corporate: large choice on /corporate");
    await show(k, '[data-testid="market-switch"]');
    await say(k, "A corporate account sees it on the corporate home page.");
    await cut(k);

    const o = await actor("owner", "Equipment owner · Tatenda", st.ownerA);
    await go(o, "/logistics/owner");
    await rec(o);
    const tog = o.page.locator(".module-switcher--nav").first();
    check(await tog.isVisible().catch(() => false) && !(await o.page.locator('[data-testid="market-switch"]').count()), "owner: toggle kept, no large choice");
    await show(o, tog);
    await say(o, "Equipment owners don't get the large cards. They keep the Services | Logistics toggle in the header.");
    await cut(o);

    const f = await actor("farai", "Operator · Farai", st.farai);
    await go(f, "/logistics/driver");
    await rec(f);
    const tog2 = f.page.locator(".module-switcher--nav").first();
    check(await tog2.isVisible().catch(() => false) && !(await f.page.locator('[data-testid="market-switch"]').count()), "operator: toggle kept, no large choice");
    await show(f, tog2);
    await say(f, "Operators keep the header toggle too.");
    await outro(f, "Point 1 done", "Large choice for customers, providers and corporates. Toggle hidden there. Owners and operators keep the toggle.");
    await cut(f);
  },

  async "02-job-area"() {
    const o = await actor("owner", "Equipment owner · Tatenda", st.ownerA);
    await go(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await rec(o);
    await intro(o, 2, "Which jobs a unit sees", "A dated job is shown when its pickup is inside the unit's operating range around its base. Jobs the unit can't carry are never listed.");
    await show(o, '[data-testid="operating-range"]');
    check(/Default 100 km/.test(await o.page.locator('[data-testid="operating-range"]').getAttribute("placeholder")), "add form: range placeholder shows the default 100 km");
    await say(o, "Each unit has an operating range around its base. Left empty, it uses Simba's default, now 100 km.");
    await say(o, "The default is a server setting (LOGISTICS_DEFAULT_OPERATING_RANGE_KM), so it can be changed at any time.");
    await go(o, `/logistics/owner/fleet/${st.seddon._id}`);
    await showText(o, "Operating range");
    await say(o, "Blessing's Seddon has its own range of 500 km, entered by the owner.");
    await cut(o);

    const c = await actor("customer", "Customer · Rudo", st.customer);
    await go(c, "/logistics/post", "form.log-form-card--post");
    await rec(c);
    await show(c, '[data-testid="open-to-return-loads"]');
    await say(c, "When posting, a customer can tick Open to return loads. The job is then shown to fleets anywhere, such as trucks heading home empty.");
    await say(c, "Rudo has already posted four jobs: Harare cement (10 t), Bulawayo maize (8 t), Bulawayo roofing sheets open to return loads, and Harare steel (25 t).");
    await cut(c);

    const f = await actor("farai", "Operator · Farai", st.farai);
    await go(f, "/logistics/driver/work");
    await rec(f);
    const ft = await bodyText(f);
    check(/Cement, 200 bags/.test(ft) && /Roofing sheets/.test(ft) && !/Maize, 160 bags/.test(ft) && !/Steel beams/.test(ft), "Farai: Harare + return-load listed; Bulawayo + heavy hidden", ft.slice(0, 400));
    await say(f, "Farai drives the Hino, based in Msasa, Harare, with the default 100 km range. It carries 15 tonnes.");
    await showText(f, "Cement, 200 bags");
    await say(f, "She sees the Harare cement job, because the pickup is inside her range.");
    await showText(f, "Roofing sheets");
    await say(f, "She also sees the Bulawayo roofing sheets job: the customer ticked Open to return loads.");
    await say(f, "The Bulawayo maize job is not listed (pickup about 365 km away), and neither is the 25-tonne steel job, which the Hino can't carry.");
    await go(f, `/logistics/driver/job/${st.jobs.byo}`);
    await f.page.waitForSelector('[data-testid="job-not-visible"]', { timeout: 15000 }).catch(() => {});
    check(/isn't available to your fleet/.test(await bodyText(f)), "Farai: direct link says not available to your fleet");
    await show(f, '[data-testid="job-not-visible"]');
    await say(f, "Even with a direct link to the Bulawayo job, the page says it isn't available to her fleet.");
    await cut(f);

    const b = await actor("blessing", "Operator · Blessing", st.blessing);
    await go(b, "/logistics/driver/work");
    await rec(b);
    const bt = await bodyText(b);
    check(/Maize, 160 bags/.test(bt) && /Steel beams/.test(bt) && /Cement, 200 bags/.test(bt), "Blessing: own 500 km range + 30 t sees all", bt.slice(0, 400));
    await say(b, "Blessing's Seddon, also from Harare, has its own 500 km range and carries 30 tonnes.");
    await showText(b, "Maize, 160 bags");
    await say(b, "So she sees the Bulawayo maize job too, and the 25-tonne steel job.");
    await cut(b);

    const n = await actor("nomsa", "Operator · Nomsa (Bulawayo)", st.nomsa);
    await go(n, "/logistics/driver/work");
    await rec(n);
    const nt = await bodyText(n);
    check(/Maize, 160 bags/.test(nt) && /Roofing sheets/.test(nt) && !/Cement, 200 bags/.test(nt), "Nomsa (Bulawayo): local + return load; no Harare job", nt.slice(0, 400));
    await say(n, "Nomsa's truck is based in Bulawayo with the default range. She sees the Bulawayo jobs, and not the Harare cement job.");
    await outro(n, "Point 2 done", "Range around the base (default 100 km from the server setting), own range per unit, return loads open to all, too-heavy jobs never listed.");
    await cut(n);
  },

  async "03-compulsory-docs"() {
    const o = await actor("owner", "Equipment owner · Tatenda", st.ownerA);
    const u = S.units.freightliner;
    await go(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    const p = o.page;
    await rec(o);
    await intro(o, 3, "Only ZINARA and a verified face are compulsory", "Road units need a verified ZINARA road licence. Operators need a verified face photo. Licence and roadworthy are optional.");
    await say(o, "Tatenda adds a Freightliner tipper.");
    await p.fill('input[placeholder="Truck 1"]', u.name);
    await p.fill('input[placeholder="AEB1234"]', u.plate);
    await p.fill('input[placeholder="15"]', String(u.tons)).catch(() => {});
    await p.fill('input[placeholder="Isuzu"]', u.make);
    await p.fill('input[placeholder="FVZ"]', u.model);
    await p.fill('input[placeholder="2019"]', u.year);
    await L.pickLocation(o, 0, "Workington, Harare");
    await p.locator("form.log-fleet-form .log-photo-slot--add input[type=file]").first().setInputFiles(u.photos);
    const rego = L.docRow(p, "Road licence").first();
    const rw = L.docRow(p, "Roadworthy").first();
    await show(o, rego);
    check(/required/i.test(await rego.innerText()), "ZINARA row says required", await rego.innerText());
    check(/Optional/.test(await rw.innerText()), "Roadworthy row says Optional", await rw.innerText());
    await say(o, "The Road licence (ZINARA) is the only compulsory vehicle document.");
    await show(o, rw);
    await say(o, "Roadworthy is marked Optional. Insurance and ownership papers are optional too, and expiry reminders still run.");
    const when = DOCS.addMonths(7);
    await rego.locator('input[type="file"]').setInputFiles(await L.docFile("rego", { owner: st.ownerA.company, holder: st.ownerA.name, plate: u.plate, make: u.make, model: u.model, year: u.year, kind: "vehicle", expires: when }));
    await L.pickDate(p, expiryInput(rego), 7, 20);
    await say(o, "He uploads only the ZINARA, with its expiry date.");
    await p.locator('[data-testid="operated-by-invite"]').click();
    await hold(o, 600);
    const lic = p.locator('[data-testid="unit-op-invite"] .log-doc-row').filter({ hasText: "Driving / plant licence" }).first();
    await show(o, lic);
    check(/Optional/.test(await lic.innerText().catch(() => "")), "new operator: licence Optional", await lic.innerText().catch(() => ""));
    await say(o, "For a new operator, the driving or plant licence is Optional. The face photo is what Simba must verify.");
    await p.locator('[data-testid="operated-by-existing"]').click();
    await hold(o, 500);
    await p.locator('[data-testid="unit-op-existing"]').selectOption({ label: st.people.farai.name }).catch(async () => {
      const opts = await p.locator('[data-testid="unit-op-existing"] option').allInnerTexts();
      const hit = opts.find((t) => t.includes("Farai"));
      await p.locator('[data-testid="unit-op-existing"]').selectOption({ label: hit });
    });
    await say(o, "This truck will be driven by Farai, whose face photo is already verified. She has no licence uploaded.");
    await p.locator('form.log-fleet-form button[type="submit"]').click();
    check(await L.waitText(o, /Vehicle added/, 20000), "truck saved with ZINARA only");
    await settle(o, 1500);
    await say(o, "The truck is saved with just the ZINARA. Simba now checks it.");
    await cut(o);
    const saved = await (await db()).collection("logistics_assets").findOne({ registration: u.plate });
    st.freightliner = { _id: String(saved._id) };
    check((saved.documents || []).length === 1 && saved.documents[0].type === "rego", "only ZINARA stored", saved.documents.map((x) => x.type));

    const a = await adminActor();
    await goAdmin(a, `/logistics-owner/${st.ownerA._id}`, ".over-view-btn button");
    await rec(a);
    await a.page.locator(".over-view-btn button", { hasText: /^Equipment$/ }).first().click(); await settle(a);
    const row = a.page.locator(`tr[data-unit-id="${st.freightliner._id}"]`);
    await show(a, row);
    await say(a, "In the admin panel, the new truck has one document to check: the ZINARA.");
    const btn = row.locator('[data-testid="approve-unit"]');
    if (await btn.count()) {
      await btn.click();
      await a.page.locator('[data-testid="approve-package-confirm"]').click({ timeout: 8000 });
    } else {
      await a.page.locator(".log-doc-verify").first().click();
    }
    await settle(a, 1500); await closeToasts(a);
    await say(a, "The admin verifies it. Nothing else is needed for this truck.");
    await cut(a);
    const v = await (await db()).collection("logistics_assets").findOne({ _id: OID(st.freightliner._id) });
    check(v.documents.every((x) => x.review?.status === "verified"), "ZINARA verified", v.documents.map((x) => x.review?.status));

    const f = await actor("farai", "Operator · Farai", st.farai);
    await go(f, "/logistics/driver", ".log-dash-avail-controls");
    await rec(f);
    await say(f, "Farai picks the Freightliner and sets herself Available.");
    await f.page.locator(".log-unit-pick__btn").click();
    await f.page.locator(".log-unit-pick__opt", { hasText: u.name }).first().click();
    await hold(f, 600);
    await f.page.locator('select[aria-label="Set status"]').selectOption("available_now");
    await f.page.getByRole("button", { name: "Update status" }).click();
    await f.page.waitForTimeout(FAST ? 1500 : 2500);
    await say(f, "She is live: ZINARA verified on the truck and her face verified. No licence or roadworthy was needed.");
    await cut(f);

    const c = await actor("customer", "Customer · Rudo", st.customer);
    await go(c, `/logistics/asset/${st.freightliner._id}`);
    await rec(c);
    const ct = await bodyText(c);
    check(/Freightliner/.test(ct) && !/not bookable|unavailable/i.test(ct), "customer sees the truck bookable", ct.slice(0, 300));
    await say(c, "Customers can now find and book the Freightliner.");
    await pan(c, 350);
    await outro(c, "Point 3 done", "ZINARA for road units and a verified face for operators are the only blockers. Licence and roadworthy are optional.");
    await cut(c);
  },

  async "04-job-email"() {
    const c = await actor("customer", "Customer · Rudo", st.customer);
    const p = c.page;
    await go(c, "/logistics/post", "form.log-form-card--post");
    await rec(c);
    await intro(c, 4, "New-job emails", "When a job is posted, every owner and operator whose fleet can see it gets an email, and the customer gets a confirmation.");
    await say(c, "Rudo posts a job: bricks from Workington to Borrowdale, Harare.");
    await L.pickLocation(c, 0, "Workington, Harare");
    await L.pickLocation(c, 1, "Borrowdale, Harare");
    await L.fillGoods(p, "Bricks, 3 000");
    await L.vehicleSelect(p).selectOption("10 ton");
    await p.fill('input[placeholder="8"]', "8");
    await p.locator(".log-when__opt", { hasText: "Schedule" }).click();
    await L.pickDate(p, p.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first(), 0, Math.min(28, new Date().getDate() + 3));
    await L.typeMoney(p, 'input[aria-label="Price"]', "220");
    st.mailSince = new Date().toISOString();
    await p.locator('form.log-form-card--post button[type="submit"]').click();
    await p.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 25000 });
    st.brickJob = p.url().match(/jobs\/([a-f0-9]{24})/)[1];
    await settle(c, 1500);
    await say(c, "The job is posted.");
    await cut(c);
    await sleep(3000);
    const mails = F.outbox(st.mailSince).filter((m) => m.channel === "email");
    const to = (e) => mails.filter((m) => m.to === e).map((m) => m.subject);
    const P = st.people;
    check(to(P.ownerA.email).some((s) => /New job for your fleet/i.test(s)), "owner Tatenda emailed", to(P.ownerA.email));
    check(to(P.farai.email).some((s) => /New job/i.test(s)) && to(P.blessing.email).some((s) => /New job/i.test(s)), "operators Farai + Blessing emailed");
    check(to(P.customer.email).some((s) => /Your job is posted/i.test(s)), "customer confirmation");
    check(!to(P.ownerB.email).length && !to(P.nomsa.email).length, "Bulawayo fleet not emailed (outside range)");
    st.mailCheck = { owner: to(P.ownerA.email), customer: to(P.customer.email) };

    const v = await actor("viewer", "Test outbox (no real emails are sent)");
    await v.ctx.addInitScript(() => document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = "#now{display:none!important}"; document.head.appendChild(s); }));
    await v.page.goto(VIEWER, { waitUntil: "domcontentloaded" }); await settle(v, 2000);
    const follow = v.page.locator('input[type="checkbox"]').first();
    if (await follow.isChecked().catch(() => false)) await follow.uncheck();
    await v.page.locator('#filters button[data-f="email"]').click();
    await v.page.locator(".item").first().click();
    await settle(v, 800);
    await rec(v);
    await say(v, "In this demo nothing is really sent. This test outbox shows each email exactly as it would arrive.");
    for (const [who, re, label] of [
      [P.customer.email, /Your job is posted/, "Rudo gets a confirmation: Your job is posted."],
      [P.ownerA.email, /New job for your fleet/, "Tatenda, the owner, gets New job for your fleet, with a View job button."],
      [P.farai.email, /New job for your fleet/, "Farai and Blessing, his operators, get the same email."],
    ]) {
      const item = v.page.locator(".item").filter({ hasText: who }).filter({ hasText: /Workington/ }).first();
      const it2 = (await item.count()) ? item : v.page.locator(".item").filter({ hasText: who }).filter({ hasText: re }).first();
      await it2.click();
      await settle(v, 900);
      await say(v, label);
      await pan(v, 0, 10);
    }
    await say(v, "The Bulawayo, Mutare and Gweru fleets are outside the range for this pickup, so they get no email.");
    await outro(v, "Point 4 done", "One email to each owner and operator whose fleet can see the job, and a confirmation to the customer.");
    await cut(v);
  },

  async "05-one-verification"() {
    // A new company that signed up today: business documents uploaded, approval pending
    const P = st.people;
    const np = { name: "Chiedza Mhlanga", company: "Mhlanga Haulage", email: "chiedza.mhlanga@yopmail.com", phone: "779514862", cc: "+263" };
    const owner = await F.makeOwner(np, { approve: false });
    await (await db()).collection("users").updateOne({ _id: OID(owner._id) }, { $set: { location: { type: "Point", coordinates: S.places.graniteside.c }, street_address: S.places.graniteside.label } });
    const biz = await L.businessDocFiles({ name: np.name, company: np.company });
    await L.apiForm("POST", "/logistics/business-docs", { token: owner.token, body: { owner_id_kind: "national_id", owner_id_expires: L.docExpiryYmd() }, files: [["business_registration", biz.business_registration], ["owner_id", biz.owner_id]] });
    st.ownerE = owner; st.ownerEp = np;
    const opP = { name: "Tendai Nyamande", email: "tendai.nyamande@yopmail.com" };
    st.opE = opP;
    const u = { name: "JCB 3CX Backhoe", make: "JCB", model: "3CX", photos: [path.join(REAL, "zw/jcb3cx-1.jpg"), path.join(REAL, "zw/jcb3cx-2.jpg")] };

    const o = await actor("ownerE", "Equipment owner · Chiedza (new company)", owner);
    const p = o.page;
    await go(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await rec(o);
    await intro(o, 5, "One verification for everything", "A new company adds its unit, documents and operator in one form while still pending. Simba approves it all with one Approve all.");
    check(!(await p.locator(".log-locked-add").count()), "form open while pending");
    await say(o, "Chiedza signed up today. Her company is still waiting for approval, yet the add form is open.");
    await p.locator('form.log-fleet-form button.log-cattile[aria-label="Construction"]').click();
    await hold(o, 600);
    await p.fill('input[placeholder="JD Compact 1"]', u.name);
    await p.fill('input[placeholder="John Deere"]', u.make);
    const picks = p.locator("form.log-fleet-form .log-pick-field");
    await picks.nth(0).click();
    await p.waitForSelector(".log-modal .log-eq-tile");
    const tile = p.locator(".log-modal .log-eq-tile", { hasText: /Backhoe/i }).first();
    if (await tile.count()) await tile.click(); else await p.locator(".log-modal .log-eq-tile").first().click();
    await picks.nth(1).click();
    await p.waitForSelector(".log-modal .log-subpick__opt");
    await p.locator(".log-modal .log-subpick__opt").first().click();
    await L.pickLocation(o, 0, "Graniteside, Harare");
    await p.locator("form.log-fleet-form .log-photo-slot--add input[type=file]").first().setInputFiles(u.photos);
    await say(o, "She enters the machine, its base and photos, then the documents in the same form.");
    const ins = L.docRow(p, "Insurance").first();
    await ins.locator('input[type="file"]').setInputFiles(await L.docFile("insurance", { owner: np.company, holder: np.name, plate: "JCB-3CX-447102", make: u.make, model: u.model, year: "2020", kind: "equipment", expires: DOCS.addMonths(9) }));
    await L.pickDate(p, expiryInput(ins), 9, 20);
    const own = L.docRow(p, "Ownership").first();
    if (await own.count()) await own.locator('input[type="file"]').setInputFiles(await L.docFile("ownership", { owner: np.company, holder: np.name, plate: "JCB-3CX-447102", make: u.make, model: u.model, year: "2020", kind: "equipment" }));
    await say(o, "And the operator, in the same form: name, email and a face photo taken with the camera.");
    await p.locator('[data-testid="operated-by-invite"]').click().catch(() => {});
    await p.fill('[data-testid="unit-op-name"]', opP.name);
    await p.fill('[data-testid="unit-op-email"]', opP.email);
    await p.evaluate((s) => { window.__e2eFaceSrc = s; window.__e2eCameraError = null; window.__e2eRealCamera = false; }, faceSrc(path.join(REAL, "face-4.jpg")));
    await p.locator('[data-field="profile_photo"] [data-testid="face-photo-take"]').first().click();
    await snap(p);
    await hold(o, 800);
    await p.locator('[data-testid="face-camera-use"]').click();
    await p.locator('[data-testid="face-camera-use"]').waitFor({ state: "detached", timeout: 10000 });
    await say(o, "One Save sends the whole package to Simba.");
    await p.locator('form.log-fleet-form button[type="submit"]').click();
    check(await L.waitText(o, /Equipment added|Vehicle added/, 25000), "equipment + operator saved while pending");
    await settle(o, 1500);
    await cut(o);
    const d = await db();
    const unit = await d.collection("logistics_assets").findOne({ owner_id: OID(owner._id) });
    st.jcb = { _id: String(unit._id) };
    const inv = await d.collection("logistics_invites").findOne({ email: opP.email });
    check(!!inv && inv.face_review?.status === "pending", "invite holds face, pending", inv?.face_review);
    st.invE = { _id: String(inv._id), token: inv.token };

    const a = await adminActor();
    await goAdmin(a, `/logistics-owner/${owner._id}`, '[data-testid="approve-package"]');
    await rec(a);
    await show(a, ".log-package-card");
    await say(a, "The admin opens Mhlanga Haulage. One card covers everything: company documents, the machine's documents and the operator's face photo.");
    await say(a, "Suppose the operator's face photo is not clear. The admin rejects just that item.");
    await a.page.locator(".over-view-btn button", { hasText: /^Operators$/ }).first().click(); await settle(a);
    const invRow = a.page.locator(`tr[data-testid="invite-row"][data-invite-id="${inv._id}"]`);
    await show(a, invRow);
    await invRow.locator(".log-doc-reject").first().click();
    await a.page.locator(".log-reason-picker").selectOption({ index: 1 }).catch(() => {});
    await a.page.fill(".log-reason-input", "Face not clear. Please take the photo in good light.");
    await hold(a, 800);
    await a.page.locator(".log-reason-submit").click();
    await settle(a, 1500); await closeToasts(a);
    await a.page.locator(".over-view-btn button", { hasText: /^Overview$/ }).first().click(); await settle(a);
    await show(a, '[data-testid="package-missing"]');
    check(/face/i.test(await a.page.locator('[data-testid="package-missing"]').innerText().catch(() => "")), "package lists the rejected face photo");
    await say(a, "Approve all now waits. The card lists the one rejected item; everything else stays as it is.");
    await cut(a);

    await go(o, "/logistics/owner/operators");
    await o.page.locator('select[aria-label="Show active or invites"]').selectOption({ index: 1 }).catch(() => {});
    await settle(o);
    await rec(o);
    const rej = o.page.locator('[data-testid="invite-face-rejected"]').first();
    await show(o, rej);
    check(await rej.isVisible().catch(() => false), "owner sees the rejected face on the invite");
    await say(o, "Chiedza sees only the face photo come back, with Simba's reason. The machine and its documents are not sent back.");
    await o.page.evaluate((s) => { window.__e2eFaceSrc = s; window.__e2eCameraError = null; window.__e2eRealCamera = false; }, faceSrc(path.join(REAL, "face-4.jpg")));
    await o.page.locator('[data-testid="invite-face-retake"]').first().click();
    await snap(o.page);
    await hold(o, 800);
    await o.page.locator('[data-testid="face-camera-use"]').click();
    check(await L.waitText(o, /Photo updated/, 15000), "face retaken");
    await settle(o, 1200);
    await say(o, "She takes a new photo. It goes back to Simba on its own.");
    await cut(o);
    const ivx = await d.collection("logistics_invites").findOne({ _id: inv._id });
    check(ivx.face_review?.status === "pending", "replacement face pending", ivx.face_review);

    await goAdmin(a, `/logistics-owner/${owner._id}`, '[data-testid="approve-package"]');
    await rec(a);
    await show(a, ".log-package-card");
    await say(a, "The package is complete again. One click approves it.");
    await a.page.locator('[data-testid="approve-package"]').click();
    await a.page.waitForSelector('[data-testid="approve-package-confirm"]', { timeout: 8000 });
    await hold(a, 1200);
    await a.page.locator('[data-testid="approve-package-confirm"]').click();
    await settle(a, 2500); await closeToasts(a);
    const ow = await d.collection("users").findOne({ _id: OID(owner._id) });
    const un = await d.collection("logistics_assets").findOne({ _id: OID(st.jcb._id) });
    const iv = await d.collection("logistics_invites").findOne({ _id: inv._id });
    check(ow.logistics_approval?.status === "approved" && un.documents.every((x) => x.review?.status === "verified" || x.superseded) && iv.face_review?.status === "verified", "Approve all: company, documents and face verified", { a: ow.logistics_approval?.status, docs: un.documents.map((x) => x.review?.status), face: iv.face_review?.status });
    await say(a, "The company is approved, and the documents and the operator's face photo are verified, all at once.");
    await outro(a, "Point 5 done", "One form for unit, documents and operator. One Approve all. A rejected item comes back on its own.");
    await cut(a);
  },

  async "06-face-camera"() {
    const P = st.people;
    const o = await actor("owner", "Equipment owner · Tatenda", st.ownerA);
    const p = o.page;
    const newOp = { name: "Rutendo Chiripanhura", email: "rutendo.chiripanhura@yopmail.com", face: path.join(REAL, "zw-face-7.jpg") };
    await go(o, "/logistics/owner/operators/add", "form");
    await rec(o);
    await intro(o, 6, "Face photo from the live camera", "No file upload: the photo is taken with the camera. After the operator accepts, only the operator can change it.");
    check(!(await p.locator('[data-field="profile_photo"] input[type="file"]').count()), "no file input on the face field");
    await p.fill('input[placeholder="Full name"]', newOp.name);
    await p.fill('input[placeholder="name@example.com"]', newOp.email);
    const free = p.locator('.log-asset-pick__list li input[type="checkbox"]:not([disabled])');
    if (await free.count()) await free.first().check();
    await show(o, '[data-field="profile_photo"]');
    await say(o, "Tatenda adds a new operator. The face photo has Take photo, not Upload.");
    await p.evaluate(() => { window.__e2eCameraError = "NotFoundError"; });
    await p.locator('[data-field="profile_photo"] [data-testid="face-photo-take"]').first().click();
    await p.locator('[data-testid="face-camera-error"]').waitFor({ timeout: 10000 });
    check(/No camera was found/.test(await p.locator('[data-testid="face-camera-error"]').innerText()), "camera error message shown");
    await show(o, '[data-testid="face-camera-error"]');
    await say(o, "On a computer without a camera, a clear message appears with Try again.");
    await p.evaluate((s) => { window.__e2eCameraError = null; window.__e2eFaceSrc = s; }, faceSrc(newOp.face));
    await say(o, "Once a camera is connected, Try again opens it.");
    await p.locator('[data-testid="face-camera-retry"]').click();
    await snap(p);
    await hold(o, 1000);
    await say(o, "The photo is taken from the live camera. Retake or Use photo.");
    await p.locator('[data-testid="face-camera-use"]').click();
    await p.locator('[data-testid="face-camera-use"]').waitFor({ state: "detached", timeout: 10000 });
    await p.locator("form button[type=submit]").last().click();
    check(await L.waitText(o, /Invite (sent|created)/, 20000), "invite sent");
    await settle(o);
    await say(o, "The invite is sent with the face photo for Simba to check.");
    await cut(o);
    const d = await db();
    const inv = await d.collection("logistics_invites").findOne({ email: newOp.email });

    const r = await actor("rutendo", "Operator · Rutendo");
    await L.goto(r, `/logistics/invite?token=${inv.token}`, "#invite-password"); await settle(r);
    await r.page.fill("#invite-password", S.PW); await r.page.fill("#invite-password-confirm", S.PW);
    await r.page.locator('button[type="submit"]').click();
    await r.page.waitForURL(/\/logistics\/driver/, { timeout: 25000 }); await settle(r, 1500);
    const opU = await d.collection("users").findOne({ email: newOp.email });
    st.rutendo = { _id: String(opU._id), token: L.tokenFor(opU._id), role: 4, owner_id: st.ownerA._id };
    await L.api("POST", "/admin/logistics/documents/review", { token: await L.adminToken(), body: { subject: "face_photo", id: String(opU._id), status: "verified" } });

    await go(o, `/logistics/owner/operators?operator=${opU._id}`, '[data-testid="face-photo-locked"]');
    await rec(o);
    await card(o, "Equipment owner", "Rutendo accepted the invite", "Simba has verified her face photo.", 4000);
    await show(o, '[data-testid="face-photo-locked"]');
    check(/Only the operator can update this photo/i.test(await p.locator('[data-testid="face-photo-locked"]').innerText()) && !(await p.locator('[data-testid="face-photo-take"]').count()), "owner: read-only note, no Take photo");
    await say(o, "Now the owner sees the photo as read-only: only the operator can update it.");
    await cut(o);

    await go(r, "/logistics/driver", '[data-testid="operator-face-card"]');
    await rec(r);
    await show(r, '[data-testid="operator-face-card"]');
    await say(r, "Rutendo sees her face photo on her dashboard, verified, with an option to update it.");
    await r.page.evaluate((s) => { window.__e2eFaceSrc = s; window.__e2eRealCamera = false; window.__e2eCameraError = null; }, faceSrc(path.join(REAL, "zw-face-7.jpg")));
    await r.page.locator('[data-testid="operator-face-update"]').click();
    await snap(r.page);
    await hold(r, 1000);
    await say(r, "She takes a new selfie with the camera.");
    await r.page.locator('[data-testid="face-camera-use"]').click();
    check(await L.waitText(r, /Simba will check your photo/, 15000), "operator selfie saved");
    await settle(r, 1500);
    await show(r, '[data-testid="operator-face-card"]');
    check((await r.page.locator('[data-testid="operator-face-card"]').getAttribute("data-status")) === "pending", "face back to pending");
    await say(r, "The new photo goes to Simba for checking, and the owner is told.");
    await cut(r);
    await L.api("POST", "/admin/logistics/documents/review", { token: await L.adminToken(), body: { subject: "face_photo", id: String(opU._id), status: "verified" } });

    // Farai quotes on Rudo's Harare cement job; the customer sees her face, the company keeps its logo
    await L.api("POST", `/logistics/job/${st.jobs.harare}/quote`, { token: st.farai.token, body: { asset_id: st.freightliner._id, amount: 270, message: "Can load at 7am. Covered tipper, 2 loaders included.", coordinates: S.units.hino.place.c, quoted_from: { coordinates: S.units.hino.place.c } } });
    const c = await actor("customer", "Customer · Rudo", st.customer);
    await go(c, `/logistics/jobs/${st.jobs.harare}`);
    await rec(c);
    await card(c, "Customer", "Farai sent a quote", "What Rudo sees on her cement job.", 3500);
    const qcard = c.page.locator(".log-qx-card").first();
    await show(c, qcard);
    const av = await qcard.locator("img.log-qx-card__avatar").getAttribute("src").catch(() => "");
    check(/logistics\/operators/.test(av || ""), "quote card shows the operator's face photo", av);
    await say(c, "The quote shows Farai's checked face photo, the person who will do the job, with her company's name.");
    await go(c, `/logistics/asset/${st.freightliner._id}`);
    const logo = c.page.locator('img[src*="nov11demo-logo"]').first();
    await logo.waitFor({ timeout: 10000 }).catch(() => {});
    check(await logo.count() > 0, "company logo shown on the owner card, separate from the face");
    if (await logo.count()) await show(c, logo);
    await say(c, "The company's own profile picture stays on the business card. The face photo and the company picture are kept separate.");
    await outro(c, "Point 6 done", "Live camera only, clear error with Try again, owner sets it once, operator updates by selfie, face shown to customers.");
    await cut(c);
  },

  async "07-small-fixes"() {
    const v = await actor("customer", "Customer · Rudo", st.customer);
    const k = st.providers.kudzai;
    await go(v, `/service-provider/${k._id}?serviceId=${k.serviceId}`);
    await v.page.waitForTimeout(1500);
    await rec(v);
    await intro(v, 7, "Smaller fixes", "New instead of 0.0, the payment promise removed, readable pickup addresses, and an optional tax certificate expiry.");
    const t = await bodyText(v);
    check(/\bNew\b/.test(t) && !/\b0\.0\b/.test(t) && !/\b0 reviews?\b/i.test(t), "profile: New, no 0.0", (t.match(/.{0,30}(0\.0|0 review).{0,30}/i) || [])[0]);
    check(!/release funds|Pay securely/i.test(t), "payment promise gone");
    await say(v, "Kudzai Hove has no reviews yet. The profile now says New instead of 0.0 (0 reviews).");
    const sim = v.page.locator(".prov-card").first();
    check(await sim.count() > 0, "similar providers shown");
    if (await sim.count()) { await show(v, sim); await say(v, "Similar providers nearby keep their score: Ruvimbo Chari has two reviews."); }
    const r2 = st.providers.ruvimbo;
    await go(v, `/service-provider/${r2._id}?serviceId=${r2.serviceId}`);
    await v.page.waitForTimeout(1500);
    const sim2 = v.page.locator(".prov-card").filter({ hasText: "Kudzai" }).first();
    check(await sim2.count() > 0 && /\bNew\b/.test(await sim2.innerText()) && !/0\.0/.test(await sim2.innerText()), "similar provider without reviews says New", await sim2.innerText().catch(() => ""));
    if (await sim2.count()) { await show(v, sim2); await say(v, "And on Ruvimbo's profile, Kudzai appears under Similar providers as New, not 0.0."); }
    await top(v);
    await say(v, "The booking panel no longer says \"Pay securely and only release funds…\". Payments aren't held, so that promise is removed.");
    await cut(v);

    // A job whose pickup came from a dropped map pin: Google's address was a plus code
    const pj = await S.postJob(st.customer, { from: { label: "464Q+H9G, Harare, Zimbabwe", c: [31.0389, -17.8461] }, to: S.places.ruwa, goods: "Office furniture", tons: 3, vehicle: "4 ton", price: 120 });
    const row = await (await db()).collection("transport_jobs").findOne({ _id: OID(pj) });
    check(!/\+/.test(row.pickup.address), "saved pickup has no plus code", row.pickup.address);
    await go(v, `/logistics/jobs/${pj}`);
    await rec(v);
    const jt = await bodyText(v);
    check(!/464Q\+H9G/.test(jt), "job page: no plus code");
    await showText(v, row.pickup.address.split(",")[0]);
    await say(v, `This pickup was a map pin whose address came back as the plus code 464Q+H9G. Simba now shows the street or suburb: ${row.pickup.address}.`);
    await cut(v);

    const e = await actor("ownerE", "Equipment owner · Chiedza", st.ownerE);
    await go(e, "/logistics/owner/verification", '.log-bizdoc[data-type="tax"]');
    await rec(e);
    const tax = e.page.locator('.log-bizdoc[data-type="tax"]');
    await show(e, tax);
    check(/Expiry date \(optional\)/.test(await tax.innerText()), "tax expiry optional");
    await say(e, "On the business documents page, the tax certificate's expiry date is now optional.");
    const biz = await L.businessDocFiles({ name: st.ownerEp.name, company: st.ownerEp.company });
    await tax.locator('input[type="file"]').first().setInputFiles(biz.tax);
    await e.page.waitForFunction(() => document.querySelector('.log-bizdoc[data-type="tax"]')?.getAttribute("data-status") === "pending", null, { timeout: 15000 }).catch(() => {});
    check((await tax.getAttribute("data-status")) === "pending", "tax uploaded without expiry");
    await say(e, "Chiedza uploads her tax clearance without an expiry date, and it goes to Simba for checking.");
    await outro(e, "Point 7 done", "New instead of 0.0, payment promise removed, street or suburb instead of plus codes, tax expiry optional.");
    await cut(e);
  },

  async "08-harare-first"() {
    const v = await actor("visitor", "Visitor (not signed in)", null, { visitor: true });
    await go(v, "/");
    await rec(v);
    await intro(v, 8, "Harare first", "With no location set, lists start with Harare, then Bulawayo, Mutare and Gweru.");
    const h = v.page.getByText("Meet our top providers", { exact: false }).first();
    await show(v, h, { block: "start" });
    await hold(v, 1500);
    const cardsTxt = await v.page.locator(".landing-prov-card").allInnerTexts();
    console.log("  top providers:", cardsTxt.map((x) => x.replace(/\s+/g, " ").slice(0, 60)));
    const t = await bodyText(v);
    check(!/Top rated in (Harare|Bulawayo)/i.test(t), "no city sections");
    check(/Harare/.test(cardsTxt[0] || "") && /Harare/.test(cardsTxt[1] || ""), "Harare providers first");
    await say(v, "Meet our top providers is now one list. There are no separate Top rated in Harare / Bulawayo sections.");
    await say(v, "Harare providers come first, then Bulawayo, Mutare and Gweru, even though some Bulawayo providers have higher ratings.");
    await pan(v, 350);
    await go(v, "/search-providers");
    await v.page.waitForTimeout(2000);
    await say(v, "The provider search with no location set starts with Harare too.");
    await pan(v, 400, 2600);
    await go(v, "/logistics/search");
    const b = v.page.getByRole("button", { name: /Search trucks/ }); if (await b.count()) await b.first().click().catch(() => {});
    await settle(v, 2000);
    const lt = await bodyText(v);
    check(lt.indexOf("Msasa, Harare") > -1 && lt.indexOf("Msasa, Harare") < lt.indexOf("Belmont, Bulawayo"), "logistics search: Harare units first");
    await showText(v, "Hino 500 Tipper");
    await say(v, "Logistics search with no location set lists Harare units first, then Bulawayo, Mutare and Gweru.");
    await pan(v, 450, 3000);
    await outro(v, "Point 8 done", "One top-providers list and both searches start with Harare when no location is set.");
    await cut(v);
  },
};

(async () => {
  let code = 0;
  try {
    console.log("▶ seed", new Date().toTimeString().slice(0, 8));
    const r = await S.seed();
    st = r.st;
    for (const [key, fn] of Object.entries(VIDEOS)) {
      video = { key, parts: [], rec: !FAST && (!ONLY.length || ONLY.some((o) => key.startsWith(o))) };
      console.log(`▶ ${key}${video.rec ? "" : " (not recorded)"}`, new Date().toTimeString().slice(0, 8));
      await fn();
      finishVideo();
    }
    fs.writeFileSync(path.join(WORK, "nov11-state.json"), JSON.stringify({ ...st, copied: r.copied }, null, 2));
  } catch (e) {
    code = 1;
    console.error("✘", e.message.split("\n").slice(0, 4).join(" | "));
    const dbg = process.env.DEBUG_DIR || WORK;
    for (const [n, a] of Object.entries(actors)) { await a.page.screenshot({ path: path.join(dbg, `FAIL-${n}.jpg`), type: "jpeg", quality: 70 }).catch(() => {}); console.error(n, a.page.url()); if (a.errors.length) console.error(a.errors.slice(-3)); if (a.apiFails.length) console.error(a.apiFails.slice(-3)); }
    fs.writeFileSync(path.join(WORK, "nov11-state.json"), JSON.stringify({ ...(st || {}), copied: S.copied }, null, 2));
  }
  console.log(failures.length ? `\n${failures.length} check(s) failed:\n - ${failures.join("\n - ")}` : "\nall checks passed");
  await L.done().catch(() => {});
  try { fs.unlinkSync(path.join(__dirname, "..", "results-record-nov11.js.json")); } catch {}
  process.exit(code || (failures.length ? 3 : 0));
})();
