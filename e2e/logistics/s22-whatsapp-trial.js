/* Stage 22 — WhatsApp policy (v2.7.61): trial day 59 vs 61, essentials free forever, extras gated, reminders
   once each (14/7/1), countdown, one Free plan, `_testingaccount` grant, register body clean-up, sign-up
   can't overwrite an account, resend keeps the first code, OTP page not on every login, "Chat on WhatsApp"
   button + admin log, chat gate, SOS to owner and admins, booking reminders, weekly summary.
   Every scheduler run is scoped with ownerIds and runs in a child process with the mocks preloaded.
   Needs the admin dev server (s12 header) and state.json RUN. */
const L = require("./lib");
const F = require("./fleet-helpers");
const { OID, DAY } = F;

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

(async () => {
  const st = L.loadState();
  const RUN = st.RUN || "run";
  const C = L.cast(RUN);
  const pTrial = C.slot("owner", "s22", 0); // day 59
  const pEnded = C.slot("owner", "s22", 1); // day 61
  const pRem = C.slot("owner", "s22", 2); // reminders
  const pPaid = C.slot("owner", "s22", 3); // upgrades
  const pOpT = C.slot("operator", "s22", 0);
  const pOpE = C.slot("operator", "s22", 1);
  const pOpP = C.slot("operator", "s22", 2);
  const d = await L.db();
  const actors = [];
  const A = async (name, user, opts) => { const a = await L.actor(name, opts); actors.push(a); if (user) await L.seedAuth(a, { token: user.token, user }); return a; };
  const user = (id) => d.collection("users").findOne({ _id: OID(id) });
  const testEmails = [];
  const cleanTestAccounts = async () => {
    const rows = await d.collection("users").find({ email: { $regex: `^s22${String(RUN).toLowerCase()}.*_testingaccount@yopmail\\.com$`, $options: "i" } }).project({ _id: 1 }).toArray();
    if (rows.length) await d.collection("users").deleteMany({ _id: { $in: rows.map((r) => r._id) } });
  };
  const reg = (extra) => ({ email_otp: 1 } && { password: "Passw0rd!", confirm_password: "Passw0rd!", ...extra });

  try {
    await F.resetPeople([pTrial, pEnded, pRem, pPaid, pOpT, pOpE, pOpP].map((p) => p.email));
    await cleanTestAccounts();
    const emailsS = (k) => `s22.${k}.${String(RUN).toLowerCase()}@yopmail.com`;
    // Real-looking names for the throwaway accounts below
    const REALNAME = { cust: "Chiedza Mhlanga", svc: "Blessing Ndoro", corp: "Tafadzwa Gumbo", wa1: "Loveness Chirwa", wa2: "Tawanda Mukono", wa3: "Fungai Chigwedere", wa4: "Tendai Mabika" };
    await d.collection("users").deleteMany({ email: { $in: ["reg", "cust", "svc", "corp", "cust2", "victim", "attacker", "wa1", "wa2", "wa3", "wa4", "phone"].map(emailsS) } });

    const trial = await F.makeOwner(pTrial, { createdDaysAgo: 59 });
    const ended = await F.makeOwner(pEnded, { createdDaysAgo: 61 });
    const tTruck = await F.makeUnit(trial, C.unit("truck", 220));
    const eTruck = await F.makeUnit(ended, C.unit("truck", 221));
    const opT = await F.makeOperator(trial, pOpT, { assets: [tTruck._id], face: 1 });
    const opE = await F.makeOperator(ended, pOpE, { assets: [eTruck._id], face: 2 });
    const customer = await L.makeCustomer(`cust.s22.${RUN}`);

    // ── Day 59 vs day 61
    L.sec("22a. Day 59 vs day 61: API field and countdown");
    let me = (await L.api("GET", "/logistics/me", { token: trial.token }))?.data;
    L.check(me?.whatsapp?.essentials === true && me?.whatsapp?.extras_active === true && me?.whatsapp?.source === "trial" && me?.whatsapp?.trial_days_left === 1, "day 59: extras active, trial, 1 day left", me?.whatsapp);
    me = (await L.api("GET", "/logistics/me", { token: ended.token }))?.data;
    L.check(me?.whatsapp?.essentials === true && me?.whatsapp?.extras_active === false && me?.whatsapp?.source === "none" && Number(me?.whatsapp?.trial_days_left) === 0, "day 61: extras off, essentials still on", me?.whatsapp);
    const opMe = (await L.api("GET", "/logistics/me", { token: opT.token }))?.data;
    L.check(opMe?.whatsapp?.extras_active === true && opMe?.whatsapp?.source === "trial", "operator follows his owner's trial", opMe?.whatsapp);
    const subT = (await L.api("GET", "/logistics/subscription", { token: trial.token }))?.data;
    L.check(subT?.whatsapp?.trial_days_left === 1 && !!subT?.whatsapp?.trial_ends_at, "/subscription carries the same block");
    const oT = await A("owner-59", trial);
    const oE = await A("owner-61", ended);
    await L.goto(oT, "/logistics/owner/subscription", '[data-testid="free-period-status"]');
    const cdT = oT.page.locator('[data-testid="free-period-status"]').first();
    L.check(/free for 1 more day/.test(await cdT.innerText()), "day 59: 'free for 1 more day'", await cdT.innerText());
    await L.shot(oT, "s22-countdown-59");
    await L.goto(oE, "/logistics/owner/subscription", '[data-testid="free-period-status"]');
    const cdE = oE.page.locator('[data-testid="free-period-status"]').first();
    L.check(/free period has ended\. WhatsApp essentials stay free/.test(await cdE.innerText()), "day 61: free period ended", await cdE.innerText());
    await L.shot(oE, "s22-countdown-61");
    await L.goto(oE, "/logistics/owner");
    await oE.page.waitForTimeout(1500);
    const up = oE.page.locator('[data-testid="whatsapp-extras-upgrade"]');
    if (await up.count()) {
      L.check((await up.first().getAttribute("href")) === "/logistics/owner/subscription", "Upgrade link goes to the plans page");
    } else {
      await L.goto(oE, "/edit-profile", "form");
      await oE.page.waitForSelector('[data-testid="whatsapp-extras-upgrade"]', { timeout: 8000 }).catch(() => {});
      L.check(await oE.page.locator('[data-testid="whatsapp-extras-upgrade"]').count(), "Upgrade link shown when the trial has ended");
    }
    await L.goto(oE, "/logistics/owner/subscription", ".log-sub-plan");
    L.check(/WhatsApp notifications\s*Essentials/.test(await oE.page.locator('.log-sub-plan [data-testid="plan-whatsapp"]').first().innerText()), "plan card: 'WhatsApp notifications Essentials' (not paid-only)");
    await L.goto(oE, "/edit-profile", '[data-testid="wa-notify-card"]');
    L.check(/Essentials free, full pack free for 60 days/.test(await oE.page.locator('[data-testid="wa-notify-card"]').innerText()), "profile: 'Essentials free, full pack free for 60 days'");
    L.check(!(await oE.page.locator("#wa-notify-switch").isDisabled()), "profile switch stays usable after the trial");

    // ── What goes out
    L.sec("22b. Essentials always; extras only in trial or Paid (real backend sends)");
    const sendAs = (uid, key, vars, opts) => F.backend(`const w=require("./src/utils/logistics/jobWhatsapp");return w.sendJobWhatsapp(${JSON.stringify(uid)},${JSON.stringify(key)},${JSON.stringify(vars)},${JSON.stringify(opts)})`);
    const link = `${L.WEB}/logistics/owner/job/000000000000000000000000`;
    const jobVars = { 1: "Harare → Chitungwiza", 2: "Your operator is in transit", 3: link };
    const newJobVars = { 1: "Harare → Chitungwiza · 4 ton truck · tomorrow", 2: `${L.WEB}/logistics/driver/job/000000000000000000000000` };
    let r = sendAs(ended._id, "job_status", jobVars, { category: "extra" });
    L.check(r?.ok === false && r?.error === "free_plan", "day 61 owner: extra skipped", r);
    r = sendAs(opE._id, "job_status", jobVars, { category: "extra" });
    L.check(r?.ok === false && r?.error === "free_plan", "day 61 operator: extra skipped (follows owner)", r);
    r = sendAs(opE._id, "new_job", newJobVars, { category: "essential" });
    L.check(r?.ok === true, "day 61 operator: new-job alert still sent (essential, item 33)", r);
    r = sendAs(ended._id, "job_status", jobVars, { category: "essential" });
    L.check(r?.ok === true, "day 61 owner: essential still sent", r);
    r = sendAs(trial._id, "job_status", jobVars, { category: "extra" });
    L.check(r?.ok === true, "day 59 owner: extra sent", r);
    r = sendAs(opT._id, "job_status", jobVars, { category: "extra" });
    L.check(r?.ok === true, "day 59 operator: extra sent", r);
    // Customer follows the fleet on the job
    r = sendAs(customer._id, "job_status", { 1: "Harare → Chitungwiza", 2: "Your operator is in transit", 3: `${L.WEB}/logistics/jobs/000000000000000000000000` }, { category: "extra", fleetOwnerId: ended._id });
    L.check(r?.ok === false, "customer on a day-61 fleet's job: extra skipped", r);
    r = sendAs(customer._id, "job_status", { 1: "Harare → Chitungwiza", 2: "Your operator is in transit", 3: `${L.WEB}/logistics/jobs/000000000000000000000000` }, { category: "extra", fleetOwnerId: trial._id });
    L.check(r?.ok === true, "customer on a day-59 fleet's job: extra sent", r);
    // Switch off: essentials stop too; otp and sos don't
    await L.api("PATCH", "/logistics/me", { token: ended.token, body: { notifications: { whatsapp: false } } });
    r = sendAs(ended._id, "job_status", jobVars, { category: "essential" });
    L.check(r?.ok === false && r?.error === "opted_out", "switch off: essentials stop", r);
    r = F.backend(`const p=require("./src/utils/logistics/whatsappPolicy");const a=await p.whatsappStatus(${JSON.stringify(ended._id)},{category:"otp"});const b=await p.whatsappStatus(${JSON.stringify(ended._id)},{category:"sos"});return {a,b}`);
    L.check(r?.a?.allowed === true && r?.b?.allowed === true, "switch off: OTP and SOS still go", r);
    await L.api("PATCH", "/logistics/me", { token: ended.token, body: { notifications: { whatsapp: true } } });

    L.sec("22c. Real job flow: quote and trip messages follow the fleet (item 36)");
    const flow = async (owner, op, truck) => {
      await F.goLive(op, truck);
      const j = await F.postJob(customer, { goods: `Trial flow ${owner.name} ${RUN}` });
      const t0 = F.nowIso();
      const q = await F.quote(op, j, truck);
      await sleep(900);
      const quoteWa = F.waTo(t0, customer.phone).some((m) => m.ok && m.template === "new_quote");
      const t1 = F.nowIso();
      await F.acceptQuote(customer, j, q?.data?.quote?._id);
      await F.setStatus(op, j, 2);
      await F.setStatus(op, j, 3, { coordinates: [F.LNG, F.LAT] });
      await sleep(1200);
      return { j, quoteWa, wa: F.waTo(t1, customer.phone) };
    };
    const fT = await flow(trial, opT, tTruck._id);
    L.check(fT.quoteWa, "day 59 fleet: customer gets the 'new quote' WhatsApp");
    L.check(fT.wa.some((m) => m.ok && m.template === "job_status"), "day 59 fleet: customer gets trip updates", fT.wa.map((m) => m.template));
    L.check(fT.wa.some((m) => m.ok && m.template === "location_check"), "day 59 fleet: location check passes at pickup → customer told (item 42)", fT.wa.map((m) => m.template));
    const fE = await flow(ended, opE, eTruck._id);
    L.check(!fE.quoteWa, "day 61 fleet: no 'new quote' WhatsApp");
    L.check(!fE.wa.some((m) => m.template === "job_status" || m.template === "location_check"), "day 61 fleet: no trip updates, no location check", fE.wa.map((m) => m.template));
    // Delivery code still goes (essential)
    {
      const t0 = F.nowIso();
      await F.setStatus(opE, fE.j, 4);
      await F.setStatus(opE, fE.j, 5);
      await sleep(1200);
      const w = F.waTo(t0, customer.phone);
      L.check(w.some((m) => m.ok && m.template === "otp"), "day 61 fleet: delivery code still sent through the OTP template", w.map((m) => m.template));
    }
    // New-job alerts: operators of a day-61 fleet
    {
      const t0 = F.nowIso();
      await F.goLive(opE, eTruck._id);
      const j = await F.postJob(customer, { goods: `New job alert ${RUN}` });
      await sleep(1500);
      L.check(F.waTo(t0, opE.phone).some((m) => m.ok && m.template === "new_job"), "day 61 operator: new-job WhatsApp on a real post", F.waTo(t0, opE.phone).map((m) => m.template));
      await L.api("POST", `/logistics/job/${j}/cancel`, { token: customer.token, body: { reason: "End of test" } });
      await F.goOffline(opE);
    }

    // ── In-app chat gate
    L.sec("22d. In-app chat gate (trial or Paid), separate from paid features");
    r = await L.api("GET", `/logistics/chat/can-reply?peer=${customer._id}&module=logistics`, { token: trial.token });
    L.check(r?.data?.can_reply === true && r?.data?.source === "trial", "day 59: can reply, source=trial", r?.data);
    r = await L.api("GET", `/logistics/chat/can-reply?peer=${customer._id}&module=logistics`, { token: opT.token });
    L.check(r?.data?.can_reply === true && r?.data?.source === "trial", "day 59 operator: can reply", r?.data);
    r = await L.api("GET", `/logistics/chat/can-reply?peer=${customer._id}&module=logistics`, { token: ended.token });
    L.check(r?.data?.can_reply === false && r?.data?.reason === "FLEET_PLAN_REQUIRED", "day 61: refused", r?.data);
    const subPlan = (await L.api("GET", "/logistics/subscription", { token: trial.token }))?.data;
    L.check(subPlan?.current_plan === "free", "the free period is still the Free plan", subPlan?.current_plan);
    L.check(F.backend(`const p=require("./src/utils/logistics/logisticsPlans");const {User}=require("./src/models");const u=await User.findById(${JSON.stringify(trial._id)}).lean();return p.ownerHasPaidPlan(u)&&!p.ownerOnPaidPlan(u)`) === true, "Paid benefits on, without being on Paid");

    // ── Reminders
    L.sec("22e. Trial reminders at 14, 7 and 1 days, once each (scoped)");
    const rem = await F.makeOwner(pRem, { createdDaysAgo: 46 });
    const runRem = (dayShift = 0, ownerIds = [rem._id]) => F.backend(`const s=require("./src/utils/logistics/whatsappTrialScheduler");return s.processWhatsappTrialReminders({now:Date.now()+${dayShift}*864e5,ownerIds:${JSON.stringify(ownerIds)}})`);
    const remSent = (since) => F.outbox(since).filter((m) => m.channel === "whatsapp" && String(m.to).endsWith(pRem.phone) && m.template === "trial_reminder");
    const remMail = (since) => F.outbox(since).filter((m) => m.channel === "email" && m.to === pRem.email && /Paid benefits free/.test(m.subject || ""));
    let t0 = F.nowIso();
    r = runRem(0);
    L.check(r?.sent === 1, "14 days left: sent", r);
    L.check(remSent(t0).length === 1 && remMail(t0).length === 1, "WhatsApp + email once", { wa: remSent(t0).length, mail: remMail(t0).length });
    L.check(/14 days/.test(JSON.stringify(remSent(t0)[0]?.variables || {})) && /\/logistics\/owner\/subscription/.test(JSON.stringify(remSent(t0)[0]?.variables || {})), "WhatsApp has days left + upgrade link", remSent(t0)[0]?.variables);
    const remNote = await d.collection(" notifications").findOne({ receiver_id: OID(rem._id), type: "logistics_whatsapp_trial" });
    L.check(!!remNote && (JSON.stringify(remNote).includes("/logistics/owner/subscription")), "notification type logistics_whatsapp_trial + link", remNote && Object.keys(remNote));
    t0 = F.nowIso();
    r = runRem(0);
    L.check(r?.sent === 0 && remSent(t0).length === 0, "second run same day: nothing", r);
    r = runRem(3);
    L.check(r?.sent === 0, "11 days left: nothing", r);
    t0 = F.nowIso();
    r = runRem(7);
    L.check(r?.sent === 1 && /7 days/.test(JSON.stringify(remSent(t0)[0]?.variables || {})), "7 days left: sent", { r, v: remSent(t0)[0]?.variables });
    r = runRem(7);
    L.check(r?.sent === 0, "7 days again: nothing", r);
    t0 = F.nowIso();
    r = runRem(13);
    L.check(r?.sent === 1 && /1 day\b/.test(JSON.stringify(remSent(t0)[0]?.variables || {})), "1 day left: sent", { r, v: remSent(t0)[0]?.variables });
    r = runRem(13);
    L.check(r?.sent === 0, "1 day again: nothing", r);
    r = runRem(0, [ended._id]);
    L.check(r?.sent === 0, "trial over: no reminder", r);
    await L.setPlan(rem._id, "paid");
    await d.collection("users").updateOne({ _id: OID(rem._id) }, { $set: { logistics_trial_reminders_sent: [] } });
    r = runRem(0);
    L.check(r?.sent === 0, "paid owner: no reminder", r);
    await L.setPlan(rem._id, "free");
    // Catch-up: downtime across two thresholds gives one message
    await d.collection("users").updateOne({ _id: OID(rem._id) }, { $set: { logistics_trial_reminders_sent: [], "logistics_plan.trial_ends_at": new Date(Date.now() + 14 * DAY), "logistics_plan.trial_ended_at": null } });
    t0 = F.nowIso();
    r = runRem(8);
    L.check(r?.sent === 1 && remSent(t0).length === 1, "after downtime: one message, not two", r);

    L.sec("22f. Booking reminders and weekly summary (scoped)");
    const j1 = await F.postJob(customer, { goods: `Booking reminder ${RUN}` });
    await F.goLive(opT, tTruck._id);
    const qb = await F.quote(opT, j1, tTruck._id);
    await F.acceptQuote(customer, j1, qb?.data?.quote?._id);
    await d.collection("transport_jobs").updateOne({ _id: OID(j1) }, { $set: { when_needed: new Date(Date.now() + 20 * 3600 * 1000), booking_reminders_sent: [] } });
    const runBook = (ms = 0) => F.backend(`const s=require("./src/utils/logistics/bookingReminderScheduler");return s.processBookingReminders({now:Date.now()+${ms},ownerIds:[${JSON.stringify(trial._id)}]})`);
    t0 = F.nowIso();
    r = runBook();
    L.check(r?.sent >= 1, "day-before reminder runs", r);
    L.check(F.waTo(t0, customer.phone).some((m) => m.ok && m.template === "booking_reminder") && F.waTo(t0, opT.phone).some((m) => m.ok && m.template === "booking_reminder"), "customer + operator get the WhatsApp (fleet in trial)", F.outbox(t0).filter((m) => m.channel === "whatsapp").map((m) => [m.template, m.to]));
    r = runBook();
    L.check(!r?.sent, "second run: nothing", r);
    t0 = F.nowIso();
    r = runBook(19 * 3600 * 1000);
    L.check(r?.sent >= 1 && /2 hours/.test(JSON.stringify(F.waTo(t0, customer.phone).map((m) => m.variables))), "2 hours before: sent", { r, w: F.waTo(t0, customer.phone).map((m) => m.variables) });
    r = runBook(19 * 3600 * 1000);
    L.check(!r?.sent, "2 hours again: nothing", r);
    const monday = (() => { const x = new Date(); x.setUTCHours(7, 0, 0, 0); while (x.getUTCDay() !== 1 || x.getTime() < Date.now()) x.setTime(x.getTime() + DAY); return x.getTime(); })();
    const runSum = (now, id, force = false) => F.backend(`const s=require("./src/utils/logistics/fleetSummaryScheduler");return s.processFleetSummaries({now:${now},ownerIds:[${JSON.stringify(id)}],force:${force}})`);
    r = runSum(monday - DAY, trial._id);
    L.check(!r?.sent && r?.skipped === "not_monday_8am", "Sunday: nothing", r);
    r = runSum(monday - 6 * 3600 * 1000, trial._id);
    L.check(!r?.sent, "Monday before 08:00 Harare: nothing", r);
    t0 = F.nowIso();
    // Real clock (day 59 stays in trial); force stands in for "it is Monday 08:00"
    r = runSum(Date.now(), trial._id, true);
    L.check(r?.sent === 1 && F.waTo(t0, trial.phone).some((m) => m.ok && m.template === "fleet_summary"), "trial owner: weekly summary on WhatsApp", { r, w: F.waTo(t0, trial.phone).map((m) => m.template) });
    L.check(F.outbox(t0).some((m) => m.channel === "email" && m.to === trial.email), "summary email");
    L.check(!!(await d.collection(" notifications").findOne({ receiver_id: OID(trial._id), type: "logistics_fleet_summary" })), "summary notification");
    r = runSum(Date.now(), trial._id, true);
    L.check(!r?.sent, "second run the same week: nothing", r);
    t0 = F.nowIso();
    r = runSum(monday, ended._id);
    L.check(r?.sent === 1 && !F.waTo(t0, ended.phone).some((m) => m.template === "fleet_summary") && F.outbox(t0).some((m) => m.channel === "email" && m.to === ended.email), "Monday 09:00 Harare, trial over: email, no WhatsApp", { r });

    L.sec("22g. Document expiry reminders reach free owners during the trial");
    {
      const a = await d.collection("logistics_assets").findOne({ _id: OID(tTruck._id) });
      const soon = new Date(Date.now() + 7 * DAY);
      await d.collection("logistics_assets").updateOne({ _id: a._id }, { $set: { documents: a.documents.map((x) => (x.type === "rego" ? { ...x, expires: soon, expiry_reminders_sent: [], expiry_notified_on: null } : x)) } });
      await F.setStatus(opT, j1, 2).catch(() => {});
      const docRun = (id) => F.backend(`process.env.LOGISTICS_DOC_REMINDER_HOUR="0";const s=require("./src/utils/logistics/documentExpiryScheduler");return s.processLogisticsDocumentExpiry({ownerIds:[${JSON.stringify(id)}]})`);
      t0 = F.nowIso();
      r = docRun(trial._id);
      L.check(F.waTo(t0, trial.phone).some((m) => m.ok && m.template === "doc_expiry"), "day 59 free owner: document expiry WhatsApp", { r, w: F.waTo(t0, trial.phone).map((m) => m.template) });
      const b = await d.collection("logistics_assets").findOne({ _id: OID(eTruck._id) });
      await d.collection("logistics_assets").updateOne({ _id: b._id }, { $set: { documents: b.documents.map((x) => (x.type === "rego" ? { ...x, expires: soon, expiry_reminders_sent: [], expiry_notified_on: null } : x)) } });
      t0 = F.nowIso();
      r = docRun(ended._id);
      L.check(!F.waTo(t0, ended.phone).some((m) => m.template === "doc_expiry"), "day 61 free owner: no document expiry WhatsApp", { r });
      await d.collection("logistics_assets").updateOne({ _id: b._id }, { $set: { documents: b.documents } });
    }

    // ── One Free plan
    L.sec("22h. One Free plan: no test plan to pick; plan and plan_id");
    const paid = await F.makeOwner(pPaid, { createdDaysAgo: 80 });
    const subP = (await L.api("GET", "/logistics/subscription", { token: paid.token }))?.data;
    L.check((subP?.plans || []).map((x) => x.id).join() === "free,paid", "plans[] is Free and Paid only", (subP?.plans || []).map((x) => x.id));
    r = await L.api("POST", "/logistics/subscription/plan", { token: paid.token, body: { plan_id: "free" } });
    L.check(r?.success !== false && (await user(paid._id)).logistics_plan?.id === "free", "plan_id alone works", r?.message);
    r = await L.api("POST", "/logistics/subscription/plan", { token: paid.token, body: { plan: "free" } });
    L.check(r?.success !== false, "plan alone works", r?.message);
    r = await L.api("POST", "/logistics/subscription/plan", { token: paid.token, body: { plan: "test_paid" } });
    L.check(r?.success === false, "the old test plan can't be picked", r?.message);
    r = await L.api("POST", "/logistics/subscription/plan", { token: paid.token, body: { plan_id: "paid" } });
    L.check(r?.success === false, "real Paid still can't be activated (LOGISTICS_PAID_PLANS_ENABLED off)", r?.message);

    // ── _testingaccount
    L.sec("22i. _testingaccount: free period for 2 months, once");
    const tEmail = `s22${String(RUN).toLowerCase()}a_testingaccount@yopmail.com`;
    testEmails.push(tEmail);
    const biz = await L.businessDocFiles({ name: "Test Account", company: "Test Account" });
    r = await L.apiForm("POST", "/logistics/auth/register", {
      body: { full_name: "Test Account", company_name: "Test Account Co", email: tEmail, country_code: C.CC, phone_number: C.phone("s22-testacc"), password: "Passw0rd!", role: 4, type: 1, business_docs: "1", owner_id_kind: "driving_licence", owner_id_expires: L.docExpiryYmd() },
      files: [["business_registration", biz.business_registration], ["owner_id", biz.owner_id]],
    });
    L.check(r?.success !== false, "registers", r?.message);
    let tu = await d.collection("users").findOne({ email: tEmail });
    L.check(tu?.logistics_plan?.id === "free" && Math.abs(new Date(tu.logistics_plan.trial_ends_at).getTime() - Date.now() - 60 * DAY) < 4 * DAY, "sign-up: free period for about 2 months", tu?.logistics_plan);
    L.check(!!tu?.logistics_test_plan_granted_at || !!tu?.logistics_plan?.source, "grant recorded", tu && Object.keys(tu).filter((k) => /test|grant/i.test(k)));
    // First login for an existing account
    const t2Email = `s22${String(RUN).toLowerCase()}b_testingaccount@yopmail.com`;
    testEmails.push(t2Email);
    const hash = await require(require("path").join(F.BACKEND, "node_modules/bcrypt")).hash("Passw0rd!", 10).catch(() => null);
    const t2id = new L.mongoose.Types.ObjectId();
    await d.collection("users").insertOne({ _id: t2id, email: t2Email, full_name: "Gift Makombe", company_name: "Makombe Earthmovers", role: 4, owner_id: null, country_code: C.CC, phone_number: C.phone("s22-testacc2"), email_verified: 1, account_verified: 1, is_completeProfile: 1, is_deleted: 0, password: hash, logistics_approval: { status: "approved" }, createdAt: new Date(Date.now() - 100 * DAY), updatedAt: new Date() });
    r = await L.api("POST", "/logistics/auth/login", { body: { email: t2Email, password: "Passw0rd!" } });
    L.check(r?.success !== false, "existing test account logs in", r?.message);
    tu = await d.collection("users").findOne({ _id: t2id });
    L.check(!!tu?.logistics_plan?.trial_ends_at, "first login grants the free period", tu?.logistics_plan);
    // Once ever: drop the plan, log in again
    await d.collection("users").updateOne({ _id: t2id }, { $set: { "logistics_plan.trial_ends_at": null } });
    await L.api("POST", "/logistics/auth/login", { body: { email: t2Email, password: "Passw0rd!" } });
    tu = await d.collection("users").findOne({ _id: t2id });
    L.check(!tu?.logistics_plan?.trial_ends_at, "second login: not granted again", tu?.logistics_plan);
    // Social sign-up path: a real Google/Apple token can't be made here, so the grant it calls runs directly
    const t3Email = `s22${String(RUN).toLowerCase()}c_testingaccount@yopmail.com`;
    r = F.backend(`const {User}=require("./src/models");const p=require("./src/utils/logistics/logisticsPlans");const u=new User({email:${JSON.stringify(t3Email)},role:4,full_name:"Kudakwashe Moyo"});const first=await p.grantTestAccountPlan(u);const end=u.logistics_plan.trial_ends_at;const second=await p.grantTestAccountPlan(u);return {first,second,same:end===u.logistics_plan.trial_ends_at}`);
    L.check(r?.first === true && r?.second === false && r?.same === true, "grant used by social login: once only", r);
    r = F.backend(`const {User}=require("./src/models");const p=require("./src/utils/logistics/logisticsPlans");const u=new User({email:"someone@yopmail.com",role:4});return await p.grantTestAccountPlan(u)`);
    L.check(r === false, "other addresses get no grant", r);

    // ── Security
    L.sec("22j. Register body can't set a plan, verified flags or owner_id");
    {
      const evil = { logistics_plan: { id: "paid", expires_at: null }, isSubscribed: 1, owner_id: trial._id, email_verified: 1, phone_verified: 1, account_verified: 1, logistics_notify: { whatsapp: false }, logistics_approval: { status: "approved" }, logistics_self_operator: true, is_deleted: 0, status: 9, _id: "000000000000000000000abc" };
      const fb = await L.businessDocFiles({ name: "Simbarashe Dube", company: "Dube Logistics Harare" });
      r = await L.apiForm("POST", "/logistics/auth/register", {
        body: { full_name: "Simbarashe Dube", company_name: "Dube Logistics Harare", email: emailsS("reg"), country_code: C.CC, phone_number: C.phone("s22-reg"), password: "Passw0rd!", role: 4, type: 1, business_docs: "1", owner_id_kind: "driving_licence", owner_id_expires: L.docExpiryYmd(), ...evil },
        files: [["business_registration", fb.business_registration], ["owner_id", fb.owner_id]],
      });
      let u = await d.collection("users").findOne({ email: emailsS("reg") });
      L.check(!!u, "logistics sign-up still works", r?.message);
      L.check(u && u.logistics_plan?.id !== "paid" && !Number(u.isSubscribed), "logistics: plan not set", u?.logistics_plan);
      L.check(u && !u.owner_id, "logistics: owner_id not set", u?.owner_id);
      L.check(u && Number(u.email_verified) !== 1 && Number(u.phone_verified) !== 1, "logistics: verified flags not set", u && [u.email_verified, u.phone_verified]);
      L.check(u && u.logistics_approval?.status === "pending", "logistics: stays Pending", u?.logistics_approval);
      L.check(u && !u.logistics_self_operator, "logistics: can't enable self-operating");
      L.check(u && String(u._id) !== evil._id, "logistics: can't pick _id");

      for (const [route, tag, role] of [["/customer/auth/register", "cust", 1], ["/service/auth/register", "svc", 2], ["/corporate/auth/register", "corp", 3]]) {
        r = await L.api("POST", route, { body: { email: emailsS(tag), country_code: C.CC, phone_number: C.phone(`s22-${tag}`), password: "Passw0rd!", confirm_password: "Passw0rd!", full_name: REALNAME[tag] || `${tag} tester`, type: 1, role, ...evil } });
        u = await d.collection("users").findOne({ email: emailsS(tag) });
        L.check(!!u, `${route}: sign-up works`, r?.message);
        L.check(u && !u.logistics_plan?.id?.includes?.("paid") && !Number(u.isSubscribed) && !u.owner_id && Number(u.email_verified) !== 1 && Number(u.phone_verified) !== 1 && !u.logistics_approval?.status?.includes?.("approved"), `${route}: plan / flags / owner_id stripped`, u && { p: u.logistics_plan, s: u.isSubscribed, o: u.owner_id, e: u.email_verified, ph: u.phone_verified });
      }
      r = await L.api("POST", "/customer/auth/register", { body: { email: emailsS("cust2"), country_code: C.CC, phone_number: C.phone("s22-cust2"), password: "Passw0rd!", type: 1, role: 4 } });
      L.check(r?.success === false && (r?.data?.code === "ROLE_NOT_ALLOWED" || /role/i.test(r?.message || "")), "customer route refuses role 4 (ROLE_NOT_ALLOWED)", r);
      L.check(!(await d.collection("users").findOne({ email: emailsS("cust2") })), "nothing saved");
      r = await L.api("POST", "/customer/auth/register", { body: { email: emailsS("cust2"), country_code: C.CC, phone_number: C.phone("s22-cust2"), password: "Passw0rd!", type: 1, role: 3 } });
      L.check(r?.success !== false, "customer route keeps role 3 (web Corporate tab)", r?.message);
      await d.collection("users").deleteOne({ email: emailsS("cust2") });
    }

    L.sec("22k. A sign-up can't overwrite another account");
    {
      const vPhone = C.phone("s22-victim");
      const vId = new L.mongoose.Types.ObjectId();
      await d.collection("users").insertOne({ _id: vId, email: emailsS("victim"), full_name: "Unverified Victim", role: 1, country_code: C.CC, phone_number: vPhone, email_verified: 0, phone_verified: 0, password: "orig-hash", is_deleted: 0, createdAt: new Date(), updatedAt: new Date() });
      // Attacker registers with his own email and phone: the old bug matched any user with an email
      r = await L.api("POST", "/customer/auth/register", { body: { email: emailsS("attacker"), country_code: C.CC, phone_number: C.phone("s22-attacker"), password: "Attacker1!", full_name: "Attacker", type: 1, role: 1 } });
      const v = await d.collection("users").findOne({ _id: vId });
      L.check(v.full_name === "Unverified Victim" && v.email === emailsS("victim") && v.password === "orig-hash" && v.phone_number === vPhone, "another unverified account is untouched", v && { n: v.full_name, e: v.email });
      const at = await d.collection("users").findOne({ email: emailsS("attacker") });
      L.check(!!at && String(at._id) !== String(vId), "the sign-up got its own account", r?.message);
      // Existing email refused
      r = await L.api("POST", "/customer/auth/register", { body: { email: customer.email, country_code: C.CC, phone_number: C.phone("s22-x"), password: "Attacker1!", full_name: "Attacker", type: 1, role: 1 } });
      L.check(r?.success === false && /exist/i.test(r?.message || ""), "existing email refused", r?.message);
      r = await L.apiForm("POST", "/logistics/auth/register", { body: { full_name: "Attacker", company_name: "Evil", email: trial.email, country_code: C.CC, phone_number: C.phone("s22-y"), password: "Attacker1!", role: 4, type: 1, business_docs: "0" } });
      const t2 = await user(trial._id);
      L.check(r?.success === false && t2.full_name === trial.name, "logistics: can't re-register a verified owner's email", r?.message);
      await d.collection("users").deleteMany({ _id: { $in: [vId, ...(at ? [at._id] : [])] } });
    }

    // ── Resend
    L.sec("22l. Resend: a failed WhatsApp send keeps the first code; a working one replaces it");
    {
      // Numbers starting +26371888 fail on WhatsApp only (MOCK_FAIL_WA_TO)
      const fix = async (tag, role, phone) => {
        const id = new L.mongoose.Types.ObjectId();
        await d.collection("users").deleteMany({ email: emailsS(tag) });
        await d.collection("users").insertOne({ _id: id, email: emailsS(tag), full_name: REALNAME[tag] || `${tag} tester`, role, country_code: C.CC, phone_number: phone, email_otp: 1111, phone_otp: 2222, whatsapp_otp: 3333, email_verified: 0, phone_verified: 0, is_deleted: 0, createdAt: new Date(), updatedAt: new Date() });
        return id;
      };
      const paths = [["/customer/auth/resendOtp", "wa1", 1], ["/service/auth/resendOtp", "wa2", 2], ["/corporate/auth/resendOtp", "wa3", 3], ["/logistics/auth/resendOtp", "wa4", 4]];
      let n = 0;
      for (const [route, tag, role] of paths) {
        n += 1;
        const badPhone = `71888${String(1000 + n).padStart(4, "0")}`;
        const id = await fix(tag, role, badPhone);
        t0 = F.nowIso();
        r = await L.api("POST", route, { body: { user_id: String(id), type: 3, email: emailsS(tag) } });
        let u = await user(id);
        L.check(r?.success === false && Number(u.whatsapp_otp) === 3333 && Number(u.email_otp) === 1111 && Number(u.phone_otp) === 2222, `${route}: failed WhatsApp → refused, first code still valid`, { m: r?.message, w: u.whatsapp_otp });
        const failed = F.outbox(t0).filter((m) => m.channel === "whatsapp" && !m.ok);
        L.check(failed.length >= 1, `${route}: the send really was attempted and failed`, failed.length);
        const okPhone = C.phone(`s22-resend-${tag}`);
        await d.collection("users").updateOne({ _id: id }, { $set: { phone_number: okPhone } });
        t0 = F.nowIso();
        r = await L.api("POST", route, { body: { user_id: String(id), type: 3, email: emailsS(tag) } });
        u = await user(id);
        const wa = F.waTo(t0, okPhone).filter((m) => m.ok);
        L.check(r?.success !== false && wa.length === 1 && String(wa[0].variables?.["1"]) === String(u.whatsapp_otp) && Number(u.whatsapp_otp) !== 3333, `${route}: working send → new code saved and sent`, { m: r?.message, w: u.whatsapp_otp, sent: wa[0]?.variables });
        await d.collection("users").deleteOne({ _id: id });
      }
      // Logistics forgot password over WhatsApp (item 30)
      const fp = await L.api("POST", "/logistics/auth/forgotPass", { body: { email: trial.email, type: 3 } });
      L.check(fp?.success !== false, "logistics forgot password accepts WhatsApp", fp?.message);
      await sleep(600);
      L.check(F.waTo(F.nowIso().slice(0, 13), trial.phone).some((m) => m.ok && m.template === "otp"), "forgot-password code on the OTP template");
    }

    L.sec("22m. OTP page no longer on every login (phone_verified counts)");
    {
      const bcrypt = require(require("path").join(F.BACKEND, "node_modules/bcrypt"));
      const email = emailsS("phone");
      await d.collection("users").deleteMany({ email });
      const id = new L.mongoose.Types.ObjectId();
      await d.collection("users").insertOne({ _id: id, email, full_name: "Phone Verified", role: 1, country_code: C.CC, phone_number: C.phone("s22-pv"), email_verified: 0, phone_verified: 1, account_verified: 1, is_completeProfile: 1, is_deleted: 0, password: await bcrypt.hash("Passw0rd!", 10), createdAt: new Date(), updatedAt: new Date() });
      const b = await A("phone-verified");
      await L.goto(b, "/login", "form");
      await b.page.fill('input[placeholder="Enter your email"]', email);
      await b.page.fill('input[placeholder="Enter your password"]', "Passw0rd!");
      await b.page.locator('button[type="submit"]').first().click();
      await b.page.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 15000 }).catch(() => {});
      await b.page.waitForTimeout(800);
      L.check(!/otp/i.test(b.page.url()) && !/\/login/.test(b.page.url()), "verified over WhatsApp only: login goes straight in, no OTP page", b.page.url());
      await d.collection("users").deleteOne({ _id: id });
    }

    // ── WhatsApp chat
    L.sec("22n. 'Chat on WhatsApp': button follows trial/plan; no number before the click");
    await F.goLive(opT, tTruck._id);
    const chatJob = await F.postJob(customer, { goods: `Chat job ${RUN}` });
    const qc = await F.quote(opT, chatJob, tTruck._id);
    const c = await A("customer", customer);
    // Before acceptance: nothing to chat on yet, and no number anywhere in the page
    await L.goto(c, `/logistics/jobs/${chatJob}`);
    await c.page.waitForTimeout(2000);
    L.check(!(await c.page.content()).includes(pOpT.phone), "job with a pending quote: no operator number in the page");
    L.check((await c.page.locator('[data-testid="whatsapp-chat"]').count()) === 0, "job with a pending quote: no button (no operator on it yet)");
    const ac = await F.acceptQuote(customer, chatJob, qc?.data?.quote?._id);
    L.check(ac?.success !== false, "job accepted", ac?.message);
    const can = await L.api("GET", `/logistics/whatsapp-chat/can?job_id=${chatJob}`, { token: customer.token });
    L.check(can?.data?.allowed === true, "/can: allowed in trial", can?.data);
    L.check(!new RegExp(pOpT.phone).test(JSON.stringify(can)), "/can reveals no number");
    const captured = [];
    await c.ctx.route(/wa\.me/, (route) => { captured.push(route.request().url()); return route.fulfill({ status: 200, contentType: "text/html", body: "<title>wa stub</title>" }); });
    const htmlPhones = [];
    c.page.on("response", async (x) => { if (/\/whatsapp-chat\/can/.test(x.url())) { try { htmlPhones.push(await x.text()); } catch {} } });
    await L.goto(c, `/logistics/jobs/${chatJob}`, '[data-testid="whatsapp-chat"]');
    L.check(await c.page.locator('[data-testid="whatsapp-chat"]').first().isVisible(), "button on the customer's job page");
    L.check(htmlPhones.every((t) => !t.includes(pOpT.phone)), "no number in /can responses");
    const logBefore = await d.collection("logistics_whatsapp_chat_logs").countDocuments({ "job.id": OID(chatJob) }).catch(() => 0);
    L.check(logBefore === 0, "nothing logged before the click", logBefore);
    const [popup] = await Promise.all([c.ctx.waitForEvent("page", { timeout: 10000 }).catch(() => null), c.page.locator('[data-testid="whatsapp-chat"]').first().click()]);
    await sleep(1500);
    L.check(captured.some((u) => u.includes(pOpT.phone) && /text=/.test(u)), "opens wa.me with the number and pre-filled text", captured);
    const prefill = decodeURIComponent((captured[0] || "").split("text=")[1] || "").replace(/\+/g, " ");
    const jobRow = await d.collection("transport_jobs").findOne({ _id: OID(chatJob) });
    L.check(!jobRow.job_number || prefill.includes(jobRow.job_number), "pre-filled with the job number", prefill);
    if (popup) await popup.close().catch(() => {});
    await L.shot(c, "s22-whatsapp-button");
    const collections = (await d.listCollections().toArray()).map((x) => x.name).filter((n) => /whatsapp.*chat|chat.*log/i.test(n));
    const logColl = collections[0];
    let logRow = logColl ? await d.collection(logColl).findOne({ "job.id": OID(chatJob) }) : null;
    L.check(!!logRow, "log row written", collections);
    L.check(logRow?.initiator?.role === "customer" && String(logRow?.initiator?.id) === customer._id, "log: initiator + role", logRow?.initiator);
    L.check(logRow?.recipient?.role === "operator" && String(logRow?.recipient?.id) === opT._id, "log: recipient + role", logRow?.recipient);
    L.check(String(logRow?.owner?.id) === trial._id, "log: fleet owner", logRow?.owner);
    L.check(logRow?.job?.route && (logRow?.job?.number === (jobRow.job_number || "")) && Number(logRow?.job?.status) === 1, "log: job number, route, status", logRow?.job);
    // Operator and owner sides
    let rr = await L.api("POST", "/logistics/whatsapp-chat/start", { token: opT.token, body: { job_id: chatJob } });
    L.check(/wa\.me/.test(rr?.data?.url || "") && rr?.data?.url.includes(String(customer.phone || "").replace(/\D/g, "")), "operator can start it (customer's number)", rr?.data);
    const opPage = await A("operator", opT);
    await L.goto(opPage, `/logistics/driver/job/${chatJob}`, '[data-testid="whatsapp-chat"]');
    L.check(await opPage.page.locator('[data-testid="whatsapp-chat"]').first().isVisible(), "button on the operator's job page");
    rr = await L.api("POST", "/logistics/whatsapp-chat/start", { token: trial.token, body: { job_id: chatJob } });
    L.check(/wa\.me/.test(rr?.data?.url || ""), "owner can start it on his fleet's job", rr?.message);
    await L.goto(oT, `/logistics/owner/job/${chatJob}`, '[data-testid="whatsapp-chat"]');
    L.check(await oT.page.locator('[data-testid="whatsapp-chat"]').first().isVisible(), "button on the owner's job page");
    // Unit page
    rr = await L.api("GET", `/logistics/whatsapp-chat/can?asset_id=${tTruck._id}`, { token: customer.token });
    L.check(rr?.data?.allowed === true, "unit: customer may start", rr?.data);
    await L.goto(c, `/logistics/asset/${tTruck._id}`, '[data-testid="whatsapp-chat"]');
    L.check(await c.page.locator('[data-testid="whatsapp-chat"]').first().isVisible(), "button on the unit profile");
    L.check((await c.page.content()).includes(trial.phone), "free period: owner's number shows on the unit profile, as on Paid");
    rr = await L.api("POST", "/logistics/whatsapp-chat/start", { token: customer.token, body: { asset_id: tTruck._id } });
    L.check(rr?.data?.url?.includes(trial.phone) && !rr?.data?.url?.includes(opT.phone), "unit chat goes to the fleet owner, not the operator's number", rr?.data);
    // Guests
    const g = await A("guest");
    await L.goto(g, `/logistics/asset/${tTruck._id}`);
    await g.page.waitForTimeout(1500);
    L.check((await g.page.locator('[data-testid="whatsapp-chat"]').count()) === 0, "guest: no button");
    rr = await L.api("POST", "/logistics/whatsapp-chat/start", { body: { asset_id: tTruck._id } });
    L.check(rr?.success === false || rr?.status_code === 401 || !rr?.data?.url, "guest: API refuses", rr?.message);

    L.sec("22o. Button hidden outside trial/Paid; other refusals");
    // Day-61 fleet: job from 22c is linked to opE
    rr = await L.api("GET", `/logistics/whatsapp-chat/can?job_id=${fE.j}`, { token: customer.token });
    L.check(rr?.data?.allowed === false && rr?.data?.code === "WA_CHAT_PLAN_REQUIRED", "day 61 fleet: /can refused (WA_CHAT_PLAN_REQUIRED)", rr?.data);
    rr = await L.api("POST", "/logistics/whatsapp-chat/start", { token: customer.token, body: { job_id: fE.j } });
    L.check(rr?.success === false && rr?.data?.code === "WA_CHAT_PLAN_REQUIRED" && !rr?.data?.url, "day 61 fleet: /start refused", rr?.data);
    await L.goto(c, `/logistics/jobs/${fE.j}`);
    await c.page.waitForTimeout(2500);
    L.check((await c.page.locator('[data-testid="whatsapp-chat"]').count()) === 0, "day 61 fleet: button hidden on the job page");
    await L.goto(c, `/logistics/asset/${eTruck._id}`);
    await c.page.waitForTimeout(2000);
    L.check((await c.page.locator('[data-testid="whatsapp-chat"]').count()) === 0, "day 61 fleet: button hidden on the unit profile");
    // Same fleet on the test plan: button shows
    await L.setPlan(ended._id, "paid");
    await L.goto(c, `/logistics/jobs/${fE.j}`, '[data-testid="whatsapp-chat"]');
    L.check(await c.page.locator('[data-testid="whatsapp-chat"]').first().isVisible(), "same job once the fleet is on Paid: button shows");
    await L.setPlan(ended._id, "free");
    // Outsider
    const outsider = await L.makeCustomer(`cust2.s22.${RUN}`);
    rr = await L.api("GET", `/logistics/whatsapp-chat/can?job_id=${chatJob}`, { token: outsider.token });
    L.check(rr?.data?.allowed === false && rr?.data?.code === "WA_CHAT_NOT_ALLOWED", "stranger: WA_CHAT_NOT_ALLOWED", rr?.data);
    rr = await L.api("POST", "/logistics/whatsapp-chat/start", { token: outsider.token, body: { job_id: chatJob } });
    L.check(rr?.success === false && !rr?.data?.url, "stranger: /start gives no number", rr?.data);
    rr = await L.api("POST", "/logistics/whatsapp-chat/start", { token: ended.token, body: { job_id: chatJob } });
    L.check(rr?.success === false && !rr?.data?.url, "another fleet's owner: no number", rr?.data);
    // No phone
    {
      const cRow = await user(customer._id);
      await d.collection("users").updateOne({ _id: OID(opT._id) }, { $set: { phone_number: "" } });
      rr = await L.api("GET", `/logistics/whatsapp-chat/can?job_id=${chatJob}`, { token: customer.token });
      L.check(rr?.data?.allowed === false && rr?.data?.code === "WA_CHAT_NO_PHONE", "no phone: WA_CHAT_NO_PHONE", rr?.data);
      await L.goto(c, `/logistics/jobs/${chatJob}`);
      await c.page.waitForTimeout(2500);
      L.check((await c.page.locator('[data-testid="whatsapp-chat"]').count()) === 0, "no phone: button hidden");
      await d.collection("users").updateOne({ _id: OID(opT._id) }, { $set: { phone_number: opT.phone } });
      void cRow;
    }

    L.sec("22p. Admin: WhatsApp chats page");
    const a = await F.adminActor();
    actors.push(a);
    await a.adminGoto("/Dashboard", ".side-menu");
    await a.page.locator('[data-testid="sidebar-whatsapp-chats"]').click();
    await a.page.waitForSelector('[data-testid="wa-chat-totals"]', { timeout: 15000 });
    const totals = await a.page.locator('[data-testid="wa-chat-totals"]').innerText();
    L.check(/\d/.test(totals), "totals shown", totals);
    const api = await L.api("GET", `/admin/logistics/whatsapp-chats?job=${chatJob}&limit=100`, { token: await L.adminToken() });
    const all = await L.api("GET", "/admin/logistics/whatsapp-chats?limit=100", { token: await L.adminToken() });
    L.check(all?.data?.total >= 3 && all?.data?.today >= 3 && all?.data?.with_job >= 3, "API totals", { t: all?.data?.total, today: all?.data?.today, wj: all?.data?.with_job });
    const mine = (all?.data?.rows || []).find((x) => x.initiator?.id === customer._id && x.job?.id === chatJob);
    L.check(mine && mine.recipient?.id === opT._id && mine.owner?.id === trial._id && !!mine.job?.route && !!mine.at, "API row: who, whom, fleet, job, time", mine);
    L.check(!new RegExp(pOpT.phone).test(JSON.stringify(all)), "log has no phone numbers");
    L.check(api?.success !== false, "job filter answers", api?.message);
    const noJob = await L.api("GET", "/admin/logistics/whatsapp-chats?job=without&limit=100", { token: await L.adminToken() });
    L.check((noJob?.data?.rows || []).every((x) => !x.job) && (noJob?.data?.rows || []).some((x) => x.asset?.id === tTruck._id), "filter job=without: only unit chats", noJob?.data?.rows?.length);
    const withJob = await L.api("GET", "/admin/logistics/whatsapp-chats?job=with&limit=100", { token: await L.adminToken() });
    L.check((withJob?.data?.rows || []).every((x) => !!x.job), "filter job=with: only job chats");
    const qr = await L.api("GET", `/admin/logistics/whatsapp-chats?q=${encodeURIComponent(customer.name)}&limit=100`, { token: await L.adminToken() });
    L.check((qr?.data?.rows || []).length >= 1 && (qr?.data?.rows || []).every((x) => JSON.stringify(x).toLowerCase().includes(customer.name.toLowerCase())), "search by name", qr?.data?.rows?.length);
    const tomorrow = F.ymd(Date.now() + 2 * DAY);
    const fut = await L.api("GET", `/admin/logistics/whatsapp-chats?from=${tomorrow}&limit=10`, { token: await L.adminToken() });
    L.check((fut?.data?.rows || []).length === 0, "date filter", fut?.data?.rows?.length);
    const rowUi = a.page.locator("[data-wa-chat-row]");
    await rowUi.first().waitFor({ timeout: 10000 });
    L.check((await rowUi.count()) >= 1, "rows on the page");
    const jobNo = jobRow.job_number;
    // Several people started a chat on this job; take the customer's row
    const allRows = await rowUi.evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => td.innerText)));
    const cells = allRows.find((c0) => /Customer/.test(c0[1] || "") && (!jobNo || (c0[4] || "").includes(jobNo))) || [];
    L.check(new RegExp(customer.name.split(" ")[0], "i").test(cells[1] || ""), "row: who started it", cells);
    L.check(new RegExp(pOpT.name.split(" ")[0], "i").test(cells[2] || ""), "row: who it went to", cells);
    L.check(new RegExp((trial.company || trial.name).split(" ")[0], "i").test(cells[3] || ""), "row: fleet owner", cells);
    L.check((!jobNo || (cells[4] || "").includes(jobNo)) && (cells[5] || "").length > 3, "row: job number and route", cells);
    // Filters on the page
    if (jobNo) {
      await a.page.locator(".log-wa-job").fill(jobNo);
      await a.page.waitForTimeout(1500);
      const shown = await rowUi.allInnerTexts();
      L.check(shown.length >= 1 && shown.every((t) => t.includes(jobNo)), "job number filter", shown.length);
      await a.page.locator(".log-wa-job").fill("");
      await a.page.waitForTimeout(800);
    }
    await a.page.locator(".log-wa-from").fill(tomorrow);
    await a.page.waitForTimeout(1500);
    L.check((await rowUi.count()) === 0, "date filter on the page (from tomorrow: none)", await rowUi.count());
    await a.page.locator(".log-wa-from").fill("");
    await a.page.waitForTimeout(800);
    await a.page.locator(".log-wa-to").fill(F.ymd(Date.now()));
    await a.page.waitForTimeout(1200);
    L.check((await rowUi.count()) >= 1, "to-date filter keeps today's rows");
    await L.shot(a, "s22-admin-chats");

    L.sec("22q. SOS reaches the owner and the admin phones");
    {
      t0 = F.nowIso();
      const sos = await L.api("POST", "/logistics/sos", { token: opT.token, body: { lat: F.LAT, lng: F.LNG, accuracy: 15, source: "web", message: "Breakdown on the flyover (s22)" } });
      L.check(!!(sos?.data?.alert?._id || sos?.data?.alert?.id), "SOS raised", sos?.message);
      await sleep(1500);
      const all2 = F.outbox(t0);
      L.check(all2.some((m) => m.channel === "whatsapp" && m.ok && m.template === "sos" && String(m.to).endsWith(trial.phone)), "owner gets the SOS on WhatsApp", all2.map((m) => [m.channel, m.template, m.to]));
      L.check(all2.some((m) => m.ok && m.to === "+263771000111" && (m.channel === "sms" || m.channel === "whatsapp")), "admin SOS phone (LOGISTICS_ADMIN_SOS_PHONES) gets it", all2.map((m) => [m.channel, m.to]));
      const id = sos?.data?.alert?._id || sos?.data?.alert?.id;
      if (id) await L.api("POST", `/logistics/sos/${id}/resolve`, { token: opT.token, body: { note: "ok" } });
    }
    await F.goOffline(opT);
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s22-crash");
  }
  await cleanTestAccounts().catch(() => {});
  F.pageChecks(actors);
  await L.done();
})();
