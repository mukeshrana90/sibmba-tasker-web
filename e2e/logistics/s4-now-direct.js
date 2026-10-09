/* Stage 4 — Now (local) jobs + radius, quote/accept/cancel, edit/remove open job, direct booking, offline block. */
const L = require("./lib");

async function setOperatorStatus(op, state) {
  await L.goto(op, "/logistics/driver", ".log-dash-avail-controls");
  await op.page.waitForSelector(".log-dash-avail-controls select");
  await op.page.locator('select[aria-label="Set status"]').selectOption(state);
  await op.page.getByRole("button", { name: "Update status" }).click();
  await op.page.waitForTimeout(2500);
}

(async () => {
  const st = L.loadState();
  const d = await L.db();
  const OID = (x) => new L.mongoose.Types.ObjectId(x);
  const op = await L.actor("operator");
  const c = await L.actor("customer");
  for (const x of [op, c]) x.page.on("dialog", (dl) => dl.accept());
  try {
    await L.seedAuth(op, { token: st.operator.token, user: st.operator });
    await L.seedAuth(c, { token: st.customer.token, user: st.customer });
    await setOperatorStatus(op, "available_now"); // fresh GPS for local quote rule

    L.sec("4. Now job inside radius (UI)");
    const goodsNow = `E2E now ${st.RUN}`;
    const nowId = await L.postTransportJob(c, { goods: goodsNow, mode: "now", price: "150" });
    let job = await d.collection("transport_jobs").findOne({ _id: OID(nowId) });
    const mins = (new Date(job.expires_at) - new Date(job.createdAt)) / 60000;
    L.check(job.job_class === "local" && job.expires_at, "Now job → job_class local with expires_at", { c: job.job_class, e: job.expires_at });
    L.check(Math.abs(mins - 30) < 1.5, "expires ≈ 30 min after post", mins);
    L.check(Number(job.pickup_radius_km) === 50, "pickup_radius_km = 50", job.pickup_radius_km);
    L.check(await L.waitText(c, /Now — open until/), "customer job page shows 'Now — open until'");
    await L.shot(c, "s4-now-job");

    L.sec("4b. Now job outside radius is hidden (Bulawayo pickup)");
    // pickup in Bulawayo: set customer geolocation there so the picker's default is Bulawayo
    const goodsFar = `E2E far ${st.RUN}`;
    const farId = await L.postTransportJob(c, { goods: goodsFar, mode: "now", price: "150", pickup: "Bulawayo City Hall", drop: "Gwanda" });
    job = await d.collection("transport_jobs").findOne({ _id: OID(farId) });
    L.check(job.pickup?.coordinates?.[1] < -19.5, "far job pickup is in Bulawayo", job.pickup);

    await L.goto(op, "/logistics/driver/work");
    await op.page.waitForTimeout(2500);
    await L.shot(op, "s4-work");
    const wt = await L.bodyText(op);
    L.check(wt.includes(goodsNow), "operator sees Now job within 50 km");
    L.check(!wt.includes(goodsFar), "operator does NOT see Now job 440 km away");

    L.sec("4c. Local quote → accept → customer cancels before collect");
    await L.goto(op, `/logistics/driver/job/${nowId}`);
    await op.page.waitForSelector('input[aria-label="Quote amount"]', { timeout: 15000 });
    await L.typeMoney(op.page, 'input[aria-label="Quote amount"]', "140");
    await op.page.fill('textarea[placeholder="e.g. Can collect from 7am…"]', "Close by, 10 min");
    await op.page.getByRole("button", { name: /Send my quote/ }).click();
    L.check(await L.waitText(op, /Quote (sent|submitted)/i), "local quote accepted by API (fresh GPS within radius)", (await L.bodyText(op)).slice(0, 200));
    await L.goto(c, `/logistics/jobs/${nowId}`);
    await c.page.getByRole("button", { name: /^Accept USD 140/ }).click({ timeout: 15000 });
    L.check(await L.waitText(c, /Quote accepted/), "customer accepted local quote");
    await c.page.getByRole("button", { name: "Cancel job" }).first().click();
    await c.page.waitForTimeout(500);
    await L.shot(c, "s4-cancel-modal");
    await c.page.locator(".modal, [role=dialog]").getByRole("button", { name: "Cancel job" }).click();
    await c.page.waitForTimeout(2000);
    job = await d.collection("transport_jobs").findOne({ _id: OID(nowId) });
    L.check(Number(job.status) === 6, "job cancelled (status 6)", job.status);
    L.check(/Cancelled/.test(await L.bodyText(c)), "customer page shows Cancelled");

    L.sec("4d. Edit + remove an open job");
    await L.goto(c, `/logistics/jobs/${farId}`);
    L.check((await c.page.getByRole("link", { name: "Edit" }).count()) > 0, "open job has Edit");
    await c.page.getByRole("button", { name: "Remove" }).click();
    await c.page.waitForTimeout(2000);
    job = await d.collection("transport_jobs").findOne({ _id: OID(farId) });
    L.check(!job || Number(job.status) < 0 || job.is_deleted || job.deleted_at, "open job removed", job && { s: job.status });

    L.sec("4e. Direct booking from asset page");
    await L.goto(c, `/logistics/asset/${st.truck._id}`);
    await c.page.waitForTimeout(1500);
    await L.shot(c, "s4-asset-detail");
    const book = c.page.getByRole("link", { name: "Book / request quote" });
    L.check(await book.count(), "Book button shown for live, assigned truck");
    await book.click();
    await c.page.waitForSelector(".log-target-banner", { timeout: 15000 });
    L.check((await c.page.locator(".log-when__opt").count()) === 0, "Now/Schedule chooser hidden for direct booking");
    await L.pickLocation(c, 0, null);
    await L.pickLocation(c, 1, "Ruwa");
    await c.page.fill('input[placeholder="e.g. Construction materials"]', `E2E direct ${st.RUN}`);
    await c.page.fill('input[placeholder="8"]', "4");
    const di = c.page.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first();
    await di.click();
    const todayDisabled = await c.page.locator(".react-datepicker__day--today").first().getAttribute("aria-disabled");
    L.check(todayDisabled === "true", "today not selectable for direct booking", todayDisabled);
    await c.page.keyboard.press("Escape");
    await L.pickDate(c.page, di, 1, 10);
    await L.typeMoney(c.page, 'input[aria-label="Price"]', "220");
    await c.page.locator('form.log-form-card--post button[type="submit"]').click();
    await c.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 20000 });
    const dId = c.page.url().match(/jobs\/([a-f0-9]{24})/)[1];
    job = await d.collection("transport_jobs").findOne({ _id: OID(dId) });
    L.check(String(job.targeted_asset_id) === st.truck._id && job.job_class === "corridor", "direct job targets the truck, corridor", { t: job.targeted_asset_id, c: job.job_class });
    await L.goto(op, "/logistics/driver/work");
    await op.page.waitForTimeout(2000);
    L.check((await L.bodyText(op)).includes(`E2E direct ${st.RUN}`), "operator sees direct booking");
    st.directJob = dId;

    L.sec("4f. Offline operator blocks booking");
    await setOperatorStatus(op, "offline");
    await L.goto(c, `/logistics/asset/${st.truck._id}`);
    await c.page.waitForTimeout(1500);
    L.check((await c.page.getByRole("link", { name: "Book / request quote" }).count()) === 0, "no Book button when operator offline");
    L.check(/offline|not online/i.test(await L.bodyText(c)), "blocked reason shown");
    await L.shot(c, "s4-offline");
    await setOperatorStatus(op, "available_now");
    await L.goto(c, `/logistics/asset/${st.truck._id}`);
    await c.page.waitForTimeout(1500);
    L.check(await c.page.getByRole("link", { name: "Book / request quote" }).count(), "operator back live → Book shown again");
    L.check(!/Operator went offline/.test(await L.bodyText(c)), "no stale 'Operator went offline' note once live");
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of [op, c]) await L.shot(x, "s4-crash");
  }
  for (const x of [op, c]) {
    L.check(x.errors.length === 0, `${x.name}: no page/console errors`, x.errors.slice(0, 5));
    L.check(x.apiFails.length === 0, `${x.name}: no 5xx`, x.apiFails);
  }
  L.saveState(st);
  await L.done();
})();
