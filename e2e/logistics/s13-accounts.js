/* Stage 13 — admin account actions (v2.7.36): User Accounts search, Suspend
 * (timed, owner → operators), auto-lift, Delete + Undo, Permanent delete
 * (pending until active work finishes, then anonymized), "User no longer
 * active", admins untouchable. Uses only throwaway @yopmail.com users made
 * here (realistic cast: a Harare fleet, its operator, customers, a provider). Needs the :4099 test API and the admin app on :3012 (see s12).
 */
const path = require("path");
const L = require("./lib");
const { makeOwner } = require("./upload-helpers");

const ADMIN_WEB = process.env.E2E_ADMIN_WEB || "http://localhost:3012";
const BACKEND = path.resolve(__dirname, "../../../sibmba-tasker-backend");

(async () => {
  const bundle = await fetch(`${ADMIN_WEB}/static/js/bundle.js`).then((r) => r.text()).catch(() => "");
  if (!new RegExp(`(localhost|127\\.0\\.0\\.1):${new URL(L.API).port}/api/admin`).test(bundle)) {
    console.error(`Admin app at ${ADMIN_WEB} is not on the test API — see s12 for how to start it.`);
    process.exit(2);
  }
  const db = await L.db();
  const { User } = require(path.join(BACKEND, "src/models"));
  const LogisticsAsset = require(path.join(BACKEND, "src/models/logisticsAsset"));
  const TransportJob = require(path.join(BACKEND, "src/models/transportJob"));
  const life = require(path.join(BACKEND, "src/utils/accountLifecycle"));
  const JWT = require(path.join(BACKEND, "node_modules/jsonwebtoken"));
  const admin = await db.collection("admins").findOne({});
  const H = { token: JWT.sign({ _id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: "2h" }) };
  const RUN = Date.now().toString(36);
  const oid = (id) => new L.mongoose.Types.ObjectId(String(id));
  const C = L.cast(L.loadState().RUN || RUN);
  const escRe = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const [CHD_LNG, CHD_LAT] = L.PLACES.coords.harare;

  L.sec("13.0 Throwaway fleet, customers and a running job");
  const ownerP = C.slot("owner", "s13");
  const opP = C.slot("operator", "s13");
  const owner = await makeOwner(ownerP, { vertical: "both" });
  const op = await makeOwner({ ...opP, company: undefined }, { owner_id: oid(owner._id) });
  await User.updateOne({ _id: op._id }, { $set: { owner_id: oid(owner._id), full_name: opP.name } });
  await User.updateOne({ _id: owner._id }, { $set: { company_name: ownerP.company, vertical: "both" } });
  const fleet = ownerP.company;
  const cust = await L.makeCustomer(`acct.cust.${RUN}`, 1);
  const cust2 = await L.makeCustomer(`acct.cust2.${RUN}`, 1);
  const sp = await L.makeCustomer(`acct.sp.${RUN}`, 2);
  const truck = C.unit("truck", 130);
  const unit = await LogisticsAsset.create({
    owner_id: owner._id, kind: "vehicle", name: truck.name, registration: truck.plate, make: truck.make, model: truck.model, year: truck.year,
    capacity: { value: 10, unit: "tons" }, assigned_sub_user_ids: [op._id], is_active: 1, is_deleted: 0,
    availability: { state: "on_job" },
    location: { type: "Point", coordinates: L.PLACES.coords.harare }, home_location: { type: "Point", coordinates: L.PLACES.coords.harare },
  });
  const pt = { address: L.PLACES.base, coordinates: L.PLACES.coords.harare };
  const running = await TransportJob.create({
    requester_id: cust._id, requester_role: 1, job_type: "transport", hub_category: "logistic", load_type: `Bajri (coarse sand), 8 tonnes · PO ${RUN.toUpperCase()}`,
    pickup: pt, dropoff: { address: L.PLACES.drops[1], coordinates: L.PLACES.coords.ruwa }, when_needed: new Date(Date.now() + 864e5),
    budget: { amount: 100, currency: "USD" }, status: 2, job_number: `ACC${RUN}`.toUpperCase().slice(0, 12),
    assigned: { owner_id: owner._id, driver_id: op._id, asset_id: unit._id, amount: { value: 90, currency: "USD" } },
  });
  const pendingJob = await TransportJob.create({
    requester_id: cust2._id, requester_role: 1, job_type: "transport", hub_category: "logistic", load_type: "Wheat bags, 60 quintals",
    pickup: pt, dropoff: { address: L.PLACES.drops[0], coordinates: L.PLACES.coords.chitungwiza }, when_needed: new Date(Date.now() + 864e5), budget: { amount: 50, currency: "USD" }, status: 0,
  });
  // 29 Oct 2026: an operator needs a Simba-verified licence to be live (the owner uploads it, admin verifies)
  const lic = await L.giveOperatorLicence(owner.token, op._id, { holder: opP.name, face: 3 });
  L.check(lic?.success !== false, "operator's driving licence uploaded + verified", lic?.message);
  L.check(true, `owner ${owner.email}, operator, unit, running job #${running.job_number}`);

  const a = await L.actor("admin");
  await a.ctx.addInitScript((t) => { try { sessionStorage.setItem("token", t); } catch {} }, H.token);
  const goto = async (p, wait) => {
    await a.page.goto(`${ADMIN_WEB}${p}`, { waitUntil: "domcontentloaded" });
    await a.page.waitForLoadState("networkidle").catch(() => {});
    if (wait) await L.waitText(a, wait, 15000);
    await a.page.waitForTimeout(500);
    return L.bodyText(a);
  };
  const withModule = (m) => a.page.evaluate((v) => localStorage.setItem("adminModule", v), m);
  const state = async (id) => (await db.collection("users").findOne({ _id: oid(id) }, { projection: { email: 1, phone_number: 1, full_name: 1, is_deleted: 1, status: 1, social_id: 1, device_token: 1, account_state: 1 } }));

  // Admin shows names via capName ("…Fleet Abc12"), so compare names case-insensitively
  const has = (txt, x) => txt.toLowerCase().includes(String(x).toLowerCase());
  L.sec("13.1 User Accounts page (both modules)");
  await goto("/Dashboard");
  await withModule("logistics");
  let t = await goto("/user-accounts", /User Accounts/);
  L.check(/User Accounts/.test(t), "User Accounts in the Logistics menu");
  // Names no longer share a run tag → one search per person
  const searchFor = async (term) => {
    await a.page.locator('input[type="search"]').first().fill(term);
    await a.page.waitForTimeout(1500);
    return L.bodyText(a);
  };
  const shows = (txt, u) => has(txt, u.email) || has(txt, u.name);
  {
    const tOwner = await searchFor(owner.email);
    const tOp = await searchFor(op.email);
    const tCust = await searchFor(cust.email);
    L.check(has(tOwner, fleet) && shows(tOp, op) && !shows(tCust, cust), "Logistics: owner + operator (customers hidden by the default filter)");
  }
  await withModule("tasker");
  t = await goto("/user-accounts", /User Accounts/);
  {
    const tCust = await searchFor(cust.email);
    const tSp = await searchFor(sp.email);
    const tOwner = await searchFor(owner.email);
    L.check(shows(tCust, cust) && shows(tSp, sp) && has(tOwner, fleet), "Simba Tasker: all user types");
  }
  await L.shot(a, "s13-user-accounts");
  const adm = await L.api("GET", `/admin/accounts/${admin._id}`, H);
  L.check(adm?.success === false, `admin account can't be opened / acted on (${adm?.message})`);
  const admAct = await L.api("POST", `/admin/accounts/${admin._id}/permanent-delete`, { ...H, body: { confirm: "DELETE" } });
  L.check(admAct?.success === false && (await db.collection("admins").countDocuments({ _id: admin._id })) === 1, "admin can't be deleted");

  L.sec("13.2 Account page — details, equipment, operators, documents");
  await withModule("logistics");
  t = await goto(`/user-account/${owner._id}`, new RegExp(escRe(fleet), "i"));
  L.check(has(t, truck.name) && has(t, opP.name) && /Equipment & vehicles/i.test(t) && /Operators \(1\)/i.test(t), "owner page lists equipment + operators");
  L.check(/Suspend Account/i.test(t) && /Delete Account/i.test(t) && /Permanent Delete/i.test(t), "three account cards (Suspend, Delete, Permanent Delete)");
  await L.shot(a, "s13-owner-account");

  L.sec("13.3 Suspend owner 24h → operator follows; browse yes, new work no");
  await a.page.locator(".dlt-ac-btn a", { hasText: "Suspend Account" }).click();
  await a.page.waitForSelector(".modal.show select", { timeout: 5000 });
  await a.page.locator(".modal.show select").selectOption("24h");
  await a.page.locator(".modal.show textarea").fill("Customer complaint about an overloaded trip — documents under review");
  await L.shot(a, "s13-suspend-modal");
  await a.page.locator(".modal.show button", { hasText: "Yes" }).click();
  L.check(await L.waitText(a, /Account suspended \(and 1 operator\)/, 10000), "toast: suspended (and 1 operator)");
  let so = await state(owner._id), sop = await state(op._id);
  L.check(so.account_state?.suspended && so.status === 0 && new Date(so.account_state.suspended_until) > new Date(), "owner suspended for 24h");
  L.check(sop.account_state?.suspended && String(sop.account_state.suspended_via_owner) === String(owner._id), "operator suspended with the owner");
  const opTok = L.tokenFor(op._id);
  const browse = await L.api("GET", "/logistics/me", { token: opTok });
  L.check(browse?.data?.user?.account?.suspended === true, "operator can still log in / browse (account.suspended)");
  const openJob = await db.collection("transport_jobs").findOne({ status: 0, targeted_asset_id: { $exists: false }, requester_id: { $ne: oid(owner._id) } });
  const q = await L.api("POST", `/logistics/job/${openJob._id}/quote`, { token: opTok, body: { amount: 10, asset_id: String(unit._id) } });
  L.check(q?.success === false && q?.data?.code === "ACCOUNT_SUSPENDED", `operator can't quote (${q?.data?.code})`);
  const live = await L.api("PATCH", "/logistics/me/availability", { token: opTok, body: { state: "available_now", asset_id: String(unit._id), lat: CHD_LAT, lng: CHD_LNG } });
  L.check(live?.success !== false, "operator on the running job may stay live (finish current task)");
  const st2 = await L.api("POST", `/logistics/job/${running._id}/status`, { token: opTok, body: { status: 3 } });
  L.check(st2?.success !== false || !/suspend/i.test(st2?.message || ""), `running job can still progress (${st2?.message})`);
  const search = await L.api("GET", "/logistics/assets/search?kind=vehicle&limit=100", { token: cust.token });
  L.check(!JSON.stringify(search).includes(String(unit._id)), "suspended owner's unit hidden from customers");
  const ob = await L.actor("susp-owner");
  await L.seedAuth(ob, { token: L.tokenFor(owner._id), user: { ...owner, role: 4 } });
  await ob.page.goto(`${L.WEB}/logistics/owner`, { waitUntil: "domcontentloaded" });
  L.check(await L.waitText(ob, /Account suspended by Simba admin/, 15000), "owner web shows the suspension banner");
  await L.shot(ob, "s13-owner-suspended-banner");
  await ob.ctx.close();
  // Customer + Tasker provider suspension blocks new work
  await L.api("POST", `/admin/accounts/${cust2._id}/suspend`, { ...H, body: { duration: "7d" } });
  const post = await L.api("POST", "/logistics/job", { token: cust2.token, body: { load_type: "x" } });
  L.check(post?.data?.code === "ACCOUNT_SUSPENDED", "suspended customer can't post a logistics job");
  await L.api("POST", `/admin/accounts/${sp._id}/suspend`, { ...H, body: { duration: "indefinite" } });
  const acc = await L.api("POST", "/service/updateBookingRequest", { token: sp.token, body: { bookingId: String(running._id), status: 2 } });
  L.check(acc?.data?.code === "ACCOUNT_SUSPENDED", "suspended service provider can't accept a booking");
  const prof = await L.api("GET", "/customer/getProfile", { token: sp.token });
  L.check(prof?.success === true, "suspended service provider can still browse (profile loads)");

  L.sec("13.4 Timed suspension lifts automatically");
  await db.collection("users").updateOne({ _id: oid(owner._id) }, { $set: { "account_state.suspended_until": new Date(Date.now() - 60e3) } });
  const run1 = await life.processAccountLifecycle();
  so = await state(owner._id); sop = await state(op._id);
  L.check(run1.lifted >= 1 && !so.account_state.suspended && so.status === 1 && !sop.account_state.suspended, "owner + operator active again after the time ends");
  const re = await L.api("POST", `/admin/accounts/${sp._id}/reactivate`, H);
  L.check(re?.success && !(await state(sp._id)).account_state.suspended, "indefinite suspension → Re-activate");

  L.sec("13.5 Delete (temporary) + Undo");
  await withModule("tasker");
  await goto(`/user-account/${sp._id}`, new RegExp(`${escRe(sp.name)}|${escRe(sp.email)}`, "i"));
  await a.page.locator(".dlt-ac-btn a", { hasText: "Delete Account" }).click();
  await a.page.locator(".modal.show button", { hasText: "Yes" }).click();
  L.check(await L.waitText(a, /Account deleted/, 10000), "Delete → toast");
  L.check((await state(sp._id)).is_deleted === 1, "is_deleted = 1");
  const blocked = await L.api("GET", "/customer/getProfile", { token: sp.token });
  L.check(blocked?.success === false, "deleted user is logged out (API refused)");
  await a.page.waitForTimeout(800);
  await a.page.locator(".dlt-ac-btn a", { hasText: "Undo Delete" }).click();
  await a.page.locator(".modal.show button", { hasText: "Yes" }).click();
  L.check(await L.waitText(a, /Account restored/, 10000), "Undo Delete → restored");
  L.check((await state(sp._id)).is_deleted === 0, "is_deleted back to 0");

  L.sec("13.6 Permanent delete owner with a running job → pending → finished");
  await withModule("logistics");
  await goto(`/user-account/${owner._id}`, new RegExp(escRe(fleet), "i"));
  const noConfirm = await L.api("POST", `/admin/accounts/${owner._id}/permanent-delete`, { ...H, body: {} });
  L.check(noConfirm?.data?.code === "CONFIRM_REQUIRED", "API refuses without typed DELETE");
  await a.page.locator(".dlt-ac-btn a", { hasText: "Permanent Delete" }).click();
  await a.page.waitForSelector(".modal.show", { timeout: 5000 });
  L.check(/can’t be undone/.test(await a.page.locator(".modal.show").innerText()), "first confirm warns it can't be undone");
  await a.page.locator(".modal.show button", { hasText: "Continue" }).click();
  await a.page.waitForSelector('.modal.show input[aria-label="Type DELETE to confirm"]', { timeout: 5000 });
  const btn = a.page.locator(".modal.show button", { hasText: "Delete permanently" });
  L.check(await btn.isDisabled(), "second confirm: button disabled until DELETE is typed");
  await a.page.locator('.modal.show input[aria-label="Type DELETE to confirm"]').fill("DELETE");
  await L.shot(a, "s13-permanent-confirm");
  await btn.click();
  L.check(await L.waitText(a, /will be permanently deleted after 1 active job/i, 10000), "toast: deleted after the active job finishes");
  so = await state(owner._id); sop = await state(op._id);
  L.check(so.account_state.deletion === "pending" && sop.account_state.deletion === "pending" && so.is_deleted !== 1, "owner + operator pending (can still finish the job)");
  const unitNow = await db.collection("logistics_assets").findOne({ _id: unit._id });
  L.check(unitNow.owner_banned === true, "owner's units hidden right away");
  const q2 = await L.api("POST", `/logistics/job/${openJob._id}/quote`, { token: opTok, body: { amount: 10, asset_id: String(unit._id) } });
  L.check(q2?.data?.code === "ACCOUNT_DELETION_PENDING", "operator can't take new work while pending");
  await a.page.waitForTimeout(600);
  await L.shot(a, "s13-pending-deletion");

  // Finish the running job the real way: In transit → delivery code → confirmed
  // (keeps the job's status history complete: Loaded → In transit → Delivered)
  const toTransit = await L.api("POST", `/logistics/job/${running._id}/status`, { token: opTok, body: { status: 4 } });
  L.check(toTransit?.success !== false, "pending-deletion operator moves the job to In transit", toTransit?.message);
  const askCode = await L.api("POST", `/logistics/job/${running._id}/status`, { token: opTok, body: { status: 5 } });
  L.check(askCode?.success !== false, "delivery code sent to the customer", askCode?.message);
  const withCode = await TransportJob.findById(running._id).select("+delivery_otp");
  const done = await L.api("POST", `/logistics/job/${running._id}/confirm-delivery`, { token: opTok, body: { otp: withCode.delivery_otp } });
  L.check(done?.success !== false, "operator confirms delivery with the customer's code", done?.message);
  const hist = ((await TransportJob.findById(running._id)).status_history || []).map((h) => h.status);
  L.check([3, 4, 5].every((x) => hist.includes(x)), "job history shows Loaded → In transit → Delivered", hist);
  await new Promise((r) => setTimeout(r, 3000));
  so = await state(owner._id); sop = await state(op._id);
  const gone = (u, email) => u.is_deleted === 1 && u.account_state.deletion === "done" && /@deleted\.invalid$/.test(u.email) && u.email !== email && /^000\d{7}$/.test(u.phone_number) && !u.social_id && !u.device_token && u.full_name === "Deleted user";
  L.check(gone(so, owner.email), `owner anonymized when the job ended (${so.email})`);
  L.check(gone(sop, op.email), `operator anonymized too (${sop.email})`);
  L.check(!(await db.collection("users").findOne({ email: owner.email })), "original email is free to register again");
  const login = await L.api("POST", "/logistics/auth/login", { body: { email: owner.email, password: "Passw0rd!" } });
  L.check(login?.data?.code === "NO_ACCOUNT", "logging in with the old email → no account");
  const custJob = await L.api("GET", `/logistics/job/${running._id}`, { token: cust.token });
  const jo = custJob?.data?.job || custJob?.data || {};
  L.check(jo?.assigned?.owner_id?.no_longer_active === true && jo?.assigned?.driver_id?.full_name === "User no longer active", "customer's job shows “User no longer active”");
  const owners = await L.api("GET", `/admin/logistics/owners?search=${encodeURIComponent(fleet)}`, H);
  L.check(owners?.success !== false && !JSON.stringify(owners?.data || {}).includes(String(owner._id)), "no longer in Equipment Owners");
  const pd = await L.api("GET", `/admin/accounts?state=permanently_deleted&search=${encodeURIComponent(sop.email)}`, H);
  L.check(pd?.data?.total === 1, "still findable under User Accounts → Permanently deleted");
  t = await goto(`/user-account/${owner._id}`, /permanently deleted/i);
  L.check(/Account permanently deleted/i.test(t) && !/Suspend Account/i.test(t), "account page shows it can't be restored");
  await L.shot(a, "s13-permanently-deleted");

  L.sec("13.7 Permanent delete with no active work → immediate; open jobs cancelled");
  await L.api("POST", `/admin/accounts/${cust2._id}/reactivate`, H);
  const imm = await L.api("POST", `/admin/accounts/${cust2._id}/permanent-delete`, { ...H, body: { confirm: "DELETE" } });
  L.check(/permanently deleted/i.test(imm?.message || "") && (await state(cust2._id)).account_state.deletion === "done", "customer deleted at once");
  L.check((await db.collection("transport_jobs").findOne({ _id: pendingJob._id })).status === 6, "their open (pending) job was cancelled");

  L.check(a.errors.filter((e) => !/non-serializable/i.test(e)).length === 0, "no console errors in the admin", a.errors.slice(-3));
  await a.ctx.close();
  await L.done();
})();
