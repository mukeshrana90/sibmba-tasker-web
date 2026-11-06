/* Stage 1 — owner sign-up through the UI, OTP read from DB, lands on owner dashboard. */
const L = require("./lib");

(async () => {
  const RUN = Date.now().toString(36).slice(-6);
  const st = { RUN };
  L.saveState(st); // cast + makeCustomer read RUN from state
  const C = L.cast(RUN);
  const me = C.slot("owner", "s1");
  const email = me.email;
  const phone = me.phone;
  const o = await L.actor("owner");
  const p = o.page;
  try {
    L.sec("1. Owner sign-up (UI)");
    await L.goto(o, "/sign-up?role=logistics", "form");
    await p.getByRole("button", { name: "Equipment Owner" }).click();
    L.check(await L.waitText(o, /Sign up as Equipment Owner/), "Equipment Owner tab shows owner copy");
    // doc 12 · 4.1: real name + business name are required for owners
    await p.locator('form button[type="submit"]').click();
    L.check(await L.waitText(o, /Full name is required/), "sign-up without a name is refused (Full name)");
    L.check(await L.waitText(o, /Business name is required/), "sign-up without a business name is refused");
    // 30 Oct 2026: owner sign-up in two steps — step 2 (business documents) can be skipped
    L.check((await p.locator(".signup-steps li").count()) === 2, "owner sign-up shows steps 1 and 2");
    L.check(await p.locator('.signup-step[data-step="2"]').isHidden(), "step 2 (business documents) is hidden on step 1");
    {
      const noName = await L.api("POST", "/logistics/auth/register", {
        body: { email: `${C.person("customer", 40).first.toLowerCase()}.${RUN}@yopmail.com`, country_code: C.CC, phone_number: C.phone("s1-noname"), password: "Passw0rd!", role: 4 },
      });
      L.check(noName?.success === false && noName?.data?.code === "NAME_REQUIRED", "API: register without names → NAME_REQUIRED", noName?.message);
      const extra = C.person("owner", 15);
      const extraDocs = await L.businessDocFiles({ name: extra.name, company: extra.company });
      const noDocs = await L.apiForm("POST", "/logistics/auth/register", {
        body: { full_name: extra.name, company_name: extra.company, email: `${extra.first.toLowerCase()}.${RUN}@yopmail.com`, country_code: C.CC, phone_number: C.phone("s1-nodocs"), password: "Passw0rd!", role: 4, business_docs: "1" },
        files: [["business_registration", extraDocs.business_registration]],
      });
      L.check(noDocs?.success === false && noDocs?.data?.code === "BUSINESS_DOCS_REQUIRED", "API: register with only some required business documents → BUSINESS_DOCS_REQUIRED", noDocs?.message);
      // Step 2 skipped: multipart sign-up without documents is accepted (documents come later)
      const skipEmail = `${extra.first.toLowerCase()}.skip.${RUN}@yopmail.com`;
      const skip = await L.apiForm("POST", "/logistics/auth/register", {
        body: { full_name: extra.name, company_name: extra.company, email: skipEmail, country_code: C.CC, phone_number: C.phone("s1-skip"), password: "Passw0rd!", role: 4, business_docs: "0" },
      });
      L.check(skip?.success !== false && skip?.data?._id, "API: sign-up with step 2 skipped is accepted", skip?.message);
      if (skip?.data?._id) await (await L.db()).collection("users").deleteOne({ _id: new L.mongoose.Types.ObjectId(String(skip.data._id)) });
      // JSON sign-up (older app) is still accepted, but Simba can't approve it before documents are uploaded
      const jsonEmail = `${extra.first.toLowerCase()}.${extra.last.toLowerCase()}.${RUN}@yopmail.com`;
      const json = await L.api("POST", "/logistics/auth/register", {
        body: { full_name: extra.name, company_name: extra.company, email: jsonEmail, country_code: C.CC, phone_number: C.phone("s1-json"), password: "Passw0rd!", role: 4 },
      });
      const jsonId = json?.data?._id;
      L.check(json?.success !== false && jsonId, "API: JSON sign-up (no documents) is still accepted", json?.message);
      if (jsonId) {
        const ap0 = await L.approveOwner(jsonId, "approved", "", { withDocs: false });
        L.check(ap0?.success === false && ap0?.data?.code === "BUSINESS_DOCS_REQUIRED", "admin can't approve a company without business documents", ap0?.message);
        await (await L.db()).collection("users").deleteOne({ _id: new L.mongoose.Types.ObjectId(String(jsonId)) });
      }
    }
    st.ownerName = me.name;
    st.ownerCompany = me.company;
    await p.fill("#full_name", st.ownerName);
    await p.fill("#company_name", st.ownerCompany);
    await p.fill("#email", email);
    await L.typePhone(p.locator("#phone"), C.CC, phone);
    await p.fill('input[name="password"]', "Passw0rd!");
    await p.fill('input[name="confirmPassword"]', "Passw0rd!");
    await p.check('input[name="terms"]');
    await L.fillSignupBusinessDocs(p, me);
    await L.shot(o, "s1-business-docs");
    await p.locator('form button[type="submit"]').click();
    // OTP selection modal → Email
    await p.getByText("Email", { exact: true }).first().click({ timeout: 10000 });
    await L.shot(o, "s1-otp-modal");
    await p.locator(".modal button", { hasText: /next|continue|send/i }).last().click();
    await p.waitForURL(/otp/i, { timeout: 15000 });
    L.check(true, "registered → OTP page");
    const d = await L.db();
    const u = await d.collection("users").findOne({ email });
    L.check(u && Number(u.role) === 4, "owner user row created with role 4", u && u.role);
    L.check(u?.full_name === st.ownerName && u?.company_name === st.ownerCompany, "owner saved with real name + business name", { full_name: u?.full_name, company_name: u?.company_name });
    st.owner = { _id: String(u._id), email, phone, cc: C.CC, name: me.name, company: me.company, role: 4 };
    {
      const bd = u?.logistics_business_documents || [];
      const types = bd.map((x) => x.type).sort().join(",");
      L.check(bd.length >= 2 && /business_registration/.test(types) && /owner_id/.test(types), "business documents saved with the sign-up", types);
      L.check(bd.every((x) => x.review?.status === "pending"), "business documents wait for Simba's check");
    }
    const otp = String(u.email_otp);
    // the OTP boxes only (other inputs on the page shifted the digits)
    await p.locator(".set-otp input").nth(otp.length - 1).waitFor({ timeout: 15000 });
    const inputs = p.locator(".set-otp input");
    for (let i = 0; i < otp.length; i++) await inputs.nth(i).fill(otp[i]);
    await p.locator('button[type="submit"]', { hasText: /verify/i }).click();
    await p.waitForURL(/\/logistics\/owner/, { timeout: 20000 });
    L.check(true, "OTP verified → /logistics/owner");
    await p.waitForLoadState("networkidle").catch(() => {});
    await L.shot(o, "s1-owner-dashboard");
    const t = await L.bodyText(o);
    L.check(/dashboard|fleet|operator/i.test(t), "owner dashboard renders", t.slice(0, 200));
    st.owner.token = await p.evaluate(() => localStorage.getItem("token"));

    L.sec("1a. New company waits for Simba approval (v2.7.49)");
    {
      const row = await d.collection("users").findOne({ email }, { projection: { logistics_approval: 1 } });
      L.check(row?.logistics_approval?.status === "pending", "new owner starts as Pending approval", row?.logistics_approval);
      const banner = await p.locator(".log-approval-banner").first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
      L.check(banner, "dashboard shows the 'waiting for Simba approval' banner");
      const me = await L.api("GET", "/logistics/me", { token: st.owner.token });
      L.check(me?.data?.user?.account?.approval?.status === "pending", "/me account.approval = pending", me?.data?.user?.account);
      const live = await L.api("POST", "/logistics/job/000000000000000000000000/quote", { token: st.owner.token, body: {} });
      L.check(live?.success === false, "pending owner can't take work", live?.message);
      // 29 Oct 2026: no equipment / operators before the company is approved
      const truck0 = C.unit("truck", 20);
      const addTry = await L.apiForm("POST", "/logistics/asset", {
        token: st.owner.token,
        body: { kind: "vehicle", name: truck0.name, registration: truck0.plate },
        files: (await L.photoFixtures(truck0)).map((f) => ["photos", f]),
      });
      L.check(addTry?.success === false && addTry?.data?.code === "OWNER_PENDING_APPROVAL", "API: pending owner can't add equipment", addTry?.message);
      const invTry = await L.api("POST", "/logistics/sub-user", { token: st.owner.token, body: { email: `op.${RUN}@yopmail.com`, send_via: ["email"] } });
      L.check(invTry?.success === false && invTry?.data?.code === "OWNER_PENDING_APPROVAL", "API: pending owner can't invite operators", invTry?.message);
      await L.goto(o, "/logistics/owner/fleet/add");
      const locked = await p.locator('.log-locked-add[data-locked="equipment"]').first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
      L.check(locked, "Add equipment page is locked until approval");
      await L.shot(o, "s1-add-locked");
      await L.goto(o, "/logistics/owner/verification");
      const regRow = p.locator('.log-bizdoc[data-type="business_registration"]').first();
      const shown = await regRow.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
      L.check(shown && (await regRow.getAttribute("data-status")) === "pending", "verification page lists the business registration as Pending check", shown && (await regRow.getAttribute("data-status")));
      L.check((await p.locator('.log-bizdoc[data-type="owner_id"]').first().getAttribute("data-status").catch(() => null)) === "pending", "verification page lists the owner ID as Pending check");
      await L.shot(o, "s1-verification-page");
      const ap = await L.approveOwner(st.owner._id);
      L.check(ap?.success !== false && ap?.data?.approval?.status === "approved", "admin approves the company", ap?.message);
      const me2 = await L.api("GET", "/logistics/me", { token: st.owner.token });
      L.check(me2?.data?.user?.account?.approval?.status === "approved", "/me account.approval = approved");
      const bd2 = (await d.collection("users").findOne({ email }, { projection: { logistics_business_documents: 1 } }))?.logistics_business_documents || [];
      L.check(bd2.length && bd2.every((x) => x.review?.status === "verified"), "approving the company verified its business documents");
      await L.goto(o, "/logistics/owner/fleet/add");
      const formOk = await p.locator("form.log-fleet-form").first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
      L.check(formOk && !(await p.locator(".log-locked-add").count()), "after approval the Add equipment form is unlocked");
      await L.goto(o, "/logistics/owner");
      const mail = require("fs").existsSync(require("path").join(__dirname, "outbox.jsonl"))
        ? require("fs").readFileSync(require("path").join(__dirname, "outbox.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
        : [];
      L.check(mail.some((m) => String(m.to || "").includes(email) && /approved/i.test(JSON.stringify(m))), "approval email sent to the owner");
      await p.reload({ waitUntil: "domcontentloaded" }); // not "load": the dashboard map waits on outside tile servers
      await p.waitForLoadState("networkidle").catch(() => {});
      L.check(!(await p.locator(".log-approval-banner").count()), "banner gone after approval");
    }

    L.sec("1b. Logout + login through UI");
    await p.evaluate(() => localStorage.clear());
    await L.goto(o, "/login", "form");
    await p.fill('input[placeholder="Enter your email"]', email);
    await p.fill('input[placeholder="Enter your password"]', "Passw0rd!");
    await p.locator('button[type="submit"]').click();
    await p.waitForURL(/\/logistics\/owner/, { timeout: 20000 }).then(() => L.check(true, "owner login → /logistics/owner")).catch(async () => L.check(false, "owner login → /logistics/owner", (await L.bodyText(o)).slice(0, 300)));
    st.owner.token = await p.evaluate(() => localStorage.getItem("token"));
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    await L.shot(o, "s1-crash");
  }
  L.check(o.errors.length === 0, "no page/console errors", o.errors.slice(0, 5));
  L.check(o.apiFails.length === 0, "no 5xx API responses", o.apiFails);
  L.saveState(st);
  await L.done();
})();
