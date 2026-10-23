/* Stage 15 — WhatsApp notifications: profile toggle + paid-plan only (v2.7.50).
   Free fleet: plan card ✗, profile toggle locked, invite WhatsApp option disabled, API refuses
   WhatsApp invites, no WhatsApp to the owner / operators. Paid fleet: toggle on by default,
   switching it off (in the browser) stops WhatsApp, on brings it back. Customers: own toggle only.
   WhatsApp sends go through the real backend code (utils/logistics/jobWhatsapp.js) in a child
   process with the mocked Twilio, so every message lands in outbox.jsonl. Uses s1–s3 state. */
const L = require("./lib");
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
function sendWa(userId, key, vars) {
  const out = execFileSync(process.execPath, ["-r", path.join(BACKEND, "scripts/e2e/mock-providers.js"), "-e",
    `require("dotenv").config();const m=require("mongoose");m.connect(process.env.DB_URL).then(async()=>{const w=require("./src/utils/logistics/jobWhatsapp");const r=await w.sendJobWhatsapp(${JSON.stringify(userId)},${JSON.stringify(key)},${JSON.stringify(vars)});console.log("RESULT"+JSON.stringify(r));await m.disconnect()})`],
    { cwd: BACKEND, env: { ...process.env }, stdio: "pipe" }).toString();
  const line = out.split("\n").find((l) => l.startsWith("RESULT"));
  return line ? JSON.parse(line.slice(6)) : { ok: false, error: "no result" };
}

const WEB = L.WEB;
const vars = {
  owner: (id) => ({ 1: "E2E15 (Harare → Bulawayo)", 2: "Your operator is in transit", 3: `${WEB}/logistics/owner/job/${id}` }),
  operator: (id) => ({ 1: "Harare → Bulawayo · 4 ton truck · tomorrow", 2: `${WEB}/logistics/driver/job/${id}` }),
  customer: (id) => ({ 1: "E2E15 (Harare → Bulawayo)", 2: "Moyo Freight · USD 120", 3: `${WEB}/logistics/jobs/${id}` }),
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

    // ── Free fleet
    L.sec("15a. Free plan: WhatsApp notifications marked ✗ on the plan card");
    const o = await A("owner", st.owner);
    await L.goto(o, "/logistics/owner/subscription", ".log-sub-plan");
    const freeRow = o.page.locator(".log-sub-plan").filter({ hasText: "Free" }).first().locator('[data-testid="plan-whatsapp"]');
    await freeRow.waitFor({ timeout: 15000 }).catch(() => {});
    L.check(/WhatsApp notifications\s*✗/.test(await freeRow.innerText().catch(() => "")), "Free card: 'WhatsApp notifications ✗'", await freeRow.innerText().catch(() => "missing"));
    L.check(/WhatsApp notifications/.test(await o.page.locator(".log-sub-plan--soon").innerText().catch(() => "")), "paid teaser lists WhatsApp notifications");
    const subApi = await L.api("GET", "/logistics/subscription", { token: st.owner.token });
    const freePlan = (subApi?.data?.plans || []).find((p) => p.id === "free");
    L.check(freePlan && freePlan.whatsapp_notifications === false, "API: Free plan whatsapp_notifications=false", freePlan);
    await L.shot(o, "s15-plan-free");

    L.sec("15b. Free plan: profile toggle locked for the owner and the operator");
    let c = await card(o);
    L.check(await c.locator("#wa-notify-switch").isDisabled(), "owner: switch disabled");
    L.check(/paid fleet plans/i.test(await c.innerText()) && (await c.locator('a[href="/logistics/owner/subscription"]').count()) === 1, "owner: 'on paid fleet plans' + See plans link");
    await L.shot(o, "s15-profile-owner-free");
    let n = await me(st.owner.token);
    L.check(n.whatsapp === true && n.whatsapp_available === false && n.whatsapp_active === false && n.whatsapp_reason === "free_plan", "/me notifications: on by default, not available on Free", n);
    const op = await A("operator", st.operator);
    c = await card(op);
    L.check(await c.locator("#wa-notify-switch").isDisabled() && /Ask your fleet owner/i.test(await c.innerText()), "operator: switch disabled + 'Ask your fleet owner'");
    await L.shot(op, "s15-profile-operator-free");

    L.sec("15c. Free plan: no WhatsApp invites (UI + API)");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    const waOpt = o.page.locator('.log-invite-via__opt[data-channel="whatsapp"]');
    await waOpt.waitFor({ timeout: 10000 }).catch(() => {});
    await o.page.waitForFunction(() => /Paid plans only/.test(document.querySelector('.log-invite-via__opt[data-channel="whatsapp"]')?.innerText || ""), null, { timeout: 10000 }).catch(() => {});
    L.check(await waOpt.locator("input").isDisabled(), "invite form: WhatsApp checkbox disabled");
    L.check(/Paid plans only/.test(await waOpt.innerText()), "invite form: 'Paid plans only — see plans'");
    await L.shot(o, "s15-invite-free");
    const inv = await L.api("POST", "/logistics/sub-user", { token: st.owner.token, body: { email: `wa15.${st.RUN}@e2e.example.com`, country_code: "+263", phone_number: "771234567", send_via: ["email", "whatsapp"] } });
    L.check(inv.success === false && inv.data?.code === "WHATSAPP_PAID_ONLY", "API refuses a WhatsApp invite on Free (WHATSAPP_PAID_ONLY)", inv.message);

    L.sec("15d. Free plan: owner and operator get no WhatsApp (in-app / push / email unchanged)");
    let t0 = now();
    let r = sendWa(st.owner._id, "job_status", vars.owner(jobId));
    L.check(!r.ok && r.error === "free_plan", "owner job update skipped (free_plan)", r);
    r = sendWa(st.operator._id, "new_job", vars.operator(jobId));
    L.check(!r.ok && r.error === "free_plan", "operator new-job alert skipped (free_plan)", r);
    L.check(outbox(t0).filter((m) => m.channel === "whatsapp").length === 0, "nothing reached Twilio");

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
    await L.goto(o, "/logistics/owner/operators/add", "form");
    await o.page.waitForFunction(() => !/Paid plans only/.test(document.querySelector('.log-invite-via__opt[data-channel="whatsapp"]')?.innerText || "x"), null, { timeout: 10000 }).catch(() => {});
    L.check(!/Paid plans only/.test(await o.page.locator('.log-invite-via__opt[data-channel="whatsapp"]').innerText()), "invite form: WhatsApp option available on Paid");
    t0 = now();
    r = sendWa(st.owner._id, "job_status", vars.owner(jobId));
    L.check(r.ok, "owner job update sent on WhatsApp", r);
    r = sendWa(st.operator._id, "new_job", vars.operator(jobId));
    L.check(r.ok, "operator new-job alert sent on WhatsApp (fleet is paid)", r);
    L.check(outbox(t0).filter((m) => m.channel === "whatsapp" && m.ok).length === 2, "2 WhatsApps in the outbox");

    L.sec("15f. Paid plan: owner switches WhatsApp OFF in the profile → no WhatsApp");
    c = await card(o);
    L.check(await flip(o, c, false), "toast: WhatsApp notifications off");
    n = await me(st.owner.token);
    L.check(n.whatsapp === false && n.whatsapp_reason === "opted_out", "/me: whatsapp=false (opted_out)", n);
    await L.shot(o, "s15-profile-owner-off");
    t0 = now();
    r = sendWa(st.owner._id, "job_status", vars.owner(jobId));
    L.check(!r.ok && r.error === "opted_out", "owner job update skipped (opted_out)", r);
    r = sendWa(st.operator._id, "new_job", vars.operator(jobId));
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
