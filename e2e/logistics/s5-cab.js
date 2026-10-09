/* Stage 5 — Cab service: owner adds a cab, invites 2nd operator, ride request → quote → accept → PIN → complete → drop-off check. */
const L = require("./lib");
const fs = require("fs");
const path = require("path");

(async () => {
  const st = L.loadState();
  const d = await L.db();
  const OID = (x) => new L.mongoose.Types.ObjectId(x);
  const pdf = path.join(__dirname, "doc.pdf");
  const o = await L.actor("owner");
  const c = await L.actor("customer");
  let op2;
  try {
    await L.seedAuth(o, { token: st.owner.token, user: st.owner });
    await L.seedAuth(c, { token: st.customer.token, user: st.customer });

    L.sec("5. Owner adds a cab (UI)");
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await o.page.locator('form.log-fleet-form button.log-cattile[aria-label="Cab"]').click();
    await o.page.fill('input[placeholder="Cab 1"]', `E2E Cab ${st.RUN}`);
    await o.page.locator("form.log-fleet-form .log-field", { hasText: "Cab type" }).locator("select").selectOption("car");
    const plate = `CAB${st.RUN}`.toUpperCase().slice(0, 9);
    await o.page.fill('input[placeholder="AEB1234"]', plate);
    await o.page.locator(".log-location-btn").first().click();
    await o.page.waitForSelector(".simba-book-loc-modal");
    await o.page.waitForTimeout(2500);
    await o.page.locator(".simba-book-loc-modal .btn-primary").click();
    const ins = o.page.locator(".log-doc-row").filter({ hasText: "Taxi / PSV permit" }).first();
    await ins.locator('input[type="file"]').setInputFiles(pdf);
    await L.pickDate(o.page, ins.locator(".log-doc-row__expiry input"), 3);
    await o.page.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Cab added/), "Cab added toast", (await L.bodyText(o)).slice(0, 200));
    await o.page.waitForTimeout(1000);
    const cab = await d.collection("logistics_assets").findOne({ registration: plate });
    L.check(cab && cab.kind === "cab" && cab.cab_class === "car", "cab saved (kind cab, class car)", cab && { k: cab.kind, c: cab.cab_class, s: cab.seats });
    st.cab = { _id: String(cab._id), name: cab.name };

    L.sec("5b. Invite + activate 2nd operator for the cab");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    const email = `operator2.${st.RUN}@e2e.example.com`;
    await o.page.fill('input[placeholder="Tendai Moyo"]', `E2E Driver2 ${st.RUN}`);
    await o.page.fill('input[placeholder="t.moyo@gmail.com"]', email);
    await o.page.locator(".log-asset-pick__list li").filter({ hasText: `E2E Cab ${st.RUN}` }).locator('input[type="checkbox"]').check();
    await o.page.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /Invite (sent|created)/), "invite #2 sent");
    await o.page.waitForTimeout(1000);
    const inv = await d.collection("logistics_invites").findOne({ email });
    op2 = await L.actor("operator2");
    await L.goto(op2, `/logistics/invite?token=${inv.token}`, "#invite-password");
    await op2.page.fill("#invite-password", "Passw0rd!");
    await op2.page.fill("#invite-password-confirm", "Passw0rd!");
    await op2.page.locator('button[type="submit"]').click();
    await op2.page.waitForURL(/\/logistics\/driver/, { timeout: 20000 });
    const u2 = await d.collection("users").findOne({ email });
    st.operator2 = { _id: String(u2._id), email, role: 4, owner_id: st.owner._id, token: await op2.page.evaluate(() => localStorage.getItem("token")) };
    L.check(true, "operator #2 activated");

    L.sec("5c. Free plan limits (operators 2/2, cab 1/1, trucks 2)");
    await L.goto(o, "/logistics/owner/operators/add");
    await o.page.waitForTimeout(1500);
    L.check(/limit/i.test(await L.bodyText(o)), "invite form shows operator limit reached");
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await o.page.locator('form.log-fleet-form button.log-cattile[aria-label="Cab"]').click();
    await o.page.waitForTimeout(800);
    L.check(await o.page.locator(".log-plan-limit-lock").count(), "2nd cab locked on Free plan");
    await o.page.locator('form.log-fleet-form button.log-cattile').first().click();
    await o.page.waitForTimeout(800);
    L.check(!(await o.page.locator(".log-plan-limit-lock").count()), "2nd truck allowed on Free plan (1 / 2)");
    // a 2nd truck fills the Free plan → the 3rd is locked
    {
      const dd = await L.db();
      const { ObjectId: OID5 } = L.mongoose.Types;
      const t0 = await dd.collection("logistics_assets").findOne({ _id: new OID5(st.truck._id) });
      const secondId = new OID5();
      await dd.collection("logistics_assets").insertOne({ ...t0, _id: secondId, name: `E2E 2nd truck ${st.RUN}`, registration: `T2${st.RUN}`.toUpperCase().slice(0, 10), assigned_sub_user_ids: [], is_featured: false, createdAt: new Date(), updatedAt: new Date() });
      try {
        await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
        await o.page.locator('form.log-fleet-form button.log-cattile').first().click();
        await o.page.waitForTimeout(800);
        L.check(await o.page.locator(".log-plan-limit-lock").count() && /\(2 \/ 2\)/.test(await L.bodyText(o)), "3rd truck locked on Free plan (2 / 2)");
        await L.shot(o, "s5-plan-lock");
        const r = await L.api("POST", "/logistics/asset", { token: L.tokenFor(st.owner._id), body: { kind: "vehicle", name: "E2E 3rd truck", registration: `T3${st.RUN}`.toUpperCase().slice(0, 10) } });
        L.check(r.success === false && r.data?.code === "PLAN_LIMIT" && r.data?.limit === 2, "API refuses a 3rd truck (PLAN_LIMIT, limit 2)", r.message);
      } finally {
        await dd.collection("logistics_assets").deleteOne({ _id: secondId });
      }
    }

    L.sec("5d. Operator #2 goes live on cab");
    await L.goto(op2, "/logistics/driver", ".log-dash-avail-controls");
    await op2.page.waitForSelector(".log-dash-avail-controls select");
    await op2.page.locator('select[aria-label="Set status"]').selectOption("available_now");
    await op2.page.getByRole("button", { name: "Update status" }).click();
    await op2.page.waitForTimeout(2500);

    L.sec("5e. Customer requests a ride (UI)");
    await L.goto(c, "/logistics/post", "form.log-form-card--post");
    await c.page.locator('button.log-cattile[aria-label="Cab"]').click();
    await c.page.locator('.log-when--cab .log-when__opt', { hasText: "Car" }).click();
    await L.pickLocation(c, 0, null);
    await L.pickLocation(c, 1, "Avondale Shopping Centre Harare");
    await c.page.waitForTimeout(1000);
    const fareShown = await c.page.inputValue('input[aria-label="Fare"]');
    L.check(Number(fareShown) >= 3, "fare auto-estimated ≥ car floor $3", fareShown);
    await L.shot(c, "s5-ride-form");
    await c.page.locator('form.log-form-card--post button[type="submit"]').click();
    await c.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 20000 });
    const rideId = c.page.url().match(/jobs\/([a-f0-9]{24})/)[1];
    let job = await d.collection("transport_jobs").findOne({ _id: OID(rideId) });
    L.check(job.job_type === "ride" && job.hub_category === "cab" && job.ride?.cab_class === "car", "ride job saved", { t: job.job_type, h: job.hub_category, r: job.ride });
    st.ride = rideId;

    L.sec("5f. Cab operator quotes; truck operator does not see the ride");
    await L.goto(op2, "/logistics/driver/work");
    await op2.page.waitForTimeout(2000);
    L.check((await L.bodyText(op2)).includes("Avondale") || (await op2.page.locator(`a[href*="${rideId}"]`).count()) > 0, "cab operator sees ride request");
    const op1 = await L.actor("operator");
    await L.seedAuth(op1, { token: st.operator.token, user: st.operator });
    await L.goto(op1, "/logistics/driver/work");
    await op1.page.waitForTimeout(2000);
    L.check((await op1.page.locator(`a[href*="${rideId}"]`).count()) === 0 && !(await L.bodyText(op1)).includes("Avondale"), "truck operator does not see the ride");
    await L.goto(op2, `/logistics/driver/job/${rideId}`);
    await op2.page.waitForSelector('input[aria-label="Quote amount"]', { timeout: 15000 });
    const q = await op2.page.inputValue('input[aria-label="Quote amount"]');
    await op2.page.fill('textarea[placeholder="e.g. Can collect from 7am…"]', "5 min away");
    await op2.page.getByRole("button", { name: /Send my quote/ }).click();
    L.check(await L.waitText(op2, /Quote (sent|submitted)/i), "ride quote sent", q);

    L.sec("5g. Accept → PIN → trip");
    await L.goto(c, `/logistics/jobs/${rideId}`);
    await c.page.getByRole("button", { name: /^Accept / }).first().click({ timeout: 15000 });
    L.check(await L.waitText(c, /Quote accepted/), "ride accepted");
    await c.page.waitForSelector(".log-ride-pin-banner .log-delivery-otp-banner__code", { timeout: 15000 });
    const pin = (await c.page.locator(".log-ride-pin-banner .log-delivery-otp-banner__code").innerText()).replace(/\D/g, "");
    L.check(/^\d{4}$/.test(pin), "rider sees 4-digit PIN right after accept", pin);
    await L.shot(c, "s5-ride-pin");
    await L.goto(op2, `/logistics/driver/job/${rideId}`);
    for (const lbl of ["On the way to pickup", "Arrived at pickup"]) {
      await op2.page.getByRole("button", { name: lbl }).click({ timeout: 15000 });
      await op2.page.waitForTimeout(1500);
    }
    await op2.page.fill('input[aria-label="Ride PIN"]', pin === "1234" ? "4321" : "1234");
    await op2.page.getByRole("button", { name: "Verify & start trip" }).click();
    await op2.page.waitForTimeout(1500);
    job = await d.collection("transport_jobs").findOne({ _id: OID(rideId) });
    L.check(Number(job.status) === 3, "wrong PIN rejected (still Arrived)", job.status);
    await op2.page.fill('input[aria-label="Ride PIN"]', pin);
    await op2.page.getByRole("button", { name: "Verify & start trip" }).click();
    L.check(await L.waitText(op2, /PIN verified/), "PIN verified — trip started");
    await op2.page.getByRole("button", { name: "Complete trip" }).click({ timeout: 15000 });
    await op2.page.waitForTimeout(2000);
    job = await d.collection("transport_jobs").findOne({ _id: OID(rideId) });
    L.check(Number(job.status) === 5, "ride completed without drop-off OTP", job.status);
    await L.shot(op2, "s5-ride-done");

    L.sec("5h. Drop-off geofence (operator ended ~4 km from drop)");
    const rep = await d.collection("logistics_job_reports").findOne({ job_id: OID(rideId) });
    L.check(rep && /suspicious/.test(rep.type || rep.kind || JSON.stringify(rep)), "suspicious_dropoff report created", rep && { t: rep.type, s: rep.status });
    await L.goto(c, `/logistics/jobs/${rideId}`);
    const noIssue = c.page.getByRole("button", { name: "No issue" });
    L.check(await noIssue.count(), "customer prompted: No issue / Report issue");
    if (await noIssue.count()) {
      await noIssue.click();
      await c.page.waitForTimeout(1500);
      const rep2 = await d.collection("logistics_job_reports").findOne({ job_id: OID(rideId) });
      L.check(rep2 && /closed|resolved|no_issue/i.test(rep2.status || ""), "report closed after No issue", rep2 && rep2.status);
    }
    L.check(op1.errors.length === 0, "operator: no errors", op1.errors.slice(0, 5));
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of [o, c, op2].filter(Boolean)) await L.shot(x, "s5-crash");
  }
  for (const x of [o, c, op2].filter(Boolean)) {
    L.check(x.errors.length === 0, `${x.name}: no page/console errors`, x.errors.slice(0, 5));
    L.check(x.apiFails.length === 0, `${x.name}: no 5xx`, x.apiFails);
  }
  L.saveState(st);
  await L.done();
})();
