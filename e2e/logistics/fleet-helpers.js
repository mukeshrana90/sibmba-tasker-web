/* v2.7.61 stages (s20–s23): quick fixtures through the real API + the mocked message outbox. */
const L = require("./lib");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const DOCS = require("./docs");

const OUTBOX = process.env.MOCK_OUTBOX || path.join(__dirname, "outbox.jsonl");
const BACKEND = path.resolve(__dirname, "../../../sibmba-tasker-backend");
const OID = (x) => new L.mongoose.Types.ObjectId(String(x));
const DAY = 864e5;
const ymd = (d) => new Date(d).toISOString().slice(0, 10);

const nowIso = () => new Date().toISOString();
const outbox = (since = "") =>
  fs.existsSync(OUTBOX)
    ? fs.readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ts >= since)
    : [];
const waTo = (since, phoneTail) => outbox(since).filter((m) => m.channel === "whatsapp" && String(m.to).endsWith(String(phoneTail)));

/** Backend code in a child process with SendGrid / Twilio / Firebase mocked. `code` sees `m`, runs in async. Prints RESULT. */
function backend(code) {
  const out = execFileSync(process.execPath, ["-r", path.join(BACKEND, "scripts/e2e/mock-providers.js"), "-e",
    `require("dotenv").config();const m=require("mongoose");m.connect(process.env.DB_URL).then(async()=>{const r=await (async()=>{${code}})();console.log("RESULT"+JSON.stringify(r===undefined?null:r));await m.disconnect();process.exit(0)}).catch((e)=>{console.log("RESULT"+JSON.stringify({crash:e.message}));process.exit(0)})`],
    { cwd: BACKEND, env: { ...process.env, MOCK_OUTBOX: OUTBOX, LOGISTICS_REMINDER_SCHEDULERS_ENABLED: "" }, stdio: "pipe" }).toString();
  const line = out.split("\n").find((l) => l.startsWith("RESULT"));
  return line ? JSON.parse(line.slice(6)) : { crash: "no result", out: out.slice(-300) };
}

/** Owner straight in the DB (createdAt can be in the past for trial days), optionally approved with verified business documents. */
async function makeOwner(p, { createdDaysAgo = 0, approve = true, verifyBusiness = true, extra = {} } = {}) {
  const d = await L.db();
  const email = p.email;
  let u = await d.collection("users").findOne({ email });
  const createdAt = new Date(Date.now() - createdDaysAgo * DAY);
  if (!u) {
    const _id = new L.mongoose.Types.ObjectId();
    await d.collection("users").insertOne({
      _id, email, full_name: p.name, company_name: p.company || `${p.name} Transport`, role: 4, owner_id: null,
      country_code: p.cc, phone_number: p.phone, email_verified: 1, account_verified: 1, is_completeProfile: 1, is_deleted: 0,
      logistics_approval: { status: "pending", reason: "", submitted_at: new Date() }, createdAt, updatedAt: new Date(), ...extra,
    });
    u = { _id };
  } else {
    await d.collection("users").updateOne({ _id: u._id }, { $set: { createdAt, ...extra } });
  }
  const id = String(u._id);
  if (approve) {
    const r = await L.approveOwner(id);
    if (r?.success === false) throw new Error(`approve ${email}: ${r.message}`);
    if (verifyBusiness) await L.verifyDocs("business", id);
    // v2.7.64: "approved N days ago", so the free period runs from then
    if (createdDaysAgo > 0) {
      await d.collection("users").updateOne({ _id: u._id }, { $set: { "logistics_plan.trial_started_at": createdAt, "logistics_plan.trial_ends_at": new Date(createdAt.getTime() + 60 * DAY), "logistics_plan.trial_ended_at": null, isSubscribed: createdDaysAgo < 60 ? 1 : 0 } });
    }
  }
  return { _id: id, token: L.tokenFor(id), name: p.name, email, phone: p.phone, cc: p.cc, company: p.company, role: 4, person: p };
}

/** Truck / equipment through POST /logistics/asset. docs: map type → months to expiry; verify: admin verifies. */
async function makeUnit(owner, unit, { kind = "vehicle", docs = kind === "vehicle" ? { rego: 8, roadworthy: 8 } : { other: 8 }, verify = true, body = {} } = {}) {
  const info = { owner: owner.company, holder: owner.name, plate: unit.plate, make: unit.make, model: unit.model, year: unit.year, kind: "vehicle" };
  const types = Object.keys(docs);
  const files = [...(await L.photoFixtures(unit)).map((f) => ["photos", f])];
  const expires = [];
  for (const t of types) {
    const when = DOCS.addMonths(docs[t]);
    files.push(["documents", await L.docFile(t === "other" ? "competency" : t, { ...info, expires: when })]);
    expires.push(ymd(when));
  }
  const [lng, lat] = L.PLACES.coords.harare;
  const r = await L.apiForm("POST", "/logistics/asset", {
    token: owner.token,
    body: {
      kind, name: unit.name, registration: unit.plate, make: unit.make, model: unit.model, year: unit.year,
      capacity: { value: 16, unit: "tons" }, location: { type: "Point", coordinates: [lng, lat] }, location_label: L.PLACES.base,
      document_types: types, document_expires: expires, ...body,
    },
    files,
  });
  const asset = r?.data?.asset || r?.data;
  if (!asset?._id) throw new Error(`asset ${unit.name}: ${r?.message || JSON.stringify(r).slice(0, 300)}`);
  if (verify) await L.verifyDocs("asset", asset._id, { roadworthy: false });
  return { _id: String(asset._id), name: unit.name, plate: unit.plate, kind };
}

/** Active operator straight in the DB; verified licence; assigned to `assets` (ids). */
async function makeOperator(owner, p, { assets = [], verify = true, face = 2 } = {}) {
  const d = await L.db();
  let u = await d.collection("users").findOne({ email: p.email });
  if (!u) {
    const _id = new L.mongoose.Types.ObjectId();
    await d.collection("users").insertOne({
      _id, email: p.email, full_name: p.name, role: 4, owner_id: OID(owner._id), country_code: p.cc, phone_number: p.phone,
      email_verified: 1, account_verified: 1, is_completeProfile: 1, is_deleted: 0, createdAt: new Date(), updatedAt: new Date(),
    });
    u = { _id };
  }
  const id = String(u._id);
  await L.giveOperatorLicence(owner.token, id, { holder: p.name, face, verify });
  for (const a of assets) {
    const r = await L.api("POST", `/logistics/asset/${a}/assign`, { token: owner.token, body: { sub_user_id: id } });
    if (r?.success === false) throw new Error(`assign: ${r.message}`);
  }
  return { _id: id, token: L.tokenFor(id), name: p.name, email: p.email, phone: p.phone, cc: p.cc, role: 4, owner_id: owner._id };
}

/** Owner's licence + face photo through the real endpoint. */
async function enableSelfOperator(owner, { verify = true, face = 3 } = {}) {
  const expires = DOCS.addMonths(10);
  const r = await L.apiForm("POST", "/logistics/owner-operator/enable", {
    token: owner.token,
    body: { doc_licence_expires: ymd(expires) },
    files: [["doc_licence", await L.docFile("licence", { holder: owner.name, face: DOCS.face(face), expires, kind: "vehicle" })], ["face_photo", DOCS.face(face)]],
  });
  if (verify) await verifySelfOperator(owner);
  return r;
}
async function verifySelfOperator(owner) {
  const t = await L.adminToken();
  await L.verifyDocs("operator", owner._id);
  return L.api("POST", "/admin/logistics/documents/review", { token: t, body: { subject: "face_photo", id: owner._id, status: "verified" } });
}

const [LNG, LAT] = L.PLACES.coords.harare;
const goLive = (who, assetId, state = "available_now") =>
  L.api("PATCH", "/logistics/me/availability", { token: who.token, body: { state, asset_id: assetId, lat: LAT, lng: LNG } });
const goOffline = (who) => L.api("PATCH", "/logistics/me/availability", { token: who.token, body: { state: "offline" } });

/** Dated corridor transport job through the API. Returns job id. */
async function postJob(customer, { goods = "Steel coils", weight = 5, days = 3, body = {} } = {}) {
  const r = await L.api("POST", "/logistics/job", {
    token: customer.token,
    body: {
      job_type: "transport", job_class: "corridor", load_type: goods,
      pickup: { address: L.PLACES.base, coordinates: L.PLACES.coords.harare },
      dropoff: { address: L.PLACES.drops[0], coordinates: L.PLACES.coords.chitungwiza },
      load_weight: { value: weight, unit: "tons" }, special_notes: "Vehicle: 6 ton", when_needed: ymd(Date.now() + days * DAY),
      budget: { amount: 300, currency: "USD" }, ...body,
    },
  });
  const id = r?.data?.job?._id || r?.data?._id;
  if (!id) throw new Error(`post job: ${r?.message || JSON.stringify(r).slice(0, 300)}`);
  return String(id);
}
const quote = (who, jobId, assetId, amount = 250) =>
  L.api("POST", `/logistics/job/${jobId}/quote`, { token: who.token, body: { asset_id: assetId, amount, message: "Can do", coordinates: [LNG, LAT], quoted_from: { coordinates: [LNG, LAT] } } });
const acceptQuote = async (customer, jobId, quoteId) => L.api("POST", `/logistics/job/${jobId}/accept-quote`, { token: customer.token, body: { quotation_id: quoteId } });
const setStatus = (who, jobId, status, extra = {}) => L.api("POST", `/logistics/job/${jobId}/status`, { token: who.token, body: { status, ...extra } });

/** Stage restart: removes what an earlier run of this stage created for these @yopmail.com accounts. */
async function resetPeople(emails) {
  const d = await L.db();
  emails = emails.filter((e) => /@(e2e\.example|yopmail)\.com$/.test(e));
  const rows = await d.collection("users").find({ email: { $in: emails } }).project({ _id: 1 }).toArray();
  const ids = rows.map((r) => r._id);
  if (!ids.length) return;
  const all = [...ids, ...(await d.collection("users").find({ owner_id: { $in: ids } }).project({ _id: 1 }).toArray()).map((r) => r._id)];
  await d.collection("logistics_assets").deleteMany({ owner_id: { $in: ids } });
  await d.collection("transport_jobs").deleteMany({ $or: [{ requester_id: { $in: all } }, { "assigned.driver_id": { $in: all } }] });
  await d.collection("logistics_quotes").deleteMany({ $or: [{ driver_id: { $in: all } }, { owner_id: { $in: ids } }] });
  await d.collection("logistics_invites").deleteMany({ owner_id: { $in: ids } });
  await d.collection("users").deleteMany({ _id: { $in: all } });
}

/** Standard end-of-stage page error / 5xx checks. */
function pageChecks(actors) {
  for (const x of actors.filter(Boolean)) {
    L.check(x.errors.length === 0, `${x.name}: no page/console errors`, x.errors.slice(0, 4));
    L.check(x.apiFails.length === 0, `${x.name}: no 5xx`, x.apiFails);
  }
}

module.exports = { resetPeople, OID, DAY, ymd, nowIso, outbox, waTo, backend, makeOwner, makeUnit, makeOperator, enableSelfOperator, verifySelfOperator, goLive, goOffline, postJob, quote, acceptQuote, setStatus, pageChecks, LNG, LAT, BACKEND };

/** Admin panel actor (dev server on :3012, pointing at the test API; refuses anything else). */
const ADMIN_WEB = process.env.E2E_ADMIN_WEB || "http://localhost:3012";
async function adminActor(name = "admin") {
  const bundle = await fetch(`${ADMIN_WEB}/static/js/bundle.js`).then((r) => r.text()).catch(() => "");
  const port = new URL(L.API).port;
  if (!new RegExp(`(localhost|127\\.0\\.0\\.1):${port}/api/admin`).test(bundle)) throw new Error(`admin app at ${ADMIN_WEB} must point at the test API :${port} (see s12 header)`);
  const a = await L.actor(name);
  const token = await L.adminToken();
  await a.ctx.addInitScript((t) => { try { sessionStorage.setItem("token", t); localStorage.setItem("adminModule", "logistics"); } catch {} }, token);
  a.adminGoto = async (route, waitSel) => {
    await a.page.goto(`${ADMIN_WEB}${route}`, { waitUntil: "domcontentloaded" });
    await a.page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    if (waitSel) await a.page.waitForSelector(waitSel, { timeout: 15000 });
  };
  return a;
}
module.exports.adminActor = adminActor;
module.exports.ADMIN_WEB = ADMIN_WEB;
