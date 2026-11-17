/* Stage 29 — compulsory items: road units need a verified ZINARA, operators a verified selfie and
   (v2.7.68, 12 Nov) a verified driving / plant licence, self-operating owners face + licence,
   equipment 1 verified document. Roadworthy is optional (only warns) and keeps its reminders.
   Own accounts; needs only state.json RUN. */
const L = require("./lib");
const F = require("./fleet-helpers");
const DOCS = require("./docs");

const { OID } = F;

(async () => {
  const st = L.loadState();
  const RUN = String(st.RUN || "run").toLowerCase();
  const C = L.cast(RUN);
  const d = await L.db();
  const actors = [];
  const stamp = { owner: "s29o", operator: "s29p" };
  const person = (role, i, key) => ({ ...C.person(role, 60 + i), email: `${stamp[role]}${key}.${RUN}@${C.DOMAIN}`, phone: C.phone(`s29-${role}-${key}`) });
  const mkOwnerP = (i, key) => {
    const p = person("owner", i, key);
    return { ...p, company: p.company || `${p.name} Transport` };
  };

  await F.resetPeople([0, 1, 2].map((i) => mkOwnerP(i, ["a", "b", "c"][i]).email));

  const customer = await L.makeCustomer(`s29-${RUN}`);
  const inSearch = async (kind, id) => {
    const r = await L.api("GET", `/logistics/assets/search?kind=${kind}&limit=300`, { token: customer.token });
    return (r?.data?.data || []).some((x) => String(x.asset_id || x._id) === String(id));
  };
  const custView = async (id) => (await L.api("GET", `/logistics/asset/${id}`, { token: customer.token }))?.data?.asset?.availability;
  const ownerView = async (token, id) => (await L.api("GET", `/logistics/asset/${id}`, { token }))?.data;

  try {
    L.sec("29a. Truck with a verified ZINARA only is shown; operator needs face + licence (v2.7.68)");
    const owner = await F.makeOwner(mkOwnerP(0, "a"));
    const t1 = await F.makeUnit(owner, C.unit("truck", 290), { docs: { rego: 8 } });
    const doc1 = await d.collection("logistics_assets").findOne({ _id: OID(t1._id) });
    L.check((doc1?.documents || []).length === 1 && doc1.documents[0].type === "rego", "truck saved with ZINARA only (no roadworthy)", doc1?.documents?.map((x) => x.type));
    const opOk = await F.makeOperator(owner, person("operator", 0, "a"), { assets: [t1._id], licence: false, face: 1 });
    const u1 = await d.collection("users").findOne({ _id: OID(opOk._id) }, { projection: { logistics_documents: 1, logistics_face_review: 1 } });
    L.check(!(u1?.logistics_documents || []).length && u1?.logistics_face_review?.status === "verified", "operator has no licence, verified face", { docs: u1?.logistics_documents, face: u1?.logistics_face_review?.status });
    let r = await F.goLive(opOk, t1._id);
    L.check(r?.success === false && /licen[cs]e/i.test(r?.message || ""), "verified face but no licence → can't go live (licence compulsory)", r?.data?.code || r?.message);
    L.check(!(await inSearch("vehicle", t1._id)), "no licence: truck hidden");
    await L.giveOperatorLicence(owner.token, opOk._id, { holder: opOk.name, face: 1 });
    r = await F.goLive(opOk, t1._id);
    L.check(r?.success !== false, "verified face + verified licence → operator goes live", r);
    L.check(await inSearch("vehicle", t1._id), "truck with verified ZINARA only is listed");
    let cv = await custView(t1._id);
    L.check(cv?.bookable === true, "customer view: bookable", cv);

    L.sec("29b. Red-plate cab with a verified ZINARA only is shown");
    const cab = await F.makeUnit(owner, C.unit("cab", 290), { kind: "cab", docs: { rego: 8 }, body: { cab_class: "car", seats: 4, red_plate: "true" } });
    const opCab = await F.makeOperator(owner, person("operator", 3, "cab"), { assets: [cab._id], face: 2 });
    r = await F.goLive(opCab, cab._id);
    L.check(r?.success !== false, "cab operator goes live with no roadworthy on the red-plate cab", r);
    L.check(await inSearch("cab", cab._id), "red-plate cab with verified ZINARA only is listed");
    await F.goOffline(opCab);

    L.sec("29c. Roadworthy missing or rejected only warns; reminder still sent");
    const t2 = await F.makeUnit(owner, C.unit("truck", 291), { docs: { rego: 8, roadworthy: 8 }, verify: false });
    await L.verifyDocs("asset", t2._id, { only: ["rego"] });
    await L.reviewDocs("asset", t2._id, { status: "rejected", only: ["roadworthy"], reason: "Certificate unreadable" });
    const opR = await F.makeOperator(owner, person("operator", 4, "r"), { assets: [t2._id], face: 3 });
    r = await F.goLive(opR, t2._id);
    L.check(r?.success !== false, "operator goes live on a truck with a rejected roadworthy", r);
    L.check(await inSearch("vehicle", t2._id), "rejected roadworthy: truck still listed");
    cv = await custView(t2._id);
    L.check(cv?.bookable === true, "customer view: bookable", cv);
    await F.goOffline(opR);
    const ownerSide = await ownerView(owner.token, t2._id);
    const warn = ownerSide?.document_compliance?.warnings || ownerSide?.asset?.document_compliance?.warnings || [];
    L.check(warn.some((w) => /roadworthy/i.test(w)), "owner sees a warning for the rejected roadworthy", ownerSide?.document_compliance || warn);
    // Reminder (scoped run) for a roadworthy expiring in 5 days on another truck
    const t3 = await F.makeUnit(owner, C.unit("truck", 292), { docs: { rego: 8, roadworthy: 8 } });
    const rowT3 = await d.collection("logistics_assets").findOne({ _id: OID(t3._id) });
    const soon = new Date(Date.now() + 5 * F.DAY);
    await d.collection("logistics_assets").updateOne({ _id: OID(t3._id) }, { $set: { documents: rowT3.documents.map((x) => (x.type === "roadworthy" ? { ...x, expires: soon, review: x.review } : x)) } });
    const since = F.nowIso();
    const out = F.backend(`const s=require("./src/utils/logistics/documentExpiryScheduler");return s.processLogisticsDocumentExpiry({ownerIds:[${JSON.stringify(owner._id)}]})`);
    L.check(!out?.crash, "expiry reminder job runs (scoped to this owner)", out);
    const after = await d.collection("logistics_assets").findOne({ _id: OID(t3._id) });
    const rw = (after?.documents || []).find((x) => x.type === "roadworthy");
    L.check((rw?.expiry_reminders_sent || []).length > 0, "roadworthy reminder recorded", rw?.expiry_reminders_sent);
    L.check(F.outbox(since).some((m) => /roadworthy/i.test(JSON.stringify([m.subject, m.body, m.html, m.variables]))), "roadworthy reminder sent to the owner");

    L.sec("29d. Pending selfie hides the unit (operator takes it, v2.7.68)");
    const t4 = await F.makeUnit(owner, C.unit("truck", 293), { docs: { rego: 8 } });
    const opPending = await F.makeOperator(owner, person("operator", 5, "p"), { assets: [t4._id] });
    const selfie = await L.apiForm("PATCH", "/logistics/me/face-photo", { token: opPending.token, files: [["face_photo", DOCS.face(4)]] });
    L.check(selfie?.success !== false, "operator uploads a new selfie", selfie?.message);
    r = await F.goLive(opPending, t4._id);
    L.check(r?.success === false && r?.data?.code === "DOC_PENDING_CHECK" && /face photo/i.test(r?.message), "pending face: can't go live (DOC_PENDING_CHECK)", r);
    L.check(!(await inSearch("vehicle", t4._id)), "pending face: truck hidden");
    cv = await custView(t4._id);
    L.check(cv?.bookable === false, "customer view: not bookable", cv);
    await L.verifyFace(opPending._id);
    r = await F.goLive(opPending, t4._id);
    L.check(r?.success !== false, "face verified: operator goes live", r);
    L.check(await inSearch("vehicle", t4._id), "face verified: truck listed");
    await F.goOffline(opPending);

    L.sec("29e. Owner-operator: face + owner ID is not enough without a licence (v2.7.68)");
    const owner2 = await F.makeOwner(mkOwnerP(1, "b"));
    const t5 = await F.makeUnit(owner2, C.unit("truck", 294), { docs: { rego: 8 } });
    const en = await L.apiForm("POST", "/logistics/owner-operator/enable", { token: owner2.token, files: [["face_photo", DOCS.face(5)]] });
    L.check(en?.success !== false, "owner enables operating with the face photo", en?.message);
    await L.api("POST", "/admin/logistics/documents/review", { token: await L.adminToken(), body: { subject: "face_photo", id: owner2._id, status: "verified" } });
    let me2 = (await L.api("GET", "/logistics/me", { token: owner2.token }))?.data?.owner_operator;
    L.check(me2?.can_operate !== true && me2?.licence?.required === true, "/me: face + national ID only → can't operate, licence required", { can: me2?.can_operate, licence: me2?.licence, blocks: me2?.blocks });
    r = await L.api("POST", `/logistics/asset/${t5._id}/operate-self`, { token: owner2.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
    L.check(r?.success === false, "owner can't operate without a licence", r?.data?.code || r?.message);
    const licFile = await L.docFile("licence", { holder: owner2.name, face: DOCS.face(5), expires: DOCS.addMonths(8), kind: "vehicle" });
    const up = await L.apiForm("POST", "/logistics/owner-operator/enable", { token: owner2.token, body: { doc_licence_expires: F.ymd(DOCS.addMonths(8)) }, files: [["doc_licence", licFile]] });
    L.check(up?.success !== false, "owner adds a driving licence", up?.message);
    await L.verifyDocs("operator", owner2._id).catch(() => {});
    me2 = (await L.api("GET", "/logistics/me", { token: owner2.token }))?.data?.owner_operator;
    L.check(me2?.can_operate === true && !me2?.blocks?.length, "/me: face + verified licence → can_operate", { can: me2?.can_operate, licence: me2?.licence, blocks: me2?.blocks });
    r = await L.api("POST", `/logistics/asset/${t5._id}/operate-self`, { token: owner2.token, body: { state: "available_now", lat: F.LAT, lng: F.LNG } });
    L.check(r?.success !== false, "owner operates his truck", r);
    L.check(await inSearch("vehicle", t5._id), "owner-operated truck listed");
    await L.api("POST", `/logistics/asset/${t5._id}/release-self`, { token: owner2.token });

    L.sec("29f. Equipment with no verified document is hidden");
    const owner3 = await F.makeOwner(mkOwnerP(2, "c"));
    const eq = await F.makeUnit(owner3, C.unit("jcb", 295), { kind: "equipment", verify: false });
    const opE = await F.makeOperator(owner3, person("operator", 6, "e"), { assets: [eq._id], face: 2, licence: true });
    await F.goLive(opE, eq._id);
    L.check(!(await inSearch("equipment", eq._id)), "equipment with no verified document is hidden");
    await L.verifyDocs("asset", eq._id);
    await F.goLive(opE, eq._id);
    L.check(await inSearch("equipment", eq._id), "one verified document: equipment listed");
    await F.goOffline(opE);
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
  }
  F.pageChecks(actors);
  await L.done();
})();
