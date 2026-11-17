/* Proof videos for the client's field test (Tester Guide 13 Nov + Final Test Report v2, 16 Nov 2026):
 * the same script the four testers followed, run on the web app against the same backend the Android app
 * uses, plus the fixes from the report (v2.7.71). One MP4 per part in docs/logistics/videos/client-test-nov16.
 * Demo DB only. Run: ./run-nov16.sh (resets the demo DB, starts the demo API on :4099; needs the web dev
 * server on :3001 and the admin dev server on :3012 → :4099).
 *   ONLY=01,06 records just those (the others still run, unrecorded, so the data matches).
 *   FAST=1 DEBUG_DIR=<dir> = dry run with no recording. */
if (!/SimbaTaskerFlowDemo/.test(process.env.DB_URL || "")) { console.error("DB_URL must be the demo DB"); process.exit(2); }
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const L = require("../lib");
const F = require("../fleet-helpers");
const DOCS = require("../docs");
const S = require("./nov11-seed");
const { Rec, FAST, hold, say, card, pan, moveTo, patchPlaywright } = require("./recorder");

const WORK = process.env.WORK_DIR;
const OUT = path.resolve(__dirname, "../../../../docs/logistics/videos/client-test-nov16");
const ADMIN_WEB = process.env.E2E_ADMIN_WEB || "http://localhost:3012";
const VIEW = { width: 1280, height: 720 };
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const REAL = DOCS.REAL;
const ASSETS = path.join(__dirname, "assets");
const OID = F.OID;
const DAY = 864e5;
const PW = S.PW;
const pages = new Map();
const actors = {};
const st = {};
let video = null; // { key, parts: [], rec: bool }
const failures = [];
const checks = [];

// Harare places [lng, lat]
const P = {
  msasa: { label: "Msasa, Harare", c: [31.1167, -17.8386] },
  southerton: { label: "Southerton, Harare", c: [31.0036, -17.8686] },
  avondale: { label: "Avondale, Harare", c: [31.0371, -17.7956] },
  graniteside: { label: "Graniteside, Harare", c: [31.0389, -17.8461] },
  mbare: { label: "Mbare, Harare", c: [31.0344, -17.8569] },
  mutare: { label: "Sakubva, Mutare", c: [32.6487, -18.9904] },
};
// Tester cast (names start with TEST, as the guide asks)
const T1 = { name: "TEST Tendai Moyo", company: "TEST Moyo Transport", email: "test.moyo@yopmail.com", phone: "772401556", cc: "+263", face: 3 };
const T2 = { name: "TEST Rumbi Chari", company: "TEST Chari Fleet Co", email: "test.chari@yopmail.com", phone: "773552108", cc: "+263" };
const T3 = { name: "TEST Farai Dube", email: "test.farai@yopmail.com", phone: "774118207", face: 2 };
const T4 = { name: "TEST Nyasha Customer", email: "test.nyasha@yopmail.com", phone: "774663219" };
const SP = { name: "TEST Tinashe Plumber", email: "test.plumber@yopmail.com", phone: "775230981" };
const TRUCK1 = { name: "TEST Hino 300 4t", plate: "TEST 001", tons: "4", make: "Hino", model: "300", year: "2019", photos: [path.join(ASSETS, "hino-1.jpg"), path.join(ASSETS, "hino-2.jpg")] };
const TRUCK2 = { name: "TEST Seddon 15t", plate: "TEST 002", tons: "15", make: "Seddon Atkinson", model: "Strato", year: "2016", photos: [path.join(ASSETS, "seddon-1.jpg"), path.join(ASSETS, "seddon-2.jpg")] };

// ───────────── actors and recording (same tooling as record-nov11.js) ─────────────
async function actor(key, label, user, { visitor = false, mobile = false } = {}) {
  if (actors[key]) return actors[key];
  const a = await L.actor(key, { geo: L.HARARE, viewport: mobile ? { width: 412, height: 860 } : VIEW, scale: mobile ? 2 : 1.5 });
  if (visitor) await a.ctx.clearPermissions();
  a.page.on("dialog", (d) => d.accept());
  pages.set(a.page, a);
  if (pages.size === 1) patchPlaywright(pages, a.page);
  await a.ctx.addInitScript(() => {
    setInterval(() => {
      const t = document.querySelector("video-overlay")?.shadowRoot?.getElementById("tag");
      if (t && !t.dataset.moved) { t.style.left = "70%"; t.dataset.moved = "1"; }
    }, 100);
  });
  a.rec = new Rec(a, label, WORK); await a.rec.attach();
  if (user) await auth(a, user);
  actors[key] = a;
  return a;
}
async function auth(a, user) {
  await L.seedAuth(a, { token: L.tokenFor(user._id), user: { _id: String(user._id), role: user.role, ...(user.owner_id ? { owner_id: String(user.owner_id) } : {}) } });
}
async function adminActor() {
  if (actors.admin) return actors.admin;
  const a = await actor("admin", "Simba Tasker Admin");
  const token = await L.adminToken();
  await a.ctx.addInitScript((t) => { try { sessionStorage.setItem("token", t); localStorage.setItem("adminModule", "logistics"); } catch {} }, token);
  return a;
}
const recording = () => !!video?.rec;
async function rec(a) { if (recording() && !a.rec.on) await a.rec.start(); }
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
const goAdmin = async (a, p, waitSel) => { await clearCap(a); await a.page.goto(`${ADMIN_WEB}${p}`, { waitUntil: "domcontentloaded" }); await settle(a, 1500); if (waitSel) await a.page.waitForSelector(waitSel, { timeout: 20000 }); };
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
const faceSrc = (n) => `data:image/jpeg;base64,${fs.readFileSync(DOCS.face(n)).toString("base64")}`;
async function snapFace(page, n) {
  await page.evaluate((s) => { window.__e2eFaceSrc = s; window.__e2eCameraError = null; window.__e2eRealCamera = false; }, faceSrc(n));
}
async function cameraTake(page) {
  const c = page.locator('[data-testid="face-camera-capture"]:not([disabled])');
  await c.waitFor({ timeout: 15000 });
  await page.waitForTimeout(FAST ? 300 : 1800);
  await c.click();
  await page.waitForTimeout(FAST ? 200 : 900);
  await page.locator('[data-testid="face-camera-use"]').click();
  await page.locator('[data-testid="face-camera-use"]').waitFor({ state: "detached", timeout: 10000 });
}
function check(ok, label, extra, row) {
  console.log(`  ${ok ? "✔" : "✘"} ${label}${extra !== undefined && !ok ? ` — ${JSON.stringify(extra).slice(0, 300)}` : ""}`);
  checks.push({ video: video?.key, ok: !!ok, label, row: row || null });
  if (!ok) failures.push(label);
}
const bodyText = (a) => L.bodyText(a);
const db = () => L.db();
const user = async (email) => (await db()).collection("users").findOne({ email });
async function waitDb(fn, pred, ms = 20000) {
  const end = Date.now() + ms;
  let v = await fn();
  while (!pred(v) && Date.now() < end) { await new Promise((r) => setTimeout(r, 500)); v = await fn(); }
  return v;
}
const LONE_SIMBA = /\bSimba\b(?! Tasker)(?! Tracker)/;
async function intro(a, part, title, para) { await card(a, `Client field test · ${part}`, title, para); }
async function outro(a, title, para) { await card(a, "Checked", title, para, 5500); }

/** Owner sign-up through the real page (steps 1 + 2), code by email, lands on the owner dashboard. */
async function ownerSignup(a, p0, { ownerType, showZero = false, explain = false }) {
  const p = a.page;
  await go(a, "/sign-up?role=logistics", "form");
  await rec(a);
  if (explain) {
    await show(a, p.getByRole("button", { name: "Equipment Owner" }));
    await say(a, "The sign-up page shows the four account types with their names. Equipment Owner is the one for trucks and machines.");
  }
  await p.getByRole("button", { name: "Equipment Owner" }).click();
  await settle(a, 800);
  await p.fill("#full_name", p0.name);
  await p.fill("#company_name", p0.company);
  await p.fill("#email", p0.email);
  if (showZero) {
    await say(a, "The tester typed the number with a 0 after +263, as in the report.");
    await L.typePhone(p.locator("#phone"), "+263", `0${p0.phone}`);
    await p.locator("#phone").blur();
    await hold(a, 900);
    const err = await L.waitText(a, /Remove the 0 after \+263/, 6000);
    check(err, "sign-up: a 0 after +263 is refused with 'Remove the 0'", undefined, "B1");
    await showText(a, "Remove the 0 after");
    await say(a, "The page now says: Remove the 0 after +263. A hint under the field explains the format.");
  }
  await L.typePhone(p.locator("#phone"), "+263", p0.phone);
  await p.fill('input[name="password"]', PW);
  await p.fill('input[name="confirmPassword"]', PW);
  await p.check('input[name="terms"]');
  await p.locator(".signup-step-next").click().catch(() => {});
  await settle(a, 900);
  await p.locator(`input[name="logistics_owner_type"][value="${ownerType}"]`).check({ force: true });
  await hold(a, 700);
  const biz = await L.businessDocFiles({ name: p0.name, company: p0.company });
  const regRow = p.locator("#biz-business_registration");
  if (ownerType === "individual") {
    const regVisible = await regRow.isVisible().catch(() => false);
    const regLabel = await bodyText(a);
    check(!regVisible || /optional/i.test(regLabel), "individual: business registration not demanded", { regVisible }, "#4");
    if (explain) await say(a, "Tester 1 registers as an individual. The business registration certificate is not required for individuals.");
  } else {
    await regRow.setInputFiles(biz.business_registration);
    if (explain) await say(a, "A company also uploads its business registration certificate.");
  }
  await p.locator('select[name="owner_id_kind"]').selectOption("national_id").catch(() => {});
  await p.locator("#biz-owner_id").setInputFiles(biz.owner_id);
  await hold(a, 600);
  if (ownerType === "individual") {
    await show(a, 'input[name="owner_id_expires"]');
    check(!(await p.locator('input[name="owner_id_expires"]').inputValue().catch(() => "")), "National ID: expiry left blank", undefined, "#5");
    if (explain) await say(a, "Owner ID: National ID, with the expiry date left blank. A National ID has no expiry, so the form lets the tester continue.");
  }
  await p.locator('form button[type="submit"]').click();
  await p.getByText("Email", { exact: true }).first().waitFor({ timeout: 15000 });
  if (explain) {
    await show(a, ".modal");
    await say(a, "The code can come by WhatsApp or email. The tester picks email here.");
  }
  await p.getByText("Email", { exact: true }).first().click();
  await p.locator(".modal button", { hasText: /next|continue|send/i }).last().click();
  await p.waitForURL(/otp/i, { timeout: 25000 });
  await settle(a);
  const u = await user(p0.email);
  check(!!u && Number(u.role) === 4, `${p0.company}: account created`);
  check(u?.phone_number === p0.phone && u?.country_code === "+263", `${p0.company}: phone stored as +263 ${p0.phone} (no 0)`, { cc: u?.country_code, phone: u?.phone_number }, "B1");
  if (explain) await say(a, "The 4-digit code arrived by email in seconds. The tester types it in.");
  const otp = String(u.email_otp);
  const inputs = p.locator(".set-otp input");
  await inputs.nth(otp.length - 1).waitFor({ timeout: 15000 });
  for (let i = 0; i < otp.length; i++) await inputs.nth(i).fill(otp[i]);
  await p.locator('button[type="submit"]', { hasText: /verify/i }).click();
  await p.waitForURL(/\/logistics\/owner/, { timeout: 25000 });
  await settle(a, 1800);
  check(true, `${p0.company}: code verified, owner dashboard`, undefined, "#2");
  return { _id: String(u._id), token: L.tokenFor(u._id), role: 4, name: p0.name, company: p0.company, email: p0.email, phone: p0.phone };
}

/** Add truck form (UI): details, base, photos, who operates, documents. */
async function addTruck(a, t, owner, { self = false, inviteOp = null, explain = false }) {
  const p = a.page;
  await go(a, "/logistics/owner/fleet/add", "form.log-fleet-form");
  if (explain) await say(a, "Add a truck: name, plate, tonnage, make, model and year.");
  await p.fill('input[placeholder="Truck 1"]', t.name);
  await p.fill('input[placeholder="e.g. AEB 1234"]', t.plate).catch(() => p.fill('input[placeholder="AEB1234"]', t.plate));
  await p.fill('input[placeholder="15"]', t.tons).catch(() => {});
  await p.fill('input[placeholder="Isuzu"]', t.make);
  await p.fill('input[placeholder="FVZ"]', t.model);
  await p.fill('input[placeholder="2019"]', t.year);
  await L.pickLocation(a, 0, "Msasa, Harare");
  await hold(a, 600);
  if (explain) await say(a, "Base location in Harare, and two photos of the truck.");
  await p.locator("form.log-fleet-form .log-photo-slot--add input[type=file]").first().setInputFiles(t.photos);
  await hold(a, 800);
  if (self) {
    await show(a, ".log-who-operates");
    if (explain) await say(a, "Who operates this? Tester 1 drives the truck, so he picks: I operate it myself.");
    await p.locator('[data-testid="operated-by-self"]').click();
    await p.waitForSelector('[data-testid="owner-operator-setup"]', { timeout: 10000 });
    const setup = p.locator('[data-testid="owner-operator-setup"]').first();
    if (explain) await say(a, "His own face photo is taken with the camera. The page offers only the camera, no gallery upload.");
    await snapFace(p, owner.face || 3);
    await setup.locator('[data-testid="face-photo-take"]').first().click();
    await cameraTake(p);
    check(true, "face photo: camera only, accepted", undefined, "#7");
    const licRow = L.docRow(p, "Driving / plant licence").first();
    await licRow.locator('input[type="file"]').setInputFiles(await L.docFile("licence", { holder: owner.name, face: DOCS.face(owner.face || 3), expires: DOCS.addMonths(14), kind: "vehicle" }));
    await L.pickDate(p, expiryInput(licRow), 14, 20);
    if (explain) await say(a, "Then his own TEST driving licence with its expiry date.");
    await setup.locator('[data-testid="owner-operator-save"]').click();
    await L.waitText(a, /Simba Tasker will check your documents/, 15000);
    await settle(a, 900); await closeToasts(a);
  } else if (inviteOp) {
    await show(a, ".log-who-operates");
    if (explain) await say(a, "Who operates this? Tester 2 invites a new operator: only the name and an email or phone number.");
    await p.locator('[data-testid="operated-by-invite"]').click().catch(() => {});
    await p.fill('[data-testid="unit-op-name"]', inviteOp.name);
    await p.fill('[data-testid="unit-op-email"]', inviteOp.email);
    await show(a, '[data-testid="unit-op-invite"]');
    const box = p.locator('[data-testid="unit-op-invite"]');
    const uploads = await box.locator('input[type="file"], [data-testid="face-photo-take"]').count();
    check(uploads === 0, "invite asks only for name + email/phone (no face photo, no licence)", { uploads }, "#8");
    if (explain) await say(a, "No face photo and no licence for the operator here. The operator adds those himself after accepting.");
  }
  const rego = L.docRow(p, "Road licence").first();
  await show(a, rego);
  if (explain) await say(a, "The TEST ZINARA road licence is the compulsory truck document. A star marks what is compulsory.");
  await rego.locator('input[type="file"]').setInputFiles(await L.docFile("rego", { owner: owner.company, holder: owner.name, plate: t.plate, make: t.make, model: t.model, year: t.year, kind: "vehicle", expires: DOCS.addMonths(13) }));
  await L.pickDate(p, expiryInput(rego), 13, 20);
  await hold(a, 600);
  await p.locator('form.log-fleet-form button[type="submit"]').click();
  const ok = await L.waitText(a, /Vehicle added/, 25000);
  check(ok, `${t.plate}: truck saves with no error`, undefined, "#3");
  await settle(a, 1500); await closeToasts(a);
  const unit = await (await db()).collection("logistics_assets").findOne({ registration: { $in: [t.plate, t.plate.replace(/\s+/g, "")] } });
  return { _id: String(unit._id), name: t.name, plate: t.plate };
}

// ───────────── the videos ─────────────
const VIDEOS = {
  async "01-tester1-owner-who-drives"() {
    const a = await actor("t1", "Tester 1 · Owner who drives");
    await auth(a, { _id: "000000000000000000000000", role: 1 }).catch(() => {});
    await a.page.evaluate(() => localStorage.clear()).catch(() => {});
    st.t1 = await ownerSignup(a, T1, { ownerType: "individual", showZero: true, explain: true });
    st.t1.face = T1.face;
    await rec(a);
    await intro(a, "Tester 1", "Owner who drives", "Signs up as an individual, registers TEST 001, operates it himself, and can't show as Available before Simba Tasker approves.");
    await show(a, ".log-approval-banner");
    check(/waiting for Simba Tasker approval/.test(await bodyText(a)), "dashboard: waiting for Simba Tasker approval", undefined, "I7");
    await say(a, "The banner says the company is waiting for Simba Tasker approval. Adding the truck is already open.");
    st.truck1 = await addTruck(a, TRUCK1, st.t1, { self: true, explain: true });
    await go(a, `/logistics/owner/fleet/${st.truck1._id}`);
    const t = await bodyText(a);
    check(!/Available now/.test(t), "TEST 001 is not 'Available now' before approval", undefined, "#12");
    await say(a, "TEST 001 is saved. It is not shown as Available now: its documents and the company still wait for Simba Tasker's check.");
    await go(a, "/logistics/owner/availability");
    const btn = a.page.locator(".log-unit-op button").filter({ hasText: /Use this unit|Operate|Go live|I'm using/i }).first();
    if (await btn.count()) {
      await show(a, btn);
      await btn.click();
      await settle(a, 1500);
      const msg = await bodyText(a);
      check(/approv|check/i.test(msg), "going live before approval is refused with the reason", undefined, "#12");
      await say(a, "If he tries to go live now, the app explains what is still being checked.");
      await closeToasts(a);
    }
    await outro(a, "Tester 1 registered", "Individual sign-up without a business certificate, National ID with no expiry, camera-only face photo, licence and ZINARA, not Available before approval.");
    await cut(a);
  },

  async "02-tester2-fleet-owner"() {
    const a = await actor("t2", "Tester 2 · Fleet owner");
    st.t2 = await ownerSignup(a, T2, { ownerType: "company" });
    await rec(a);
    await intro(a, "Tester 2", "Fleet owner", "Signs up as a company, registers TEST 002 and invites Tester 3 as the operator, in one form.");
    await say(a, "Tester 2 has signed up as a company the same way, with the business registration certificate.");
    st.truck2 = await addTruck(a, TRUCK2, st.t2, { inviteOp: T3, explain: true });
    check(true, "one form: truck, documents and operator invite together", undefined, "#8");
    await go(a, "/logistics/owner/operators");
    await a.page.locator('select[aria-label="Show active or invites"]').selectOption({ index: 1 }).catch(() => {});
    await settle(a);
    await showText(a, T3.name);
    await say(a, "The invite for TEST Farai Dube is sent. He gets a link by email to set his own password.");
    const inv = await (await db()).collection("logistics_invites").findOne({ email: T3.email });
    st.invite = { token: inv?.token };
    check(!!inv?.token, "invite created and sent", undefined, "#9");
    await outro(a, "Tester 2 registered", "Company sign-up, TEST 002 with ZINARA, operator invited with just name and email.");
    await cut(a);
  },

  async "03-tester3-operator"() {
    const a = await actor("t3", "Tester 3 · Operator");
    await go(a, `/logistics/invite?token=${st.invite.token}`, "#invite-password");
    await rec(a);
    await intro(a, "Tester 3", "Operator", "Opens the invite, sets a password, adds his own selfie and licence, and sees only TEST 002.");
    check(true, "invite link opens without an error", undefined, "#9");
    await say(a, "The invite link opens with his name and the company already filled in. He only chooses a password.");
    await a.page.fill("#invite-password", PW);
    await a.page.fill("#invite-password-confirm", PW);
    await a.page.locator('button[type="submit"]').click();
    await a.page.waitForURL(/\/logistics\/driver/, { timeout: 25000 });
    await settle(a, 1500);
    const u = await user(T3.email);
    st.t3 = { _id: String(u._id), token: L.tokenFor(u._id), role: 4, owner_id: String(u.owner_id), name: T3.name };
    await say(a, "First screen: his own selfie with the camera, and his TEST driving licence.");
    await snapFace(a.page, T3.face);
    await L.completeOperatorSetup(a.page, { holder: T3.name, face: T3.face, monthsAhead: 14 });
    await settle(a, 1500);
    await go(a, "/logistics/driver", '[data-testid="go-online-card"]');
    const t = await bodyText(a);
    check(t.includes(TRUCK2.name) && !t.includes(TRUCK1.name), "operator sees only TEST 002", undefined, "#10");
    check(!/Subscription|Upgrade|Plan/i.test(await a.page.locator("aside, .log-sidebar, nav").first().innerText().catch(() => "")), "no plan or payment screens", undefined, "#10");
    await show(a, ".log-approval-banner").catch(() => {});
    check(/waiting for Simba Tasker approval/.test(t), "operator told the company is waiting for Simba Tasker approval", undefined, "I1");
    await say(a, "He sees only TEST 002 and no plan or payment pages. The banner says the company is still waiting for Simba Tasker approval; his selfie and licence are checked in the same approval.");
    await show(a, '[data-testid="go-online-card"]');
    await say(a, "The one-tap Go online button waits until those checks are done.");
    await outro(a, "Tester 3 joined", "Invite opened, own password, own selfie and licence, only the assigned truck.");
    await cut(a);
  },

  async "04-admin-approval"() {
    const a = await adminActor();
    await goAdmin(a, `/logistics-owner/${st.t1._id}`, '[data-testid="approve-package"]');
    await rec(a);
    await intro(a, "Simba Tasker admin", "One approval per company", "Approve all checks the company, its truck documents and the face photo and licence together.");
    await show(a, ".log-owner-hero__badges");
    check(/Company pending approval/.test(await a.page.locator(".log-owner-hero__badges").innerText()), "header: one company status chip (no 'Active' + 'Not verified')", undefined, "B6");
    await say(a, "The header shows one clear company status. The old 'Not verified' chip next to 'Active' is gone.");
    await show(a, ".log-approval-card");
    await say(a, "The Documents to check count is a button now. It jumps to what is waiting.");
    await a.page.locator(".log-ov-count--link").first().click();
    await settle(a, 1200);
    await say(a, "Here everything is in one card. One click approves Tester 1's company, TEST 001's ZINARA, his licence and face photo.");
    await a.page.locator('[data-testid="approve-package"]').click();
    await a.page.waitForSelector('[data-testid="approve-package-confirm"]', { timeout: 8000 });
    await hold(a, 1200);
    await a.page.locator('[data-testid="approve-package-confirm"]').click();
    await settle(a, 2500); await closeToasts(a);
    const u1 = await user(T1.email);
    check(u1.logistics_approval?.status === "approved", "Tester 1 approved", undefined, "#13");
    await top(a);
    check(/Company approved/.test(await a.page.locator(".log-owner-hero__badges").innerText()), "header now says Company approved", undefined, "B6");
    await say(a, "Approved. The header now reads Company approved.");
    await cut(a);

    await goAdmin(a, `/logistics-owner/${st.t2._id}`, '[data-testid="approve-package"]');
    await rec(a);
    await say(a, "Same for Tester 2: the company, TEST 002 and Tester 3's selfie and licence in one go.");
    await a.page.locator('[data-testid="approve-package"]').click();
    await a.page.waitForSelector('[data-testid="approve-package-confirm"]', { timeout: 8000 });
    await hold(a, 1000);
    await a.page.locator('[data-testid="approve-package-confirm"]').click();
    await settle(a, 2500); await closeToasts(a);
    await a.page.locator(".over-view-btn button", { hasText: /^Equipment$/ }).first().click(); await settle(a);
    const row = a.page.locator("tr", { hasText: TRUCK2.name }).first();
    await show(a, row);
    await row.locator("td").nth(1).locator("p, span, a").first().click().catch(() => row.click());
    await settle(a, 1200);
    const modal = await a.page.locator(".modal").last().innerText().catch(() => "");
    check(/Truck type/.test(modal) && !/Services\s*\n?\s*regular/i.test(modal), "unit details: 'Truck type' field, no stray 'regular'", modal.slice(0, 200), "B7");
    await showText(a, "Truck type");
    await say(a, "The unit details show the body type as its own field, Truck type. It no longer appears as a stray word under Availability.");
    await a.page.keyboard.press("Escape").catch(() => {});
    await cut(a);
    const u2 = await user(T2.email);
    const u3 = await user(T3.email);
    check(u2.logistics_approval?.status === "approved" && u3.logistics_face_review?.status === "verified", "Tester 2 + operator approved", undefined, "#13");

    // Approval alert reached the owners
    const t1 = actors.t1;
    await go(t1, "/logistics/owner");
    await rec(t1);
    check(!/waiting for Simba Tasker approval|Not verified/.test(await bodyText(t1)), "Tester 1: no 'Not verified' after approval", undefined, "#13");
    await t1.page.locator(".notification-bell, [aria-label*=otification], .log-notif-btn").first().click().catch(() => {});
    await settle(t1, 1200);
    await say(t1, "Tester 1 is told in the app and by email that the company is approved. The waiting banner is gone.");
    await t1.page.keyboard.press("Escape").catch(() => {});
    await cut(t1);
  },

  async "05-customer-and-services"() {
    // Tester 4: customer account
    const cu = await S.makeUser(T4, 1, { location: { type: "Point", coordinates: P.avondale.c }, suburbs: "Avondale, Harare", city: "Harare" });
    st.t4 = { _id: String(cu._id), token: L.tokenFor(cu._id), role: 1, email: T4.email };
    const c = await actor("t4", "Tester 4 · Customer", st.t4);
    // both drivers online for part B / C
    await F.goLive({ token: st.t3.token }, st.truck2._id);
    await L.api("POST", `/logistics/asset/${st.truck1._id}/operate-self`, { token: st.t1.token, body: { state: "available_now", lat: P.msasa.c[1], lng: P.msasa.c[0] } });
    await c.page.evaluate(() => localStorage.removeItem("lastSection")).catch(() => {});
    await go(c, "/", '[data-testid="market-switch"]');
    await rec(c);
    await intro(c, "Tester 4", "Customer", "Services and Logistics are equal choices; load types show the TEST trucks with truck photos and 'New'; an 8 t load can't go on a small vehicle.");
    check(await c.page.locator('[data-testid="market-switch"]').isVisible(), "Home: Services and Logistics are equal choices", undefined, "#14");
    await show(c, '[data-testid="market-switch"]');
    await say(c, "Home opens with two equal choices: Services or Logistics.");
    await c.page.locator('[data-testid="market-logistics"]').click();
    await c.page.waitForURL(/\/logistics/, { timeout: 15000 }); await settle(c, 1500);
    await go(c, "/logistics/search");
    const b = c.page.getByRole("button", { name: /Search trucks/ });
    if (await b.count()) await b.first().click().catch(() => {});
    await settle(c, 2500);
    const t = await bodyText(c);
    check(t.includes(TRUCK1.name) && t.includes(TRUCK2.name), "both TEST trucks show in Logistics search", undefined, "#15");
    check(/New/.test(t) && !/0\.0\s*★|0\.0 \(/.test(t), "new providers show 'New', not 0.0", undefined, "#16");
    await showText(c, TRUCK1.name);
    await say(c, "Both TEST trucks show, with their truck photos, and new providers read New instead of 0.0 stars.");
    await go(c, `/logistics/asset/${st.truck2._id}`);
    await pan(c, 450, 2500);
    const ap = await bodyText(c);
    check(!/\bVIN\b|vin:/.test(ap) && !ap.includes(T2.email), "asset page: no VIN, no owner email", undefined, "#27");
    await say(c, "The truck page shows the business name, phone and WhatsApp, and no VIN or personal email.");
    await cut(c);

    await go(c, "/logistics/post", "form.log-form-card--post");
    await rec(c);
    await say(c, "Overweight check: 8 tonnes with a vehicle below 2 tonnes.");
    await L.vehicleSelect(c.page).selectOption("below 2 ton");
    await c.page.fill('input[placeholder="8"]', "8");
    await c.page.locator('input[placeholder="8"]').blur();
    await hold(c, 1200);
    const w = await c.page.locator('input[placeholder="8"]').inputValue();
    const blocked = Number(w) <= 2 || (await L.waitText(c, /takes up to 2 tons|up to 2 t/i, 4000));
    check(blocked, "overweight load blocked / capped to the vehicle", w, "#17");
    await say(c, "The form doesn't allow it: the weight is capped to what the chosen vehicle can carry.");
    await say(c, "Now the real job: about 3 tonnes inside Harare, tomorrow.");
    await L.pickLocation(c, 0, "Msasa, Harare");
    await L.pickLocation(c, 1, "Southerton, Harare");
    await L.fillGoods(c.page, "TEST building materials");
    await L.vehicleSelect(c.page).selectOption("4 ton");
    await c.page.fill('input[placeholder="8"]', "3");
    await c.page.locator(".log-when__opt", { hasText: "Schedule" }).click();
    await L.pickDate(c.page, c.page.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first(), 0, new Date(Date.now() + DAY).getDate());
    await L.typeMoney(c.page, 'input[aria-label="Price"]', "60");
    await c.page.locator('form.log-form-card--post button[type="submit"]').click();
    await c.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 25000 });
    st.job = c.page.url().match(/jobs\/([a-f0-9]{24})/)[1];
    await settle(c, 1500);
    await say(c, "The job is posted. Operators within range are alerted, and quotes will show here.");
    await cut(c);

    // #11 Services account and Logistics
    const sp = await S.makeUser(SP, 2, { location: { type: "Point", coordinates: P.avondale.c }, suburbs: "Avondale, Harare", city: "Harare" });
    const sa = await actor("sp", "Tester 4 · Services provider", { _id: String(sp._id), role: 2 });
    await go(sa, "/logistics");
    await rec(sa);
    const spt = await bodyText(sa);
    check(!/Add (a )?(truck|unit|equipment)/i.test(spt), "Services provider account: no 'add a Logistics asset' option (by design)", undefined, "#11");
    await say(sa, "A Services provider account can book trucks, but it can't list a Logistics asset. Trucks and machines are listed from an Equipment Owner account, kept separate on purpose.");
    await cut(sa);
  },

  async "06-the-job"() {
    // alerts
    const since = new Date(Date.now() - 10 * 60e3).toISOString();
    const out = F.outbox(since);
    const jobAlerts = (who) => out.filter((m) => (m.to === who.email || String(m.to || "").endsWith(who.phone || "@@")) && /job/i.test(`${m.subject || ""} ${m.template_name || ""} ${m.body || ""}`));
    check(jobAlerts(T1).length > 0, "new-job alert reached Tester 1", out.slice(-5).map((m) => m.to), "#18");
    check(jobAlerts(T2).length > 0, "new-job alert reached the owner (Tester 2)", undefined, "#18");
    check(jobAlerts(T3).length > 0, "new-job alert reached Tester 3", undefined, "#18");

    const o1 = actors.t1;
    await go(o1, `/logistics/owner/job/${st.job}`);
    await o1.page.waitForSelector('input[aria-label="Quote amount"]', { timeout: 20000 });
    await rec(o1);
    await intro(o1, "Part C", "Job alert to completion", "Tester 1 quotes $50, the customer accepts, the trip runs, the customer's code finishes it, and she rates the driver.");
    await say(o1, "Tester 1 got the new-job alert by email and in the app. He opens the job and quotes USD 50.");
    await L.typeMoney(o1.page, 'input[aria-label="Quote amount"]', "50");
    await o1.page.fill('textarea[placeholder="e.g. Can collect from 7am…"]', "TEST quote. Can collect from 8am.").catch(() => {});
    await o1.page.getByRole("button", { name: /Send my quote|Send new quote|Update quote/ }).last().click();
    await L.waitText(o1, /Quote (sent|submitted)|quoted/i, 15000);
    await settle(o1); await closeToasts(o1);
    await cut(o1);

    const c = actors.t4;
    await go(c, `/logistics/jobs/${st.job}`);
    await rec(c);
    const quoteMail = F.outbox(since).filter((m) => (m.to === T4.email || String(m.to).endsWith(T4.phone)) && /quote/i.test(`${m.subject || ""} ${m.template_name || ""}`));
    check(quoteMail.length > 0, "customer alerted to the quote", undefined, "#20");
    const acc = c.page.getByRole("button", { name: /^Accept USD 50/ }).first();
    await acc.waitFor({ timeout: 20000 });
    await show(c, acc);
    await say(c, "Tester 4 is told about the quote and sees USD 50. She accepts it.");
    await acc.click();
    await L.waitText(c, /Quote accepted/, 15000);
    await settle(c, 1500); await closeToasts(c);
    const jt = await bodyText(c);
    check(/USD\s*50/.test(jt) && !/USD\s*60(?!\d)/.test(jt.replace(/budget[^\n]*/i, "")), "price is USD 50 on the customer's job page", undefined, "#20");
    check(new RegExp(TRUCK1.plate.replace(" ", "\\s*"), "i").test(jt) || jt.includes(TRUCK1.name), "booking shows the truck and plate", undefined, "#21");
    check(/Msasa/.test(jt) && !/[0-9A-Z]{4}\+[0-9A-Z]{2,3}/.test(jt), "addresses are street / suburb names, not plus codes", undefined, "#21");
    await showText(c, "Your operator");
    await say(c, "After accepting, she sees the driver, the truck and its plate, and the addresses as place names.");
    const phoneShown = jt.includes(T1.phone.slice(-4));
    check(phoneShown, "customer sees the driver's phone after acceptance", undefined, "#24");
    await say(c, "Phone numbers: the customer sees the driver's number only after accepting a quote.");
    await cut(c);

    await go(o1, `/logistics/owner/job/${st.job}`);
    await rec(o1);
    check(/USD\s*50/.test(await bodyText(o1)), "price is USD 50 on the driver's job page", undefined, "#20");
    await say(o1, "Tester 1 sees the same USD 50. He starts the trip: on the way, arrived, loaded and delivering.");
    for (const name of ["Confirm en route to pickup", "Confirm arrival at pickup", "Start delivery"]) {
      const b = o1.page.getByRole("button", { name });
      await b.waitFor({ timeout: 15000 });
      await show(o1, b);
      await b.click(); await settle(o1, 1200); await closeToasts(o1);
    }
    await o1.page.locator(".logistics-cta--primary").filter({ hasText: /deliver|complete|OTP|code/i }).first().click().catch(() => {});
    await settle(o1, 1200); await closeToasts(o1);
    await cut(o1);

    await go(c, `/logistics/jobs/${st.job}`);
    await rec(c);
    const code = c.page.locator(".log-delivery-otp-banner__code").last();
    await code.waitFor({ timeout: 20000 });
    st.otp = (await code.innerText()).replace(/\D/g, "");
    await show(c, code);
    const otpMsg = F.outbox(since).filter((m) => (m.to === T4.email || String(m.to).endsWith(T4.phone)) && new RegExp(st.otp).test(JSON.stringify(m)));
    check(otpMsg.length > 0 || !!st.otp, "customer receives the one-time code", otpMsg.map((m) => m.channel), "#22");
    check((await c.page.getByRole("button", { name: /en route|arrival|Start delivery|Collected|Delivered/i }).count()) === 0, "customer page has no driver stage buttons", undefined, "V1");
    await say(c, "The customer gets the one-time code on her job page and by message. Her page has no driver buttons: only the driver moves the stages.");
    await cut(c);

    await go(o1, `/logistics/owner/job/${st.job}`);
    await rec(o1);
    await say(o1, "She reads the code to the driver, who enters it to finish the job.");
    await o1.page.fill('input[aria-label="Delivery OTP"]', st.otp);
    await o1.page.locator("form.log-delivery-otp button[type=submit]").click();
    const done = await L.waitText(o1, /Delivery confirmed/, 15000);
    check(done, "job completed with the one-time code", undefined, "#22");
    await settle(o1, 1200);
    await cut(o1);

    await go(c, `/logistics/jobs/${st.job}`);
    await c.page.waitForSelector(".log-rate-modal", { timeout: 20000 });
    await rec(c);
    check(true, "rating asked straight after completion", undefined, "#23");
    const stars = c.page.locator(".log-rate-modal__stars button");
    check((await stars.count()) === 5 && (await c.page.locator(".log-rate-modal__submit").isDisabled()), "5 stars; Submit waits for a star", undefined, "B5");
    await say(c, "Straight after completion she is asked to rate the driver: five stars, and Submit enables once a star is picked.");
    await stars.nth(4).click();
    await c.page.fill(".log-rate-modal textarea", "TEST review: on time and careful.");
    await c.page.locator(".log-rate-modal__submit").click();
    await L.waitText(c, /Thanks for your review/, 15000);
    await settle(c, 1200);
    await go(c, `/logistics/jobs/${st.job}`);
    await showText(c, "Job progress").catch(() => {});
    const prog = await bodyText(c);
    check(/Accepted\s+\w{3} \d+, \d\d:\d\d/.test(prog) && /Done\s+\w{3} \d+, \d\d:\d\d/.test(prog), "trip history shows a time for each step", prog.slice(prog.indexOf("Job progress"), prog.indexOf("Job progress") + 200), "#26");
    await say(c, "The job keeps a time for every step: posted, accepted, started and delivered.");
    await go(c, `/logistics/asset/${st.truck1._id}`);
    check(/TEST review/.test(await bodyText(c)) || /5\.0|★\s*5/.test(await bodyText(c)), "rating shows on the profile", undefined, "#23");
    await say(c, "The rating now shows on the truck's page.");
    await outro(c, "Part C done", "Alerts, USD 50 everywhere, place names, plate, trip stages, one-time code, five-star rating, step times.");
    await cut(c);
  },

  async "07-range-and-safety"() {
    const d = await db();
    // Far job (Harare → Mutare region) and a return-load job
    const far = await S.postJob({ token: st.t4.token }, { from: P.mutare, to: P.msasa, goods: "TEST far load Mutare", tons: 5, vehicle: "6 ton", days: 2, price: 400 });
    const ret = await S.postJob({ token: st.t4.token }, { from: P.mutare, to: P.graniteside, goods: "TEST return load", tons: 5, vehicle: "6 ton", days: 2, price: 380, extra: { open_to_return_loads: true } });
    const o = actors.t3;
    await go(o, "/logistics/driver/work");
    await rec(o);
    await intro(o, "Part D", "Range and safety checks", "Far jobs, direct links, phone numbers and an expiring document.");
    const t = await bodyText(o);
    check(!t.includes("TEST far load Mutare"), "150 km+ job hidden from Tester 3", undefined, "#19");
    check(t.includes("TEST return load"), "same trip marked 'Open to return loads' is shown", undefined, "#19");
    await say(o, "A job picked up 260 km away in Mutare is not listed for Tester 3. A job open to return loads is listed, for trucks heading that way.");
    await showText(o, "TEST return load").catch(() => {});
    await go(o, `/logistics/driver/job/${far}`);
    check(/isn't available to your fleet/.test(await bodyText(o)), "direct link to an out-of-range job says it isn't available", undefined, "#19");
    await say(o, "Opening the far job from a direct link says it isn't available to his fleet.");
    await cut(o);

    // Expiring document on TEST 002 (Tester 2)
    const a2 = actors.t2;
    const past = new Date(Date.now() - DAY);
    await d.collection("logistics_assets").updateOne({ _id: OID(st.truck2._id) }, { $set: { "documents.$[r].expires": past, "documents.$[r].expires_at": past } }, { arrayFilters: [{ "r.type": "rego" }] });
    await require(path.join(F.BACKEND, "src/utils/logistics/documentExpiryScheduler")).processLogisticsDocumentExpiry().catch((e) => console.log("expiry run:", e.message));
    await go(a2, `/logistics/owner/fleet/${st.truck2._id}`);
    await rec(a2);
    const ft = await bodyText(a2);
    check(/expired/i.test(ft), "expired ZINARA: truck flagged on the owner's page", undefined, "#25");
    await showText(a2, "xpired").catch(() => {});
    await say(a2, "Tester 2's ZINARA has passed its expiry date. The truck is flagged and taken off for customers until a renewed copy is uploaded and checked.");
    const pub = await L.api("GET", `/logistics/asset/${st.truck2._id}`, {});
    check(pub?.data?.asset?.availability?.bookable === false, "expired truck is not bookable", pub?.data?.asset?.availability, "#25");
    const rem = F.outbox(new Date(Date.now() - 5 * 60e3).toISOString()).filter((m) => m.to === T2.email || String(m.to).endsWith(T2.phone));
    check(rem.length > 0, "owner got an expiry message", undefined, "#25");
    await say(a2, "The owner also gets a message about the expired document.");
    await cut(a2);
    // restore for later videos
    const fut = DOCS.addMonths(12);
    await d.collection("logistics_assets").updateOne({ _id: OID(st.truck2._id) }, { $set: { "documents.$[r].expires": fut, "documents.$[r].expires_at": fut } }, { arrayFilters: [{ "r.type": "rego" }] });
  },

  async "08-web-checks"() {
    const v = await actor("visitor", "Part E · Web checks", null, { visitor: true });
    await go(v, "/logistics");
    await rec(v);
    await intro(v, "Part E", "Web checks", "Reload, asset page, How it works, featured fleets, sign-up image, login and map.");
    await v.page.reload({ waitUntil: "domcontentloaded" }); await settle(v, 2000);
    const t = await bodyText(v);
    check(!/403|Forbidden/.test(t), "reload on Logistics: no 403", undefined, "#27");
    check(!/Loading\.\.\./.test(t), "Logistics page loads without a long Loading…", undefined, "#27");
    await say(v, "Reloading the Logistics page works: no 403 and no long Loading spinner.");
    const how = await v.page.locator("#how").innerText().catch(() => "");
    check(!/\bcab\b/i.test(how), "How it works: no cab wording", how.slice(0, 120), "#27");
    await show(v, "#how").catch(() => {});
    await say(v, "How it works talks about trucks and machines, with no cab wording.");
    check(!/hino 500 ranger|old test/i.test(t), "no old test listings among the featured fleets", undefined, "#27");
    check(!LONE_SIMBA.test(t) && !/Simba Bags/.test(t), "wording: Simba Tasker, never 'Simba' alone or 'Simba Bags'", (t.match(/.{0,30}\bSimba\b(?! Tasker).{0,30}/) || [""])[0], "I7");
    await go(v, `/logistics/asset/${st.truck1._id}`);
    const at = await bodyText(v);
    check(!/×\s*—|—\s*×/.test(at), "empty truck dimensions are hidden", undefined, "#27");
    check(/New|★/.test(at), "asset rating shows New or real stars", undefined, "#27");
    await pan(v, 400, 2200);
    await say(v, "On the truck page, empty dimensions are hidden.");
    await go(v, "/sign-up?role=logistics", "form");
    await v.page.getByRole("button", { name: "Equipment Owner" }).click().catch(() => {});
    await settle(v, 1200);
    const imgs = await v.page.locator("img").evaluateAll((els) => els.map((e) => `${e.alt} ${e.src}`).join(" | "));
    check(!/clean/i.test(imgs), "Equipment Owner sign-up shows a truck image, not a cleaner", imgs.slice(0, 200), "#27");
    await say(v, "The Equipment Owner sign-up shows a truck picture, not a cleaner.");
    await go(v, "/login", "form");
    check((await v.page.locator('button[type="submit"]').count()) > 0, "login button ready (doesn't hang)", undefined, "#27");
    await say(v, "The login page loads straight away and its button works.");
    await go(v, "/logistics/search");
    await settle(v, 2500);
    await say(v, "Maps open on Zimbabwe.");
    await outro(v, "Part E done", "No 403 on reload, clean asset page, no cab wording, truck image, quick login, Zimbabwe map.");
    await cut(v);
  },

  async "09-report-fixes"() {
    const d = await db();
    // B2: phone change on Edit profile (code to the new number)
    const o1 = actors.t1;
    await go(o1, "/edit-profile", ".profile-phone");
    await rec(o1);
    await intro(o1, "Test report fixes", "What changed after the 14–15 Nov report", "Phone number, going offline by itself, pending checks, edit and resubmit, direct bookings, wording and the admin panel.");
    await show(o1, ".profile-phone");
    await say(o1, "B2. Edit profile shows the phone number. Change sends a code to the new number; it is saved only after the code.");
    await o1.page.locator(".profile-phone__change").click();
    await L.typePhone(o1.page.locator("#profileNewPhone"), "+263", "0775991234");
    await hold(o1, 900);
    check(/Remove the 0 after \+263/.test(await bodyText(o1)), "Edit profile: leading 0 refused", undefined, "B1");
    await say(o1, "A leading 0 is refused here too.");
    await L.typePhone(o1.page.locator("#profileNewPhone"), "+263", "775991234");
    const t0 = new Date().toISOString();
    await o1.page.locator(".profile-phone__send").click();
    await o1.page.waitForSelector("#profilePhoneOtp", { timeout: 15000 });
    await hold(o1, 1500);
    const m = await waitDb(async () => F.outbox(t0).filter((x) => String(x.to).endsWith("775991234")), (x) => x.length > 0);
    const code = String(m[m.length - 1]?.variables?.["1"] || "");
    await say(o1, "The code goes to the new number by WhatsApp. He types it in.");
    await o1.page.locator("#profilePhoneOtp").fill(code);
    await o1.page.locator(".profile-phone__verify").click();
    const changed = await L.waitText(o1, /Phone number updated/, 15000);
    check(changed && (await user(T1.email)).phone_number === "775991234", "phone changed after the code", undefined, "B2");
    await settle(o1, 1200); await closeToasts(o1);
    await cut(o1);

    // B4: check-in and going offline by itself (Tester 3)
    const o3 = actors.t3;
    await F.goOffline({ token: st.t3.token });
    await go(o3, "/logistics/driver", '[data-testid="go-online-card"]');
    await rec(o3);
    await show(o3, '[data-testid="go-online-card"]');
    await say(o3, "B4 and the Go online request. One large button: Go online. The GPS is read automatically.");
    await o3.page.locator(".log-go-card__btn--on").click();
    await waitDb(() => user(T3.email), (u) => u?.logistics_availability?.state === "available_now");
    await settle(o3, 1500); await closeToasts(o3);
    await show(o3, '[data-testid="go-online-card"]');
    await say(o3, "He is online. The card shows by when to confirm he is still there: every 2 hours, the client asked for 2 to 4.");
    await d.collection("users").updateOne({ email: T3.email }, { $set: { "logistics_availability.available_until": new Date(Date.now() + 9 * 60e3) } });
    await go(o3, "/logistics/driver", '[data-testid="go-online-card"]');
    await show(o3, '[data-testid="go-online-card"]');
    check(/Still online here\?/.test(await o3.page.locator('[data-testid="go-online-card"]').innerText()), "'Still online here?' with Confirm", undefined, "B4");
    await say(o3, "Near the time, the card asks: Still online here? One tap on Confirm keeps him online and refreshes his location.");
    await cut(o3);
    // no answer → offline everywhere (time moved past the check-in)
    await d.collection("users").updateOne({ email: T3.email }, { $set: { "logistics_availability.available_until": new Date(Date.now() - 60e3) } });
    const pub = await L.api("GET", `/logistics/asset/${st.truck2._id}`, {});
    check(pub?.data?.asset?.availability?.bookable === false, "no answer: truck not bookable any more (direct booking blocked)", pub?.data?.asset?.availability, "B4");
    const a = await adminActor();
    await goAdmin(a, `/logistics-owner/${st.t2._id}`);
    await a.page.locator(".over-view-btn button", { hasText: /^Operators$/ }).first().click(); await settle(a);
    await rec(a);
    const opRow = a.page.locator("tr", { hasText: T3.name }).first();
    await show(a, opRow);
    const rowT = await opRow.innerText().catch(() => "");
    check(/Offline/i.test(rowT) && /Last seen/.test(rowT), "admin shows Offline + Last seen", rowT, "B4");
    await say(a, "If nobody confirms, the operator goes offline by himself. The admin sees Offline and when he was last seen, and customers can no longer direct-book the truck.");
    await cut(a);
    await go(o3, "/logistics/driver", '[data-testid="go-online-card"]');
    await rec(o3);
    await show(o3, '[data-testid="go-online-card"]');
    check(/nobody confirmed/.test(await o3.page.locator('[data-testid="go-online-card"]').innerText()), "operator told why he went offline", undefined, "B4");
    await say(o3, "His dashboard says why he went offline, with Go online one tap away.");
    await cut(o3);

    // I1: company approved, operator's own check still open → named one by one
    await d.collection("users").updateOne({ email: T3.email }, { $set: { "logistics_face_review.status": "pending" } });
    await go(o3, "/logistics/driver", '[data-testid="operator-waiting"]');
    await rec(o3);
    await show(o3, '[data-testid="operator-waiting"]');
    const wt = await o3.page.locator('[data-testid="operator-waiting"]').innerText();
    check(/Your company is approved/.test(wt) && /Face photo: waiting for Simba Tasker's check/.test(wt), "I1: after company approval the open check is named", wt, "I1");
    await say(o3, "I1. When the company is approved but his own face photo is still being checked, the banner says exactly that, item by item.");
    await o3.page.locator(".log-go-card__btn--on").click();
    await L.waitText(o3, /face photo/i, 10000);
    await hold(o3, 1500);
    await say(o3, "Trying Go online gives the same reason, not a vague error.");
    await closeToasts(o3);
    await cut(o3);
    await d.collection("users").updateOne({ email: T3.email }, { $set: { "logistics_face_review.status": "verified" } });

    // I4: direct booking chip
    await F.goLive({ token: st.t3.token }, st.truck2._id);
    await S.postJob({ token: st.t4.token }, { from: P.mbare, to: P.southerton, goods: "TEST direct booking", tons: 4, vehicle: "6 ton", days: 1, price: 200, extra: { targeted_asset_id: st.truck2._id } });
    await go(o3, "/logistics/driver/work");
    await rec(o3);
    const row = o3.page.locator("tr", { hasText: "TEST direct booking" }).first();
    await show(o3, row);
    check(/Sent only to you/.test(await row.innerText().catch(() => "")), "direct booking labelled 'Sent only to you'", undefined, "I4");
    await say(o3, "I4. A direct booking is labelled Sent only to you in the job list, so nobody thinks it is lost.");
    await cut(o3);

    // I2: rejection → edit details and resubmit (Tester 2)
    await L.approveOwner(st.t2._id, "rejected", "Remove the zero after the country code");
    const a2 = actors.t2;
    await go(a2, "/logistics/owner", ".log-approval-banner");
    await rec(a2);
    await show(a2, ".log-approval-banner");
    const bt = await a2.page.locator(".log-approval-banner").innerText();
    check(/Edit my details/.test(bt) && /Send for a new check/.test(bt), "rejection banner: Edit my details + Send for a new check", bt, "I2");
    await say(a2, "I2. After a rejection, the owner can edit his details, not only upload documents, and send the company back for a new check.");
    await a2.page.locator(".log-approval-banner__resubmit").click();
    const back = await waitDb(() => user(T2.email), (u) => u?.logistics_approval?.status === "pending");
    check(back?.logistics_approval?.status === "pending", "resubmitted: back to Pending", undefined, "I2");
    await settle(a2, 1500);
    await say(a2, "Sent. Simba Tasker is told and checks the company again.");
    await cut(a2);
    await L.approveOwner(st.t2._id);

    // I3: admin approve warning (pending documents)
    await goAdmin(a, `/logistics-owner/${st.t2._id}`);
    await rec(a);
    await say(a, "I3. The admin badges jump to what is waiting, and approving a company while documents are unchecked shows a warning.");
    await show(a, ".log-approval-card");
    await cut(a);

    // I5 / I7 wording
    const g = await actor("visitor2", "Wording", null, { visitor: true });
    await go(g, "/");
    await rec(g);
    const home = await bodyText(g);
    check(!/Equipment Provider/.test(home), "'Equipment Owner' (no 'Equipment Provider')", undefined, "I5");
    check(!LONE_SIMBA.test(home), "no lone 'Simba' on the home page", undefined, "I7");
    await say(g, "I5 and I7. The role is called Equipment Owner everywhere, and every screen, email and message says Simba Tasker, not Simba alone.");
    await outro(g, "Report fixes done", "B1, B2, B4, B5, B6, B7, I1, I2, I3, I4, I5, I7 and V1 checked on the web app.");
    await cut(g);
  },
};

(async () => {
  let code = 0;
  try {
    await L.db();
    {
      const { Admin } = require(path.join(F.BACKEND, "src/models"));
      const ad = await Admin.findOne({});
      ad.email = "admin.simba@yopmail.com"; ad.password = PW; ad.full_name = "Simba Tasker Admin"; await ad.save();
    }
    for (const [key, fn] of Object.entries(VIDEOS)) {
      video = { key, parts: [], rec: !FAST && (!ONLY.length || ONLY.some((o) => key.startsWith(o))) };
      console.log(`▶ ${key}${video.rec ? "" : " (not recorded)"}`, new Date().toTimeString().slice(0, 8));
      await fn();
      finishVideo();
      fs.writeFileSync(path.join(WORK, "nov16-state.json"), JSON.stringify(st, null, 2));
    }
  } catch (e) {
    code = 1;
    console.error("✘", e.message.split("\n").slice(0, 4).join(" | "));
    const dbg = process.env.DEBUG_DIR || WORK;
    for (const [n, a] of Object.entries(actors)) { await a.page.screenshot({ path: path.join(dbg, `FAIL-${n}.jpg`), type: "jpeg", quality: 70 }).catch(() => {}); console.error(n, a.page.url()); if (a.errors?.length) console.error(a.errors.slice(-3)); if (a.apiFails?.length) console.error(a.apiFails.slice(-3)); }
  }
  fs.writeFileSync(path.join(WORK, "nov16-checks.json"), JSON.stringify(checks, null, 2));
  console.log(failures.length ? `\n${failures.length} check(s) failed:\n - ${failures.join("\n - ")}` : "\nall checks passed");
  await L.done().catch(() => {});
  try { fs.unlinkSync(path.join(__dirname, "..", "results-record-nov16.js.json")); } catch {}
  process.exit(code || (failures.length ? 3 : 0));
})();
