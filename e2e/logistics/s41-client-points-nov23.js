/* Stage 41 — client points 23 Nov 2026.
 *  1   business documents: an uploaded owner ID reads "Uploaded · Pending review"; a failed load
 *      shows Retry instead of every document as red "Missing"
 *  2   national ID: no expiry field (passport still has one)
 *  3+4 operator: one status control (no Go online button); company pending → only Offline, reason on the page
 *  6   reopening an accepted invite shows the email masked (API and page)
 *  7   GET /customer/public/home-stats (live numbers)
 *  8   GET /logistics/public-config (launch line settings)
 *  9   location-only ping keeps the check-in; GET /logistics/assets/map lists live units ≤ 2 h old;
 *      search page "View on map" popup */
const crypto = require("crypto");
const L = require("./lib");
const F = require("./fleet-helpers");

const { OID } = F;

(async () => {
  const RUN = L.loadState().RUN || "run";
  const C = L.cast(RUN);
  const tag = String(RUN).toLowerCase().replace(/[^a-z0-9]/g, "");
  const d = await L.db();
  const actors = [];
  const base = 773000000 + (Date.now() % 900000) * 3;
  const num = (k) => String(base + k);
  const authAs = async (name, who) => {
    const a = await L.actor(name);
    actors.push(a);
    await L.seedAuth(a, { token: who.token, user: { _id: who._id, role: 4, owner_id: who.owner_id || null } });
    return a;
  };

  try {
    // ───────────── fixtures ─────────────
    L.sec("41. Fixtures: approved owner + truck + operator live; pending owner");
    const pOwner = { ...C.slot("owner", "s41", 0), name: "Rudo Chikore", company: "Chikore Freight", email: `s41.owner.${tag}@${C.DOMAIN}`, phone: num(1) };
    const pPending = { ...C.slot("owner", "s41", 1), name: "Tino Mhlanga", company: "Mhlanga Movers", email: `s41.pending.${tag}@${C.DOMAIN}`, phone: num(3) };
    const opEmail = `s41.operator.${tag}@${C.DOMAIN}`;
    await F.resetPeople([pOwner.email, pPending.email, opEmail]);
    const owner = await F.makeOwner(pOwner);
    const truck = await F.makeUnit(owner, { name: "Isuzu FVZ 1400", plate: `AGB${String(base).slice(-4)}`, make: "Isuzu", model: "FVZ 1400", year: 2016 });
    const op = await F.makeOperator(owner, { name: "Kuda Sibanda", email: opEmail, cc: pOwner.cc, phone: num(2) }, { assets: [truck._id] });
    op.owner_id = owner._id;
    const pending = await F.makeOwner(pPending, { approve: false });

    // ───────────── 9: location-only ping + live map ─────────────
    L.sec("41 9. Location-only ping, live map API");
    let r = await L.api("PATCH", "/logistics/me/availability", { token: op.token, body: { location_only: true, lat: F.LAT, lng: F.LNG } });
    L.check(r?.success === false && r?.data?.code === "NOT_ONLINE", "offline operator: location ping refused (NOT_ONLINE)", r?.data || r?.message);
    r = await F.goLive(op, truck._id);
    L.check(r?.success !== false, "operator live", r?.message);
    const opBefore = await d.collection("users").findOne({ _id: OID(op._id) });
    const until = new Date(opBefore.logistics_availability.available_until).getTime();
    // 2 hours ago on the unit, then a ping 1 km north
    await d.collection("logistics_assets").updateOne({ _id: OID(truck._id) }, { $set: { location_updated_at: new Date(Date.now() - 3 * 3600e3) } });
    let map = await L.api("GET", `/logistics/assets/map?lat=${F.LAT}&lng=${F.LNG}&radius_km=100`);
    L.check(!(map?.data?.data || []).some((x) => String(x.asset_id) === String(truck._id)), "pin older than 2 h: not on the map", (map?.data?.data || []).length);
    r = await L.api("PATCH", "/logistics/me/availability", { token: op.token, body: { location_only: true, lat: F.LAT + 0.009, lng: F.LNG } });
    L.check(r?.success !== false && r?.data?.location_only === true, "location ping accepted", r?.message);
    const opAfter = await d.collection("users").findOne({ _id: OID(op._id) });
    L.check(new Date(opAfter.logistics_availability.available_until).getTime() === until, "ping does not renew the check-in", { before: new Date(until), after: opAfter.logistics_availability.available_until });
    L.check(opAfter.logistics_availability.state === "available_now", "state unchanged", opAfter.logistics_availability.state);
    const unit = await d.collection("logistics_assets").findOne({ _id: OID(truck._id) });
    L.check(Date.now() - new Date(unit.location_updated_at).getTime() < 60e3, "unit location time refreshed", unit.location_updated_at);
    map = await L.api("GET", "/logistics/assets/map");
    const row = (map?.data?.data || []).find((x) => String(x.asset_id) === String(truck._id));
    L.check(map?.data?.center?.lat === -17.8252 && map?.data?.radius_km === 100 && map?.data?.live_hours === 2, "defaults: Harare, 100 km, 2 h", map?.data && { c: map.data.center, r: map.data.radius_km });
    L.check(!!row && row.availability?.taking_orders === true, "live unit on the map", row || (map?.data?.data || []).length);
    L.check(row && String(row.live_location.lat).split(".")[1]?.length <= 3, "pin rounded to 3 decimals", row?.live_location);
    L.check(row && !("owner" in row) && !JSON.stringify(row).includes(pOwner.email), "no owner email or private fields", row && Object.keys(row));
    L.check(row && row.plate === null, "guest: no plate on the map", row?.plate);
    const signedIn = await L.api("GET", "/logistics/assets/map", { token: op.token });
    const rowIn = (signedIn?.data?.data || []).find((x) => String(x.asset_id) === String(truck._id));
    L.check(rowIn && /^AGB/.test(rowIn.plate || ""), "signed in: plate on the map", rowIn?.plate);
    const far = await L.api("GET", "/logistics/assets/map?lat=-20.15&lng=28.58&radius_km=100");
    L.check(!(far?.data?.data || []).some((x) => String(x.asset_id) === String(truck._id)), "Bulawayo 100 km: Harare unit not listed");

    // search page popup
    const g = await L.actor("s41-visitor");
    actors.push(g);
    await L.goto(g, "/logistics/search", '[data-testid="view-on-map"]');
    await g.page.locator('[data-testid="view-on-map"]').click();
    await g.page.waitForSelector('[data-testid="live-map-meta"]', { timeout: 15000 });
    await L.waitText(g, /live unit|No live equipment/, 15000).catch(() => {});
    const meta = await g.page.locator('[data-testid="live-map-meta"]').innerText();
    L.check(/live unit/.test(meta) && /Harare/.test(meta), "View on map: live units near Harare", meta);
    L.check((await g.page.locator(".log-live-map-modal .leaflet-marker-icon").count()) >= 1, "map shows pins");
    await L.shot(g, "s41-view-on-map");
    await g.page.keyboard.press("Escape");

    // ───────────── 3: one status control ─────────────
    L.sec("41 3. Operator: one status control, auto location note");
    const oa = await authAs("s41-operator", op);
    await L.goto(oa, "/logistics/driver", '[data-testid="go-online-card"]');
    L.check((await oa.page.locator(".log-go-card__btn--on, .log-go-card__btn--off").count()) === 0, "no separate Go online / Go offline buttons");
    L.check((await oa.page.locator('select[aria-label="Set status"]').count()) === 1, "one Set status dropdown");
    L.check(/updates automatically every 15 min/.test(await oa.page.locator('[data-testid="go-online-card"]').innerText()), "card: location updates automatically");
    await L.shot(oa, "s41-operator-status");

    // ───────────── 4: company pending → Offline only ─────────────
    L.sec("41 4. Company pending: Go online disabled with the reason");
    await F.goOffline(op);
    await d.collection("users").updateOne({ _id: OID(owner._id) }, { $set: { "logistics_approval.status": "pending" } });
    await L.goto(oa, "/logistics/driver", '[data-testid="company-pending-reason"]');
    const reason = await oa.page.locator('[data-testid="company-pending-reason"]').innerText();
    L.check(/waiting for Simba Tasker approval/.test(reason), "reason shown on the page", reason);
    const optState = await oa.page.locator('select[aria-label="Set status"] option').evaluateAll((os) => os.map((o) => [o.value, o.disabled]));
    L.check(optState.length > 1 && optState.every(([val, dis]) => (val === "offline" ? !dis : dis)), "every live status is disabled, Offline is not", optState);
    L.check(await oa.page.getByRole("button", { name: "Update status" }).isDisabled().catch(() => true) || (await oa.page.locator('select[aria-label="Set status"]').inputValue()) === "offline", "only Offline can be saved");
    await L.shot(oa, "s41-company-pending");
    await d.collection("users").updateOne({ _id: OID(owner._id) }, { $set: { "logistics_approval.status": "approved" } });

    // ───────────── 6: accepted invite masked ─────────────
    L.sec("41 6. Accepted invite link: email masked");
    const token = crypto.randomBytes(16).toString("hex");
    await d.collection("logistics_invites").insertOne({ owner_id: OID(owner._id), email: opEmail, token, status: "activated", activated_user_id: OID(op._id), createdAt: new Date(), updatedAt: new Date() });
    r = await L.api("POST", "/logistics/invite/verify", { body: { token } });
    L.check(r?.data?.code === "INVITE_ACCEPTED" && !r?.data?.email, "API: no full email", r?.data);
    L.check(/^s4\*\*\*.@/.test(r?.data?.email_masked || ""), "API: masked email", r?.data?.email_masked);
    const v = await L.actor("s41-link");
    actors.push(v);
    await L.goto(v, `/logistics/invite?token=${token}`, ".log-invite-accepted");
    const inv = await v.page.locator(".log-invite-accepted").innerText();
    L.check(inv.includes(r?.data?.email_masked) && !inv.includes(opEmail), "page shows the masked email only", inv.slice(0, 160));
    await L.shot(v, "s41-invite-masked");
    await d.collection("logistics_invites").deleteOne({ token });

    // ───────────── 1 + 2: business documents ─────────────
    L.sec("41 1+2. Business documents: national ID has no expiry; uploaded reads 'Uploaded · Pending review'");
    const pa = await authAs("s41-pending-owner", pending);
    await L.goto(pa, "/logistics/owner/verification", '.log-bizdoc[data-type="owner_id"]');
    const idRow = pa.page.locator('.log-bizdoc[data-type="owner_id"]');
    await idRow.locator("select.log-bizdoc__kind").selectOption("national_id");
    L.check((await idRow.locator('input[name="owner_id_expires"]').count()) === 0, "national ID: no expiry field");
    await idRow.locator("select.log-bizdoc__kind").selectOption("passport");
    L.check((await idRow.locator('input[name="owner_id_expires"]').count()) === 1, "passport: expiry field shown");
    await idRow.locator("select.log-bizdoc__kind").selectOption("national_id");
    const files = await L.businessDocFiles(pPending);
    await idRow.locator('input[type="file"][name="owner_id"]').setInputFiles(files.owner_id);
    await pa.page.waitForSelector('.log-bizdoc[data-type="owner_id"][data-status="pending"]', { timeout: 20000 });
    const idText = await idRow.innerText();
    L.check(/Uploaded · Pending review/.test(idText) && !/Missing/.test(idText), "owner ID: 'Uploaded · Pending review', not 'Missing'", idText.slice(0, 200));
    const pu = await d.collection("users").findOne({ _id: OID(pending._id) });
    const idDoc = (pu.logistics_business_documents || []).find((x) => x.type === "owner_id");
    L.check(idDoc && idDoc.id_kind === "national_id" && !idDoc.expires, "stored as national ID without expiry", idDoc && { kind: idDoc.id_kind, expires: idDoc.expires });
    await L.shot(pa, "s41-owner-id-pending");
    // failed load: Retry, never "Missing" (own browser: the forced 500 is expected there)
    const pa2 = await L.actor("s41-pending-owner-offline");
    await L.seedAuth(pa2, { token: pending.token, user: { _id: pending._id, role: 4, owner_id: null } });
    await pa2.page.route("**/logistics/business-docs", (route) => (route.request().method() === "GET" ? route.fulfill({ status: 500, body: "{}" }) : route.continue()));
    await L.goto(pa2, "/logistics/owner/verification", '[data-testid="bizdocs-load-error"]');
    const errText = await L.bodyText(pa2);
    L.check(/Retry/.test(errText) && !/\bMissing\b/.test(errText), "load failure: Retry shown, no 'Missing'");
    await L.shot(pa2, "s41-docs-load-error");
    await pa2.ctx?.close?.().catch(() => {});

    // ───────────── 7 + 8: public numbers + launch config ─────────────
    L.sec("41 7+8. Home stats and launch config (public)");
    const hs = await L.api("GET", "/customer/public/home-stats");
    L.check(hs?.success && Number.isFinite(hs.data.registered_providers) && Number.isFinite(hs.data.users) && hs.data.rating === 4.1, "home-stats: providers, users, rating", hs?.data);
    L.check(hs?.data?.display?.registered_providers <= hs?.data?.registered_providers, "display numbers round down", hs?.data?.display);
    const pc = await L.api("GET", "/logistics/public-config");
    L.check(pc?.success && pc.data.free_days === 60 && pc.data.support_whatsapp === "+263786545442", "public-config: free days + WhatsApp", pc?.data);

    // ───────────── visual tour (also runs headless; pauses only when watching) ─────────────
    const pause = (ms) => (process.env.E2E_HEADED ? new Promise((res) => setTimeout(res, ms)) : Promise.resolve());
    L.sec("41 tour. Home numbers, launch line, map popup with plate + photo, Mohali");
    const tv = await L.actor("s41-tour-visitor");
    actors.push(tv);
    await L.goto(tv, "/", ".landing-stats");
    const stats = await tv.page.locator(".landing-stats").innerText();
    L.check(/Registered providers/.test(stats) && /Users/.test(stats) && !/Jobs completed/.test(stats), "home: live Registered providers + Users", stats.replace(/\s+/g, " "));
    await tv.page.locator(".landing-stats").scrollIntoViewIfNeeded();
    await pause(2500);
    await L.goto(tv, "/logistics", "body");
    const launch = tv.page.locator('[data-testid="logistics-launch-line"]');
    if (pc?.data?.approvals_from) {
      await launch.scrollIntoViewIfNeeded().catch(() => {});
      const launchText = (await launch.innerText().catch(() => "")).replace(/\s+/g, " ");
      L.check(/Approvals from .* · First \d+ days free · simbatasker\.com · WhatsApp \+263/.test(launchText), "guest landing: launch line", launchText);
    } else {
      L.check((await launch.count()) === 0, "guest landing: no launch line while the date isn't set");
    }
    await pause(2500);

    // signed-in customer: pin popup shows thumbnail + plate
    const cust = await L.makeCustomer(`s41-cust-${tag}`);
    const tc = await L.actor("s41-tour-customer");
    actors.push(tc);
    await L.seedAuth(tc, { token: cust.token, user: { _id: cust._id, role: 1 } });
    await L.goto(tc, "/logistics/search", '[data-testid="view-on-map"]');
    await pause(1500);
    await tc.page.locator('[data-testid="view-on-map"]').click();
    await tc.page.waitForSelector(".log-live-map-modal .leaflet-marker-icon", { timeout: 20000 });
    await pause(2500);
    // many pins in Harare overlap: send the click to the pin itself
    await tc.page.locator(".log-live-map-modal .leaflet-marker-icon").first().dispatchEvent("click");
    await tc.page.waitForSelector(".leaflet-popup .log-map-unit", { timeout: 8000 });
    await pause(3000);
    L.check((await tc.page.locator(".leaflet-popup .log-map-unit__plate").count()) >= 1, "signed in: popup shows the plate", await tc.page.locator(".leaflet-popup .log-map-unit__plate").allInnerTexts());
    L.check((await tc.page.locator(".leaflet-popup img.log-map-unit__thumb").count()) >= 1, "popup shows a thumbnail");
    await L.shot(tc, "s41-tour-popup");
    // search a place: Bulawayo (no units) → empty state
    const input = tc.page.locator(".log-live-map-modal .bk-loc-search-wrap input");
    await input.click();
    await input.pressSequentially("Bulawayo", { delay: 120 });
    // wait for a real Google suggestion, not the "Searching…" placeholder row
    const sugg = tc.page.locator(".log-live-map-modal .bk-loc-suggestions li").filter({ hasNotText: /Searching|No results/i }).first();
    if (await sugg.waitFor({ timeout: 10000 }).then(() => true).catch(() => false)) {
      await pause(1500);
      await sugg.click();
      await tc.page.waitForTimeout(2500);
      L.check(/Bulawayo/i.test(await tc.page.locator('[data-testid="live-map-meta"]').innerText()), "place search moves the map", await tc.page.locator('[data-testid="live-map-meta"]').innerText());
      await pause(2500);
    } else {
      L.check(true, "place search: no suggestions offline (skipped)");
    }

    // Mohali via "Use my location" (demo units in the local DB, if still live)
    const mo = await L.actor("s41-tour-mohali", { geo: { latitude: 30.7046, longitude: 76.7179 } });
    actors.push(mo);
    await L.goto(mo, "/logistics/search", '[data-testid="view-on-map"]');
    await mo.page.locator('[data-testid="view-on-map"]').click();
    await mo.page.waitForSelector('[data-testid="live-map-meta"]');
    await pause(1500);
    await mo.page.locator(".log-live-map-modal .use-my-location").click();
    await mo.page.waitForTimeout(2500);
    const allow = mo.page.getByRole("button", { name: /allow|continue/i }).last();
    if (await allow.isVisible().catch(() => false)) await allow.click().catch(() => {});
    await mo.page.waitForFunction(() => /your location/.test(document.querySelector('[data-testid="live-map-meta"]')?.innerText || ""), null, { timeout: 15000 }).catch(() => {});
    const moMeta = await mo.page.locator('[data-testid="live-map-meta"]').innerText();
    L.check(/your location/.test(moMeta), "Use my location: map centred on the device", moMeta);
    await pause(3500);
    await L.shot(mo, "s41-tour-mohali");

    F.pageChecks(actors);
  } catch (e) {
    L.check(false, `stage crashed: ${e.message}`, e.stack?.split("\n").slice(0, 4));
  } finally {
    await L.done();
  }
})();
