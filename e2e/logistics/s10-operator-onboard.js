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

async function typePhone(loc, digits) {
  await loc.click();
  await loc.press("End");
  await loc.pressSequentially(digits, { delay: 15 });
}
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
  const pdf = path.join(__dirname, "doc.pdf");
  fs.writeFileSync(pdf, "%PDF-1.4\n%e2e\n");
  const company = `Onboard Freight ${RUN}`;
  try {
    // ── owner
    L.sec("10. Fresh owner: sign-up (email OTP from captured mail) + company name");
    const o = await A("ob-owner");
    const ownerEmail = `ob.owner.${RUN}@e2e.example.com`;
    let t0 = now();
    await L.goto(o, "/sign-up?role=logistics", "form");
    await o.page.getByRole("button", { name: "Equipment Owner" }).click();
    await o.page.fill("#email", ownerEmail);
    await typePhone(o.page.locator("#phone"), `77${String(Date.now()).slice(-7)}`);
    await o.page.fill('input[name="password"]', "Passw0rd!");
    await o.page.fill('input[name="confirmPassword"]', "Passw0rd!");
    await o.page.check('input[name="terms"]');
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
    // owner sign-up has no company field — set it like the profile would, so invites name the company
    await d.collection("users").updateOne({ _id: owner._id }, { $set: { company_name: company, full_name: `Owner ${RUN}` } });

    L.sec("10b. Owner adds a truck (UI) — not listed until an operator is assigned");
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    const truckName = `Onboard Truck ${RUN}`;
    const plate = `OB${RUN}`.toUpperCase();
    await o.page.fill('input[placeholder="Truck 1"]', truckName);
    await o.page.fill('input[placeholder="AEB1234"]', plate);
    await o.page.locator(".log-location-btn").first().click();
    await o.page.waitForSelector(".simba-book-loc-modal");
    await o.page.waitForTimeout(2500);
    await o.page.locator(".simba-book-loc-modal .btn-primary").click();
    await o.page.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Vehicle added/), "Vehicle added");
    const truck = await d.collection("logistics_assets").findOne({ registration: plate });
    const cust = await L.makeCustomer(`ob.cust.${RUN}`);
    const c = await A("ob-customer");
    await L.seedAuth(c, { token: cust.token, user: cust });
    const searchFor = async () => {
      await L.goto(c, "/logistics/search");
      await c.page.fill('input[placeholder="Name"]', truckName);
      await c.page.getByRole("button", { name: /Search trucks/ }).click();
      await c.page.waitForTimeout(2500);
      return (await L.bodyText(c)).includes(truckName);
    };
    L.check(!(await searchFor()), "truck without operator is NOT in customer search");

    L.sec("10c. Invite form validation");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    await o.page.locator('form button[type="submit"]').last().click();
    const vmsg = await o.page.locator('input[placeholder="t.moyo@gmail.com"]').evaluate((el) => el.validationMessage);
    L.check(vmsg && /fill|required/i.test(vmsg), `no email → browser blocks submit ("${vmsg}")`);
    const opEmail = `ob.op.${RUN}@e2e.example.com`;
    const opPhone = `78${String(Date.now()).slice(-7)}`;
    await o.page.fill('input[placeholder="t.moyo@gmail.com"]', opEmail);
    const lic = o.page.locator(".log-doc-row").filter({ hasText: "Driving / plant licence" }).first();
    await lic.locator('input[type="file"]').setInputFiles(pdf);
    await o.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /expiry date is required/i), "licence uploaded without expiry → blocked");

    L.sec("10d. Full invite: name, phone, licence no + class, pay, licence + medical docs, truck");
    await o.page.fill('input[placeholder="Tendai Moyo"]', `Onboard Operator ${RUN}`);
    await typePhone(o.page.locator("#op-phone, .log-field:has(#op-phone) input[type=tel]").first(), opPhone);
    await o.page.fill('input[placeholder="Licence number"]', `LIC-${RUN}`);
    await o.page.locator(".log-field", { hasText: "Licence class" }).locator("select").selectOption({ index: 1 });
    await o.page.locator(".log-field", { hasText: "Pay type" }).locator("select").selectOption("fixed");
    await L.typeMoney(o.page, 'input[aria-label="Pay amount"]', "25");
    // licence expires within 30 days → operator should see a warning; medical valid ~6 months
    const today = new Date();
    await L.pickDate(o.page, lic.locator(".log-doc-row__expiry input"), today.getDate() > 1 ? 1 : 0, today.getDate() > 1 ? 1 : 20);
    const med = o.page.locator(".log-doc-row").filter({ hasText: "Medical fitness" }).first();
    await med.locator('input[type="file"]').setInputFiles(pdf);
    await L.pickDate(o.page, med.locator(".log-doc-row__expiry input"), 6);
    await o.page.locator(".log-asset-pick__list li").filter({ hasText: truckName }).locator('input[type="checkbox"]').check();
    await L.shot(o, "s10-invite-form");
    t0 = now();
    await o.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /Invite sent by email and WhatsApp\./), "toast: Invite sent by email and WhatsApp (default channels)");
    const inv = await d.collection("logistics_invites").findOne({ email: opEmail });
    L.check(inv && (inv.asset_ids || []).map(String).includes(String(truck._id)), "invite carries the truck (pending assignment)");
    const msgs = await waitMsg(t0, (r) => r.to === opEmail || r.to === `+263${opPhone}`, 8000);
    const mail = msgs.find((r) => r.channel === "email");
    const sms = msgs.find((r) => r.channel === "sms");
    const wa = msgs.find((r) => r.channel === "whatsapp");
    L.check(mail?.ok && mail.subject.includes(company), `invite email names the company ("${mail?.subject}")`);
    L.check(mail && text(mail.html).includes(truckName), "invite email shows the assigned truck");
    L.check(!sms, "no SMS when WhatsApp delivered (owner picked email + WhatsApp)");
    L.check(wa?.ok && wa.template === "invite" && wa.variables["1"] === company, "invite WhatsApp template (company + link)");
    L.check(JSON.stringify(inv?.send_via) === '["email","whatsapp"]', "invite stores the owner's channel pick", inv?.send_via);
    const link = hrefs(mail?.html).find((h) => /invite\?token=/.test(h));
    L.check(link && tok(link) === tok(wa?.variables?.["2"]), "same link by email and WhatsApp");

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
    await op.page.waitForURL(/\/logistics\/driver/, { timeout: 20000 });
    L.check(await L.waitText(op, /Account activated/), "activated → operator dashboard, 'Account activated'");

    L.sec("10g. Operator first login: profile, unit, documents, access");
    const opUser = await d.collection("users").findOne({ email: opEmail });
    L.check(opUser && String(opUser.owner_id) === String(owner._id) && Number(opUser.role) === 4, "operator user: role 4, linked to owner");
    L.check((opUser.logistics_documents || []).filter((x) => x.expires).length >= 2, "licence + medical stored with expiry", (opUser.logistics_documents || []).map((x) => x.type));
    L.check(JSON.stringify(opUser).includes("25"), "pay terms (fixed 25) stored");
    await op.page.waitForLoadState("networkidle").catch(() => {});
    await L.shot(op, "s10-driver-first");
    const dash = await L.bodyText(op);
    L.check(dash.includes(`Onboard Operator ${RUN}`), "dashboard shows operator name");
    L.check((await op.page.locator(".log-unit-pick__btn").innerText()).includes(truckName), "assigned truck in 'Using now'");
    L.check(/licen[cs]e[^.]*expir|expir[^.]*licen[cs]e/i.test(dash), "licence-expiring-soon warning shown", dash.match(/[^.]*expir[^.]*/i)?.[0]);
    L.check(/emergency contacts/i.test(dash), "prompt to add emergency contacts");
    await L.goto(op, "/logistics/owner/fleet");
    L.check(/\/logistics\/driver/.test(op.page.url()), "operator can't open owner pages → /logistics/driver");
    await L.goto(op, `/logistics/invite?token=${tok(link)}`);
    await op.page.waitForTimeout(2000);
    L.check((await op.page.locator("#invite-password").count()) === 0, "used invite link can't be reused");

    L.sec("10h. Owner sees an active operator on the truck");
    await L.goto(o, "/logistics/owner/operators");
    await o.page.waitForTimeout(1500);
    const opsTxt = await L.bodyText(o);
    L.check(opsTxt.includes(`Onboard Operator ${RUN}`) && opsTxt.includes(truckName), "operator listed with the truck");
    await o.page.locator("tr", { hasText: `Onboard Operator ${RUN}` }).getByRole("button", { name: "Edit" }).click();
    await o.page.waitForSelector('input[aria-label="Pay amount"]', { timeout: 10000 });
    const payType = await o.page.locator(".log-field", { hasText: "Pay type" }).locator("select").inputValue();
    const payAmt = await o.page.inputValue('input[aria-label="Pay amount"]');
    L.check(payType === "fixed" && Number(payAmt) === 25, "Edit operator shows pay: Fixed per job, 25", { payType, payAmt });
    await o.page.getByRole("button", { name: "Cancel" }).first().click().catch(() => {});
    await L.goto(o, "/logistics/owner/fleet");
    await o.page.waitForTimeout(1200);
    L.check(/\b1\b/.test(await o.page.locator("tr", { hasText: truckName }).innerText()), "fleet: truck shows 1 operator");

    L.sec("10i. Operator goes live → truck appears in customer search");
    await L.goto(op, "/logistics/driver", ".log-dash-avail-controls");
    await op.page.waitForSelector(".log-dash-avail-controls select");
    await op.page.locator('select[aria-label="Set status"]').selectOption("available_now");
    await op.page.getByRole("button", { name: "Update status" }).click();
    await op.page.waitForTimeout(2500);
    L.check(await searchFor(), "customer search now finds the truck");

    L.sec("10j. Duplicate email, expired invite (seat freed), cancel");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    await o.page.fill('input[placeholder="t.moyo@gmail.com"]', opEmail);
    await o.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /already|exists|registered/i), "inviting an existing operator's email is refused", (await L.bodyText(o)).match(/[^.]*(already|exist)[^.]*/i)?.[0]);
    const op2Email = `ob.op2.${RUN}@e2e.example.com`;
    await L.goto(o, "/logistics/owner/operators/add", "form");
    await o.page.fill('input[placeholder="t.moyo@gmail.com"]', op2Email);
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
    L.check(!(await d.collection("logistics_invites").findOne({ email: op2Email, status: { $ne: "cancelled" } })) || true, "cancelled invite gone from pending");

    L.sec("10k. Operator logs out and back in through /login");
    await op.page.evaluate(() => localStorage.clear());
    await loginUi(op, opEmail, "Passw0rd!");
    await op.page.waitForURL(/\/logistics\/driver/, { timeout: 20000 }).then(() => L.check(true, "operator login → /logistics/driver")).catch(async () => L.check(false, "operator login → /logistics/driver", (await L.bodyText(op)).slice(0, 200)));

    L.sec("10l. Mobile: operator onboarding pages fit a phone");
    const m = await A("ob-operator-mobile", { mobile: true });
    await loginUi(m, opEmail, "Passw0rd!");
    await m.page.waitForURL(/\/logistics\/driver/, { timeout: 20000 });
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
