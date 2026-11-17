/* Stage 33 — v2.7.66 Services/Logistics choice for logged-in customers, providers and corporates:
   shown and usable on their first page, not for owners/operators, "/" stays home for a Services
   visitor, no sideways scroll at 320 px, the small nav toggle stays. */
const L = require("./lib");
const F = require("./fleet-helpers");

const SWITCH = '[data-testid="market-switch"]';
const TOGGLE = ".module-switcher button";

(async () => {
  const st = L.loadState();
  const RUN = String(st.RUN || "run").toLowerCase();
  const actors = [];
  const A = async (n, opts) => { const a = await L.actor(n, opts); actors.push(a); return a; };
  try {
    const roles = [
      { name: "customer", role: 1, home: "/", taskerHome: /^\/$/ },
      { name: "provider", role: 2, home: "/requests", taskerHome: /\/requests/ },
      { name: "corporate", role: 3, home: "/corporate", taskerHome: /\/corporate/ },
    ];
    for (const r of roles) {
      L.sec(`33 ${r.name}: sees and uses the switch`);
      const user = await L.makeCustomer(`s33-${r.name}-${RUN}`, r.role);
      const a = await A(r.name);
      // Provider fixture has no service of its own: the "must add a service" gate is not what this tests
      if (r.role === 2) await a.ctx.route(/\/api\/service\/getMyServices/, (rt) => rt.fulfill({ json: { success: true, data: [{ _id: "s33" }], total: 1 } }));
      await L.seedAuth(a, { token: user.token, user });
      await L.goto(a, r.home, SWITCH);
      L.check(await a.page.locator(SWITCH).isVisible(), `${r.name}: choice shown on the first page`);
      L.check(await a.page.locator('[data-testid="market-logistics"]').isVisible() && await a.page.locator('[data-testid="market-services"]').isVisible(), `${r.name}: both options visible`);
      await L.shot(a, `s33-${r.name}`);
      await a.page.locator('[data-testid="market-logistics"]').click();
      await a.page.waitForURL(/\/logistics/, { timeout: 15000 }).catch(() => {});
      L.check(/\/logistics/.test(a.page.url()), `${r.name}: Logistics opens the logistics marketplace`, a.page.url());
      L.check((await a.page.evaluate(() => localStorage.getItem("lastSection"))) === "logistics", `${r.name}: choice saved`);
      await a.page.waitForLoadState("networkidle").catch(() => {});
      await a.page.waitForSelector(SWITCH, { timeout: 15000 }).catch(() => {});
      await a.page.locator('[data-testid="market-services"]').click();
      await a.page.waitForURL((u) => r.taskerHome.test(new URL(u).pathname), { timeout: 15000 }).catch(() => {});
      L.check(r.taskerHome.test(new URL(a.page.url()).pathname), `${r.name}: Services returns to their own home`, a.page.url());
      L.check((await a.page.evaluate(() => localStorage.getItem("lastSection"))) === "services", `${r.name}: Services choice saved`);
      // v2.7.66: on the home page the large choice replaces the small nav toggle (no duplicate switch)
      await a.page.waitForLoadState("networkidle").catch(() => {});
      await a.page.waitForTimeout(800);
      L.check(await a.page.locator(SWITCH).isVisible() && !(await a.page.locator(TOGGLE).count()), `${r.name}: home shows the large choice, not a second small toggle`);
      // A returning Services visitor isn't sent to /services from "/"
      if (r.home === "/") {
        await a.page.evaluate(() => localStorage.setItem("lastSection", "services"));
        const tab = await a.ctx.newPage();
        await tab.goto(`${L.WEB}/`, { waitUntil: "domcontentloaded" });
        await tab.waitForTimeout(1500);
        L.check(new URL(tab.url()).pathname === "/", `${r.name}: "/" stays home for a Services visitor (not /services)`, tab.url());
        await tab.close();
      }
      await a.page.evaluate(() => localStorage.removeItem("lastSection"));
    }

    L.sec("33b. Owner and operator get no choice");
    const ownerU = st.owner;
    const operatorU = st.operator;
    if (ownerU?.token && operatorU?.token) {
      for (const [name, user, path] of [["owner", ownerU, "/logistics/owner"], ["operator", operatorU, "/logistics/driver"]]) {
        const a = await A(`s33-${name}`);
        await L.seedAuth(a, { token: L.tokenFor(user._id), user });
        for (const route of ["/", path]) {
          await L.goto(a, route);
          await a.page.waitForTimeout(1500);
          L.check(!(await a.page.locator(SWITCH).count()), `${name}: no marketplace choice on ${route}`);
        }
      }
    } else {
      L.check(false, "s33 needs state.json owner + operator (run s1–s2 first)");
    }

    L.sec("33c. 320 px wide: no sideways scroll, choice fits");
    const small = await L.makeCustomer(`s33-small-${RUN}`, 1);
    const m = await A("narrow", { viewport: { width: 320, height: 640 } });
    await L.seedAuth(m, { token: small.token, user: small });
    for (const path of ["/", "/logistics"]) {
      await L.goto(m, path, SWITCH);
      await m.page.waitForTimeout(600);
      const over = await m.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      L.check(over <= 0, `320 px ${path}: no sideways scroll`, over);
      const box = await m.page.locator(SWITCH).boundingBox();
      L.check(box && box.x >= 0 && box.x + box.width <= 321, `320 px ${path}: switch fits`, box);
    }
    await L.shot(m, "s33-320");
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s33-crash");
  }
  // Known React warning from the <style jsx> in BookingConfirmationModal (older code, nothing to do with this stage)
  for (const x of actors) x.errors = x.errors.filter((e) => !/non-boolean attribute/.test(e));
  F.pageChecks(actors);
  await L.done();
})();
