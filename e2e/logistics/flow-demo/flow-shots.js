/* Client walkthrough screenshots for docs/logistics/working-flow.html.
 * Runs every Logistics flow role by role with realistic demo data on its own database (SimbaTaskerFlowDemo)
 * and saves clean JPEGs (no test banner, cab service off) to docs/logistics/flow-images/.
 *
 *   node seed-demo-db.js --reset          # fresh demo DB (reference data + demo admin)
 *   ./start-demo-api.sh                   # API :4099 on the demo DB, messaging mocked, cab off
 *   admin on :3012 → :4099 (see ../s12-admin.js header)
 *   DB_URL=mongodb://localhost:27017/SimbaTaskerFlowDemo node flow-shots.js [phase …]
 *   phases: setup jobs hire extras admin guest phone   (default: all, in that order)
 *   node seed-demo-db.js --drop           # remove the demo DB afterwards
 */
if (!/SimbaTaskerFlowDemo/.test(process.env.DB_URL || "")) {
  console.error("Set DB_URL=mongodb://localhost:27017/SimbaTaskerFlowDemo — this script must never touch the dev DB.");
  process.exit(2);
}
const fs = require("fs");
const path = require("path");
const L = require("../lib");

const OUT = path.resolve(__dirname, "../../../../docs/logistics/flow-images");
const STATE = path.join(__dirname, "state.json");
const ADMIN_WEB = process.env.E2E_ADMIN_WEB || "http://localhost:3012";
const PW = "Passw0rd!";
fs.mkdirSync(OUT, { recursive: true });
const st = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
const save = () => fs.writeFileSync(STATE, JSON.stringify(st, null, 2));
const OID = (x) => new L.mongoose.Types.ObjectId(String(x));
const wait = (a, ms) => a.page.waitForTimeout(ms);
const shotsTaken = [];
// remember every browser so a failed phase can save what each one was showing
const actors = [];
const _actor = L.actor;
L.actor = async (...args) => { const a = await _actor(...args); actors.push(a); return a; };

/** Clean JPEG of the viewport (or an element / full page). */
async function snap(a, name, { el, full = false } = {}) {
  await a.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await wait(a, 600);
  const file = path.join(OUT, `${name}.jpg`);
  const opts = { path: file, type: "jpeg", quality: 82 };
  if (el) await a.page.locator(el).first().screenshot(opts);
  else await a.page.screenshot({ ...opts, fullPage: full });
  shotsTaken.push(name);
  console.log("  📸", name);
}
async function scrollTo(a, sel) {
  await a.page.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {});
  await a.page.evaluate(() => window.scrollBy(0, -90));
  await wait(a, 400);
}
async function scrollText(a, text) {
  const loc = a.page.getByText(text, { exact: false }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await a.page.evaluate(() => window.scrollBy(0, -120));
  await wait(a, 400);
}
async function asUser(name, user, opts) {
  const a = await L.actor(name, opts);
  a.page.on("dialog", (dl) => dl.accept());
  await L.seedAuth(a, { token: L.tokenFor(user._id), user });
  return a;
}
async function docs(a, labels, monthsAhead = 8) {
  const pdf = path.join(__dirname, "doc.pdf");
  if (!fs.existsSync(pdf)) fs.writeFileSync(pdf, "%PDF-1.4\n%demo\n");
  for (const label of labels) {
    const row = a.page.locator(".log-doc-row").filter({ hasText: label }).first();
    await row.locator('input[type="file"]').setInputFiles(pdf);
    await L.pickDate(a.page, row.locator(".log-doc-row__expiry input"), monthsAhead, 20);
  }
}
async function setStatus(a, unitName, state = "available_now") {
  await L.goto(a, "/logistics/driver", ".log-dash-avail-controls");
  if (unitName) {
    await a.page.locator(".log-unit-pick__btn").click();
    await a.page.locator(".log-unit-pick__opt", { hasText: unitName }).first().click();
    await wait(a, 800);
  }
  await a.page.locator('select[aria-label="Set status"]').selectOption(state);
  await a.page.getByRole("button", { name: "Update status" }).click();
  await wait(a, 3000);
}
async function holdSos(a, shotHold, shotSent) {
  const pill = a.page.locator("button.log-sos-pill:visible");
  if (await pill.count()) await pill.first().click();
  else {
    await a.page.locator('[aria-haspopup="true"]:visible').last().click();
    await a.page.locator("button.log-sos-menu-item").click();
  }
  await a.page.waitForSelector(".log-sos-hold", { timeout: 10000 });
  await snap(a, shotHold);
  const box = await a.page.locator(".log-sos-hold").boundingBox();
  await a.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await a.page.mouse.down();
  await wait(a, 3600);
  await a.page.mouse.up();
  await wait(a, 2500);
  await snap(a, shotSent);
}
async function quoteUI(a, jobId, amount, msg) {
  await L.goto(a, `/logistics/driver/job/${jobId}`);
  await a.page.waitForSelector('input[aria-label="Quote amount"]', { timeout: 15000 });
  await L.typeMoney(a.page, 'input[aria-label="Quote amount"]', String(amount));
  await a.page.fill('textarea[placeholder="e.g. Can collect from 7am…"]', msg);
}
async function sendQuote(a) {
  await a.page.getByRole("button", { name: /Send my quote|Send new quote|Update quote/ }).last().click();
  await L.waitText(a, /Quote (sent|submitted)|quoted/i);
}

// ───────────────────────────── phases ─────────────────────────────
const PHASES = {
  /** Owner sign-up → pending approval → units + documents → operator invites → admin approves → operators live */
  async setup() {
    const d = await L.db();
    st.RUN = Date.now().toString(36).slice(-5);
    const R = st.RUN;
    // Owner signs up
    const o = await L.actor("owner");
    o.page.on("dialog", (dl) => dl.accept());
    const email = "tendai@moyohaulage.demo";
    const phone = `77${String(Date.now()).slice(-7)}`;
    await L.goto(o, "/sign-up?role=logistics", "form");
    await o.page.getByRole("button", { name: "Equipment Owner" }).click();
    await o.page.fill("#email", email);
    await o.page.locator("#phone").click();
    await o.page.locator("#phone").press("End");
    await o.page.locator("#phone").pressSequentially(phone, { delay: 20 });
    await o.page.fill('input[name="password"]', PW);
    await o.page.fill('input[name="confirmPassword"]', PW);
    await o.page.check('input[name="terms"]');
    await snap(o, "owner-01-signup");
    await o.page.locator('form button[type="submit"]').click();
    await o.page.getByText("Email", { exact: true }).first().click({ timeout: 10000 });
    await snap(o, "owner-02-code-choice");
    await o.page.locator(".modal button", { hasText: /next|continue|send/i }).last().click();
    await o.page.waitForURL(/otp/i, { timeout: 15000 });
    const u = await d.collection("users").findOne({ email });
    const otp = String(u.email_otp);
    const inputs = o.page.locator("input");
    if ((await inputs.count()) >= 4) for (let i = 0; i < 4; i++) await inputs.nth(i).fill(otp[i]);
    else await inputs.first().fill(otp);
    await o.page.locator('button[type="submit"]').click();
    await o.page.waitForURL(/\/logistics\/owner/, { timeout: 20000 });
    st.owner = { _id: String(u._id), email, role: 4 };
    await d.collection("users").updateOne({ _id: u._id }, { $set: { full_name: "Tendai Moyo", company_name: "Moyo Haulage & Plant" } });
    await o.page.reload();
    await o.page.locator(".log-approval-banner").first().waitFor({ timeout: 10000 }).catch(() => {});
    await snap(o, "owner-03-pending-approval");

    // Trucks (with ZINARA + insurance) and an excavator
    const addTruck = async (name, plate, tons, make, model, year, shotName) => {
      await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
      await o.page.fill('input[placeholder="Truck 1"]', name);
      await o.page.fill('input[placeholder="AEB1234"]', plate);
      await o.page.fill('input[placeholder="15"]', String(tons)).catch(() => {});
      await o.page.fill('input[placeholder="Isuzu"]', make);
      await o.page.fill('input[placeholder="FVZ"]', model);
      await o.page.fill('input[placeholder="2019"]', String(year));
      await o.page.locator(".log-location-btn").first().click();
      await o.page.waitForSelector(".simba-book-loc-modal", { timeout: 10000 });
      await wait(o, 3000);
      await o.page.locator(".simba-book-loc-modal .btn-primary").click();
      await wait(o, 500);
      await docs(o, ["Road licence", "Insurance"]);
      if (shotName) {
        await o.page.evaluate(() => window.scrollTo(0, 0));
        await snap(o, shotName);
        await scrollTo(o, ".log-doc-row");
        await snap(o, `${shotName}-documents`);
      }
      await o.page.locator('form.log-fleet-form button[type="submit"]').click();
      await L.waitText(o, /Vehicle added/);
      await wait(o, 1200);
      const a = await d.collection("logistics_assets").findOne({ registration: plate.replace(/\s/g, "") }) || await d.collection("logistics_assets").findOne({ name });
      return { _id: String(a._id), name };
    };
    st.truck = await addTruck("Isuzu FTR 6 t", `AEZ4821`, 6, "Isuzu", "FTR", 2020, "owner-04-add-truck");
    st.truck2 = await addTruck("Hino 500 15 t", `AFC2290`, 15, "Hino", "500", 2019, null);
    await d.collection("logistics_assets").updateMany({ owner_id: OID(st.owner._id) }, { $set: { capacity: null } }).catch(() => {});
    await d.collection("logistics_assets").updateOne({ _id: OID(st.truck._id) }, { $set: { capacity: { value: 6, unit: "tons" } } });
    await d.collection("logistics_assets").updateOne({ _id: OID(st.truck2._id) }, { $set: { capacity: { value: 15, unit: "tons" } } });

    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await o.page.locator('form.log-fleet-form button.log-cattile[aria-label="Construction"]').click();
    await wait(o, 500);
    await o.page.fill('input[placeholder="JD Compact 1"]', "CAT 320 Excavator").catch(async () => {
      await o.page.locator("form.log-fleet-form input").first().fill("CAT 320 Excavator");
    });
    await o.page.fill('input[placeholder="John Deere"]', "Caterpillar").catch(() => {});
    const picks = o.page.locator("form.log-fleet-form .log-pick-field");
    await picks.nth(0).click();
    await o.page.waitForSelector(".log-modal .log-eq-tile");
    await o.page.locator(".log-modal .log-eq-tile", { hasText: "Excavator" }).first().click();
    await picks.nth(1).click();
    await o.page.waitForSelector(".log-modal .log-subpick__opt");
    await o.page.locator(".log-modal .log-subpick__opt").nth(1).click().catch(async () => o.page.locator(".log-modal .log-subpick__opt").first().click());
    await o.page.locator(".log-location-btn").first().click();
    await o.page.waitForSelector(".simba-book-loc-modal");
    await wait(o, 2500);
    await o.page.locator(".simba-book-loc-modal .btn-primary").click();
    const priceSel = 'input[aria-label="Price per day"], input[aria-label="Price per hour"]';
    if (await o.page.locator(priceSel).count()) await L.typeMoney(o.page, priceSel, "150");
    await o.page.evaluate(() => window.scrollTo(0, 0));
    await snap(o, "owner-05-add-equipment");
    await o.page.locator('form.log-fleet-form button[type="submit"]').click();
    await L.waitText(o, /Equipment added/);
    const ex = await d.collection("logistics_assets").findOne({ owner_id: OID(st.owner._id), kind: "equipment" });
    st.excavator = { _id: String(ex._id), name: ex.name };
    await L.goto(o, "/logistics/owner/fleet");
    await wait(o, 1500);
    await snap(o, "owner-06-fleet");

    // Invite two operators
    const invite = async (fullName, mail, units, shotName) => {
      await L.goto(o, "/logistics/owner/operators/add", "form");
      await o.page.fill('input[placeholder="Full name"]', fullName);
      await o.page.fill('input[placeholder="name@example.com"]', mail);
      const ph = o.page.locator("#op-phone, .log-field:has(#op-phone) input[type=tel]").first();
      await ph.click();
      await ph.press("End");
      await ph.pressSequentially(`78${String(Date.now()).slice(-7)}`, { delay: 15 });
      await o.page.fill('input[placeholder="Licence number"]', `ZW-${Math.floor(Math.random() * 900000 + 100000)}`);
      for (const u of units) await o.page.locator(".log-asset-pick__list li").filter({ hasText: u }).locator('input[type="checkbox"]').check();
      await docs(o, ["Driving / plant licence"]).catch(() => {});
      if (shotName) {
        await o.page.evaluate(() => window.scrollTo(0, 0));
        await snap(o, shotName);
        await scrollText(o, "Send invite link via");
        await snap(o, `${shotName}-send`);
      }
      await o.page.locator('form button[type="submit"]').last().click();
      await L.waitText(o, /Invite (sent|created)/);
      await wait(o, 1200);
      return d.collection("logistics_invites").findOne({ email: mail });
    };
    const inv1 = await invite("Farai Chikore", "farai@moyohaulage.demo", ["Isuzu FTR 6 t", "Hino 500 15 t"], "owner-07-invite-operator");
    const inv2 = await invite("Tawanda Mhlanga", "tawanda@moyohaulage.demo", ["Isuzu FTR 6 t", "Hino 500 15 t", "CAT 320 Excavator"], null);
    await L.goto(o, "/logistics/owner/operators");
    await o.page.locator('select[aria-label="Show active or invites"]').selectOption({ index: 1 }).catch(() => {});
    await wait(o, 1200);
    await snap(o, "owner-08-operators-invited");
    st.inv1 = inv1.token; st.inv2 = inv2.token;
    save();

    // Admin reviews the documents and approves the company
    const ad = await adminActor();
    await ad.page.goto(`${ADMIN_WEB}/logistics-owners?approval=pending`, { waitUntil: "domcontentloaded" });
    await ad.page.waitForLoadState("networkidle").catch(() => {});
    await wait(ad, 2000);
    await snap(ad, "admin-01-owners-pending");
    await ad.page.goto(`${ADMIN_WEB}/logistics-owner/${st.owner._id}`, { waitUntil: "domcontentloaded" });
    await ad.page.waitForLoadState("networkidle").catch(() => {});
    await wait(ad, 2000);
    await snap(ad, "admin-02-owner-pending");
    const tab = (t) => ad.page.locator(".over-view-btn button", { hasText: new RegExp(`^${t}$`) }).first().click();
    await tab("Equipment");
    await wait(ad, 1500);
    await ad.page.locator(".log-doc-verify").first().scrollIntoViewIfNeeded().catch(() => {});
    await ad.page.evaluate(() => window.scrollBy(0, -140));
    await snap(ad, "admin-03-review-documents");
    for (let i = 0; i < 12; i++) {
      const b = ad.page.locator(".log-doc-verify").first();
      if (!(await b.count())) break;
      await b.click();
      await wait(ad, 1200);
    }
    await ad.page.evaluate(() => window.scrollTo(0, 0));
    await snap(ad, "admin-04-documents-verified");
    await tab("Operators");
    await wait(ad, 1200);
    for (let i = 0; i < 6; i++) {
      const b = ad.page.locator(".log-doc-verify").first();
      if (!(await b.count())) break;
      await b.click();
      await wait(ad, 1200);
    }
    await tab("Overview");
    await wait(ad, 1000);
    await ad.page.locator(".log-approve-btn").first().click();
    await ad.page.locator(".log-approve-confirm").click();
    await wait(ad, 2000);
    const ow = await d.collection("users").findOne({ _id: OID(st.owner._id) }, { projection: { logistics_approval: 1 } });
    if (ow?.logistics_approval?.status !== "approved") throw new Error("approval through the admin UI did not stick");
    await ad.page.reload();
    await wait(ad, 2000);
    await snap(ad, "admin-05-owner-approved");

    // Operators accept their invites
    const accept = async (token, shotPrefix) => {
      const op = await L.actor(shotPrefix || "op");
      await L.goto(op, `/logistics/invite?token=${token}`, "#invite-password");
      if (shotPrefix) await snap(op, "operator-01-accept-invite");
      await op.page.fill("#invite-password", PW);
      await op.page.fill("#invite-password-confirm", PW);
      await op.page.locator('button[type="submit"]').click();
      await op.page.waitForURL(/\/logistics\/driver/, { timeout: 20000 });
      await wait(op, 2000);
      if (shotPrefix) await snap(op, "operator-02-first-dashboard");
      return op;
    };
    await accept(st.inv1, "farai");
    await accept(st.inv2, null);
    const f = await d.collection("users").findOne({ email: "farai@moyohaulage.demo" });
    const t = await d.collection("users").findOne({ email: "tawanda@moyohaulage.demo" });
    st.farai = { _id: String(f._id), email: f.email, role: 4, owner_id: st.owner._id };
    st.tawanda = { _id: String(t._id), email: t.email, role: 4, owner_id: st.owner._id };
    // a 20% pay share for the earnings pages
    await d.collection("users").updateMany({ _id: { $in: [f._id, t._id] } }, { $set: { "logistics_pay": { type: "percentage", value: 20 } } });
    save();

    // Owner dashboard after approval
    await L.goto(o, "/logistics/owner");
    await wait(o, 2500);
    await snap(o, "owner-09-dashboard");
  },

  /** Customer posts a Schedule job (priority) → 2 quotes → accept → operator runs it → delivery OTP → rating;
   *  plus truck-too-small, Now job and cancel. */
  async jobs() {
    const d = await L.db();
    const R = st.RUN;
    const far = await asUser("farai", st.farai);
    const taw = await asUser("tawanda", st.tawanda);
    await setStatus(far, "Isuzu FTR 6 t");
    await snap(far, "operator-03-go-live");
    await setStatus(taw, "Hino 500 15 t");

    const { User } = require(path.resolve(__dirname, "../../../../sibmba-tasker-backend/src/models"));
    const cu = (await User.findOne({ email: "rudo.ncube@mail.demo" })) || (await User.create({
      email: "rudo.ncube@mail.demo", full_name: "Rudo Ncube", role: 1, country_code: "+263", phone_number: "772345678",
      email_verified: 1, account_verified: 1, is_completeProfile: 1, password: PW,
    }));
    st.customer = { _id: String(cu._id), email: cu.email, role: 1 };
    save();
    const c = await asUser("customer", st.customer);
    await L.goto(c, "/logistics");
    await wait(c, 2500);
    await snap(c, "customer-01-hub");
    await L.goto(c, "/logistics/search");
    await c.page.getByRole("button", { name: /Search trucks/ }).click().catch(() => {});
    await wait(c, 3000);
    await snap(c, "customer-02-search");

    // Post a Schedule job with priority (UI)
    await L.goto(c, "/logistics/post", "form.log-form-card--post");
    await L.pickLocation(c, 0, null);
    await L.pickLocation(c, 1, "Chitungwiza");
    await c.page.fill('input[placeholder="e.g. Construction materials"]', "Cement — 100 bags");
    await L.vehicleSelect(c.page).selectOption("6 ton");
    await c.page.fill('input[placeholder="8"]', "5");
    await c.page.locator(".log-when__opt", { hasText: "Schedule" }).click();
    await L.pickDate(c.page, c.page.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first(), 1, 15);
    await L.typeMoney(c.page, 'input[aria-label="Price"]', "300");
    await c.page.getByText(/Priority job \(\+/).first().click();
    await c.page.fill('textarea[placeholder="Crane offload at delivery — call on arrival"]', "Please call 30 minutes before arrival.").catch(() => {});
    await c.page.evaluate(() => window.scrollTo(0, 0));
    await snap(c, "customer-03-post-job");
    await scrollText(c, "Price negotiable");
    await snap(c, "customer-03-post-job-price");
    await c.page.locator('form.log-form-card--post button[type="submit"]').click();
    await c.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 20000 });
    st.job = c.page.url().match(/jobs\/([a-f0-9]{24})/)[1];
    save();
    await wait(c, 1500);
    await snap(c, "customer-04-job-posted");

    // Operators see it and quote
    await L.goto(far, "/logistics/driver/work");
    await wait(far, 2500);
    await snap(far, "operator-04-opportunities");
    await quoteUI(far, st.job, 280, "Can collect from 7am. Covered truck, 2 loaders included.");
    await snap(far, "operator-05-quote-form");
    await scrollTo(far, 'input[aria-label="Quote amount"]');
    await snap(far, "operator-05-quote-form-total");
    await sendQuote(far);
    await quoteUI(taw, st.job, 310, "Available all day, 15 t truck.");
    await sendQuote(taw);

    const o = await asUser("owner", st.owner);
    await L.goto(o, "/logistics/owner/quotes");
    await wait(o, 2000);
    await snap(o, "owner-10-quotes");

    // Customer compares and accepts
    await L.goto(c, `/logistics/jobs/${st.job}`);
    await c.page.getByRole("button", { name: /^Accept USD 280/ }).first().waitFor({ timeout: 15000 });
    await scrollText(c, "Lowest price");
    await snap(c, "customer-05-quotes");
    await c.page.getByRole("button", { name: /^Accept USD 280/ }).first().click();
    await L.waitText(c, /Quote accepted/);
    await wait(c, 1500);
    await c.page.evaluate(() => window.scrollTo(0, 0));
    await snap(c, "customer-06-accepted");
    await scrollText(c, "Your operator");
    await snap(c, "customer-06-accepted-operator");
    await holdSos(c, "customer-16-sos-hold", "customer-17-sos-sent");
    await c.page.keyboard.press("Escape").catch(() => {});

    // Owner follows (view-only, reassign / reject)
    await L.goto(o, `/logistics/owner/job/${st.job}`);
    await wait(o, 2500);
    await snap(o, "owner-11-job-view");
    await scrollText(o, "Reassign to operator");
    await snap(o, "owner-11-job-reassign");

    // Operator runs the job
    await L.goto(far, `/logistics/driver/job/${st.job}`);
    await far.page.getByRole("button", { name: "Confirm en route to pickup" }).waitFor({ timeout: 15000 });
    await scrollText(far, "Job progress");
    await snap(far, "operator-06-job-accepted");
    for (const lbl of ["Confirm en route to pickup", "Confirm arrival at pickup"]) {
      await far.page.getByRole("button", { name: lbl }).click();
      await wait(far, 1800);
    }
    await L.goto(c, `/logistics/jobs/${st.job}`);
    await wait(c, 1500);
    await scrollText(c, "Job progress");
    await snap(c, "customer-07-tracking");
    await L.goto(far, `/logistics/driver/job/${st.job}`);
    await far.page.getByRole("button", { name: "Start delivery" }).click({ timeout: 15000 });
    await wait(far, 1800);
    await snap(far, "operator-07-in-transit");
    await far.page.locator(".logistics-cta--primary").filter({ hasText: /deliver|complete|OTP/i }).first().click();
    await wait(far, 1800);
    await L.goto(c, `/logistics/jobs/${st.job}`);
    const otpEl = c.page.locator(".log-delivery-otp-banner__code").last();
    await otpEl.waitFor({ timeout: 15000 });
    const otp = (await otpEl.innerText()).replace(/\D/g, "");
    await scrollTo(c, ".log-delivery-otp-banner__code");
    await snap(c, "customer-08-delivery-otp");
    await far.page.fill('input[aria-label="Delivery OTP"]', otp);
    await scrollTo(far, 'input[aria-label="Delivery OTP"]');
    await snap(far, "operator-08-enter-otp");
    await far.page.locator("form.log-delivery-otp button[type=submit]").click();
    await L.waitText(far, /Delivery confirmed/);
    await wait(far, 1500);
    await snap(far, "operator-09-delivered");

    // Customer rates
    await L.goto(c, `/logistics/jobs/${st.job}`);
    await c.page.waitForSelector(".log-rate-modal", { timeout: 15000 });
    await c.page.locator(".log-rate-modal__stars button").nth(4).click();
    await c.page.fill(".log-rate-modal textarea", "On time and very careful with the cement. Thank you!");
    await snap(c, "customer-09-rate");
    await c.page.locator(".log-rate-modal__submit").click();
    await L.waitText(c, /Thanks for your review/);
    await wait(c, 1200);
    await c.page.evaluate(() => window.scrollTo(0, 0));
    await snap(c, "customer-10-completed");

    // Truck too small: 12 t job, Farai is on the 6 t truck (also has the 15 t Hino)
    const big = await L.api("POST", "/logistics/job", {
      token: L.tokenFor(st.customer._id),
      body: { job_type: "transport", job_class: "corridor", load_type: "Steel beams", load_weight: { value: 12, unit: "tons" }, pickup: { address: "Msasa, Harare", coordinates: [31.1258, -17.8406] }, dropoff: { address: "Bulawayo", coordinates: [28.5833, -20.15] }, when_needed: new Date(Date.now() + 9 * 86400000).toISOString(), budget: { amount: 900, currency: "USD" }, special_notes: "Vehicle: 20 ton" },
    });
    st.bigJob = big?.data?.job?._id;
    if (st.bigJob) {
      await L.goto(far, `/logistics/driver/job/${st.bigJob}`);
      await far.page.waitForFunction(() => /carries up to/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
      await far.page.getByText(/carries up to/).first().scrollIntoViewIfNeeded().catch(() => {});
      await far.page.evaluate(() => window.scrollBy(0, 380));
      await wait(far, 500);
      await snap(far, "operator-10-truck-too-small");
    }

    // Now job: posted for right now, 30-minute countdown
    await setStatus(far, "Isuzu FTR 6 t");
    st.nowJob = await L.postTransportJob(c, { goods: "Furniture — 3-room move", mode: "now", price: "120", drop: "Borrowdale, Harare", weight: "2", vehicle: "4 ton" }).catch(() => null);
    save();
    if (st.nowJob) {
      await wait(c, 1500);
      await snap(c, "customer-11-now-job");
      await L.goto(far, "/logistics/driver/work");
      await wait(far, 2500);
      await far.page.getByText(/Local \(Now\)/).first().click().catch(() => {});
      await wait(far, 1200);
      await snap(far, "operator-11-now-opportunity");
      await quoteUI(far, st.nowJob, 110, "I'm 10 minutes away, can load now.");
      await sendQuote(far);
      await L.goto(c, `/logistics/jobs/${st.nowJob}`);
      await c.page.getByRole("button", { name: /^Accept USD 110/ }).first().click({ timeout: 15000 });
      await L.waitText(c, /Quote accepted/);
      await wait(c, 1200);
      await c.page.getByRole("button", { name: "Cancel job" }).first().click();
      await wait(c, 800);
      await snap(c, "customer-12-cancel");
      await c.page.locator(".modal, [role=dialog]").getByRole("button", { name: "Cancel job" }).click().catch(() => {});
      await wait(c, 1500);
    }
    save();
  },

  /** Equipment hire: customer posts Construction hire → operator on the excavator quotes → on hire → final amount + OTP */
  async hire() {
    const taw = await asUser("tawanda", st.tawanda);
    await setStatus(taw, "CAT 320 Excavator");
    const c = await asUser("customer", st.customer);
    await L.goto(c, "/logistics/post", "form.log-form-card--post");
    await c.page.getByText("Construction", { exact: true }).first().click();
    await wait(c, 800);
    const picks = c.page.locator("form .log-pick-field");
    await picks.nth(0).click();
    await c.page.waitForSelector(".log-modal .log-eq-tile");
    await c.page.locator(".log-modal .log-eq-tile", { hasText: "Excavator" }).first().click();
    await picks.nth(1).click();
    await c.page.waitForSelector(".log-modal .log-subpick__opt");
    const exSub = await (await L.db()).collection("logistics_assets").findOne({ _id: OID(st.excavator._id) });
    const subName = exSub?.equipment?.subtype || exSub?.sub_type || exSub?.subtype;
    const sub = subName ? c.page.locator(".log-modal .log-subpick__opt", { hasText: subName }) : c.page.locator(".log-modal .log-subpick__opt").nth(1);
    await (await sub.count() ? sub.first() : c.page.locator(".log-modal .log-subpick__opt").first()).click();
    await L.pickLocation(c, 0, null);
    await L.pickDate(c.page, c.page.locator(".log-field").filter({ hasText: "From" }).locator(".log-dp-field input").first(), 1, 10);
    await L.pickDate(c.page, c.page.locator(".log-field").filter({ hasText: /^To/ }).locator(".log-dp-field input").first(), 0, 13).catch(() => {});
    await L.typeMoney(c.page, 'input[aria-label="Budget"]', "150");
    await c.page.fill('textarea[placeholder="Need a tractor with slasher for 3 days…"]', "Foundation trenches for a 4-room house, about 4 days.").catch(() => {});
    await c.page.evaluate(() => window.scrollTo(0, 0));
    await snap(c, "customer-13-post-hire");
    await c.page.locator('form button[type="submit"]').last().click();
    await c.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 20000 });
    st.hireJob = c.page.url().match(/jobs\/([a-f0-9]{24})/)[1];
    save();

    await quoteUI(taw, st.hireJob, 140, "Operator and fuel included. Can start at 7am.");
    await snap(taw, "operator-12-hire-quote");
    await sendQuote(taw);
    await L.goto(c, `/logistics/jobs/${st.hireJob}`);
    await c.page.getByRole("button", { name: /^Accept USD 140/ }).first().click({ timeout: 15000 });
    await L.waitText(c, /Quote accepted/);

    await L.goto(taw, `/logistics/driver/job/${st.hireJob}`);
    const onHire = taw.page.getByRole("button", { name: /transit|on hire/i }).first();
    await onHire.waitFor({ timeout: 15000 });
    await onHire.click();
    await wait(taw, 2000);
    const amt = taw.page.locator('input[aria-label*="amount" i], input[aria-label*="Final" i]').first();
    await amt.waitFor({ timeout: 10000 }).catch(() => {});
    if (await amt.count()) await L.typeMoney(taw.page, 'input[aria-label*="amount" i], input[aria-label*="Final" i]', "560");
    // let the "In transit" toast go, then frame the tracker + the final amount panel
    await taw.page.locator(".Toastify__close-button").click({ multiple: true }).catch(() => {});
    await wait(taw, 1200);
    await scrollText(taw, "Hire progress");
    await snap(taw, "operator-13-final-amount");
    const tawM = await asUser("tawanda-m", st.tawanda, { mobile: true });
    await L.goto(tawM, `/logistics/driver/job/${st.hireJob}`);
    await tawM.page.waitForSelector(".log-hire-complete-amount", { timeout: 15000 });
    await tawM.page.evaluate(() => {
      const el = document.querySelector(".log-op-track-card") || document.querySelector(".log-hire-complete-amount");
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120);
    });
    await snap(tawM, "phone-operator-final-amount");
    await taw.page.getByRole("button", { name: /Send completion OTP|completion/i }).first().click().catch(() => {});
    await wait(taw, 1800);
    await L.goto(c, `/logistics/jobs/${st.hireJob}`);
    const otpEl = c.page.locator(".log-delivery-otp-banner__code").last();
    await otpEl.waitFor({ timeout: 15000 }).catch(() => {});
    const otp = (await otpEl.innerText().catch(() => "")).replace(/\D/g, "");
    await scrollTo(c, ".log-delivery-otp-banner__code");
    await snap(c, "customer-14-hire-otp");
    if (otp) {
      await L.goto(taw, `/logistics/driver/job/${st.hireJob}`);
      const inp = taw.page.locator('input[aria-label*="OTP" i]').first();
      await inp.waitFor({ timeout: 10000 });
      await inp.fill(otp);
      await taw.page.locator("form.log-delivery-otp button[type=submit]").click().catch(() => {});
      await wait(taw, 2000);
      await snap(taw, "operator-14-hire-complete");
    }
    save();
  },

  /** SOS, owner pages, operator earnings, expired licence */
  async extras() {
    const d = await L.db();
    const c = await asUser("customer", st.customer);
    await L.goto(c, "/logistics/jobs");
    await wait(c, 2000);
    await snap(c, "customer-15-my-jobs");

    const o = await asUser("owner", st.owner);
    await L.goto(o, "/logistics/owner");
    await wait(o, 2500);
    await snap(o, "owner-12-dashboard-sos");
    await L.goto(o, "/logistics/owner/earnings");
    await wait(o, 2000);
    await snap(o, "owner-13-earnings");
    await L.goto(o, "/logistics/owner/subscription");
    await wait(o, 2000);
    await snap(o, "owner-14-plans");
    await L.goto(o, `/logistics/owner/fleet/${st.truck._id}`).catch(() => {});
    await wait(o, 2000);
    await snap(o, "owner-15-unit");
    await L.goto(o, "/logistics/owner/analytics");
    await wait(o, 2500);
    await snap(o, "owner-16-analytics");

    const far = await asUser("farai", st.farai);
    await L.goto(far, "/logistics/driver/earnings");
    await wait(far, 2000);
    await snap(far, "operator-15-earnings");
    // Expired licence blocks going live
    const u = await d.collection("users").findOne({ _id: OID(st.farai._id) });
    const prev = u.logistics_documents || [];
    await d.collection("users").updateOne({ _id: u._id }, { $set: { logistics_documents: [...prev.filter((x) => x.type !== "licence"), { type: "licence", name: "licence.pdf", url: "/x.pdf", expires: new Date(Date.now() - 3 * 86400000) }] } });
    try {
      await setStatus(far, null, "offline");
      await far.page.locator('select[aria-label="Set status"]').selectOption("available_now");
      await far.page.getByRole("button", { name: "Update status" }).click();
      await L.waitText(far, /expired/i, 8000);
      await wait(far, 800);
      await snap(far, "operator-16-licence-expired");
    } finally {
      await d.collection("users").updateOne({ _id: u._id }, { $set: { logistics_documents: prev } });
    }
    await setStatus(far, "Isuzu FTR 6 t");
  },

  /** Admin panel: dashboard, jobs, job detail, SOS, account actions */
  async admin() {
    const d = await L.db();
    const ad = await adminActor();
    const go = async (p) => { await ad.page.goto(`${ADMIN_WEB}${p}`, { waitUntil: "domcontentloaded" }); await ad.page.waitForLoadState("networkidle").catch(() => {}); await wait(ad, 2000); };
    await go("/Dashboard");
    await ad.page.evaluate(() => localStorage.setItem("adminModule", "logistics"));
    await go("/Dashboard");
    await snap(ad, "admin-06-dashboard");
    await go("/logistics-owners");
    await snap(ad, "admin-07-owners");
    await go("/logistics-jobs");
    await snap(ad, "admin-08-jobs");
    await go(`/logistics-job/${st.job}`);
    await snap(ad, "admin-09-job-detail");
    await ad.page.evaluate(() => window.scrollBy(0, 900));
    await wait(ad, 600);
    await snap(ad, "admin-09-job-detail-history");
    await go("/SOSManagement");
    await snap(ad, "admin-10-sos");
    const view = ad.page.getByRole("button", { name: /View/ }).first();
    if (await view.count()) { await view.click(); await wait(ad, 2000); await snap(ad, "admin-10-sos-detail"); }
    await go("/logistics-notifications").catch(() => {});
    await go("/AddNotification");
    await snap(ad, "admin-11-announcement");
    // Account actions → Suspend dialog (not confirmed)
    await go(`/user-account/${st.owner._id}`);
    await snap(ad, "admin-12-account");
    const sus = ad.page.locator(".dlt-ac-btn a", { hasText: "Suspend Account" });
    if (await sus.count()) {
      await sus.first().click();
      await wait(ad, 1200);
      await snap(ad, "admin-13-suspend");
      await ad.page.keyboard.press("Escape");
    }
    void d;
  },

  /** Guest (not logged in) landing, search, unit page */
  async guest() {
    const g = await L.actor("guest");
    await L.goto(g, "/logistics");
    await wait(g, 2500);
    await snap(g, "guest-01-landing");
    await g.page.evaluate(() => window.scrollBy(0, 820));
    await wait(g, 800);
    await snap(g, "guest-02-landing-more");
    await L.goto(g, "/logistics/search?q=Moyo");
    await wait(g, 1500);
    const box = g.page.locator('input[type="search"], input[placeholder*="Search" i]').first();
    if (await box.count()) { await box.fill("Isuzu"); await box.press("Enter"); }
    await wait(g, 2500);
    await snap(g, "guest-03-search");
    await L.goto(g, `/logistics/asset/${st.truck._id}`);
    await wait(g, 2000);
    await snap(g, "guest-04-unit");
  },

  /** A few phone-sized shots */
  async phone() {
    const c = await asUser("customer-m", st.customer, { mobile: true });
    await L.goto(c, `/logistics/jobs/${st.job}`);
    await wait(c, 2500);
    await snap(c, "phone-customer-job");
    const far = await asUser("farai-m", st.farai, { mobile: true });
    await L.goto(far, "/logistics/driver");
    await wait(far, 2500);
    await snap(far, "phone-operator-dashboard");
    const o = await asUser("owner-m", st.owner, { mobile: true });
    await L.goto(o, "/logistics/owner");
    await wait(o, 2500);
    await snap(o, "phone-owner-dashboard");
  },
};

async function adminActor() {
  const a = await L.actor("admin");
  const token = await L.adminToken();
  await a.ctx.addInitScript((t) => { try { sessionStorage.setItem("token", t); } catch {} }, token);
  return a;
}

(async () => {
  const want = process.argv.slice(2);
  const order = ["setup", "jobs", "hire", "extras", "admin", "guest", "phone"];
  let code = 0;
  for (const ph of order.filter((p) => !want.length || want.includes(p))) {
    console.log(`\n▶ ${ph}`);
    try { await PHASES[ph](); }
    catch (e) {
      code = 1;
      console.error(`✘ ${ph} failed: ${e.message.split("\n")[0]}`);
      fs.mkdirSync(path.join(__dirname, "debug"), { recursive: true });
      for (const a of actors) await a.page.screenshot({ path: path.join(__dirname, "debug", `${ph}-${a.name}.png`) }).catch(() => {});
      for (const a of actors) if (a.errors.length) console.error(`  ${a.name} errors:`, a.errors.slice(0, 3));
      break;
    }
  }
  save();
  console.log(`\n${shotsTaken.length} screenshots → ${OUT}`);
  await L.done().catch(() => {});
  try { fs.unlinkSync(path.join(__dirname, "..", "results-flow-shots.js.json")); } catch {}
  process.exitCode = code;
})();
