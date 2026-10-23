/* Stage 16 — Tasker forgot password (v2.7.51), in the browser on the mocked API.
   The phone is never shown or sent in full (masked "••• ••• 123"), the first step sends no
   code, the code arrives by email / WhatsApp (captured in outbox.jsonl — open the Outbox viewer),
   resetPass only works after the code was verified (once, within 10 minutes), and codes go to
   the stored number even if the request names another one. Own throwaway users; no state needed. */
const L = require("./lib");
const fs = require("fs");
const path = require("path");

const OUTBOX = process.env.MOCK_OUTBOX || path.join(__dirname, "outbox.jsonl");
const BACKEND = path.resolve(__dirname, "../../../sibmba-tasker-backend");
const now = () => new Date().toISOString();
const outbox = (since) =>
  fs.existsSync(OUTBOX)
    ? fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ts >= since)
    : [];
async function waitMsg(since, pred, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const hit = outbox(since).filter(pred);
    if (hit.length) return hit;
    await new Promise((r) => setTimeout(r, 400));
  }
  return [];
}
const forgot = (body) => L.api("POST", "/customer/auth/forgotPass", { body });
const reset = (id, password) => L.api("POST", "/customer/auth/resetPass", { body: { id: String(id), password } });
const verify = (id, otp, type) => L.api("POST", "/customer/auth/verifyOtp", { body: { user_id: String(id), otp, type } });
const NEW_PASS = "NewPassw0rd!9";

async function typeOtp(a, otp) {
  await a.page.locator(".set-otp input").nth(3).waitFor({ timeout: 15000 });
  const inputs = a.page.locator(".set-otp input");
  for (let i = 0; i < 4; i++) await inputs.nth(i).fill(otp[i]);
  await a.page.locator('button[type="submit"]', { hasText: /verify/i }).click();
}

async function openPicker(a, email) {
  await L.goto(a, "/forgot-password", "form");
  await a.page.fill("#email", email);
  const resp = a.page.waitForResponse((r) => /\/customer\/auth\/forgotPass/.test(r.url()), { timeout: 15000 });
  await a.page.getByRole("button", { name: /Send reset code/i }).click();
  const body = await (await resp).json().catch(() => ({}));
  await a.page.locator(".otp-selection-modal").waitFor({ timeout: 10000 });
  return body;
}

async function resetInUi(a, password) {
  await a.page.waitForURL(/reset-password/, { timeout: 15000 });
  await a.page.fill('input[name="password"]', password);
  await a.page.fill('input[name="confirmPassword"]', password);
  await a.page.locator('button[type="submit"]').first().click();
  await a.page.waitForURL(/\/login/, { timeout: 15000 });
}

async function passwordIs(User, id, pass) {
  const u = await User.findById(id).select("+password");
  return u.checkPass(pass);
}

(async () => {
  const RUN = Date.now().toString(36).slice(-6);
  const d = await L.db();
  const { User } = require(path.join(BACKEND, "src/models"));
  const actors = [];
  const A = async (n) => { const a = await L.actor(n); actors.push(a); return a; };
  const made = [];
  try {
    // Throwaway accounts: a corporate (like corpotest11) and a customer, each with a phone
    const corp = await L.makeCustomer(`fp.corp.${RUN}`, 3);
    const cust = await L.makeCustomer(`fp.cust.${RUN}`, 1);
    made.push(corp._id, cust._id);
    const corpPhone = `48${String(Date.now()).slice(-7)}`;
    const custPhone = `77${String(Date.now() + 3).slice(-7)}`;
    await d.collection("users").updateOne({ _id: new L.mongoose.Types.ObjectId(corp._id) }, { $set: { phone_number: corpPhone, country_code: "+263", status: 1 } });
    await d.collection("users").updateOne({ _id: new L.mongoose.Types.ObjectId(cust._id) }, { $set: { phone_number: custPhone, country_code: "+263", status: 1 } });

    // ── 1. Channel picker
    L.sec("16a. Forgot password → channel picker shows a masked phone, sends nothing");
    const a = await A("forgot-corporate");
    let t0 = now();
    const pick = await openPicker(a, corp.email);
    const modal = (await a.page.locator(".otp-selection-modal").innerText()).replace(/\s+/g, " ");
    L.check(!modal.includes(corpPhone) && !(await L.bodyText(a)).includes(corpPhone), "full phone NOT on the page", modal);
    L.check(modal.includes(`••• ••• ${corpPhone.slice(-3)}`), `masked phone shown (••• ••• ${corpPhone.slice(-3)})`);
    L.check(!JSON.stringify(pick).includes(corpPhone), "full phone NOT in the API response", pick?.data);
    L.check(pick?.data?.phone_masked && pick.data.has_phone === true && !("address" in (pick.data || {})) && !("full_name" in (pick.data || {})), "response carries only id / email / masked phone / channels", Object.keys(pick?.data || {}));
    L.check(outbox(t0).length === 0, "lookup step sends no code");
    await L.shot(a, "s16-picker-masked");

    // ── 2. Email path in the browser
    L.sec("16b. Email code (captured — see the Outbox viewer) → wrong code refused → right code → new password");
    t0 = now();
    await a.page.locator(".otp-option-card", { hasText: "Email" }).click();
    await a.page.getByRole("button", { name: "Next" }).click();
    await a.page.waitForURL(/otp-varification/, { timeout: 15000 });
    const [mail] = await waitMsg(t0, (r) => r.channel === "email" && r.to === corp.email);
    L.check(mail?.ok && /Verify Your/.test(mail.subject), `reset email sent ("${mail?.subject}")`);
    const code = (String(mail?.html || "").match(/href="#">\s*(\d{4})\s*<\/a>/) || [])[1];
    L.check(/^\d{4}$/.test(code || ""), "4-digit code read from the email");
    L.check(outbox(t0).filter((r) => r.to === corp.email).length === 1, "exactly one email (no extra code from the lookup step)");
    // resetPass before verifying = the old takeover path
    const early = await reset(corp._id, "Hacked123!x");
    L.check(early.success === false && early.data?.code === "RESET_NOT_VERIFIED", "resetPass without a verified code → refused (RESET_NOT_VERIFIED)", early.message);
    L.check(await passwordIs(User, corp._id, "Passw0rd!"), "password unchanged by that call");
    const wrong = code === "1234" ? "4321" : "1234";
    await typeOtp(a, wrong);
    L.check(await L.waitText(a, /Invalid OTP/i), "wrong code → 'Invalid OTP'");
    await L.shot(a, "s16-otp-wrong");
    await a.page.locator(".set-otp input").first().fill("");
    await typeOtp(a, code);
    await resetInUi(a, NEW_PASS);
    L.check(true, "verified → reset page → saved → back to login");
    L.check(await passwordIs(User, corp._id, NEW_PASS) && !(await passwordIs(User, corp._id, "Passw0rd!")), "new password works, old one doesn't");
    const after = await d.collection("users").findOne({ _id: new L.mongoose.Types.ObjectId(corp._id) });
    L.check(!after.password_reset?.verified_until && !after.email_otp && !after.phone_otp, "reset window + codes cleared after use");
    const again = await reset(corp._id, "Again123!x");
    L.check(again.success === false && again.data?.code === "RESET_NOT_VERIFIED", "second reset with the same window → refused");

    // ── 3. WhatsApp path (customer) + stored number only
    L.sec("16c. WhatsApp code goes to the account's own number — never to a number in the request");
    const b = await A("forgot-customer");
    await openPicker(b, cust.email);
    t0 = now();
    await b.page.locator(".otp-option-card", { hasText: "Phone Number" }).click();
    await b.page.getByRole("button", { name: "Next" }).click();
    await b.page.waitForURL(/otp-varification/, { timeout: 15000 });
    const [wa] = await waitMsg(t0, (r) => r.channel === "whatsapp");
    L.check(wa?.ok && wa.to === `+263${custPhone}` && wa.template === "otp", `WhatsApp OTP template to the stored number (${wa?.to})`);
    await typeOtp(b, String(wa?.variables?.["1"] || ""));
    await resetInUi(b, NEW_PASS);
    L.check(await passwordIs(User, cust._id, NEW_PASS), "customer password changed via the WhatsApp code");
    await L.goto(b, "/login", "form");
    await b.page.fill('input[placeholder="Enter your email"]', cust.email);
    await b.page.fill('input[placeholder="Enter your password"]', NEW_PASS);
    await b.page.locator('button[type="submit"]').click();
    await b.page.waitForURL((u) => !/\/login/.test(String(u)), { timeout: 15000 }).then(() => L.check(true, "customer logs in with the new password")).catch(async () => L.check(false, "customer logs in with the new password", (await L.bodyText(b)).slice(0, 200)));
    await L.shot(b, "s16-customer-logged-in");
    t0 = now();
    const spoof = await forgot({ email: cust.email, type: 3, country_code: "+263", phone_number: "719990001" });
    const spoofMsgs = await waitMsg(t0, (r) => r.channel === "whatsapp", 6000);
    L.check(spoof.success !== false && spoofMsgs.length === 1 && spoofMsgs[0].to === `+263${custPhone}`, "request naming another number → still sent to the stored number", spoofMsgs.map((m) => m.to));
    L.check(!JSON.stringify(spoof).includes(custPhone), "full phone not in that response either");

    // ── 4. API edge cases
    L.sec("16d. API checks");
    const inj = await forgot({ email: { $ne: null }, type: 1 });
    L.check(inj.success === false, "object as email → refused (no lookup)", inj.message);
    await forgot({ email: cust.email, type: 1 });
    await d.collection("users").updateOne({ _id: new L.mongoose.Types.ObjectId(cust._id) }, { $set: { "password_reset.requested_at": new Date(Date.now() - 31 * 60 * 1000) } });
    const u2 = await User.findById(cust._id).select("+email_otp");
    const late = await verify(cust._id, String(u2.email_otp), 1);
    const lateReset = await reset(cust._id, "Late123!xx");
    L.check(late.success !== false && lateReset.success === false, "code verified >30 min after the request doesn't allow a reset", lateReset.message);
    await forgot({ email: cust.email, type: 1 });
    const u3 = await User.findById(cust._id).select("+email_otp");
    await verify(cust._id, String(u3.email_otp), 1);
    await d.collection("users").updateOne({ _id: new L.mongoose.Types.ObjectId(cust._id) }, { $set: { "password_reset.verified_until": new Date(Date.now() - 1000) } });
    const expired = await reset(cust._id, "Expired123!x");
    L.check(expired.success === false && expired.data?.code === "RESET_NOT_VERIFIED", "reset after the 10-minute window → refused");
    const raw = await d.collection("users").findOne({ _id: new L.mongoose.Types.ObjectId(cust._id) }, { projection: { email_otp: 1, phone_otp: 1, whatsapp_otp: 1, password_reset: 1 } });
    L.check(raw && "password_reset" in raw, "codes + reset window live on the users document (users.email_otp / phone_otp / whatsapp_otp / password_reset)", Object.keys(raw || {}));
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s16-crash");
  } finally {
    if (made.length) await d.collection("users").deleteMany({ _id: { $in: made.map((x) => new L.mongoose.Types.ObjectId(x)) }, email: /@e2e\.example\.com$/ }).catch(() => {});
  }
  for (const x of actors) {
    L.check(x.errors.length === 0, `${x.name}: no page/console errors`, x.errors.slice(0, 4));
    L.check(x.apiFails.length === 0, `${x.name}: no 5xx`, x.apiFails);
  }
  await L.done();
})();
