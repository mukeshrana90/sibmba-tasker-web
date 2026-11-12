/* Demo data for the 11 Nov 2026 client-review videos (record-nov11.js). Demo DB only (SimbaTaskerFlowDemo).
 * Services providers in Harare, Bulawayo, Mutare and Gweru; logistics fleets in the same cities; a customer,
 * a provider and a corporate account; dated jobs for the operating-area video. Fictional people,
 * @yopmail.com, +263 phones. Profile pictures are copied into backend public/user as nov11demo-*.jpg. */
if (!/SimbaTaskerFlowDemo/.test(process.env.DB_URL || "")) { console.error("DB_URL must be the demo DB"); process.exit(2); }
const fs = require("fs");
const path = require("path");
const L = require("../lib");
const F = require("../fleet-helpers");
const DOCS = require("../docs");

const PW = "Simba@2026";
const REAL = DOCS.REAL;
const ASSETS = path.join(__dirname, "assets");
const USER_DIR = path.join(F.BACKEND, "public/user");
const DAY = 864e5;
const OID = F.OID;

// [lng, lat]
const P = {
  msasa: { label: "Msasa, Harare", c: [31.1167, -17.8386] },
  southerton: { label: "Southerton, Harare", c: [31.0036, -17.8686] },
  workington: { label: "Workington, Harare", c: [31.0155, -17.8578] },
  avondale: { label: "Avondale, Harare", c: [31.0371, -17.7956] },
  borrowdale: { label: "Borrowdale, Harare", c: [31.0943, -17.7516] },
  mabelreign: { label: "Mabelreign, Harare", c: [30.9947, -17.7903] },
  graniteside: { label: "Graniteside, Harare", c: [31.0389, -17.8461] },
  chitungwiza: { label: "Chitungwiza", c: [31.0756, -18.0127] },
  ruwa: { label: "Ruwa", c: [31.2447, -17.8897] },
  belmont: { label: "Belmont, Bulawayo", c: [28.5738, -20.1727] },
  byoSuburbs: { label: "Suburbs, Bulawayo", c: [28.5956, -20.1449] },
  hillside: { label: "Hillside, Bulawayo", c: [28.6093, -20.1818] },
  gwanda: { label: "Gwanda", c: [29.0187, -20.9389] },
  sakubva: { label: "Sakubva, Mutare", c: [32.6487, -18.9904] },
  murambi: { label: "Murambi, Mutare", c: [32.6596, -18.9551] },
  mkoba: { label: "Mkoba, Gweru", c: [29.7606, -19.4706] },
  gweruCbd: { label: "Gweru CBD", c: [29.8149, -19.4553] },
};

const people = {
  customer: { name: "Rudo Makoni", email: "rudo.makoni@yopmail.com", phone: "719384052" },
  provider: { name: "Tinashe Mlambo", email: "tinashe.mlambo@yopmail.com", phone: "772908415" },
  corporate: { name: "Sarah Mahachi", company: "Avondale Retail Hub", email: "sarah.mahachi@yopmail.com", phone: "778215064" },
  ownerA: { name: "Tatenda Mutasa", company: "Mutasa Haulage & Plant Hire", email: "tatenda.mutasa@yopmail.com", phone: "772415836", place: P.msasa },
  ownerB: { name: "Tapiwa Dube", company: "Dube Road Freight", email: "tapiwa.dube@yopmail.com", phone: "776502318", place: P.belmont },
  ownerC: { name: "Tonderai Machingura", company: "Machingura Highway Carriers", email: "tonderai.machingura@yopmail.com", phone: "773190664", place: P.sakubva },
  ownerD: { name: "Tafadzwa Gumbo", company: "Gumbo Tipper Hire", email: "tafadzwa.gumbo@yopmail.com", phone: "785330972", place: P.mkoba },
  farai: { name: "Farai Chikore", email: "farai.chikore@yopmail.com", phone: "773628194", face: path.join(ASSETS, "op1.jpg") },
  blessing: { name: "Blessing Ncube", email: "blessing.ncube@yopmail.com", phone: "784250917", face: path.join(ASSETS, "op2.jpg") },
  nomsa: { name: "Nomsa Sibanda", email: "nomsa.sibanda@yopmail.com", phone: "771846203", face: path.join(REAL, "zw-face-7.jpg") },
  rufaro: { name: "Rufaro Mazvita", email: "rufaro.mazvita@yopmail.com", phone: "774613580", face: path.join(REAL, "face-6.jpg") },
  kuda: { name: "Kudakwashe Hove", email: "kudakwashe.hove@yopmail.com", phone: "782047751", face: path.join(REAL, "face-1.jpg") },
};

const units = {
  hino: { name: "Hino 500 Tipper", plate: "AEZ4821", make: "Hino", model: "500 Ranger", year: "2019", tons: 15, place: P.msasa, photos: [path.join(ASSETS, "hino-1.jpg"), path.join(ASSETS, "hino-2.jpg")] },
  seddon: { name: "Seddon Atkinson Strato", plate: "AFC2290", make: "Seddon Atkinson", model: "Strato 325", year: "2016", tons: 30, place: P.southerton, range: 500, photos: [path.join(ASSETS, "seddon-1.jpg"), path.join(REAL, "zw/seddon-2.jpg")] },
  byo: { name: "International 7600 Flatbed", plate: "ADH7315", make: "International", model: "7600", year: "2015", tons: 20, place: P.belmont, photos: [path.join(REAL, "zw/intl-1.jpg"), path.join(REAL, "zw/intl-2.jpg")] },
  mutare: { name: "Ashok Leyland 2518 Tipper", plate: "AEK5094", make: "Ashok Leyland", model: "2518", year: "2017", tons: 18, place: P.sakubva, photos: [path.join(REAL, "al-tipper-1.jpg"), path.join(REAL, "al-tipper-2.jpg")] },
  gweru: { name: "BharatBenz 3128 Tipper", plate: "AFG3381", make: "BharatBenz", model: "3128", year: "2018", tons: 25, place: P.mkoba, photos: [path.join(REAL, "bharatbenz-1.jpg"), path.join(REAL, "bharatbenz-2.jpg")] },
  // Added on camera in video 3
  freightliner: { name: "Freightliner FLB Tipper", plate: "AGB6142", make: "Freightliner", model: "FLB", year: "2014", tons: 20, place: P.workington, photos: [path.join(REAL, "zw/tipper-1.jpg"), path.join(REAL, "zw/tipper-2.jpg")] },
};

// Services side: role 2 providers with one service each (name, category, city place, face, price, ratings)
const providers = [
  { key: "tinashe", ...people.provider, cat: "Handyman", service: "Electrical wiring and DB board repairs", desc: "Licensed electrician for homes and shops: rewiring, DB boards, geysers and fault finding.", place: P.avondale, street: "14 King George Road", face: "face-1.jpg", price: "25", ratings: [5, 4, 5] },
  { key: "nyasha", name: "Nyasha Dzapasi", email: "nyasha.dzapasi@yopmail.com", phone: "776348120", cat: "Building & Trade Services", service: "Plumbing and borehole pump repairs", desc: "Burst pipes, geysers, borehole pumps and new bathroom fittings across Harare.", place: P.borrowdale, street: "7 Whitwell Road", face: "face-4.jpg", price: "30", ratings: [4, 4, 5, 4] },
  { key: "kudzai", name: "Kudzai Hove", email: "kudzai.hove@yopmail.com", phone: "783920471", cat: "Cleaning & Domestic Services", service: "Home and office deep cleaning", desc: "Deep cleaning for homes and offices, carpets and move-out cleans. New on Simba.", place: P.mabelreign, street: "22 Sherwood Drive", face: "face-5.jpg", price: "20", ratings: [] },
  { key: "sipho", name: "Sipho Ndlovu", email: "sipho.ndlovu@yopmail.com", phone: "775120983", cat: "Handyman", service: "Electrical installations and solar backup", desc: "Solar backup systems, inverters and house wiring in Bulawayo.", place: P.byoSuburbs, street: "31 Fife Street", face: "face-2.jpg", price: "28", ratings: [5, 5, 5, 5, 5] },
  { key: "thandiwe", name: "Thandiwe Moyo", email: "thandiwe.moyo@yopmail.com", phone: "778604215", cat: "Cleaning & Domestic Services", service: "Office cleaning and laundry", desc: "Weekly office cleaning, laundry and post-construction cleans in Bulawayo.", place: P.hillside, street: "5 Cecil Avenue", face: "face-6.jpg", price: "18", ratings: [5, 5, 4, 5] },
  { key: "tawanda", name: "Tawanda Chikomba", email: "tawanda.chikomba@yopmail.com", phone: "771439206", cat: "Building & Trade Services", service: "Carpentry, cupboards and roofing", desc: "Built-in cupboards, doors and roof repairs in Mutare.", place: P.murambi, street: "9 Park Road", face: "face-3.jpg", price: "35", ratings: [5, 5, 4] },
  { key: "precious", name: "Precious Shumba", email: "precious.shumba@yopmail.com", phone: "784771530", cat: "Landscaping & Gardening Services", service: "Garden care and lawn landscaping", desc: "Lawn care, hedges and garden makeovers in Gweru.", place: P.gweruCbd, street: "18 Robert Mugabe Way", face: null, price: "15", ratings: [5, 5, 5] },
  { key: "ruvimbo", name: "Ruvimbo Chari", email: "ruvimbo.chari@yopmail.com", phone: "777205814", cat: "Cleaning & Domestic Services", service: "Carpet and upholstery cleaning", desc: "Carpets, sofas and mattresses steam-cleaned at your home in Harare.", place: P.avondale, street: "3 Lawson Avenue", face: "zw-face-8.jpg", price: "25", ratings: [5, 4] },
];
const reviewers = [
  { name: "Chipo Marimo", email: "chipo.marimo@yopmail.com", phone: "772301948" },
  { name: "Tichaona Banda", email: "tichaona.banda@yopmail.com", phone: "773584026" },
  { name: "Fadzai Mupfumi", email: "fadzai.mupfumi@yopmail.com", phone: "775901347" },
  { name: "Brian Chari", email: "brian.chari@yopmail.com", phone: "776120589" },
  { name: "Memory Gwatidzo", email: "memory.gwatidzo@yopmail.com", phone: "778430261" },
];
const REVIEW_TEXT = ["Arrived on time and did a neat job.", "Very professional, fair price.", "Quick and tidy work, will book again.", "Explained everything clearly.", "Excellent service, highly recommended."];

const copied = [];
function copyToUser(src, name) {
  const file = `nov11demo-${name}${path.extname(src) || ".jpg"}`;
  fs.copyFileSync(src, path.join(USER_DIR, file));
  copied.push(file);
  return `/user/${file}`; // stored the way profile uploads store it
}

async function makeUser(p, role, extra = {}) {
  await L.db();
  const { User } = require(path.join(F.BACKEND, "src/models"));
  const ex = await User.findOne({ email: p.email });
  if (ex) return ex;
  return User.create({
    email: p.email, full_name: p.name, role, country_code: "+263", phone_number: p.phone,
    email_verified: 1, account_verified: 1, is_completeProfile: 1, status: 1, is_deleted: 0, password: PW, ...extra,
  });
}

/** Truck through the real API (as the owner), documents verified as Simba admin. */
async function makeUnit(owner, u, { docs = { rego: 8, insurance: 10 }, verify = true } = {}) {
  const files = u.photos.map((f) => ["photos", f]);
  const types = []; const exp = [];
  for (const [t, months] of Object.entries(docs)) {
    const when = DOCS.addMonths(months);
    files.push(["documents", await L.docFile(t, { owner: owner.company, holder: owner.name, plate: u.plate, make: u.make, model: u.model, year: u.year, kind: "vehicle", expires: when })]);
    types.push(t); exp.push(F.ymd(when));
  }
  const [lng, lat] = u.place.c;
  const r = await L.apiForm("POST", "/logistics/asset", {
    token: owner.token,
    body: {
      kind: "vehicle", name: u.name, registration: u.plate, make: u.make, model: u.model, year: u.year,
      capacity: { value: u.tons, unit: "tons" }, capacity_value: u.tons, capacity_unit: "tons",
      location: { type: "Point", coordinates: [lng, lat] }, lat, lng, location_label: u.place.label,
      ...(u.range ? { operating_range_km: u.range } : {}), document_types: types, document_expires: exp,
    },
    files,
  });
  const asset = r?.data?.asset || r?.data;
  if (!asset?._id) throw new Error(`asset ${u.name}: ${r?.message || JSON.stringify(r).slice(0, 300)}`);
  if (verify) await L.verifyDocs("asset", asset._id, { roadworthy: false });
  return { _id: String(asset._id), name: u.name, plate: u.plate };
}

/** Active operator (already accepted), face photo set by the owner and verified, assigned to units. */
async function makeOperator(owner, p, assets) {
  const d = await L.db();
  let u = await d.collection("users").findOne({ email: p.email });
  if (!u) {
    const { User } = require(path.join(F.BACKEND, "src/models"));
    u = await User.create({ email: p.email, full_name: p.name, role: 4, owner_id: OID(owner._id), country_code: "+263", phone_number: p.phone, email_verified: 1, account_verified: 1, is_completeProfile: 1, is_deleted: 0, password: PW });
  }
  const id = String(u._id);
  const r = await L.apiForm("PATCH", `/logistics/sub-user/${id}`, { token: owner.token, files: [["profile_photo", p.face]] });
  if (r?.success === false) throw new Error(`face ${p.name}: ${r.message}`);
  await L.api("POST", "/admin/logistics/documents/review", { token: await L.adminToken(), body: { subject: "face_photo", id, status: "verified" } });
  for (const a of assets) {
    const x = await L.api("POST", `/logistics/asset/${a}/assign`, { token: owner.token, body: { sub_user_id: id } });
    if (x?.success === false) throw new Error(`assign: ${x.message}`);
  }
  return { _id: id, token: L.tokenFor(id), name: p.name, email: p.email, role: 4, owner_id: owner._id };
}
const goLive = (op, assetId, place) => L.api("PATCH", "/logistics/me/availability", { token: op.token, body: { state: "available_now", asset_id: assetId, lat: place.c[1], lng: place.c[0] } });

async function postJob(customer, { from, to, goods, tons, vehicle, days = 2, price = 300, extra = {} }) {
  const r = await L.api("POST", "/logistics/job", {
    token: customer.token,
    body: {
      job_type: "transport", job_class: "corridor", load_type: goods,
      pickup: { address: from.label, coordinates: from.c }, dropoff: { address: to.label, coordinates: to.c },
      load_weight: { value: tons, unit: "tons" }, special_notes: `Vehicle: ${vehicle}`, when_needed: F.ymd(Date.now() + days * DAY),
      budget: { amount: price, currency: "USD" }, ...extra,
    },
  });
  const id = r?.data?.job?._id || r?.data?._id;
  if (!id) throw new Error(`post job ${goods}: ${r?.message || JSON.stringify(r).slice(0, 300)}`);
  return String(id);
}

async function seedServices(st) {
  const d = await L.db();
  const cats = await d.collection("serviceCategories").find({}).project({ service_category_name: 1 }).toArray();
  const catId = (name) => { const c = cats.find((x) => x.service_category_name === name); if (!c) throw new Error(`no service category ${name}`); return c._id; };
  const revs = [];
  for (const r of reviewers) revs.push(await makeUser(r, 1));
  st.providers = {};
  // Rated providers outside Harare are created first, so any order that isn't "Harare first" would show them first
  const order = [...providers].sort((a, b) => (a.place.label.includes("Harare") ? 1 : 0) - (b.place.label.includes("Harare") ? 1 : 0));
  for (const p of order) {
    const city = p.place.label.split(", ").pop();
    const img = p.face ? copyToUser(path.join(REAL, p.face), p.key) : undefined;
    const u = await makeUser(p, 2, {
      ...(img ? { profile_image: img } : {}), location: { type: "Point", coordinates: p.place.c }, street_address: p.street,
      suburbs: p.place.label, city, address: `${p.street}, ${p.place.label}`, about: p.desc,
    });
    const sid = new L.mongoose.Types.ObjectId();
    await d.collection("serviceSubCategories").insertOne({
      _id: sid, serviceCategoryId: catId(p.cat), serviceProviderId: u._id, images: [], serviceSubCategoryName: p.service, desc: p.desc,
      price: p.price, is_deleted: 0, location: { type: "Point", coordinates: p.place.c },
      availability: [{ _id: new L.mongoose.Types.ObjectId(), day: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], timeArr: ["08AM - 09AM", "09AM - 10AM", "10AM - 11AM", "02PM - 03PM", "03PM - 04PM"] }],
      createdAt: new Date(), updatedAt: new Date(), __v: 0,
    });
    for (let i = 0; i < p.ratings.length; i++) {
      await d.collection("feedbacks").insertOne({ serviceProviderId: u._id, user_id: revs[i % revs.length]._id, serviceSubCatId: sid, category_id: catId(p.cat), rating: p.ratings[i], type: 1, message: REVIEW_TEXT[i % REVIEW_TEXT.length], feedbackDirection: 1, status: 1, createdAt: new Date(Date.now() - (i + 2) * 3 * DAY), updatedAt: new Date() });
    }
    st.providers[p.key] = { _id: String(u._id), serviceId: String(sid), name: p.name, city };
  }
}

async function seed() {
  const st = { people, units, places: P };
  await L.db();
  // Admin login for the admin panel
  {
    const { Admin } = require(path.join(F.BACKEND, "src/models"));
    const ad = await Admin.findOne({});
    ad.email = "admin.simba@yopmail.com"; ad.password = PW; ad.full_name = "Simba Admin"; await ad.save();
  }
  await seedServices(st);
  const cust = await makeUser(people.customer, 1, { location: { type: "Point", coordinates: P.avondale.c }, suburbs: "Avondale, Harare", city: "Harare" });
  st.customer = { _id: String(cust._id), token: L.tokenFor(cust._id), role: 1, email: people.customer.email };
  st.provider = { _id: st.providers.tinashe._id, role: 2, token: L.tokenFor(st.providers.tinashe._id) };
  const corp = await makeUser(people.corporate, 3, { company_name: people.corporate.company, location: { type: "Point", coordinates: P.avondale.c }, suburbs: "Avondale, Harare", city: "Harare" });
  st.corporate = { _id: String(corp._id), role: 3, token: L.tokenFor(corp._id) };

  // Fleets: other cities first (creation order), Harare last
  const mkOwner = async (key, logo) => {
    const p = people[key];
    const o = await F.makeOwner({ ...p, cc: "+263" });
    const d = await L.db();
    await d.collection("users").updateOne({ _id: OID(o._id) }, { $set: { location: { type: "Point", coordinates: p.place.c }, street_address: p.place.label, logistics_base: { address: p.place.label, coordinates: p.place.c }, ...(logo ? { profile_image: copyToUser(logo, `logo-${key}`) } : {}) } });
    return o;
  };
  const ownerB = await mkOwner("ownerB");
  const ownerC = await mkOwner("ownerC");
  const ownerD = await mkOwner("ownerD");
  const byo = await makeUnit(ownerB, units.byo);
  const mut = await makeUnit(ownerC, units.mutare);
  const gwe = await makeUnit(ownerD, units.gweru);
  const nomsa = await makeOperator(ownerB, people.nomsa, [byo._id]);
  const rufaro = await makeOperator(ownerC, people.rufaro, [mut._id]);
  const kuda = await makeOperator(ownerD, people.kuda, [gwe._id]);
  await goLive(nomsa, byo._id, units.byo.place);
  await goLive(rufaro, mut._id, units.mutare.place);
  await goLive(kuda, gwe._id, units.gweru.place);

  const ownerA = await mkOwner("ownerA", process.env.NOV11_LOGO);
  const hino = await makeUnit(ownerA, units.hino);
  const seddon = await makeUnit(ownerA, units.seddon);
  const farai = await makeOperator(ownerA, people.farai, [hino._id]);
  const blessing = await makeOperator(ownerA, people.blessing, [seddon._id]);
  await goLive(farai, hino._id, units.hino.place);
  await goLive(blessing, seddon._id, units.seddon.place);
  Object.assign(st, { ownerA, ownerB, ownerC, ownerD, hino, seddon, byo, mut, gwe, farai, blessing, nomsa, rufaro, kuda });

  // Dated jobs for video 2 (posted by Rudo)
  st.jobs = {
    harare: await postJob(st.customer, { from: P.msasa, to: P.chitungwiza, goods: "Cement, 200 bags", tons: 10, vehicle: "10 ton", price: 280 }),
    byo: await postJob(st.customer, { from: P.belmont, to: P.gwanda, goods: "Maize, 160 bags", tons: 8, vehicle: "10 ton", price: 450 }),
    ret: await postJob(st.customer, { from: P.byoSuburbs, to: P.graniteside, goods: "Roofing sheets", tons: 6, vehicle: "10 ton", price: 600, extra: { open_to_return_loads: true } }),
    heavy: await postJob(st.customer, { from: P.workington, to: P.ruwa, goods: "Steel beams", tons: 25, vehicle: "50 ton", price: 520 }),
  };
  return { st, copied };
}

module.exports = { seed, people, units, providers, places: P, PW, copyToUser, copied, makeUnit, makeOperator, goLive, postJob, makeUser };

if (require.main === module) {
  seed().then(async ({ st }) => {
    fs.writeFileSync(process.env.STATE_OUT || path.join(__dirname, "nov11-state.json"), JSON.stringify(st, null, 2));
    console.log("seeded; copied", copied.length, "profile pictures");
    await DOCS.close(); await L.mongoose.disconnect();
  }).catch(async (e) => { console.error("seed failed:", e.message); await DOCS.close().catch(() => {}); process.exit(1); });
}
