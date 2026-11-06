/* Stage 9 — email / SMS / WhatsApp flows end to end through the browser.
   The test API runs with scripts/e2e/mock-providers.js, so SendGrid + Twilio calls land in
   outbox.jsonl (validated against scripts/logistics-wa-templates.json). OTPs and links are
   read from the captured messages — never from the DB — exactly as a real user would. */
const L = require("./lib");
const CC = L.cast("x").CC;
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const OUTBOX = process.env.MOCK_OUTBOX || path.join(__dirname, "outbox.jsonl");
const BACKEND = path.resolve(__dirname, "../../../sibmba-tasker-backend");

function outbox(since) {
  if (!fs.existsSync(OUTBOX)) return [];
  return fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ts >= since);
}
async function waitMsg(since, pred, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const hit = outbox(since).filter(pred);
    if (hit.length) return hit;
    await new Promise((r) => setTimeout(r, 400));
  }
  return [];
}
const now = () => new Date().toISOString();
const text = (html) => String(html || "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
const hrefs = (html) => [...String(html || "").matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));

async function typeOtp(a, otp) {
  // Wait for the OTP boxes: counting before they render put the whole code in one box
  await a.page.locator(".set-otp input").nth(otp.length - 1).waitFor({ timeout: 15000 }).catch(() => {});
  const inputs = a.page.locator(".set-otp input");
  const n = await inputs.count();
  if (n >= otp.length) for (let i = 0; i < otp.length; i++) await inputs.nth(i).fill(otp[i]);
  else await inputs.first().fill(otp);
  await a.page.locator('button[type="submit"]').click();
}

/** Copy a generated document into the API's public docs folder → stored url (for rows inserted straight into the DB). */
function seedDocFile(src) {
  const dir = path.join(BACKEND, "public/logistics/assets/docs");
  fs.mkdirSync(dir, { recursive: true });
  const name = `${Date.now()}--${path.basename(src)}`;
  fs.copyFileSync(src, path.join(dir, name));
  return `/logistics/assets/docs/${name}`;
}

async function signupOwner(a, { name, company, email, phone, channel }) {
  const p = a.page;
  await L.goto(a, "/sign-up?role=logistics", "form");
  await p.getByRole("button", { name: "Equipment Owner" }).click();
  await p.fill("#full_name", name);
  await p.fill("#company_name", company);
  await p.fill("#email", email);
  await L.typePhone(p.locator("#phone"), CC, phone);
  await p.fill('input[name="password"]', "Passw0rd!");
  await p.fill('input[name="confirmPassword"]', "Passw0rd!");
  await p.check('input[name="terms"]');
  // 29 Oct 2026: business documents (registration certificate + owner ID) go with the sign-up
  await L.fillSignupBusinessDocs(p, { name, company });
  await p.locator('form button[type="submit"]').click();
  await p.locator(".modal").getByText(channel === "whatsapp" ? "Phone Number" : "Email", { exact: true }).first().click({ timeout: 10000 });
  await p.locator(".modal button", { hasText: /next|continue|send/i }).last().click();
}

(async () => {
  const RUN = Date.now().toString(36).slice(-6);
  const st = { RUN };
  // People come from the main run's cast (s9 slots), so names never clash with other stages
  const C = L.cast(L.loadState().RUN || RUN);
  // CC lives at module scope (used by helpers above)
  const own = [0, 1, 2].map((k) => C.slot("owner", "s9", k));
  const ops = [0, 1, 2].map((k) => C.slot("operator", "s9", k));
  const extra = [0, 1, 2, 3].map((k) => C.slot("operator", "misc", k));
  const failNo = (k) => `71999${String(Date.now() + k).slice(-4)}`; // +263 71999… → MOCK_FAIL_TO
  const waFailNo = () => `71888${String(Date.now()).slice(-4)}`;    // +263 71888… → MOCK_FAIL_WA_TO
  const START = now();
  const d = await L.db();
  const actors = [];
  const A = async (n) => { const a = await L.actor(n); actors.push(a); return a; };
  const SENDER = process.env.E2E_SEND_GRID_SENDER || "simbatasker.noreply@yopmail.com";
  try {
    L.check(fs.existsSync(OUTBOX) || true, `outbox: ${OUTBOX}`);

    // ── 1. Email OTP
    L.sec("9. Owner sign-up with EMAIL OTP — code read from the captured email");
    const o = await A("owner-email");
    const ownerEmail = own[0].email;
    const ownerPhone = own[0].phone;
    let t0 = now();
    await signupOwner(o, { name: own[0].name, company: own[0].company, email: ownerEmail, phone: ownerPhone, channel: "email" });
    await o.page.waitForURL(/otp/i, { timeout: 15000 });
    let [mail] = await waitMsg(t0, (r) => r.channel === "email" && r.to === ownerEmail);
    L.check(mail && mail.ok, "OTP email handed to SendGrid", mail);
    if (!mail) throw new Error("no OTP email captured — is the API running with mock-providers?");
    L.check(mail.from === SENDER, `from = SEND_GRID_SENDER (${mail.from})`);
    L.check(/otp|verif/i.test(mail.subject + text(mail.html)), `subject/body is an OTP mail ("${mail.subject}")`);
    const codes = (text(mail.html).match(/OTP\s*(\d{4,6})\b/i) || []).slice(1);
    L.check(codes.length >= 1, "email contains a 4–6 digit code", codes);
    await typeOtp(o, codes[0]);
    await o.page.waitForURL(/\/logistics\/owner/, { timeout: 20000 }).then(() => L.check(true, "code from email verifies → owner dashboard")).catch(async () => L.check(false, "code from email verifies → owner dashboard", (await L.bodyText(o)).slice(0, 200)));
    const ownerUser = await d.collection("users").findOne({ email: ownerEmail });
    st.owner = { _id: String(ownerUser._id), email: ownerEmail, role: 4, token: await o.page.evaluate(() => localStorage.getItem("token")) };
    // v2.7.49: new companies start Pending — approve so the fleet can work
    L.check((await L.approveOwner(st.owner._id))?.data?.approval?.status === "approved", "admin approves the new company");
    // v2.7.50: WhatsApp (invites, reminders) is a paid-plan feature — this stage tests WhatsApp delivery
    await L.setPlan(st.owner._id, "paid");

    // ── 2. WhatsApp OTP
    L.sec("9b. Owner sign-up with WHATSAPP OTP — code read from the captured template message");
    const w = await A("owner-wa");
    const waEmail = own[1].email;
    const waPhone = own[1].phone;
    t0 = now();
    await signupOwner(w, { name: own[1].name, company: own[1].company, email: waEmail, phone: waPhone, channel: "whatsapp" });
    await w.page.waitForURL(/otp/i, { timeout: 15000 });
    let [wa] = await waitMsg(t0, (r) => r.channel === "whatsapp" && r.to === `${CC}${waPhone}`);
    L.check(wa && wa.ok, "WhatsApp OTP accepted by Twilio mock (template + variables valid)", wa);
    L.check(wa && wa.template === "otp" && wa.contentSid === (process.env.LOGISTICS_WA_OTP_TEMPLATE_SID || "HX4dd070aecb3df506b7945b907dd874fe"), "uses the approved OTP template SID", wa && wa.contentSid);
    // Simba's own WhatsApp sender number (Zimbabwe) — same country as the test cast
    L.check(wa && /^whatsapp:\+263/.test(wa.from || ""), `sent from the WhatsApp sender (${wa && wa.from})`);
    await typeOtp(w, String(wa.variables["1"]));
    await w.page.waitForURL(/\/logistics\/owner/, { timeout: 20000 }).then(() => L.check(true, "code from WhatsApp verifies → owner dashboard")).catch(async () => L.check(false, "code from WhatsApp verifies → owner dashboard", (await L.bodyText(w)).slice(0, 200)));
    // 29 Oct 2026: the second company must be approved before it can invite operators (9d2)
    {
      const wUser = await d.collection("users").findOne({ email: waEmail }, { projection: { logistics_business_documents: 1 } });
      L.check((wUser?.logistics_business_documents || []).length >= 2, "sign-up stored the business documents", (wUser?.logistics_business_documents || []).map((x) => x.type));
      L.check((await L.approveOwner(String(wUser?._id)))?.data?.approval?.status === "approved", "admin approves the second company");
    }

    L.sec("9c. WhatsApp OTP failure shows a clear error");
    const wf = await A("owner-wa-fail");
    t0 = now();
    await signupOwner(wf, { name: own[2].name, company: own[2].company, email: own[2].email, phone: failNo(0), channel: "whatsapp" });
    L.check(await L.waitText(wf, /Couldn't send the WhatsApp code/i), "UI: 'Couldn't send the WhatsApp code — check the number or choose Email'", (await L.bodyText(wf)).slice(0, 200));
    [wa] = await waitMsg(t0, (r) => r.channel === "whatsapp" && /^\+26371999/.test(r.to));
    L.check(wa && !wa.ok, "failed send recorded (provider error surfaced)", wa && wa.error);

    // ── 3. Operator invite: owner picks the channels (default email + WhatsApp)
    L.sec("9d. Owner invites operator — default Email + WhatsApp captured, link from email activates");
    const opEmail = ops[0].email;
    const opPhone = ops[0].phone;
    await L.goto(o, "/logistics/owner/operators/add", "form");
    await o.page.fill('input[placeholder="Full name"]', ops[0].name);
    await o.page.fill('input[placeholder="name@example.com"]', opEmail);
    const ph = o.page.locator("#op-phone, .log-field:has(#op-phone) input[type=tel]").first();
    await L.typePhone(ph, CC, opPhone);
    await L.addFacePhoto(o.page, 2);
    t0 = now();
    await o.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /Invite sent by email and WhatsApp\./), "UI toast: 'Invite sent by email and WhatsApp'", (await L.bodyText(o)).match(/Invite[^.]*\./)?.[0]);
    const msgs = await waitMsg(t0, (r) => r.to === opEmail || r.to === `${CC}${opPhone}`, 8000);
    const im = msgs.find((r) => r.channel === "email"), is = msgs.find((r) => r.channel === "sms"), iw = msgs.find((r) => r.channel === "whatsapp");
    L.check(im?.ok && /invited you/i.test(im.subject), `invite email (${im?.subject})`);
    L.check(!is, "no SMS — WhatsApp delivered, owner didn't pick SMS", is?.body);
    L.check(iw?.ok && iw.template === "invite", "invite WhatsApp template accepted (vars match approved body)", iw?.error || iw?.body);
    const link = hrefs(im?.html).find((h) => /\/logistics\/invite\?token=/.test(h));
    L.check(link && link.startsWith(L.WEB), `email 'Accept invite' button → ${link}`);
    const tok = (u) => (String(u || "").match(/token=([\w-]+)/) || [])[1];
    L.check(tok(link) && tok(link) === tok(iw?.variables?.["2"]), "email and WhatsApp carry the same invite link");
    const op = await A("operator-mail");
    await op.page.goto(link, { waitUntil: "domcontentloaded" });
    await op.page.waitForSelector("#invite-password", { timeout: 15000 });
    await op.page.fill("#invite-password", "Passw0rd!");
    await op.page.fill("#invite-password-confirm", "Passw0rd!");
    await op.page.locator('button[type="submit"]').click();
    await op.page.waitForURL(/\/logistics\/driver/, { timeout: 20000, waitUntil: "commit" }).then(() => L.check(true, "link from email activates operator → /logistics/driver")).catch(async () => L.check(false, "link from email activates operator", (await L.bodyText(op)).slice(0, 200)));
    const opUser = await d.collection("users").findOne({ email: opEmail });
    st.operator = { _id: String(opUser?._id), email: opEmail, phone: opPhone };

    L.sec("9d2. Invite channel checks + WhatsApp → SMS fallback");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    await o.page.fill('input[placeholder="name@example.com"]', extra[0].email);
    const waBox = o.page.locator(".log-invite-via__opt", { hasText: "WhatsApp" });
    L.check((await waBox.locator("input").isDisabled()) && /Add a phone number first/.test(await waBox.innerText()), "no phone → WhatsApp unavailable ('Add a phone number first')");
    await L.setInviteVia(o.page, []);
    L.check(await L.waitText(o, /Pick at least one/), "nothing ticked → 'Pick at least one'");
    await o.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /Tick Email, or add a phone number to send the invite on WhatsApp/), "send blocked: 'Tick Email, or add a phone number…'");
    await L.shot(o, "s9-invite-via");
    // second owner (free seats): API check + WhatsApp only, number not on WhatsApp → same link by SMS
    const wToken = await w.page.evaluate(() => localStorage.getItem("token"));
    await L.setPlan((await d.collection("users").findOne({ email: waEmail }))._id, "paid");
    const apiNoVia = await L.api("POST", "/logistics/sub-user", { token: wToken, body: { email: extra[1].email, send_via: ["whatsapp"] } });
    L.check(apiNoVia.success === false && apiNoVia.data?.code === "INVITE_CHANNEL", "API refuses WhatsApp-only invite without a phone (INVITE_CHANNEL)", apiNoVia.message);
    const waOnlyEmail = ops[1].email;
    const waOnlyPhone = waFailNo();
    await L.goto(w, "/logistics/owner/operators/add", "form");
    await w.page.fill('input[placeholder="Full name"]', ops[1].name);
    await w.page.fill('input[placeholder="name@example.com"]', waOnlyEmail);
    const ph3 = w.page.locator("#op-phone, .log-field:has(#op-phone) input[type=tel]").first();
    await L.typePhone(ph3, CC, waOnlyPhone);
    await L.setInviteVia(w.page, ["whatsapp"]);
    await L.addFacePhoto(w.page, 3);
    t0 = now();
    await w.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(w, /Invite sent by SMS \(WhatsApp wasn't available, so the link went by SMS\)/), "UI toast: WhatsApp unavailable → sent by SMS", (await L.bodyText(w)).match(/Invite[^.]*\./)?.[0]);
    const fb = await waitMsg(t0, (r) => r.to === waOnlyEmail || r.to === `${CC}${waOnlyPhone}`, 8000);
    L.check(fb.some((r) => r.channel === "whatsapp" && !r.ok) && fb.some((r) => r.channel === "sms" && r.ok && /invite\?token=/.test(r.body)), "WhatsApp failed, SMS fallback carries the link");
    L.check(!fb.some((r) => r.channel === "email"), "no email — owner picked WhatsApp only");

    L.sec("9e. Resend invite — new link sent, old link no longer works");
    const op2Email = ops[2].email;
    await L.goto(o, "/logistics/owner/operators/add", "form");
    await o.page.fill('input[placeholder="name@example.com"]', op2Email);
    await L.setInviteVia(o.page, ["email"]);
    await L.addFacePhoto(o.page, 4);
    t0 = now();
    await o.page.locator('form button[type="submit"]').last().click();
    let [first] = await waitMsg(t0, (r) => r.channel === "email" && r.to === op2Email);
    const oldLink = hrefs(first?.html).find((h) => /invite\?token=/.test(h));
    await L.goto(o, "/logistics/owner/operators");
    await o.page.locator('select[aria-label="Show active or invites"]').selectOption({ index: 1 }).catch(() => {});
    await o.page.waitForTimeout(1200);
    const row = o.page.locator("tr, li, .log-card").filter({ hasText: op2Email }).first();
    t0 = now();
    await row.getByRole("button", { name: /^Resend/ }).click();
    L.check(await L.waitText(o, /Invite resent by email — valid/), "UI toast: 'Invite resent by email … valid for 7 more days' (email-only pick kept)");
    const [second] = await waitMsg(t0, (r) => r.channel === "email" && r.to === op2Email);
    const newLink = hrefs(second?.html).find((h) => /invite\?token=/.test(h));
    L.check(newLink && tok(newLink) !== tok(oldLink), "resent email has a NEW token");
    const op2 = await A("operator-old-link");
    await op2.page.goto(oldLink, { waitUntil: "domcontentloaded" });
    await op2.page.waitForTimeout(2500);
    L.check((await op2.page.locator("#invite-password").count()) === 0 && /expired|invalid|no longer|not found/i.test(await L.bodyText(op2)), "old link shows invalid/expired", (await L.bodyText(op2)).slice(0, 160));
    await L.shot(op2, "s9-old-invite-link");

    L.sec("9f. Invite with every channel failing → owner told to copy the link");
    await L.goto(w, "/logistics/owner/operators/add", "form");
    await w.page.fill('input[placeholder="Full name"]', extra[2].name);
    await w.page.fill('input[placeholder="name@example.com"]', `fail.${extra[2].email}`); // fail.* → MOCK_FAIL_TO (email)
    const ph2 = w.page.locator("#op-phone, .log-field:has(#op-phone) input[type=tel]").first();
    await L.typePhone(ph2, CC, failNo(1));
    await L.addFacePhoto(w.page, 5);
    await w.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(w, /couldn't be sent — copy the link/), "UI: 'Invite created, but it couldn't be sent — copy the link'");

    // ── 4. SOS fan-out
    L.sec("9g. Customer SOS → emergency contact gets email + SMS + WhatsApp, admin gets email");
    const cust = await L.makeCustomer(`mail.cust.${RUN}`);
    const c = await A("customer-mail");
    await L.seedAuth(c, { token: cust.token, user: cust });
    await L.goto(c, "/logistics/emergency-contacts", "form");
    // Emergency contact: the customer's sister
    const sister = { name: `Chiedza ${cust.name.split(" ").slice(-1)[0]}`, email: `chiedza.${cust.email.split("@")[0].split(".").slice(-1)[0]}@yopmail.com` };
    const contactEmail = sister.email;
    const contactPhone = C.phone("s9.sos.contact");
    await c.page.fill('input[placeholder="e.g. Rudo Moyo"]', sister.name);
    await c.page.fill('input[placeholder="e.g. Spouse, brother"]', "Sister");
    const cph = c.page.locator("form input[type=tel]").first();
    await L.typePhone(cph, CC, contactPhone);
    await c.page.fill('input[placeholder="name@example.com"]', contactEmail);
    await c.page.getByRole("button", { name: "Save contacts" }).click();
    await L.waitText(c, /saved/i);
    await L.goto(c, "/logistics");
    t0 = now();
    await c.page.locator('[aria-haspopup="true"]:visible').last().click();
    await c.page.locator("button.log-sos-menu-item").click();
    await c.page.waitForSelector(".log-sos-hold", { timeout: 10000 });
    const box = await c.page.locator(".log-sos-hold").boundingBox();
    await c.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await c.page.mouse.down(); await c.page.waitForTimeout(3600); await c.page.mouse.up();
    const sos = await waitMsg(t0, (r) => [contactEmail, `${CC}${contactPhone}`, process.env.E2E_ADMIN_EMAIL || "simba.sosdesk@yopmail.com"].includes(r.to), 10000);
    await new Promise((r) => setTimeout(r, 1500));
    const all = outbox(t0).filter((r) => [contactEmail, `${CC}${contactPhone}`, process.env.E2E_ADMIN_EMAIL || "simba.sosdesk@yopmail.com"].includes(r.to));
    const se = all.find((r) => r.channel === "email" && r.to === contactEmail);
    const ss = all.find((r) => r.channel === "sms");
    const sw = all.find((r) => r.channel === "whatsapp");
    const sa = all.find((r) => r.channel === "email" && r.to !== contactEmail);
    L.check(se?.ok && /SOS/i.test(se.subject), `contact email (${se?.subject})`);
    L.check(se && /maps\.google|google\.com\/maps|location/i.test(text(se.html)), "contact email includes location");
    L.check(ss?.ok && /SOS/i.test(ss.body), "contact SMS", ss?.body?.slice(0, 120));
    L.check(sw?.ok && sw.template === "sos" && /maps/.test(sw.variables["2"]), "contact WhatsApp SOS template (name + maps link)", sw?.error || sw?.variables);
    L.check(sa?.ok, "admin alert email (LOGISTICS_ADMIN_ALERT_EMAILS)", sa?.to);
    L.check(sos.length > 0, "SOS messages captured");
    L.check(/sent|alerted/i.test(await L.bodyText(c)), "SOS sent confirmation in UI");

    // ── 5. Document-expiry WhatsApp (scheduler, scoped to this owner)
    L.sec("9h. Document expiry reminder → WhatsApp template to owner + operator");
    const { ObjectId } = L.mongoose.Types;
    const inDays = (n) => new Date(Date.now() + n * 86400000);
    const tipper = C.unit("truck", 90);
    const insFile = await L.docFile("insurance", { owner: own[0].company, plate: tipper.plate, make: tipper.make, model: tipper.model, year: tipper.year, expires: inDays(7) });
    await d.collection("logistics_assets").insertOne({
      owner_id: new ObjectId(st.owner._id), kind: "vehicle", category: "logistic", name: tipper.name, registration: tipper.plate,
      make: tipper.make, model: tipper.model, year: tipper.year,
      is_active: 1, is_deleted: 0, assigned_sub_user_ids: [new ObjectId(st.operator._id)],
      photos: (await L.photoFixtures(tipper)).map(seedDocFile),
      documents: [{ type: "insurance", name: path.basename(insFile), url: seedDocFile(insFile), expires: inDays(7) }], createdAt: new Date(), updatedAt: new Date(),
    });
    t0 = now();
    execFileSync(process.execPath, ["-r", path.join(BACKEND, "scripts/e2e/mock-providers.js"), "-e",
      `require("dotenv").config();const m=require("mongoose");m.connect(process.env.DB_URL).then(async()=>{const s=require("./src/utils/logistics/documentExpiryScheduler");console.log(JSON.stringify(await s.processLogisticsDocumentExpiry({ownerIds:[${JSON.stringify(st.owner._id)}]})));await m.disconnect()})`],
      { cwd: BACKEND, env: { ...process.env }, stdio: "pipe" });
    const de = outbox(t0).filter((r) => r.channel === "whatsapp" && r.template === "doc_expiry");
    L.check(de.some((r) => r.ok && r.to === `${CC}${ownerPhone}`), "owner got doc-expiry WhatsApp", de.map((r) => r.to + " " + (r.error || "")));
    L.check(de.some((r) => r.ok && r.to === `${CC}${opPhone}`), "operator got doc-expiry WhatsApp");
    L.check(de.every((r) => r.ok && /^expires in \d+ days?$|^expires today$|^expired$/.test(r.variables["3"])), "vars valid (status text matches template check)", de[0]?.body);
    const strangers = de.filter((r) => ![`${CC}${ownerPhone}`, `${CC}${opPhone}`].includes(r.to));
    L.check(strangers.length === 0, "scoped run (ownerIds) messages ONLY this owner's team", strangers.map((r) => `${r.to}: ${r.variables["1"]}`));
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s9-crash");
  }
  for (const x of actors) {
    L.check(x.errors.length === 0, `${x.name}: no page/console errors`, x.errors.slice(0, 4));
    L.check(x.apiFails.filter((f) => !/\/auth\/register/.test(f)).length === 0, `${x.name}: no unexpected 5xx`, x.apiFails);
  }
  const bad = outbox(START).filter((r) => !r.ok && !/MOCK_FAIL_TO|MOCK_FAIL_WA_TO/.test(r.error || ""));
  L.check(bad.length === 0, "no provider rejections in outbox (bad template vars / numbers)", bad.slice(0, 5).map((r) => `${r.channel} ${r.to} ${r.error}`));
  await L.done();
})();
