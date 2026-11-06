/* Stage 15 — WhatsApp notifications: profile toggle + plan rules (v2.7.50, changed v2.7.61).
   Free fleet: essentials free forever (invites work), extras during the 60-day trial, none after it.
   Toggle usable on every plan. Paid fleet: toggle on by default, switching it off (in the browser)
   stops WhatsApp, on brings it back. Customers: own toggle only.
   WhatsApp sends go through the real backend code (utils/logistics/jobWhatsapp.js) in a child
   process with the mocked Twilio, so every message lands in outbox.jsonl. Uses s1–s3 state. */
const L = require("./lib");
const F = require("./fleet-helpers");
const DOCS = require("./docs");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const OUTBOX = process.env.MOCK_OUTBOX || path.join(__dirname, "outbox.jsonl");
const BACKEND = path.resolve(__dirname, "../../../sibmba-tasker-backend");
const now = () => new Date().toISOString();
const outbox = (since) =>
  fs.existsSync(OUTBOX)
    ? fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ts >= since)
    : [];

/** Real backend send (policy + template + mocked Twilio). Returns { ok, error }. */
function sendWa(userId, key, vars, opts = {}) {
  const out = execFileSync(process.execPath, ["-r", path.join(BACKEND, "scripts/e2e/mock-providers.js"), "-e",
    `require("dotenv").config();const m=require("mongoose");m.connect(process.env.DB_URL).then(async()=>{const w=require("./src/utils/logistics/jobWhatsapp");const r=await w.sendJobWhatsapp(${JSON.stringify(userId)},${JSON.stringify(key)},${JSON.stringify(vars)},${JSON.stringify(opts)});console.log("RESULT"+JSON.stringify(r));await m.disconnect()})`],
    { cwd: BACKEND, env: { ...process.env }, stdio: "pipe" }).toString();
  const line = out.split("\n").find((l) => l.startsWith("RESULT"));
  return line ? JSON.parse(line.slice(6)) : { ok: false, error: "no result" };
}

const WEB = L.WEB;
// Template variables as the backend fills them for a Harare → Mutare trip of the s1 fleet
const ST0 = L.loadState();
const CAST = L.cast(ST0.RUN);
const FLEET = ST0.ownerCompany || CAST.slot("owner", "s1").company;
const ROUTE = `${L.PLACES.corridor.from} → ${L.PLACES.corridor.to}`;
const vars = {
  owner: (id) => ({ 1: `Kinnow boxes, 300 crates (${ROUTE})`, 2: "Your operator is in transit", 3: `${WEB}/logistics/owner/job/${id}` }),
  operator: (id) => ({ 1: `${ROUTE} · 4 ton truck · tomorrow`, 2: `${WEB}/logistics/driver/job/${id}` }),
  customer: (id) => ({ 1: `Kinnow boxes, 300 crates (${ROUTE})`, 2: `${FLEET} · USD 120`, 3: `${WEB}/logistics/jobs/${id}` }),
};

async function card(a) {
  await L.goto(a, "/edit-profile", "form");
  const c = a.page.locator('[data-testid="wa-notify-card"]');
  await c.waitFor({ timeout: 15000 }).catch(() => {});
  return c;
}
async function me(token) {
  return (await L.api("GET", "/logistics/me", { token }))?.data?.user?.notifications || {};
}
async function flip(a, c, wantOn) {
  const sw = c.locator("#wa-notify-switch");
  if ((await sw.isChecked()) !== wantOn) await sw.click();
  return L.waitText(a, wantOn ? /WhatsApp notifications on/ : /WhatsApp notifications off/);
}

(async () => {
  const st = L.loadState();
  const d = await L.db();
  const actors = [];
  const A = async (n, user) => { const a = await L.actor(n); actors.push(a); await L.seedAuth(a, { token: user.token, user }); return a; };
  const jobId = st.job?._id || "000000000000000000000000";
  try {
    if (!st.owner?.token || !st.operator?.token || !st.customer?.token) throw new Error("run s1–s3 first (needs owner, operator, customer)");
    await L.setPlan(st.owner._id, "free");
    const inFreePeriod = async () => d.collection("users").updateOne({ _id: new L.mongoose.Types.ObjectId(String(st.owner._id)) }, { $set: { "logistics_plan.trial_started_at": new Date(), "logistics_plan.trial_ends_at": new Date(Date.now() + 60 * 864e5), "logistics_plan.trial_ended_at": null } });

    // ── Free fleet
    L.sec("15a. Free plan: card says Essentials (v2.7.61), not paid-only");
    const o = await A("owner", st.owner);
    await L.goto(o, "/logistics/owner/subscription", ".log-sub-plan");
    const freeRow = o.page.locator(".log-sub-plan").filter({ hasText: "Free" }).first().locator('[data-testid="plan-whatsapp"]');
    await freeRow.waitFor({ timeout: 15000 }).catch(() => {});
    L.check(/WhatsApp notifications\s*Essentials/.test(await freeRow.innerText().catch(() => "")), "Free card: 'WhatsApp notifications Essentials'", await freeRow.innerText().catch(() => "missing"));
    L.check(/WhatsApp notifications/.test(await o.page.locator(".log-sub-plan--soon").innerText().catch(() => "")), "paid teaser lists WhatsApp notifications");
    const subApi = await L.api("GET", "/logistics/subscription", { token: st.owner.token });
    const freePlan = (subApi?.data?.plans || []).find((p) => p.id === "free");
    L.check(freePlan && freePlan.whatsapp_notifications === false, "API: Free plan whatsapp_notifications=false (the full pack needs trial or Paid)", freePlan);
    await L.shot(o, "s15-plan-free");

    L.sec("15b. Free plan: profile switch usable by the owner and the operator");
    let c = await card(o);
    L.check(!(await c.locator("#wa-notify-switch").isDisabled()) && (await c.locator("#wa-notify-switch").isChecked()), "owner: switch enabled and ON");
    L.check(/Essentials free, full pack free for 60 days/.test(await c.innerText()), "owner: 'Essentials free, full pack free for 60 days'", await c.innerText());
    await L.shot(o, "s15-profile-owner-free");
    let n = await me(st.owner.token);
    L.check(n.whatsapp === true && n.whatsapp_available === true && n.whatsapp_active === true, "/me notifications: whatsapp_available always true, active", n);
    const op = await A("operator", st.operator);
    c = await card(op);
    L.check(!(await c.locator("#wa-notify-switch").isDisabled()), "operator: switch enabled");
    await L.shot(op, "s15-profile-operator-free");

    L.sec("15c. Free plan: WhatsApp invites work (UI + API, essential)");
    await F.resetPeople([CAST.slot("owner", "s15").email]);
    const inviter = await F.makeOwner(CAST.slot("owner", "s15"));
    const oi = await A("owner-inviter", inviter);
    await L.goto(oi, "/logistics/owner/operators/add", "form");
    const waOpt = oi.page.locator('.log-invite-via__opt[data-channel="whatsapp"]');
    await waOpt.waitFor({ timeout: 10000 }).catch(() => {});
    await L.typePhone(oi.page.locator("#op-phone, .log-field:has(#op-phone) input[type=tel]").first(), CAST.CC, CAST.slot("operator", "s15").phone);
    L.check(!(await waOpt.locator("input").isDisabled()), "invite form: WhatsApp checkbox enabled once a phone is typed");
    L.check(!/Paid plans only/.test(await waOpt.innerText()), "invite form: no 'Paid plans only'");
    await L.shot(oi, "s15-invite-free");
    const waOp = CAST.slot("operator", "s15");
    let t0 = now();
    const inv = await L.apiForm("POST", "/logistics/sub-user", { token: inviter.token, body: { email: waOp.email, full_name: waOp.name, country_code: CAST.CC, phone_number: waOp.phone, send_via: ["email", "whatsapp"] }, files: [["profile_photo", DOCS.face(5)]] });
    L.check(inv.success !== false && inv.data?.code !== "WHATSAPP_PAID_ONLY", "API accepts a WhatsApp invite on Free", inv.message);
    await new Promise((ok) => setTimeout(ok, 800));
    L.check(outbox(t0).some((m) => m.channel === "whatsapp" && m.ok && m.template === "invite"), "invite really sent on WhatsApp", outbox(t0).map((m) => [m.channel, m.template]));

    L.sec("15d. Free plan: extras in the trial; after it only essentials");
    await inFreePeriod();
    t0 = now();
    let r = sendWa(st.owner._id, "job_status", vars.owner(jobId));
    L.check(r.ok, "day 0 owner: job update sent (trial)", r);
    r = sendWa(st.operator._id, "new_job", vars.operator(jobId), { category: "essential" });
    L.check(r.ok, "operator new-job alert sent (essential)", r);
    const toFleet = (m) => [String(st.owner.phone), String(st.operator.phone)].some((ph) => String(m.to).endsWith(ph));
    L.check(outbox(t0).filter((m) => m.channel === "whatsapp" && m.ok && toFleet(m)).length === 2, "2 WhatsApps in the outbox");
    const ownerOid = new L.mongoose.Types.ObjectId(String(st.owner._id));
    await d.collection("users").updateOne({ _id: ownerOid }, { $set: { "logistics_plan.trial_ends_at": new Date(Date.now() - 864e5) } });
    try {
      t0 = now();
      r = sendWa(st.owner._id, "job_status", vars.owner(jobId));
      L.check(!r.ok && r.error === "free_plan", "trial over: owner's job update skipped (free_plan)", r);
      r = sendWa(st.operator._id, "job_status", vars.owner(jobId));
      L.check(!r.ok && r.error === "free_plan", "trial over: operator's extra skipped too", r);
      L.check(outbox(t0).filter((m) => m.channel === "whatsapp" && toFleet(m)).length === 0, "nothing reached Twilio");
      r = sendWa(st.operator._id, "new_job", vars.operator(jobId), { category: "essential" });
      L.check(r.ok, "trial over: operator's new-job alert still sent", r);
    } finally {
      await inFreePeriod();
    }

    // ── Paid fleet
    L.sec("15e. Paid plan: toggle on by default → WhatsApp delivered");
    await L.setPlan(st.owner._id, "paid");
    c = await card(o);
    L.check(!(await c.locator("#wa-notify-switch").isDisabled()) && (await c.locator("#wa-notify-switch").isChecked()), "owner: switch enabled and ON by default");
    await L.shot(o, "s15-profile-owner-paid");
    await L.goto(o, "/logistics/owner/subscription", ".log-sub-plan");
    const paidRow = o.page.locator(".log-sub-plan").filter({ hasText: "Current plan" }).locator('[data-testid="plan-whatsapp"]');
    await paidRow.waitFor({ timeout: 10000 }).catch(() => {});
    L.check(/WhatsApp notifications\s*✓/.test(await paidRow.innerText().catch(() => "")), "current Paid plan card: 'WhatsApp notifications ✓'", await paidRow.innerText().catch(() => "missing"));
    t0 = now();
    r = sendWa(st.owner._id, "job_status", vars.owner(jobId));
    L.check(r.ok, "owner job update sent on WhatsApp", r);
    r = sendWa(st.operator._id, "new_job", vars.operator(jobId), { category: "essential" });
    L.check(r.ok, "operator new-job alert sent on WhatsApp", r);
    L.check(outbox(t0).filter((m) => m.channel === "whatsapp" && m.ok && toFleet(m)).length === 2, "2 WhatsApps in the outbox");

    L.sec("15f. Paid plan: owner switches WhatsApp OFF in the profile → no WhatsApp");
    c = await card(o);
    L.check(await flip(o, c, false), "toast: WhatsApp notifications off");
    n = await me(st.owner.token);
    L.check(n.whatsapp === false && n.whatsapp_reason === "opted_out", "/me: whatsapp=false (opted_out)", n);
    await L.shot(o, "s15-profile-owner-off");
    t0 = now();
    r = sendWa(st.owner._id, "job_status", vars.owner(jobId));
    L.check(!r.ok && r.error === "opted_out", "owner job update skipped (opted_out)", r);
    r = sendWa(st.operator._id, "new_job", vars.operator(jobId), { category: "essential" });
    L.check(r.ok, "operator still gets WhatsApp — the owner's switch is only for the owner", r);
    await o.page.reload();
    c = o.page.locator('[data-testid="wa-notify-card"]');
    await c.waitFor({ timeout: 10000 }).catch(() => {});
    L.check(!(await c.locator("#wa-notify-switch").isChecked()), "switch stays OFF after reload");

    L.sec("15g. Owner switches WhatsApp back ON → delivered again");
    L.check(await flip(o, c, true), "toast: WhatsApp notifications on");
    r = sendWa(st.owner._id, "job_status", vars.owner(jobId));
    L.check(r.ok, "owner job update on WhatsApp again", r);

    // ── Customer (no fleet plan — own toggle only)
    L.sec("15h. Customer: toggle ON by default; OFF stops job WhatsApps, ON restarts them");
    const cu = await A("customer", st.customer);
    c = await card(cu);
    L.check(!(await c.locator("#wa-notify-switch").isDisabled()) && (await c.locator("#wa-notify-switch").isChecked()), "customer: switch enabled and ON by default");
    await L.shot(cu, "s15-profile-customer-on");
    r = sendWa(st.customer._id, "quote", vars.customer(jobId));
    L.check(r.ok, "customer 'new quote' WhatsApp sent", r);
    L.check(await flip(cu, c, false), "customer switches OFF");
    await L.shot(cu, "s15-profile-customer-off");
    r = sendWa(st.customer._id, "quote", vars.customer(jobId));
    L.check(!r.ok && r.error === "opted_out", "customer 'new quote' WhatsApp skipped (opted_out)", r);
    L.check(await flip(cu, c, true), "customer switches back ON");
    r = sendWa(st.customer._id, "quote", vars.customer(jobId));
    L.check(r.ok, "customer WhatsApp sent again", r);

    L.sec("15i. API validation");
    const bad = await L.api("PATCH", "/logistics/me", { token: st.customer.token, body: { notifications: { whatsapp: "nope" } } });
    L.check(bad.success === false && /true or false/.test(bad.message || ""), "non-boolean refused", bad.message);
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s15-crash");
  } finally {
    // Leave the shared fleet as the other stages expect it: Free, WhatsApp on
    await L.setPlan(st.owner._id, "free").catch(() => {});
    await d.collection("users").updateMany(
      { _id: { $in: [st.owner?._id, st.customer?._id, st.operator?._id].filter(Boolean).map((x) => new L.mongoose.Types.ObjectId(String(x))) } },
      { $unset: { logistics_notify: "" } }
    ).catch(() => {});
  }
  for (const x of actors) {
    L.check(x.errors.length === 0, `${x.name}: no page/console errors`, x.errors.slice(0, 4));
    L.check(x.apiFails.length === 0, `${x.name}: no 5xx`, x.apiFails);
  }
  await L.done();
})();
