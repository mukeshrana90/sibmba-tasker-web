/* Client videos, one per role: owner-flow / admin-flow / operator-flow / customer-flow .mp4 in docs/logistics/videos.
 * Runs the real product once, in order, on the demo DB; each role's browser is recorded only during its own steps.
 * See run.sh. FAST=1 DEBUG_DIR=… = dry run with a screenshot per step.  Cab service is off on this API. */
if (!/SimbaTaskerFlowDemo/.test(process.env.DB_URL || "")) { console.error("DB_URL must be the demo DB"); process.exit(2); }
const fs = require("fs"); const path = require("path");
const L = require("../lib"); const C = require("./zw-cast"); const D = require("./zw-docs");
const { Rec, FAST, hold, say, card, pan, patchPlaywright, sleep } = require("./recorder");
const WORK = process.env.WORK_DIR; const OUT = path.resolve(__dirname, "../../../../docs/logistics/videos");
const ADMIN_WEB = process.env.E2E_ADMIN_WEB || "http://localhost:3012";
const VIEW = { width: 1280, height: 720 };
const asset = (f) => path.join(__dirname, "assets", f);
const expiry = (months) => { const d = new Date(); d.setDate(20); d.setMonth(d.getMonth() + months); return d; };
const ymd = (d) => d.toISOString().slice(0, 10);
const OID = (x) => new L.mongoose.Types.ObjectId(String(x));
const pages = new Map(); const actors = {};
const st = {};

async function role(name, label) {
  const a = await L.actor(name, { geo: C.HARARE, viewport: VIEW, scale: 1.5 });
  a.page.on("dialog", (d) => d.accept());
  pages.set(a.page, a);
  if (pages.size === 1) patchPlaywright(pages, a.page);
  a.rec = new Rec(a, label, WORK); await a.rec.attach();
  actors[name] = a; return a;
}
const settle = async (a, ms = 1200) => { await a.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {}); await a.page.waitForTimeout(FAST ? 300 : ms); };
const clearCap = async (a) => { if (a.rec?.on) { a.rec.cap = ""; await a.page.evaluate(() => window.__v?.caption("")).catch(() => {}); } };
const go = async (a, p) => { await clearCap(a); await L.goto(a, p); await settle(a); };
/** Go through the visible menu when the link is on screen, so the viewer sees where the page lives. */
async function menu(a, label, p) {
  await clearCap(a);
  const link = a.page.locator(`aside a:visible, nav a:visible, .log-side a:visible`).filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) }).first();
  if (await link.count().catch(() => 0)) { await link.click({ timeout: 6000 }).catch(() => L.goto(a, p)); await settle(a); if (!a.page.url().includes(p)) await go(a, p); }
  else await go(a, p);
}
async function top(a) { await a.page.evaluate((b) => window.scrollTo({ top: 0, behavior: b }), FAST ? "auto" : "smooth").catch(() => {}); await hold(a, 1100); }
const scrollText = async (a, text) => {
  await a.page.getByText(text, { exact: false }).first().evaluate((e) => e.scrollIntoView({ behavior: "smooth", block: "center" }), null, { timeout: 8000 }).catch(() => {});
  await hold(a, 1000);
};
const closeToasts = async (a) => { await a.page.evaluate(() => document.querySelectorAll(".Toastify__close-button").forEach((b) => b.click())).catch(() => {}); };

// ───────────── shared forms ─────────────
async function pickPlace(a, index, search, caption) {
  if (caption) await say(a, caption);
  await L.pickLocation(a, index, search);
  await hold(a, 800);
}
async function docRowUpload(a, label, file, months) {
  const row = L.docRow(a.page, label).first();
  await row.locator('input[type="file"]').setInputFiles(file);
  if (months) await L.pickDate(a.page, row.locator(".log-doc-row__expiry input"), months, 20);
}
async function addTruck(a, u, { show = false } = {}) {
  const p = a.page;
  await go(a, "/logistics/owner/fleet/add"); await p.waitForSelector("form.log-fleet-form");
  if (show) await say(a, "Choose the category. A truck is listed under Logistic, then its details are filled in.");
  await p.fill('input[placeholder="Truck 1"]', u.name);
  await p.fill('input[placeholder="AEB1234"]', u.plate);
  await p.fill('input[placeholder="15"]', String(u.tons)).catch(() => {});
  await p.fill('input[placeholder="Isuzu"]', u.make);
  await p.fill('input[placeholder="FVZ"]', u.model);
  await p.fill('input[placeholder="2019"]', String(u.year));
  await pickPlace(a, 0, u.place, show ? "Set where the truck is based. Customers search by location, so this has to be accurate." : null);
  if (show) await say(a, "Add at least 2 real photos of the truck.");
  await p.locator("form.log-fleet-form .log-photo-slot--add input[type=file]").first().setInputFiles(u.photos.map(asset));
  if (show) await say(a, "Road licence (ZINARA) comes first and is required. Each document needs an expiry date.");
  const docInfo = { "Registration": u.plate, "Vehicle": `${u.make} ${u.model} (${u.year})`, "Owner": C.owner.company };
  const lic = expiry(3);
  await docRowUpload(a, "Road licence", await D.doc("rego", { ...docInfo, "Valid until": D.fmt(lic) }, `road-licence-${u.plate}.pdf`), 3);
  await docRowUpload(a, "Insurance", await D.doc("insurance", { ...docInfo, "Insurer": "Kopje Mutual Insurance (fictional)", "Valid until": D.fmt(expiry(4)) }, `insurance-${u.plate}.pdf`), 4);
  if (show) { await say(a, "Everything is filled in. Save the truck."); }
  await p.locator('form.log-fleet-form button[type="submit"]').click();
  await L.waitText(a, /Vehicle added/, 20000);
  if (show) await say(a, "The truck is saved. Simba now checks its documents before customers can see it.");
  await settle(a);
  const d = await L.db();
  return d.collection("logistics_assets").findOne({ registration: u.plate });
}
async function addExcavator(a, u, { show = false } = {}) {
  const p = a.page;
  await go(a, "/logistics/owner/fleet/add"); await p.waitForSelector("form.log-fleet-form");
  if (show) await say(a, "Machines are added the same way. Pick the category, here Construction, then the machine type.");
  await p.locator('form.log-fleet-form button.log-cattile[aria-label="Construction"]').click();
  await hold(a, 600);
  await p.fill('input[placeholder="JD Compact 1"]', u.name);
  await p.fill('input[placeholder="John Deere"]', u.make);
  const picks = p.locator("form.log-fleet-form .log-pick-field");
  await picks.nth(0).click();
  await p.waitForSelector(".log-modal .log-eq-tile");
  await p.locator(".log-modal .log-eq-tile", { hasText: "Excavator" }).first().click();
  await picks.nth(1).click();
  await p.waitForSelector(".log-modal .log-subpick__opt");
  await p.locator(".log-modal .log-subpick__opt").first().click();
  await pickPlace(a, 0, u.place);
  const price = 'input[aria-label="Price per day"], input[aria-label="Price per hour"]';
  if (await p.locator(price).count()) { if (show) await say(a, "Set the hire rate."); await L.typeMoney(p, price, u.dayRate); }
  await p.locator("form.log-fleet-form .log-photo-slot--add input[type=file]").first().setInputFiles(u.photos.map(asset));
  if (show) await say(a, "A machine needs at least one document for Simba to check.");
  await docRowUpload(a, "Insurance", await D.doc("insurance", { "Machine": `${u.make} ${u.model}`, "Owner": C.owner.company, "Insurer": "Kopje Mutual Insurance (fictional)", "Valid until": D.fmt(expiry(4)) }, "insurance-cat352f.pdf"), 4);
  await p.locator('form.log-fleet-form button[type="submit"]').click();
  await L.waitText(a, /Equipment added/, 20000);
  if (show) await say(a, "The excavator is saved and waits for the same document check.");
  await settle(a);
  return (await L.db()).collection("logistics_assets").findOne({ name: u.name });
}
async function invite(a, op, units, { show = false } = {}) {
  const p = a.page;
  await go(a, "/logistics/owner/operators/add"); await p.waitForSelector('input[placeholder="Full name"]');
  if (show) await say(a, "Every unit needs an operator. The owner adds each operator's details and photo.");
  await p.locator('[data-field="profile_photo"] input[type=file]').first().setInputFiles(asset(`${op.face}.jpg`));
  await p.fill('input[placeholder="Full name"]', op.name);
  await p.fill('input[placeholder="name@example.com"]', op.email);
  await L.typePhone(p.locator("#op-phone, .log-field:has(#op-phone) input[type=tel]").first(), "+263", op.phone);
  await p.fill('input[placeholder="Licence number"]', op.licence);
  if (show) await say(a, "Choose which units this operator can drive.");
  for (const u of units) await p.locator(".log-asset-pick__list li").filter({ hasText: u }).locator('input[type="checkbox"]').check();
  if (show) await say(a, "A driving or plant licence is compulsory, and Simba verifies it too.");
  await docRowUpload(a, "Driving / plant licence", await D.doc("licence", { "Holder": op.name, "Licence no.": op.licence, "Class": "2 (heavy goods)", "Valid until": D.fmt(expiry(5)) }, `licence-${op.licence}.jpg`), 5);
  if (show) { await scrollText(a, "Send invite link via"); await say(a, "Simba sends the operator an invite link by email and SMS, so they can set their own password."); }
  await p.locator("form button[type=submit]").last().click();
  await L.waitText(a, /Invite (sent|created)/, 20000);
  if (show) await say(a, "The invite has been sent.");
  await settle(a);
  return (await L.db()).collection("logistics_invites").findOne({ email: op.email });
}
async function accept(a, token, { show = false } = {}) {
  const p = a.page;
  if (!show) { await L.goto(a, `/logistics/invite?token=${token}`, "#invite-password"); await settle(a); }
  if (show) await say(a, "The operator opens the link. Their name and company are already there, so they only choose a password.");
  await p.fill("#invite-password", C.PW);
  await p.fill("#invite-password-confirm", C.PW);
  await p.locator('button[type="submit"]').click();
  await p.waitForURL(/\/logistics\/driver/, { timeout: 25000 });
  await settle(a, 1800);
}
async function goLive(a, unit, { show = false } = {}) {
  const p = a.page;
  await L.goto(a, "/logistics/driver", ".log-dash-avail-controls"); await settle(a);
  if (show) await say(a, "To get work, the operator picks the unit they are using today.");
  await p.locator(".log-unit-pick__btn").click();
  await p.locator(".log-unit-pick__opt", { hasText: unit }).first().click();
  await hold(a, 700);
  if (show) await say(a, "Then they set their status to Available.");
  await p.locator('select[aria-label="Set status"]').selectOption("available_now");
  await p.getByRole("button", { name: "Update status" }).click();
  await p.waitForTimeout(FAST ? 1500 : 2500);
  if (show) await say(a, "They are now live, and customers can find and book this unit.");
}
async function adminVerify(a, tabName) {
  const p = a.page;
  const tab = p.locator(".over-view-btn button", { hasText: new RegExp(`^${tabName}$`) }).first();
  await tab.click(); await settle(a);
  for (let i = 0; i < 14; i++) {
    const b = p.locator(".log-doc-verify").first();
    if (!(await b.count())) break;
    await b.click(); await p.waitForTimeout(FAST ? 500 : 900);
    await closeToasts(a);
  }
}
async function quote(a, jobId, amount, msg, { show = false } = {}) {
  const p = a.page;
  await L.goto(a, `/logistics/driver/job/${jobId}`); await p.waitForSelector('input[aria-label="Quote amount"]', { timeout: 15000 }); await settle(a);
  if (show) { await say(a, "The job details: route, load, date and the customer's budget."); await pan(a, 350); await say(a, "The operator enters a price and a short message for the customer."); }
  await L.typeMoney(p, 'input[aria-label="Quote amount"]', String(amount));
  await p.fill('textarea[placeholder="e.g. Can collect from 7am…"]', msg);
  await p.getByRole("button", { name: /Send my quote|Send new quote|Update quote/ }).last().click();
  await L.waitText(a, /Quote (sent|submitted)|quoted/i, 15000);
  if (show) await say(a, "The quote has gone to the customer.");
}

// ───────────── the story, in order ─────────────
const STEPS = {
  async setup() {
    await L.db();
    const { Admin } = require(path.resolve(__dirname, "../../../../sibmba-tasker-backend/src/models"));
    const ad = await Admin.findOne({});
    ad.email = C.admin.email; ad.password = C.admin.password; ad.full_name = "Simba Admin"; await ad.save();
    for (const [n, l] of [["owner", "Equipment Owner"], ["admin", "Simba Admin"], ["operator", "Operator"], ["customer", "Customer"], ["op2", ""]]) await role(n, l);
  },
  async owner1() {
    const a = actors.owner, p = a.page, o = C.owner;
    await L.goto(a, "/sign-up?role=logistics", "form"); await settle(a);
    await a.rec.start();
    await card(a, "Simba Logistics", "Equipment Owner flow", "How a fleet owner signs up, gets approved, adds trucks, machines and operators, then follows jobs and earnings.");
    await say(a, "Tatenda runs a haulage company in Harare and signs up as an Equipment Owner.");
    await p.getByRole("button", { name: "Equipment Owner" }).click();
    await say(a, "Step 1: account details, including the owner's real name and the business name.");
    await p.fill("#full_name", o.name); await p.fill("#company_name", o.company); await p.fill("#email", o.email);
    await L.typePhone(p.locator("#phone"), "+263", o.phone);
    await p.fill('input[name="password"]', C.PW); await p.fill('input[name="confirmPassword"]', C.PW);
    await p.locator(".signup-step-next").click();
    await say(a, "Step 2: business location and documents. Simba approves the company from these documents.");
    await pickPlace(a, 0, o.base);
    await say(a, "Business registration and Owner ID are required. Tax certificate and proof of address are optional.");
    await p.locator("#biz-business_registration").setInputFiles(await D.doc("business_registration", { "Company": o.company, "Reg. no.": "4821/2017", "Registered office": "Msasa, Harare", "Director": o.name }, "business-registration-mutasa.pdf"));
    await p.locator("#biz-owner_id").setInputFiles(await D.doc("owner_id", { "Name": o.name, "ID no.": "63-284731-K-42", "Date of birth": "14 Mar 1981" }, "owner-id-tatenda.jpg"));
    await p.locator('select[name="owner_id_kind"]').selectOption("national_id").catch(() => {});
    await p.locator('input[name="owner_id_expires"]').fill(ymd(expiry(48)));
    await p.locator("#biz-tax").setInputFiles(await D.doc("tax", { "Company": o.company, "TIN": "2000481723", "Valid until": D.fmt(expiry(12)) }, "tax-clearance-mutasa.pdf"));
    await p.locator('input[name="tax_expires"]').fill(ymd(expiry(12)));
    await say(a, "Accept the terms and press Sign Up. Google and Apple sign-up are available too.");
    await p.check('input[name="terms"]');
    await p.locator('form button[type="submit"]').click();
    await p.getByText("Email", { exact: true }).first().waitFor({ timeout: 12000 });
    await say(a, "Choose where to receive the verification code.");
    await p.getByText("Email", { exact: true }).first().click();
    await p.locator(".modal button", { hasText: /next|continue|send/i }).last().click();
    await p.waitForURL(/otp/i, { timeout: 25000 }); await settle(a);
    const u = await (await L.db()).collection("users").findOne({ email: o.email });
    st.owner = { _id: String(u._id), email: o.email, role: 4 };
    const otp = String(u.email_otp);
    await say(a, "Enter the 4-digit code from the email.");
    const inputs = p.locator(".set-otp input"); await inputs.nth(otp.length - 1).waitFor({ timeout: 15000 });
    for (let i = 0; i < otp.length; i++) await inputs.nth(i).fill(otp[i]);
    await p.locator('button[type="submit"]').click();
    await p.waitForURL(/\/logistics\/owner/, { timeout: 25000 }); await settle(a, 2000);
    await say(a, "The account is created, and the banner shows the company is waiting for Simba's approval.", 500);
    await go(a, "/logistics/owner/fleet");
    await say(a, "Until Simba approves the company, adding equipment and inviting operators stays locked.", 500);
    await menu(a, "Business documents", "/logistics/owner/verification");
    await say(a, "Here the owner sees each document and its check status, and can replace any of them.", 800);
    await a.rec.stop();
  },
  async admin1() {
    const a = actors.admin, p = a.page;
    await p.goto(`${ADMIN_WEB}/`, { waitUntil: "domcontentloaded" }); await p.evaluate(() => localStorage.setItem("adminModule", "logistics")); await settle(a);
    await a.rec.start();
    await card(a, "Simba Logistics", "Simba Admin flow", "How Simba approves companies, verifies every document, and oversees jobs and safety alerts.");
    await say(a, "The admin signs in to the admin panel.");
    await p.locator('input[name="email"]').fill(C.admin.email);
    await p.locator('input[name="password"]').fill(C.admin.password);
    await p.locator('button[type="submit"]').click();
    await p.waitForURL(/dashboard/i, { timeout: 20000 }); await settle(a, 1500);
    await say(a, "This is the Logistics section of the admin panel. A new owner is waiting for approval.");
    await p.goto(`${ADMIN_WEB}/logistics-owners?approval=pending`, { waitUntil: "domcontentloaded" }); await settle(a, 1500);
    await say(a, "Equipment Owners lists the companies. Mutasa Haulage is pending, so the admin opens it.");
    await p.goto(`${ADMIN_WEB}/logistics-owner/${st.owner._id}`, { waitUntil: "domcontentloaded" }); await settle(a, 1800);
    await say(a, "The owner's contact details and business location are shown here.", 500);
    await scrollText(a, "Business documents"); 
    await say(a, "The admin checks the business documents, then verifies each one.");
    for (let i = 0; i < 4; i++) { const b = p.locator(".log-doc-verify").first(); if (!(await b.count())) break; await b.click(); await p.waitForTimeout(FAST ? 500 : 1000); await closeToasts(a); }
    await say(a, "The documents are in order, so the admin approves the company.");
    await p.locator(".log-approve-btn").first().click();
    await p.locator(".log-approve-confirm").click();
    await p.waitForTimeout(FAST ? 800 : 2000); await settle(a);
    const ow = await (await L.db()).collection("users").findOne({ _id: OID(st.owner._id) }, { projection: { logistics_approval: 1 } });
    if (ow?.logistics_approval?.status !== "approved") throw new Error("approval did not stick");
    await say(a, "Approved. The owner is notified and can now add equipment and invite operators.", 500);
    await a.rec.stop();
  },
  async owner2() {
    const a = actors.owner;
    await go(a, "/logistics/owner");
    await a.rec.start();
    await card(a, "Equipment Owner", "Simba approved the company", "The owner can now build the fleet: trucks, machines and operators.");
    await say(a, "The approval banner has gone, so adding is unlocked. First, a truck.");
    st.hino = await addTruck(a, C.hino, { show: true });
    st.exc = await addExcavator(a, C.excavator, { show: true });
    await a.rec.stop();
    st.seddon = await addTruck(a, C.seddon); // off camera: a second truck for a real choice in search
    await go(a, "/logistics/owner/fleet");
    await a.rec.start();
    await card(a, "Equipment Owner", "A second truck has been added the same way", "");
    await say(a, "My Vehicles shows the trucks. They read Not bookable until documents and operators are checked.", 800);
    const inv1 = await invite(a, C.op1, [C.hino.name, C.excavator.name], { show: true });
    st.inv1 = inv1.token;
    await a.rec.stop();
    st.inv2 = (await invite(a, C.op2, [C.seddon.name, C.hino.name])).token;
    await go(a, "/logistics/owner/operators");
    await p_invites(a);
    await a.rec.start();
    await say(a, "Pending invites stay here until the operator accepts. The owner can resend or cancel them.", 800);
    await a.rec.stop();
  },
  async operator1() {
    const a = actors.operator;
    await L.goto(a, `/logistics/invite?token=${st.inv1}`, "#invite-password"); await settle(a);
    await a.rec.start();
    await card(a, "Simba Logistics", "Operator flow", "Farai drives for Mutasa Haulage. How an operator joins, goes live, quotes and completes jobs.", 6500);
    await card(a, "Before this video starts", "Farai already has her invite link", "When the owner adds an operator, Simba sends a link by email and SMS. Farai opens that link to set her password.", 9000);
    await accept(a, st.inv1, { show: true });
    await say(a, "Farai is signed in and sees her Operator dashboard.");
    await say(a, "She tries to go live, but Simba must verify her licence first.");
    await a.page.locator('select[aria-label="Set status"]').selectOption("available_now");
    await a.page.getByRole("button", { name: "Update status" }).click();
    await a.page.waitForTimeout(FAST ? 800 : 1200);
    await say(a, "The app explains why, and she'll be able to go live once it's verified.", 1200);
    await a.rec.stop();
    await accept(actors.op2, st.inv2);
  },
  async admin2() {
    const a = actors.admin, p = a.page;
    await p.goto(`${ADMIN_WEB}/logistics-owner/${st.owner._id}`, { waitUntil: "domcontentloaded" }); await settle(a, 1500);
    await a.rec.start();
    await card(a, "Simba Admin", "Verifying units and operators", "The owner has added trucks, a machine and operators. Nothing reaches customers until these documents are verified.");
    await p.locator(".over-view-btn button", { hasText: /^Equipment$/ }).first().click(); await settle(a);
    await say(a, "The Equipment tab lists each unit's documents with their expiry dates.", 500);
    await adminVerify(a, "Equipment");
    await say(a, "All unit documents are verified. Now the operators.");
    await adminVerify(a, "Operators");
    await say(a, "Each operator's licence is verified too, so they can go live.", 500);
    await a.rec.stop();
  },
  async operator2() {
    const a = actors.operator;
    await go(a, "/logistics/driver");
    await a.rec.start();
    await card(a, "Operator", "Simba verified Farai's licence", "She can now go live and receive work.", 4500);
    await goLive(a, C.hino.name, { show: true });
    await a.rec.stop();
    await goLive(actors.op2, C.seddon.name);
  },
  async owner3() {
    const a = actors.owner;
    await go(a, "/logistics/owner");
    await a.rec.start();
    await card(a, "Equipment Owner", "The fleet is live", "Documents are verified and operators are online.");
    await say(a, "The dashboard shows jobs, earnings and the fleet map, with status as customers see it.", 800);
    await pan(a, 450);
    await menu(a, "My Vehicles", "/logistics/owner/fleet");
    await say(a, "Both trucks now show Available now, because customers can book them.", 800);
    await menu(a, "Equipment", "/logistics/owner/equipment");
    await say(a, "Machines have their own list, with the same status and documents.", 500);
    await go(a, `/logistics/owner/fleet/${st.hino._id}`);
    await say(a, "Each truck's page shows its photos, documents, operators and customer status.", 500);
    await pan(a, 500);
    await menu(a, "Availability", "/logistics/owner/availability");
    await say(a, "Availability gives one view of every unit, with filters.", 800);
    await a.rec.stop();
  },
  async customer1() {
    const a = actors.customer, p = a.page, c = C.customer;
    await go(a, "/logistics");
    await a.rec.start();
    await card(a, "Simba Logistics", "Customer flow", "Rudo needs cement moved in Harare. How a customer finds trucks, posts a job, compares quotes, tracks delivery and rates the operator.");
    await say(a, "Anyone can browse Logistics without an account.", 500);
    await pan(a, 650, 3000);
    await go(a, "/logistics/search");
    await say(a, "Search finds trucks and machines by type, name or business.");
    const b = p.getByRole("button", { name: /Search trucks/ }); if (await b.count()) await b.first().click().catch(() => {});
    await settle(a, 2000);
    await top(a);
    await say(a, "Results show the truck, its capacity, location and availability.", 800);
    await go(a, `/logistics/asset/${st.hino._id}`);
    await say(a, "The truck's page shows photos, details and the business behind it.", 500);
    await pan(a, 500);
    await say(a, "To book or post a job, Rudo needs an account. She creates one.");
    await L.goto(a, "/sign-up", "form"); await settle(a);
    await p.fill("#email", c.email);
    await L.typePhone(p.locator("#phone"), "+263", c.phone);
    await p.fill('input[name="password"]', C.PW); await p.fill('input[name="confirmPassword"]', C.PW);
    await p.check('input[name="terms"]');
    await p.locator('form button[type="submit"]').click();
    await p.getByText("Email", { exact: true }).first().click({ timeout: 12000 });
    await p.locator(".modal button", { hasText: /next|continue|send/i }).last().click();
    await p.waitForURL(/otp/i, { timeout: 25000 }); await settle(a);
    const u = await (await L.db()).collection("users").findOne({ email: c.email });
    st.customer = { _id: String(u._id) };
    await say(a, "She confirms her email with the 4-digit code.");
    const otp = String(u.email_otp); const inputs = p.locator(".set-otp input"); await inputs.nth(otp.length - 1).waitFor({ timeout: 15000 });
    for (let i = 0; i < otp.length; i++) await inputs.nth(i).fill(otp[i]);
    await p.locator('button[type="submit"]').click();
    await p.waitForTimeout(4000); await settle(a);
    await afterCustomerOtp(a);
    await say(a, "Her account is ready. She switches to Logistics from the top menu.");
    await p.locator("a:visible, button:visible").filter({ hasText: /^\s*Logistics\s*$/ }).first().click({ timeout: 6000 }).catch(() => L.goto(a, "/logistics"));
    await settle(a, 1500);
    await clearCap(a);
    await p.getByRole("link", { name: "Post job", exact: true }).first().click({ timeout: 6000 }).catch(() => L.goto(a, "/logistics/post"));
    await p.waitForSelector("form.log-form-card--post"); await settle(a);
    await say(a, "Rudo posts a job so operators can quote. She sets the pickup and drop-off.");
    await pickPlace(a, 0, C.job.pickup);
    await pickPlace(a, 1, C.job.drop);
    await say(a, "She describes the goods and the vehicle size needed.");
    await L.fillGoods(p, C.job.goods);
    await L.vehicleSelect(p).selectOption(C.job.vehicle);
    await p.fill('input[placeholder="8"]', C.job.weight);
    await say(a, "Schedule is for a future date, including long-distance trips. Now is for a local job within 30 minutes.", 300);
    await p.locator(".log-when__opt", { hasText: "Schedule" }).click();
    await L.pickDate(p, p.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first(), 1, 15);
    await say(a, "She adds her budget and any special instructions.");
    await L.typeMoney(p, 'input[aria-label="Price"]', C.job.price);
    await p.fill('textarea[placeholder="Crane offload at delivery — call on arrival"]', C.job.note).catch(() => {});
    await say(a, "Then she posts the job.");
    await p.locator('form.log-form-card--post button[type="submit"]').click();
    await p.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 25000 });
    st.job = p.url().match(/jobs\/([a-f0-9]{24})/)[1]; await settle(a, 1500);
    await say(a, "The job is live. Nearby operators are alerted, and quotes will appear on this page.", 800);
    await a.rec.stop();
  },
  async operator3() {
    const a = actors.operator;
    await go(a, "/logistics/driver");
    await a.rec.start();
    await card(a, "Operator", "A new job appears", "Rudo has posted a job in Harare.", 4000);
    await menu(a, "Job Opportunities", "/logistics/driver/work");
    if (!/driver\/work/.test(a.page.url())) await go(a, "/logistics/driver/work");
    await say(a, "Job Opportunities lists open jobs that suit the operator's unit and location.", 800);
    await quote(a, st.job, 280, "Can collect from 7am. Covered tipper, 2 loaders included.", { show: true });
    await a.rec.stop();
    await quote(actors.op2, st.job, 310, "Available all day with a 30 t truck.");
  },
  async customer2() {
    const a = actors.customer, p = a.page;
    await go(a, `/logistics/jobs/${st.job}`);
    await a.rec.start();
    await card(a, "Customer", "Quotes have arrived", "Two operators have sent a price.", 4000);
    const accept = p.getByRole("button", { name: /^Accept USD 280/ }).first();
    await accept.waitFor({ timeout: 20000 });
    await accept.evaluate((e) => e.scrollIntoView({ behavior: "smooth", block: "center" })); await hold(a, 1000);
    await say(a, "Rudo compares the price, operator, rating and message side by side.", 800);
    await say(a, "She accepts the USD 280 quote.");
    await accept.click();
    await L.waitText(a, /Quote accepted/, 15000);
    await settle(a, 1500);
    await scrollText(a, "Your operator");
    await say(a, "The operator's name, photo, vehicle and contact details are now shown.", 800);
    await a.rec.stop();
  },
  async owner4() {
    const a = actors.owner;
    await go(a, "/logistics/owner/jobs");
    await a.rec.start();
    await card(a, "Equipment Owner", "Following the work", "Operators quote and run the jobs. The owner oversees them.");
    await say(a, "My Jobs lists every job the fleet has won.", 800);
    await menu(a, "Quotes", "/logistics/owner/quotes");
    await say(a, "Quotes shows what each operator offered.", 800);
    await go(a, `/logistics/owner/job/${st.job}`);
    await say(a, "The owner can view the whole job.", 500);
    await scrollText(a, "Reassign to operator");
    await say(a, "If a job needs to change hands, the owner can reassign it to another operator.", 800);
    await a.rec.stop();
  },
  async operator4() {
    const a = actors.operator, p = a.page;
    await go(a, `/logistics/driver/job/${st.job}`);
    await a.rec.start();
    await card(a, "Operator", "The customer accepted Farai's quote", "She now updates each stage of the job, and the customer sees it live.", 5000);
    await p.getByRole("button", { name: "Confirm en route to pickup" }).waitFor({ timeout: 15000 });
    await scrollText(a, "Job progress");
    await say(a, "She confirms she is on the way to the pickup.");
    await p.getByRole("button", { name: "Confirm en route to pickup" }).click(); await settle(a);
    await closeToasts(a);
    await say(a, "She confirms arrival.");
    await p.getByRole("button", { name: "Confirm arrival at pickup" }).click(); await settle(a);
    await closeToasts(a);
    await say(a, "With the cement loaded, she starts the delivery.");
    await p.getByRole("button", { name: "Start delivery" }).click(); await settle(a);
    await closeToasts(a);
    await say(a, "At the drop-off, she asks for the delivery code. The customer receives it.");
    await p.locator(".logistics-cta--primary").filter({ hasText: /deliver|complete|OTP/i }).first().click(); await settle(a);
    await closeToasts(a);
    await a.rec.stop();
  },
  async customer3() {
    const a = actors.customer, p = a.page;
    await go(a, `/logistics/jobs/${st.job}`);
    await a.rec.start();
    await card(a, "Customer", "The truck has reached the drop-off", "The job page tracks each stage.", 4000);
    await scrollText(a, "Job progress");
    await say(a, "Rudo can see every completed stage with its time.", 800);
    const code = p.locator(".log-delivery-otp-banner__code").last();
    await code.waitFor({ timeout: 15000 });
    st.otp = (await code.innerText()).replace(/\D/g, "");
    await code.evaluate((e) => e.scrollIntoView({ behavior: "smooth", block: "center" }));
    await hold(a, 900);
    await say(a, "She checks the cement, then gives Farai this delivery code. It proves the goods arrived.", 1200);
    await a.rec.stop();
  },
  async operator5() {
    const a = actors.operator, p = a.page;
    await go(a, `/logistics/driver/job/${st.job}`);
    await a.rec.start();
    await card(a, "Operator", "Finishing the delivery", "Rudo gives Farai the delivery code.", 4000);
    await say(a, "Farai enters the customer's code to complete the job.");
    await p.fill('input[aria-label="Delivery OTP"]', st.otp);
    await p.locator("form.log-delivery-otp button[type=submit]").click();
    await L.waitText(a, /Delivery confirmed/, 15000);
    await say(a, "The delivery is confirmed and the job is complete.", 800);
    await a.rec.stop();
  },
  async customer4() {
    const a = actors.customer, p = a.page;
    await go(a, `/logistics/jobs/${st.job}`);
    await a.rec.start();
    await p.waitForSelector(".log-rate-modal", { timeout: 15000 });
    await say(a, "Once the job is complete, Rudo is asked to rate her operator.");
    await p.locator(".log-rate-modal__stars button").nth(4).click();
    await p.fill(".log-rate-modal textarea", "On time and very careful with the cement. Thank you!");
    await p.locator(".log-rate-modal__submit").click();
    await L.waitText(a, /Thanks for your review/, 15000);
    await settle(a);
    await say(a, "The review is saved and appears on the operator's profile.", 500);
    await a.rec.stop();
    await goLive(actors.operator, C.excavator.name);
    await go(a, "/logistics/post"); await p.waitForSelector("form.log-form-card--post");
    await a.rec.start();
    await card(a, "Customer", "Hiring a machine", "Machines use the same steps: post, compare quotes, accept, then confirm with a code.");
    await say(a, "Rudo now needs an excavator. She picks Construction and the machine type.");
    await p.getByText("Construction", { exact: true }).first().click(); await hold(a, 700);
    const picks = p.locator("form .log-pick-field");
    await picks.nth(0).click();
    await p.waitForSelector(".log-modal .log-eq-tile");
    await p.locator(".log-modal .log-eq-tile", { hasText: "Excavator" }).first().click();
    await picks.nth(1).click();
    await p.waitForSelector(".log-modal .log-subpick__opt");
    await p.locator(".log-modal .log-subpick__opt").first().click();
    await pickPlace(a, 0, C.hire.place, "She sets the site location and the hire dates.");
    await L.pickDate(p, p.locator(".log-field").filter({ hasText: "From" }).locator(".log-dp-field input").first(), 1, 10);
    await L.pickDate(p, p.locator(".log-field").filter({ hasText: /^To/ }).locator(".log-dp-field input").first(), 0, 13).catch(() => {});
    await L.typeMoney(p, 'input[aria-label="Budget"]', C.hire.budget);
    await p.fill('textarea[placeholder="Need a tractor with slasher for 3 days…"]', C.hire.note).catch(() => {});
    await say(a, "She adds a budget and a note, then posts the request.");
    await p.locator('form button[type="submit"]').last().click();
    await p.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 25000 });
    st.hire = p.url().match(/jobs\/([a-f0-9]{24})/)[1]; await settle(a);
    await say(a, "The hire request is posted. It goes to operators with a matching machine nearby.", 500);
    await a.rec.stop();
  },
  async operator6() {
    const a = actors.operator, p = a.page;
    await go(a, "/logistics/driver");
    await a.rec.start();
    await card(a, "Operator", "Machine hire", "Farai also operates the excavator, and a hire request has come in.", 5000);
    await say(a, "She is live on the excavator, so the request reaches her. She quotes the same way.");
    await quote(a, st.hire, 340, "Operator and fuel included. Can start at 7am.");
    await say(a, "The quote has gone to the customer.");
    await a.rec.stop();
    const c = actors.customer;
    await L.goto(c, `/logistics/jobs/${st.hire}`);
    await c.page.getByRole("button", { name: /^Accept USD 340/ }).first().click({ timeout: 20000 });
    await L.waitText(c, /Quote accepted/, 15000);
    await go(a, `/logistics/driver/job/${st.hire}`);
    await a.rec.start();
    await card(a, "Operator", "Rudo accepted the hire quote", "", 3500);
    const onHire = p.getByRole("button", { name: /transit|on hire/i }).first();
    await onHire.waitFor({ timeout: 15000 });
    await say(a, "When the machine starts work, Farai marks the job as on hire.");
    await onHire.click(); await settle(a);
    await closeToasts(a);
    await say(a, "When the work ends, she enters the final amount in the job's currency.");
    const amt = 'input[aria-label*="amount" i], input[aria-label*="Final" i]';
    await p.locator(amt).first().waitFor({ timeout: 10000 });
    await L.typeMoney(p, amt, "1360");
    await p.getByRole("button", { name: /Send completion OTP|completion/i }).first().click();
    await settle(a);
    await closeToasts(a);
    await a.rec.stop();
    await L.goto(c, `/logistics/jobs/${st.hire}`);
    await c.page.locator(".log-delivery-otp-banner__code").last().waitFor({ timeout: 15000 });
    st.hireOtp = (await c.page.locator(".log-delivery-otp-banner__code").last().innerText()).replace(/\D/g, "");
    await go(a, `/logistics/driver/job/${st.hire}`);
    await a.rec.start();
    await say(a, "The customer gives her the completion code, and she enters it to finish the hire.");
    const inp = p.locator('input[aria-label*="OTP" i]').first();
    await inp.fill(st.hireOtp);
    await p.locator("form.log-delivery-otp button[type=submit]").click();
    await p.waitForTimeout(FAST ? 1200 : 2500); await settle(a);
    await say(a, "The hire is complete.", 500);
    await menu(a, "Earnings", "/logistics/driver/earnings");
    await say(a, "Earnings shows what Farai earned from each job.", 800);
    await menu(a, "My Jobs", "/logistics/driver/jobs");
    await say(a, "My Jobs keeps the history of her work.", 800);
    await menu(a, "Quotes", "/logistics/driver/quotes");
    await say(a, "Quotes lists every price she has sent.", 500);
    await menu(a, "Analytics", "/logistics/driver/analytics");
    await say(a, "Analytics summarises her performance.", 500);
    await pan(a, 400);
    await card(a, "Operator", "Safety: SOS", "Operators can raise an SOS at any time if they are in danger or have an incident.", 6000);
    await go(a, "/logistics/driver");
    const pill = p.locator("button.log-sos-pill:visible");
    await say(a, "Holding the SOS button alerts the owner, Simba and her emergency contacts.");
    if (await pill.count()) await pill.first().click();
    else { await p.locator('[aria-haspopup="true"]:visible').last().click(); await p.locator("button.log-sos-menu-item").click(); }
    await p.waitForSelector(".log-sos-hold", { timeout: 10000 });
    const box = await p.locator(".log-sos-hold").boundingBox();
    const { moveTo } = require("./recorder");
    await moveTo(a, box.x + box.width / 2, box.y + box.height / 2);
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(3600); await p.mouse.up();
    await p.waitForTimeout(2500);
    await say(a, "The SOS has been sent. The customer on a job is not told.", 800);
    await a.rec.stop();
  },
  async customer5() {
    const a = actors.customer;
    await go(a, "/logistics/jobs");
    await a.rec.start();
    await card(a, "Customer", "My jobs", "Everything Rudo has posted, in one place.", 4000);
    await say(a, "Each job shows its status, operator and price. Opening one shows its full history.", 800);
    await card(a, "Customer", "End of the customer flow", "Find a truck or machine, post a job, compare quotes, track it, confirm with a code and rate the operator.", 7000);
    await a.rec.stop();
  },
  async owner5() {
    const a = actors.owner;
    await go(a, "/logistics/owner");
    await a.rec.start();
    await card(a, "Equipment Owner", "After the jobs", "The owner reviews performance and earnings.");
    await say(a, "The dashboard now shows completed jobs and fleet earnings, and any SOS alert appears here.", 800);
    await pan(a, 450);
    await menu(a, "Earnings", "/logistics/owner/earnings");
    await say(a, "Earnings breaks down each job, including the operator's share.", 800);
    await menu(a, "Analytics", "/logistics/owner/analytics");
    await say(a, "Analytics shows jobs, income and how many units are bookable now.", 500);
    await pan(a, 500);
    await menu(a, "SOS alerts", "/logistics/owner/sos");
    await say(a, "SOS alerts from the owner's operators are listed here.", 800);
    await menu(a, "Operators", "/logistics/owner/operators");
    await say(a, "Operators shows the team, their documents and their units.", 800);
    await card(a, "Equipment Owner", "End of the Equipment Owner flow", "Sign up, get approved, add units and operators, and follow jobs and earnings.", 7000);
    await a.rec.stop();
  },
  async operator7() {
    const a = actors.operator;
    await go(a, "/logistics/driver");
    await a.rec.start();
    await card(a, "Operator", "End of the Operator flow", "Set a password from the invite link, go live, quote, run the job and confirm with the customer's code.", 7000);
    await a.rec.stop();
  },
  async admin3() {
    const a = actors.admin, p = a.page;
    const open = async (u) => { await clearCap(a); await p.goto(`${ADMIN_WEB}${u}`, { waitUntil: "domcontentloaded" }); await settle(a, 1500); };
    await open("/Dashboard");
    await a.rec.start();
    await card(a, "Simba Admin", "Overseeing the module", "Jobs have now run. The admin has a full view of what happened.");
    await say(a, "The dashboard counts owners, units, jobs and items that need attention.", 800);
    await open("/logistics-owners");
    await say(a, "Equipment Owners lists each company with its status, plan and documents waiting.", 800);
    await open(`/logistics-owner/${st.owner._id}`);
    await scrollText(a, "Bookable by customers now");
    await say(a, "Bookable by customers now shows exactly which units customers can find.", 1000);
    await open("/logistics-jobs");
    await say(a, "Logistics Jobs lists every job, with filters and the parties involved.", 800);
    await open(`/logistics-job/${st.job}`);
    await say(a, "A job's page shows the customer, owner, operator, equipment and price.", 500);
    await pan(a, 800, 3000);
    await say(a, "The status history records when each stage happened.", 500);
    await open("/SOSManagement");
    await say(a, "Operators' SOS alerts arrive in SOS Management so Simba can respond.", 800);
    const view = p.getByRole("button", { name: /View/ }).first();
    if (await view.count()) { await view.click(); await settle(a, 1500); await say(a, "Each alert shows who raised it, where and when.", 800); }
    await open(`/user-account/${st.owner._id}`);
    await say(a, "Account actions let the admin suspend or delete an account when needed.", 800);
    await card(a, "Simba Admin", "End of the Simba Admin flow", "Approve companies, verify every document, and oversee jobs and safety.", 7000);
    await a.rec.stop();
  },
};

async function p_invites(a) { await a.page.locator('select[aria-label="Show active or invites"]').selectOption({ index: 1 }).catch(() => {}); await settle(a); }
async function afterCustomerOtp(a) {
  // Tasker sign-up may ask for profile details before the customer can continue
  const p = a.page;
  console.log("  customer after OTP:", p.url());
  const nameBox = p.locator('input[name="full_name"], input[placeholder*="name" i]').first();
  if (/create|profile/i.test(p.url()) && await nameBox.count()) {
    await say(a, "She adds her name to finish her profile.");
    await nameBox.fill(C.customer.name);
    await p.locator('button[type="submit"]').last().click();
    await p.waitForTimeout(3000); await settle(a);
  }
  await L.db().then((d) => d.collection("users").updateOne({ email: C.customer.email }, { $set: { full_name: C.customer.name } }));
}

(async () => {
  let code = 0;
  const only = process.env.ENCODE_ONLY;
  try {
    for (const [name, fn] of Object.entries(STEPS)) {
      console.log(`▶ ${name}`, new Date().toTimeString().slice(0, 8));
      await fn();
      fs.writeFileSync(path.join(WORK, "state.json"), JSON.stringify(st));
    }
    if (!FAST) for (const [n, f] of [["owner", "owner-flow"], ["admin", "admin-flow"], ["operator", "operator-flow"], ["customer", "customer-flow"]]) {
      console.log("encoding", f, actors[n].rec.encode(path.join(OUT, `${f}.mp4`)));
    }
  } catch (e) {
    code = 1;
    console.error("✘", e.message.split("\n").slice(0, 3).join(" | "));
    const dbg = process.env.DEBUG_DIR || WORK;
    for (const [n, a] of Object.entries(actors)) { await a.page.screenshot({ path: path.join(dbg, `FAIL-${n}.jpg`), type: "jpeg", quality: 70 }).catch(() => {}); console.error(n, a.page.url()); if (a.errors.length) console.error(a.errors.slice(-3)); if (a.apiFails.length) console.error(a.apiFails.slice(-3)); }
  }
  await D.close(); await L.done().catch(() => {});
  try { fs.unlinkSync(path.join(__dirname, "..", "results-record-flows.js.json")); } catch {}
  process.exit(code);
})();
