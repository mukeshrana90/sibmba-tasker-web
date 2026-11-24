/* Stage 40 — client points 17 Nov 2026.
 *  2   capacity: a 15 t truck shows "15 tons" (never the "20 ton" band); it can't see or quote an 18 t job;
 *      a direct booking saves "Vehicle: 15 ton" and refuses 18 t; editing keeps 15 ton
 *  3   owner unit page: one status (Listed / Hidden — reason / Disabled / Plan limit); no bare "regular"
 *  4   document expiry: the in-app notifications + WhatsApps an owner gets (7 days / today / expired),
 *      saved as screenshots + text for the client (docs/logistics/client-nov17/expiry-messages)
 *  6   sign-in / sign-up / home numbers: 3,800+ · 650+ · 4.1★ */
const fs = require("fs");
const path = require("path");
const L = require("./lib");
const F = require("./fleet-helpers");

const { OID, DAY } = F;
const OUT = path.resolve(__dirname, "../../../docs/logistics/client-nov17/expiry-messages");

/** Harare calendar date (YYYY-MM-DD) shifted by `days`, as a UTC midnight Date. */
function harareDay(days = 0) {
  const ymd = new Date(Date.now() + days * DAY).toLocaleDateString("en-CA", { timeZone: "Africa/Harare" });
  return new Date(`${ymd}T00:00:00.000Z`);
}

(async () => {
  const RUN = L.loadState().RUN || "run";
  const C = L.cast(RUN);
  const tag = String(RUN).toLowerCase().replace(/[^a-z0-9]/g, "");
  const d = await L.db();
  const actors = [];
  const base = 772000000 + (Date.now() % 900000) * 3;
  const num = (k) => String(base + k);
  fs.mkdirSync(OUT, { recursive: true });

  try {
    // ───────────── fixtures ─────────────
    L.sec("40. Fixtures: owner (free period), 15 t truck, operator live");
    const pOwner = { ...C.slot("owner", "s40", 0), name: "Tatenda Moyo", company: "Moyo Haulage", email: `s40.owner.${tag}@${C.DOMAIN}`, phone: num(1) };
    await F.resetPeople([pOwner.email, `s40.op.${tag}@${C.DOMAIN}`]);
    const owner = await F.makeOwner(pOwner, { createdDaysAgo: 5 });
    const truck = await F.makeUnit(
      owner,
      { name: "Seddon Atkinson Strato", plate: `AFZ${String(base).slice(-4)}`, make: "Seddon Atkinson", model: "Strato 325", year: 2012 },
      { body: { capacity_value: "15", capacity_unit: "tons" } }
    );
    await d.collection("logistics_assets").updateOne({ _id: OID(truck._id) }, { $set: { capabilities: ["regular"] } });
    let a = await d.collection("logistics_assets").findOne({ _id: OID(truck._id) });
    L.check(Number(a?.capacity?.value) === 15, "15 t is stored as 15 (not 20)", a?.capacity);
    const op = await F.makeOperator(owner, { name: "Farai Ncube", email: `s40.op.${tag}@${C.DOMAIN}`, cc: pOwner.cc, phone: num(2) }, { assets: [truck._id] });
    const live = await F.goLive(op, truck._id);
    L.check(live?.success !== false, "operator live on the 15 t truck", live?.message);
    const customer = await L.makeCustomer(`s40-cust-${tag}`);

    // ───────────── 2b: matching uses the real 15 t ─────────────
    L.sec("40 2b. 18 t job never reaches the 15 t truck; 14 t does");
    const heavy = await F.postJob(customer, { goods: `S40 heavy ${RUN}`, weight: 18, body: { special_notes: "Vehicle: 20 ton" } });
    const light = await F.postJob(customer, { goods: `S40 light ${RUN}`, weight: 14, body: { special_notes: "Vehicle: 20 ton" } });
    const work = await L.api("GET", "/logistics/available-work?limit=50", { token: op.token });
    const ids = JSON.stringify(work?.data || {});
    L.check(!ids.includes(heavy), "18 t job is not in the operator's available work");
    L.check(ids.includes(light), "14 t job is in the operator's available work");
    let r = await F.quote(op, heavy, truck._id);
    L.check(r?.success === false, "quote on the 18 t job is refused", r?.message);
    r = await F.quote(op, light, truck._id);
    L.check(r?.success !== false, "quote on the 14 t job goes through", r?.message);

    // ───────────── 2a + 3: owner unit page ─────────────
    L.sec("40 2a/3. Owner unit page: real capacity, one status, no bare 'regular'");
    const o = await L.actor("s40-owner");
    actors.push(o);
    await L.seedAuth(o, { token: owner.token, user: { _id: owner._id, role: 4 } });
    const chip = () => o.page.locator(".log-owner-asset__head .log-chip").first().innerText().catch(() => "");
    const lead = () => o.page.locator(".log-owner-asset__head .log-lead").first().innerText().catch(() => "");
    const openUnit = async () => {
      await L.goto(o, `/logistics/owner/fleet/${truck._id}`, ".log-owner-asset__head");
      await o.page.waitForTimeout(1500);
    };
    await openUnit();
    let text = await L.bodyText(o);
    L.check(/15 tons/.test(await lead()), "header shows the real capacity '15 tons'", await lead());
    L.check(!/20 ton/i.test(text), "no '20 ton' anywhere on the unit page");
    L.check(!/\bregular\b/.test(text), "no bare lowercase 'regular' on the unit page");
    L.check(!/Vehicle needed tier/.test(text), "no 'Vehicle needed tier' row");
    L.check((await chip()) === "Listed", "ready unit: one status 'Listed'", await chip());
    await L.shot(o, "s40-unit-listed");

    await o.page.getByRole("button", { name: "Edit details" }).click();
    await o.page.waitForTimeout(800);
    text = await L.bodyText(o);
    L.check(/Matches loads up to\s*15 tons/.test(text), "edit form hint: 'Matches loads up to 15 tons'");
    L.check(!/Vehicle needed: 20 ton/.test(text), "edit form: no 'Vehicle needed: 20 ton'");
    await L.shot(o, "s40-unit-edit-hint");

    await L.goto(o, "/logistics/owner/fleet", "table");
    await o.page.waitForTimeout(1500);
    const table = await o.page.locator("table").first().innerText().catch(() => "");
    L.check(/Logistic · Truck/.test(table), "fleet list type: 'Logistic · Truck'", table.slice(0, 300));
    L.check(!/\bregular\b/.test(table), "fleet list: no bare 'regular'");
    await L.shot(o, "s40-fleet-list");

    // documents expired → Hidden, not Listed
    a = await d.collection("logistics_assets").findOne({ _id: OID(truck._id) });
    const docsOk = a.documents;
    const setRego = (expires, extra = {}) =>
      d.collection("logistics_assets").updateOne(
        { _id: a._id },
        { $set: { documents: docsOk.map((x) => (x.type === "rego" ? { ...x, expires, expiry_reminders_sent: [], expiry_notified_on: null, ...extra } : x)) } }
      );
    await setRego(harareDay(-1));
    await openUnit();
    L.check((await chip()) === "Hidden — documents expired", "expired Road licence: 'Hidden — documents expired'", await chip());
    L.check((await o.page.locator(".log-owner-asset__head .log-chip").count()) === 1, "only one status chip in the header");
    L.check(/Hidden from customers — documents expired/.test(await L.bodyText(o)), "the red banner explains why");
    await L.shot(o, "s40-unit-hidden-expired");
    fs.copyFileSync(await L.shot(o, "s40-banner"), path.join(OUT, "3-unit-page-banner.png"));

    await d.collection("logistics_assets").updateOne({ _id: a._id }, { $set: { documents: docsOk, is_active: 0 } });
    await openUnit();
    L.check((await chip()) === "Disabled", "switched off: 'Disabled'", await chip());
    await d.collection("logistics_assets").updateOne({ _id: a._id }, { $set: { plan_locked: true } });
    await openUnit();
    L.check((await chip()) === "Plan limit", "over the plan limit: 'Plan limit'", await chip());
    await d.collection("logistics_assets").updateOne({ _id: a._id }, { $set: { is_active: 1, plan_locked: false } });
    await F.goLive(op, truck._id);

    // ───────────── 2c: direct booking ─────────────
    L.sec("40 2c. Direct booking saves 'Vehicle: 15 ton', refuses 18 t");
    const c = await L.actor("s40-customer");
    actors.push(c);
    await L.seedAuth(c, { token: customer.token, user: { _id: customer._id, role: 1 } });
    await L.goto(c, `/logistics/post?asset=${truck._id}`, "form.log-form-card--post");
    await c.page.waitForSelector(".log-target-banner", { timeout: 15000 });
    const capField = await c.page.locator('input[aria-label="Vehicle capacity (this truck)"]').inputValue().catch(() => "");
    L.check(/Up to 15 t/.test(capField), "vehicle field: 'Up to 15 t'", capField);
    const goods = `S40 direct ${RUN}`;
    await L.pickLocation(c, 0, null);
    await L.pickLocation(c, 1, L.PLACES.drops[1]);
    await L.fillGoods(c.page, goods);
    // Typing 18 on a 15 t unit: the form refuses it and keeps 15 (toast), so the job goes out at 15 t
    await c.page.fill('input[placeholder="8"]', "18");
    await L.pickDate(c.page, c.page.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first(), 1, 12);
    await L.typeMoney(c.page, 'input[aria-label="Price"]', "400");
    await c.page.locator('form.log-form-card--post button[type="submit"]').click();
    await c.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 20000 });
    L.check(/can take up to 15 tons/.test(await L.bodyText(c)), "18 t refused: 'This unit can take up to 15 tons'");
    await L.shot(c, "s40-direct-18t-refused");
    const dId = c.page.url().match(/jobs\/([a-f0-9]{24})/)[1];
    let job = await d.collection("transport_jobs").findOne({ _id: OID(dId) });
    L.check(/Vehicle: 15 ton/.test(job?.special_notes || "") && !/20 ton/.test(job?.special_notes || ""), "saved job says 'Vehicle: 15 ton'", job?.special_notes);
    L.check(String(job?.targeted_asset_id) === truck._id && Number(job?.load_weight?.value) === 15, "direct booking saved at 15 t, not 18", job?.load_weight);
    L.check(/Truck type: Regular/.test(job?.special_notes || "") && !/\bregular\b/.test(job?.special_notes || ""), "job notes: 'Truck type: Regular', no bare 'regular'", job?.special_notes);

    await L.goto(c, `/logistics/post?edit=${dId}`, "form.log-form-card--post");
    await c.page.waitForTimeout(1500);
    const editCap = await c.page.locator('input[aria-label="Vehicle capacity (booked unit)"]').inputValue().catch(() => "");
    L.check(/Up to 15 t/.test(editCap), "edit: vehicle field keeps 'Up to 15 t'", editCap);
    await c.page.locator('form.log-form-card--post button[type="submit"]').click();
    await c.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 20000 }).catch(() => {});
    job = await d.collection("transport_jobs").findOne({ _id: OID(dId) });
    L.check(/Vehicle: 15 ton/.test(job?.special_notes || ""), "after saving the edit: still 'Vehicle: 15 ton'", job?.special_notes);

    // ───────────── 4: expiry messages ─────────────
    L.sec("40 4. Document expiry: what the owner receives");
    await d.collection(" notifications").deleteMany({ receiver_id: OID(owner._id), type: "LOGISTICS_DOC_EXPIRY" }).catch(() => {});
    const run = () =>
      F.backend(`process.env.LOGISTICS_DOC_REMINDER_HOUR="0";const s=require("./src/utils/logistics/documentExpiryScheduler");return s.processLogisticsDocumentExpiry({ownerIds:[${JSON.stringify(owner._id)}]})`);
    const steps = [
      { days: 7, status: "expires in 7 days", file: "1-seven-days" },
      { days: 0, status: "expires today", file: "2-today" },
      { days: -1, status: "expired", file: "3-expired" },
    ];
    const wa = [];
    for (const s of steps) {
      await setRego(harareDay(s.days));
      const t0 = F.nowIso();
      const res = run();
      const msgs = F.waTo(t0, pOwner.phone).filter((m) => m.template === "doc_expiry" && m.ok);
      const mine = msgs.find((m) => m.variables?.["3"] === s.status);
      L.check(!!mine, `WhatsApp sent: '${s.status}'`, { res, got: msgs.map((m) => m.variables) });
      if (mine) wa.push({ ...s, body: mine.body, to: mine.to });
    }
    const notes = await d
      .collection("notifications")
      .find({ receiver_id: OID(owner._id), type: { $in: ["LOGISTICS_DOC_EXPIRY", "logistics_doc_expiry"] } })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();
    const fallbackNotes = notes.length
      ? notes
      : await d.collection(" notifications").find({ receiver_id: OID(owner._id), title: /\bexpire/i }).sort({ createdAt: 1, _id: 1 }).toArray();
    L.check(fallbackNotes.length >= 3, "3 in-app notifications (7 days, today, expired)", fallbackNotes.map((n) => n.title));

    // in-app: the bell menu
    await L.goto(o, "/logistics/owner", ".app-tools");
    await o.page.waitForTimeout(2000);
    await o.page.locator('button[aria-label="Notifications"]').dispatchEvent("pointerup");
    await o.page.waitForTimeout(1200);
    const menu = o.page.locator(".notify-wrap.open .notify-menu");
    L.check(/expire/i.test(await menu.innerText().catch(() => "")), "bell menu lists the expiry notifications");
    await menu.screenshot({ path: path.join(OUT, "1-in-app-notifications.png") }).catch(() => {});

    // WhatsApp: the exact messages, drawn as chat bubbles
    const esc = (s) => String(s).replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]);
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#efe7dd;font:15px/1.45 system-ui,sans-serif">
      <div style="background:#075e54;color:#fff;padding:14px 18px;font-weight:600">Simba Tasker · WhatsApp to ${esc(pOwner.name)} (${esc(wa[0]?.to || "")})</div>
      <div style="padding:18px;display:flex;flex-direction:column;gap:14px;max-width:560px">
      ${wa.map((m) => `<div><div style="font-size:12px;color:#555;margin:0 0 4px 4px">${esc(m.status)}</div><div style="background:#fff;border-radius:10px;padding:10px 12px;box-shadow:0 1px 1px rgba(0,0,0,.12)">${esc(m.body)}</div></div>`).join("")}
      </div></body>`;
    const v = await L.actor("s40-wa");
    actors.push(v);
    await v.page.setViewportSize({ width: 620, height: 640 });
    await v.page.setContent(html);
    await v.page.screenshot({ path: path.join(OUT, "2-whatsapp-messages.png"), fullPage: true });
    // the bell menu cuts long titles, so the same in-app notifications in full
    await v.page.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;background:#f7f4ee;font:15px/1.45 system-ui,sans-serif">
      <div style="background:#0f5c4a;color:#fff;padding:14px 18px;font-weight:600">Simba Tasker · in-app notifications (full text)</div>
      <div style="padding:18px;display:flex;flex-direction:column;gap:12px;max-width:560px">
      ${fallbackNotes.map((n) => `<div style="background:#fff;border:1px solid #e9e1d4;border-radius:12px;padding:12px 14px"><b>${esc(n.title)}</b><div style="color:#555;margin-top:4px">${esc(n.message || n.body || "")}</div></div>`).join("")}
      </div></body>`);
    await v.page.screenshot({ path: path.join(OUT, "1b-in-app-notifications-full.png"), fullPage: true });

    const lines = [
      "Document expiry — what the owner receives (Simba Tasker Logistics)",
      "Tested 17 Nov 2026 with a test owner and truck (Road licence / ZINARA).",
      "",
      "Channels: in-app notification (bell) for every owner; WhatsApp for owners in their free period or on Paid.",
      "No email is sent for document expiry.",
      "When: 30, 14, 7 and 1 day(s) before expiry, on the expiry day, then on the day after expiry and once a week until the renewed document is uploaded.",
      "Road licence (ZINARA) and other compulsory documents hide the unit from customers once expired; supporting documents only warn.",
      "",
      "IN-APP NOTIFICATIONS",
      ...fallbackNotes.flatMap((n) => [`- ${n.title}`, `  ${n.message || n.body || ""}`]),
      "",
      "WHATSAPP (template simba_logistics_document_expiry)",
      ...wa.flatMap((m) => [`- ${m.status}:`, `  ${m.body}`]),
      "",
      "UNIT PAGE (after expiry)",
      "- Status chip: Hidden — documents expired",
      "- Banner: Hidden from customers — documents expired. <document> expired on <date>. Nobody can book or quote with this unit until you upload the renewed document.",
    ];
    fs.writeFileSync(path.join(OUT, "messages.txt"), lines.join("\n") + "\n");
    L.check(fs.existsSync(path.join(OUT, "messages.txt")), "messages.txt written for the client");
    await setRego(docsOk.find((x) => x.type === "rego")?.expires || harareDay(240));

    // ───────────── 6: numbers ─────────────
    L.sec("40 6. Sign-in / sign-up / home numbers");
    const g = await L.actor("s40-visitor");
    actors.push(g);
    for (const [p, sel] of [["/login", "form"], ["/sign-up", "form"], ["/", "body"]]) {
      await L.goto(g, p, sel);
      await g.page.waitForTimeout(1200);
      // the numbers strip only (the home page also has a "Verified providers" feature card)
      const t = await g.page.locator(".landing-stats, .av-stats").first().innerText().catch(() => L.bodyText(g));
      // 23 Nov (client): live numbers — "Registered providers" and "Users" replace "Verified providers" / "Jobs completed"
      L.check(/[\d,]+\+\s*Registered providers/.test(t) && /[\d,]+\+\s*Users/.test(t) && /4\.1★/.test(t), `${p}: live Registered providers · Users · 4.1★`);
      L.check(!/Verified providers|Jobs completed/.test(t), `${p}: old labels gone`);
      L.check(!/2,400\+|15k\+|4\.8★|650\+/.test(t), `${p}: old numbers gone`);
    }
    await L.goto(g, "/login", "form");
    await L.shot(g, "s40-login-numbers");

    F.pageChecks(actors);
  } catch (e) {
    L.check(false, `stage crashed: ${e.message}`, e.stack?.split("\n").slice(0, 4));
  } finally {
    await L.done();
  }
})();
