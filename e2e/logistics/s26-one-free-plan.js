/* Stage 26 — one Free plan (v2.7.64): 60 days of Paid benefits from company approval, still shown
   as Free, then normal Free limits. No separate test plan. The clock never restarts. */
const L = require("./lib");
const F = require("./fleet-helpers");

const DAY = 864e5;
const { OID } = F;

(async () => {
  const RUN = L.loadState().RUN || "run";
  const C = L.cast(RUN);
  // Own account: the cast's spare owner slot is shared with other stages
  const pA = { ...C.slot("owner", "s26", 0), email: `s26.${String(RUN).toLowerCase()}@${C.DOMAIN}`, phone: C.phone("s26-owner") };
  const d = await L.db();
  const actors = [];
  const A = async (n, user) => { const a = await L.actor(n); actors.push(a); await L.seedAuth(a, { token: user.token, user }); return a; };
  const user = (id) => d.collection("users").findOne({ _id: OID(id) });
  const sub = async (t) => (await L.api("GET", "/logistics/subscription", { token: t }))?.data;
  const status = (a) => a.page.locator('[data-testid="free-period-status"]').first().innerText();
  try {
    L.sec("26a. Before approval: plain Free, clock not started");
    const o = await F.makeOwner(pA, { approve: false });
    let s = await sub(o.token);
    L.check(s?.current_plan === "free" && s?.plan?.limits?.vehicles === 2, "plain Free limits", s?.plan?.limits);
    L.check(s?.free_trial?.status === "not_started" && s?.free_trial?.days === 60, "free period not started", s?.free_trial);
    L.check(s?.whatsapp?.extras_active === false && s?.whatsapp?.trial_status === "not_started", "no extras before approval", s?.whatsapp);
    const a = await A("owner-26", o);
    await L.goto(a, "/logistics/owner/subscription", '[data-testid="free-period-status"]');
    L.check(/starting the day Simba Tasker approves/.test(await status(a)), "page: starts on approval", await status(a));
    await L.shot(a, "s26-before-approval");

    L.sec("26b. Approved: Paid benefits, still called Free");
    const r = await L.approveOwner(o._id);
    L.check(r?.success !== false, "admin approves", r?.message);
    await L.verifyDocs("business", o._id);
    let u = await user(o._id);
    L.check(Math.abs(new Date(u.logistics_plan.trial_ends_at).getTime() - Date.now() - 60 * DAY) < 120000, "ends 60 days from approval", u.logistics_plan);
    L.check(!u.logistics_plan.id || u.logistics_plan.id === "free", "plan stays Free", u.logistics_plan.id);
    L.check(u.isSubscribed === 1, "paid flag on", u.isSubscribed);
    s = await sub(o.token);
    L.check(s?.current_plan === "free" && s?.plan?.name === "Free" && s?.plan?.free_period === true, "API: name Free", s?.plan?.name);
    L.check(s?.plan?.limits?.vehicles === null && s?.plan?.limits?.operators === null && s?.plan?.limits?.equipment === null, "API: unlimited now", s?.plan?.limits);
    L.check(s?.plan?.featured_in_hub === true && s?.whatsapp?.source === "trial" && s?.whatsapp?.extras_active === true, "API: Hub and WhatsApp on", s?.whatsapp);
    L.check(s?.free_trial?.active === true && s?.free_trial?.days_left === 60, "API: 60 days left", s?.free_trial);
    L.check((s?.plans || []).map((p) => p.id).join() === "free,paid", "API: only Free and Paid", (s?.plans || []).map((p) => p.id));
    L.check(s?.expires_at === null && (s?.plans || [])[0]?.limits?.vehicles === 2, "API: Free's own limits kept in the list", (s?.plans || [])[0]?.limits);

    await L.goto(a, "/logistics/owner/subscription", '[data-testid="free-period-status"]');
    const cards = await a.page.locator(".log-sub-plans .log-sub-plan").count();
    const page = await L.bodyText(a);
    L.check(cards === 2, "page: Free card + Paid coming-soon card", cards);
    L.check(!/free test/i.test(page) && !(await a.page.locator('[data-testid="plan-choose-test_paid"]').count()), "page: no second free plan");
    L.check(/free for 60 more days/.test(await status(a)), "page: 60 days", await status(a));
    const freeCard = (await a.page.locator(".log-sub-plan--free").innerText()).replace(/\s+/g, " ");
    L.check(/^Free /.test(freeCard) && /USD 0/.test(freeCard) && /Unlimited \(2 after free period\)/.test(freeCard) && /Current plan/.test(freeCard), "page: Free card, USD 0, shows both limits", freeCard.slice(0, 200));
    await L.shot(a, "s26-free-period");
    L.check(await a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "page: no sideways scroll");

    L.sec("26c. Paid benefits really work: above the Free limits");
    const units = [];
    for (let i = 0; i < 3; i += 1) units.push(await F.makeUnit(o, C.unit("truck", 260 + i)));
    s = await sub(o.token);
    L.check(s?.usage?.vehicles === 3 && s?.plan_locked_units === 0, "3 trucks active (Free allows 2)", s?.usage);
    const pin = await L.api("POST", `/logistics/asset/${units[2]._id}/feature`, { token: o.token, body: { featured: true } });
    L.check(pin?.success !== false, "can pin a truck in the Hub", pin?.message);

    L.sec("26d. Re-approval doesn't restart the clock");
    await d.collection("users").updateOne({ _id: OID(o._id) }, { $set: { "logistics_plan.trial_ends_at": new Date(Date.now() + 10 * DAY), "logistics_plan.trial_started_at": new Date(Date.now() - 50 * DAY) } });
    await L.approveOwner(o._id, "rejected", "Test reason");
    await L.approveOwner(o._id);
    u = await user(o._id);
    L.check(Math.abs(new Date(u.logistics_plan.trial_ends_at).getTime() - Date.now() - 10 * DAY) < 120000, "still 10 days left", u.logistics_plan.trial_ends_at);

    L.sec("26e. Free period over: normal Free, extra units locked, once");
    await d.collection("users").updateOne({ _id: OID(o._id) }, { $set: { "logistics_plan.trial_ends_at": new Date(Date.now() - 1000) } });
    s = await sub(o.token);
    L.check(s?.current_plan === "free" && s?.plan?.limits?.vehicles === 2 && !s?.plan?.free_period, "back to plain Free", s?.plan?.limits);
    L.check(s?.free_trial?.status === "ended" && s?.whatsapp?.extras_active === false, "free period ended, extras off", s?.free_trial);
    L.check(s?.plan_locked_units === 1 && s?.usage?.vehicles === 2, "the third truck is locked", s?.usage);
    u = await user(o._id);
    L.check(u.isSubscribed === 0 && !!u.logistics_plan.trial_ended_at, "paid flag off, end recorded", u.isSubscribed);
    const pinned = await d.collection("logistics_assets").countDocuments({ owner_id: OID(o._id), is_featured: true });
    L.check(pinned === 0, "Hub pin cleared", pinned);
    const count = () => d.collection(" notifications").countDocuments({ receiver_id: OID(o._id), type: "LOGISTICS_PLAN_EXPIRED" });
    const notes = await count();
    await sub(o.token);
    L.check(notes === 1 && (await count()) === 1, "owner told once", notes);
    await L.goto(a, "/logistics/owner/subscription", '[data-testid="free-period-status"]');
    L.check(/free period has ended/.test(await status(a)), "page: ended note", await status(a));
    await L.shot(a, "s26-ended");
    await L.approveOwner(o._id, "rejected", "Test reason");
    await L.approveOwner(o._id);
    L.check((await sub(o.token))?.free_trial?.status === "ended", "never starts a second time");
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s26-crash");
  }
  F.pageChecks(actors);
  await L.done();
})();
