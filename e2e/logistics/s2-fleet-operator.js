/* Stage 2 — owner adds a truck (docs+expiry) via UI, invites operator with the truck, operator activates via invite link. */
const L = require("./lib");
const fs = require("fs");
const path = require("path");

(async () => {
  const st = L.loadState();
  const RUN = st.RUN;
  const C = L.cast(RUN);
  const D = require("./docs");
  const truck = C.unit("truck", 20);
  const opP = C.slot("operator", "s2");
  const docInfo = { owner: st.ownerCompany, holder: st.ownerName, plate: truck.plate, make: truck.make, model: truck.model, year: truck.year, kind: "vehicle", expires: D.addMonths(6) };
  const future = new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10);
  const o = await L.actor("owner");
  const p = o.page;
  const d = await L.db();
  try {
    await L.seedAuth(o, { token: st.owner.token, user: st.owner });

    L.sec("2. Owner adds a truck (UI)");
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await p.locator("form.log-fleet-form").getByText(/^Logistic|Truck/i).first().click().catch(() => {});
    await p.locator('[data-testid="operated-by-later"]').click(); // operator is invited in 2b
    const plate = truck.plate;
    await p.fill('input[placeholder="Truck 1"]', truck.name);
    await p.fill('input[placeholder="AEB1234"]', plate);
    await p.fill('input[placeholder="15"]', truck.capacity).catch(() => {});
    await p.fill('input[placeholder="Isuzu"]', truck.make);
    await p.fill('input[placeholder="FVZ"]', truck.model);
    await p.fill('input[placeholder="2019"]', truck.year);
    // base location via picker (geolocation = Harare CBD)
    await p.locator(".log-location-btn").first().click();
    await p.waitForSelector(".simba-book-loc-modal", { timeout: 10000 });
    await p.waitForTimeout(3500);
    await L.shot(o, "s2-location-modal");
    await p.locator(".simba-book-loc-modal .btn-primary").click();
    await p.waitForTimeout(500);
    const rows = p.locator(".log-doc-row");
    // v2.7.59: Road licence (ZINARA) is the first truck document and mandatory
    {
      const first = await rows.first().innerText();
      L.check(/Road licence \(ZINARA\)\s*\*/.test(first), "ZINARA is the first document, marked * (required)", first.replace(/\s+/g, " ").slice(0, 90));
      L.check(/Required — add it to save this truck/.test(first), "ZINARA row says it's required to save");
      await p.locator('form.log-fleet-form button[type="submit"]').click();
      L.check(await L.waitText(o, /Road licence \(ZINARA\) is required/), "truck without ZINARA is refused (toast)");
      const noRego = await L.apiForm("POST", "/logistics/asset", {
        token: st.owner.token,
        body: { kind: "vehicle", name: `${truck.make} ${truck.model} (no road licence)`, registration: `NZ${RUN}`.toUpperCase().slice(0, 9) },
        files: (await L.photoFixtures(truck)).map((f) => ["photos", f]),
      });
      L.check(noRego?.success === false && noRego?.data?.code === "ZINARA_REQUIRED", "API: truck without ZINARA → ZINARA_REQUIRED", noRego?.message);
      L.check(!(await d.collection("logistics_assets").findOne({ registration: `NZ${RUN}`.toUpperCase().slice(0, 9) })), "nothing saved without ZINARA");
    }
    const rego = L.docRow(p, "Road licence").first();
    await rego.locator('input[type="file"]').setInputFiles(await L.docFile("rego", docInfo));
    await L.pickDate(p, rego.locator(".log-doc-row__expiry input"), 6);
    // v2.7.66: roadworthy is optional (only ZINARA is compulsory); this owner adds one anyway
    {
      const rw = L.docRow(p, "Roadworthy").first();
      L.check(!/\*/.test(await rw.locator(".log-doc-row__body > b").innerText()), "Roadworthy is not marked * (optional)");
      await rw.locator('input[type="file"]').setInputFiles(await L.docFile("roadworthy", docInfo));
      await L.pickDate(p, rw.locator(".log-doc-row__expiry input"), 6);
    }
    // insurance doc without expiry → must be rejected
    const insRow = L.docRow(p, "Insurance").first();
    await insRow.locator('input[type="file"]').setInputFiles(await L.docFile("insurance", docInfo));
    await p.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Insurance: expiry date is required/), "doc without expiry blocked (toast)");
    await L.pickDate(p, insRow.locator(".log-doc-row__expiry input"), 6);
    // doc 12 · 4.3: at least 2 photos
    await p.locator('form.log-fleet-form button[type="submit"]').click();
    L.check(await L.waitText(o, /Add at least 2 real photos/), "unit without photos is refused (toast)");
    {
      const api1 = await L.apiForm("POST", "/logistics/asset", {
        token: st.owner.token,
        body: { kind: "vehicle", name: `${truck.make} ${truck.model} (one photo)`, registration: `P1${RUN}`.toUpperCase().slice(0, 9) },
        files: [["photos", (await L.photoFixtures(truck))[0]]],
      });
      L.check(api1?.success === false && api1?.data?.code === "PHOTOS_REQUIRED", "API: 1 photo → PHOTOS_REQUIRED", api1?.message);
    }
    await L.addUnitPhotos(p, "form.log-fleet-form", truck.photos);
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
    L.check((await L.bodyText(o)).includes(truck.name), "truck shows in Fleet list");
    L.check(/operator|unassigned|no operator/i.test(await L.bodyText(o)), "fleet hints the unit needs an operator");
    if (asset) L.check((asset.photos || []).length === 2, "truck saved with 2 photos", (asset.photos || []).length);

    L.sec("2a. Unit with no operator never shows 'Available now' (doc 12 · L36)");
    {
      const fleetRow = p.locator("tr", { hasText: truck.name }).first();
      const rowText = await fleetRow.innerText().catch(() => "");
      L.check(/Not bookable — no operator/.test(rowText) && !/Available now/.test(rowText), "Fleet list: 'Not bookable — no operator'", rowText.replace(/\s+/g, " ").slice(0, 160));
      const dash = await L.api("GET", "/logistics/dashboard", { token: st.owner.token });
      const mv = (dash?.data?.map_vehicles || []).find((v) => String(v.asset_id) === st.truck?._id);
      L.check(mv?.customer_view?.bookable === false && mv?.customer_view?.status_detail === "No operator assigned", "dashboard map_vehicles carries customer_view (no operator)", mv?.customer_view);
      await L.goto(o, `/logistics/owner/fleet/${st.truck?._id}`, ".log-detail-item");
      const detail = await L.bodyText(o);
      L.check(/Not bookable — no operator/.test(detail), "unit page Availability: 'Not bookable — no operator'");
    }

    L.sec("2b. Invite operator (UI)");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    const opEmail = opP.email;
    const opPhone = opP.phone;
    await p.fill('input[placeholder="Full name"]', opP.name);
    await p.fill('input[placeholder="name@example.com"]', opEmail);
    const ph = p.locator("#op-phone, .log-field:has(#op-phone) input[type=tel]").first();
    await L.typePhone(ph, C.CC, opPhone);
    await p.fill('input[placeholder="Licence number"]', C.licence("s2-op"));
    const pick = p.locator(".log-asset-pick__list li").filter({ hasText: truck.name });
    await pick.locator('input[type="checkbox"]').check();
    // doc 12 · 4.2: face photo is compulsory for a new operator
    await p.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /Add the operator's face photo/), "invite without a face photo is refused (toast)");
    {
      const noPhoto = await L.api("POST", "/logistics/sub-user", { token: st.owner.token, body: { email: `${C.person("operator", 40).first.toLowerCase()}.${RUN}@yopmail.com`, send_via: ["email"] } });
      L.check(noPhoto?.success === false && noPhoto?.data?.code === "PHOTO_REQUIRED", "API: invite without photo → PHOTO_REQUIRED", noPhoto?.message);
    }
    await L.addFacePhoto(p, 1);
    await L.shot(o, "s2-invite-form");
    await p.locator('form button[type="submit"]').last().click();
    L.check(await L.waitText(o, /Invite (sent|created)/), "invite sent toast", (await L.bodyText(o)).slice(0, 200));
    await p.waitForTimeout(1500);
    const inv = await d.collection("logistics_invites").findOne({ email: opEmail });
    L.check(!!inv, "invite row exists");
    st.invite = { _id: String(inv?._id), email: opEmail, phone: opPhone, cc: C.CC };
    await L.goto(o, "/logistics/owner/operators");
    await p.locator('select[aria-label="Show active or invites"]').selectOption({ index: 1 }).catch(() => {});
    await p.waitForTimeout(1000);
    await L.shot(o, "s2-operators-pending");
    L.check((await L.bodyText(o)).includes(opEmail), "pending invite listed");

    L.sec("2c. Operator activates invite (UI)");
    const op = await L.actor("operator");
    const q = op.page;
    await L.goto(op, `/logistics/invite?token=${inv.token}`, "#invite-password");
    {
      const it = await L.bodyText(op);
      L.check(it.includes(st.ownerCompany) || it.includes(st.ownerName), "invite page shows company/owner", it.slice(0, 200));
    }
    await q.fill("#invite-password", "Passw0rd!");
    await q.fill("#invite-password-confirm", "Passw0rd!");
    await q.locator('button[type="submit"]').click();
    await q.waitForURL(/\/logistics\/driver/, { timeout: 20000, waitUntil: "commit" }).then(() => L.check(true, "activated → /logistics/driver")).catch(async () => L.check(false, "activated → /logistics/driver", (await L.bodyText(op)).slice(0, 300)));
    await q.waitForLoadState("networkidle").catch(() => {});
    await L.shot(op, "s2-driver-home");
    const opUser = await d.collection("users").findOne({ email: opEmail });
    L.check(opUser && String(opUser.owner_id) === st.owner._id, "operator linked to owner");
    const a2 = await d.collection("logistics_assets").findOne({ _id: asset._id });
    L.check((a2.assigned_sub_user_ids || []).map(String).includes(String(opUser?._id)), "pending assignment converted → truck assigned to operator");
    st.operatorName = opP.name;
    st.operator = { _id: String(opUser._id), email: opEmail, name: opP.name, phone: opPhone, cc: C.CC, role: 4, owner_id: st.owner._id, token: await q.evaluate(() => localStorage.getItem("token")) };

    L.sec("2d. Simba checks the documents before customers see the truck (29 Oct 2026)");
    {
      const [lng, lat] = L.PLACES.coords.harare;
      const goLive = () => L.api("PATCH", "/logistics/me/availability", { token: st.operator.token, body: { state: "available_now", asset_id: st.truck._id, lat, lng } });
      const cust = await L.makeCustomer(`cust.${RUN}`);
      const listed = async () => {
        const r = await L.api("GET", "/logistics/assets/search?kind=vehicle&limit=100", { token: cust.token });
        return (r?.data?.data || []).some((x) => String(x.asset_id || x._id) === st.truck._id);
      };
      const view = async () => (await L.api("GET", `/logistics/asset/${st.truck._id}`, { token: cust.token }))?.data?.asset?.availability || {};
      L.check(!(await listed()), "truck with documents waiting for the check is hidden from search");
      const v0 = await view();
      L.check(v0.bookable === false && v0.status_detail === "Awaiting document check", "asset page: 'Awaiting document check'", v0);
      await L.goto(o, `/logistics/owner/fleet/${st.truck._id}`, ".log-detail-item");
      L.check(/Awaiting Simba's document check|Awaiting document check/i.test(await L.bodyText(o)), "owner unit page says it's awaiting Simba's check");
      await L.shot(o, "s2-awaiting-check");
      // v2.7.66: the verified face photo is what lets an operator work; no licence is needed
      const r1 = await goLive();
      L.check(r1?.success === false && r1?.data?.code === "DOC_PENDING_CHECK" && /face photo/i.test(r1?.message), "face photo waiting for Simba's check → can't go live (DOC_PENDING_CHECK)", r1);
      await L.verifyDocs("asset", st.truck._id);
      L.check(!(await listed()), "truck documents verified but operator's face not → still hidden");
      await L.verifyFace(st.operator._id);
      const r3 = await goLive();
      L.check(r3?.success !== false, "verified face photo (no licence) → operator can go live", r3?.message);
      L.check(await listed(), "all verified + operator live → truck shown to customers");
      const v1 = await view();
      L.check(v1.bookable === true, "asset page: bookable", v1);
      // back offline; later stages switch the operator on from the UI
      await L.api("PATCH", "/logistics/me/availability", { token: st.operator.token, body: { state: "offline" } });
    }
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
