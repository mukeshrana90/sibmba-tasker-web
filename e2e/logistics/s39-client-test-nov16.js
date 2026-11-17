/* Stage 39 — client field test 14–15 Nov 2026 (report v2, 16 Nov): web + backend fixes (v2.7.71).
 *  B1  phone: a 0 after +263 is refused on the web and dropped by the server
 *  B2  PATCH /logistics/me: same number in a cleaner format is saved; a different number needs a code
 *  B4  Available lapses after the check-in period: not bookable, offline in admin; one-tap Go online card
 *  I1  operator sees every check still open (face photo + licence) after company approval
 *  I2  rejected owner: Edit my details + Send for a new check
 *  I4  "★ Sent only to you" chip on direct bookings in the operator's job list
 *  I5/I7  "Equipment Owner" and "Simba Tasker" wording */
const L = require("./lib");
const F = require("./fleet-helpers");

const { OID } = F;
const LONE_SIMBA = /\bSimba\b(?! Tasker)(?! Tracker)/;

(async () => {
  const RUN = L.loadState().RUN || "run";
  const C = L.cast(RUN);
  const tag = String(RUN).toLowerCase().replace(/[^a-z0-9]/g, "");
  const d = await L.db();
  const actors = [];
  const user = (id) => d.collection("users").findOne({ _id: OID(id) });
  const A = async (n, u, opts) => {
    const a = await L.actor(n, opts);
    actors.push(a);
    await L.seedAuth(a, { token: u.token, user: { _id: String(u._id), role: 4, ...(u.owner_id ? { owner_id: String(u.owner_id) } : {}) } });
    return a;
  };
  // the page updates before the server answers: wait for the database
  const waitDb = async (id, pred, ms = 20000) => {
    const end = Date.now() + ms;
    let u = await user(id);
    while (!pred(u) && Date.now() < end) {
      await new Promise((ok) => setTimeout(ok, 500));
      u = await user(id);
    }
    return u;
  };
  const base = 771000000 + (Date.now() % 900000) * 3;
  const num = (k) => String(base + k);

  try {
    // ───────────── B1 ─────────────
    L.sec("39 B1. Leading 0 after +263");
    const v = await L.actor("s39-visitor");
    actors.push(v);
    await L.goto(v, "/sign-up?role=logistics", "form");
    await v.page.waitForSelector("#phone", { timeout: 20000 });
    await L.typePhone(v.page.locator("#phone"), "+263", `0${num(1)}`);
    await v.page.locator("#phone").blur();
    await v.page.waitForTimeout(500);
    const signupText = await L.bodyText(v);
    L.check(/Remove the 0 after \+263/.test(signupText), "sign-up says 'Remove the 0 after +263'");
    L.check(/without the first 0/.test(signupText), "sign-up shows the +263 hint (I6)");
    await L.shot(v, "s39-b1-signup");

    const email = `s39.zero.${tag}@${C.DOMAIN}`;
    const biz = await L.businessDocFiles({ name: "Tendai Zero", company: "Zero Haulage" });
    let r = await L.apiForm("POST", "/logistics/auth/register", {
      body: { full_name: "Tendai Zero", company_name: "Zero Haulage", email, country_code: "263", phone_number: `0${num(1)}`, password: "Passw0rd!", role: 4, type: 1, business_docs: "1", owner_id_kind: "national_id" },
      files: [["business_registration", biz.business_registration], ["owner_id", biz.owner_id]],
    });
    L.check(r?.success !== false, "API sign-up with +263 0… registers", r?.message);
    let zu = await d.collection("users").findOne({ email });
    L.check(zu?.phone_number === num(1) && zu?.country_code === "+263", "stored without the 0", { cc: zu?.country_code, phone: zu?.phone_number });

    // ───────────── B2 ─────────────
    L.sec("39 B2. Phone on PATCH /logistics/me");
    const pOwner = { ...C.slot("owner", "s39", 0), email: `s39.owner.${tag}@${C.DOMAIN}`, phone: num(2) };
    const owner = await F.makeOwner(pOwner);
    // the stored number as the client's tester had it: with the 0
    await d.collection("users").updateOne({ _id: OID(owner._id) }, { $set: { phone_number: `0${num(2)}`, country_code: "+263" } });
    r = await L.api("PATCH", "/logistics/me", { token: owner.token, body: { country_code: "+263", phone_number: num(2) } });
    let ou = await user(owner._id);
    L.check(r?.success !== false && ou.phone_number === num(2), "same number without the 0 is saved", { msg: r?.message, phone: ou.phone_number });
    r = await L.api("PATCH", "/logistics/me", { token: owner.token, body: { country_code: "+263", phone_number: num(3) } });
    ou = await user(owner._id);
    L.check(r?.success === false && r?.data?.code === "PHONE_CHANGE_NEEDS_CODE" && ou.phone_number === num(2), "a different number needs a code (PHONE_CHANGE_NEEDS_CODE)", r?.data?.code);
    await d.collection("users").updateOne({ _id: OID(owner._id) }, { $set: { phone_number: `0${num(2)}` } });
    r = await L.api("POST", "/customer/phone/send-code", { token: owner.token, body: { country_code: "+263", phone_number: num(2) } });
    ou = await user(owner._id);
    L.check(r?.success && r?.data?.format_fixed === true && ou.phone_number === num(2), "Edit profile → same number: format fixed, no code", r?.message);

    // ───────────── B4 ─────────────
    L.sec("39 B4. Available lapses after the check-in period");
    // a fresh plate on every run (re-runs keep the earlier unit)
    const unit = await F.makeUnit(owner, C.unit("truck", 3900 + (Date.now() % 997)));
    const op = await F.makeOperator(owner, { ...C.slot("operator", "s39", 0), email: `s39.op.${tag}${Date.now() % 100000}@${C.DOMAIN}`, phone: num(4) }, { assets: [unit._id] });
    op.owner_id = owner._id;
    r = await F.goLive(op, unit._id);
    L.check(r?.success !== false, "operator goes Available", r?.message);
    let opU = await user(op._id);
    const until = new Date(opU.logistics_availability?.available_until || 0).getTime();
    L.check(Math.abs(until - Date.now() - 2 * 3600e3) < 120e3, "check-in time set 2 h ahead", opU.logistics_availability?.available_until);
    const search = async () => L.api("GET", `/logistics/asset/${unit._id}`, {});
    let pub = await search();
    const bookable = (x) => x?.data?.asset?.availability?.bookable;
    L.check(bookable(pub) === true, "unit bookable while Available", pub?.data?.asset?.availability || pub?.message);

    // operator dashboard: Go online card shows "You're online"
    const oa = await A("s39-operator", op);
    await L.goto(oa, "/logistics/driver", '[data-testid="go-online-card"]');
    L.check(/You're online/.test(await oa.page.locator('[data-testid="go-online-card"]').innerText()), "card: You're online + confirm-by time");
    await L.shot(oa, "s39-b4-online");

    // nobody confirms: move the check-in time into the past
    await d.collection("users").updateOne({ _id: OID(op._id) }, { $set: { "logistics_availability.available_until": new Date(Date.now() - 60e3) } });
    pub = await search();
    L.check(bookable(pub) === false, "after the check-in time: not bookable (direct booking blocked)", pub?.data?.asset?.availability || pub?.message);
    const adminT = await L.adminToken();
    const adm = await L.api("GET", `/admin/logistics/owners/${owner._id}`, { token: adminT });
    const admOp = (adm?.data?.operators || []).find((o) => String(o._id) === String(op._id));
    L.check(admOp?.availability === "offline" && !!admOp?.last_seen, "admin shows Offline + last seen", { availability: admOp?.availability, last_seen: admOp?.last_seen });
    const dash = await L.api("GET", "/logistics/operator-dashboard", { token: op.token });
    L.check(dash?.data?.availability?.state === "offline" && dash?.data?.availability?.lapsed === true, "dashboard: offline, lapsed", dash?.data?.availability);
    opU = await user(op._id);
    L.check(opU.logistics_availability?.state === "offline", "written offline in the database", opU.logistics_availability?.state);

    await L.goto(oa, "/logistics/driver", '[data-testid="go-online-card"]');
    const cardOff = await oa.page.locator('[data-testid="go-online-card"]').innerText();
    L.check(/You're offline/.test(cardOff) && /nobody confirmed/.test(cardOff), "card: went offline because nobody confirmed", cardOff);
    await L.shot(oa, "s39-b4-lapsed");
    await oa.page.locator(".log-go-card__btn--on").click();
    opU = await waitDb(op._id, (u) => u?.logistics_availability?.state === "available_now");
    L.check(opU.logistics_availability?.state === "available_now", "one tap Go online works", opU.logistics_availability?.state);
    // 10 minutes left → "Still online here?" with Confirm
    await d.collection("users").updateOne({ _id: OID(op._id) }, { $set: { "logistics_availability.available_until": new Date(Date.now() + 10 * 60e3) } });
    await L.goto(oa, "/logistics/driver", '[data-testid="go-online-card"]');
    L.check(/Still online here\?/.test(await oa.page.locator('[data-testid="go-online-card"]').innerText()), "15 min before: 'Still online here?'");
    await L.shot(oa, "s39-b4-checkin");
    await oa.page.locator(".log-go-card__confirm").click();
    opU = await waitDb(op._id, (u) => new Date(u?.logistics_availability?.available_until || 0).getTime() - Date.now() > 100 * 60e3);
    L.check(new Date(opU.logistics_availability?.available_until).getTime() - Date.now() > 100 * 60e3, "Confirm renews the check-in period", opU.logistics_availability?.available_until);

    // ───────────── I4 ─────────────
    L.sec("39 I4. Direct booking is labelled 'Sent only to you'");
    const customer = await L.makeCustomer(`s39-cust-${RUN}`);
    const dj = await F.postJob(customer, { goods: `S39 direct ${RUN}`, weight: 4, body: { targeted_asset_id: unit._id } });
    L.check(!!dj, "customer books the unit directly");
    await L.goto(oa, "/logistics/driver/work");
    await L.waitText(oa, new RegExp(`S39 direct ${RUN}`), 20000);
    const row = oa.page.locator("tr", { hasText: `S39 direct ${RUN}` }).first();
    L.check(/Sent only to you/.test(await row.innerText().catch(() => "")), "row shows ★ Sent only to you");
    await L.shot(oa, "s39-i4-chip");

    // ───────────── I1 ─────────────
    L.sec("39 I1. Operator sees every check still open");
    await F.goOffline(op);
    await d.collection("users").updateOne(
      { _id: OID(op._id) },
      { $set: { "logistics_face_review.status": "pending", "logistics_face_review.grace_until": null, "logistics_documents.$[l].review.status": "pending" } },
      { arrayFilters: [{ "l.type": "licence" }] }
    );
    r = await F.goLive(op, unit._id);
    L.check(r?.success === false && (r?.data?.blocks || []).length === 2, "go-live refused with both blocks", r?.data?.blocks?.map((b) => b.type));
    L.check(/face photo/i.test(r?.message || "") && /licen[cs]e/i.test(r?.message || ""), "message names face photo and licence", r?.message);
    await L.goto(oa, "/logistics/driver/jobs");
    await oa.page.waitForSelector('[data-testid="operator-waiting"]', { timeout: 20000 }).catch(() => {});
    const waitTxt = await oa.page.locator('[data-testid="operator-waiting"]').innerText().catch(() => "");
    L.check(/Face photo/.test(waitTxt) && /licence/i.test(waitTxt), "banner lists face photo + licence", waitTxt);
    await L.shot(oa, "s39-i1-waiting");
    await L.verifyFace(op._id, { face: 2 });
    await L.verifyDocs("operator", op._id);

    // ───────────── I2 ─────────────
    L.sec("39 I2. Rejected owner: edit details and resubmit");
    await L.approveOwner(owner._id, "rejected", "Remove the zero after the country code");
    const ow = await A("s39-owner", owner);
    await L.goto(ow, "/logistics/owner", ".log-approval-banner");
    const bannerTxt = await ow.page.locator(".log-approval-banner").innerText();
    L.check(/Edit my details/.test(bannerTxt) && /Send for a new check/.test(bannerTxt), "banner: Edit my details + Send for a new check", bannerTxt);
    L.check(!LONE_SIMBA.test(bannerTxt), "banner says Simba Tasker (I7)", bannerTxt);
    await L.shot(ow, "s39-i2-rejected");
    await ow.page.locator(".log-approval-banner__resubmit").click();
    ou = await waitDb(owner._id, (u) => u?.logistics_approval?.status === "pending");
    L.check(ou.logistics_approval?.status === "pending" && /zero/.test(ou.logistics_approval?.previous_reason || ""), "back to Pending, old reason kept", ou.logistics_approval);
    await L.approveOwner(owner._id);

    // ───────────── I5 / I7 ─────────────
    L.sec("39 I5/I7. Wording");
    await L.goto(v, "/logistics");
    const landing = await L.bodyText(v);
    L.check(!/Equipment Provider/.test(landing), "no 'Equipment Provider' on Logistics home");
    L.check(!LONE_SIMBA.test(landing), "no lone 'Simba' on Logistics home");
    await L.goto(ow, "/logistics/owner/verification");
    const ver = await L.bodyText(ow);
    L.check(!LONE_SIMBA.test(ver), "no lone 'Simba' on Business documents", (ver.match(/.{0,40}\bSimba\b(?! Tasker).{0,40}/) || [""])[0]);
    r = await F.goLive({ token: op.token }, unit._id);
    L.check(r?.success !== false, "operator live again after checks", r?.message);
    await F.goOffline(op);
  } catch (e) {
    L.check(false, "stage 39 crashed", e.stack);
  } finally {
    for (const a of actors) await a.ctx.close().catch(() => {});
    await L.done();
  }
})();
