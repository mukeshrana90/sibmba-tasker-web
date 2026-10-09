/* Records one short clip per key page: slowed API → shimmer skeleton → real content.
 * Output: demo/<name>.webm + demo/clips.json (offset where navigation starts).
 * Convert with ffmpeg (see README). Needs the :4099 test API + state.json from s1–s6. */
const fs = require("fs");
const path = require("path");
const L = require("./lib");

const OUT = path.join(__dirname, "demo");
const DELAY = Number(process.env.E2E_SK_DELAY || 2200);

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  process.env.E2E_VIDEO = OUT;
  const st = L.loadState();
  const fresh = (u) => ({ ...u, token: L.tokenFor(u._id) });
  const CLIPS = [
    ["customer-my-jobs", st.customer, "/logistics/jobs"],
    ["customer-job-detail", st.customer, `/logistics/jobs/${st.job._id}`],
    ["customer-asset", st.customer, `/logistics/asset/${st.truck._id}`],
    ["customer-hub", st.customer, "/logistics"],
    ["owner-dashboard", st.owner, "/logistics/owner"],
    ["owner-fleet", st.owner, "/logistics/owner/fleet"],
    ["owner-opportunities", st.owner, "/logistics/owner/opportunities"],
    ["owner-analytics", st.owner, "/logistics/owner/analytics"],
    ["operator-home", st.operator, "/logistics/driver"],
    ["mobile-my-jobs", st.customer, "/logistics/jobs", true],
  ];
  const meta = [];
  for (const [name, user, route, mobile] of CLIPS) {
    L.sec(`demo ${name}`);
    const a = await L.actor(`demo-${name}`, { mobile: !!mobile });
    const t0 = Date.now();
    await L.seedAuth(a, { token: fresh(user).token, user: fresh(user) });
    await a.page.route(/\/api\/(logistics|equipment)\//, async (r) => {
      if (r.request().method() === "GET") await new Promise((res) => setTimeout(res, DELAY));
      r.fallback();
    });
    const start = (Date.now() - t0) / 1000;
    await a.page.goto(`${L.WEB}${route}`, { waitUntil: "domcontentloaded" });
    let seen = false;
    const until = Date.now() + 20000;
    while (Date.now() < until) {
      const n = await a.page.locator(".log-sk, .log-hub-shimmer").count().catch(() => 0);
      if (n) seen = true;
      else if (seen) break;
      await a.page.waitForTimeout(100);
    }
    await a.page.waitForTimeout(1500);
    const video = a.page.video();
    await a.ctx.close();
    const file = video ? await video.path() : null;
    if (file) fs.renameSync(file, path.join(OUT, `${name}.webm`));
    meta.push({ name, route, start, mobile: !!mobile });
    L.check(seen, `${route} shows skeleton then content`);
  }
  fs.writeFileSync(path.join(OUT, "clips.json"), JSON.stringify(meta, null, 2));
  await L.done();
})();
