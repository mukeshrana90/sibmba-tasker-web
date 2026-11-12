/* Stage 31 — v2.7.66 job visibility: operating area around each unit's base (default from .env),
   what the unit can carry, return loads, direct booking exempt, quote guard, direct links, env change.
   Own accounts; needs only state.json RUN. Restarts the :4099 test API by pid (and restores it). */
const L = require("./lib");
const F = require("./fleet-helpers");
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const { OID, LNG, LAT } = F;
const offset = (km) => ({ lng: LNG + km / 105.97, lat: LAT }); // ~1° lng at Harare's latitude, east of the pickup

/** Kill the API on :4099 and start it again with E2E_DEFAULT_RANGE_KM=km. */
async function restartApi(km) {
  const pid = execSync(`ss -ltnp | grep ':4099' | grep -oP 'pid=\\K[0-9]+' | head -1 || true`).toString().trim();
  if (pid) process.kill(Number(pid), "SIGTERM");
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (!execSync(`ss -ltn | grep ':4099' || true`).toString().trim()) break;
  }
  const log = fs.openSync(path.join(require("os").tmpdir(), "s31-test-api.log"), "a");
  spawn("bash", [path.join(__dirname, "start-test-api.sh")], {
    detached: true,
    stdio: ["ignore", log, log],
    env: { ...process.env, E2E_DEFAULT_RANGE_KM: String(km) },
  }).unref();
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const r = await fetch(`${L.API}/api/logistics/session`);
      if (r.status < 500) return true;
    } catch {
      /* not up yet */
    }
  }
  throw new Error("test API did not come back");
}

(async () => {
  const st = L.loadState();
  const RUN = String(st.RUN || "run").toLowerCase();
  const C = L.cast(RUN);
  const d = await L.db();
  const person = (role, i, key) => {
    const p = C.person(role, 80 + i);
    return { ...p, email: `s31${role.slice(0, 2)}${key}.${RUN}@${C.DOMAIN}`, phone: C.phone(`s31-${role}-${key}`), company: p.company || `${p.name} Transport` };
  };
  const pOwner = person("owner", 0, "a");
  await F.resetPeople([pOwner.email]);
  const customer = await L.makeCustomer(`s31-${RUN}`);
  let envRestarted = false;
  const session = async () => (await L.api("GET", "/logistics/session", { token: customer.token }))?.data?.config?.default_operating_range_km;

  try {
    L.sec("31a. Fleet: units at 5 / 90 / 120 km, one with its own 200 km range, one small truck nearby");
    const owner = await F.makeOwner(pOwner);
    const addUnit = async (i, km, opts = {}) => {
      const pos = offset(km);
      const u = await F.makeUnit(owner, C.unit("truck", 310 + i), { docs: { rego: 8 }, body: { lat: pos.lat, lng: pos.lng, location_label: `Base ${km} km`, ...(opts.range ? { operating_range_km: opts.range } : {}), capacity_value: opts.capacity || 16, capacity_unit: "tons" } });
      const op = await F.makeOperator(owner, person("operator", i, `u${i}`), { assets: [u._id], licence: false, face: (i % 4) + 1 });
      return { ...u, op, km };
    };
    const near = await addUnit(0, 5);
    const at90 = await addUnit(1, 90);
    const at120 = await addUnit(2, 120);
    const at120r = await addUnit(3, 120, { range: 200 });
    const tiny = await addUnit(4, 5, { capacity: 2 });
    const base = (await d.collection("logistics_assets").findOne({ _id: OID(at120._id) }));
    L.check(base?.home_location?.coordinates?.length === 2 && Math.round(base.home_location.coordinates[0] * 100) === Math.round(offset(120).lng * 100), "unit base saved from lat/lng", base?.home_location);

    const all = [near, at90, at120, at120r, tiny];
    for (const x of all) await F.goLive(x.op, x._id); // live GPS is the pickup; the base keeps its distance
    const job = await F.postJob(customer, { goods: `S31 cement ${RUN}`, weight: 5 });
    L.check(!!job, "dated 5 t job posted at Harare");
    const listed = async (who, jobId) => {
      const r = await L.api("GET", "/logistics/available-work?limit=50", { token: who.token });
      return (r?.data?.data || []).some((x) => String(x._id || x.job_id) === String(jobId));
    };
    const noteFor = async (who, jobId) => d.collection(" notifications").findOne({ receiver_id: OID(who._id), "meta.job_id": String(jobId) });

    L.sec("31b. Operating area");
    L.check(await listed(near.op, job), "5 km base (default 100 km): job listed");
    L.check(await listed(at90.op, job), "90 km base: job listed");
    L.check(!(await listed(at120.op, job)), "120 km base: job hidden");
    L.check(await listed(at120r.op, job), "120 km base with its own 200 km range: job listed");
    L.check(!(await listed(tiny.op, job)), "nearby 2 t truck on a 5 t job: hidden (can't carry)");

    L.sec("31c. Live GPS moves nothing: base decides");
    await F.goLive(at120.op, at120._id); // GPS = pickup, base 120 km
    L.check(!(await listed(at120.op, job)), "live GPS at the pickup: 120 km unit still hidden");
    await L.api("PATCH", "/logistics/me/availability", { token: at90.op.token, body: { state: "available_now", asset_id: at90._id, lat: LAT, lng: LNG + 3 } });
    L.check(await listed(at90.op, job), "live GPS driven far away: 90 km unit still sees it");
    await F.goLive(at90.op, at90._id);

    L.sec("31d. Alerts, listing and quote agree");
    await new Promise((r) => setTimeout(r, 2000));
    L.check(!!(await noteFor(at90.op, job)), "90 km live operator got the alert");
    L.check(!!(await noteFor(at120r.op, job)), "own-range unit got the alert");
    L.check(!(await noteFor(at120.op, job)), "120 km operator got no alert");
    L.check(!(await noteFor(tiny.op, job)), "too-small truck got no alert");
    let r = await F.quote(at120.op, job, at120._id);
    L.check(r?.success === false && r?.data?.code === "OUTSIDE_OPERATING_AREA", "quote from outside the area refused (OUTSIDE_OPERATING_AREA)", r);
    r = await F.quote(at90.op, job, at90._id);
    L.check(r?.success !== false, "90 km unit can quote", r?.message);
    const q90 = r?.data?.quote?._id;

    L.sec("31e. Direct link");
    r = await L.api("GET", `/logistics/job/${job}`, { token: at120.op.token });
    L.check(r?.success === false && r?.data?.code === "JOB_NOT_VISIBLE", "direct link for the far unit: JOB_NOT_VISIBLE", r);
    r = await L.api("GET", `/logistics/job/${job}`, { token: at90.op.token });
    L.check(r?.success !== false, "90 km unit opens the job", r?.message);
    const opPage = await L.actor("operator-far");
    await L.seedAuth(opPage, { token: at120.op.token, user: { _id: at120.op._id, role: 4, owner_id: owner._id } });
    await L.goto(opPage, `/logistics/driver/job/${job}`, '[data-testid="job-not-visible"]');
    L.check(/isn't available to your fleet/.test(await L.bodyText(opPage)), "far operator's page says it isn't available");
    await opPage.ctx.close();
    // Earlier quoter: range shrinks after the quote, the job stays open to them and the quote can be edited
    await L.api("PATCH", `/logistics/asset/${at90._id}`, { token: owner.token, body: { operating_range_km: 50 } });
    L.check(!(await listed(at90.op, job)), "range cut to 50 km: job gone from the list");
    r = await L.api("GET", `/logistics/job/${job}`, { token: at90.op.token });
    L.check(r?.success !== false, "earlier quoter still opens the job", r?.message);
    r = await L.api("POST", `/logistics/job/${job}/quote`, { token: at90.op.token, body: { asset_id: at90._id, amount: 240, message: "Edited" } });
    L.check(r?.success !== false, "editing the earlier quote isn't blocked by the area", r);
    await L.api("PATCH", `/logistics/asset/${at90._id}`, { token: owner.token, body: { operating_range_km: "" } });

    L.sec("31f. Open to return loads: any distance, still must carry it");
    const retJob = await F.postJob(customer, { goods: `S31 return ${RUN}`, weight: 5, body: { open_to_return_loads: true } });
    L.check(await listed(at120.op, retJob), "return load: 120 km unit sees it");
    r = await F.quote(at120.op, retJob, at120._id);
    L.check(r?.success !== false, "return load: far unit can quote", r?.message);
    L.check(!(await listed(tiny.op, retJob)), "return load too heavy for the small truck: hidden");
    const heavy = await F.postJob(customer, { goods: `S31 heavy ${RUN}`, weight: 20, body: { open_to_return_loads: true, special_notes: "Vehicle: 20 ton" } });
    L.check(!(await listed(near.op, heavy)), "20 t return load: hidden from 16 t trucks");
    // Now job
    const nowJob = await L.api("POST", "/logistics/job", { token: customer.token, body: { job_type: "transport", job_class: "local", load_type: `S31 now heavy ${RUN}`, pickup: { address: L.PLACES.base, coordinates: L.PLACES.coords.harare }, dropoff: { address: L.PLACES.drops[0], coordinates: L.PLACES.coords.chitungwiza }, load_weight: { value: 20, unit: "tons" }, special_notes: "Vehicle: 20 ton", budget: { amount: 300, currency: "USD" } } });
    const nowId = nowJob?.data?.job?._id || nowJob?.data?._id;
    L.check(!!nowId, "Now job 20 t posted", nowJob?.message);
    L.check(!(await listed(near.op, nowId)), "Now job too heavy for a nearby 16 t truck: hidden");
    await F.goOffline(tiny.op);

    L.sec("31g. Direct booking is exempt");
    const direct = await F.postJob(customer, { goods: `S31 direct ${RUN}`, weight: 5, body: { targeted_asset_id: at120._id } });
    L.check(await listed(at120.op, direct), "direct booking: far unit sees it");
    r = await F.quote(at120.op, direct, at120._id);
    L.check(r?.success !== false, "direct booking: far unit can quote", r?.message);
    L.check(!(await listed(near.op, direct)), "direct booking: others don't see it");

    L.sec("31h. Changing the default range on the server moves the boundary");
    L.check((await session()) === 100, "session reports default 100 km", await session());
    for (const x of all) await F.goOffline(x.op);
    await restartApi(150);
    envRestarted = true;
    L.check((await session()) === 150, "restart with 150: session reports it");
    const j150 = await F.postJob(customer, { goods: `S31 env ${RUN}`, weight: 5 });
    const small = await addUnit(5, 90, { range: 50 });
    L.check(await listed(at120.op, j150), "default 150: the 120 km unit with no range now sees jobs");
    L.check(await listed(at120r.op, j150), "unit with its own 200 km range: unchanged, still sees them");
    L.check(!(await listed(small.op, j150)), "unit with its own 50 km range at 90 km: still hidden");
    L.check(!(await d.collection("logistics_assets").findOne({ _id: OID(at120._id) }))?.operating_range_km, "the default was never written onto the unit");
    await restartApi(100);
    envRestarted = false;
    L.check((await session()) === 100, "restart with 100: default restored");
    L.check(!(await listed(at120.op, j150)), "default 100 again: the 120 km unit is hidden");
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
  } finally {
    if (envRestarted) await restartApi(100).catch(() => {});
  }
  await L.done();
})();
