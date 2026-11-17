/* Stage 35 — v2.7.66 live-camera face photo: Chrome's fake camera, no file input, camera errors with
   Try again, who may change the photo (owner first time only, then only the operator by selfie),
   face and profile picture kept apart, customer sees the face on an owner-driven quote. */
const L = require("./lib");
const F = require("./fleet-helpers");
const DOCS = require("./docs");
const path = require("path");

const { OID } = F;
const base = (u) => path.basename(String(u || "")).split("?")[0];

(async () => {
  const st = L.loadState();
  const RUN = String(st.RUN || "run").toLowerCase();
  const C = L.cast(RUN);
  const d = await L.db();
  const actors = [];
  const A = async (n, opts) => { const a = await L.actor(n, opts); actors.push(a); return a; };
  const person = (role, i, key) => {
    const p = C.person(role, 110 + i);
    return { ...p, email: `s35${role.slice(0, 2)}${key}.${RUN}@${C.DOMAIN}`, phone: C.phone(`s35-${role}-${key}`), company: p.company || `${p.name} Transport` };
  };
  const pOwner = person("owner", 0, "a");
  const pOwner2 = person("owner", 1, "b");
  const pOp = person("operator", 0, "a");
  await F.resetPeople([pOwner.email, pOwner2.email]);
  const userDoc = async (id) => d.collection("users").findOne({ _id: OID(id) });
  const adminTok = await L.adminToken();
  const me = async (t) => (await L.api("GET", "/logistics/me", { token: t }))?.data;
  const capture = async (page, { real = false } = {}) => {
    await page.evaluate((r) => { window.__e2eCameraError = null; window.__e2eRealCamera = r; }, real);
    await page.locator('[data-testid="face-photo-take"]').first().click();
    await page.locator('[data-testid="face-camera-capture"]:not([disabled])').click({ timeout: 15000 });
    await page.locator('[data-testid="face-camera-preview"]').waitFor({ timeout: 10000 });
  };

  // v2.7.68: the owner never takes an operator's face; the camera field lives in the owner's own
  // "I operate it myself" setup (Add unit) and in the operator's setup screen
  const openFaceField = async (page) => {
    await page.goto(`${L.WEB}/logistics/owner/fleet/add`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="operated-by-self"]').click({ timeout: 15000 });
    await page.waitForSelector('[data-testid="owner-operator-setup"] [data-field="profile_photo"]', { timeout: 10000 });
  };

  try {
    L.sec("35a. Chrome's fake camera, no file input (owner's own face on Add unit)");
    const owner = await F.makeOwner(pOwner);
    const truck = await F.makeUnit(owner, C.unit("truck", 350), { docs: { rego: 8 } });
    const o = await A("owner", {});
    await L.seedAuth(o, { token: owner.token, user: owner });
    await openFaceField(o.page);
    L.check((await o.page.locator('[data-field="profile_photo"] input[type="file"]').count()) === 0, "face field: no file input");
    await capture(o.page, { real: true });
    L.check(await o.page.locator('[data-testid="face-camera-retake"]').isVisible(), "preview shows Retake");
    await o.page.locator('[data-testid="face-camera-retake"]').click();
    await o.page.locator('[data-testid="face-camera-capture"]:not([disabled])').click({ timeout: 15000 });
    await o.page.locator('[data-testid="face-camera-use"]').click();
    await o.page.locator('[data-testid="face-camera-use"]').waitFor({ state: "detached", timeout: 10000 });
    L.check(await o.page.locator('[data-testid="face-photo-preview"]').isVisible(), "face photo captured through Chrome's fake camera");
    L.check(/Retake/.test(await o.page.locator('[data-field="profile_photo"]').innerText()), "owner can retake before saving");

    L.sec("35b. Camera errors, each with Try again");
    const errors = [
      ["NotFoundError", /No camera was found/],
      ["NotAllowedError", /Camera access is blocked/],
      ["NotReadableError", /used by another app/],
    ];
    await openFaceField(o.page);
    for (const [name, msg] of errors) {
      await o.page.evaluate((n) => { window.__e2eRealCamera = false; window.__e2eCameraError = n; }, name);
      await o.page.locator('[data-testid="face-photo-take"]').first().click();
      await o.page.locator('[data-testid="face-camera-error"]').waitFor({ timeout: 10000 });
      const t = await o.page.locator('[data-testid="face-camera-error"]').innerText();
      L.check(msg.test(t), `${name}: clear message`, t);
      L.check(await o.page.locator('[data-testid="face-camera-retry"]').isVisible(), `${name}: Try again button`);
      await o.page.evaluate(() => { window.__e2eCameraError = null; });
      await o.page.locator('[data-testid="face-camera-retry"]').click();
      const ok = await o.page.locator('[data-testid="face-camera-capture"]:not([disabled])').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
      L.check(ok, `${name}: Try again works when the camera returns`);
      await o.page.locator(".modal.show .btn-close").first().click();
      await o.page.waitForTimeout(400);
    }

    L.sec("35c. v2.7.68: no face on the invite form; an older client's invite photo still works");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    await o.page.fill('input[placeholder="Full name"]', pOp.name);
    await o.page.fill('input[placeholder="name@example.com"]', pOp.email);
    const pick = o.page.locator(".log-asset-pick__list li").filter({ hasText: C.unit("truck", 350).name });
    await pick.locator('input[type="checkbox"]').check();
    L.check(!(await o.page.locator('form [data-field="profile_photo"]').count()), "invite form has no face photo field");
    await o.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /Invite (sent|created)/), "invite sent without a face photo");
    const inv = await d.collection("logistics_invites").findOne({ email: pOp.email });
    L.check(!!inv && !inv.profile_image, "invite has no face", inv?.profile_image);
    const re = await L.apiForm("PATCH", `/logistics/invite/${inv._id}`, { token: owner.token, files: [["profile_photo", DOCS.face(1)]] });
    const inv2 = await d.collection("logistics_invites").findOne({ _id: inv._id });
    L.check(re?.success !== false && !!inv2.profile_image && inv2.face_review?.status === "pending", "older client: a photo sent with the invite is kept, Pending", re?.message);

    L.sec("35d. After acceptance only the operator can change it");
    const op = await A("operator", {});
    await L.goto(op, `/logistics/invite?token=${inv2.token}`, "#invite-password");
    await op.page.fill("#invite-password", "Passw0rd!");
    await op.page.fill("#invite-password-confirm", "Passw0rd!");
    await op.page.locator('button[type="submit"]').click();
    await op.page.waitForURL(/\/logistics\/driver/, { timeout: 20000, waitUntil: "commit" }).catch(() => {});
    // v2.7.68 first screen: selfie + licence
    await L.completeOperatorSetup(op.page, { holder: pOp.name, face: 2 });
    const opU = await d.collection("users").findOne({ email: pOp.email });
    L.check(!!opU?.owner_id, "operator accepted", opU?.owner_id);
    const opTok = L.tokenFor(opU._id);
    let r = await L.apiForm("PATCH", `/logistics/sub-user/${opU._id}`, { token: owner.token, files: [["profile_photo", DOCS.face(4)]] });
    L.check(r?.success === false && r?.data?.code === "FACE_OPERATOR_ONLY", "API: owner refused (FACE_OPERATOR_ONLY)", r);
    await L.goto(o, `/logistics/owner/operators?operator=${opU._id}`, '[data-testid="face-photo-locked"]');
    L.check(/Only the operator can update this photo/i.test(await o.page.locator('[data-testid="face-photo-locked"]').innerText()), "owner's screen: read-only note");
    L.check((await o.page.locator('[data-testid="face-photo-take"]').count()) === 0, "owner's screen: no Take photo button");
    await L.shot(o, "s35-owner-readonly");

    L.sec("35e. Operator updates by selfie: back to Pending, admin alerted");
    await L.verifyFace(opU._id); // verified first, so "back to Pending" is visible
    await L.goto(op, "/logistics/driver", '[data-testid="operator-face-card"]');
    L.check((await op.page.locator('[data-testid="operator-face-card"]').getAttribute("data-status")) === "verified", "operator sees it verified");
    const since = F.nowIso();
    await op.page.evaluate((src) => { window.__e2eFaceSrc = src; window.__e2eRealCamera = false; window.__e2eCameraError = null; }, `data:image/jpeg;base64,${require("fs").readFileSync(DOCS.face(5)).toString("base64")}`);
    await op.page.locator('[data-testid="operator-face-update"]').click();
    await op.page.locator('[data-testid="face-camera-capture"]:not([disabled])').click({ timeout: 15000 });
    await op.page.locator('[data-testid="face-camera-use"]').click();
    L.check(await L.waitText(op, /Simba Tasker will check your photo/, 15000), "operator: saved toast");
    await op.page.waitForTimeout(1500);
    let face = (await me(opTok))?.user?.operator_face || (await me(opTok))?.operator_face;
    L.check(face?.status === "pending", "/me operator_face back to Pending", face);
    const audit = await d.collection("logistics_doc_audit").find({ subject: "face_photo" }).sort({ at: -1 }).limit(5).toArray().catch(() => []);
    L.check(audit.some((a) => a.source === "operator_self" && String(a.subject_id || a.id) === String(opU._id)), "audit entry source operator_self", audit.map((a) => a.source));
    const adminMails = F.outbox(since).filter((m) => m.channel === "email" && /simba\.sosdesk@yopmail\.com/.test(String(m.to)));
    L.check(adminMails.length > 0, "admin alerted by email", F.outbox(since).filter((m) => m.channel === "email").map((m) => m.to));
    const ownerNote = await d.collection(" notifications").findOne({ receiver_id: OID(owner._id), title: "New face photo" });
    L.check(!!ownerNote, "owner told about the new photo", ownerNote?.title);

    L.sec("35f. A rejected face reaches the operator");
    r = await L.api("POST", "/admin/logistics/documents/review", { token: adminTok, body: { subject: "face_photo", id: String(opU._id), status: "rejected", reason: "Face not clear" } });
    L.check(r?.success !== false, "admin rejects the face", r?.message);
    face = (await me(opTok))?.user?.operator_face || (await me(opTok))?.operator_face;
    L.check(face?.status === "rejected" && /not clear/i.test(face?.reason || ""), "/me operator_face rejected with the reason", face);
    // v2.7.68: a rejected selfie sends the operator back to the setup screen to retake it
    await L.goto(op, "/logistics/driver");
    await op.page.waitForURL(/\/logistics\/driver\/setup/, { timeout: 15000 }).catch(() => {});
    L.check(/\/logistics\/driver\/setup/.test(op.page.url()), "rejected selfie: operator is sent to the setup screen", op.page.url());
    const setupTxt = await op.page.locator('[data-testid="operator-setup"]').innerText().catch(() => "");
    L.check(/rejected/i.test(setupTxt) && /not clear/i.test(setupTxt), "setup screen shows rejected with the reason", setupTxt.slice(0, 200));
    L.check(await op.page.locator('[data-testid="operator-setup"] [data-testid="face-photo-take"]').isVisible(), "operator can retake");
    await L.shot(op, "s35-operator-rejected");
    r = await F.goLive({ token: opTok }, truck._id);
    L.check(r?.success === false && r?.data?.code === "DOC_REJECTED", "rejected face blocks going live", r);

    L.sec("35g. Self-operating owner: camera, face and profile picture stay apart");
    const owner2 = await F.makeOwner(pOwner2);
    const a2 = await A("owner2", {});
    await L.seedAuth(a2, { token: owner2.token, user: owner2 });
    await L.goto(a2, "/edit-profile");
    await a2.page.waitForSelector("#upload-profile", { state: "attached", timeout: 20000 });
    L.check(await a2.page.locator("#upload-profile").count(), "edit profile: gallery file input still exists");
    await a2.page.locator("#upload-profile").setInputFiles(DOCS.face(7));
    await a2.page.waitForTimeout(800);
    await a2.page.locator('button[type="submit"].submit').first().click();
    await a2.page.waitForTimeout(2500);
    let u2 = await userDoc(owner2._id);
    L.check(!!u2.profile_image, "profile picture accepted from a file", u2.profile_image);
    const profileBefore = u2.profile_image;
    await L.goto(a2, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await a2.page.locator('[data-testid="operated-by-self"]').click();
    await a2.page.waitForSelector('[data-testid="owner-operator-setup"]', { timeout: 8000 });
    L.check((await a2.page.locator('[data-testid="owner-operator-setup"] [data-field="profile_photo"] input[type="file"]').count()) === 0, "owner set-up: no gallery input on the face field");
    await capture(a2.page, { real: true });
    await a2.page.locator('[data-testid="face-camera-use"]').click();
    await a2.page.locator('[data-testid="face-camera-use"]').waitFor({ state: "detached", timeout: 10000 });
    // v2.7.68: the owner's driving / plant licence is compulsory too
    const licRow = L.docRow(a2.page, "Driving / plant licence").first();
    await licRow.locator('input[type="file"]').setInputFiles(await L.docFile("licence", { holder: owner2.name, face: DOCS.face(7), expires: DOCS.addMonths(8), kind: "vehicle" }));
    await L.pickDate(a2.page, licRow.locator(".log-doc-row__expiry input"), 8);
    await a2.page.locator('[data-testid="owner-operator-save"]').click();
    L.check(await L.waitText(a2, /Simba Tasker will check your documents/, 15000), "self-operating owner: face saved from the camera");
    await a2.page.waitForTimeout(1200);
    u2 = await userDoc(owner2._id);
    L.check(u2.logistics_face_review?.status === "pending" && u2.logistics_face_review?.url, "face in review", u2.logistics_face_review);
    L.check(u2.profile_image === profileBefore, "new face photo didn't change the profile picture", { before: profileBefore, after: u2.profile_image });
    const faceUrl = u2.logistics_face_review.url;
    await L.goto(a2, "/edit-profile");
    await a2.page.waitForSelector("#upload-profile", { state: "attached", timeout: 20000 });
    await a2.page.locator("#upload-profile").setInputFiles(DOCS.face(8));
    await a2.page.waitForTimeout(800);
    await a2.page.locator('button[type="submit"].submit').first().click();
    await a2.page.waitForTimeout(2500);
    u2 = await userDoc(owner2._id);
    L.check(u2.profile_image !== profileBefore && u2.logistics_face_review.url === faceUrl, "new profile picture didn't change the face photo", { p: u2.profile_image, f: u2.logistics_face_review.url });

    L.sec("35h. Customer sees the face on an owner-driven quote, company picture on the owner card");
    await F.verifySelfOperator(owner2); // face + licence
    const t2 = await F.makeUnit(owner2, C.unit("truck", 351), { docs: { rego: 8 } });
    r = await L.api("POST", `/logistics/asset/${t2._id}/operate-self`, { token: owner2.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
    L.check(r?.success !== false, "owner goes live on his truck", r?.message);
    const customer = await L.makeCustomer(`s35-${RUN}`);
    const job = await F.postJob(customer, { goods: `S35 goods ${RUN}`, weight: 5 });
    r = await F.quote(owner2, job, t2._id);
    L.check(r?.success !== false, "owner-driver quotes", r?.message);
    const jobRes = await L.api("GET", `/logistics/job/${job}`, { token: customer.token });
    const q = (jobRes?.data?.quotations || jobRes?.data?.job?.quotations || [])[0];
    L.check(base(q?.driver?.profile_image) === base(faceUrl), "quote: driver shows the checked face", { d: q?.driver?.profile_image, face: faceUrl });
    L.check(base(q?.owner?.profile_image) === base(u2.profile_image), "quote: owner card keeps the company picture", q?.owner?.profile_image);
    const c = await A("customer", {});
    await L.seedAuth(c, { token: customer.token, user: customer });
    await L.goto(c, `/logistics/jobs/${job}`);
    await c.page.waitForLoadState("networkidle").catch(() => {});
    const ok = await c.page.waitForSelector(`img[src*="${base(faceUrl)}"]`, { timeout: 15000 }).then(() => true).catch(() => false);
    L.check(ok, "customer's quote card renders the face photo");
    await L.shot(c, "s35-customer-quote");
    await L.api("POST", `/logistics/asset/${t2._id}/release-self`, { token: owner2.token });
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s35-crash");
  }
  F.pageChecks(actors);
  await L.done();
})();
