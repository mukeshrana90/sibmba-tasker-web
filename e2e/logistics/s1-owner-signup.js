/* Stage 1 — owner sign-up through the UI, OTP read from DB, lands on owner dashboard. */
const L = require("./lib");

(async () => {
  const RUN = Date.now().toString(36).slice(-6);
  const st = { RUN };
  const email = `owner.${RUN}@e2e.example.com`;
  const phone = `77${String(Date.now()).slice(-7)}`;
  const o = await L.actor("owner");
  const p = o.page;
  try {
    L.sec("1. Owner sign-up (UI)");
    await L.goto(o, "/sign-up?role=logistics", "form");
    await p.getByRole("button", { name: "Equipment Owner" }).click();
    L.check(await L.waitText(o, /Sign up as Equipment Owner/), "Equipment Owner tab shows owner copy");
    await p.fill("#email", email);
    await p.locator("#phone").click();
    await p.locator("#phone").press("End");
    await p.locator("#phone").pressSequentially(phone, { delay: 20 });
    await p.fill('input[name="password"]', "Passw0rd!");
    await p.fill('input[name="confirmPassword"]', "Passw0rd!");
    await p.check('input[name="terms"]');
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
    st.owner = { _id: String(u._id), email, phone, role: 4 };
    const otp = String(u.email_otp);
    const inputs = p.locator("input");
    const n = await inputs.count();
    if (n >= otp.length) {
      for (let i = 0; i < otp.length; i++) await inputs.nth(i).fill(otp[i]);
    } else await inputs.first().fill(otp);
    await p.locator('button[type="submit"]').click();
    await p.waitForURL(/\/logistics\/owner/, { timeout: 20000 });
    L.check(true, "OTP verified → /logistics/owner");
    await p.waitForLoadState("networkidle").catch(() => {});
    await L.shot(o, "s1-owner-dashboard");
    const t = await L.bodyText(o);
    L.check(/dashboard|fleet|operator/i.test(t), "owner dashboard renders", t.slice(0, 200));
    st.owner.token = await p.evaluate(() => localStorage.getItem("token"));

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
