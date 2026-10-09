/* Stage 3 — operator goes live; customer posts Schedule job (UI); operator quotes; customer accepts;
   operator runs status 1→5 with the delivery OTP read off the customer's screen; customer reviews; owner sees it. */
const L = require("./lib");


(async () => {
  const st = L.loadState();
  const d = await L.db();
  const { ObjectId } = L.mongoose.Types;
  const op = await L.actor("operator");
  const o = await L.actor("owner");
  let c;
  try {
    // ── operator live
    L.sec("3. Operator goes live (UI)");
    await L.seedAuth(op, { token: st.operator.token, user: st.operator });
    await L.goto(op, "/logistics/driver", ".log-dash-avail-controls");
    await op.page.waitForSelector('select[aria-label="Set status"]', { timeout: 15000 });
    await op.page.locator('select[aria-label="Set status"]').selectOption("available_now");
    await op.page.getByRole("button", { name: "Update status" }).click();
    await op.page.waitForTimeout(3000);
    await L.shot(op, "s3-live");
    let a = await d.collection("logistics_assets").findOne({ _id: new ObjectId(st.truck._id) });
    L.check(a.availability_state === "available_now" || a.operator_state === "available_now" || JSON.stringify(a).includes("available_now"), "truck state = available_now in DB", a.availability_state);
    const opU = await d.collection("users").findOne({ _id: new ObjectId(st.operator._id) });
    L.check(JSON.stringify(opU).includes("available_now") || a.live_location || a.current_location, "operator GPS/live recorded", Object.keys(a).filter((k) => /live|loc|state/i.test(k)));

    // ── customer
    L.sec("3b. Customer: hub, search, post Schedule job (UI)");
    st.customer = await L.makeCustomer(`cust.${st.RUN}`);
    c = await L.actor("customer");
    await L.seedAuth(c, { token: st.customer.token, user: st.customer });
    await L.goto(c, "/logistics");
    await L.shot(c, "s3-hub");
    L.check(/logistic|truck|post|search/i.test(await L.bodyText(c)), "hub home renders");
    await L.goto(c, "/logistics/search");
    await c.page.fill('input[placeholder="Name"]', st.truck.name);
    await c.page.getByRole("button", { name: /Search trucks/ }).click();
    await c.page.waitForTimeout(3000);
    await L.shot(c, "s3-search");
    const searchTxt = await L.bodyText(c);
    L.check(searchTxt.includes(st.truck.name), "new truck (assigned + live) appears in search", searchTxt.slice(0, 300));

    L.sec("3b2. Weight is capped at the chosen Vehicle needed (UI + API)");
    await L.goto(c, "/logistics/post", "form.log-form-card--post");
    const vSel = L.vehicleSelect(c.page);
    const wIn = c.page.locator('input[placeholder="8"]');
    const wUnit = c.page.locator('select[aria-label="Weight unit"]');
    await vSel.selectOption("4 ton");
    L.check(await L.waitText(c, /Up to 4 tons for Vehicle needed/), "hint: up to 4 tons for 4 ton");
    await wIn.fill("8");
    L.check((await wIn.inputValue()) === "4", "8 t on a 4 ton vehicle is capped to 4", await wIn.inputValue());
    L.check(await L.waitText(c, /takes up to 4 tons/), "toast explains the 4 ton limit");
    L.check((await vSel.inputValue()) === "4 ton", "Vehicle needed is not silently changed", await vSel.inputValue());
    await wUnit.selectOption("kg");
    await wIn.fill("5000");
    L.check((await wIn.inputValue()) === "4000", "5000 kg on a 4 ton vehicle is capped to 4000 kg", await wIn.inputValue());
    await wIn.fill("3500");
    L.check((await wIn.inputValue()) === "3500", "3500 kg fits a 4 ton vehicle", await wIn.inputValue());
    await wUnit.selectOption("tons");
    L.check((await wIn.inputValue()) === "4", "switching 3500 kg → tons caps to 4 t", await wIn.inputValue());
    await vSel.selectOption("10 ton");
    await wIn.fill("8");
    L.check((await wIn.inputValue()) === "8", "8 t allowed after picking 10 ton", await wIn.inputValue());
    const smaller = await vSel.locator("option").allInnerTexts();
    L.check(!smaller.includes("4 ton") && !smaller.includes("below 2 ton"), "sizes too small for 8 t are not offered", smaller);
    await L.shot(c, "s3-weight-cap");
    // server enforces the same rule (kg converted to tons first)
    const base = { job_type: "transport", job_class: "corridor", load_type: "E2E cap", pickup: { address: "Harare", coordinates: [31.0522, -17.8292] }, dropoff: { address: "Ruwa", coordinates: [31.2447, -17.8897] }, when_needed: new Date(Date.now() + 20 * 86400000).toISOString(), budget: { amount: 300, currency: "USD" }, special_notes: "Vehicle: 4 ton" };
    const over = await L.api("POST", "/logistics/job", { token: st.customer.token, body: { ...base, load_weight: { value: 5000, unit: "kg" } } });
    L.check(over.success === false && /exceeds 4 ton capacity \(max 4 tons\)/.test(over.message || ""), "API rejects 5000 kg on a 4 ton vehicle", over.message || over);

    L.sec("3b3. Dated jobs start tomorrow — today only via Now (UI + API)");
    await L.goto(c, "/logistics/post", "form.log-form-card--post");
    await c.page.locator(".log-when__opt", { hasText: "Schedule" }).click();
    L.check(await L.waitText(c, /Schedule is for tomorrow or later\. Need it today\? Choose Now\./), "Schedule hint points to Now for today");
    const whenIn = c.page.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first();
    await whenIn.click();
    await c.page.waitForSelector(".log-datepicker");
    L.check((await c.page.locator(".log-datepicker .react-datepicker__day--today").first().getAttribute("aria-disabled")) === "true", "Schedule: today not selectable");
    L.check((await c.page.locator(".log-datepicker .react-datepicker__today-button").count()) === 0, "Schedule: no Today button");
    await L.shot(c, "s3-schedule-tomorrow");
    await c.page.keyboard.press("Escape");
    await c.page.getByText("Agricultural", { exact: true }).first().click();
    const fromIn = c.page.locator(".log-field").filter({ hasText: "From" }).locator(".log-dp-field input").first();
    await fromIn.click();
    await c.page.waitForSelector(".log-datepicker");
    L.check((await c.page.locator(".log-datepicker .react-datepicker__day--today").first().getAttribute("aria-disabled")) === "true", "equipment hire: today not selectable");
    await c.page.keyboard.press("Escape");
    const todayUtc = new Date().toISOString().slice(0, 10);
    const tToday = await L.api("POST", "/logistics/job", { token: st.customer.token, body: { ...base, special_notes: "Vehicle: 6 ton", load_weight: { value: 5, unit: "tons" }, when_needed: todayUtc } });
    L.check(tToday.success === false && /tomorrow or later — choose Now for today/.test(tToday.message || ""), "API rejects a Schedule post dated today", tToday.message || tToday);

    const jobId = await L.postTransportJob(c, { goods: `E2E cement ${st.RUN}` });
    st.job = { _id: jobId };
    let job = await d.collection("transport_jobs").findOne({ _id: new ObjectId(jobId) });
    L.check(job && job.job_class === "corridor", "Schedule job saved as corridor", job && job.job_class);
    L.check(job && job.pickup?.address && job.dropoff?.address && job.pickup.address !== job.dropoff.address, "distinct pickup/dropoff addresses saved", { p: job?.pickup?.address, d: job?.dropoff?.address });
    await L.shot(c, "s3-job-detail");

    // ── truck capacity vs job weight (job = 5 t)
    L.sec("3b4. Truck too small for the goods → no quote (UI + API)");
    {
      const assets = d.collection("logistics_assets");
      const truckOid = new ObjectId(st.truck._id);
      const truck0 = await assets.findOne({ _id: truckOid });
      const bigId = new ObjectId();
      await assets.updateOne({ _id: truckOid }, { $set: { capacity: { value: 2, unit: "tons" } } });
      try {
        // only a 2 t truck → can't quote at all
        await L.goto(op, `/logistics/driver/job/${jobId}`);
        await op.page.waitForFunction(() => /carries up to/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
        let t = await L.bodyText(op);
        L.check(/This job needs 5 t but .* carries up to 2 t\. None of your trucks can carry this load/.test(t), "2 t truck on a 5 t job: told it can't quote", t.slice(0, 200));
        L.check(!(await op.page.locator('input[aria-label="Quote amount"]').count()), "quote form hidden");
        await L.shot(op, "s3-truck-too-small");
        let r = await L.api("POST", `/logistics/job/${jobId}/quote`, { token: L.tokenFor(st.operator._id), body: { asset_id: st.truck._id, amount: 280, message: "x" } });
        L.check(r.success === false && r.data?.code === "TRUCK_TOO_SMALL" && r.data?.need_tons === 5 && r.data?.capacity_tons === 2 && !r.data?.better_assets?.length, "API refuses: TRUCK_TOO_SMALL, no bigger truck", r.message);
        // a bigger truck assigned to the same operator → told to switch to it
        await assets.insertOne({ ...truck0, _id: bigId, name: `E2E Big truck ${st.RUN}`, registration: `BG${st.RUN}`.toUpperCase().slice(0, 10), capacity: { value: 16, unit: "tons" }, is_featured: false, createdAt: new Date(), updatedAt: new Date() });
        await L.goto(op, `/logistics/driver/job/${jobId}`);
        await op.page.waitForFunction(() => /Switch Using now/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
        t = await L.bodyText(op);
        L.check(new RegExp(`Switch Using now to E2E Big truck ${st.RUN} .* up to 16 t`).test(t), "bigger truck assigned: told to switch to it", t.slice(0, 300));
        L.check(await op.page.getByRole("link", { name: "Open dashboard" }).count(), "Open dashboard button shown (to switch Using now)");
        r = await L.api("POST", `/logistics/job/${jobId}/quote`, { token: L.tokenFor(st.operator._id), body: { asset_id: st.truck._id, amount: 280, message: "x" } });
        L.check(r.success === false && r.data?.better_assets?.[0]?._id === String(bigId), "API names the bigger truck (better_assets)", r.data);
        L.check(!(await d.collection("logistics_quotes").countDocuments({ job_id: new ObjectId(jobId) })), "no quote was saved");
      } finally {
        await assets.deleteOne({ _id: bigId });
        await assets.updateOne({ _id: truckOid }, truck0.capacity ? { $set: { capacity: truck0.capacity } } : { $unset: { capacity: "" } });
      }
    }

    // ── operator quotes
    L.sec("3c. Operator sees opportunity + quotes (UI)");
    await L.goto(op, "/logistics/driver/work");
    await op.page.waitForTimeout(2500);
    await L.shot(op, "s3-work");
    L.check((await L.bodyText(op)).includes(`E2E cement ${st.RUN}`), "job listed in operator Opportunities");
    await L.goto(op, `/logistics/driver/job/${jobId}`);
    await op.page.waitForSelector('input[aria-label="Quote amount"]', { timeout: 15000 });
    const shown = await L.typeMoney(op.page, 'input[aria-label="Quote amount"]', "280");
    L.check(shown === "280.00", "quote field shows 280.00", shown);
    await op.page.fill('textarea[placeholder="e.g. Can collect from 7am…"]', "E2E quote");
    await L.shot(op, "s3-quote-form");
    await op.page.getByRole("button", { name: /Send my quote|Send new quote|Update quote/ }).last().click();
    L.check(await L.waitText(op, /Quote (sent|submitted)|quoted/i), "quote sent");
    await op.page.waitForTimeout(1000);
    const qt = await d.collection("logistics_quotes").findOne({ job_id: new ObjectId(jobId) });
    L.check(qt && String(qt.driver_id) === st.operator._id && qt.amount?.value === 280, "quote row by operator, USD 280", qt && { d: qt.driver_id, amt: qt.amount });

    // ── owner can view but not quote
    L.sec("3d. Owner is view-only on the job");
    await L.seedAuth(o, { token: st.owner.token, user: st.owner });
    await L.goto(o, `/logistics/owner/job/${jobId}`);
    await o.page.waitForTimeout(2500);
    await L.shot(o, "s3-owner-job");
    L.check((await o.page.locator('input[aria-label="Quote amount"]').count()) === 0, "owner has no quote form");

    // ── customer accepts
    L.sec("3e. Customer accepts quote (UI)");
    await L.goto(c, `/logistics/jobs/${jobId}`);
    const acc = c.page.getByRole("button", { name: /^Accept USD 280/ });
    await acc.first().waitFor({ timeout: 15000 });
    await acc.first().click();
    L.check(await L.waitText(c, /Quote accepted/), "Quote accepted toast");
    job = await d.collection("transport_jobs").findOne({ _id: new ObjectId(jobId) });
    L.check(Number(job.status) === 1 && String(job.assigned?.driver_id) === st.operator._id && String(job.assigned?.asset_id) === st.truck._id, "job status 1, assigned operator + truck", { s: job.status, a: job.assigned });

    // ── operator runs the job
    L.sec("3f. Operator advances status + delivery OTP (UI)");
    await L.goto(op, `/logistics/driver/job/${jobId}`);
    for (const lbl of ["Confirm en route to pickup", "Confirm arrival at pickup", "Start delivery"]) {
      const b = op.page.getByRole("button", { name: lbl });
      await b.waitFor({ timeout: 15000 });
      await b.click();
      await op.page.waitForTimeout(1500);
    }
    job = await d.collection("transport_jobs").findOne({ _id: new ObjectId(jobId) });
    L.check(Number(job.status) === 4, "status reached 4 (in transit)", job.status);
    await L.shot(op, "s3-in-transit");
    // next action sends OTP
    const nextBtn = op.page.locator(".logistics-cta--primary").filter({ hasText: /deliver|complete|OTP/i }).first();
    await nextBtn.click();
    await op.page.waitForTimeout(1500);
    await L.goto(c, `/logistics/jobs/${jobId}`);
    const otpEl = c.page.locator(".log-delivery-otp-banner__code").last();
    await otpEl.waitFor({ timeout: 15000 });
    const otp = (await otpEl.innerText()).replace(/\D/g, "");
    L.check(/^\d{4}$/.test(otp), "customer sees 4-digit delivery OTP", otp);
    await L.shot(c, "s3-customer-otp");
    await op.page.fill('input[aria-label="Delivery OTP"]', "0000" === otp ? "1111" : "0000");
    await op.page.locator("form.log-delivery-otp button[type=submit]").click();
    await op.page.waitForTimeout(1500);
    job = await d.collection("transport_jobs").findOne({ _id: new ObjectId(jobId) });
    L.check(Number(job.status) === 4, "wrong OTP rejected (still 4)", job.status);
    await op.page.fill('input[aria-label="Delivery OTP"]', otp);
    await op.page.locator("form.log-delivery-otp button[type=submit]").click();
    L.check(await L.waitText(op, /Delivery confirmed/), "Delivery confirmed toast");
    job = await d.collection("transport_jobs").findOne({ _id: new ObjectId(jobId) });
    L.check(Number(job.status) === 5, "job status 5 (delivered)", job.status);

    // ── customer review
    L.sec("3g. Customer reviews (UI)");
    await L.goto(c, `/logistics/jobs/${jobId}`);
    await c.page.waitForSelector("form.log-job-review", { timeout: 15000 });
    await c.page.locator(".log-job-review__stars button").nth(3).click();
    await c.page.fill('textarea[placeholder="Optional review message"]', "Great e2e delivery");
    await c.page.getByRole("button", { name: "Submit review" }).click();
    L.check(await L.waitText(c, /Thanks for your review/), "review submitted");
    await L.goto(c, "/logistics/jobs");
    await c.page.waitForTimeout(1500);
    await L.shot(c, "s3-my-jobs");
    L.check((await L.bodyText(c)).includes(`E2E cement ${st.RUN}`), "job in customer My jobs");

    // ── owner side visibility
    L.sec("3h. Owner sees job + earnings");
    await L.goto(o, "/logistics/owner/jobs");
    await o.page.waitForTimeout(1500);
    L.check((await L.bodyText(o)).includes(`E2E cement ${st.RUN}`), "job in owner Jobs");
    await L.goto(o, "/logistics/owner/earnings");
    await o.page.waitForTimeout(1500);
    await L.shot(o, "s3-owner-earnings");
    const et = await L.bodyText(o);
    L.check(/USD 280\b/.test(et) && /USD 224\b/.test(et) && /USD 56\b/.test(et), "owner earnings: total 280, owner 224, operator 20% = 56", et.slice(0, 300));
    await L.goto(op, "/logistics/driver/jobs");
    await op.page.waitForTimeout(1500);
    L.check((await L.bodyText(op)).includes(`E2E cement ${st.RUN}`), "job in operator My jobs");
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of [op, o, c].filter(Boolean)) await L.shot(x, "s3-crash");
  }
  for (const x of [op, o, c].filter(Boolean)) {
    L.check(x.errors.length === 0, `${x.name}: no page/console errors`, x.errors.slice(0, 5));
    L.check(x.apiFails.length === 0, `${x.name}: no 5xx`, x.apiFails);
  }
  L.saveState(st);
  await L.done();
})();
