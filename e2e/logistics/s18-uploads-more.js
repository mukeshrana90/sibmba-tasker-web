/* Stage 18 — upload rules, the cases s17 doesn't cover, all in the browser.
   Cab + equipment units, HEIC variants (.heif, "mif1" HEIF, no extension,
   HEIC named .jpg, JPEG named .heic), exactly 10 MB photo + paper, corrupt
   image refused with a message, DOCX paper, replacing papers on the unit page,
   operator activation → own photo shown, owner edits an existing operator
   (photo + medical), converted photo on Search, equipment hire + return-trip
   photos on Post job, Post job on a phone (390px). Fresh owner on the Paid
   plan (no Free unit / seat limits) + fresh customer. */
const L = require("./lib");
const fs = require("fs");
const path = require("path");
const { MB, diskOf, thumbOf, isJpeg, makeFixtures, toastHas, imagesLoaded, baseName } = require("./upload-helpers");

const OID = (x) => new L.mongoose.Types.ObjectId(String(x));
// setInputFiles can't mix paths with in-memory files → read the path into one
const mem = (p, mimeType = "image/jpeg") => ({ name: path.basename(p), mimeType, buffer: fs.readFileSync(p) });

async function pickBaseLocation(a) {
  await a.page.locator(".log-location-btn").first().click();
  await a.page.waitForSelector(".simba-book-loc-modal");
  await a.page.waitForTimeout(2500);
  await a.page.locator(".simba-book-loc-modal .btn-primary").click();
}

async function waitJson(a, urlRe, method) {
  return a.page.waitForResponse((r) => urlRe.test(r.url()) && r.request().method() === method, { timeout: 45000 });
}

(async () => {
  const RUN = Date.now().toString(36).slice(-6);
  const d = await L.db();
  const actors = [];
  const A = async (n, opts) => { const a = await L.actor(n, opts); actors.push(a); return a; };
  try {
    const F = await makeFixtures();
    const owner = await L.makeCustomer(`up2.owner.${RUN}`, 4);
    await d.collection("users").updateOne({ _id: OID(owner._id) }, { $set: { company_name: `Upload Fleet ${RUN}`, full_name: `Upload Owner2 ${RUN}` } });
    L.check((await L.approveOwner(owner._id))?.data?.approval?.status === "approved", "fresh owner approved");
    await L.setPlan(owner._id, "paid");
    const o = await A("up2-owner");
    await L.seedAuth(o, { token: owner.token, user: owner });

    // ───────────────────────── Truck: corrupt image, exact 10 MB, JPEG named .heic
    L.sec("18a. Add truck: corrupt photo refused by the server with a message");
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    const plate = `UQ${RUN}`.toUpperCase();
    const truckName = `Upload Truck2 ${RUN}`;
    await o.page.fill('input[placeholder="Truck 1"]', truckName);
    await o.page.fill('input[placeholder="AEB1234"]', plate);
    await pickBaseLocation(o);
    const rego = o.page.locator(".log-doc-row").filter({ hasText: "Road licence" }).first();
    await rego.locator("input[type=file]").setInputFiles(F.pdf10);
    L.check(!(await L.waitText(o, /larger than 10 MB/, 1500)), "exactly 10 MB PDF paper accepted by the picker");
    await L.pickDate(o.page, rego.locator(".log-doc-row__expiry input"), 6);
    const ownRow = o.page.locator(".log-doc-row").filter({ hasText: "Ownership" }).first();
    await ownRow.locator("input[type=file]").setInputFiles(F.docx);
    L.check((await ownRow.innerText()).includes("permit.docx"), "Word (.docx) paper attached");
    const photoInput = o.page.locator("form.log-fleet-form .log-photo-slot--add input[type=file]");
    await photoInput.setInputFiles(F.corrupt);
    L.check((await o.page.locator("form.log-fleet-form .log-photo-slot--filled").count()) === 1, "corrupt .jpg passes the browser check (it can't decode it)");
    let resp = waitJson(o, /\/api\/logistics\/asset$/, "POST");
    await o.page.locator('form.log-fleet-form button[type="submit"]').click();
    let body = await (await resp).json().catch(() => ({}));
    L.check(body?.data?.code === "IMAGE_UNREADABLE", "server refuses it: IMAGE_UNREADABLE", body?.message);
    L.check(await toastHas(o, /corrupt-photo\.jpg: this image can't be read/), "owner sees \"this image can't be read\" toast");
    L.check(/\/fleet\/add/.test(o.page.url()) && !(await d.collection("logistics_assets").findOne({ registration: plate })), "form stays open, nothing saved");

    L.sec("18b. Same form: remove it, add exactly-10 MB photo + JPEG named .heic → saved");
    await o.page.locator("form.log-fleet-form .log-photo-slot--filled .log-photo-slot__remove").first().click();
    await photoInput.setInputFiles([F.exact10Jpg, F.reallyJpeg]);
    L.check(!(await L.waitText(o, /larger than 10 MB/, 1500)), "exactly 10 MB photo accepted by the picker");
    L.check((await o.page.locator("form.log-fleet-form .log-photo-slot--filled").count()) === 2, "2 photos in the form");
    resp = waitJson(o, /\/api\/logistics\/asset$/, "POST");
    await o.page.locator('form.log-fleet-form button[type="submit"]').click();
    body = await (await resp).json().catch(() => ({}));
    L.check(body?.success === true && (await L.waitText(o, /Vehicle added/)), "Vehicle added", body?.message);
    const truck = await d.collection("logistics_assets").findOne({ registration: plate });
    const [tp0, tp1] = truck?.photos || [];
    let j = await isJpeg(tp0);
    L.check(/exactly-10mb-photo\.jpg$/.test(tp0 || "") && j.ok && j.thumb && fs.statSync(diskOf(tp0)).size < MB, "10 MB photo stored as a small JPEG (resized + thumb)", `${j.why} ${tp0 && fs.existsSync(diskOf(tp0)) ? fs.statSync(diskOf(tp0)).size : "-"} bytes`);
    j = await isJpeg(tp1);
    L.check(/really-jpeg\.jpg$/.test(tp1 || "") && j.ok, "JPEG named .heic → read as JPEG, stored .jpg", `${tp1} ${j.why}`);
    const tdoc = (t) => (truck?.documents || []).find((x) => x.type === t);
    L.check(/exactly-10mb\.pdf$/.test(tdoc("rego")?.url || "") && fs.statSync(diskOf(tdoc("rego").url)).size === 10 * MB, "10 MB PDF stored byte-for-byte");
    L.check(/permit\.docx$/.test(tdoc("ownership")?.url || "") && fs.readFileSync(diskOf(tdoc("ownership").url)).equals(fs.readFileSync(F.docx)), "DOCX stored unchanged");

    L.sec("18c. Unit page: replace papers (HEIC insurance, oversized refused)");
    await L.goto(o, `/logistics/owner/fleet/${truck._id}`);
    await o.page.getByRole("button", { name: "Edit details" }).click();
    const insRow = o.page.locator(".log-doc-row").filter({ hasText: "Insurance" }).first();
    await insRow.locator("input[type=file]").setInputFiles(F.bigPdf);
    L.check(await toastHas(o, /big-paper\.pdf is larger than 10 MB/), "edit: 11 MB paper → toast");
    await insRow.locator("input[type=file]").setInputFiles(F.zip);
    L.check(await toastHas(o, /archive\.zip: only images, PDF or Word/), "edit: .zip paper → toast");
    await insRow.locator("input[type=file]").setInputFiles(F.heif);
    await L.pickDate(o.page, insRow.locator(".log-doc-row__expiry input"), 6);
    const ownEdit = o.page.locator(".log-doc-row").filter({ hasText: "Ownership" }).first();
    await ownEdit.locator("input[type=file]").setInputFiles(F.pdf);
    resp = waitJson(o, new RegExp(`/api/logistics/asset/${truck._id}$`), "PATCH");
    await o.page.getByRole("button", { name: "Save changes" }).click();
    body = await (await resp).json().catch(() => ({}));
    L.check(body?.success === true, "unit saved", body?.message);
    const truck2 = await d.collection("logistics_assets").findOne({ _id: truck._id });
    const t2doc = (t) => (truck2?.documents || []).find((x) => x.type === t);
    j = await isJpeg(t2doc("insurance")?.url);
    L.check(/iphone-photo\.jpg$/.test(t2doc("insurance")?.url || "") && j.ok, ".heif insurance paper → JPEG", `${t2doc("insurance")?.url} ${j.why}`);
    L.check(/insurance-paper\.pdf$/.test(t2doc("ownership")?.url || ""), "ownership paper replaced by the PDF", t2doc("ownership")?.url);
    L.check(/exactly-10mb\.pdf$/.test(t2doc("rego")?.url || ""), "untouched Road licence kept");

    // ───────────────────────── Cab + equipment
    L.sec("18d. Add cab: .heif photo, \"mif1\" HEIF permit");
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await o.page.locator('form.log-fleet-form button.log-cattile[aria-label="Cab"]').click();
    await o.page.fill('input[placeholder="Cab 1"]', `Upload Cab ${RUN}`);
    await o.page.locator("form.log-fleet-form .log-field", { hasText: "Cab type" }).locator("select").selectOption("car");
    const cabPlate = `UC${RUN}`.toUpperCase();
    await o.page.fill('input[placeholder="AEB1234"]', cabPlate);
    await pickBaseLocation(o);
    await o.page.locator("form.log-fleet-form .log-photo-slot--add input[type=file]").setInputFiles(F.heif);
    const permit = o.page.locator(".log-doc-row").filter({ hasText: "Taxi / PSV permit" }).first();
    await permit.locator("input[type=file]").setInputFiles(F.mif1);
    await L.pickDate(o.page, permit.locator(".log-doc-row__expiry input"), 3);
    const cabRego = o.page.locator(".log-doc-row").filter({ hasText: "Road licence" }).first();
    await cabRego.locator("input[type=file]").setInputFiles(F.pdf);
    await L.pickDate(o.page, cabRego.locator(".log-doc-row__expiry input"), 6);
    resp = waitJson(o, /\/api\/logistics\/asset$/, "POST");
    await o.page.locator('form.log-fleet-form button[type="submit"]').click();
    body = await (await resp).json().catch(() => ({}));
    L.check(body?.success === true, "Cab added", body?.message);
    const cab = await d.collection("logistics_assets").findOne({ registration: cabPlate });
    j = await isJpeg(cab?.photos?.[0]);
    L.check(/iphone-photo\.jpg$/.test(cab?.photos?.[0] || "") && j.ok && j.thumb, "cab .heif photo → JPEG + thumb", `${cab?.photos?.[0]} ${j.why}`);
    const permitDoc = (cab?.documents || []).find((x) => x.type === "taxi_permit");
    j = await isJpeg(permitDoc?.url);
    L.check(/samsung-photo\.jpg$/.test(permitDoc?.url || "") && j.ok, "\"mif1\" HEIF permit → JPEG", `${permitDoc?.url} ${j.why}`);

    L.sec("18e. Add equipment: HEIC without extension + HEIC named .jpg");
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    await o.page.locator('form.log-fleet-form button.log-cattile[aria-label="Agricultural"]').click();
    const eqName = `Upload Tractor ${RUN}`;
    await o.page.fill('input[placeholder="JD Compact 1"]', eqName);
    await o.page.fill('input[placeholder="John Deere"]', "John Deere");
    await pickBaseLocation(o);
    const priceSel = 'input[aria-label="Price per day"], input[aria-label="Price per hour"]';
    if (await o.page.locator(priceSel).count()) await L.typeMoney(o.page, priceSel, "120");
    const picks = o.page.locator("form.log-fleet-form .log-pick-field");
    await picks.nth(0).click();
    await o.page.waitForSelector(".log-modal .log-eq-tile");
    await o.page.locator(".log-modal .log-eq-tile", { hasText: "Tractor" }).first().click();
    await picks.nth(1).click();
    await o.page.waitForSelector(".log-modal .log-subpick__opt");
    await o.page.locator(".log-modal .log-subpick__opt").first().click();
    await o.page.locator("form.log-fleet-form .log-photo-slot--add input[type=file]").setInputFiles([F.extless, mem(F.disguised)]);
    L.check((await o.page.locator("form.log-fleet-form .log-photo-slot--filled").count()) === 2, "both kept by the picker (no-extension image/heic + .jpg)");
    resp = waitJson(o, /\/api\/logistics\/asset$/, "POST");
    await o.page.locator('form.log-fleet-form button[type="submit"]').click();
    body = await (await resp).json().catch(() => ({}));
    L.check(body?.success === true, "Equipment added", body?.message);
    const eq = await d.collection("logistics_assets").findOne({ owner_id: OID(owner._id), name: eqName });
    const [e0, e1] = eq?.photos || [];
    j = await isJpeg(e0);
    L.check(/IMG_2001\.jpg$/.test(e0 || "") && j.ok && j.thumb, "HEIC without extension → IMG_2001.jpg (JPEG)", `${e0} ${j.why}`);
    j = await isJpeg(e1);
    L.check(/whatsapp-photo\.jpg$/.test(e1 || "") && j.ok && j.thumb, "HEIC named .jpg → converted (real JPEG now)", `${e1} ${j.why}`);
    await L.goto(o, `/logistics/owner/fleet/${eq._id}`);
    await o.page.waitForTimeout(2000);
    const eqShown = await imagesLoaded(o, [baseName(e0), baseName(e1)]);
    L.check(eqShown.every((x) => x === true), "equipment page shows both photos", eqShown);

    // ───────────────────────── Operator: invite → activate → own photo → owner edits
    L.sec("18f. Invite operator (truck), activate, operator sees own photo");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    const opEmail = `up2.op.${RUN}@e2e.example.com`;
    const opName = `Upload Operator2 ${RUN}`;
    await o.page.fill('input[placeholder="name@example.com"]', opEmail);
    await o.page.fill('input[placeholder="Full name"]', opName);
    const profileInput = () => o.page.locator("input[type=file]:not([multiple])[accept='image/*,.heic,.heif']").first();
    await profileInput().setInputFiles(F.pdf);
    L.check(await toastHas(o, /insurance-paper\.pdf: photos must be images/), "PDF as profile photo → toast");
    await profileInput().setInputFiles(F.heic);
    const lic = o.page.locator(".log-doc-row").filter({ hasText: "Driving / plant licence" }).first();
    await lic.locator("input[type=file]").setInputFiles(F.pdf);
    await L.pickDate(o.page, lic.locator(".log-doc-row__expiry input"), 8);
    await o.page.locator(".log-asset-pick__list li").filter({ hasText: truckName }).locator('input[type="checkbox"]').check();
    resp = waitJson(o, /\/api\/logistics\/sub-user$/, "POST");
    await o.page.locator('form button[type="submit"]').last().click();
    body = await (await resp).json().catch(() => ({}));
    L.check(body?.success === true, "invite sent", body?.message);
    const inv = await d.collection("logistics_invites").findOne({ email: opEmail });
    const op = await A("up2-operator");
    await L.goto(op, `/logistics/invite?token=${inv.token}`, "#invite-password");
    await op.page.fill("#invite-password", "Passw0rd!");
    await op.page.fill("#invite-password-confirm", "Passw0rd!");
    await op.page.locator('button[type="submit"]').click();
    await op.page.waitForURL(/\/logistics\/driver/, { timeout: 20000 });
    const opUser = await d.collection("users").findOne({ email: opEmail });
    j = await isJpeg(opUser?.profile_image);
    L.check(/iphone-photo\.jpg$/.test(opUser?.profile_image || "") && j.ok, "activated operator keeps the HEIC photo as JPEG", `${opUser?.profile_image} ${j.why}`);
    await op.page.waitForTimeout(2000);
    let opShown = await imagesLoaded(op, [baseName(opUser?.profile_image)]);
    L.check(opShown[0] === true, "operator's own pages show their photo", opShown);

    L.sec("18g. Owner edits the operator: new .heif photo, HEIC medical, oversized refused");
    await L.goto(o, "/logistics/owner/operators");
    await o.page.waitForTimeout(1500);
    await o.page.locator("tr", { hasText: opName }).getByRole("button", { name: "Edit" }).click();
    await o.page.waitForSelector('input[aria-label="Pay amount"], .log-doc-row', { timeout: 10000 });
    await profileInput().setInputFiles(F.bigJpg);
    L.check(await toastHas(o, /big-photo\.jpg is larger than 10 MB/), "edit: >10 MB photo → toast");
    await profileInput().setInputFiles(F.heif);
    const med = o.page.locator(".log-doc-row").filter({ hasText: "Medical" }).first();
    await med.locator("input[type=file]").setInputFiles(F.bigPdf);
    L.check(await toastHas(o, /larger than 10 MB/), "edit: 11 MB medical paper → toast");
    await med.locator("input[type=file]").setInputFiles(F.heic);
    await L.pickDate(o.page, med.locator(".log-doc-row__expiry input"), 6);
    resp = waitJson(o, new RegExp(`/api/logistics/sub-user/${opUser._id}$`), "PATCH");
    await o.page.locator('form button[type="submit"]').last().click();
    body = await (await resp).json().catch(() => ({}));
    L.check(body?.success === true, "operator saved", body?.message);
    const opUser2 = await d.collection("users").findOne({ _id: opUser._id });
    j = await isJpeg(opUser2?.profile_image);
    L.check(opUser2?.profile_image !== opUser.profile_image && /iphone-photo\.jpg$/.test(opUser2?.profile_image || "") && j.ok, "new .heif photo stored as JPEG", `${opUser2?.profile_image} ${j.why}`);
    const medDoc = (opUser2?.logistics_documents || []).find((x) => x.type === "medical");
    j = await isJpeg(medDoc?.url);
    L.check(/\.jpg$/.test(medDoc?.url || "") && j.ok, "HEIC medical paper → JPEG", `${medDoc?.url} ${j.why}`);
    await op.page.reload({ waitUntil: "domcontentloaded" });
    await op.page.waitForTimeout(2500);
    opShown = await imagesLoaded(op, [baseName(opUser2?.profile_image)]);
    L.check(opShown[0] === true, "operator now sees the new photo", opShown);

    L.sec("18h. Operator goes live → Search card shows the truck photo");
    await L.goto(op, "/logistics/driver", ".log-dash-avail-controls");
    await op.page.locator('select[aria-label="Set status"]').selectOption("available_now");
    await op.page.getByRole("button", { name: "Update status" }).click();
    await op.page.waitForTimeout(2500);
    const cust = await L.makeCustomer(`up2.cust.${RUN}`);
    const c = await A("up2-customer");
    await L.seedAuth(c, { token: cust.token, user: cust });
    await L.goto(c, "/logistics/search");
    await c.page.fill('input[placeholder="Truck, tractor, unit or company name"]', truckName);
    await c.page.getByRole("button", { name: /Search trucks/ }).click();
    await c.page.waitForTimeout(3000);
    L.check((await L.bodyText(c)).includes(truckName), "truck found in Search");
    const cardShown = await imagesLoaded(c, [baseName(tp0)]);
    L.check(cardShown[0] === true, "Search card shows the converted photo", cardShown);
    await L.goto(c, `/logistics/asset/${truck._id}`);
    await c.page.waitForTimeout(2000);
    const detailShown = await imagesLoaded(c, [baseName(tp0), baseName(tp1)]);
    L.check(detailShown.every((x) => x === true), "customer unit page shows both photos", detailShown);

    // ───────────────────────── Post job: return trip + equipment hire + corrupt
    L.sec("18i. Post job, round trip: return-trip photo picker");
    await L.goto(c, "/logistics/post", "form.log-form-card--post");
    await L.pickLocation(c, 0, null);
    await L.pickLocation(c, 1, "Chitungwiza");
    await c.page.fill('input[placeholder="e.g. Construction materials"]', `Round trip goods ${RUN}`);
    await L.vehicleSelect(c.page).selectOption("4 ton");
    await c.page.fill('input[placeholder="8"]', "3");
    await c.page.locator(".log-when__opt", { hasText: "Schedule" }).click();
    await L.pickDate(c.page, c.page.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first(), 1, 15);
    await c.page.locator("label", { hasText: "Return trip" }).locator("input[type=checkbox]").check();
    await c.page.locator(".log-return-panel input").first().fill("Empty pallets");
    await c.page.locator('.log-return-panel input[placeholder="2"]').fill("1").catch(() => {});
    await L.typeMoney(c.page, 'input[aria-label="Price"]', "500");
    const returnInput = c.page.locator(".log-return-panel input[type=file]").first();
    const returnThumbs = () => c.page.locator(".log-return-panel .log-upload-thumb").count();
    await returnInput.setInputFiles(F.bigJpg);
    L.check(await toastHas(c, /big-photo\.jpg is larger than 10 MB/), "return photo >10 MB → toast");
    await returnInput.setInputFiles(F.docx);
    L.check(await toastHas(c, /permit\.docx: photos must be images/), "return photo .docx → toast");
    await returnInput.setInputFiles([F.heic, F.mif1]);
    L.check((await returnThumbs()) === 2, "return HEIC + HEIF added", await returnThumbs());
    await c.page.locator(".log-upload--post input[type=file]").first().setInputFiles(F.jpg);
    resp = waitJson(c, /\/api\/logistics\/job$/, "POST");
    await c.page.locator('form.log-form-card--post button[type="submit"]').click();
    body = await (await resp).json().catch(() => ({}));
    L.check(body?.success === true, "round-trip job posted", body?.message);
    await c.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 20000 }).catch(() => {});
    const rtId = body?.data?.job?._id;
    const rt = rtId && await d.collection("transport_jobs").findOne({ _id: OID(rtId) });
    const ret = rt?.return_trip?.images || [];
    const r0 = await isJpeg(ret[0]);
    const r1 = await isJpeg(ret[1]);
    L.check(ret.length === 2 && r0.ok && r1.ok && ret.every((u) => /\.jpg$/.test(u)), "return-trip photos stored as JPEG", `${ret} | ${r0.why} | ${r1.why}`);
    L.check(rt?.images?.length === 1 && (await isJpeg(rt.images[0])).ok, "outbound photo stored", rt?.images);
    await c.page.waitForTimeout(2000);
    const rtShown = await imagesLoaded(c, ret.map(baseName));
    L.check(rtShown.every((x) => x === true), "job page shows the return-trip photos", rtShown);

    L.sec("18j. Post job: corrupt photo refused with a message (form kept)");
    await L.goto(c, "/logistics/post", "form.log-form-card--post");
    await L.pickLocation(c, 0, null);
    await L.pickLocation(c, 1, "Chitungwiza");
    await c.page.fill('input[placeholder="e.g. Construction materials"]', `Corrupt photo goods ${RUN}`);
    await L.vehicleSelect(c.page).selectOption("4 ton");
    await c.page.fill('input[placeholder="8"]', "3");
    await c.page.locator(".log-when__opt", { hasText: "Schedule" }).click();
    await L.pickDate(c.page, c.page.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first(), 1, 15);
    await L.typeMoney(c.page, 'input[aria-label="Price"]', "300");
    await c.page.locator(".log-upload--post input[type=file]").first().setInputFiles(F.corrupt);
    resp = waitJson(c, /\/api\/logistics\/job$/, "POST");
    await c.page.locator('form.log-form-card--post button[type="submit"]').click();
    body = await (await resp).json().catch(() => ({}));
    L.check(body?.data?.code === "IMAGE_UNREADABLE", "server: IMAGE_UNREADABLE", body?.message);
    L.check(await toastHas(c, /corrupt-photo\.jpg: this image can't be read/), "customer sees \"can't be read\" toast");
    L.check(/\/logistics\/post/.test(c.page.url()) && !(await d.collection("transport_jobs").findOne({ goods_description: new RegExp(`Corrupt photo goods ${RUN}`) })), "stays on the form, no job created");

    L.sec("18k. Post job: equipment hire (Agricultural) site photos");
    await L.goto(c, "/logistics/post", "form.log-form-card--post");
    await c.page.getByText("Agricultural", { exact: true }).first().click();
    const ppicks = c.page.locator("form.log-form-card--post .log-pick-field");
    await ppicks.nth(0).click();
    await c.page.waitForSelector(".log-modal .log-eq-tile");
    await c.page.locator(".log-modal .log-eq-tile", { hasText: "Tractor" }).first().click();
    await ppicks.nth(1).click();
    await c.page.waitForSelector(".log-modal .log-subpick__opt");
    await c.page.locator(".log-modal .log-subpick__opt").first().click();
    await L.pickLocation(c, 0, null);
    const dates = c.page.locator(".log-plant-dates .log-dp-field input");
    await L.pickDate(c.page, dates.nth(0), 1, 15);
    await L.pickDate(c.page, dates.nth(1), 1, 20);
    await L.typeMoney(c.page, 'input[aria-label="Budget"]', "150");
    const siteInput = c.page.locator("form.log-form-card--post input[type=file]").first();
    L.check((await siteInput.getAttribute("accept")) === "image/*,.heic,.heif", "site photo picker accepts HEIC");
    await siteInput.setInputFiles(F.bigJpg);
    L.check(await toastHas(c, /larger than 10 MB/), "site photo >10 MB → toast");
    await siteInput.setInputFiles(F.pdf);
    L.check(await toastHas(c, /photos must be images/), "site photo PDF → toast");
    await siteInput.setInputFiles([mem(F.heic, "image/heic"), F.extless]);
    L.check((await c.page.locator(".log-upload-thumb").count()) === 2, "2 site photos added");
    resp = waitJson(c, /\/api\/logistics\/job$/, "POST");
    await c.page.locator('form.log-form-card--post button[type="submit"]').click();
    body = await (await resp).json().catch(() => ({}));
    L.check(body?.success === true, "equipment hire job posted", body?.message);
    const hire = body?.data?.job?._id && await d.collection("transport_jobs").findOne({ _id: OID(body.data.job._id) });
    const h0 = await isJpeg(hire?.images?.[0]);
    const h1 = await isJpeg(hire?.images?.[1]);
    L.check(hire?.images?.length === 2 && h0.ok && h1.ok && /IMG_2001\.jpg$/.test(hire.images[1]), "site photos stored as JPEG", `${hire?.images} | ${h0.why} | ${h1.why}`);

    // ───────────────────────── Phone
    L.sec("18l. Post job on a phone (390px): pickers, toast, preview, no sideways scroll");
    const m = await A("up2-customer-phone", { mobile: true });
    await L.seedAuth(m, { token: cust.token, user: cust });
    await L.goto(m, "/logistics/post", "form.log-form-card--post");
    await L.pickLocation(m, 0, null);
    await L.pickLocation(m, 1, "Chitungwiza");
    await m.page.fill('input[placeholder="e.g. Construction materials"]', `Phone goods ${RUN}`);
    await L.vehicleSelect(m.page).selectOption("4 ton");
    await m.page.fill('input[placeholder="8"]', "3");
    await m.page.locator(".log-when__opt", { hasText: "Schedule" }).click();
    await L.pickDate(m.page, m.page.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first(), 1, 15);
    await L.typeMoney(m.page, 'input[aria-label="Price"]', "300");
    const mInput = m.page.locator(".log-upload--post input[type=file]").first();
    await mInput.setInputFiles(F.bigJpg);
    L.check(await L.waitText(m, /larger than 10 MB/, 6000), "phone: >10 MB toast shown");
    await m.page.waitForTimeout(1200); // toast slides in from the right
    const toastBox = await m.page.locator(".Toastify__toast").first().boundingBox().catch(() => null);
    L.check(toastBox && toastBox.x >= 0 && toastBox.x + toastBox.width <= 391, "phone: toast fits the screen", toastBox);
    await m.page.locator(".Toastify__close-button").first().click().catch(() => {});
    await mInput.setInputFiles([F.heic, F.jpg]);
    L.check((await m.page.locator(".log-upload-thumb").count()) === 2, "phone: 2 previews");
    const over = await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    L.check(over <= 1, "phone: no sideways scroll with previews", over);
    await L.shot(m, "s18-phone-post-photos");
    resp = waitJson(m, /\/api\/logistics\/job$/, "POST");
    await m.page.locator('form.log-form-card--post button[type="submit"]').click();
    body = await (await resp).json().catch(() => ({}));
    L.check(body?.success === true, "phone: job posted", body?.message);
    const pj = body?.data?.job?._id && await d.collection("transport_jobs").findOne({ _id: OID(body.data.job._id) });
    L.check(pj?.images?.length === 2 && (await isJpeg(pj.images[0])).ok && /iphone-photo\.jpg$/.test(pj.images[0]), "phone: HEIC stored as JPEG", pj?.images);
    await m.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 20000 }).catch(() => {});
    await m.page.waitForTimeout(2000);
    const mShown = await imagesLoaded(m, (pj?.images || []).map(baseName));
    L.check(mShown.every((x) => x === true), "phone: job page shows the photos", mShown);
    const over2 = await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    L.check(over2 <= 1, "phone: job page no sideways scroll", over2);

    for (const a of actors) {
      L.check(a.errors.length === 0, `${a.name}: no console errors`, a.errors.slice(0, 3));
      L.check(a.apiFails.length === 0, `${a.name}: no 5xx`, a.apiFails.slice(0, 3));
    }
  } catch (e) {
    L.check(false, `stage crashed: ${e.message.split("\n")[0]}`);
    for (const a of actors) await L.shot(a, "s18-crash");
    console.error(e);
  } finally {
    await L.done();
  }
})();
