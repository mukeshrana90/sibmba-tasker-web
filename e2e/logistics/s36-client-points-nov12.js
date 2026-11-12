/* Stage 36 — 12 Nov client points: truck pages show the business name, phone and WhatsApp only (no owner
   name, email or VIN), Logistics hero wording, "New" instead of 0.0 / 0 reviews, no cab in Hub "How it
   works", return weight must fit Vehicle needed (web + API), carriage shows only the filled sides.
   Own accounts; needs only state.json RUN. */
const L = require("./lib");
const F = require("./fleet-helpers");

(async () => {
  const st = L.loadState();
  const RUN = String(st.RUN || "run").toLowerCase();
  const C = L.cast(RUN);
  const person = (role, i, key) => {
    const p = C.person(role, 120 + i);
    return { ...p, email: `s36${role.slice(0, 2)}${key}.${RUN}@${C.DOMAIN}`, phone: C.phone(`s36-${role}-${key}`), company: p.company || `${p.name} Transport` };
  };
  const pOwner = person("owner", 0, "a");
  const pOp = person("operator", 0, "a");
  await F.resetPeople([pOwner.email, pOp.email]);
  const actors = [];
  const A = async (n, opts) => { const a = await L.actor(n, opts); actors.push(a); return a; };
  const VIN = `S36VIN${RUN.toUpperCase().replace(/[^A-Z0-9]/g, "")}`.slice(0, 17);

  try {
    L.sec("36a. Fleet: one truck with a VIN and only the carriage length filled");
    const owner = await F.makeOwner(pOwner);
    const unit = await F.makeUnit(owner, C.unit("truck", 360), {
      docs: { rego: 8 },
      body: { vin: VIN, capacity_value: 16, capacity_unit: "tons", carriage_length_ft: 24 },
    });
    const op = await F.makeOperator(owner, pOp, { assets: [unit._id] });
    await F.goLive(op, unit._id);
    const d = await L.db();
    const stored = await d.collection("logistics_assets").findOne({ _id: F.OID(unit._id) });
    L.check((stored?.capabilities || []).some((c) => c === `vin:${VIN}`), "VIN stored on the unit (capabilities)", stored?.capabilities);
    L.check(stored?.carriage?.length_m === 24 && stored?.carriage?.width_m == null, "only the carriage length is stored", stored?.carriage);
    const ownerUser = await d.collection("users").findOne({ _id: F.OID(owner._id) });
    const ownerName = ownerUser.full_name;
    const ownerEmail = ownerUser.email;
    const company = ownerUser.company_name;
    L.check(company && ownerName && company !== ownerName, "owner has a business name different from their own name", { company, ownerName });

    const customer = await L.makeCustomer(`s36-${RUN}`);

    L.sec("36b. API: customers get the business name and phone — no owner name, email or VIN");
    const det = await L.api("GET", `/logistics/asset/${unit._id}`, { token: customer.token });
    const o = det?.data?.owner || {};
    L.check(det?.success !== false && o.company_name === company, "detail: business name sent", det?.message || o);
    L.check(o.full_name === company, "detail: full_name is the business name", o.full_name);
    L.check(!("owner_name" in o) && !("email" in o), "detail: no owner_name, no email", Object.keys(o));
    L.check(!!o.phone_number, "detail: phone still sent (paid / free period, signed in)", o);
    L.check(!(det?.data?.asset?.capabilities || []).some((c) => /^vin:/i.test(c)), "detail: VIN stripped", det?.data?.asset?.capabilities);
    const raw = JSON.stringify(det);
    L.check(!raw.includes(VIN) && !raw.includes(ownerEmail) && !raw.includes(ownerName), "detail payload has no VIN / owner email / owner name anywhere");

    const srch = await L.api("GET", `/logistics/assets/search?kind=vehicle&limit=100`, { token: customer.token });
    const rows = srch?.data?.assets || srch?.data?.results || srch?.data?.rows || Object.values(srch?.data || {}).find(Array.isArray) || [];
    const row = rows.find((r) => String(r.asset_id) === unit._id);
    L.check(!!row, "search: the truck is listed", rows.length);
    if (row) {
      L.check(row.owner.full_name === company && row.owner.display_name === company, "search: owner shown as the business name", row.owner);
      L.check(!row.owner.email, "search: no owner email", row.owner.email);
      L.check(!(row.capabilities || []).some((c) => /^vin:/i.test(c)), "search: VIN stripped", row.capabilities);
      L.check(!JSON.stringify(row).includes(ownerName), "search row has no owner name");
    }
    const hub = await L.api("GET", "/logistics/hub/spotlight", { token: customer.token });
    const hubTxt = JSON.stringify(hub);
    L.check(!hubTxt.includes(VIN) && !hubTxt.includes(ownerEmail) && !hubTxt.includes(ownerName), "hub spotlight has no VIN / owner email / owner name");
    const guestDet = await L.api("GET", `/logistics/asset/${unit._id}`);
    L.check(!JSON.stringify(guestDet).includes(VIN) && !guestDet?.data?.owner?.phone_number, "guest: no VIN, no phone");

    L.sec("36c. Truck page (signed-in customer): business name + phone + WhatsApp, New rating, Length 24 ft");
    const c = await A("customer");
    await L.seedAuth(c, { token: customer.token, user: customer });
    await L.goto(c, `/logistics/asset/${unit._id}`, ".log-asset-detail-provider");
    await c.page.waitForSelector(".log-asset-detail__specs", { timeout: 15000 });
    const page = await L.bodyText(c);
    const prov = (await c.page.locator(".log-asset-detail-provider").innerText()).replace(/\s+/g, " ");
    L.check(prov.includes(company), "provider card shows the business name", prov);
    L.check(!page.includes(ownerName) && !/Owner:/.test(prov), "owner's own name not on the page", prov);
    L.check(!page.includes(ownerEmail), "owner email not on the page");
    L.check(!page.toUpperCase().includes(VIN) && !/vin:/i.test(page), "VIN not on the page");
    L.check(prov.includes(owner.phone) || prov.includes(pOwner.phone), "phone shown", prov);
    L.check((await c.page.locator(".log-asset-detail-provider button, .log-asset-detail-provider a").filter({ hasText: /whatsapp/i }).count()) > 0, "WhatsApp button shown");
    const meta = (await c.page.locator(".log-asset-detail-summary__meta").innerText()).trim();
    L.check(/^New/.test(meta) && !/0\.0|0 reviews/.test(page), "rating reads New — no 0.0 ★ · 0 reviews", meta);
    const specs = (await c.page.locator(".log-asset-detail__specs").innerText()).replace(/\s+/g, " ");
    L.check(/Carriage Length 24 ft/.test(specs), "carriage shows Length 24 ft", specs);
    L.check(!/×\s*—|—\s*×/.test(page), "no empty — sides in the dimensions");
    await L.shot(c, "s36-asset");

    L.sec("36d. Search page: business name only");
    await L.goto(c, "/logistics/search");
    await c.page.fill('input[placeholder="Truck, tractor, unit or company name"]', unit.name);
    await c.page.getByRole("button", { name: /Search trucks/ }).click();
    await c.page.locator(`a[href="/logistics/asset/${unit._id}"]`).first().waitFor({ timeout: 20000 }).catch(() => {});
    const srow = c.page.locator("tr", { has: c.page.locator(`a[href="/logistics/asset/${unit._id}"]`) }).first();
    if (await srow.count()) {
      const t = (await srow.innerText()).replace(/\s+/g, " ");
      L.check(t.includes(company), "search row shows the business name", t);
      L.check(!t.includes(ownerName) && !t.includes(ownerEmail), "search row: no owner name or email", t);
    } else {
      L.check(false, "search row for the truck rendered", (await L.bodyText(c)).slice(0, 300));
    }
    await L.shot(c, "s36-search");

    L.sec("36e. How it works: no cab (customer /logistics page + Hub steps)");
    await L.goto(c, "/logistics", "#how");
    const how = (await c.page.locator("#how").innerText()).replace(/\s+/g, " ");
    L.check(/truck or machine/i.test(how) && !/\bcab\b/i.test(how), "customer page How it works: truck or machine, no cab", how);
    // HubHome steps (shown to roles without the Services/Logistics choice): check the shipped text
    const hubSrc = require("fs").readFileSync(require("path").join(__dirname, "../../src/Pages/logistics/HubHome.js"), "utf8");
    const step1 = (hubSrc.match(/title: "Post or pick", sub: "([^"]+)"/) || [])[1] || "";
    L.check(step1 === "Post your job, or book a truck or machine directly.", "Hub step 1: book a truck or machine directly (no cab)", step1);
    L.check(!(await L.bodyText(c)).includes(ownerName), "page: no owner's own name");

    L.sec("36f. Logistics page (visitor): new wording; OTP unchanged");
    const g = await A("guest");
    await L.goto(g, "/logistics", ".lgl-benefits");
    const stats = (await g.page.locator(".lgl-benefits").innerText()).replace(/\s+/g, " ");
    L.check(/Checked/.test(stats) && /Road licence and owner ID reviewed by Simba Tasker/.test(stats), "Checked · Road licence and owner ID reviewed by Simba Tasker", stats);
    L.check(/Trip updates/.test(stats) && /Follow your load from pickup to drop-off/.test(stats), "Trip updates · Follow your load from pickup to drop-off", stats);
    L.check(/OTP/.test(stats), "OTP stays", stats);
    L.check(!/Fleet owners checked|Tracking on every trip/.test(stats), "old wording gone", stats);
    await L.shot(g, "s36-guest-stats");
    // hard refresh straight on /logistics (the 403 was nginx-only; dev server must serve the app)
    await g.page.reload({ waitUntil: "domcontentloaded" });
    L.check(await g.page.locator(".lgl-benefits").isVisible({ timeout: 15000 }).catch(() => false), "reload on /logistics shows the page");

    L.sec("36g. Post a job: return weight can't exceed Vehicle needed");
    await L.goto(c, "/logistics/post", "form.log-form-card--post");
    await L.vehicleSelect(c.page).selectOption("below 2 ton");
    await c.page.fill('input[placeholder="8"]', "1");
    await c.page.locator("label.log-check", { hasText: "Return trip" }).locator("input[type=checkbox]").check();
    const ret = c.page.locator(".log-return-panel input[type=number]").first();
    await ret.fill("8");
    const toastSeen = await L.waitText(c, /takes up to 2 tons/, 8000);
    L.check(toastSeen, "toast: Vehicle needed takes up to 2 tons");
    L.check((await ret.inputValue()) === "2", "return weight clamped to 2", await ret.inputValue());
    await ret.fill("1.5");
    L.check((await ret.inputValue()) === "1.5", "1.5 t return accepted", await ret.inputValue());
    // bigger vehicle → 8 t return OK → back to below 2 ton is refused
    await L.vehicleSelect(c.page).selectOption("10 ton");
    await ret.fill("8");
    L.check((await ret.inputValue()) === "8", "8 t return fine on a 10 ton vehicle", await ret.inputValue());
    await L.vehicleSelect(c.page).selectOption("below 2 ton");
    const refused = await L.waitText(c, /Weight exceeds below 2 ton capacity/, 8000);
    L.check(refused && (await L.vehicleSelect(c.page).inputValue()) === "10 ton", "switching to below 2 ton refused while the return load is 8 t", await L.vehicleSelect(c.page).inputValue());
    await L.shot(c, "s36-return-weight");

    L.sec("36h. API: return load over Vehicle needed is refused (create + edit)");
    const jobBody = (ret) => ({
      job_type: "transport", job_class: "corridor", load_type: "Cement bags",
      pickup: { address: L.PLACES.base, coordinates: L.PLACES.coords.harare },
      dropoff: { address: L.PLACES.drops[0], coordinates: L.PLACES.coords.chitungwiza },
      load_weight: { value: 1, unit: "tons" }, special_notes: "Vehicle: below 2 ton",
      when_needed: F.ymd(Date.now() + 3 * F.DAY),
      budget: { amount: 300, currency: "USD" },
      return_trip: ret,
    });
    const bad = await L.api("POST", "/logistics/job", { token: customer.token, body: jobBody({ goods: "Pallets", weight: { value: 8, unit: "tons" } }) });
    L.check(bad?.success === false && /Return load weight exceeds below 2 ton/.test(bad?.message || ""), "create: 8 t return on below 2 ton → refused", bad?.message);
    const badKg = await L.api("POST", "/logistics/job", { token: customer.token, body: jobBody({ goods: "Pallets", weight: { value: 8000, unit: "kg" } }) });
    L.check(badKg?.success === false, "create: 8000 kg return refused too", badKg?.message);
    const ok = await L.api("POST", "/logistics/job", { token: customer.token, body: jobBody({ goods: "Pallets", weight: { value: 1.5, unit: "tons" } }) });
    const jobId = ok?.data?.job?._id || ok?.data?._id;
    L.check(!!jobId, "create: 1.5 t return accepted", ok?.message);
    if (jobId) {
      const edit = await L.api("PATCH", `/logistics/job/${jobId}`, { token: customer.token, body: { return_trip: { goods: "Pallets", weight: { value: 8, unit: "tons" } } } });
      L.check(edit?.success === false && /exceeds/.test(edit?.message || ""), "edit: raising the return to 8 t refused", edit?.message);
    }

    L.sec("36i. Owner's own unit page: carriage without empty sides");
    const ow = await A("owner");
    await L.seedAuth(ow, { token: owner.token, user: { _id: owner._id, role: 4 } });
    await L.goto(ow, `/logistics/owner/fleet/${unit._id}`);
    await L.waitText(ow, /Carriage/, 15000);
    const ownerPage = await L.bodyText(ow);
    L.check(/Carriage Length 24 ft/.test(ownerPage), "owner page: Carriage Length 24 ft", (ownerPage.match(/Carriage.{0,40}/) || [""])[0]);
    L.check(!/×\s*—|—\s*×/.test(ownerPage), "owner page: no — sides");
  } catch (e) {
    L.check(false, "stage crashed", e.stack || e.message);
  } finally {
    for (const a of actors) await a.ctx.close().catch(() => {});
    await L.done();
  }
})();
