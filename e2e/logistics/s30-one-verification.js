/* Stage 30 — v2.7.66 one verification: a pending owner adds a unit and its operator in one form,
   admin approves everything once, rejected items return alone, later units are their own package.
   Own accounts; needs only state.json RUN. Admin panel on :3012 (see s12 header). */
const L = require("./lib");
const F = require("./fleet-helpers");
const DOCS = require("./docs");

const { OID } = F;

(async () => {
  const st = L.loadState();
  const RUN = String(st.RUN || "run").toLowerCase();
  const C = L.cast(RUN);
  const d = await L.db();
  const actors = [];
  const A = async (n, opts) => { const a = await L.actor(n, opts); actors.push(a); return a; };

  const person = (role, i, key) => {
    const p = C.person(role, 70 + i);
    return { ...p, email: `s30${role.slice(0, 2)}${key}.${RUN}@${C.DOMAIN}`, phone: C.phone(`s30-${role}-${key}`), company: p.company || `${p.name} Transport` };
  };
  const pOwner = person("owner", 0, "a");
  const pOp = person("operator", 0, "a");
  await F.resetPeople([pOwner.email]);
  const unit = async (id) => d.collection("logistics_assets").findOne({ _id: OID(id) });
  const adminTok = await L.adminToken();
  const review = (body) => L.api("POST", "/admin/logistics/documents/review", { token: adminTok, body });
  const adminOwner = async (id) => (await L.api("GET", `/admin/logistics/owners/${id}`, { token: adminTok }))?.data;

  try {
    L.sec("30a. Pending owner adds a truck and its operator in one form");
    const owner = await F.makeOwner(pOwner, { approve: false });
    // Company documents (the owner still has to add them; sign-up step 2 may be skipped)
    {
      const biz = await L.businessDocFiles({ name: pOwner.name, company: pOwner.company });
      const up = await L.apiForm("POST", "/logistics/business-docs", {
        token: owner.token,
        body: { owner_id_kind: "national_id", owner_id_expires: L.docExpiryYmd() },
        files: [["business_registration", biz.business_registration], ["owner_id", biz.owner_id]],
      });
      L.check(up?.success !== false, "pending owner uploads company documents", up?.message);
    }
    const o = await A("owner", {});
    await L.seedAuth(o, { token: owner.token, user: owner });
    const truck = C.unit("truck", 300);
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    const p = o.page;
    L.check(!(await p.locator(".log-locked-add").count()), "the form is open while the company is pending");
    await p.fill('input[placeholder="Truck 1"]', truck.name);
    await p.fill('input[placeholder="AEB1234"]', truck.plate);
    await p.fill('input[placeholder="15"]', truck.capacity).catch(() => {});
    await p.fill('input[placeholder="Isuzu"]', truck.make);
    await p.fill('input[placeholder="FVZ"]', truck.model);
    await p.fill('input[placeholder="2019"]', truck.year);
    await p.locator(".log-location-btn").first().click();
    await p.waitForSelector(".simba-book-loc-modal", { timeout: 10000 });
    await p.waitForTimeout(3000);
    await p.locator(".simba-book-loc-modal .btn-primary").click();
    await p.waitForTimeout(500);
    const docInfo = { owner: owner.company, holder: owner.name, plate: truck.plate, make: truck.make, model: truck.model, year: truck.year, kind: "vehicle", expires: DOCS.addMonths(6) };
    const rego = L.docRow(p, "Road licence").first();
    await rego.locator('input[type="file"]').setInputFiles(await L.docFile("rego", docInfo));
    await L.pickDate(p, rego.locator(".log-doc-row__expiry input"), 6);
    const ins = L.docRow(p, "Insurance").first();
    await ins.locator('input[type="file"]').setInputFiles(await L.docFile("insurance", docInfo));
    await L.pickDate(p, ins.locator(".log-doc-row__expiry input"), 6);
    await L.addUnitPhotos(p, "form.log-fleet-form", truck.photos);
    // The default 'Who operates' is Invite: without the operator's details nothing saves
    await p.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Enter the operator's name, or pick Decide later/), "invite is the default: operator's name required before saving");
    L.check(!(await d.collection("logistics_assets").findOne({ registration: truck.plate })), "nothing saved yet");
    await p.fill('[data-testid="unit-op-name"]', pOp.name);
    await p.fill('[data-testid="unit-op-email"]', pOp.email);
    await p.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Take the operator's face photo, or pick Decide later/), "operator's face photo required before saving");
    await L.addFacePhoto(p, 2);
    await L.shot(o, "s30-add-form-operator");
    await p.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Vehicle added/), "Vehicle added toast");
    await p.waitForTimeout(1500);
    const saved = await d.collection("logistics_assets").findOne({ registration: truck.plate });
    L.check(!!saved, "truck saved", truck.plate);
    L.check(saved?.owner_unapproved === true, "truck held back (owner_unapproved) while the company is pending", saved?.owner_unapproved);
    const inv = await d.collection("logistics_invites").findOne({ email: pOp.email });
    L.check(!!inv && (inv.asset_ids || []).map(String).includes(String(saved?._id)), "invite carries the truck", inv?.asset_ids);
    L.check(!!inv?.profile_image && inv?.face_review?.status === "pending", "invite holds the face photo, Pending", inv?.face_review);
    const T = { _id: String(saved?._id), name: truck.name, plate: truck.plate };

    L.sec("30b. Approve all is refused and lists what's missing");
    await L.reviewDocs("asset", T._id, { status: "rejected", only: ["rego"], reason: "Road licence not readable" });
    let pack = (await adminOwner(owner._id))?.package;
    L.check(pack?.can_approve === false && (pack?.missing || []).some((m) => /ZINARA/i.test(m.label)), "package: can't approve, ZINARA missing", pack?.missing);
    const refused = await L.api("POST", `/admin/logistics/owners/${owner._id}/approve-package`, { token: adminTok, body: {} });
    L.check(refused?.success === false && refused?.data?.code === "PACKAGE_INCOMPLETE" && (refused?.data?.missing || []).some((m) => /ZINARA/i.test(m.label)), "API: PACKAGE_INCOMPLETE with the missing list", refused);
    L.check((await d.collection("users").findOne({ _id: OID(owner._id) })).logistics_approval.status === "pending", "company still pending");
    L.check(!(await unit(T._id)).documents.some((x) => x.type === "insurance" && x.review?.status === "verified"), "a refused Approve all verified nothing");
    const a = await F.adminActor("admin30");
    actors.push(a);
    await a.adminGoto(`/logistics-owner/${owner._id}`, '[data-testid="approve-package"]');
    await a.page.waitForTimeout(800);
    L.check(/ZINARA/i.test(await a.page.locator('[data-testid="package-missing"]').innerText().catch(() => "")), "admin: missing list names ZINARA");
    L.check(await a.page.locator('[data-testid="approve-package"]').isDisabled(), "admin: Approve all disabled while something is missing");
    await a.page.locator(".over-view-btn button", { hasText: "Operators" }).click();
    await a.page.waitForTimeout(500);
    L.check(await a.page.locator(`tr[data-testid="invite-row"][data-invite-id="${inv._id}"]`).count(), "admin: pending invite row shown");
    await L.shot(a, "s30-admin-missing");

    L.sec("30c. A rejected item returns alone");
    // Insurance is verified before the replacement, so we can see it isn't touched
    await L.verifyDocs("asset", T._id, { only: ["insurance"] });
    const replace = await L.apiForm("PATCH", `/logistics/asset/${T._id}`, {
      token: owner.token,
      body: { document_types: ["rego"], document_expires: [L.docExpiryYmd(1)] },
      files: [["documents", await L.docFile("rego", docInfo)]],
    });
    L.check(replace?.success !== false, "owner replaces the rejected ZINARA", replace?.message);
    let t = await unit(T._id);
    L.check(t.documents.find((x) => x.type === "rego").review?.status === "pending", "replaced ZINARA back to Pending", t.documents.find((x) => x.type === "rego").review);
    L.check(t.documents.find((x) => x.type === "insurance").review?.status === "verified", "insurance stays Verified (not sent back)");
    // Reject the operator's face photo on the invite: it comes back alone too
    await review({ subject: "invite_face", id: String(inv._id), status: "rejected", reason: "Face not clear" });
    pack = (await adminOwner(owner._id))?.package;
    L.check(pack?.can_approve === false && (pack?.missing || []).some((m) => /face photo/i.test(m.label)), "rejected invite face: missing", pack?.missing);
    t = await unit(T._id);
    L.check(t.documents.find((x) => x.type === "rego").review?.status === "pending", "other items are unchanged");
    const fixFace = await L.apiForm("PATCH", `/logistics/invite/${inv._id}`, { token: owner.token, files: [["profile_photo", DOCS.face(6)]] });
    L.check(fixFace?.success !== false, "owner replaces the face photo before acceptance", fixFace?.message);
    const inv2 = await d.collection("logistics_invites").findOne({ _id: inv._id });
    L.check(inv2?.face_review?.status === "pending", "face back to Pending", inv2?.face_review);
    pack = (await adminOwner(owner._id))?.package;
    L.check(pack?.can_approve === true && !pack?.missing?.length, "package: complete again", pack?.missing);

    L.sec("30d. Approve all, in one click");
    await a.adminGoto(`/logistics-owner/${owner._id}`, '[data-testid="approve-package"]');
    await a.page.waitForTimeout(800);
    await a.page.locator('[data-testid="approve-package"]').click();
    await a.page.waitForSelector('[data-testid="approve-package-confirm"]', { timeout: 8000 });
    await L.shot(a, "s30-approve-all");
    await a.page.locator('[data-testid="approve-package-confirm"]').click();
    await a.page.waitForTimeout(2500);
    const ownerRow = await d.collection("users").findOne({ _id: OID(owner._id) });
    L.check(ownerRow.logistics_approval.status === "approved", "company approved", ownerRow.logistics_approval);
    L.check((ownerRow.logistics_business_documents || []).every((x) => x.review?.status === "verified"), "company documents verified");
    t = await unit(T._id);
    L.check(t.documents.every((x) => x.review?.status === "verified"), "unit documents verified", t.documents.map((x) => [x.type, x.review?.status]));
    L.check(t.owner_unapproved !== true, "unit no longer held back", t.owner_unapproved);
    const inv3 = await d.collection("logistics_invites").findOne({ _id: inv._id });
    L.check(inv3?.face_review?.status === "verified", "invite face verified", inv3?.face_review);

    L.sec("30e. Operator accepts: documents stay verified");
    const op = await A("operator", {});
    await L.goto(op, `/logistics/invite?token=${inv3.token}`, "#invite-password");
    await op.page.fill("#invite-password", "Passw0rd!");
    await op.page.fill("#invite-password-confirm", "Passw0rd!");
    await op.page.locator('button[type="submit"]').click();
    await op.page.waitForURL(/\/logistics\/driver/, { timeout: 20000, waitUntil: "commit" }).catch(() => {});
    const opU = await d.collection("users").findOne({ email: pOp.email });
    L.check(!!opU && opU.logistics_face_review?.status === "verified", "accepted: face stays verified", opU?.logistics_face_review);
    const opTok = L.tokenFor(opU._id);
    let r = await F.goLive({ token: opTok }, T._id);
    L.check(r?.success !== false, "operator goes live straight after accepting", r);
    await F.goOffline({ token: opTok });

    L.sec("30f. A later unit is its own package");
    const later = await F.makeUnit(owner, C.unit("truck", 301), { docs: { rego: 8 }, verify: false });
    const assign = await L.api("POST", `/logistics/asset/${later._id}/assign`, { token: owner.token, body: { sub_user_id: opU._id } });
    L.check(assign?.success !== false, "later truck assigned to the operator", assign?.message);
    // A second later unit waits: Approve unit must not touch it
    const waiting = await F.makeUnit(owner, C.unit("truck", 302), { docs: { rego: 8 }, verify: false });
    await a.adminGoto(`/logistics-owner/${owner._id}`, ".over-view-btn button");
    await a.page.locator(".over-view-btn button", { hasText: "Equipment" }).click();
    const laterRow = a.page.locator(`tr[data-unit-id="${later._id}"]`);
    await laterRow.waitFor({ timeout: 10000 });
    await laterRow.locator('[data-testid="approve-unit"]').click();
    await a.page.waitForSelector('[data-testid="approve-package-confirm"]', { timeout: 8000 });
    await a.page.locator('[data-testid="approve-package-confirm"]').click();
    await a.page.waitForTimeout(2500);
    const laterDoc = await unit(later._id);
    L.check(laterDoc.documents.every((x) => x.review?.status === "verified"), "later unit's documents verified alone");
    L.check((await unit(waiting._id)).documents.every((x) => x.review?.status !== "verified"), "the other later unit stays Pending");
    r = await F.goLive({ token: opTok }, later._id);
    L.check(r?.success !== false, "operator can go live on the approved later unit", r);
    await F.goOffline({ token: opTok });

    L.sec("30g. 'Decide later' unit stays hidden");
    const customer = await L.makeCustomer(`s30-${RUN}`);
    const noOp = await F.makeUnit(owner, C.unit("truck", 303), { docs: { rego: 8 }, verify: true, body: { operated_by: "later" } });
    const search = await L.api("GET", "/logistics/assets/search?kind=vehicle&limit=300", { token: customer.token });
    L.check(!(search?.data?.data || []).some((x) => String(x.asset_id || x._id) === noOp._id), "unit with no operator isn't shown to customers");
    const cv = (await L.api("GET", `/logistics/asset/${noOp._id}`, { token: customer.token }))?.data?.asset?.availability;
    L.check(cv?.bookable === false, "customer view: not bookable", cv);
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s30-crash");
  }
  F.pageChecks(actors);
  await L.done();
})();
