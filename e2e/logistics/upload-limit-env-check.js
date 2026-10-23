/* Upload limit follows backend .env LOGISTICS_UPLOAD_MAX_MB (v2.7.57).
   Not part of run-all: start the test API with a non-default limit first, e.g.
     LOGISTICS_UPLOAD_MAX_MB=5 e2e/logistics/start-test-api.sh
     E2E_UPLOAD_MAX_MB=5 node e2e/logistics/upload-limit-env-check.js
   Checks: GET /session config.upload, the web picker message + limit, the API
   refusal (message names the limit) and a file just under the limit passing. */
const L = require("./lib");
const fs = require("fs");
const path = require("path");
const { MB, makeFixtures, upload, toastHas } = require("./upload-helpers");

(async () => {
  const LIMIT = Number(process.env.E2E_UPLOAD_MAX_MB || 10);
  const RUN = Date.now().toString(36).slice(-6);
  try {
    const F = await makeFixtures();
    const GEN = path.dirname(F.jpg);
    const jpg = fs.readFileSync(F.jpg);
    // valid JPEGs just over / just under the limit (padding after the end marker)
    const over = path.join(GEN, `over-${LIMIT}mb.jpg`);
    const under = path.join(GEN, `under-${LIMIT}mb.jpg`);
    fs.writeFileSync(over, Buffer.concat([jpg, Buffer.alloc(Math.floor(LIMIT * MB) + 1 - jpg.length)]));
    fs.writeFileSync(under, Buffer.concat([jpg, Buffer.alloc(Math.floor(LIMIT * MB) - 1024 - jpg.length)]));

    L.sec(`Upload limit from .env = ${LIMIT} MB`);
    const cust = await L.makeCustomer(`uplim.cust.${RUN}`);
    const s = await L.api("GET", "/logistics/session", { token: cust.token });
    L.check(s?.data?.config?.upload?.max_file_mb === LIMIT, `GET /session config.upload.max_file_mb = ${LIMIT}`, s?.data?.config?.upload);
    L.check(s?.data?.config?.upload?.max_file_bytes === Math.floor(LIMIT * MB), "max_file_bytes matches");

    const c = await L.actor("uplim-customer");
    await L.seedAuth(c, { token: cust.token, user: cust });
    await L.goto(c, "/logistics/post", "form.log-form-card--post");
    await c.page.waitForTimeout(1500); // session config loaded by the page
    const input = c.page.locator(".log-upload--post input[type=file]").first();
    await input.setInputFiles(over);
    L.check(await toastHas(c, new RegExp(`over-${LIMIT}mb\\.jpg is larger than ${LIMIT} MB`)), `web: just over ${LIMIT} MB → "larger than ${LIMIT} MB"`);
    L.check((await c.page.locator(".log-upload-thumb").count()) === 0, "web: not added");
    await input.setInputFiles(under);
    const underMsg = await L.waitText(c, /under-[0-9.]+mb\.jpg is larger than/, 1500);
    await c.page.waitForTimeout(500);
    const thumbs = await c.page.locator(".log-upload-thumb").count();
    L.check(!underMsg && thumbs === 1, `web: just under ${LIMIT} MB → added`, { underMsg, thumbs });

    const job = await L.api("POST", "/logistics/job", {
      token: cust.token,
      body: {
        job_type: "transport", job_class: "corridor", load_type: `Limit check ${RUN}`, special_notes: "Vehicle: 4 ton",
        pickup: { address: "Harare", coordinates: [31.0522, -17.8292] },
        dropoff: { address: "Ruwa", coordinates: [31.2447, -17.8897] },
        load_weight: { value: 3000, unit: "kg" }, budget: { amount: 300, currency: "USD" },
        when_needed: new Date(Date.now() + 20 * 86400000).toISOString(),
      },
    });
    const jobId = job?.data?.job?._id;
    L.check(!!jobId, "test job created", job?.message);
    let r = await upload("POST", `/logistics/job/${jobId}/images`, cust.token, [["images", { file: over, type: "image/jpeg" }]]);
    L.check(r.data?.code === "FILE_TOO_LARGE" && new RegExp(`${LIMIT} MB or smaller`).test(r.message), `API: just over → FILE_TOO_LARGE "${LIMIT} MB"`, r.message);
    r = await upload("POST", `/logistics/job/${jobId}/images`, cust.token, [["images", { file: under, type: "image/jpeg" }]]);
    L.check(r.success !== false, "API: just under → accepted", r.message);
    L.check(c.errors.length === 0 && c.apiFails.length === 0, "no console errors / 5xx", [...c.errors, ...c.apiFails].slice(0, 3));
  } catch (e) {
    L.check(false, `check crashed: ${e.message.split("\n")[0]}`);
    console.error(e);
  } finally {
    await L.done();
  }
})();
