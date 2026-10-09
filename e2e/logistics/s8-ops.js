/* Stage 8 — owner reassign + reject, operator multi-transit, expired operator licence blocks going live, operator login via UI. */
const L = require("./lib");

async function quote(op, jobId, amt) {
  await L.goto(op, `/logistics/driver/job/${jobId}`);
  await op.page.waitForSelector('input[aria-label="Quote amount"]', { timeout: 15000 });
  await L.typeMoney(op.page, 'input[aria-label="Quote amount"]', amt);
  await op.page.fill('textarea[placeholder="e.g. Can collect from 7am…"]', "ok");
  await op.page.getByRole("button", { name: /Send my quote/ }).click();
  return L.waitText(op, /Quote (sent|submitted)/i);
}
async function accept(c, jobId, amt) {
  await L.goto(c, `/logistics/jobs/${jobId}`);
  await c.page.getByRole("button", { name: new RegExp(`^Accept USD ${amt}`) }).click({ timeout: 15000 });
  return L.waitText(c, /Quote accepted/);
}

(async () => {
  const st = L.loadState();
  const d = await L.db();
  const OID = (x) => new L.mongoose.Types.ObjectId(x);
  const o = await L.actor("owner"), c = await L.actor("customer"), op = await L.actor("operator"), op2 = await L.actor("operator2");
  for (const x of [o, c, op, op2]) x.page.on("dialog", (dl) => dl.accept());
  try {
    await L.seedAuth(o, { token: st.owner.token, user: st.owner });
    await L.seedAuth(c, { token: st.customer.token, user: st.customer });
    await L.seedAuth(op, { token: st.operator.token, user: st.operator });
    await L.seedAuth(op2, { token: st.operator2.token, user: st.operator2 });

    L.sec("8. Setup: 3 accepted jobs for operator #1");
    const r = await L.api("POST", `/logistics/asset/${st.truck._id}/assign`, { token: st.owner.token, body: { sub_user_id: st.operator2._id } });
    L.check(r.success, "operator #2 also assigned to truck (API)", r.message);
    const ids = [];
    for (const [i, drop] of [["A", "Epworth, Harare"], ["B", "Norton Zimbabwe"], ["C", "Ruwa"]]) {
      const id = await L.postTransportJob(c, { goods: `E2E multi${i} ${st.RUN}`, drop, price: "200" });
      ids.push(id);
      L.check(await quote(op, id, "190"), `quoted job ${i}`);
      L.check(await accept(c, id, "190"), `accepted job ${i}`);
    }
    const [jA, jB, jC] = ids;

    L.sec("8b. Owner reassigns job A to operator #2 (UI)");
    await L.goto(o, `/logistics/owner/job/${jA}`);
    const sel = o.page.locator(".log-field", { hasText: "Reassign to operator" }).locator("select");
    await sel.waitFor({ timeout: 15000 });
    await sel.selectOption(st.operator2._id);
    await o.page.getByRole("button", { name: "Reassign" }).click();
    await o.page.waitForTimeout(2000);
    let job = await d.collection("transport_jobs").findOne({ _id: OID(jA) });
    L.check(String(job.assigned?.driver_id) === st.operator2._id, "job A now on operator #2", job.assigned?.driver_id);
    await L.goto(op2, "/logistics/driver/jobs");
    await op2.page.waitForTimeout(1500);
    L.check((await L.bodyText(op2)).includes(`E2E multiA ${st.RUN}`), "operator #2 sees job A in My jobs");
    await L.goto(o, `/logistics/owner/job/${jA}`);
    await sel.waitFor({ timeout: 15000 });
    await sel.selectOption(st.operator._id);
    await o.page.getByRole("button", { name: "Reassign" }).click();
    await o.page.waitForTimeout(2000);
    job = await d.collection("transport_jobs").findOne({ _id: OID(jA) });
    L.check(String(job.assigned?.driver_id) === st.operator._id, "job A back on operator #1");
    L.check((await o.page.locator('input[aria-label="Delivery OTP"]').count()) === 0 && (await o.page.getByRole("button", { name: "Confirm en route to pickup" }).count()) === 0, "owner has no advance-status / OTP controls");

    L.sec("8c. Owner rejects job C (UI)");
    await o.page.goto(`${L.WEB}/logistics/owner/job/${jC}`);
    const rej = o.page.getByRole("button", { name: /^Reject/ }).first();
    await rej.waitFor({ timeout: 15000 });
    await rej.click();
    await o.page.waitForTimeout(800);
    const modalBtn = o.page.locator(".modal, .log-modal, [role=dialog]").getByRole("button", { name: /Reject/ });
    if (await modalBtn.count()) {
      const ta = o.page.locator(".modal textarea, .log-modal textarea, [role=dialog] textarea");
      if (await ta.count()) await ta.first().fill("E2E: unit unavailable");
      await modalBtn.last().click();
    }
    await o.page.waitForTimeout(2000);
    job = await d.collection("transport_jobs").findOne({ _id: OID(jC) });
    L.check([0, 7].includes(Number(job.status)) && !job.assigned?.driver_id || Number(job.status) === 7, "job C rejected (back to open or status 7)", { s: job.status, a: job.assigned?.driver_id });
    await L.shot(o, "s8-owner-reject");

    L.sec("8d. Operator creates multi-transit with A + B (UI)");
    await L.goto(op, "/logistics/driver/jobs");
    await op.page.waitForTimeout(2000);
    for (const id of [jA, jB]) {
      const j = await d.collection("transport_jobs").findOne({ _id: OID(id) });
      await op.page.locator(`input[aria-label="Select ${j.job_number}"]`).check();
    }
    await L.shot(op, "s8-multi-select");
    await op.page.getByRole("button", { name: /multi-transit/i }).click();
    await op.page.waitForURL(/multi-transit\/[a-f0-9]{24}/, { timeout: 15000 });
    L.check(true, "multi-transit created → run page");
    await op.page.waitForTimeout(2500);
    await L.shot(op, "s8-multi-run");
    const mt = await L.bodyText(op);
    L.check(mt.includes(`E2E multiA ${st.RUN}`) && mt.includes(`E2E multiB ${st.RUN}`), "run lists both jobs");
    const startBtn = op.page.getByRole("button", { name: "Start collect" }).first();
    if (await startBtn.count()) {
      await startBtn.click();
      await op.page.waitForTimeout(2000);
      const s = await d.collection("transport_jobs").find({ _id: { $in: [OID(jA), OID(jB)] } }).project({ status: 1 }).toArray();
      L.check(s.some((x) => Number(x.status) === 2), "a stop advanced to Collect from multi-transit", s.map((x) => x.status));
    } else L.check(false, "Start collect button present");

    L.sec("8e. Expired operator licence blocks going live");
    const u = await d.collection("users").findOne({ _id: OID(st.operator._id) });
    const prevDocs = u.logistics_documents || [];
    await d.collection("users").updateOne({ _id: u._id }, { $set: { logistics_documents: [...prevDocs.filter((x) => x.type !== "licence"), { type: "licence", name: "lic.pdf", url: "/x.pdf", expires: new Date(Date.now() - 5 * 86400000) }] } });
    try {
      await L.goto(op, "/logistics/driver", ".log-dash-avail-controls");
      await op.page.waitForSelector(".log-dash-avail-controls select");
      await op.page.locator('select[aria-label="Set status"]').selectOption("offline");
      await op.page.getByRole("button", { name: "Update status" }).click();
      await op.page.waitForTimeout(2000);
      await op.page.locator('select[aria-label="Set status"]').selectOption("available_now");
      await op.page.getByRole("button", { name: "Update status" }).click();
      const blocked = await L.waitText(op, /licen[cs]e[^.]*expired|expired[^.]*licen[cs]e/i, 8000);
      L.check(blocked, "going live blocked with licence-expired message", (await L.bodyText(op)).match(/[^.]*expired[^.]*/i)?.[0]);
      const a = await d.collection("logistics_assets").findOne({ _id: OID(st.truck._id) });
      L.check(!JSON.stringify(a.availability || a.availability_state || "").includes("available_now"), "truck not live while licence expired", a.availability_state || a.availability);
      await L.shot(op, "s8-licence-expired");
    } finally {
      await d.collection("users").updateOne({ _id: u._id }, { $set: { logistics_documents: prevDocs } });
    }

    L.sec("8f. Operator signs in through /login");
    const op3 = await L.actor("operator-login");
    await L.goto(op3, "/login", "form");
    await op3.page.fill('input[placeholder="Enter your email"]', st.operator.email);
    await op3.page.fill('input[placeholder="Enter your password"]', "Passw0rd!");
    await op3.page.locator('button[type="submit"]').click();
    await op3.page.waitForURL(/\/logistics\/driver/, { timeout: 20000 }).then(() => L.check(true, "operator login → /logistics/driver")).catch(async () => L.check(false, "operator login → /logistics/driver", (await L.bodyText(op3)).slice(0, 200)));
    L.check(op3.errors.length === 0, "login: no errors", op3.errors);
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of [o, c, op, op2]) await L.shot(x, "s8-crash");
  }
  for (const x of [o, c, op, op2]) {
    L.check(x.errors.length === 0, `${x.name}: no page/console errors`, x.errors.slice(0, 5));
    L.check(x.apiFails.length === 0, `${x.name}: no 5xx`, x.apiFails);
  }
  L.saveState(st);
  await L.done();
})();
