/*
 * Realistic test cast for the logistics E2E: Zimbabwean names, Harare places,
 * +263 mobiles, Zimbabwe plates (AEZ4821), @yopmail.com emails. Everything is picked from fixed pools with
 * a generator seeded by the run id (RUN), so one run always gets the same
 * people and different runs get different ones.
 *
 *   const C = require("./cast")(RUN);
 *   const p = C.person("operator", 0);  // { name, first, last, email, phone, cc }
 *   C.unit("truck", 0)                  // { name, plate, make, model, year, ... }
 *
 * Emails are first.last<NNN>@yopmail.com. Never end one with
 * "_testingaccount@yopmail.com" (that suffix turns on the backend test-account plan).
 */

const DOMAIN = "yopmail.com";
const CC = "+263";

// Seeded PRNG (mulberry32) from the run id
function seedOf(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── People ─────────────────────────────────────────────────────────────
// Owners run the fleets; company names are theirs (fictional Harare businesses).
const OWNERS = [
  ["Tatenda", "Mutasa", "Mutasa Haulage & Plant Hire"],
  ["Tendai", "Moyo", "Moyo Transport (Pvt) Ltd"],
  ["Rumbidzai", "Chikwanha", "Chikwanha Earthmovers"],
  ["Farai", "Mapfumo", "Mapfumo Freight Services"],
  ["Kudakwashe", "Ncube", "Ncube Logistics"],
  ["Tafadzwa", "Gumbo", "Gumbo Tipper Hire"],
  ["Nyasha", "Marufu", "Marufu Agri Equipment"],
  ["Simbarashe", "Chirwa", "Msasa Cargo Movers"],
  ["Tinashe", "Mlambo", "Mlambo Crane & Plant"],
  ["Chiedza", "Mhlanga", "Mhlanga Haulage"],
  ["Munyaradzi", "Sibanda", "Sibanda Carriers"],
  ["Tapiwa", "Dube", "Dube Road Freight"],
  ["Ruvimbo", "Chimuka", "Chimuka Plant Hire"],
  ["Takudzwa", "Nyathi", "Nyathi Tractors & Hire"],
  ["Panashe", "Zvobgo", "Southerton Movers"],
  ["Tonderai", "Machingura", "Machingura Highway Carriers"],
  ["Ruramai", "Musiyiwa", "Musiyiwa Bulk Haulage"],
  ["Mufaro", "Chidziva", "Chidziva Excavation Services"],
  ["Tsitsi", "Mabhena", "Mabhena Freight (Pvt) Ltd"],
  ["Batsirai", "Gandanzara", "Gandanzara Lowbed Hire"],
  ["Tinotenda", "Mahlangu", "Ruwa Transport Co."],
  ["Kundai", "Mabika", "Mabika Agri Machines"],
  ["Rutendo", "Chiripanhura", "Chiripanhura Movers"],
  ["Washington", "Mutambara", "Mutambara Road Carriers"],
  ["Nyarai", "Matemba", "Matemba Plant & Equipment"],
  ["Kudzanai", "Chakawa", "Chakawa Tipper Services"],
  ["Shepherd", "Mukandi", "Graniteside Haulage"],
  ["Ratidzo", "Mazarura", "Mazarura Cranes"],
  ["Collins", "Zimuto", "Zimuto Freight Lines"],
  ["Melody", "Garwe", "Garwe Equipment Hire"],
];
// Operators: unisex Shona first names, so any AI face fits the name
const OPERATORS = [
  ["Farai", "Chikore"], ["Tatenda", "Nyamande"], ["Tinashe", "Mutizwa"], ["Tafadzwa", "Zhou"],
  ["Tendai", "Makoni"], ["Nyasha", "Dzapasi"], ["Kudzai", "Hove"], ["Rufaro", "Mazvita"],
  ["Takudzwa", "Sithole"], ["Ropafadzo", "Masuku"], ["Tanaka", "Mupfumi"], ["Anesu", "Banda"],
  ["Tinotenda", "Muchena"], ["Munashe", "Chari"], ["Panashe", "Tshuma"], ["Kundai", "Mavhunga"],
  ["Mufaro", "Moyo"], ["Batsirai", "Chinyani"], ["Simbarashe", "Kanengoni"], ["Itai", "Mudenda"],
  ["Rutendo", "Chigwada"], ["Shingai", "Mapuranga"], ["Chengetai", "Mandaza"], ["Tapiwa", "Kufa"],
  ["Ruvarashe", "Mubaiwa"], ["Nyarai", "Chakonza"], ["Vimbai", "Marimo"], ["Kudakwashe", "Chiwara"],
  ["Tawananyasha", "Nyoni"], ["Tadiwa", "Gwenzi"],
];
const CUSTOMERS = [
  ["Rudo", "Makoni"], ["Chipo", "Mutendi"], ["Tatenda", "Chigumba"], ["Vimbai", "Mashingaidze"],
  ["Kudzai", "Nhamo"], ["Ropafadzo", "Mpofu"], ["Tinotenda", "Musoni"], ["Nokuthula", "Dlamini"],
  ["Tanaka", "Shumba"], ["Fadzai", "Chiweshe"], ["Ngonidzashe", "Gwaze"], ["Memory", "Chivasa"],
  ["Anesu", "Mukwena"], ["Precious", "Madziva"], ["Tapiwa", "Chinembiri"], ["Shamiso", "Rusere"],
];
// Tasker service providers / corporates that also use Logistics
const PROVIDERS = [
  ["Justice", "Mangwende", "Mangwende Electrical"], ["Darlington", "Murove", "Murove Plumbing Works"],
  ["Ruramai", "Chakanyuka", "Chakanyuka Interiors"], ["Fungai", "Mudzingwa", "Mudzingwa Painters"],
  ["Tichaona", "Gora", "Gora Air Conditioning"], ["Owen", "Matanda", "Matanda Carpentry"],
  ["Peter", "Chibanda", "Chibanda Pest Control"], ["Kelvin", "Zinyemba", "Zinyemba Home Repairs"],
];
const CORPORATES = [
  ["Ronald", "Mukonoweshuro", "Borrowdale Construction (Pvt) Ltd"], ["Agnes", "Chitsa", "Harare Builders & Developers"],
  ["Stanley", "Mavunga", "Mashonaland Agro Foods"], ["Nelson", "Chingwaru", "Graniteside Steel Traders"],
  ["Beauty", "Matongo", "Workington Cement Agencies"], ["Edmore", "Gwatidzo", "Ruwa Packaging Industries"],
  ["Sarah", "Mahachi", "Avondale Retail Hub"], ["Patrick", "Mushonga", "Norton Agri Exports"],
];
const POOLS = { owner: OWNERS, operator: OPERATORS, customer: CUSTOMERS, provider: PROVIDERS, corporate: CORPORATES };

// ── Places (Harare + a far town outside the 50 km local radius) ──
const PLACES = {
  // browser geolocation for every actor = Africa Unity Square, Harare CBD
  home: { label: "Harare CBD", latitude: -17.8292, longitude: 31.0522 },
  base: "Msasa, Harare",
  drops: ["Chitungwiza, Zimbabwe", "Ruwa, Zimbabwe", "Norton, Zimbabwe", "Southerton, Harare", "Graniteside, Harare"],
  near: "Avondale, Harare",          // short local trip
  ride: "Sam Levy's Village, Borrowdale", // cab drop-off
  far: { pickup: "Marondera", drop: "Rusape", minKm: 60 }, // > 50 km from Harare
  corridor: { from: "Harare", to: "Mutare" },
  coords: {
    harare: [31.0522, -17.8292], // [lng, lat]
    chitungwiza: [31.0756, -18.0127],
    ruwa: [31.2447, -17.8897],
    norton: [30.7, -17.8833],
  },
};

// ── Equipment (makes / models common on Zimbabwe roads; real photos in fixtures/real/zw) ──
const UNITS = {
  truck: [
    { make: "Hino", model: "500 Ranger", year: "2019", capacity: "15", photos: ["zw/hino-1.jpg", "zw/hino-2.jpg"] },
    { make: "Seddon Atkinson", model: "Strato 325", year: "2016", capacity: "30", photos: ["zw/seddon-1.jpg", "zw/seddon-2.jpg"] },
    { make: "Freightliner", model: "FLB Tipper", year: "2014", capacity: "20", photos: ["zw/tipper-1.jpg", "zw/tipper-2.jpg"] },
  ],
  tractor: [{ make: "Massey Ferguson", model: "275", year: "2018", photos: ["zw/mf-tractor-1.jpg", "zw/mf-tractor-2.jpg"] }],
  jcb: [{ make: "JCB", model: "3CX Backhoe", year: "2020", photos: ["zw/jcb3cx-1.jpg", "zw/jcb3cx-2.jpg"] }],
  cab: [{ make: "Honda", model: "Fit", year: "2015", photos: ["zw/fit-taxi-1.jpg", "zw/fit-taxi-2.jpg"] }],
};

/*
 * Who plays which part — fixed slots so stages never share a person.
 * Owners / operators: C.person(role, SLOTS[stage].owner[k]) ; customers, providers and
 * corporates come from L.makeCustomer(tag, role) / L.castPersonFor(tag, role) (auto-numbered).
 */
const SLOTS = {
  owner: { s1: [0], s9: [1, 2, 3], s10: [4], s12: [5, 6], s13: [7], s15: [8], s16: [9], s17: [10], s18: [11], s19: [12], misc: [13, 14, 15], s20: [16, 17, 18], s21: [19, 20, 21], s22: [22, 23, 24, 25, 26], s23: [27] },
  operator: { s2: [0], s3: [1], s5: [2], s6: [3], s8: [4], s9: [5, 6, 7], s10: [8], s13: [9], s14: [10], s15: [11], s17: [12], s18: [13], s19: [14], s12: [15], s20: [20, 21, 22], s21: [23, 24], s22: [25, 26, 27], misc: [16, 17, 18, 19] },
};

module.exports = function cast(RUN) {
  const rand = rng(seedOf(RUN || "run"));
  const order = Object.fromEntries(Object.entries(POOLS).map(([k, v]) => [k, shuffled(v, rand)]));
  // 3 digits keep e-mails readable (tatenda.mutasa412@yopmail.com) and unique per run
  const tag = Math.floor(rand() * 900 + 100);
  const people = {};
  const usedPhones = new Set();
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";

  // Phones / plates depend only on (RUN, key) — the same person has the same number in every stage
  const keyed = (key) => rng(seedOf(`${RUN}|${key}`));
  const phone = (key = `extra:${usedPhones.size}`) => {
    const r = keyed(`phone:${key}`);
    for (;;) {
      // Zimbabwe mobiles: 77/78 Econet, 71 NetOne, 73 Telecel + 7 digits. 71999… / 71888… are the mock's forced-fail ranges.
      const p = `${["77", "78", "71", "73"][Math.floor(r() * 4)]}${String(Math.floor(r() * 1e7)).padStart(7, "0")}`;
      if (!usedPhones.has(p) && !/^71(999|888)/.test(p)) return usedPhones.add(p), p;
    }
  };
  const slug = (s) => s.toLowerCase().replace(/[^a-z]+/g, "");

  /** Person #i of a role (stable within the run). */
  function person(role, i = 0) {
    const key = `${role}:${i}`;
    if (people[key]) return people[key];
    const pool = order[role] || order.customer;
    const [first, last, company] = pool[i % pool.length];
    const round = Math.floor(i / pool.length); // wraps → keep e-mails unique
    const name = `${first} ${last}`;
    const firstWord = first.split(" ")[0];
    const email = `${slug(firstWord)}.${slug(last)}${round ? round + 1 : ""}${tag}@${DOMAIN}`;
    people[key] = { role, name, first: firstWord, last, company: company || null, email, cc: CC, phone: phone(key) };
    return people[key];
  }

  const plates = new Set();
  /** Zimbabwe registration like AEZ4821 (3 letters + 4 digits; letters + digits only, as the API requires). */
  function plate(key = `extra:${plates.size}`) {
    const r = keyed(`plate:${key}`);
    for (;;) {
      const p = `A${"BCDEFG"[Math.floor(r() * 6)]}${letters[Math.floor(r() * letters.length)]}${String(Math.floor(r() * 9000 + 1000))}`;
      if (!plates.has(p)) return plates.add(p), p;
    }
  }

  const units = {};
  /** Unit #i of a kind: truck | tractor | jcb | cab. Name = "<make> <model> · <last 4 of plate>". */
  function unit(kind, i = 0) {
    const key = `${kind}:${i}`;
    if (units[key]) return units[key];
    const list = UNITS[kind] || UNITS.truck;
    const base = list[i % list.length];
    const reg = plate(key);
    units[key] = { kind, ...base, plate: reg, name: `${base.make} ${base.model} ${reg.slice(-4)}` };
    return units[key];
  }

  /** Driver's licence number like 284613HR (6 digits + issuing office). */
  const licence = (key = "0") => {
    const r = keyed(`licence:${key}`);
    return `${String(Math.floor(r() * 900000 + 100000))}${["HR", "HR", "CZ", "MR"][Math.floor(r() * 4)]}`;
  };

  /** Slot person: C.slot("owner", "s9", 1) → the 2nd owner reserved for s9. */
  const slot = (role, stage, k = 0) => person(role, (SLOTS[role]?.[stage] || SLOTS[role]?.misc || [0])[k] ?? 0);

  return { RUN, DOMAIN, CC, PLACES, SLOTS, person, slot, unit, plate, phone, licence, rand };
};
module.exports.PLACES = PLACES;
module.exports.SLOTS = SLOTS;
module.exports.CC = CC;
module.exports.DOMAIN = DOMAIN;
