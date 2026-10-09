/* Stage 2 — owner adds a truck (docs+expiry) via UI, invites operator with the truck, operator activates via invite link. */
const L = require("./lib");
const fs = require("fs");
const path = require("path");

(async () => {
  const st = L.loadState();
  const RUN = st.RUN;
  const pdf = path.join(__dirname, "doc.pdf");
  fs.writeFileSync(pdf, "%PDF-1.4\n%e2e\n");
  const future = new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10);
  const o = await L.actor("owner");
  const p = o.page;
  const d = await L.db();
  try {
    await L.seedAuth(o, { token: st.owner.token, user: st.owner });

    L.sec("2. Owner adds a truck (UI)");
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await p.locator("form.log-fleet-form").getByText(/^Logistic|Truck/i).first().click().catch(() => {});
    const plate = `E2E${RUN}`.toUpperCase().slice(0, 9);
    await p.fill('input[placeholder="Truck 1"]', `E2E Truck ${RUN}`);
    await p.fill('input[placeholder="AEB1234"]', plate);
    await p.fill('input[placeholder="15"]', "15").catch(() => {});
    await p.fill('input[placeholder="Isuzu"]', "Isuzu");
    await p.fill('input[placeholder="FVZ"]', "FVZ");
    await p.fill('input[placeholder="2019"]', "2019");
    // base location via picker (geolocation = Harare)
    await p.locator(".log-location-btn").first().click();
    await p.waitForSelector(".simba-book-loc-modal", { timeout: 10000 });
    await p.waitForTimeout(3500);
    await L.shot(o, "s2-location-modal");
    await p.locator(".simba-book-loc-modal .btn-primary").click();
    await p.waitForTimeout(500);
    // insurance doc without expiry → must be rejected
    const rows = p.locator(".log-doc-row");
    const insRow = rows.filter({ hasText: "Insurance" }).first();
    await insRow.locator('input[type="file"]').setInputFiles(pdf);
    await p.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Insurance: expiry date is required/), "doc without expiry blocked (toast)");
    await L.pickDate(p, insRow.locator(".log-doc-row__expiry input"), 6);
    const rego = rows.filter({ hasText: "Road licence" }).first();
    await rego.locator('input[type="file"]').setInputFiles(pdf);
    await L.pickDate(p, rego.locator(".log-doc-row__expiry input"), 6);
    await L.shot(o, "s2-form-filled");
    await p.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Vehicle added/), "Vehicle added toast");
    await p.waitForTimeout(1500);
    const asset = await d.collection("logistics_assets").findOne({ registration: plate }) ||
      await d.collection("logistics_assets").findOne({ registration: plate });
    L.check(!!asset, "asset row saved", plate);
    if (asset) {
      st.truck = { _id: String(asset._id), plate, name: asset.name };
      L.check(Array.isArray(asset.location?.coordinates) && asset.location.coordinates[0] !== 0, "asset has base coords", asset.location);
      const docs = asset.documents || [];
      L.check(docs.length >= 2 && docs.every((x) => x.expires_at || x.expires || x.expiry), "documents saved with expiry", docs.map((x) => ({ t: x.type, e: x.expires_at || x.expires })));
    }
    await L.shot(o, "s2-fleet-list");
    L.check((await L.bodyText(o)).includes(`E2E Truck ${RUN}`), "truck shows in Fleet list");
    L.check(/operator|unassigned|no operator/i.test(await L.bodyText(o)), "fleet hints the unit needs an operator");

    L.sec("2b. Invite operator (UI)");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    const opEmail = `operator.${RUN}@e2e.example.com`;
    const opPhone = `78${String(Date.now()).slice(-7)}`;
    await p.fill('input[placeholder="Tendai Moyo"]', `E2E Operator ${RUN}`);
    await p.fill('input[placeholder="t.moyo@gmail.com"]', opEmail);
    const ph = p.locator("#op-phone, .log-field:has(#op-phone) input[type=tel]").first();
    await ph.click();
    await ph.press("End");
    await ph.pressSequentially(opPhone, { delay: 15 });
    await p.fill('input[placeholder="Licence number"]', `LIC${RUN}`);
    const pick = p.locator(".log-asset-pick__list li").filter({ hasText: `E2E Truck ${RUN}` });
    await pick.locator('input[type="checkbox"]').check();
    await L.shot(o, "s2-invite-form");
    await p.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /Invite (sent|created)/), "invite sent toast", (await L.bodyText(o)).slice(0, 200));
    await p.waitForTimeout(1500);
    const inv = await d.collection("logistics_invites").findOne({ email: opEmail });
    L.check(!!inv, "invite row exists");
    st.invite = { _id: String(inv?._id), email: opEmail, phone: opPhone };
    await L.goto(o, "/logistics/owner/operators");
    await p.locator('select[aria-label="Show active or invites"]').selectOption({ index: 1 }).catch(() => {});
    await p.waitForTimeout(1000);
    await L.shot(o, "s2-operators-pending");
    L.check((await L.bodyText(o)).includes(opEmail), "pending invite listed");

    L.sec("2c. Operator activates invite (UI)");
    const op = await L.actor("operator");
    const q = op.page;
    await L.goto(op, `/logistics/invite?token=${inv.token}`, "#invite-password");
    L.check(/E2E/i.test(await L.bodyText(op)), "invite page shows company/owner");
    await q.fill("#invite-password", "Passw0rd!");
    await q.fill("#invite-password-confirm", "Passw0rd!");
    await q.locator('button[type="submit"]').click();
    await q.waitForURL(/\/logistics\/driver/, { timeout: 20000 }).then(() => L.check(true, "activated → /logistics/driver")).catch(async () => L.check(false, "activated → /logistics/driver", (await L.bodyText(op)).slice(0, 300)));
    await q.waitForLoadState("networkidle").catch(() => {});
    await L.shot(op, "s2-driver-home");
    const opUser = await d.collection("users").findOne({ email: opEmail });
    L.check(opUser && String(opUser.owner_id) === st.owner._id, "operator linked to owner");
    const a2 = await d.collection("logistics_assets").findOne({ _id: asset._id });
    L.check((a2.assigned_sub_user_ids || []).map(String).includes(String(opUser?._id)), "pending assignment converted → truck assigned to operator");
    st.operator = { _id: String(opUser._id), email: opEmail, role: 4, owner_id: st.owner._id, token: await q.evaluate(() => localStorage.getItem("token")) };
    L.check(op.errors.length === 0, "operator: no page/console errors", op.errors.slice(0, 5));
    L.check(op.apiFails.length === 0, "operator: no 5xx", op.apiFails);
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    await L.shot(o, "s2-crash");
  }
  L.check(o.errors.length === 0, "owner: no page/console errors", o.errors.slice(0, 5));
  L.check(o.apiFails.length === 0, "owner: no 5xx", o.apiFails);
  L.saveState(st);
  await L.done();
})();
