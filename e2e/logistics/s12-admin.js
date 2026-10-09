/* Stage 12 — admin panel (sibmba-tasker-admin) × logistics.
 * Needs the admin dev server pointed at the :4099 test API:
 *   PORT=3012 BROWSER=none REACT_APP_ADMIN_BASE_URL=http://localhost:4099/api/admin \
 *   REACT_APP_FILE_BASE_URL=http://localhost:4099/ npm start   (in sibmba-tasker-admin)
 * Admin auth: a JWT for the existing admin is seeded into sessionStorage (no password needed).
 *   1. seed: operator SOS, owner support ticket, customer job report (logistics APIs)
 *   2. admin pages render with logistics data present (Support ticket, SOS Alerts tab)
 *   3. admin-only logistics APIs: list + resolve reports and SOS
 *   4. gap probe: admin "deactivate" vs logistics login / API
 *   5. no otp / password in any admin response
 */
const L = require("./lib");

// Own port (3012) so a developer's admin on 3002 (pointing at a real backend) is never driven by the test
const ADMIN_WEB = process.env.E2E_ADMIN_WEB || "http://localhost:3012";
const LEAK_RE = /"(otp|email_otp|phone_otp|whatsapp_otp|password|device_token)"\s*:/;

(async () => {
  // Guard: the admin app must talk to the mocked test API, never a real backend
  const bundle = await fetch(`${ADMIN_WEB}/static/js/bundle.js`).then((r) => r.text()).catch(() => "");
  const apiHost = new URL(L.API).port;
  if (!new RegExp(`(localhost|127\\.0\\.0\\.1):${apiHost}/api/admin`).test(bundle)) {
    console.error(`Admin app at ${ADMIN_WEB} does not point at the test API (:${apiHost}). Start it with:\n  PORT=3012 BROWSER=none REACT_APP_ADMIN_BASE_URL=http://localhost:${apiHost}/api/admin REACT_APP_FILE_BASE_URL=http://localhost:${apiHost}/ npx react-scripts start`);
    process.exit(2);
  }
  const st = L.loadState();
  const db = await L.db();
  const admin = await db.collection("admins").findOne({}, { projection: { _id: 1, email: 1 } });
  if (!L.check(!!admin, "an admin account exists in the DB")) return L.done();
  const JWT = require(require("path").resolve(__dirname, "../../../sibmba-tasker-backend/node_modules/jsonwebtoken"));
  const ADMIN_TOKEN = JWT.sign({ _id: String(admin._id) }, process.env.JWT_SECRET, { expiresIn: "1d" });
  const tok = (u) => L.tokenFor(u._id);
  // Start from an active owner; put back any ban someone set on this test owner at the end
  const ownerOid0 = new L.mongoose.Types.ObjectId(String(st.owner._id));
  const banBefore = (await db.collection("users").findOne({ _id: ownerOid0 }, { projection: { logistics_ban: 1 } }))?.logistics_ban || null;
  if (banBefore?.banned) {
    await db.collection("users").updateOne({ _id: ownerOid0 }, { $set: { "logistics_ban.banned": false } });
    await db.collection("logistics_assets").updateMany({ owner_id: ownerOid0 }, { $set: { owner_banned: false } });
  }
  const RUN = Date.now().toString(36);
  const created = { supportId: null, sosIds: [], reportId: null };

  L.sec("12.1 Seed logistics data that should reach admin");
  const sos = await L.api("POST", "/logistics/sos", {
    token: tok(st.operator),
    body: { lat: -17.8292, lng: 31.0522, accuracy: 15, source: "web", message: `e2e admin check ${RUN}` },
  });
  const alertId = sos?.data?.alert?._id || sos?.data?.alert?.id;
  L.check(!!alertId && sos?.data?.alerted?.simba, `operator SOS sent (${sos?.message})`, sos);
  if (alertId) created.sosIds.push(alertId);

  const ticketMsg = `E2E logistics owner ticket ${RUN}`;
  const sup = await L.api("POST", "/customer/add_helpandsupport", {
    token: tok(st.owner),
    body: { title: `[Logistics Owner] E2E ${RUN}`, message: ticketMsg },
  });
  L.check(sup?.success !== false && !sup?.raw, `owner support ticket created (${sup?.message})`, sup);
  const supDoc = await db.collection("helpandsupports").findOne({ message: ticketMsg });
  created.supportId = supDoc?._id || null;

  let report = null;
  for (const j of [st.job, st.directJob, st.ride].filter(Boolean)) {
    const id = j._id || j;
    const r = await L.api("POST", `/logistics/job/${id}/report`, { token: tok(st.customer), body: { message: `E2E admin report ${RUN}` } });
    if (r?.data?.report) { report = r.data.report; break; }
  }
  if (report) created.reportId = report._id || report.id;
  L.check(!!report, "customer job report filed", report ? undefined : "no eligible job in state.json");

  L.sec("12.2 Admin panel pages (browser)");
  const a = await L.actor("admin");
  const leaks = new Set();
  a.page.on("response", async (r) => {
    if (!/\/api\//.test(r.url())) return;
    try {
      const t = await r.text();
      if (LEAK_RE.test(t)) leaks.add(`${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, "").split("?")[0]} → ${t.match(LEAK_RE)[1]}`);
    } catch {}
  });
  const adminFails = [];
  a.page.on("response", (r) => {
    if (/\/api\/admin\//.test(r.url()) && r.status() >= 400) adminFails.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, "")}`);
  });
  await a.ctx.addInitScript((t) => { try { sessionStorage.setItem("token", t); } catch {} }, ADMIN_TOKEN);

  const visit = async (route, label, expect) => {
    const e0 = a.errors.length, f0 = adminFails.length;
    await a.page.goto(`${ADMIN_WEB}${route}`, { waitUntil: "domcontentloaded" });
    await a.page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await a.page.waitForTimeout(800);
    const txt = await L.bodyText(a);
    await L.shot(a, `s12${route}`);
    const onLogin = new URL(a.page.url()).pathname === "/";
    const errs = a.errors.slice(e0).filter((e) => !/Warning:|React Router Future|validateDOMNesting|Each child in a list/i.test(e));
    const ok = !onLogin && txt.length > 50 && !errs.length && adminFails.length === f0;
    L.check(ok, `${label} renders (${route})`, { onLogin, errs, fails: adminFails.slice(f0) });
    return txt;
  };

  const withModule = (m) => a.page.evaluate((v) => localStorage.setItem("adminModule", v), m);
  const switchTo = async (label) => {
    await a.page.locator(".admin-module-switch button", { hasText: label }).click();
    await a.page.waitForURL(/\/Dashboard$/, { timeout: 8000 });
    await a.page.waitForLoadState("networkidle").catch(() => {});
    await a.page.waitForTimeout(600);
    return L.bodyText(a);
  };
  const sideText = async () => (await a.page.locator(".side-menu").innerText()).replace(/\s+/g, " ");

  await visit("/Dashboard", "Dashboard");
  L.sec("12.2a Simba Tasker | Logistics switch");
  await withModule("tasker");
  await a.page.reload({ waitUntil: "domcontentloaded" });
  await a.page.waitForLoadState("networkidle").catch(() => {});
  L.check((await a.page.locator(".admin-module-switch button").allInnerTexts()).join("|") === "Simba Tasker|Logistics", "switch at the top of the menu: Simba Tasker | Logistics");
  let side = await sideText();
  let dash = await L.bodyText(a);
  L.check(/Customer Management/.test(side) && /Order Management/.test(side) && !/Equipment Owners|Logistics Jobs/.test(side), "Tasker menu: Tasker pages only");
  L.check(/Total Users/.test(dash) && !/Total Equipment Owners|Logistics Jobs/.test(dash), "Tasker dashboard: Tasker figures only");
  await L.shot(a, "s12-module-tasker");
  dash = await switchTo("Logistics");
  side = await sideText();
  L.check(/Logistics Dashboard/.test(dash) && /Total Equipment Owners/.test(dash) && /Latest Logistics Jobs/.test(dash) && !/Total Users|Total Corporates/.test(dash), "Logistics dashboard: logistics figures only");
  L.check(/Equipment Owners/.test(side) && /Logistics Jobs/.test(side) && /SOS Alerts/.test(side) && /Logistics Support/.test(side) && !/Customer Management|Order Management|Service Providers/.test(side), "Logistics menu: owners, jobs, SOS alerts, support");
  await L.shot(a, "s12-module-logistics");
  await a.page.reload({ waitUntil: "domcontentloaded" });
  await a.page.waitForLoadState("networkidle").catch(() => {});
  L.check(/Logistics Dashboard/.test(await L.bodyText(a)), "choice survives a reload");

  const supportTxt = await visit("/Support", "Help & Support (Logistics)");
  L.check(supportTxt.includes(ticketMsg) && /Logistics Support/.test(supportTxt), "logistics owner ticket is listed on Logistics Support");
  L.check(supportTxt.includes(`[Logistics Owner] E2E ${RUN}`), "ticket subject ([Logistics Owner] …) is shown");
  const sosCopies = await db.collection("Sos").countDocuments({ name: /^🚨 SOS / });
  L.check(sosCopies === 0, "SOS alerts are no longer copied into the helpline list (v2.7.36)", sosCopies);
  const sosTxt = await visit("/SOSManagement", "SOS Management → SOS Alerts");
  const opName = `E2E Operator ${st.RUN}`;
  L.check(/SOS Alerts/i.test(sosTxt) && !/Helpline Numbers/i.test(sosTxt) && /Raised By/i.test(sosTxt) && /Fleet Owner/i.test(sosTxt), "Logistics → SOS Alerts only (alert columns, no helplines)");
  L.check(sosTxt.includes(opName) && /\bActive\b/.test(sosTxt) && /Open in Maps/.test(sosTxt), "operator's SOS listed (name, Active = not viewed yet, map link)");
  const custTxt = await visit("/CustomerManagement", "Customer Management");
  L.check((await a.page.locator(".admin-module-switch button.is-active").innerText()) === "Simba Tasker", "opening a Tasker page switches the menu to Simba Tasker");
  const taskerSupport = await visit("/Support", "Support (Simba Tasker)");
  L.check(!taskerSupport.includes(ticketMsg), "logistics ticket is not in the Tasker Support list");
  L.check(!custTxt.includes(st.owner.email), "logistics owner is NOT in Customer Management (role 4 excluded — gap)");
  await visit("/ServiceProviders", "Service Providers");
  await visit("/AccountVerification", "Account Verification");
  await visit("/OrderManagement", "Order Management");
  await visit("/disputes-management", "Disputes");
  await visit("/Notification", "Notifications");
  await visit("/AddNotification", "Send notification");
  await visit("/active-subscription", "Active subscriptions");

  L.sec("12.3 Admin logistics APIs (no admin UI)");
  const H = { token: ADMIN_TOKEN };
  const noAuth = await L.api("GET", "/admin/logistics-reports");
  L.check(noAuth?.success === false || (noAuth?.http || 0) >= 400 || /token|auth/i.test(noAuth?.message || ""), "logistics-reports rejects requests without admin token", noAuth);
  const reports = await L.api("GET", "/admin/logistics-reports?status=open", H);
  const rows = reports?.data?.data || reports?.data?.reports || reports?.data || [];
  L.check(Array.isArray(rows) && (!created.reportId || rows.some((r) => String(r._id || r.id) === String(created.reportId))), `GET /admin/logistics-reports lists the new report (${Array.isArray(rows) ? rows.length : "?"} open)`, Object.keys(reports?.data || {}));
  if (created.reportId) {
    const res = await L.api("POST", `/admin/logistics-reports/${created.reportId}/resolve`, { ...H, body: { adminRemark: "E2E resolved by admin" } });
    const doc = await db.collection("logistics_job_reports").findOne({ _id: new L.mongoose.Types.ObjectId(String(created.reportId)) });
    L.check(doc?.status === "resolved" && doc?.resolved_by_role === "admin", `admin resolves report (${res?.message})`, { status: doc?.status, by: doc?.resolved_by_role });
    const n = await db.collection(" notifications").findOne({ receiver_id: new L.mongoose.Types.ObjectId(String(st.customer._id)), type: "logistics_job_report_resolved" }, { sort: { _id: -1 } });
    L.check(!!n && Date.now() - n._id.getTimestamp() < 120000, "customer gets 'report resolved' notification");
  }
  const sosList = await L.api("GET", "/admin/logistics-sos?status=active", H);
  const sosRows = sosList?.data?.data || [];
  L.check(sosRows.some((x) => String(x._id) === String(alertId)) && sosList?.data?.counts?.active >= 1, `GET /admin/logistics-sos lists the operator SOS (${sosRows.length} on page, counts ${JSON.stringify(sosList?.data?.counts)})`);
  const mineRow = sosRows.find((x) => String(x._id) === String(alertId));
  L.check(mineRow?.owner && mineRow?.user && mineRow?.map_url, "list row has raiser, fleet owner and map link");
  if (alertId) {
    L.sec("12.3b SOS Alerts tab — view, acknowledge, resolve (browser)");
    await withModule("logistics");
    await a.page.goto(`${ADMIN_WEB}/SOSManagement`, { waitUntil: "domcontentloaded" });
    await a.page.waitForLoadState("networkidle").catch(() => {});
    await a.page.locator('input[type="search"]').first().fill(opName);
    await a.page.waitForTimeout(1500);
    await a.page.locator("tbody tr", { hasText: opName }).first().locator("button", { hasText: "View" }).click();
    await a.page.waitForSelector(".modal.show", { timeout: 8000 });
    await a.page.waitForTimeout(600);
    let m = (await a.page.locator(".modal.show").innerText()).replace(/\s+/g, " ");
    L.check(/Raised by/.test(m) && /Fleet owner/.test(m) && /Who was alerted/i.test(m) && /(not alerted)/.test(m) === /Customer on the job/.test(m), "detail shows raiser, owner, other party (not alerted) and who was alerted");
    await L.shot(a, "s12-sos-detail");
    const n0 = Date.now();
    if (await a.page.locator(".modal.show button", { hasText: "Acknowledge" }).count()) {
      await a.page.locator(".modal.show button", { hasText: "Acknowledge" }).click();
      L.check(await L.waitText(a, /SOS acknowledged/), "Acknowledge → toast");
      await a.page.waitForTimeout(800);
    }
    let al = await db.collection("logistics_sos_alerts").findOne({ _id: new L.mongoose.Types.ObjectId(String(alertId)) });
    L.check(al?.status === "acknowledged" && al?.acknowledged_by_role === "admin", "alert acknowledged by admin");
    await a.page.locator(".modal.show textarea").fill("E2E admin resolve");
    await a.page.locator(".modal.show button", { hasText: "Resolve" }).click();
    L.check(await L.waitText(a, /SOS resolved/), "Resolve → toast");
    await a.page.waitForTimeout(800);
    al = await db.collection("logistics_sos_alerts").findOne({ _id: new L.mongoose.Types.ObjectId(String(alertId)) });
    L.check(al?.status === "resolved" && al?.resolved_by_role === "admin" && al?.resolve_note === "E2E admin resolve", "alert resolved by admin with note");
    m = (await a.page.locator(".modal.show").innerText()).replace(/\s+/g, " ");
    L.check(/Resolved/.test(m) && /Simba admin/.test(m), "detail now says resolved by Simba admin");
    await L.shot(a, "s12-sos-resolved");
    await a.page.locator(".modal.show button", { hasText: "Close" }).click();
    const upd = await db.collection(" notifications").find({ receiver_id: new L.mongoose.Types.ObjectId(String(st.operator._id)), type: "LOGISTICS_SOS_UPDATE" }).sort({ _id: -1 }).limit(2).toArray();
    L.check(upd.some((x) => x._id.getTimestamp() >= new Date(n0 - 2000) && /Simba admin/.test(x.message || "")), "operator told 'Simba admin …' in-app");

    L.sec("12.3c Simba Tasker → SOS Management = Helpline Numbers (Add Number's / Remove)");
    await withModule("tasker");
    await a.page.goto(`${ADMIN_WEB}/SOSManagement`, { waitUntil: "domcontentloaded" });
    await a.page.waitForLoadState("networkidle").catch(() => {});
    await a.page.waitForTimeout(800);
    let h = await L.bodyText(a);
    L.check(/Helpline Number/i.test(h) && /Add Number/i.test(h) && !/🚨/.test(h), "helpline tab lists numbers only (no SOS alerts)");
    await a.page.locator(".cmn-btn a", { hasText: "Add Number" }).click();
    await a.page.waitForURL(/AddSOSNumber/, { timeout: 8000 });
    L.check(/Add Helpline Number/i.test(await L.bodyText(a)), "Add Number's opens 'Add Helpline Number'");
    const inputs = a.page.locator("form input");
    await inputs.nth(0).fill(`E2E Helpline ${RUN}`);
    await inputs.nth(1).fill("263242700000");
    await a.page.locator("form button[type=submit], form button").last().click();
    await a.page.waitForURL(/SOSManagement\?tab=helplines/, { timeout: 10000 }).catch(() => {});
    await a.page.waitForTimeout(1200);
    h = await L.bodyText(a);
    L.check(h.includes(`E2E Helpline ${RUN}`), "new helpline listed");
    await L.shot(a, "s12-helplines");
    await a.page.locator("tbody tr", { hasText: `E2E Helpline ${RUN}` }).locator("button", { hasText: "Remove" }).click();
    await a.page.locator(".modal.show button", { hasText: "Yes" }).click();
    await a.page.waitForTimeout(1200);
    L.check(!(await L.bodyText(a)).includes(`E2E Helpline ${RUN}`), "helpline removed");
    await db.collection("Sos").deleteMany({ name: `E2E Helpline ${RUN}` });
  }

  L.sec("12.4 Tasker 'deactivate' (customer tab) is separate from the logistics ban");
  const ownerId = new L.mongoose.Types.ObjectId(String(st.owner._id));
  const before = await db.collection("users").findOne({ _id: ownerId }, { projection: { status: 1 } });
  const deact = await L.api("POST", "/admin/activateDeactivateCustomer", { ...H, body: { id: String(st.owner._id), status: 0 } });
  L.check(deact?.success !== false, `admin deactivate accepted for a logistics owner (${deact?.message})`, deact);
  const sub = await L.api("GET", "/logistics/subscription", { token: tok(st.owner) });
  const stillWorks = sub?.success !== false && !sub?.raw;
  L.check(true, `deactivated owner can still call logistics APIs: ${stillWorks ? "YES (gap — not enforced)" : "no (blocked)"}`);
  const login = await L.api("POST", "/logistics/auth/login", { body: { email: st.owner.email, password: "Passw0rd!" } });
  L.check(true, `deactivated owner logistics login: ${login?.data?.token || login?.token ? "SUCCEEDS (gap)" : `blocked/failed (${login?.message})`}`);
  await db.collection("users").updateOne({ _id: ownerId }, { $set: { status: before?.status ?? 1 } });
  L.check(true, "owner status restored");

  // ------------------------------------------------------------ v2.7.36
  const ownerOid = new L.mongoose.Types.ObjectId(String(st.owner._id));
  const ownerBefore = await db.collection("users").findOne({ _id: ownerOid }, { projection: { is_verified: 1, logistics_ban: 1 } });
  const ownerEmail = st.owner.email;
  const outboxLen = () => { try { return require("fs").readFileSync(require("path").join(__dirname, "outbox.jsonl"), "utf8").trim().split("\n").length; } catch { return 0; } };
  const outboxSince = (n) => { try { return require("fs").readFileSync(require("path").join(__dirname, "outbox.jsonl"), "utf8").trim().split("\n").slice(n).map((l) => JSON.parse(l)); } catch { return []; } };

  L.sec("12.7 Dashboard shows equipment owners + logistics jobs");
  await withModule("logistics");
  const dashTxt = await visit("/Dashboard", "Dashboard (logistics)");
  for (const t of ["Total Equipment Owners", "Total Operators", "Total Equipment", "Total Logistics Jobs", "Logistics Jobs In Progress", "Latest Equipment Owners", "Latest Logistics Jobs"]) {
    L.check(dashTxt.includes(t), `dashboard has "${t}"`);
  }

  L.sec("12.8 Equipment Owners page — list, badge, profile tabs");
  const ownersTxt = await visit("/logistics-owners", "Equipment Owners");
  L.check(/Set Badge/.test(ownersTxt) && /Profile Action/.test(ownersTxt) && /Showing 1 - 10 of \d+ results/.test(ownersTxt), "owners table has Set Badge + Profile Action + 10 per page");
  await a.page.locator('input[type="search"]').first().fill(ownerEmail);
  await a.page.waitForTimeout(1500);
  const row = a.page.locator("tbody tr", { hasText: ownerEmail });
  L.check((await row.count()) === 1, "search by email finds the owner");
  const badgeBtn = row.locator("button", { hasText: /Verified Badge/ });
  if ((await badgeBtn.innerText()).includes("Remove")) {
    await badgeBtn.click(); await a.page.locator(".modal.show button", { hasText: "Yes" }).click(); await a.page.waitForTimeout(1200);
  }
  await row.locator("button", { hasText: "Set Verified Badge" }).click();
  await a.page.locator(".modal.show button", { hasText: "Yes" }).click();
  L.check(await L.waitText(a, /Verified badge set/), "Set Verified Badge → toast");
  await a.page.waitForTimeout(800);
  L.check(/Remove Verified Badge/.test(await row.innerText()), "row now offers Remove Verified Badge");
  const srch = await L.api("GET", `/logistics/asset/${st.truck._id}`, { token: tok(st.customer) });
  L.check(Number(srch?.data?.owner?.is_verified) === 1, "customer sees the owner's unit as Verified");
  const opMe = await L.api("GET", "/logistics/me", { token: tok(st.operator) });
  L.check(opMe?.data?.user?.account?.fleet_verified === true, "operator inherits the Verified badge (account.fleet_verified)");
  await L.shot(a, "s12-owners-badge");

  await row.locator("span.action-text").click();
  await a.page.waitForURL(/\/logistics-owner\//, { timeout: 10000 });
  await L.waitText(a, new RegExp(ownerEmail.replace(/\./g, "\\.")), 15000);
  let ptxt = await L.bodyText(a);
  L.check(/Equipment Owner Profile/.test(ptxt) && /Owner info/i.test(ptxt) && /Fleet earnings/i.test(ptxt) && ptxt.includes(ownerEmail) && /Verified/.test(ptxt), "profile Overview shows info + summary + badge");
  await L.shot(a, "s12-owner-overview");
  await a.page.locator(".over-view-btn button", { hasText: "Equipment" }).click();
  await a.page.waitForTimeout(500);
  ptxt = await L.bodyText(a);
  L.check(ptxt.includes(`E2E Truck ${st.RUN}`) && /Registration/.test(ptxt), "Equipment tab lists the owner's units");
  await a.page.locator("span.action-text", { hasText: `E2E Truck ${st.RUN}` }).first().click();
  await a.page.waitForSelector(".modal.show", { timeout: 5000 });
  await a.page.waitForTimeout(600);
  const unitTxt = (await a.page.locator(".modal.show").innerText()).replace(/\s+/g, " ");
  L.check(/Make \/ Model \/ Year/i.test(unitTxt) && /Documents/i.test(unitTxt), "unit details modal (specs + documents)");
  await L.shot(a, "s12-owner-unit");
  await a.page.locator(".modal.show button", { hasText: "Close" }).click();
  await a.page.locator(".over-view-btn button", { hasText: "Operators" }).click();
  await a.page.waitForTimeout(500);
  ptxt = await L.bodyText(a);
  L.check(ptxt.includes(`E2E Operator ${st.RUN}`) && /Jobs done/.test(ptxt), "Operators tab lists operators");
  await L.shot(a, "s12-owner-operators");
  await a.page.locator(".over-view-btn button", { hasText: "Earnings" }).click();
  await a.page.waitForLoadState("networkidle").catch(() => {});
  await a.page.waitForTimeout(800);
  ptxt = await L.bodyText(a);
  const ownEarn = await L.api("GET", "/logistics/driver-earnings?limit=50", { token: tok(st.owner) });
  const amt = Number(ownEarn?.data?.summary?.amount || 0).toFixed(2);
  L.check(ptxt.includes(`USD ${amt}`) && /By operator/i.test(ptxt) && /Delivered jobs/i.test(ptxt), `Earnings tab matches the owner's own Earnings page (USD ${amt})`);
  await L.shot(a, "s12-owner-earnings");
  L.check(a.errors.length === 0, "no console errors on owner pages", a.errors.slice(-5));

  L.sec("12.9 Logistics Jobs page — search, filters, pagination, detail");
  let jtxt = await visit("/logistics-jobs", "Logistics Jobs");
  L.check(/Showing 1 - 10 of \d+ results/.test(jtxt), "10 per page by default");
  L.check((await a.page.locator("table.table-cmn tbody tr").count()) === 10, "first page has 10 rows");
  await a.page.locator('input[type="search"]').first().fill(`cust.${st.RUN}`);
  await a.page.waitForTimeout(1500);
  jtxt = await L.bodyText(a);
  const custRows = await a.page.locator("table.table-cmn tbody tr").count();
  L.check(custRows > 0 && (await a.page.locator("table.table-cmn tbody tr", { hasText: `E2E cust.${st.RUN}` }).count()) === custRows, `search by customer name → ${custRows} job(s), all theirs`);
  await a.page.locator('input[type="search"]').first().fill(`E2E Operator ${st.RUN}`);
  await a.page.waitForTimeout(1500);
  const opRows = await a.page.locator("table.table-cmn tbody tr").count();
  L.check(opRows > 0 && (await a.page.locator("table.table-cmn tbody tr", { hasText: `E2E Operator ${st.RUN}` }).count()) === opRows, `search by operator name → ${opRows} job(s)`);
  await a.page.locator("select[aria-label='Job status']").selectOption("5");
  await a.page.waitForTimeout(1500);
  const delRows = await a.page.locator("table.table-cmn tbody tr").count();
  L.check(delRows > 0 && (await a.page.locator("table.table-cmn tbody tr", { hasText: "Delivered" }).count()) === delRows, `status filter Delivered → ${delRows} row(s), all Delivered`);
  await a.page.locator("select[aria-label='Job status']").selectOption("");
  await a.page.locator('input[type="search"]').first().fill(`cust.${st.RUN}`);
  await a.page.waitForTimeout(1500);
  const catOpts = (await a.page.locator("select[aria-label='Category'] option").allInnerTexts()).join("|");
  L.check(catOpts === "Category: All|Logistic|Agricultural|Construction|Industrial|Cab", `category filter = Hub categories (${catOpts})`);
  await a.page.locator("select[aria-label='Category']").selectOption("cab");
  await a.page.waitForTimeout(1500);
  const rideRows = await a.page.locator("table.table-cmn tbody tr").count();
  L.check(rideRows > 0 && (await a.page.locator("table.table-cmn tbody tr", { hasText: "Cab" }).count()) === rideRows, `category Cab → ${rideRows} delivered cab job(s)`);
  await a.page.locator("select[aria-label='Category']").selectOption("logistic");
  await a.page.waitForTimeout(1500);
  const logRows = await a.page.locator("table.table-cmn tbody tr").count();
  L.check(logRows > 0 && (await a.page.locator("table.table-cmn tbody tr", { hasText: "Logistic" }).count()) === logRows, `category Logistic → ${logRows} row(s)`);
  const heads = (await a.page.locator("table.table-cmn thead th").allInnerTexts()).join("|");
  L.check(!/\bOwner\b/i.test(heads) && /Category/i.test(heads), `list has no Owner column (${heads})`);
  const amtCell = await a.page.locator("table.table-cmn tbody tr").first().innerText();
  L.check(/Posted: USD/.test(amtCell) && /Agreed: /.test(amtCell), "amount shows customer posted + agreed");
  await L.shot(a, "s12-jobs-filtered");
  await a.page.goto(`${ADMIN_WEB}/logistics-job/${st.job._id}`, { waitUntil: "domcontentloaded" });
  await a.page.waitForLoadState("networkidle").catch(() => {});
  await a.page.waitForTimeout(800);
  await L.waitText(a, /Customer posted/, 10000);
  const dtxt = await L.bodyText(a);
  L.check(/JOB DETAILS/i.test(dtxt) && /PAYMENT/i.test(dtxt) && /QUOTES/i.test(dtxt) && /STATUS HISTORY/i.test(dtxt), "transport job detail sections (details, payment, quotes, history)");
  L.check(/Customer posted/.test(dtxt) && /Agreed amount/.test(dtxt) && /Cash/.test(dtxt) && !/Not paid/.test(dtxt), "payment = customer posted + agreed, cash in hand (no Paid)");
  L.check(/Load/.test(dtxt) && /Weight/.test(dtxt) && !/Cab class/.test(dtxt), "transport rows (load, weight), no cab rows");
  L.check(dtxt.includes(`E2E cust.${st.RUN}`) && dtxt.includes(`E2E Operator ${st.RUN}`) && /Equipment owner/i.test(dtxt), "job detail shows customer, operator and owner");
  await L.shot(a, "s12-job-detail");
  const rideJob = await db.collection("transport_jobs").findOne({ job_type: "ride", requester_id: new L.mongoose.Types.ObjectId(String(st.customer._id)) });
  if (rideJob) {
    await a.page.goto(`${ADMIN_WEB}/logistics-job/${rideJob._id}`, { waitUntil: "domcontentloaded" });
    await L.waitText(a, /Customer posted/, 10000);
    const rtxt = await L.bodyText(a);
    L.check(/RIDE DETAILS/i.test(rtxt) && /Cab class/.test(rtxt) && /Passengers/.test(rtxt) && /Fare guide/.test(rtxt), "cab job shows ride rows (class, passengers, fare guide)");
    L.check(!/\bWeight\b|Carriage needed|\bLoad\b|Priority/.test(rtxt), "cab job hides load / weight / carriage / priority");
    await L.shot(a, "s12-cab-detail");
  }
  const jobApi = await L.api("GET", `/admin/logistics/jobs/${st.job._id}`, H);
  L.check(!/"(delivery_otp|ride_start_otp|reject_otp|password)"\s*:/.test(JSON.stringify(jobApi)), "job detail API has no OTP / PIN / password");
  await L.shot(a, "s12-job-detail");

  L.sec("12.10 No separate ban — owners are restricted with Suspend account (v2.7.44)");
  // Suspend / re-activate of an owner (operators follow, units hidden, banner) is covered end to end in s13
  await a.page.goto(`${ADMIN_WEB}/logistics-owners`, { waitUntil: "domcontentloaded" });
  await a.page.waitForLoadState("networkidle").catch(() => {});
  await a.page.locator('input[type="search"]').first().fill(ownerEmail);
  await a.page.waitForTimeout(1500);
  const listTxt = await L.bodyText(a);
  const rowSelects = await a.page.locator("tr", { hasText: ownerEmail }).locator("select").count();
  const filterOpts = await a.page.locator("select[aria-label='Owner status'] option").allInnerTexts();
  L.check(rowSelects === 0 && !/Profile Action/i.test(listTxt) && /\bStatus\b/.test(listTxt), "owners list: no ban dropdown, read-only Status column");
  L.check(filterOpts.includes("Suspended") && !filterOpts.includes("Banned"), `owner filter is Active / Suspended (${filterOpts.join(", ")})`);
  await a.page.goto(`${ADMIN_WEB}/logistics-owner/${st.owner._id}`, { waitUntil: "domcontentloaded" });
  await L.waitText(a, /Account actions/i, 15000);
  const profTxt = await L.bodyText(a);
  L.check(!/Ban Owner|Activate Owner/i.test(profTxt) && /Suspend account/i.test(profTxt), "owner profile: no Ban Owner button, Suspend account is there");
  await L.shot(a, "s12-owner-no-ban");
  const gone = await L.api("POST", "/admin/logistics/owners/status", { ...H, body: { id: String(st.owner._id), status: 0 } });
  L.check(gone?.success !== true, "old ban endpoint removed (POST /admin/logistics/owners/status)", gone);
  await db.collection("users").updateOne({ _id: ownerOid }, { $set: { is_verified: ownerBefore?.is_verified ?? null } });
  L.check(true, "restored the original badge");

  L.sec("12.13 Owner company name (profile) → customers see it");
  const company = `E2E Freight ${RUN}`;
  const ownerPrev = await db.collection("users").findOne({ _id: ownerOid }, { projection: { company_name: 1, profile_image: 1 } });
  // Edit profile needs a photo; seed one in the DB (Playwright's request proxy can't forward a file upload)
  if (!ownerPrev?.profile_image) await db.collection("users").updateOne({ _id: ownerOid }, { $set: { profile_image: "/user/e2e-owner.png" } });
  {
    const w = await L.actor("owner-profile");
    await L.seedAuth(w, { token: L.tokenFor(st.owner._id), user: { ...st.owner, role: 4 } });
    await w.page.goto(`${L.WEB}/edit-profile`, { waitUntil: "domcontentloaded" });
    await w.page.waitForSelector('input[name="company_name"]', { timeout: 20000 });
    L.check(true, "owner's Edit profile has a Company name field");
    if (!(await w.page.locator('input[name="full_name"]').first().inputValue())) await w.page.locator('input[name="full_name"]').first().fill(`E2E Owner ${st.RUN}`);
    await w.page.locator('input[name="company_name"]').fill(company);
    await L.shot(w, "s12-owner-company-field");
    await w.page.locator('button[type="submit"]', { hasText: "Update" }).click();
    L.check(await L.waitText(w, /Profile Updated/i, 15000), "profile saved");
    await w.ctx.close();
  }
  await new Promise((r) => setTimeout(r, 1000));
  const saved = await db.collection("users").findOne({ _id: ownerOid }, { projection: { company_name: 1 } });
  L.check(saved?.company_name === company, `company_name saved (${saved?.company_name})`);
  const me = await L.api("GET", "/logistics/me", { token: tok(st.owner) });
  L.check(me?.data?.user?.company_name === company, "GET /logistics/me returns company_name");
  const custAsset = await L.api("GET", `/logistics/asset/${st.truck._id}`, { token: tok(st.customer) });
  L.check(custAsset?.data?.owner?.full_name === company && custAsset?.data?.owner?.company_name === company, "asset API shows the company as the provider name");
  const quotes = await L.api("GET", `/logistics/job/${st.job._id}/quotes`, { token: tok(st.customer) });
  const qOwner = (quotes?.data?.quotes || quotes?.data?.data || [])[0]?.owner;
  L.check(!qOwner || qOwner.company_name === company, "quotes carry the owner's company");
  {
    const c = await L.actor("customer-company");
    await L.seedAuth(c, { token: tok(st.customer), user: { ...st.customer, role: 1 } });
    await c.page.goto(`${L.WEB}/logistics/asset/${st.truck._id}`, { waitUntil: "domcontentloaded" });
    const ok = await L.waitText(c, new RegExp(company), 20000);
    const prov = ok ? await c.page.locator("text=Provider").first().locator("xpath=..").innerText().catch(() => "") : "";
    L.check(ok && !/E2E Owner/.test(prov), "customer asset page shows the company under Provider");
    await L.shot(c, "s12-customer-company");
    await c.ctx.close();
  }

  L.sec("12.14 Owner profile → All Jobs lists only that owner's jobs");
  await a.page.goto(`${ADMIN_WEB}/logistics-owner/${st.owner._id}`, { waitUntil: "domcontentloaded" });
  await L.waitText(a, new RegExp(company), 15000);
  L.check((await L.bodyText(a)).includes(company), "admin owner profile shows the company name");
  await a.page.locator(".over-view-btn button", { hasText: "All Jobs" }).click();
  await a.page.waitForURL(/logistics-jobs\?owner=/, { timeout: 8000 });
  L.check(await L.waitText(a, new RegExp(`Logistics Jobs — ${company}`), 15000), "jobs page titled with the owner's company");
  const unitIds = await db.collection("logistics_assets").find({ owner_id: ownerOid }).project({ _id: 1 }).toArray();
  const expected = await db.collection("transport_jobs").countDocuments({ $or: [{ "assigned.owner_id": ownerOid }, { targeted_asset_id: { $in: unitIds.map((u) => u._id) } }] });
  const shown = Number(((await L.bodyText(a)).match(/of (\d+) results/) || [])[1]);
  L.check(shown === expected && expected > 0, `shows ${shown} job(s) = this owner's ${expected}`);
  const scoped = await L.api("GET", `/admin/logistics/jobs?owner_id=${st.owner._id}&limit=100`, H);
  const ownIds = new Set(unitIds.map((u) => String(u._id)));
  L.check((scoped?.data?.jobs || []).every((j) => String(j.owner?._id || "") === String(st.owner._id) || ownIds.has(String(j.asset?._id || ""))), "every listed job is run by this owner's fleet or booked to its unit");
  await L.shot(a, "s12-owner-all-jobs");
  await db.collection("users").updateOne({ _id: ownerOid }, ownerPrev?.company_name ? { $set: { company_name: ownerPrev.company_name } } : { $unset: { company_name: "" } });
  if (!ownerPrev?.profile_image) await db.collection("users").updateOne({ _id: ownerOid }, { $unset: { profile_image: "" } });

  L.sec("12.15 Logistics notifications — audiences + Simba Logistics title");
  {
    const base = { is_deleted: { $ne: 1 }, notification_status: { $ne: 0 } };
    const requesters = await db.collection("transport_jobs").distinct("requester_id");
    const expect = {
      owners: await db.collection("users").countDocuments({ ...base, role: 4, $or: [{ owner_id: null }, { owner_id: { $exists: false } }] }),
      operators: await db.collection("users").countDocuments({ ...base, role: 4, owner_id: { $ne: null } }),
      logistics_customers: await db.collection("users").countDocuments({ ...base, _id: { $in: requesters }, role: { $in: [1, 2, 3] } }),
      all_customer_roles: await db.collection("users").countDocuments({ ...base, role: { $in: [1, 2, 3] } }),
    };
    const spUsedLogistics = await db.collection("users").countDocuments({ ...base, _id: { $in: requesters }, role: 2 });
    const corpUsedLogistics = await db.collection("users").countDocuments({ ...base, _id: { $in: requesters }, role: 3 });

    await withModule("logistics");
    await a.page.goto(`${ADMIN_WEB}/AddNotification`, { waitUntil: "domcontentloaded" });
    await a.page.waitForSelector('select[name="userType"]', { timeout: 10000 });
    L.check(/Create Logistics Notification/.test(await L.bodyText(a)), "Logistics → Create Logistics Notification");
    const vals = await a.page.locator('select[name="userType"] option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    L.check(vals.join(",") === "all_logistics,owners,operators,logistics_customers,all_customer_roles", `audiences: ${vals.join(", ")}`);
    const reachFor = async (aud) => {
      await a.page.locator('select[name="userType"]').selectOption(aud);
      await a.page.waitForFunction(() => /Will be sent to/.test(document.querySelector(".audience-reach")?.innerText || ""), null, { timeout: 10000 }).catch(() => {});
      await a.page.waitForTimeout(300);
      return a.page.locator(".audience-reach").innerText().catch(() => "");
    };
    for (const aud of ["owners", "operators", "logistics_customers", "all_customer_roles"]) {
      const t = await reachFor(aud);
      const n = Number((t.match(/Will be sent to (\d+)/) || [])[1]);
      L.check(n === expect[aud], `${aud}: preview ${n} = DB ${expect[aud]} (${t.replace("Will be sent to ", "")})`);
    }
    const prev = await L.api("GET", "/admin/logistics/notifications/audience?audience=logistics_customers", H);
    L.check(prev?.data?.by_role?.service_providers === spUsedLogistics && prev?.data?.by_role?.corporates === corpUsedLogistics,
      `logistics customers include service providers (${spUsedLogistics}) and corporates (${corpUsedLogistics}) who used Logistics`);
    const allRoles = await L.api("GET", "/admin/logistics/notifications/audience?audience=all_customer_roles", H);
    L.check(allRoles?.data?.by_role?.service_providers > 0 && allRoles?.data?.by_role?.customers > 0 && !allRoles?.data?.by_role?.owners, "all customer roles = customers + service providers + corporates (no owners)");
    await L.shot(a, "s12-logistics-notification-form");

    // Real send to Operators (test API mocks push + email), then remove the in-app rows it created
    const title = `E2E notice ${RUN}`;
    await a.page.locator('select[name="userType"]').selectOption("operators");
    await a.page.locator('input[name="title"]').fill(title);
    await a.page.locator('textarea[name="description"]').fill("E2E logistics announcement — please ignore.");
    L.check(/Simba Logistics: E2E notice/.test(await L.bodyText(a)), "form shows how users will see the title");
    await a.page.locator("button", { hasText: /^CREATE$/i }).click();
    L.check(await L.waitText(a, new RegExp(`Notification sent to ${expect.operators} user`), 10000), `toast: sent to ${expect.operators} operators`);
    await a.page.waitForURL(/\/Notification$/, { timeout: 8000 }).catch(() => {});
    await a.page.waitForLoadState("networkidle").catch(() => {});
    await L.waitText(a, new RegExp(title), 10000);
    const listTxt = await L.bodyText(a);
    L.check(/Logistics Notifications/.test(listTxt) && listTxt.includes(title) && new RegExp(`Operators \\(${expect.operators}\\)`).test(listTxt), "Logistics Notifications list shows it with audience + count");
    await L.shot(a, "s12-logistics-notification-list");
    const rec = await db.collection("admin_notifications").findOne({ title, module: "logistics" });
    await new Promise((r) => setTimeout(r, 2500));
    const sentRows = await db.collection(" notifications").find({ "meta.announcement_id": String(rec?._id) }).toArray();
    L.check(sentRows.length === expect.operators && sentRows.every((n) => n.title === `Simba Logistics: ${title}` && n.type === "LOGISTICS_ADMIN_ANNOUNCEMENT"), `${sentRows.length} in-app notifications titled "Simba Logistics: …"`);
    const opList = await L.api("GET", "/customer/Notificationlist_user", { token: tok(st.operator) });
    L.check(JSON.stringify(opList).includes(`Simba Logistics: ${title}`), "operator sees it in their notifications");
    const custList = await L.api("GET", "/customer/Notificationlist_user", { token: tok(st.customer) });
    L.check(!JSON.stringify(custList).includes(title), "customers don't get an operators-only notice");

    await withModule("tasker");
    await a.page.goto(`${ADMIN_WEB}/Notification`, { waitUntil: "domcontentloaded" });
    await a.page.waitForLoadState("networkidle").catch(() => {});
    L.check(!(await L.bodyText(a)).includes(title), "Tasker notification list doesn't show logistics notices");
    await a.page.goto(`${ADMIN_WEB}/AddNotification`, { waitUntil: "domcontentloaded" });
    await a.page.waitForSelector('select[name="userType"]', { timeout: 10000 });
    const tvals = await a.page.locator('select[name="userType"] option').allInnerTexts();
    L.check(tvals.join("|") === "Select|All Users|All Customers|Service Provider", "Tasker keeps its original audiences");

    await db.collection(" notifications").deleteMany({ "meta.announcement_id": String(rec?._id) });
    await db.collection("admin_notifications").deleteOne({ _id: rec?._id });
    L.check(true, "test notice + its in-app rows removed");
  }

  L.sec("12.5 No OTP / password in admin responses");
  L.check(leaks.size === 0, `${leaks.size} leaking admin response(s)`, [...leaks]);

  L.sec("12.6 Cleanup");
  if (created.supportId) await db.collection("helpandsupports").deleteOne({ _id: created.supportId });
  for (const id of created.sosIds) {
    const al = await db.collection("logistics_sos_alerts").findOne({ _id: new L.mongoose.Types.ObjectId(String(id)) });
    await db.collection("logistics_sos_alerts").deleteOne({ _id: al?._id });
  }
  if (created.reportId) await db.collection("logistics_job_reports").deleteOne({ _id: new L.mongoose.Types.ObjectId(String(created.reportId)) });
  L.check(true, "e2e ticket / SOS / report removed");
  if (banBefore?.banned) {
    await db.collection("users").updateOne({ _id: ownerOid0 }, { $set: { logistics_ban: banBefore } });
    await db.collection("logistics_assets").updateMany({ owner_id: ownerOid0 }, { $set: { owner_banned: true } });
    L.check(true, "restored the ban that was on this owner before the run");
  }
  await a.ctx.close();
  await L.done();
})();
