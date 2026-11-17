/* Stage 20 — owner operates a unit (v2.7.61, client rule): an owner may run any unit of his own while
   no operator is using it, and the other way round. Regression: an owner who doesn't self-operate
   sees no quoting or go-live. End to end: Add unit "I operate it myself", licence + face review,
   go live, quote, job, delivery code, finish. Blocks: operator live / on a job, unassign freeing the
   unit, mid-job unassign refused, operator blocked while the owner is on, the go-live race, removed
   operators, multi-transit, targeted alerts, equipment. Own accounts; needs only state.json RUN. */
const L = require("./lib");
const F = require("./fleet-helpers");
const DOCS = require("./docs");

const { OID } = F;
const code = (r) => r?.data?.code;

(async () => {
  const st = L.loadState();
  const RUN = st.RUN || "run";
  const C = L.cast(RUN);
  const pOwner = C.slot("owner", "s20", 0);
  const pPlain = C.slot("owner", "s20", 1);
  const pOp = C.slot("operator", "s20", 0);
  const pOp2 = C.slot("operator", "s20", 1);
  const d = await L.db();
  const actors = [];
  const A = async (name, user, opts) => {
    const a = await L.actor(name, opts);
    actors.push(a);
    if (user) await L.seedAuth(a, { token: user.token, user });
    return a;
  };
  const unitDoc = (id) => d.collection("logistics_assets").findOne({ _id: OID(id) });
  const userDoc = (id) => d.collection("users").findOne({ _id: OID(id) });
  const unitRow = (a, id) => a.page.locator(`[data-unit-op="${id}"]`).first();

  try {
    await F.resetPeople([pOwner.email, pPlain.email, pOp.email, pOp2.email]);

    // ── Regression: an owner who never set this up
    L.sec("20a. Owner who doesn't self-operate: no quoting, no go-live (regression)");
    const plain = await F.makeOwner(pPlain);
    const plainTruck = await F.makeUnit(plain, C.unit("truck", 200));
    const customer = await L.makeCustomer(`cust.s20.${RUN}`);
    const earlyJob = await F.postJob(customer, { goods: `Plain owner goods ${RUN}` });
    let me = (await L.api("GET", "/logistics/me", { token: plain.token }))?.data;
    L.check(me?.owner_operator?.enabled === false && me?.owner_operator?.can_operate === false, "/me: owner_operator enabled=false, can_operate=false", me?.owner_operator);
    L.check(me?.user?.owner_operator?.enabled === false, "/me: owner_operator also inside user");
    const sess = (await L.api("GET", "/logistics/session", { token: plain.token }))?.data;
    L.check(JSON.stringify(sess?.permissions || sess?.session?.permissions || {}).includes("false") || !/can_act_on_jobs":true/.test(JSON.stringify(sess || {})), "session permissions don't let him act on jobs");
    const pq = await F.quote(plain, earlyJob, plainTruck._id);
    L.check(pq?.success === false, "API refuses his quote", pq?.message);
    L.check(!(await d.collection("logistics_quotes").countDocuments({ job_id: OID(earlyJob) })), "no quote saved");
    const pLive = await L.api("POST", `/logistics/asset/${plainTruck._id}/operate-self`, { token: plain.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
    L.check(pLive?.success === false && code(pLive) === "OWNER_NOT_ELIGIBLE" && (pLive?.data?.blocks || []).some((b) => b.code === "NOT_ENABLED"), "operate-self refused: OWNER_NOT_ELIGIBLE / NOT_ENABLED", pLive);
    const pAvail = await F.goLive(plain, plainTruck._id);
    L.check(pAvail?.success === false, "PATCH /me/availability refused", pAvail?.message);
    const po = await A("plain-owner", plain);
    await L.goto(po, `/logistics/owner/job/${earlyJob}`);
    await po.page.waitForTimeout(2500);
    L.check((await po.page.locator('input[aria-label="Quote amount"]').count()) === 0, "owner job page: no quote form");
    await po.page.goto(`${L.WEB}/logistics/driver`, { waitUntil: "domcontentloaded" });
    await po.page.waitForURL(/\/logistics\/owner/, { timeout: 15000 }).catch(() => {});
    L.check(/\/logistics\/owner/.test(po.page.url()), "/logistics/driver sends him back to the owner pages", po.page.url());
    await L.goto(po, "/logistics/owner/availability", `[data-unit-op="${plainTruck._id}"]`);
    L.check((await po.page.locator('[data-testid="owner-operator-card"]').count()) === 0, "Availability: no 'Operating units yourself' card");
    await unitRow(po, plainTruck._id).locator('[data-testid="use-unit-myself"]').click();
    await po.page.waitForSelector('[data-testid="owner-operator-setup"]', { timeout: 8000 }).catch(() => {});
    L.check(await po.page.locator('[data-testid="owner-operator-setup"]').isVisible(), "'Use this unit myself' opens the one-time set-up, not go-live");
    L.check(/Add your face photo/i.test(await po.page.locator('[data-testid="owner-operator-blocks"]').innerText().catch(() => "")), "set-up lists what is missing");
    L.check((await unitDoc(plainTruck._id)).owner_operating !== true, "unit not claimed");
    await L.shot(po, "s20-plain-setup");

    // ── Add unit: "Who operates this?"
    L.sec("20b. Add unit: 'I operate it myself' + one-time face photo (UI); licence optional");
    const owner = await F.makeOwner(pOwner);
    const o = await A("owner", owner);
    const truck1 = C.unit("truck", 201);
    const docInfo = { owner: owner.company, holder: owner.name, plate: truck1.plate, make: truck1.make, model: truck1.model, year: truck1.year, kind: "vehicle", expires: DOCS.addMonths(6) };
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    const p = o.page;
    await p.fill('input[placeholder="Truck 1"]', truck1.name);
    await p.fill('input[placeholder="e.g. AEB 1234"]', truck1.plate);
    await p.fill('input[placeholder="15"]', "16").catch(() => {});
    await p.fill('input[placeholder="Isuzu"]', truck1.make);
    await p.fill('input[placeholder="FVZ"]', truck1.model);
    await p.fill('input[placeholder="2019"]', truck1.year);
    await p.locator(".log-location-btn").first().click();
    await p.waitForSelector(".simba-book-loc-modal", { timeout: 10000 });
    await p.waitForTimeout(3000);
    await p.locator(".simba-book-loc-modal .btn-primary").click();
    await p.waitForTimeout(400);
    L.check(await p.locator(".log-who-operates").count(), "'Who operates this?' shown on Add unit");
    L.check(await p.locator('[data-testid="operated-by-invite"] input').isChecked().catch(() => false), "'Invite a new operator' is the default");
    await p.locator('[data-testid="operated-by-self"]').click();
    await p.waitForSelector('[data-testid="owner-operator-setup"]', { timeout: 8000 });
    L.check(await p.locator('[data-testid="owner-operator-setup"]').isVisible(), "picking 'I operate it myself' shows licence and face photo");
    await L.shot(o, "s20-add-unit-self");
    const setup = p.locator('[data-testid="owner-operator-setup"]').first();
    L.check(await setup.locator('[data-testid="owner-operator-save"]').isDisabled(), "Save disabled until a file is chosen");
    await L.addFacePhoto(p, 3);
    const licRow = L.docRow(p, "Driving / plant licence").first();
    await licRow.locator('input[type="file"]').setInputFiles(await L.docFile("licence", { holder: owner.name, face: DOCS.face(3), expires: DOCS.addMonths(6), kind: "vehicle" }));
    await L.pickDate(p, licRow.locator(".log-doc-row__expiry input"), 6);
    await setup.locator('[data-testid="owner-operator-save"]').click();
    L.check(await L.waitText(o, /Simba Tasker will check your documents/), "toast: Simba will check");
    await p.waitForSelector('[data-testid="owner-face-status"]', { timeout: 8000 }).catch(() => {});
    L.check(/Pending|check/i.test(await p.locator('[data-testid="owner-face-status"]').first().innerText().catch(() => "")), "face photo shows pending", await p.locator('[data-testid="owner-face-status"]').first().innerText().catch(() => "missing"));
    let ou = await userDoc(owner._id);
    L.check(ou.logistics_self_operator === true, "DB: logistics_self_operator=true");
    L.check(ou.logistics_face_review?.status === "pending" && (ou.logistics_documents || []).some((x) => x.type === "licence" && x.review?.status === "pending"), "DB: face photo Pending; licence added too (optional), Pending");
    // Documents for the unit itself
    const rego = L.docRow(p, "Road licence").first();
    await rego.locator('input[type="file"]').setInputFiles(await L.docFile("rego", docInfo));
    await L.pickDate(p, rego.locator(".log-doc-row__expiry input"), 6);
    const rw = L.docRow(p, "Roadworthy").first();
    L.check(!/\*/.test(await rw.locator(".log-doc-row__body > b").innerText().catch(() => "")), "Roadworthy row not marked * (optional)", await rw.innerText().catch(() => "missing"));
    await rw.locator('input[type="file"]').setInputFiles(await L.docFile("roadworthy", docInfo));
    await L.pickDate(p, rw.locator(".log-doc-row__expiry input"), 6);
    await L.addUnitPhotos(p, "form.log-fleet-form", truck1.photos);
    await p.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Vehicle added/), "Vehicle added toast");
    await p.waitForTimeout(1000);
    let t1Doc = await d.collection("logistics_assets").findOne({ registration: truck1.plate });
    L.check(t1Doc?.owner_operating === true, "DB: owner_operating=true", t1Doc?.owner_operating);
    L.check((t1Doc?.assigned_sub_user_ids || []).length === 0, "the owner isn't added to assigned_sub_user_ids", t1Doc?.assigned_sub_user_ids);
    const T1 = { _id: String(t1Doc._id), name: truck1.name, plate: truck1.plate };
    await L.verifyDocs("asset", T1._id);
    const T2 = await F.makeUnit(owner, C.unit("truck", 202), { body: { operated_by: "invite" } });
    L.check((await unitDoc(T2._id)).owner_operating !== true, "API: operated_by=invite leaves owner_operating off");
    const usage = (await L.api("GET", "/logistics/subscription", { token: owner.token }))?.data?.usage;
    const opSeat = usage?.operators?.used ?? usage?.operators ?? usage?.sub_users?.used ?? usage?.sub_users ?? 0;
    L.check(Number(opSeat) === 0, "self-operating uses no operator seat", usage);

    // ── Stricter check
    L.sec("20c. Blocked until face photo, owner ID and licence are Verified (licence compulsory, v2.7.68)");
    const expectBlocked = async (label, want) => {
      const r = await L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
      L.check(r?.success === false && code(r) === "OWNER_NOT_ELIGIBLE" && (r?.data?.blocks || []).some((b) => b.code === want), `${label}: refused, block ${want}`, r?.data || r);
    };
    await expectBlocked("face Pending", "FACE_PHOTO_PENDING");
    {
      const m = (await L.api("GET", "/logistics/me", { token: owner.token }))?.data?.owner_operator;
      L.check(m?.licence?.required === true && (m?.blocks || []).some((b) => b.code === "LICENCE_PENDING"), "/me: licence required, LICENCE_PENDING while Simba checks it", m);
    }
    const qBlocked = await F.postJob(customer, { goods: `Blocked quote ${RUN}` });
    let r = await F.quote(owner, qBlocked, T1._id);
    L.check(r?.success === false, "quote refused while not eligible", r?.message);
    await L.goto(o, "/logistics/owner/availability", '[data-testid="owner-operator-card"]');
    L.check(await o.page.locator('[data-testid="owner-operator-blocks"]').isVisible(), "Availability card lists the blocks");
    const admin = await L.adminToken();
    const lic = async () => (await userDoc(owner._id)).logistics_documents.find((x) => x.type === "licence");
    r = await L.api("POST", "/admin/logistics/documents/review", { token: admin, body: { subject: "operator", id: owner._id, doc_id: String((await lic())._id), status: "verified" } });
    L.check(r?.success !== false, "admin verifies the owner's licence via subject=operator", r?.message);
    await expectBlocked("licence Verified, face Pending", "FACE_PHOTO_PENDING");
    r = await L.api("POST", "/admin/logistics/documents/review", { token: admin, body: { subject: "face_photo", id: owner._id, status: "rejected", reason_code: "unreadable" } });
    L.check(r?.success !== false && r?.data?.face_photo?.status === "rejected", "admin rejects the face photo via subject=face_photo", r);
    await expectBlocked("face Rejected", "FACE_PHOTO_REJECTED");
    await L.goto(o, "/logistics/owner/availability", '[data-testid="owner-face-status"]');
    L.check((await o.page.locator('[data-testid="owner-face-status"]').getAttribute("data-review")) === "rejected", "owner sees the rejected face photo");
    await F.enableSelfOperator(owner, { verify: false });
    // Only the face stays new; the licence was re-uploaded too, so verify both
    await F.verifySelfOperator(owner);
    // Owner ID Rejected: stricter than operators, no grace period
    const idDoc = (await userDoc(owner._id)).logistics_business_documents.find((x) => x.type === "owner_id");
    await L.api("POST", "/admin/logistics/documents/review", { token: admin, body: { subject: "business", id: owner._id, doc_id: String(idDoc._id), status: "rejected", reason_code: "expired" } });
    {
      // A rejected required business document also takes the company back to not approved
      const rid = await L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
      L.check(rid?.success === false && (rid?.data?.blocks || []).some((b) => b.code === "OWNER_ID_REJECTED"), "owner ID Rejected: refused, block OWNER_ID_REJECTED", rid?.data || rid);
    }
    await L.api("POST", "/admin/logistics/documents/review", { token: admin, body: { subject: "business", id: owner._id, doc_id: String(idDoc._id), status: "verified" } });
    await L.approveOwner(owner._id, "approved", "", { withDocs: false });
    // v2.7.68: an expired licence blocks again
    {
      const u = await userDoc(owner._id);
      const docs = u.logistics_documents.map((x) => (x.type === "licence" ? { ...x, expires: new Date(Date.now() - 3 * F.DAY) } : x));
      await d.collection("users").updateOne({ _id: u._id }, { $set: { logistics_documents: docs } });
      const m = (await L.api("GET", "/logistics/me", { token: owner.token }))?.data?.owner_operator;
      L.check(m?.can_operate === false && (m?.blocks || []).some((b) => b.code === "LICENCE_EXPIRED") && m?.licence?.needs_upload === true, "licence expired: can't operate, LICENCE_EXPIRED, asks for the renewed one", m);
      await d.collection("users").updateOne({ _id: u._id }, { $set: { logistics_documents: u.logistics_documents } });
    }
    me = (await L.api("GET", "/logistics/me", { token: owner.token }))?.data;
    L.check(me?.owner_operator?.can_operate === true && me?.owner_operator?.blocks?.length === 0, "all Verified: can_operate=true", me?.owner_operator);
    L.check(me?.logistics_self_operator === true, "/me: logistics_self_operator=true");
    await L.goto(o, "/logistics/owner/availability", '[data-testid="owner-operator-ready"]');
    L.check(await o.page.locator('[data-testid="owner-operator-ready"]').isVisible(), "Availability: ready message");
    await L.shot(o, "s20-ready");

    // ── Status + use unit
    L.sec("20d. 'Use this unit myself' on Availability, real status, stop using (UI)");
    await L.goto(o, "/logistics/owner/availability", `[data-unit-op="${T1._id}"]`);
    const rowOf = (id) => o.page.locator("tr").filter({ has: o.page.locator(`[data-unit-op="${id}"]`) });
    {
      const opts = await rowOf(T2._id).locator('[data-testid="unit-status-select"] option').allInnerTexts();
      L.check(!opts.includes("Available now"), "T2 (nobody live): dropdown can't offer 'Available now'", opts);
    }
    await unitRow(o, T1._id).locator('[data-testid="use-unit-myself"]').click();
    await unitRow(o, T1._id).locator('[data-testid="unit-owner-operating"]').waitFor({ timeout: 15000 });
    L.check(true, "'You are operating this' shown");
    L.check(await unitRow(o, T1._id).locator('[data-testid="open-operator-dashboard"]').count(), "link to the operator dashboard");
    await L.shot(o, "s20-operating");
    ou = await userDoc(owner._id);
    L.check(ou.logistics_availability?.state === "available_now" && String(ou.logistics_availability?.active_asset_id) === T1._id, "DB: owner live on T1", ou.logistics_availability);
    t1Doc = await unitDoc(T1._id);
    L.check(t1Doc.owner_operating === true, "DB: unit owner_operating");
    const opts1 = await rowOf(T1._id).locator('[data-testid="unit-status-select"] option').allInnerTexts();
    L.check(opts1.includes("Available now"), "T1 (owner live): dropdown offers Available now", opts1);
    L.check((await rowOf(T1._id).locator('[data-testid="unit-status-select"]').inputValue()) === "available_now", "dropdown shows the real status");
    L.check(Array.isArray(t1Doc.location?.coordinates) && Math.abs(t1Doc.location.coordinates[1] - L.HOME.latitude) < 0.01, "GPS from the page stored on the unit (flat lat/lng + location)", t1Doc.location);
    let detail = (await L.api("GET", `/logistics/asset/${T1._id}`, { token: owner.token }))?.data;
    L.check(detail?.occupancy?.busy === true && detail?.occupancy?.by === "owner" && detail?.asset?.owner_operating === true, "unit detail: occupancy by owner", detail?.occupancy);
    const fleetRows = (await L.api("GET", "/logistics/assets", { token: owner.token }))?.data;
    const fleetRow = (fleetRows?.assets || fleetRows?.data || fleetRows || []).find?.((x) => x._id === T1._id);
    L.check(fleetRow?.occupancy?.by === "owner" && fleetRow?.owner_operating === true, "fleet row: occupancy + owner_operating", fleetRow?.occupancy);
    const listed = async (id) => {
      const s = await L.api("GET", "/logistics/assets/search?kind=vehicle&limit=200", { token: customer.token });
      return (s?.data?.data || []).some((x) => String(x.asset_id || x._id) === String(id));
    };
    L.check(await listed(T1._id), "customers can find the unit the owner is live on");
    await unitRow(o, T1._id).locator('[data-testid="stop-using-unit"]').click();
    await unitRow(o, T1._id).locator('[data-testid="use-unit-myself"]').waitFor({ timeout: 15000 });
    ou = await userDoc(owner._id);
    L.check(ou.logistics_availability?.state === "offline", "Stop using: owner offline", ou.logistics_availability?.state);
    const cv = (await L.api("GET", `/logistics/asset/${T1._id}`, { token: customer.token }))?.data?.asset?.availability;
    L.check(cv?.bookable === false, "customer view: not bookable once he stops", cv);

    // Fields sent separately (frontend sends both)
    L.sec("20e. operate-self body forms (frontend/backend contract)");
    r = await L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "available_now", location: { lat: 30.70, lng: 76.71 } } });
    t1Doc = await unitDoc(T1._id);
    L.check(r?.success !== false && Math.abs(t1Doc.location?.coordinates?.[1] - 30.70) < 0.001, "location:{lat,lng} alone is used", { r: r?.message, loc: t1Doc.location });
    r = await L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG, location: { lat: F.LAT, lng: F.LNG } } });
    t1Doc = await unitDoc(T1._id);
    L.check(r?.success !== false && Math.abs(t1Doc.location?.coordinates?.[1] - F.LAT) < 0.001, "flat lat/lng + location together", { r: r?.message, loc: t1Doc.location });
    r = await L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "bogus" } });
    L.check(r?.success === false, "unknown state refused", r?.message);
    await F.goOffline(owner);

    // ── Operator vs owner
    L.sec("20f. Operator blocked while the owner is on the unit");
    const op1 = await F.makeOperator(owner, pOp, { assets: [T1._id, T2._id] });
    await F.goLive(owner, T1._id);
    r = await F.goLive(op1, T1._id);
    L.check(r?.success === false && code(r) === "UNIT_IN_USE_BY_OWNER", "operator → UNIT_IN_USE_BY_OWNER", r);
    const opA = await A("operator", op1);
    await L.goto(opA, "/logistics/driver", ".log-dash-avail-controls");
    await opA.page.waitForTimeout(1500);
    const pickBtn = opA.page.locator(".log-unit-pick button, .log-unit-pick__trigger, [aria-haspopup='listbox']").first();
    if (await pickBtn.count()) await pickBtn.click().catch(() => {});
    await opA.page.waitForTimeout(500);
    const inUse = opA.page.locator('[data-testid="unit-pick-in-use"]');
    L.check((await inUse.count()) >= 1 && /in use/i.test(await inUse.first().innerText().catch(() => "")), "operator's unit picker marks the unit in use", await inUse.first().innerText().catch(() => "not shown"));
    await L.shot(opA, "s20-operator-blocked");
    await F.goOffline(owner);
    r = await F.goLive(op1, T1._id);
    L.check(r?.success !== false, "owner offline → operator can go live", r?.message);

    L.sec("20g. Owner blocked while an operator is live; freed when he goes offline");
    r = await L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
    L.check(r?.success === false && code(r) === "UNIT_IN_USE_BY_OPERATOR" && r?.data?.operator?.id === op1._id && r?.data?.operator?.name === op1.name && r?.data?.reason === "live", "owner → UNIT_IN_USE_BY_OPERATOR naming the operator, reason live", r);
    r = await L.api("PATCH", `/logistics/asset/${T1._id}/availability`, { token: owner.token, body: { state: "offline" } });
    L.check(r?.success === false && code(r) === "UNIT_IN_USE_BY_OPERATOR", "owner's status control can't force a live operator off", r);
    L.check((await userDoc(op1._id)).logistics_availability?.state === "available_now", "operator stays live");
    await L.goto(o, "/logistics/owner/availability", `[data-unit-op="${T1._id}"]`);
    await unitRow(o, T1._id).locator('[data-testid="unit-in-use"]').waitFor({ timeout: 10000 });
    L.check(new RegExp(op1.name.split(" ")[0]).test(await unitRow(o, T1._id).locator('[data-testid="unit-in-use"]').innerText()), "UI: 'In use by <operator>'", await unitRow(o, T1._id).locator('[data-testid="unit-in-use"]').innerText());
    L.check(await unitRow(o, T1._id).locator('[data-testid="unit-unassign"]').count(), "UI: Unassign action next to it");
    await L.shot(o, "s20-in-use");
    await F.goOffline(op1);
    await o.page.reload();
    await unitRow(o, T1._id).locator('[data-testid="use-unit-myself"]').waitFor({ timeout: 15000 });
    L.check(true, "operator offline → 'Use this unit myself' is back");

    L.sec("20h. Unassign frees the unit and puts the operator offline (UI)");
    await F.goLive(op1, T1._id);
    await o.page.reload();
    await unitRow(o, T1._id).locator('[data-testid="unit-unassign"]').waitFor({ timeout: 15000 });
    o.page.once("dialog", (dlg) => dlg.accept());
    await unitRow(o, T1._id).locator('[data-testid="unit-unassign"]').click();
    L.check(await L.waitText(o, /unassigned/i), "toast: unassigned");
    await unitRow(o, T1._id).locator('[data-testid="use-unit-myself"]').waitFor({ timeout: 15000 });
    t1Doc = await unitDoc(T1._id);
    L.check(!(t1Doc.assigned_sub_user_ids || []).map(String).includes(op1._id), "DB: operator off the unit (sent sub_user_id)");
    let opU = await userDoc(op1._id);
    L.check(opU.logistics_availability?.state === "offline" && !opU.logistics_availability?.active_asset_id, "DB: operator offline, stale unit cleared", opU.logistics_availability);
    r = await F.goLive(op1, T1._id);
    L.check(r?.success === false, "removed operator can't go live on that unit", r?.message);
    // Quote check re-reads assignment
    const qRemoved = await F.postJob(customer, { goods: `Removed op ${RUN}` });
    r = await F.quote(op1, qRemoved, T1._id);
    L.check(r?.success === false, "removed operator can't quote with that unit", r?.message);

    L.sec("20i. Exclusivity race: owner and operator go live at once, exactly one wins");
    await L.api("POST", `/logistics/asset/${T1._id}/assign`, { token: owner.token, body: { sub_user_id: op1._id } });
    for (let i = 0; i < 6; i++) {
      await Promise.all([F.goOffline(owner), F.goOffline(op1)]);
      const [ro, rp] = await Promise.all([
        L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } }),
        F.goLive(op1, T1._id),
      ]);
      const wins = [ro, rp].filter((x) => x?.success !== false).length;
      const uo = await userDoc(owner._id);
      const up = await userDoc(op1._id);
      const live = [uo, up].filter((u) => u.logistics_availability?.state === "available_now" && String(u.logistics_availability?.active_asset_id) === T1._id).length;
      L.check(wins === 1 && live === 1, `race ${i + 1}: exactly one winner (${ro?.success !== false ? "owner" : "operator"})`, { wins, live, owner: ro?.data?.code || ro?.message, op: rp?.data?.code || rp?.message });
    }
    await Promise.all([F.goOffline(owner), F.goOffline(op1)]);

    // ── End to end
    L.sec("20j. Owner runs a job end to end: quote, accept, status, code, finish (UI)");
    await F.goLive(owner, T1._id);
    const c = await A("customer", customer);
    const goods = `Cement ${RUN} s20`;
    const jobId = await L.postTransportJob(c, { goods });
    await L.goto(o, "/logistics/driver/work");
    await o.page.waitForTimeout(2000);
    L.check((await L.bodyText(o)).includes(goods), "job in the owner's available work");
    await L.goto(o, `/logistics/driver/job/${jobId}`);
    await o.page.waitForSelector('input[aria-label="Quote amount"]', { timeout: 15000 });
    await L.typeMoney(o.page, 'input[aria-label="Quote amount"]', "260");
    await o.page.fill('textarea[placeholder="e.g. Can collect from 7am…"]', "I can load it myself tomorrow morning.");
    await o.page.getByRole("button", { name: /Send my quote|Send new quote|Update quote/ }).last().click();
    L.check(await L.waitText(o, /Quote (sent|submitted)|quoted/i), "quote sent");
    await o.page.waitForTimeout(800);
    const qt = await d.collection("logistics_quotes").findOne({ job_id: OID(jobId) });
    L.check(qt && String(qt.driver_id) === owner._id && String(qt.asset_id) === T1._id, "quote by the owner on his unit", qt && { d: qt.driver_id, a: qt.asset_id });
    L.check(qt?.owner_driven === true, "quote owner_driven=true", qt?.owner_driven);
    await L.goto(c, `/logistics/jobs/${jobId}`);
    const acc = c.page.getByRole("button", { name: /^Accept USD 260/ });
    await acc.first().waitFor({ timeout: 15000 });
    await acc.first().click();
    L.check(await L.waitText(c, /Quote accepted/), "customer accepts");
    let job = await d.collection("transport_jobs").findOne({ _id: OID(jobId) });
    L.check(Number(job.status) === 1 && String(job.assigned?.driver_id) === owner._id, "job assigned to the owner", job.assigned);
    const jobApi = (await L.api("GET", `/logistics/job/${jobId}`, { token: owner.token }))?.data?.job;
    L.check(jobApi?.driver_is_owner === true, "job payload driver_is_owner=true", jobApi?.driver_is_owner);

    await L.goto(o, `/logistics/driver/job/${jobId}`);
    await o.page.waitForTimeout(1500);
    const jobText0 = await L.bodyText(o);
    L.check(!/transport_|in_transit|status_\d|TRANSPORT_JOB/.test(jobText0), "no raw status label on the job page", jobText0.slice(0, 200));
    L.check(!/Reassign/i.test(jobText0), "fleet panel hidden on the job he's driving");
    await L.shot(o, "s20-owner-job");

    // Busy while on a job
    r = await L.api("POST", `/logistics/asset/${T1._id}/release-self`, { token: owner.token });
    L.check(r?.success === false && code(r) === "ACTIVE_JOB", "release-self refused during his job (ACTIVE_JOB)", r);
    r = await F.goLive(op1, T1._id);
    L.check(r?.success === false && code(r) === "UNIT_IN_USE_BY_OWNER", "operator can't take a unit the owner has a job on", r);
    await L.goto(o, "/logistics/owner/availability", `[data-unit-op="${T1._id}"]`);
    L.check(await unitRow(o, T1._id).locator('[data-testid="unit-owner-operating"]').count(), "Availability: still 'You are operating this'");
    L.check(await unitRow(o, T1._id).locator('[data-testid="unit-view-job"]').count(), "View job link while on the job");
    L.check((await unitRow(o, T1._id).locator('[data-testid="stop-using-unit"]').count()) === 0, "no 'Stop using' on a running job");

    const t0 = F.nowIso();
    await L.goto(o, `/logistics/driver/job/${jobId}`);
    for (const lbl of ["Confirm en route to pickup", "Confirm arrival at pickup", "Start delivery"]) {
      const b = o.page.getByRole("button", { name: lbl });
      await b.waitFor({ timeout: 15000 });
      await b.click();
      await o.page.waitForTimeout(1500);
    }
    job = await d.collection("transport_jobs").findOne({ _id: OID(jobId) });
    L.check(Number(job.status) === 4, "status reached 4 (in transit)", job.status);
    const next = o.page.locator(".logistics-cta--primary").filter({ hasText: /deliver|complete|OTP/i }).first();
    await next.click();
    await o.page.waitForTimeout(1500);
    await L.goto(c, `/logistics/jobs/${jobId}`);
    const otpEl = c.page.locator(".log-delivery-otp-banner__code").last();
    await otpEl.waitFor({ timeout: 15000 });
    const otp = (await otpEl.innerText()).replace(/\D/g, "");
    L.check(/^\d{4}$/.test(otp), "customer sees the delivery code", otp);
    await o.page.waitForTimeout(1200);
    const out = F.waTo(t0, customer.phone);
    L.check(out.some((m) => m.ok && m.template === "otp" && String(JSON.stringify(m.variables)).includes(otp)), "delivery code sent through the OTP template (item 34)", out.map((m) => m.template));
    L.check(out.some((m) => m.ok && m.template === "job_status" && /your confirmation code/.test(m.variables?.["2"] || "") && !m.variables["2"].includes(otp)), "then a job update explaining it, without the code", out.map((m) => m.variables?.["2"]));
    await o.page.fill('input[aria-label="Delivery OTP"]', otp);
    await o.page.locator("form.log-delivery-otp button[type=submit]").click();
    L.check(await L.waitText(o, /Delivery confirmed/), "Delivery confirmed toast");
    job = await d.collection("transport_jobs").findOne({ _id: OID(jobId) });
    L.check(Number(job.status) === 5, "job status 5 (delivered)", job.status);
    t1Doc = await unitDoc(T1._id);
    L.check((await userDoc(owner._id)).logistics_availability?.state === "available_now", "owner still live after finishing");
    await c.page.reload();
    await c.page.waitForSelector(".log-rate-modal", { timeout: 10000 }).catch(() => {});
    await c.page.locator(".log-rate-modal__later").click().catch(() => {});

    // Offline owner finishing a job: no phantom "available now"
    L.sec("20k. Finishing a job with nobody live doesn't show 'Available now'");
    const j2 = await F.postJob(customer, { goods: `Second job ${RUN}` });
    const q2 = await F.quote(owner, j2, T1._id);
    L.check(q2?.success !== false, "second quote", q2?.message);
    await F.acceptQuote(customer, j2, q2?.data?.quote?._id);
    for (const s of [2, 3, 4]) await F.setStatus(owner, j2, s, { coordinates: [F.LNG, F.LAT] });
    await F.goOffline(owner).catch(() => {});
    await d.collection("users").updateOne({ _id: OID(owner._id) }, { $set: { "logistics_availability.state": "offline" } });
    await F.setStatus(owner, j2, 5);
    const otp2 = (await d.collection("transport_jobs").findOne({ _id: OID(j2) }))?.delivery_otp;
    const conf = await L.api("POST", `/logistics/job/${j2}/confirm-delivery`, { token: owner.token, body: { otp: otp2, code: otp2 } });
    const j2after = await d.collection("transport_jobs").findOne({ _id: OID(j2) });
    if (Number(j2after.status) === 5) {
      const a = await unitDoc(T1._id);
      L.check(a.availability_state !== "available_now" || (await userDoc(owner._id)).logistics_availability?.state === "available_now", "unit isn't left 'available now' with nobody live", { unit: a.availability_state });
      const row = (await L.api("GET", `/logistics/asset/${T1._id}`, { token: customer.token }))?.data?.asset;
      L.check(row?.availability?.bookable !== true, "customer view: not bookable", row?.availability);
    } else L.check(false, "second job finished", { conf: conf?.message, s: j2after.status });

    // ── Operator holds the unit through a job
    L.sec("20l. Operator on an active job: owner blocked, unassign / delete refused, reassign to the owner works");
    await F.goOffline(owner);
    const r0 = await F.goLive(op1, T1._id);
    L.check(r0?.success !== false, "operator live on T1", r0?.message);
    const j3 = await F.postJob(customer, { goods: `Operator job ${RUN}` });
    const q3 = await F.quote(op1, j3, T1._id);
    L.check(q3?.success !== false && q3?.data?.quote?.owner_driven !== true, "operator quote (not owner driven)", q3?.message);
    const ac3 = await F.acceptQuote(customer, j3, q3?.data?.quote?._id);
    L.check(ac3?.success !== false, "accepted", ac3?.message);
    await F.setStatus(op1, j3, 2);
    await F.goOffline(op1);
    r = await L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
    L.check(r?.success === false && code(r) === "UNIT_IN_USE_BY_OPERATOR" && r?.data?.reason === "on_job" && String(r?.data?.job_id) === j3, "offline but mid-job: still in use (reason on_job, job id)", r);
    await L.goto(o, "/logistics/owner/availability", `[data-unit-op="${T1._id}"]`);
    await unitRow(o, T1._id).locator('[data-testid="unit-in-use"]').waitFor({ timeout: 10000 });
    L.check(await unitRow(o, T1._id).locator('[data-testid="unit-view-job"]').count(), "UI: View job link on the busy unit");
    o.page.once("dialog", (dlg) => dlg.accept());
    await unitRow(o, T1._id).locator('[data-testid="unit-unassign"]').click();
    L.check(await L.waitText(o, /active job|finish|reassign/i), "UI: mid-job unassign refused with the reason");
    r = await L.api("DELETE", `/logistics/asset/${T1._id}/assign`, { token: owner.token, body: { sub_user_id: op1._id } });
    L.check(r?.success === false && code(r) === "OPERATOR_ON_ACTIVE_JOB" && String(r?.data?.job_id) === j3, "API: unassign → OPERATOR_ON_ACTIVE_JOB with job id", r);
    r = await L.api("DELETE", `/logistics/sub-user/${op1._id}`, { token: owner.token });
    L.check(r?.success === false && code(r) === "OPERATOR_ON_ACTIVE_JOB", "API: delete operator → OPERATOR_ON_ACTIVE_JOB", r);
    L.check((await unitDoc(T1._id)).assigned_sub_user_ids.map(String).includes(op1._id), "assignment untouched");
    await L.shot(o, "s20-midjob-refused");
    // Frontend sends sub_user_id and driver_id; each alone must work too
    r = await L.api("POST", `/logistics/job/${j3}/reassign`, { token: owner.token, body: { sub_user_id: owner._id, driver_id: owner._id, asset_id: T1._id } });
    L.check(r?.success !== false, "reassign to the owner (sub_user_id + driver_id)", r?.message);
    job = await d.collection("transport_jobs").findOne({ _id: OID(j3) });
    L.check(String(job.assigned?.driver_id) === owner._id, "job now on the owner", job.assigned);
    r = await L.api("DELETE", `/logistics/asset/${T1._id}/assign`, { token: owner.token, body: { sub_user_id: op1._id } });
    L.check(r?.success !== false, "job moved: unassign now works", r?.message);
    // Owner's reject branch: he rejects his own job as its operator, not through the OTP meant for an operator's job
    r = await L.api("POST", `/logistics/job/${j3}/reject`, { token: owner.token, body: { reason: "Breakdown" } });
    let j3a = await d.collection("transport_jobs").findOne({ _id: OID(j3) });
    L.check(r?.success === false && !r?.data?.needs_otp && !j3a.reject_otp_pending, "after Collect started: refused like an operator, no reject code sent to the customer", r);
    for (const s2 of [3, 4, 5]) await F.setStatus(owner, j3, s2, { coordinates: [F.LNG, F.LAT] });
    j3a = await d.collection("transport_jobs").findOne({ _id: OID(j3) });
    r = await L.api("POST", `/logistics/job/${j3}/confirm-delivery`, { token: owner.token, body: { otp: j3a.delivery_otp } });
    j3a = await d.collection("transport_jobs").findOne({ _id: OID(j3) });
    L.check(Number(j3a.status) === 5, "the owner finishes the job reassigned to him", { s: j3a.status, m: r?.message });
    r = await L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
    const j3b = await F.postJob(customer, { goods: `Owner rejects ${RUN}` });
    const q3b = await F.quote(owner, j3b, T1._id);
    await F.acceptQuote(customer, j3b, q3b?.data?.quote?._id);
    r = await L.api("POST", `/logistics/job/${j3b}/reject`, { token: owner.token, body: { reason: "Breakdown" } });
    const j3c = await d.collection("transport_jobs").findOne({ _id: OID(j3b) });
    L.check(r?.success !== false && !r?.data?.needs_otp && !j3c.reject_otp_pending && Number(j3c.status) !== 1, "before Collect: owner's reject takes effect directly", { m: r?.message, s: j3c.status, otp: r?.data?.needs_otp });
    await F.goOffline(owner);
    // Reassign refused when the owner isn't eligible
    await L.api("POST", `/logistics/asset/${T2._id}/assign`, { token: owner.token, body: { sub_user_id: op1._id } });
    const r1a = await F.goLive(op1, T2._id);
    L.check(r1a?.success !== false, "operator live on T2", r1a?.message);
    const j4 = await F.postJob(customer, { goods: `Reassign block ${RUN}` });
    const q4 = await F.quote(op1, j4, T2._id);
    await F.acceptQuote(customer, j4, q4?.data?.quote?._id);
    await d.collection("users").updateOne({ _id: OID(owner._id) }, { $set: { logistics_face_review: { ...(await userDoc(owner._id)).logistics_face_review, status: "rejected" } } });
    r = await L.api("POST", `/logistics/job/${j4}/reassign`, { token: owner.token, body: { driver_id: owner._id, asset_id: T2._id } });
    L.check(r?.success === false && code(r) === "OWNER_NOT_ELIGIBLE", "reassign to an ineligible owner refused", r);
    await d.collection("users").updateOne({ _id: OID(owner._id) }, { $set: { "logistics_face_review.status": "verified" } });
    // QUOTE_OPERATOR_REMOVED: a pending quote of an operator since taken off the unit
    const j5 = await F.postJob(customer, { goods: `Removed before accept ${RUN}` });
    const op2 = await F.makeOperator(owner, pOp2, { assets: [T1._id], face: 4 });
    await F.goOffline(owner);
    const r5 = await F.goLive(op2, T1._id);
    L.check(r5?.success !== false, "operator 2 live on T1", r5?.message);
    const q5 = await F.quote(op2, j5, T1._id);
    L.check(q5?.success !== false, "operator 2 quotes", q5?.message);
    await L.api("DELETE", `/logistics/asset/${T1._id}/assign`, { token: owner.token, body: { sub_user_id: op2._id } });
    r = await F.acceptQuote(customer, j5, q5?.data?.quote?._id);
    L.check(r?.success === false && code(r) === "QUOTE_OPERATOR_REMOVED", "accepting a removed operator's quote → QUOTE_OPERATOR_REMOVED", r);
    // Tidy: T2's job keeps op1 assigned; finish it through cancel so T2 is free later
    await L.api("POST", `/logistics/job/${j4}/cancel`, { token: customer.token, body: { reason: "Not needed" } });
    await F.goOffline(op1);

    // ── Multi-transit, equipment, targeted alerts
    L.sec("20m. Multi-transit with an owner");
    await F.goOffline(owner);
    const j6 = await F.postJob(customer, { goods: `MT one ${RUN}` });
    const j7 = await F.postJob(customer, { goods: `MT two ${RUN}` });
    await L.api("DELETE", `/logistics/asset/${T1._id}/assign`, { token: owner.token, body: { sub_user_id: op1._id } }).catch(() => {});
    const rl = await L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
    L.check(rl?.success !== false, "owner live on T1", rl);
    const q6 = await F.quote(owner, j6, T1._id);
    const q7 = await F.quote(owner, j7, T1._id);
    await F.acceptQuote(customer, j6, q6?.data?.quote?._id);
    await F.acceptQuote(customer, j7, q7?.data?.quote?._id);
    r = await L.api("GET", "/logistics/multi-transits/eligible", { token: owner.token });
    L.check(r?.success !== false && JSON.stringify(r?.data || {}).includes(j6), "eligible list includes his accepted jobs", r?.message);
    r = await L.api("POST", "/logistics/multi-transits", { token: owner.token, body: { job_ids: [j6, j7] } });
    L.check(r?.success !== false, "self-operating owner creates a multi-transit", r?.message);
    const mt = await d.collection("logistics_multi_transits").findOne({ operator_id: OID(owner._id) }).catch(() => null) || r?.data;
    L.check(!!mt, "multi-transit stored for him");
    r = await L.api("POST", "/logistics/multi-transits", { token: plain.token, body: { job_ids: [j6, j7] } });
    L.check(r?.success === false, "an owner who doesn't self-operate can't create one", r?.message);
    await L.api("POST", `/logistics/job/${j6}/cancel`, { token: customer.token, body: { reason: "End of test" } });
    await L.api("POST", `/logistics/job/${j7}/cancel`, { token: customer.token, body: { reason: "End of test" } });

    L.sec("20n. Alerts reach an owner live on his own unit; only then");
    {
      const t = F.nowIso();
      const j = await F.postJob(customer, { goods: `Alert truck ${RUN}` });
      await new Promise((ok) => setTimeout(ok, 1500));
      const notes = await d.collection(" notifications").countDocuments({ receiver_id: OID(owner._id), job_id: OID(j) });
      L.check(notes >= 1, "live self-operating owner gets the new-job notification", notes);
      L.check(F.waTo(t, owner.phone).some((m) => m.ok && m.template === "new_job"), "and the new-job WhatsApp (essential, Free plan)", F.waTo(t, owner.phone).map((m) => m.template));
      const plainNote = await d.collection(" notifications").countDocuments({ receiver_id: OID(plain._id), job_id: OID(j) });
      L.check(plainNote === 0, "an owner who doesn't self-operate gets no operator alert", plainNote);
      await L.api("POST", `/logistics/job/${j}/cancel`, { token: customer.token, body: { reason: "End of test" } });
    }
    await F.goOffline(owner);
    {
      const j = await F.postJob(customer, { goods: `Alert offline ${RUN}` });
      await new Promise((ok) => setTimeout(ok, 1200));
      L.check((await d.collection(" notifications").countDocuments({ receiver_id: OID(owner._id), job_id: OID(j), type: { $regex: "new_job|job_nearby|nearby", $options: "i" } })) === 0, "owner offline: no alert");
      await L.api("POST", `/logistics/job/${j}/cancel`, { token: customer.token, body: { reason: "End of test" } });
    }

    L.sec("20o. Equipment: owner operates it, targeted booking alert");
    {
      const eq = await F.makeUnit(owner, C.unit("jcb", 203), { kind: "equipment" });
      L.check(!!eq._id, "equipment added with 1 document");
      r = await L.api("POST", `/logistics/asset/${eq._id}/operate-self`, { token: owner.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
      L.check(r?.success !== false, "owner goes live on his equipment (no equipment exemption)", r?.message);
      const eqRow = await unitDoc(eq._id);
      L.check(eqRow.owner_operating === true, "equipment owner_operating", eqRow.owner_operating);
      const search = await L.api("GET", "/logistics/assets/search?kind=equipment&limit=200", { token: customer.token });
      L.check((search?.data?.data || []).some((x) => String(x.asset_id || x._id) === eq._id), "customers find it", search?.message);
      await L.goto(c, `/logistics/asset/${eq._id}`);
      await c.page.waitForTimeout(1500);
      L.check((await L.bodyText(c)).includes(eqRow.name), "unit page opens for the customer");
      // Direct booking of his equipment: the alert goes to him
      const tq = await L.api("POST", "/logistics/job", { token: customer.token, body: {
        job_type: "equipment_hire", targeted_asset_id: eq._id, load_type: `Excavation ${RUN}`,
        pickup: { address: L.PLACES.base, coordinates: L.PLACES.coords.harare },
        when_needed: F.ymd(Date.now() + 3 * F.DAY), hire_end: F.ymd(Date.now() + 5 * F.DAY),
        budget: { amount: 100, currency: "USD", rate_unit: "day" },
      } });
      const tjId = tq?.data?.job?._id;
      L.check(!!tjId, "customer books his equipment directly", tq?.message);
      await new Promise((ok) => setTimeout(ok, 1500));
      if (tjId) {
        L.check((await d.collection(" notifications").countDocuments({ receiver_id: OID(owner._id), job_id: OID(tjId) })) >= 1, "targeted equipment alert reaches the owner");
        const eqq = await F.quote(owner, tjId, eq._id, 100);
        L.check(eqq?.success !== false && eqq?.data?.quote?.owner_driven === true, "he quotes on it himself (owner_driven)", eqq?.message);
        await L.api("POST", `/logistics/job/${tjId}/cancel`, { token: customer.token, body: { reason: "End of test" } });
      }
      await F.goOffline(owner);
      // Direct booking of a self-operated truck
      const rlT = await L.api("POST", `/logistics/asset/${T1._id}/operate-self`, { token: owner.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
      L.check(rlT?.success !== false, "owner live on T1", rlT?.message);
      const tj2 = await F.postJob(customer, { goods: `Targeted truck ${RUN}`, body: { targeted_asset_id: T1._id } });
      await new Promise((ok) => setTimeout(ok, 1200));
      L.check((await d.collection(" notifications").countDocuments({ receiver_id: OID(owner._id), job_id: OID(tj2) })) >= 1, "targeted truck alert reaches the owner");
      await L.api("POST", `/logistics/job/${tj2}/cancel`, { token: customer.token, body: { reason: "End of test" } });
      await F.goOffline(owner);
    }

    // ── Admin-side unit state
    L.sec("20p. Dashboard and session for the owner operator");
    await F.goLive(owner, T2._id);
    const dash = (await L.api("GET", "/logistics/operator-dashboard", { token: owner.token }))?.data;
    L.check(!!dash && JSON.stringify(dash).includes(T2._id), "operator dashboard answers with the owner's token and his units", JSON.stringify(dash || {}).slice(0, 200));
    await L.goto(o, "/logistics/driver", ".log-dash-avail-controls");
    await o.page.waitForTimeout(1000);
    L.check(/\/logistics\/driver/.test(o.page.url()), "owner operator can open /logistics/driver", o.page.url());
    await L.shot(o, "s20-driver-home");
    await L.goto(o, "/logistics/owner/fleet");
    await o.page.waitForTimeout(1500);
    L.check(await o.page.locator(`[data-unit-op="${T2._id}"]`).count(), "Fleet page has the unit control too");
    await F.goOffline(owner);
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s20-crash");
  }
  F.pageChecks(actors);
  await L.done();
})();
