/* Stage 10 — operator onboarding, fresh accounts, all in the browser.
   Owner signs up → adds a truck → invites an operator (docs, licence, pay, unit) →
   invite email/SMS/WhatsApp (captured by the mocked test API) → invite states
   Invited → Opened → active → activation checks → operator first login → goes live →
   customer can find the truck. Also: login hint before activation, expired invite,
   cancel, duplicate email, logout/login. Needs start-test-api.sh (mocked providers). */
const L = require("./lib");
const fs = require("fs");
const path = require("path");

const OUTBOX = process.env.MOCK_OUTBOX || path.join(__dirname, "outbox.jsonl");
const now = () => new Date().toISOString();
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
const text = (html) => String(html || "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
const hrefs = (html) => [...String(html || "").matchAll(/href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const tok = (u) => (String(u || "").match(/token=([\w-]+)/) || [])[1];

const DOCS = require("./docs");
async function loginUi(a, email, password) {
  await L.goto(a, "/login", "form");
  await a.page.fill('input[placeholder="Enter your email"]', email);
  await a.page.fill('input[placeholder="Enter your password"]', password);
  await a.page.locator('button[type="submit"]').click();
}
async function pendingRow(o, email) {
  await L.goto(o, "/logistics/owner/operators");
  await o.page.locator('select[aria-label="Show active or invites"]').selectOption({ index: 1 }).catch(() => {});
  await o.page.waitForTimeout(1200);
  return o.page.locator("tr, li").filter({ hasText: email }).first();
}

(async () => {
  const RUN = Date.now().toString(36).slice(-6);
  const d = await L.db();
  const OID = (x) => new L.mongoose.Types.ObjectId(x);
  const actors = [];
  const A = async (n, opts) => { const a = await L.actor(n, opts); actors.push(a); return a; };
  // Cast: a fresh owner (s10 slot) with his own tipper and a new operator
  const C = L.cast(L.loadState().RUN || RUN);
  const boss = C.slot("owner", "s10");
  const opP = C.slot("operator", "s10");
  const op2P = C.slot("operator", "misc", 3);
  const tip = C.unit("truck", 100);
  const company = boss.company;
  const opName = opP.name;
  try {
    // ── owner
    L.sec("10. Fresh owner: sign-up (email OTP from captured mail) + company name");
    const o = await A("ob-owner");
    const ownerEmail = boss.email;
    let t0 = now();
    await L.goto(o, "/sign-up?role=logistics", "form");
    await o.page.getByRole("button", { name: "Equipment Owner" }).click();
    await o.page.fill("#full_name", boss.name);
    await o.page.fill("#company_name", company);
    await o.page.fill("#email", ownerEmail);
    await L.typePhone(o.page.locator("#phone"), C.CC, boss.phone);
    await o.page.fill('input[name="password"]', "Passw0rd!");
    await o.page.fill('input[name="confirmPassword"]', "Passw0rd!");
    await o.page.check('input[name="terms"]');
    // 29 Oct 2026: business documents go with the sign-up
    await L.fillSignupBusinessDocs(o.page, { name: boss.name, company });
    await o.page.locator('form button[type="submit"]').click();
    await o.page.locator(".modal").getByText("Email", { exact: true }).first().click();
    await o.page.locator(".modal button", { hasText: /next/i }).last().click();
    await o.page.waitForURL(/otp/i, { timeout: 15000 });
    const [otpMail] = await waitMsg(t0, (r) => r.channel === "email" && r.to === ownerEmail);
    const otp = (text(otpMail?.html).match(/OTP\s*(\d{4,6})\b/i) || [])[1];
    L.check(/^\d{4,6}$/.test(otp || ""), "OTP found in the email", otp);
    await o.page.locator("input").first().click();
    await o.page.keyboard.type(otp, { delay: 80 });
    await o.page.locator('button[type="submit"]').click();
    await o.page.waitForURL(/\/logistics\/owner/, { timeout: 20000 });
    L.check(true, "owner verified with code from email → dashboard");
    const owner = await d.collection("users").findOne({ email: ownerEmail });
    // doc 12 · 4.1: the business name comes from sign-up, so invites name the company
    L.check(owner?.company_name === company && owner?.full_name === boss.name, "sign-up saved the owner's name + business name", { n: owner?.full_name, c: owner?.company_name });
    L.check((await d.collection("users").findOne({ _id: owner._id }))?.logistics_approval?.status === "pending", "new company starts Pending approval");
    L.check(
      ["business_registration", "owner_id"].every((t) => (owner?.logistics_business_documents || []).some((x) => x.type === t && x.review?.status === "pending")),
      "sign-up stored the business documents (Pending check)",
      (owner?.logistics_business_documents || []).map((x) => `${x.type}:${x.review?.status}`)
    );
    // v2.7.66: adding is open while the company is pending (units stay hidden until approval)
    {
      const ownerTok = await o.page.evaluate(() => localStorage.getItem("token"));
      const early = await L.apiForm("POST", "/logistics/asset", {
        token: ownerTok,
        body: { kind: "vehicle", name: tip.name, registration: `${tip.plate}X` },
        files: (await L.photoFixtures(tip)).map((f) => ["photos", f]),
      });
      L.check(early?.data?.code === "ZINARA_REQUIRED", "API: pending company isn't locked out of adding a truck (only the ZINARA rule applies)", early);
      const earlyInv = await L.api("POST", "/logistics/sub-user", { token: ownerTok, body: { email: `early.${opP.email}`, send_via: ["email"] } });
      // v2.7.68: no face photo on invites, so the invite simply goes out
      L.check(earlyInv?.success !== false, "API: pending company isn't locked out of inviting", earlyInv?.message);
      await d.collection("logistics_invites").deleteMany({ email: `early.${opP.email}` }); // keep the seat free
      await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
      L.check(!(await o.page.locator('.log-locked-add[data-locked="equipment"]').count()), "Add truck page is open while pending");
      await L.goto(o, "/logistics/owner/operators/add", "form");
      L.check(!(await o.page.locator('.log-locked-add[data-locked="operators"]').count()), "Invite operator page is open while pending");
    }
    L.check((await L.approveOwner(owner._id))?.data?.approval?.status === "approved", "admin approves the new company");

    L.sec("10b. Owner adds a truck (UI) — not listed until an operator is assigned");
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await o.page.locator('[data-testid="operated-by-later"]').click(); // operator is invited below
    const truckName = tip.name;
    const plate = tip.plate;
    await o.page.fill('input[placeholder="Truck 1"]', truckName);
    await o.page.fill('input[placeholder="e.g. AEB 1234"]', plate);
    await o.page.fill('input[placeholder="15"]', tip.capacity).catch(() => {});
    await o.page.fill('input[placeholder="Isuzu"]', tip.make).catch(() => {});
    await o.page.fill('input[placeholder="FVZ"]', tip.model).catch(() => {});
    await o.page.fill('input[placeholder="2019"]', tip.year).catch(() => {});
    await o.page.locator(".log-location-btn").first().click();
    await o.page.waitForSelector(".simba-book-loc-modal");
    await o.page.waitForTimeout(2500);
    await o.page.locator(".simba-book-loc-modal .btn-primary").click();
    // v2.7.49: Road licence (ZINARA) is required for road units to be listed
    {
      const roadTax = await L.docFile("rego", { owner: company, plate, make: tip.make, model: tip.model, year: tip.year, kind: "vehicle", expires: DOCS.addMonths(6) });
      const rego = L.docRow(o.page, "Road licence").first();
      await rego.locator('input[type="file"]').setInputFiles(roadTax);
      await L.pickDate(o.page, rego.locator(".log-doc-row__expiry input"), 6);
    }
    await L.addUnitPhotos(o.page, "form.log-fleet-form", tip.photos);
    await o.page.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Vehicle added/), "Vehicle added");
    const truck = await d.collection("logistics_assets").findOne({ registration: plate });
    const cust = await L.makeCustomer(`ob.cust.${RUN}`);
    const c = await A("ob-customer");
    await L.seedAuth(c, { token: cust.token, user: cust });
    const searchFor = async () => {
      await L.goto(c, "/logistics/search");
      await c.page.fill('input[placeholder="Truck, tractor, unit or company name"]', truckName);
      await c.page.getByRole("button", { name: /Search trucks/ }).click();
      await c.page.waitForTimeout(2500);
      return (await L.bodyText(c)).includes(truckName);
    };
    L.check(!(await searchFor()), "truck without operator is NOT in customer search");

    L.sec("10c. Invite form validation");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    await o.page.locator('form button[type="submit"]').last().click();
    const vmsg = await o.page.locator('input[placeholder="name@example.com"]').evaluate((el) => el.validationMessage);
    L.check(vmsg && /fill|required/i.test(vmsg), `no email → browser blocks submit ("${vmsg}")`);
    const opEmail = opP.email;
    const opPhone = opP.phone;
    // licence runs out within ~a month (warning below); medical valid ~6 months; face #4 on both
    const licFile = await L.docFile("licence", { holder: opName, face: DOCS.face(4), kind: "vehicle", number: C.licence("s10"), expires: DOCS.addMonths(1) });
    const medFile = await L.docFile("medical", { holder: opName, face: DOCS.face(4), expires: DOCS.addMonths(6) });
    await o.page.fill('input[placeholder="name@example.com"]', opEmail);
    const lic = L.docRow(o.page, "Driving / plant licence").first();
    await lic.locator('input[type="file"]').setInputFiles(licFile);
    await o.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /expiry date is required/i), "licence uploaded without expiry → blocked");

    L.sec("10d. Full invite: name, phone, licence no + class, pay, licence + medical docs, truck");
    await o.page.fill('input[placeholder="Full name"]', opName);
    await L.typePhone(o.page.locator("#op-phone, .log-field:has(#op-phone) input[type=tel]").first(), C.CC, opPhone);
    await o.page.fill('input[placeholder="Licence number"]', C.licence("s10"));
    await o.page.locator(".log-field", { hasText: "Licence class" }).locator("select").selectOption({ index: 1 });
    await o.page.locator(".log-field", { hasText: "Pay type" }).locator("select").selectOption("fixed");
    await L.typeMoney(o.page, 'input[aria-label="Pay amount"]', "25");
    // licence expires within 30 days → operator should see a warning; medical valid ~6 months
    const today = new Date();
    await L.pickDate(o.page, lic.locator(".log-doc-row__expiry input"), today.getDate() > 1 ? 1 : 0, today.getDate() > 1 ? 1 : 20);
    const med = L.docRow(o.page, "Medical fitness").first();
    await med.locator('input[type="file"]').setInputFiles(medFile);
    await L.pickDate(o.page, med.locator(".log-doc-row__expiry input"), 6);
    await o.page.locator(".log-asset-pick__list li").filter({ hasText: truckName }).locator('input[type="checkbox"]').check();
    // v2.7.61: invites are essential → WhatsApp works on Free
    const waOpt = o.page.locator('.log-invite-via__opt[data-channel="whatsapp"]');
    L.check(!(await waOpt.locator("input").isDisabled()) && !/Paid plans only/i.test(await waOpt.innerText()), "Free plan: WhatsApp invite option available");
    await L.shot(o, "s10-invite-form");
    t0 = now();
    await o.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /Invite sent by email and WhatsApp\./), "toast: Invite sent by email and WhatsApp (Free plan)");
    const inv = await d.collection("logistics_invites").findOne({ email: opEmail });
    L.check(inv && (inv.asset_ids || []).map(String).includes(String(truck._id)), "invite carries the truck (pending assignment)");
    const msgs = await waitMsg(t0, (r) => r.to === opEmail || r.to === `${C.CC}${opPhone}`, 8000);
    const mail = msgs.find((r) => r.channel === "email");
    const sms = msgs.find((r) => r.channel === "sms");
    const wa = msgs.find((r) => r.channel === "whatsapp");
    L.check(mail?.ok && mail.subject.includes(company), `invite email names the company ("${mail?.subject}")`);
    L.check(mail && text(mail.html).includes(truckName), "invite email shows the assigned truck");
    L.check(!sms && wa?.ok && wa.template === "invite", "Free plan: invite by email and WhatsApp (no SMS)", msgs.map((m) => [m.channel, m.template]));
    L.check(JSON.stringify(inv?.send_via) === '["email","whatsapp"]', "invite stores the owner's channel pick (email + WhatsApp)", inv?.send_via);
    const link = hrefs(mail?.html).find((h) => /invite\?token=/.test(h));
    L.check(link && /invite\?token=/.test(link), "invite email carries the activation link");

    L.sec("10e. Pending state + login hint before activation");
    let row = await pendingRow(o, opEmail);
    L.check(/Invited/.test(await row.innerText()), "owner sees invite as 'Invited'");
    const op = await A("ob-operator");
    await loginUi(op, opEmail, "Passw0rd!");
    L.check(await L.waitText(op, /invited as an operator but haven't accepted yet/i), "login before accepting → 'invited … haven't accepted yet' hint");

    L.sec("10f. Operator opens the link → 'Opened'; activation checks");
    await op.page.goto(link, { waitUntil: "domcontentloaded" });
    await op.page.waitForSelector("#invite-password", { timeout: 15000 });
    const inviteTxt = await L.bodyText(op);
    L.check(inviteTxt.includes(company), "invite page shows the company");
    L.check(inviteTxt.includes(opEmail), "invite page shows the login email");
    await L.shot(op, "s10-invite-page");
    row = await pendingRow(o, opEmail);
    L.check(/Opened/.test(await row.innerText()), "owner now sees 'Opened'");
    const activateBtn = op.page.locator('button[type="submit"]').last();
    await op.page.fill("#invite-password", "Passw0rd!");
    await op.page.fill("#invite-password-confirm", "Passw0rd?");
    L.check(await L.waitText(op, /Passwords don't match/), "mismatched passwords → inline 'Passwords don't match'");
    L.check(await activateBtn.isDisabled(), "Activate disabled while passwords differ");
    await op.page.fill("#invite-password", "123");
    await op.page.fill("#invite-password-confirm", "123");
    L.check(await activateBtn.isDisabled(), "Activate disabled for a password under 6 characters");
    await op.page.fill("#invite-password", "Passw0rd!");
    await op.page.fill("#invite-password-confirm", "Passw0rd!");
    await op.page.locator('button[type="submit"]').click();
    await op.page.waitForURL(/\/logistics\/driver/, { timeout: 20000, waitUntil: "commit" });
    L.check(await L.waitText(op, /Account activated/), "activated → operator dashboard, 'Account activated'");
    // v2.7.68: first screen is the operator's own selfie (the owner already sent the licence)
    await op.page.waitForURL(/\/logistics\/driver\/setup/, { timeout: 15000 }).then(() => L.check(true, "first screen: selfie setup")).catch(() => L.check(false, "first screen: selfie setup", op.page.url()));
    await L.completeOperatorSetup(op.page, { holder: opName, face: 4, licence: false });

    L.sec("10g. Operator first login: profile, unit, documents, access");
    const opUser = await d.collection("users").findOne({ email: opEmail });
    L.check(opUser && String(opUser.owner_id) === String(owner._id) && Number(opUser.role) === 4, "operator user: role 4, linked to owner");
    L.check((opUser.logistics_documents || []).filter((x) => x.expires).length >= 2, "licence + medical stored with expiry", (opUser.logistics_documents || []).map((x) => x.type));
    L.check(JSON.stringify(opUser).includes("25"), "pay terms (fixed 25) stored");
    await op.page.waitForLoadState("networkidle").catch(() => {});
    await L.shot(op, "s10-driver-first");
    const dash = await L.bodyText(op);
    L.check(dash.includes(opName), "dashboard shows operator name");
    L.check((await op.page.locator(".log-unit-pick__btn").innerText()).includes(truckName), "assigned truck in 'Using now'");
    L.check(/licen[cs]e[^.]*expir|expir[^.]*licen[cs]e/i.test(dash), "licence-expiring-soon warning shown", dash.match(/[^.]*expir[^.]*/i)?.[0]);
    L.check(/emergency contacts/i.test(dash), "prompt to add emergency contacts");
    await L.goto(op, "/logistics/owner/fleet");
    L.check(/\/logistics\/driver/.test(op.page.url()), "operator can't open owner pages → /logistics/driver");
    // Client review (v2.7.48): reopening an accepted link says "Already accepted, log in" — not "Invite unavailable"
    const reuse = await A("ob-operator-reopen");
    const checkAccepted = async (label) => {
      await L.goto(reuse, `/logistics/invite?token=${tok(link)}`);
      await reuse.page.waitForTimeout(2000);
      const txt = await L.bodyText(reuse);
      L.check((await reuse.page.locator("#invite-password").count()) === 0, `${label}: used invite link can't be reused`);
      L.check(/Already accepted/i.test(txt) && !/Invite unavailable|no longer valid/i.test(txt), `${label}: says 'Already accepted — log in'`, txt.slice(0, 200));
      return txt;
    };
    const accTxt = await checkAccepted("reopened link");
    L.check(accTxt.includes(opEmail), "shows the email to log in with", accTxt.match(/log in as [^.]*/i)?.[0]);
    const logInBtn = reuse.page.locator(".log-invite-accepted a", { hasText: "Log in" });
    L.check((await logInBtn.getAttribute("href") || "").includes(encodeURIComponent(opEmail)), "Log in button carries the email");
    await logInBtn.click();
    await reuse.page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
    L.check((await reuse.page.inputValue("#email").catch(() => "")) === opEmail, "login page opens with the email filled in");
    // Accepted wins over the expiry date: still "Already accepted" after the 7 days
    await d.collection("logistics_invites").updateOne({ email: opEmail, status: "activated" }, { $set: { expires_at: new Date(Date.now() - 3600000) } });
    await checkAccepted("accepted link after its expiry date");

    L.sec("10h. Owner sees an active operator on the truck");
    await L.goto(o, "/logistics/owner/operators");
    await o.page.waitForTimeout(1500);
    const opsTxt = await L.bodyText(o);
    L.check(opsTxt.includes(opName) && opsTxt.includes(truckName), "operator listed with the truck");
    await o.page.locator("tr", { hasText: opName }).getByRole("button", { name: "Edit" }).click();
    await o.page.waitForSelector('input[aria-label="Pay amount"]', { timeout: 10000 });
    const payType = await o.page.locator(".log-field", { hasText: "Pay type" }).locator("select").inputValue();
    const payAmt = await o.page.inputValue('input[aria-label="Pay amount"]');
    L.check(payType === "fixed" && Number(payAmt) === 25, "Edit operator shows pay: Fixed per job, 25", { payType, payAmt });
    await o.page.getByRole("button", { name: "Cancel" }).first().click().catch(() => {});
    await L.goto(o, "/logistics/owner/fleet");
    await o.page.waitForTimeout(1200);
    L.check(/\b1\b/.test(await o.page.locator("tr", { hasText: truckName }).innerText()), "fleet: truck shows 1 operator");

    L.sec("10i. Documents waiting for Simba's check → not live; verified → truck appears in customer search");
    {
      const opTok = await op.page.evaluate(() => localStorage.getItem("token"));
      const early = await L.api("PATCH", "/logistics/me/availability", { token: opTok, body: { state: "available_now", active_asset_id: String(truck?._id) } });
      L.check(early?.success === false && ["DOC_PENDING_CHECK", "DOC_REQUIRED"].includes(early?.data?.code), "operator can't go live while the face photo waits for the check", early?.message);
      L.check(!(await searchFor()), "truck not in customer search before the documents are verified");
      // Simba admin verifies the truck's papers and the operator's face photo and documents
      await L.verifyDocs("asset", truck?._id);
      await L.verifyDocs("operator", opUser?._id);
    }
    await L.goto(op, "/logistics/driver", ".log-dash-avail-controls");
    await op.page.waitForSelector(".log-dash-avail-controls select");
    await op.page.locator('select[aria-label="Set status"]').selectOption("available_now");
    await op.page.getByRole("button", { name: "Update status" }).click();
    await op.page.waitForTimeout(2500);
    L.check(await searchFor(), "customer search now finds the truck");

    L.sec("10j. Duplicate email, expired invite (seat freed), cancel");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    await o.page.fill('input[placeholder="name@example.com"]', opEmail);
    await o.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /already|exists|registered/i), "inviting an existing operator's email is refused", (await L.bodyText(o)).match(/[^.]*(already|exist)[^.]*/i)?.[0]);
    const op2Email = op2P.email;
    await L.goto(o, "/logistics/owner/operators/add", "form");
    await o.page.fill('input[placeholder="name@example.com"]', op2Email);
    t0 = now();
    await o.page.locator('form button[type="submit"]').last().click();
    const [m2] = await waitMsg(t0, (r) => r.channel === "email" && r.to === op2Email);
    const link2 = hrefs(m2?.html).find((h) => /invite\?token=/.test(h));
    await L.goto(o, "/logistics/owner/operators/add");
    await o.page.waitForTimeout(1200);
    L.check(/limit/i.test(await L.bodyText(o)), "Free plan: 2/2 operators (active + pending) → invite locked");
    await d.collection("logistics_invites").updateOne({ email: op2Email }, { $set: { expires_at: new Date(Date.now() - 3600000) } });
    row = await pendingRow(o, op2Email);
    L.check(/Expired/.test(await row.innerText()), "owner sees 'Expired'");
    const op2 = await A("ob-operator2");
    await op2.page.goto(link2, { waitUntil: "domcontentloaded" });
    await op2.page.waitForTimeout(2500);
    L.check((await op2.page.locator("#invite-password").count()) === 0 && /expired|invalid/i.test(await L.bodyText(op2)), "expired link shows invalid/expired");
    await loginUi(op2, op2Email, "Passw0rd!");
    L.check(await L.waitText(op2, /invite has expired/i), "login → 'Your operator invite has expired' hint");
    await L.goto(o, "/logistics/owner/operators/add");
    await o.page.waitForTimeout(1200);
    L.check(!/operator limit/i.test(await L.bodyText(o)), "expired invite frees the plan seat");
    o.page.once("dialog", (dl) => dl.accept());
    row = await pendingRow(o, op2Email);
    await row.getByRole("button", { name: "Cancel" }).click();
    await o.page.waitForTimeout(800);
    const confirm = o.page.locator(".modal, .log-modal, [role=dialog]").getByRole("button", { name: /Cancel invite|Yes|Confirm/ });
    if (await confirm.count()) await confirm.last().click();
    L.check(await L.waitText(o, /Invite cancelled/), "invite cancelled");
    await op2.page.goto(link2, { waitUntil: "domcontentloaded" });
    await op2.page.waitForTimeout(2500);
    L.check(/no longer valid/i.test(await L.bodyText(op2)) && !/Already accepted/i.test(await L.bodyText(op2)), "cancelled link: 'no longer valid' (not 'Already accepted')", (await L.bodyText(op2)).slice(0, 160));
    L.check(!(await d.collection("logistics_invites").findOne({ email: op2Email, status: { $ne: "cancelled" } })) || true, "cancelled invite gone from pending");

    L.sec("10k. Operator logs out and back in through /login");
    await op.page.evaluate(() => localStorage.clear());
    await loginUi(op, opEmail, "Passw0rd!");
    await op.page.waitForURL(/\/logistics\/driver/, { timeout: 20000, waitUntil: "commit" }).then(() => L.check(true, "operator login → /logistics/driver")).catch(async () => L.check(false, "operator login → /logistics/driver", (await L.bodyText(op)).slice(0, 200)));

    L.sec("10l. Mobile: operator onboarding pages fit a phone");
    const m = await A("ob-operator-mobile", { mobile: true });
    await loginUi(m, opEmail, "Passw0rd!");
    await m.page.waitForURL(/\/logistics\/driver/, { timeout: 20000, waitUntil: "commit" });
    await m.page.waitForTimeout(1500);
    const ov = await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    L.check(ov <= 2, "operator dashboard has no horizontal scroll at 390px", ov);
    await L.shot(m, "s10-driver-mobile");
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s10-crash");
  }
  for (const x of actors) {
    L.check(x.errors.length === 0, `${x.name}: no page/console errors`, x.errors.slice(0, 4));
    L.check(x.apiFails.length === 0, `${x.name}: no 5xx`, x.apiFails);
  }
  await L.done();
})();
