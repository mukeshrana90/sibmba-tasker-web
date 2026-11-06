/* Stage 27 — several owner IDs (v2.7.65): one per kind, each checked by the admin; a driving
   licence kept as an owner ID is the owner's licence too, so the set-up doesn't ask for it twice. */
const L = require("./lib");
const F = require("./fleet-helpers");
const DOCS = require("./docs");

const { OID } = F;

(async () => {
  const RUN = L.loadState().RUN || "run";
  const C = L.cast(RUN);
  const pA = { ...C.slot("owner", "s27", 0), email: `s27.${String(RUN).toLowerCase()}@${C.DOMAIN}`, phone: C.phone("s27-owner") };
  const d = await L.db();
  const actors = [];
  const me = async (t) => (await L.api("GET", "/logistics/me", { token: t }))?.data?.owner_operator;
  const ids = async (id) => ((await d.collection("users").findOne({ _id: OID(id) })).logistics_business_documents || []).filter((x) => x.type === "owner_id");
  const blockCodes = (op) => (op?.blocks || []).map((b) => b.code);
  try {
    L.sec("27a. Only a national ID: the licence upload is asked for");
    const o = await F.makeOwner(pA);
    const info = { holder: pA.name, owner: pA.name, company: pA.company || pA.name };
    const idFile = await DOCS.docFor("owner_id", info);
    const addId = (kind) => L.apiForm("POST", "/logistics/business-docs", { token: o.token, body: { owner_id_kind: kind, owner_id_expires: L.docExpiryYmd() }, files: [["owner_id", idFile]] });
    let list = await ids(o._id);
    L.check(list.length === 1 && list[0].id_kind === "national_id", "starts with a national ID", list.map((x) => x.id_kind));
    let op = await me(o.token);
    L.check(op?.licence?.status === "missing" && op?.licence?.needs_upload === true && op?.licence?.source === null, "API: licence missing", op?.licence);
    const a = await L.actor("owner-27");
    actors.push(a);
    await L.seedAuth(a, { token: o.token, user: o });
    const openSetup = async () => {
      await L.goto(a, "/logistics/owner/fleet/add");
      await a.page.getByText("I operate it myself").first().click();
      await a.page.waitForSelector('[data-testid="owner-operator-setup"]', { timeout: 15000 });
      return a.page.locator('[data-testid="owner-operator-setup"]');
    };
    let setup = await openSetup();
    L.check(/Driving \/ plant licence/.test(await setup.innerText()), "form: licence row shown");
    L.check(!(await a.page.locator('[data-testid="owner-licence-from-id"]').count()), "form: no 'we'll use your licence' note");
    await L.shot(a, "s27-national-id-only");

    L.sec("27b. Add a passport and a driving licence: all kept, one per kind");
    await L.goto(a, "/edit-profile", '.log-bizdoc[data-type="owner_id"] .log-bizdoc__kind');
    const before = await a.page.locator('.log-bizdoc[data-type="owner_id"] .log-bizdoc__kind option').allInnerTexts();
    L.check(before.join() === "Passport,Driving licence", "list leaves out the national ID already added", before);
    let r = await addId("passport");
    L.check(r?.success !== false, "passport added", r?.message);
    r = await addId("driving_licence");
    L.check(r?.success !== false, "driving licence added", r?.message);
    list = await ids(o._id);
    L.check(list.map((x) => x.id_kind).sort().join() === "driving_licence,national_id,passport", "3 owner IDs on file", list.map((x) => x.id_kind));
    const passportUrl = list.find((x) => x.id_kind === "passport").url;
    const nationalUrl = list.find((x) => x.id_kind === "national_id").url;
    r = await addId("passport");
    list = await ids(o._id);
    L.check(list.length === 3 && list.find((x) => x.id_kind === "passport").url !== passportUrl, "same kind again replaces that one", list.length);
    L.check(list.find((x) => x.id_kind === "national_id").url === nationalUrl, "the national ID is untouched");
    L.check(list.find((x) => x.id_kind === "national_id").review?.status === "verified", "and stays Verified");
    L.check((await d.collection("users").findOne({ _id: OID(o._id) })).logistics_approval.status === "approved", "company stays approved");

    await L.goto(a, "/edit-profile", '.log-bizdoc[data-type="owner_id"]');
    const card = a.page.locator('.log-bizdoc[data-type="owner_id"]');
    await card.locator(".log-bizdoc__copy").first().waitFor({ timeout: 15000 });
    L.check((await card.locator(".log-bizdoc__copy").count()) === 3, "profile: all 3 listed", await card.locator(".log-bizdoc__copy").count());
    L.check(!(await card.locator(".log-bizdoc__upload").count()), "profile: one of each on file, so nothing more to add");
    await card.locator('[data-testid="owner-id-replace-passport"]').click();
    const options = await card.locator(".log-bizdoc__kind option").allInnerTexts();
    L.check(options.join() === "Passport", "Replace: only that kind is offered", options);
    L.check(/Replace Passport/.test(await card.locator(".log-bizdoc__upload").innerText()), "Replace: button says what it does", await card.locator(".log-bizdoc__upload").innerText());
    await card.locator('[data-testid="owner-id-replace-cancel"]').click();
    L.check(!(await card.locator(".log-bizdoc__upload").count()), "Cancel closes the form");
    await L.shot(a, "s27-profile");
    await a.page.setViewportSize({ width: 390, height: 844 });
    await a.page.waitForTimeout(600);
    L.check(await a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "profile: no sideways scroll on a phone");
    await a.page.setViewportSize({ width: 1440, height: 900 });

    L.sec("27c. Driving licence on file: no second upload");
    op = await me(o.token);
    L.check(op?.licence?.source === "owner_id" && op?.licence?.needs_upload === false && op?.licence?.status === "pending", "API: licence from the owner ID, pending", op?.licence);
    setup = await openSetup();
    L.check(!/Driving \/ plant licence/.test(await setup.innerText()), "form: licence row hidden");
    L.check(await a.page.locator('[data-testid="owner-licence-from-id"]').isVisible(), "form: says it uses that licence");
    await L.shot(a, "s27-licence-from-id");
    const face = (await L.photoFixtures(C.unit("truck", 270)))[0];
    r = await L.apiForm("POST", "/logistics/owner-operator/enable", { token: o.token, files: [["face_photo", face]] });
    L.check(r?.success !== false, "enable with the face photo only", r?.message);
    op = await me(o.token);
    L.check(op?.enabled === true && blockCodes(op).includes("LICENCE_PENDING"), "still waits for Simba to check the licence", blockCodes(op));

    L.sec("27d. Admin approves each one");
    const results = await L.verifyDocs("business", o._id);
    L.check(results.length >= 2 && results.every((x) => x?.success !== false), "admin verifies each owner ID", results.map((x) => x?.message));
    list = await ids(o._id);
    L.check(list.every((x) => x.review?.status === "verified"), "all 3 Verified", list.map((x) => x.review?.status));
    op = await me(o.token);
    L.check(op?.licence?.status === "verified" && !blockCodes(op).some((c) => c.startsWith("LICENCE") || c.startsWith("OWNER_ID")), "licence and owner ID checks pass", blockCodes(op));

    L.sec("27e. Rejections");
    const token = await L.adminToken();
    const reject = (doc) => L.api("POST", "/admin/logistics/documents/review", { token, body: { subject: "business", id: String(o._id), doc_id: String(doc._id), status: "rejected", reason: "Not readable" } });
    list = await ids(o._id);
    await reject(list.find((x) => x.id_kind === "driving_licence"));
    op = await me(o.token);
    L.check(op?.licence?.status === "rejected" && op?.licence?.needs_upload === true, "licence rejected: upload needed again", op?.licence);
    L.check(!blockCodes(op).includes("OWNER_ID_REJECTED"), "other IDs still meet the owner ID check", blockCodes(op));
    L.check((await d.collection("users").findOne({ _id: OID(o._id) })).logistics_approval.status === "approved", "company stays approved while another ID is good");
    setup = await openSetup();
    L.check(/Driving \/ plant licence/.test(await setup.innerText()), "form: licence row is back");
    await reject(list.find((x) => x.id_kind === "passport"));
    await reject(list.find((x) => x.id_kind === "national_id"));
    L.check((await d.collection("users").findOne({ _id: OID(o._id) })).logistics_approval.status === "pending", "no good ID left: company waits for approval again");
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s27-crash");
  }
  F.pageChecks(actors);
  await L.done();
})();
