/* Stage 17 — upload rules (19 Oct 2026), all in the browser + direct API probes.
   Every logistics upload: max 10 MB per file; only images (incl. iPhone HEIC/HEIF),
   PDF, DOC/DOCX; HEIC is converted to JPG, then the normal resize (1920px + thumb_);
   PDF / Word stored untouched. Covers the Fleet add form, unit edit, Post job,
   operator invite, and the API (bypassing the web checks). Fresh owner + customer. */
const L = require("./lib");
const fs = require("fs");
const path = require("path");

const { MB, diskOf, thumbOf, isJpeg, makeFixtures, upload, toastHas, imagesLoaded } = require("./upload-helpers");

(async () => {
  const RUN = Date.now().toString(36).slice(-6);
  const d = await L.db();
  const actors = [];
  const A = async (n, opts) => { const a = await L.actor(n, opts); actors.push(a); return a; };
  try {
    const F = await makeFixtures();
    const owner = await L.makeCustomer(`up.owner.${RUN}`, 4);
    await d.collection("users").updateOne({ _id: new L.mongoose.Types.ObjectId(owner._id) }, { $set: { company_name: `Upload Freight ${RUN}`, full_name: `Upload Owner ${RUN}` } });
    L.check((await L.approveOwner(owner._id))?.data?.approval?.status === "approved", "fresh owner approved");
    const o = await A("up-owner");
    await L.seedAuth(o, { token: owner.token, user: owner });

    // ───────────────────────── Fleet add form
    L.sec("17a. Add truck: photo + paper pickers refuse >10 MB and other types");
    await L.goto(o, "/logistics/owner/fleet/add", "form.log-fleet-form");
    const plate = `UP${RUN}`.toUpperCase();
    await o.page.fill('input[placeholder="Truck 1"]', `Upload Truck ${RUN}`);
    await o.page.fill('input[placeholder="AEB1234"]', plate);
    await o.page.locator(".log-location-btn").first().click();
    await o.page.waitForSelector(".simba-book-loc-modal");
    await o.page.waitForTimeout(2500);
    await o.page.locator(".simba-book-loc-modal .btn-primary").click();

    const photoInput = o.page.locator("form.log-fleet-form .log-photo-slot--add input[type=file]");
    const filled = () => o.page.locator("form.log-fleet-form .log-photo-slot--filled").count();
    L.check((await photoInput.getAttribute("accept")) === "image/*,.heic,.heif", "photo picker accepts iPhone HEIC");
    await photoInput.setInputFiles(F.bigJpg);
    L.check(await toastHas(o, /big-photo\.jpg is larger than 10 MB/), "10 MB + 1 byte photo → toast");
    L.check((await filled()) === 0, "oversized photo not added");
    await photoInput.setInputFiles(F.zip);
    L.check(await toastHas(o, /archive\.zip: photos must be images/), ".zip photo → toast");
    L.check((await filled()) === 0, ".zip not added");
    await photoInput.setInputFiles(F.pdf);
    L.check(await toastHas(o, /insurance-paper\.pdf: photos must be images/), "PDF in the photo picker → toast");
    L.check((await filled()) === 0, "PDF not added as a photo");
    await photoInput.setInputFiles([F.heic, F.jpg, F.bigJpg]);
    L.check(await toastHas(o, /big-photo\.jpg is larger/), "mixed pick: the big one refused…");
    L.check((await filled()) === 2, "…the HEIC + JPG are kept (2 slots)", await filled());

    const rego = o.page.locator(".log-doc-row").filter({ hasText: "Road licence" }).first();
    L.check((await rego.locator("input[type=file]").getAttribute("accept")) === ".pdf,image/*,.heic,.heif", "paper picker: PDF + images + HEIC");
    await rego.locator("input[type=file]").setInputFiles(F.bigPdf);
    L.check(await toastHas(o, /big-paper\.pdf is larger than 10 MB/), "11 MB PDF paper → toast");
    L.check(!(await rego.innerText()).includes("big-paper"), "oversized paper not attached");
    await rego.locator("input[type=file]").setInputFiles(F.pdf);
    await L.pickDate(o.page, rego.locator(".log-doc-row__expiry input"), 6);
    const ins = o.page.locator(".log-doc-row").filter({ hasText: "Insurance" }).first();
    await ins.locator("input[type=file]").setInputFiles(F.heic);
    await L.pickDate(o.page, ins.locator(".log-doc-row__expiry input"), 6);
    const createResp = o.page.waitForResponse((r) => /\/api\/logistics\/asset$/.test(r.url()) && r.request().method() === "POST", { timeout: 30000 });
    await o.page.locator('form.log-fleet-form button[type="submit"]').click();
    const created = await (await createResp).json().catch(() => ({}));
    L.check(await L.waitText(o, /Vehicle added/), "truck saved with HEIC + JPG photos, PDF + HEIC papers", created?.success === false ? created.message : "");

    L.sec("17b. Stored files: HEIC → JPG (≤1920px + thumb), JPG resized, PDF untouched");
    const asset = await d.collection("logistics_assets").findOne({ registration: plate });
    L.check(asset?.photos?.length === 2, "2 photos stored", asset?.photos);
    const [p0, p1] = asset?.photos || [];
    L.check(/iphone-photo\.jpg$/i.test(p0 || ""), "iPhone photo stored as .jpg", p0);
    const j0 = await isJpeg(p0);
    L.check(j0.ok && j0.thumb, "HEIC photo → real JPEG ≤1920px + thumb_", j0.why);
    const j1 = await isJpeg(p1);
    L.check(j1.ok && /1920x/.test(j1.why) && j1.thumb, "2400px JPG resized to 1920 + thumb_", j1.why);
    const docOf = (t) => (asset?.documents || []).find((x) => x.type === t);
    const regoDoc = docOf("rego");
    L.check(/insurance-paper\.pdf$/.test(regoDoc?.url || ""), "PDF paper keeps .pdf", regoDoc?.url);
    L.check(fs.existsSync(diskOf(regoDoc?.url)) && fs.readFileSync(diskOf(regoDoc.url)).equals(fs.readFileSync(F.pdf)), "PDF bytes identical (not optimised)");
    L.check(!fs.existsSync(thumbOf(diskOf(regoDoc?.url))), "no thumb_ for a PDF");
    const insDoc = docOf("insurance");
    const ji = await isJpeg(insDoc?.url);
    L.check(/\.jpg$/.test(insDoc?.url || "") && ji.ok, "HEIC insurance paper → JPEG", `${insDoc?.url} ${ji.why}`);

    L.sec("17c. Unit page shows the photos; edit refuses >10 MB, adds HEIC");
    await L.goto(o, `/logistics/owner/fleet/${asset._id}`);
    await o.page.waitForTimeout(1500);
    const shown = await imagesLoaded(o, [path.basename(p0), path.basename(p1)].map((n) => n.replace(/\.jpg$/, "")));
    L.check(shown.every((x) => x === true), "both photos render (naturalWidth > 0)", shown);
    await o.page.getByRole("button", { name: "Edit details" }).click();
    const editInput = o.page.locator(".log-photo-slot--add input[type=file][multiple]").first();
    await editInput.setInputFiles(F.bigJpg);
    L.check(await toastHas(o, /larger than 10 MB/), "edit: oversized photo → toast");
    const before = await o.page.locator(".log-photo-slot--filled").count();
    await editInput.setInputFiles(F.heic);
    L.check((await o.page.locator(".log-photo-slot--filled").count()) === before + 1, "edit: HEIC added");
    const patchResp = o.page.waitForResponse((r) => r.url().includes(`/logistics/asset/${asset._id}`) && r.request().method() === "PATCH", { timeout: 30000 });
    await o.page.getByRole("button", { name: "Save changes" }).click();
    const patched = await (await patchResp).json().catch(() => ({}));
    L.check(patched?.success === true, "edit saved", patched?.message);
    const asset2 = await d.collection("logistics_assets").findOne({ _id: asset._id });
    const p2 = (asset2?.photos || []).find((x) => !(asset.photos || []).includes(x));
    L.check(asset2?.photos?.length === 3 && /\.jpg$/.test(p2 || "") && (await isJpeg(p2)).ok, "edit saved the HEIC as JPEG", asset2?.photos);

    // ───────────────────────── Post job (customer)
    L.sec("17d. Post job: photo picker rules + HEIC job photo");
    const cust = await L.makeCustomer(`up.cust.${RUN}`);
    const c = await A("up-customer");
    await L.seedAuth(c, { token: cust.token, user: cust });
    await L.goto(c, "/logistics/post", "form.log-form-card--post");
    await L.pickLocation(c, 0, null);
    await L.pickLocation(c, 1, "Chitungwiza");
    await c.page.fill('input[placeholder="e.g. Construction materials"]', `Upload goods ${RUN}`);
    await L.vehicleSelect(c.page).selectOption("4 ton");
    await c.page.fill('input[placeholder="8"]', "3");
    await c.page.locator(".log-when__opt", { hasText: "Schedule" }).click();
    await L.pickDate(c.page, c.page.locator(".log-field").filter({ hasText: "When" }).locator(".log-dp-field input").first(), 1, 15);
    await L.typeMoney(c.page, 'input[aria-label="Price"]', "300");
    const jobInput = c.page.locator(".log-upload--post input[type=file]").first();
    const thumbs = () => c.page.locator(".log-upload-thumb").count();
    await jobInput.setInputFiles(F.bigJpg);
    L.check(await toastHas(c, /larger than 10 MB/), "job photo >10 MB → toast");
    await jobInput.setInputFiles(F.zip);
    L.check(await toastHas(c, /archive\.zip: photos must be images/), "job photo .zip → toast");
    L.check((await thumbs()) === 0, "nothing added");
    await jobInput.setInputFiles([F.heic, F.jpg]);
    L.check((await thumbs()) === 2, "HEIC + JPG added", await thumbs());
    await c.page.locator('form.log-form-card--post button[type="submit"]').click();
    await c.page.waitForURL(/\/logistics\/jobs\/[a-f0-9]{24}/, { timeout: 30000 });
    const jobId = c.page.url().match(/jobs\/([a-f0-9]{24})/)[1];
    L.check(true, "job posted with photos");
    const job = await d.collection("transport_jobs").findOne({ _id: new L.mongoose.Types.ObjectId(jobId) })
      || await d.collection("transportjobs").findOne({ _id: new L.mongoose.Types.ObjectId(jobId) });
    const ji0 = await isJpeg(job?.images?.[0]);
    L.check(job?.images?.length === 2 && /iphone-photo\.jpg$/.test(job.images[0]) && ji0.ok && ji0.thumb, "job HEIC photo stored as JPEG + thumb", `${job?.images} ${ji0.why}`);
    await c.page.waitForTimeout(1500);
    const jobShown = await imagesLoaded(c, [path.basename(job?.images?.[0] || "x").replace(/\.jpg$/, "")]);
    L.check(jobShown[0] === true, "job page shows the converted photo", jobShown);

    L.sec("17d2. Edit job: add another iPhone photo");
    await L.goto(c, `/logistics/post?edit=${jobId}`, "form.log-form-card--post");
    await c.page.locator(".log-upload--post input[type=file]").first().setInputFiles(F.heic);
    await c.page.locator('form.log-form-card--post button[type="submit"]').click();
    L.check(await L.waitText(c, /Job updated/), "Job updated (photo upload succeeded)");
    const jobEdited = await d.collection("transport_jobs").findOne({ _id: job._id });
    L.check(jobEdited?.images?.length === 3 && /\.jpg$/.test(jobEdited.images[2]) && (await isJpeg(jobEdited.images[2])).ok, "edit added the HEIC as JPEG", jobEdited?.images);

    // ───────────────────────── Operator invite
    L.sec("17e. Operator invite: HEIC profile photo + licence, extra doc rules");
    await L.goto(o, "/logistics/owner/operators/add", "form");
    const opEmail = `up.op.${RUN}@e2e.example.com`;
    await o.page.fill('input[placeholder="name@example.com"]', opEmail);
    await o.page.fill('input[placeholder="Full name"]', `Upload Operator ${RUN}`);
    const profileInput = o.page.locator("input[type=file]:not([multiple])[accept='image/*,.heic,.heif']").first();
    await profileInput.setInputFiles(F.bigJpg);
    L.check(await toastHas(o, /larger than 10 MB/), "profile photo >10 MB → toast");
    await profileInput.setInputFiles(F.heic);
    const lic = o.page.locator(".log-doc-row").filter({ hasText: "Driving / plant licence" }).first();
    await lic.locator("input[type=file]").setInputFiles(F.bigPdf);
    L.check(await toastHas(o, /larger than 10 MB/), "licence >10 MB → toast");
    await lic.locator("input[type=file]").setInputFiles(F.heic);
    await L.pickDate(o.page, lic.locator(".log-doc-row__expiry input"), 6);
    const extra = o.page.locator("label", { hasText: "Add doc" }).locator("input[type=file]");
    await extra.setInputFiles(F.zip);
    L.check(await toastHas(o, /only images, PDF or Word/), "extra doc .zip → toast");
    await extra.setInputFiles(F.pdf);
    const inviteResp = o.page.waitForResponse((r) => /\/api\/logistics\/sub-user$/.test(r.url()) && r.request().method() === "POST", { timeout: 30000 });
    await o.page.locator('form button[type="submit"]').last().click();
    const invited = await (await inviteResp).json().catch((e) => ({ message: e.message }));
    L.check(invited?.success === true, "invite saved", invited?.message);
    await o.page.waitForTimeout(1500);
    // The operator account is created on activation; until then the invite holds the files
    const op = await d.collection("logistics_invites").findOne({ email: opEmail });
    const opStr = JSON.stringify(op || {});
    const opJpgs = [...opStr.matchAll(/"(\/logistics\/operators[^"]+\.(jpg|pdf|heic))"/gi)].map((m) => m[1]);
    L.check(!!op, "invite record created");
    L.check(/iphone-photo\.jpg$/.test(op?.profile_image || "") && (await isJpeg(op.profile_image)).ok, "operator HEIC profile photo → JPEG", op?.profile_image);
    L.check(opJpgs.some((u) => /docs\/.*iphone-photo\.jpg$/.test(u)), "HEIC licence scan → JPEG", opJpgs);
    L.check(opJpgs.some((u) => /insurance-paper\.pdf$/.test(u)), "extra PDF doc stored as .pdf", opJpgs);
    L.check(!opJpgs.some((u) => /\.heic$/i.test(u)), "no raw .heic stored");

    // ───────────────────────── API without the web checks
    L.sec("17f. API (bypasses the browser): size + type enforced on the server");
    const before17f = (await d.collection("transport_jobs").findOne({ _id: job._id }))?.images?.length;
    let r0 = await upload("POST", `/logistics/job/${jobId}/images`, cust.token, [["images", { file: F.corrupt, type: "image/jpeg" }]]);
    L.check(r0.http === 200 && r0.success === false && r0.data?.code === "IMAGE_UNREADABLE", "corrupt JPG → IMAGE_UNREADABLE (not a 500)", r0.message || r0.raw);
    r0 = await upload("POST", `/logistics/job/${jobId}/images`, cust.token, [["images", { file: F.zip, name: "empty.heic", type: "image/heic" }]]);
    L.check(r0.data?.code === "IMAGE_UNREADABLE", "fake .heic → IMAGE_UNREADABLE", r0.message);
    let r = await upload("POST", `/logistics/job/${jobId}/images`, cust.token, [["images", { file: F.bigJpg, type: "image/jpeg" }]]);
    L.check(r.success === false && r.data?.code === "FILE_TOO_LARGE" && /10 MB/.test(r.message), "10 MB + 1 → FILE_TOO_LARGE (JSON, not an HTML 500)", r.message || r.raw);
    r = await upload("POST", `/logistics/job/${jobId}/images`, cust.token, [["images", { file: F.zip, name: "tool.exe" }]]);
    L.check(r.success === false && r.data?.code === "FILE_TYPE_NOT_ALLOWED", ".exe → FILE_TYPE_NOT_ALLOWED", r.message);
    r = await upload("POST", `/logistics/job/${jobId}/images`, cust.token, [["images", { file: F.heic, name: "IMG_7781", type: "image/heic" }]]);
    const jobAfter = await d.collection("transport_jobs").findOne({ _id: job._id });
    const added = (jobAfter?.images || []).slice(before17f || 0);
    L.check(r.success !== false && added.length === 1 && /IMG_7781\.jpg$/.test(added[0]) && (await isJpeg(added[0])).ok, "HEIC without extension (detected by bytes) → JPEG", `${r.message} ${added}`);
    r = await upload("POST", `/logistics/job/${jobId}/images`, cust.token, [["images", { file: F.pdf10, type: "application/pdf" }]]);
    L.check(r.success === false && r.data?.code === "FILE_TYPE_NOT_ALLOWED" && /photos must be images/.test(r.message), "a PDF is refused as a job PHOTO (photo fields take images only)", r.message);
    r = await upload("PATCH", `/logistics/asset/${asset._id}`, owner.token, [
      ["documents", { file: F.pdf10, type: "application/pdf" }],
      ["documents", { file: F.docx, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }],
      ["document_types", JSON.stringify(["ownership", "other"])],
      ["document_expires", JSON.stringify(["", ""])],
    ]);
    const asset3 = await d.collection("logistics_assets").findOne({ _id: asset._id });
    const docs3 = (asset3?.documents || []).map((x) => x.url);
    const pdf10 = docs3.find((u) => /exactly-10mb\.pdf$/.test(u));
    L.check(r.success !== false && pdf10 && fs.statSync(diskOf(pdf10)).size === 10 * MB, "exactly 10 MB PDF accepted, stored byte-for-byte", r.message);
    L.check(docs3.some((u) => /permit\.docx$/.test(u)), "DOCX paper accepted, kept as .docx", docs3);
    r = await upload("PATCH", `/logistics/asset/${asset._id}`, owner.token, [["documents", { file: F.bigPdf, type: "application/pdf" }], ["document_types", JSON.stringify(["other"])]]);
    L.check(r.data?.code === "FILE_TOO_LARGE", "11 MB paper → FILE_TOO_LARGE", r.message);
    r = await upload("PATCH", `/logistics/asset/${asset._id}`, owner.token, [["photos", { file: F.docx }]]);
    L.check(r.data?.code === "FILE_TYPE_NOT_ALLOWED", "Word file as a unit PHOTO → refused", r.message);

    for (const a of actors) {
      L.check(a.errors.length === 0, `${a.name}: no console errors`, a.errors.slice(0, 3));
      L.check(a.apiFails.length === 0, `${a.name}: no 5xx`, a.apiFails.slice(0, 3));
    }
  } catch (e) {
    L.check(false, `stage crashed: ${e.message}`);
    for (const a of actors) await L.shot(a, "s17-crash");
    console.error(e);
  } finally {
    await L.done();
  }
})();
