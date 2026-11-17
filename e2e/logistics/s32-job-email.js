/* Stage 32 — v2.7.66 new-job emails: every owner and operator of a fleet that can see the job (live
   or not), one message each; the customer's confirmation; direct bookings; a failing address never
   fails the post. Reads the mocked outbox (real inbox delivery can only be checked live). */
const L = require("./lib");
const F = require("./fleet-helpers");
const { OID, LNG, LAT } = F;

const offset = (km) => ({ lng: LNG + km / 105.97, lat: LAT });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const st = L.loadState();
  const RUN = String(st.RUN || "run").toLowerCase();
  const C = L.cast(RUN);
  const d = await L.db();
  const person = (role, i, key) => {
    const p = C.person(role, 90 + i);
    return { ...p, email: `s32${role.slice(0, 2)}${key}.${RUN}@${C.DOMAIN}`, phone: C.phone(`s32-${role}-${key}`), company: p.company || `${p.name} Transport` };
  };
  const owners = {
    near: person("owner", 0, "near"),
    far: person("owner", 1, "far"),
    banned: person("owner", 2, "ban"),
    unapproved: person("owner", 3, "pend"),
    direct: person("owner", 4, "dir"),
  };
  await F.resetPeople(Object.values(owners).map((o) => o.email));
  const custEmail = `s32cust.${RUN}@${C.DOMAIN}`;
  const failEmail = `fail.s32cust.${RUN}@${C.DOMAIN}`;
  await d.collection("users").deleteMany({ email: { $in: [custEmail, failEmail] } });

  const mkCustomer = async (email, phone) => {
    const _id = new L.mongoose.Types.ObjectId();
    await d.collection("users").insertOne({ _id, email, full_name: "S32 Customer", role: 1, country_code: "+263", phone_number: phone, email_verified: 1, account_verified: 1, is_completeProfile: 1, is_deleted: 0, createdAt: new Date(), updatedAt: new Date() });
    return { _id: String(_id), email, name: "S32 Customer", role: 1, token: L.tokenFor(_id) };
  };
  const unitAt = async (owner, i, km, opts = {}) => {
    const pos = offset(km);
    return F.makeUnit(owner, C.unit("truck", 320 + i), { docs: { rego: 8 }, body: { lat: pos.lat, lng: pos.lng, location_label: `Base ${km} km` }, ...opts });
  };
  const mailsTo = (since, email) => F.outbox(since).filter((m) => m.channel === "email" && m.to === email);

  try {
    L.sec("32a. Fleets set up: matching (operator offline), far, banned, unapproved");
    const near = await F.makeOwner(owners.near);
    const nearU = await unitAt(near, 0, 5);
    const nearOp = await F.makeOperator(near, person("operator", 0, "near"), { assets: [nearU._id] });
    const far = await F.makeOwner(owners.far);
    const farU = await unitAt(far, 1, 130);
    const farOp = await F.makeOperator(far, person("operator", 1, "far"), { assets: [farU._id] });
    const banned = await F.makeOwner(owners.banned);
    const banU = await unitAt(banned, 2, 5);
    await d.collection("users").updateOne({ _id: OID(banned._id) }, { $set: { logistics_ban: { banned: true, reason: "e2e" } } });
    await d.collection("logistics_assets").updateMany({ owner_id: OID(banned._id) }, { $set: { owner_banned: true } });
    const pending = await F.makeOwner(owners.unapproved, { approve: false });
    const pendingU = await unitAt(pending, 3, 5, { verify: false });
    L.check((await d.collection("logistics_assets").findOne({ _id: OID(pendingU._id) }))?.owner_unapproved === true, "pending owner's unit is held back", pendingU._id);
    const customer = await mkCustomer(custEmail, C.phone("s32-cust"));

    L.sec("32b. New job → emails");
    let since = F.nowIso();
    const job = await F.postJob(customer, { goods: `S32 goods ${RUN}`, weight: 5 });
    await sleep(3000); // sent after the response
    const nearMails = mailsTo(since, owners.near.email);
    L.check(nearMails.length === 1 && /New job for your fleet/i.test(nearMails[0].subject || ""), "matching owner emailed once", nearMails.map((m) => m.subject));
    L.check(/View job/.test(nearMails[0]?.html || ""), "email links to the job");
    const nearOpEmail = person("operator", 0, "near").email;
    L.check(mailsTo(since, nearOpEmail).length === 1, "offline operator of the matching fleet emailed once");
    for (const [who, mail] of [["far owner", owners.far.email], ["far operator", person("operator", 1, "far").email], ["banned owner", owners.banned.email], ["unapproved owner", owners.unapproved.email]]) {
      L.check(mailsTo(since, mail).length === 0, `${who}: no email`);
    }
    const custMails = mailsTo(since, customer.email);
    L.check(custMails.length === 1 && /Your job is posted/i.test(custMails[0].subject || ""), "customer gets one confirmation", custMails.map((m) => m.subject));
    L.check(F.outbox(since).every((m) => m.channel !== "email" || typeof m.to === "string"), "one recipient per message (no shared To)");

    L.sec("32c. Poster isn't emailed about their own job");
    {
      // Owners can't post through the web, so the poster rule is exercised on the mailer itself
      since = F.nowIso();
      const out = F.backend(`const {TransportJob,User}=require("./src/models");const {notifyJobEmails}=require("./src/utils/logistics/jobEmail");const job=await TransportJob.findById(${JSON.stringify(job)});const poster=await User.findById(${JSON.stringify(near._id)}).lean();return notifyJobEmails(job,poster)`);
      L.check(out?.sent >= 1 && !out?.crash, "mailer run with the owner as poster", out);
      await sleep(500);
      const toOwner = mailsTo(since, owners.near.email);
      L.check(toOwner.every((m) => !/New job for your fleet/i.test(m.subject || "")), "poster gets no 'new job' email for their own job", toOwner.map((m) => m.subject));
    }

    L.sec("32d. Direct booking emails that unit's owner and operators");
    const directOwner = await F.makeOwner(owners.direct);
    const directU = await unitAt(directOwner, 4, 5);
    const directOp = await F.makeOperator(directOwner, person("operator", 2, "dir"), { assets: [directU._id] });
    await F.goLive(directOp, directU._id);
    since = F.nowIso();
    const dj = await F.postJob(customer, { goods: `S32 direct ${RUN}`, weight: 5, body: { targeted_asset_id: directU._id } });
    await sleep(3000);
    L.check(!!dj, "direct booking posted");
    const directMails = mailsTo(since, owners.direct.email);
    L.check(directMails.length === 1 && /Direct booking for your fleet/i.test(directMails[0].subject || ""), "direct owner emailed", directMails.map((m) => m.subject));
    L.check(mailsTo(since, person("operator", 2, "dir").email).length === 1, "direct unit's operator emailed");
    L.check(mailsTo(since, owners.near.email).length === 0, "other fleets aren't told about a direct booking");
    L.check(mailsTo(since, customer.email).some((m) => /Your job is posted/i.test(m.subject || "")), "customer gets the confirmation");
    await F.goOffline(directOp);

    L.sec("32e. A failing address doesn't fail the post");
    const failing = await mkCustomer(failEmail, C.phone("s32-fail"));
    since = F.nowIso();
    const failJob = await L.api("POST", "/logistics/job", { token: failing.token, body: { job_type: "transport", job_class: "corridor", load_type: `S32 failing ${RUN}`, pickup: { address: L.PLACES.base, coordinates: L.PLACES.coords.harare }, dropoff: { address: L.PLACES.drops[0], coordinates: L.PLACES.coords.chitungwiza }, load_weight: { value: 5, unit: "tons" }, special_notes: "Vehicle: 6 ton", when_needed: F.ymd(Date.now() + 3 * F.DAY), budget: { amount: 300, currency: "USD" } } });
    L.check(failJob?.success !== false && (failJob?.data?.job?._id || failJob?.data?._id), "post succeeds although the customer's email fails", failJob?.message);
    await sleep(3000);
    const failed = F.outbox(since).filter((m) => m.channel === "email" && m.to === failEmail);
    L.check(failed.some((m) => m.ok === false || m.error), "the mock records the failed send", failed.map((m) => m.error || m.ok));
    L.check(mailsTo(since, owners.near.email).length === 1, "other recipients still get theirs");
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
  }
  await L.done();
})();
