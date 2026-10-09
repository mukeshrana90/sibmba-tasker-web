/* Stage 6 — emergency contacts, SOS (customer + operator → owner), subscription, feature pin, plant add, document expiry blocks. */
const L = require("./lib");

async function holdSos(a) {
  const pill = a.page.locator('button.log-sos-pill:visible');
  if (await pill.count()) await pill.first().click();
  else {
    await a.page.locator('[aria-haspopup="true"]:visible').last().click();
    await a.page.locator("button.log-sos-menu-item").click();
  }
  await a.page.waitForSelector(".log-sos-hold", { timeout: 10000 });
  const box = await a.page.locator(".log-sos-hold").boundingBox();
  await a.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await a.page.mouse.down();
  await a.page.waitForTimeout(3600);
  await a.page.mouse.up();
  await a.page.waitForTimeout(2500);
}

(async () => {
  const st = L.loadState();
  const d = await L.db();
  const OID = (x) => new L.mongoose.Types.ObjectId(x);
  const o = await L.actor("owner");
  const c = await L.actor("customer");
  const op = await L.actor("operator");
  try {
    await L.seedAuth(o, { token: st.owner.token, user: st.owner });
    await L.seedAuth(c, { token: st.customer.token, user: st.customer });
    await L.seedAuth(op, { token: st.operator.token, user: st.operator });

    L.sec("6. Customer emergency contacts (UI)");
    await L.goto(c, "/logistics/emergency-contacts", "form");
    await c.page.fill('input[placeholder="e.g. Rudo Moyo"]', "Rudo E2E");
    await c.page.fill('input[placeholder="e.g. Spouse, brother"]', "Sister");
    const ph = c.page.locator("form input[type=tel]").first();
    await ph.click(); await ph.press("End"); await ph.pressSequentially("772000111", { delay: 15 });
    await c.page.fill('input[placeholder="name@example.com"]', `rudo.${st.RUN}@e2e.example.com`);
    await c.page.getByRole("button", { name: "Save contacts" }).click();
    L.check(await L.waitText(c, /saved/i), "contacts saved toast", (await L.bodyText(c)).slice(0, 200));
    const cu = await d.collection("users").findOne({ _id: OID(st.customer._id) });
    L.check(JSON.stringify(cu).includes("Rudo E2E"), "contact stored on user");

    // v2.7.34: the other party on the job is never told about an SOS
    const sosToOther = async (otherId, since) =>
      d.collection(" notifications").countDocuments({ receiver_id: OID(otherId), type: { $in: ["LOGISTICS_SOS", "LOGISTICS_SOS_UPDATE"] }, createdAt: { $gte: since } });

    L.sec("6b. Customer SOS (hold 3 s)");
    await L.goto(c, `/logistics/jobs/${st.directJob}`);
    const tCust = new Date();
    await holdSos(c);
    await L.shot(c, "s6-customer-sos");
    let al = await d.collection("logistics_sos_alerts").find({ user_id: OID(st.customer._id) }).sort({ createdAt: -1 }).limit(1).toArray();
    L.check(al.length === 1, "customer SOS alert stored", al[0] && { s: al[0].status, loc: al[0].location });
    L.check(/sent|alerted|help/i.test(await L.bodyText(c)), "SOS sent confirmation shown");
    const custSheet = await L.bodyText(c);
    L.check(!/other party on your job alerted/i.test(custSheet), "sheet doesn't say the other party was alerted");
    if (al[0]?.job_id) L.check(/The operator on your job is not told about this SOS/.test(custSheet), "sheet: 'The operator on your job is not told'");
    const safe = c.page.getByRole("button", { name: /safe/i });
    if (await safe.count()) { await safe.first().click(); L.check(await L.waitText(c, /Marked safe/), "customer marked safe"); }
    await c.page.waitForTimeout(1500);
    al = await d.collection("logistics_sos_alerts").find({ user_id: OID(st.customer._id) }).sort({ createdAt: -1 }).limit(1).toArray();
    L.check(!(al[0]?.notifications_log || []).some((r) => r.target === "other_party"), "customer SOS: no delivery to the other party", al[0]?.notifications_log?.map((r) => r.target));
    const opGot = al[0]?.other_party_id ? await sosToOther(al[0].other_party_id, tCust) : await sosToOther(st.operator._id, tCust);
    L.check(opGot === 0, `customer SOS: operator got no SOS notification (incl. 'marked safe')${al[0]?.other_party_id ? "" : " — no operator on that job"}`, opGot);

    L.sec("6c. Operator SOS → owner dashboard banner + SOS page");
    await L.goto(op, "/logistics/driver");
    const tOp = new Date();
    await holdSos(op);
    al = await d.collection("logistics_sos_alerts").find({ user_id: OID(st.operator._id) }).sort({ createdAt: -1 }).limit(1).toArray();
    L.check(al.length === 1, "operator SOS alert stored");
    await op.page.waitForTimeout(1500);
    al = await d.collection("logistics_sos_alerts").find({ user_id: OID(st.operator._id) }).sort({ createdAt: -1 }).limit(1).toArray();
    L.check(!(al[0]?.notifications_log || []).some((r) => r.target === "other_party"), "operator SOS: no delivery to the other party");
    const custGot = await sosToOther(al[0]?.other_party_id || st.customer._id, tOp);
    L.check(custGot === 0, `operator SOS: customer got no SOS notification${al[0]?.other_party_id ? "" : " — no customer job active"}`, custGot);
    L.check(al[0]?.notifications_log?.some((r) => r.target === "owner" && r.ok), "operator SOS: fleet owner still alerted");
    await L.goto(o, "/logistics/owner");
    await o.page.waitForTimeout(2000);
    await L.shot(o, "s6-owner-sos-banner");
    L.check(/SOS/i.test(await L.bodyText(o)) && (await L.bodyText(o)).includes(`E2E Operator ${st.RUN}`), "owner dashboard shows operator SOS banner");
    await L.goto(o, "/logistics/owner/sos");
    await o.page.waitForTimeout(1500);
    L.check((await L.bodyText(o)).includes(`E2E Operator ${st.RUN}`), "owner SOS page lists the alert");
    await L.shot(o, "s6-owner-sos-page");

    L.sec("6d. Subscription — paid plans off: details hidden, blurred coming-soon card");
    await L.goto(o, "/logistics/owner/subscription");
    await o.page.waitForTimeout(1500);
    const subTxt = await L.bodyText(o);
    L.check(/Current plan/.test(subTxt), "Free shown as current plan");
    L.check(await o.page.locator(".log-sub-plan--soon .log-sub-plan__blur").count(), "paid plans shown as one blurred card");
    L.check(/Coming soon/i.test(subTxt) && /Paid plans will be available soon/.test(subTxt), "coming-soon note on the card");
    const blurCss = await o.page.locator(".log-sub-plan__blur").first().evaluate((e) => getComputedStyle(e).filter).catch(() => "");
    L.check(/blur/.test(blurCss), "placeholder content is blurred", blurCss);
    L.check(!/USD 25|Unlimited operators|Upgrade to Paid/.test(subTxt), "no paid price / limits / Upgrade button on the page", subTxt.slice(0, 300));
    const subApi = await L.api("GET", "/logistics/subscription", { token: st.owner.token || L.tokenFor(st.owner._id) });
    const paidRow = (subApi.data?.plans || []).find((p) => p.id === "paid");
    L.check(paidRow && paidRow.coming_soon === true && paidRow.price === null && paidRow.limits === null && !paidRow.features.length, "API sends paid plan without price / limits / features", paidRow);
    const tryPaid = await L.api("POST", "/logistics/subscription/plan", { token: st.owner.token || L.tokenFor(st.owner._id), body: { plan: "paid" } });
    L.check(tryPaid.success === false && tryPaid.data?.code === "PLAN_UNAVAILABLE", "API still refuses to activate Paid", tryPaid.message);
    await L.goto(o, "/logistics/owner/fleet");
    await o.page.waitForTimeout(1500);
    L.check(/Paid plans coming soon/.test(await L.bodyText(o)) && !(await o.page.locator(".log-plan-banner__cta").count()), "fleet banner: 'Paid plans coming soon', no Upgrade button");
    await L.goto(o, "/logistics/owner/subscription");
    await o.page.waitForTimeout(1000);
    await L.shot(o, "s6-subscription");

    L.sec("6d2. Plan usage rows open the active-units picker");
    const d6 = await L.db();
    const { ObjectId } = L.mongoose.Types;
    const truckDoc = await d6.collection("logistics_assets").findOne({ _id: new ObjectId(st.truck._id) });
    const spareId = new ObjectId();
    const spare2Id = new ObjectId();
    // Free allows 2 trucks: real truck + 2 plan-locked spares = 3 → over the limit
    await d6.collection("logistics_assets").insertOne({ ...truckDoc, _id: spare2Id, name: `E2E spare2 truck ${st.RUN}`, registration: `S2${st.RUN}`.toUpperCase().slice(0, 10), plan_locked: true, is_active: 0, is_featured: false, assigned_sub_user_ids: [], createdAt: new Date(), updatedAt: new Date() });
    await d6.collection("logistics_assets").insertOne({ ...truckDoc, _id: spareId, name: `E2E spare truck ${st.RUN}`, registration: `SP${st.RUN}`.toUpperCase().slice(0, 10), plan_locked: true, is_active: 0, is_featured: false, assigned_sub_user_ids: truckDoc.assigned_sub_user_ids || [], availability: { ...(truckDoc.availability || {}), state: "offline" }, createdAt: new Date(), updatedAt: new Date() });
    try {
      await L.goto(o, "/logistics/owner/subscription");
      await o.page.waitForTimeout(1200);
      const row = (label) => o.page.locator(".log-sub-usage__row", { hasText: label }).first();
      await row("Logistic trucks").click();
      await o.page.waitForSelector(".log-plan-units", { timeout: 10000 });
      await o.page.waitForFunction(() => { const m = document.querySelector(".log-plan-units"); return m && !m.querySelector(".log-sk, .log-sk-wrap") && m.querySelector(".log-plan-units__bucket, .log-plan-units__none, .log-plan-units__unit"); }, null, { timeout: 15000 });
      let mt = await o.page.locator(".log-plan-units").innerText();
      L.check(/Choose active logistic trucks/.test(mt) && !/Non-logistic equipment/i.test(mt.replace(/Pick which.*$/m, "")), "trucks row → picker with only Logistic trucks", mt.slice(0, 200));
      L.check(mt.includes(st.truck.name) && mt.includes(`E2E spare truck ${st.RUN}`) && mt.includes(`E2E spare2 truck ${st.RUN}`), "all 3 trucks listed (3 / 2 over the limit)");
      L.check(/2 \/ 2 active/.test(mt), "shows 2 / 2 active (Free = 2 trucks)");
      const boxes = o.page.locator(".log-plan-units input[type=checkbox]");
      L.check((await boxes.count()) === 3 && !(await boxes.first().isDisabled()), "truck checkboxes can be changed");
      const offUnit = o.page.locator(".log-plan-units__unit:not(.is-on)").first();
      const offName = (await offUnit.locator("b").innerText()).trim();
      await offUnit.click();
      mt = await o.page.locator(".log-plan-units").innerText();
      L.check(/2 \/ 2 active/.test(mt) && (await o.page.locator(".log-plan-units__unit.is-on", { hasText: offName }).count()) === 1, "picking the disabled truck swaps it in (limit 2 kept)", offName);
      L.check(await o.page.getByRole("button", { name: "Save active units" }).count(), "Save active units button shown");
      await L.shot(o, "s6-usage-trucks-picker");
      await o.page.getByRole("button", { name: "Go back" }).click();
      await o.page.waitForSelector(".log-plan-units", { state: "detached", timeout: 5000 });

      await row("Non-logistic equipment").click();
      await o.page.waitForSelector(".log-plan-units");
      await o.page.waitForFunction(() => { const m = document.querySelector(".log-plan-units"); return m && !m.querySelector(".log-sk, .log-sk-wrap") && m.querySelector(".log-plan-units__bucket, .log-plan-units__none, .log-plan-units__unit"); }, null, { timeout: 15000 });
      mt = await o.page.locator(".log-plan-units").innerText();
      L.check(/Choose active non-logistic equipment/.test(mt) && /fit in the Free plan|No non-logistic equipment yet/.test(mt), "equipment row → its units (all fit) or none yet, read-only", mt.slice(0, 300));
      L.check(!(await o.page.getByRole("button", { name: "Save active units" }).count()) && (await o.page.locator(".log-reason-modal__actions button", { hasText: "Close" }).count()), "nothing to choose → Close only");
      await o.page.locator(".log-reason-modal__actions button", { hasText: "Close" }).click();

      await row("Operators").click();
      await o.page.waitForSelector(".log-plan-units");
      await o.page.waitForFunction(() => { const m = document.querySelector(".log-plan-units"); return m && !m.querySelector(".log-sk, .log-sk-wrap") && m.querySelector(".log-plan-units__bucket, .log-plan-units__none, .log-plan-units__unit"); }, null, { timeout: 15000 });
      mt = await o.page.locator(".log-plan-units").innerText();
      L.check(/Operator seats/.test(mt) && mt.includes(`E2E Operator ${st.RUN}`) && /2 \/ 2 used/.test(mt), "operators row → operator seats (2 / 2 used)", mt.slice(0, 300));
      L.check(/never switches operators off/.test(mt), "explains operators are never disabled");
      await L.shot(o, "s6-usage-operators");
      await o.page.getByRole("link", { name: "Manage operators" }).click();
      await o.page.waitForURL(/\/logistics\/owner\/operators/, { timeout: 10000 });
      L.check(true, "Manage operators opens the Operators page");

      await L.goto(o, "/logistics/owner/subscription");
      await o.page.waitForTimeout(1000);
      await row("Cabs").press("Enter");
      await o.page.waitForSelector(".log-plan-units");
      L.check(/Choose active cabs/.test(await o.page.locator(".log-plan-units").innerText()), "cabs row opens with the keyboard (Enter)");
      await o.page.keyboard.press("Escape");

      // Operator side: the plan-disabled spare is listed but can't be picked
      const opv = await L.actor("operator-plan");
      await L.seedAuth(opv, { token: L.tokenFor(st.operator._id), user: { _id: st.operator._id, role: 4, owner_id: st.owner._id } });
      await L.goto(opv, "/logistics/driver", ".log-unit-pick__btn");
      await opv.page.waitForTimeout(1500);
      const pickBtn = opv.page.locator(".log-unit-pick__btn");
      L.check((await pickBtn.innerText()).includes(st.truck.name) && (await pickBtn.locator(".log-unit-pick__icon--logistic svg").count()), "a usable truck is preselected, with its truck icon");
      await pickBtn.click();
      await opv.page.waitForSelector(".log-unit-pick__list");
      const spareOpt = opv.page.locator(".log-unit-pick__opt", { hasText: `E2E spare truck ${st.RUN}` });
      L.check(await spareOpt.count(), "spare truck listed in Using now");
      L.check((await spareOpt.getAttribute("aria-disabled")) === "true", "plan-disabled truck is not selectable (aria-disabled)");
      L.check(/Owner's plan limit/.test(await spareOpt.innerText()), "it shows an 'Owner's plan limit' chip", await spareOpt.innerText());
      L.check(await opv.page.locator(".log-unit-pick__group--off .log-unit-pick__opt", { hasText: `E2E spare truck ${st.RUN}` }).count(), "it sits in the 'Disabled by your owner — not selectable' group");
      L.check(await opv.page.locator(".log-unit-pick__group-label", { hasText: "Logistic trucks" }).count(), "usable units grouped by category ('Logistic trucks')");
      L.check(await opv.page.locator(".log-unit-pick__opt .log-unit-pick__icon svg").count() >= 2, "every unit has a category icon");
      await L.shot(opv, "s6-operator-unit-picker");
      // force: Playwright won't click an aria-disabled row on its own — a user still can
      await spareOpt.click({ force: true });
      L.check(!(await pickBtn.innerText()).includes("E2E spare truck"), "clicking the disabled truck does nothing");
      await opv.page.keyboard.press("Escape");
      const strip = await opv.page.locator(".log-plan-locked-strip--op").innerText().catch(() => "");
      L.check(strip.includes(`E2E spare truck ${st.RUN}`) && /plan limit/.test(strip), "strip names the disabled truck", strip);
      L.check(!opv.errors.length, "operator dashboard: no console errors", opv.errors);
      await opv.ctx.close();
    } finally {
      await d6.collection("logistics_assets").deleteMany({ _id: { $in: [spareId, spare2Id] } });
    }

    L.sec("6e. Hub feature pin locked on Free");
    await L.goto(o, "/logistics/owner/fleet");
    await o.page.waitForTimeout(1500);
    L.check(await o.page.locator(".log-feature-note.is-locked").count(), "feature note shown as locked (Free plan)");

    L.sec("6f. Owner adds plant equipment (UI)");
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await o.page.locator('form.log-fleet-form button.log-cattile[aria-label="Agricultural"]').click();
    await o.page.fill('input[placeholder="JD Compact 1"]', `E2E Tractor ${st.RUN}`);
    await o.page.fill('input[placeholder="John Deere"]', "John Deere");
    await o.page.locator(".log-location-btn").first().click();
    await o.page.waitForSelector(".simba-book-loc-modal");
    await o.page.waitForTimeout(2500);
    await o.page.locator(".simba-book-loc-modal .btn-primary").click();
    const priceSel = 'input[aria-label="Price per day"], input[aria-label="Price per hour"]';
    if (await o.page.locator(priceSel).count()) await L.typeMoney(o.page, priceSel, "120");
    await o.page.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Equipment added/), "Equipment added toast", (await L.bodyText(o)).slice(0, 250));
    const tr = await d.collection("logistics_assets").findOne({ owner_id: OID(st.owner._id), kind: "equipment" });
    L.check(tr && tr.price_hint?.unit, "plant saved with rate unit", tr && tr.price_hint);
    await L.goto(o, "/logistics/owner/equipment");
    await o.page.waitForTimeout(1500);
    L.check((await L.bodyText(o)).includes(`E2E Tractor ${st.RUN}`), "tractor listed on Equipment page");

    L.sec("6g. Expired unit document blocks the truck");
    const tid = OID(st.truck._id);
    const asset = await d.collection("logistics_assets").findOne({ _id: tid });
    const docs = asset.documents;
    const expField = ["expires_at", "expires", "expiry"].find((k) => docs[0][k] !== undefined) || "expires_at";
    const past = new Date(Date.now() - 3 * 86400000);
    const expired = docs.map((x) => (x.type === "insurance" ? { ...x, [expField]: past } : x));
    await d.collection("logistics_assets").updateOne({ _id: tid }, { $set: { documents: expired } });
    try {
      await L.goto(c, "/logistics/search");
      await c.page.fill('input[placeholder="Name"]', st.truck.name);
      await c.page.getByRole("button", { name: /Search trucks/ }).click();
      await c.page.waitForTimeout(2500);
      L.check(!(await L.bodyText(c)).includes(st.truck.name), "expired truck hidden from search");
      await L.goto(c, `/logistics/asset/${st.truck._id}`);
      await c.page.waitForTimeout(1500);
      await L.shot(c, "s6-expired-asset");
      const t = await L.bodyText(c);
      L.check((await c.page.getByRole("link", { name: "Book / request quote" }).count()) === 0, "expired truck not bookable");
      L.check(/expired/i.test(t), "asset page explains documents expired", t.slice(0, 300));
      await L.goto(o, "/logistics/owner/fleet");
      await o.page.waitForTimeout(1500);
      L.check(!/expired/i.test(await L.bodyText(o)), "[UX note] Fleet list does not flag expired docs (status still 'Available')");
      await L.goto(o, `/logistics/owner/fleet/${st.truck._id}`);
      L.check(await L.waitText(o, /Hidden from customers — documents expired/), "owner unit page: 'Hidden from customers — documents expired'");
      await L.shot(o, "s6-owner-expired");
      // operator can't quote with it
      const jid = await L.postTransportJob(c, { goods: `E2E expired ${st.RUN}`, price: "200" });
      await L.goto(op, `/logistics/driver/job/${jid}`);
      await op.page.waitForTimeout(2000);
      const canQuote = await op.page.locator('input[aria-label="Quote amount"]').count();
      if (canQuote) {
        await op.page.fill('textarea[placeholder="e.g. Can collect from 7am…"]', "try");
        const btn = op.page.getByRole("button", { name: /Send my quote/ });
        if (await btn.isEnabled()) {
          await btn.click();
          await op.page.waitForTimeout(1500);
        }
      }
      const qn = await d.collection("logistics_quotes").countDocuments({ job_id: OID(jid) });
      L.check(qn === 0, "operator cannot quote with expired truck", { canQuote, qn, txt: (await L.bodyText(op)).match(/[^.]*expired[^.]*/i)?.[0] });
      await L.shot(op, "s6-op-expired");
    } finally {
      await d.collection("logistics_assets").updateOne({ _id: tid }, { $set: { documents: docs } });
    }
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of [o, c, op]) await L.shot(x, "s6-crash");
  }
  for (const x of [o, c, op]) {
    L.check(x.errors.length === 0, `${x.name}: no page/console errors`, x.errors.slice(0, 5));
    L.check(x.apiFails.length === 0, `${x.name}: no 5xx`, x.apiFails);
  }
  L.saveState(st);
  await L.done();
})();
