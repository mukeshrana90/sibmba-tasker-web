/* Stage 37 — 14 Nov: where people land after signing in through the real login form.
   Guest Logistics pages send "Sign in" to /login?redirect=<page>. Owners (even with hub.consume,
   which the default owner permissions include) and operators must land on their own dashboard,
   not on the customer Logistics Hub; links into their own area are kept; customers keep the Hub link. */
const L = require("./lib");
const F = require("./fleet-helpers");

const PASSWORD = "Passw0rd!";

(async () => {
  const st = L.loadState();
  const RUN = String(st.RUN || "run").toLowerCase();
  const C = L.cast(RUN);
  const actors = [];
  const person = (role, i, key) => {
    const p = C.person(role, 95 + i);
    return { ...p, email: `s37${role.slice(0, 2)}${key}.${RUN}@${C.DOMAIN}`, phone: C.phone(`s37-${role}-${key}`), company: p.company || `${p.name} Transport` };
  };
  // Real login needs a stored (hashed) password: set it through the model's save hook
  const setPassword = (id) =>
    F.backend(`const {User}=require("./src/models");const u=await User.findById(${JSON.stringify(id)});u.password=${JSON.stringify(PASSWORD)};await u.save();return true;`);

  try {
    const pHub = person("owner", 0, "hub");
    const pPlain = person("owner", 1, "plain");
    await F.resetPeople([pHub.email, pPlain.email]);
    const ownerHub = await F.makeOwner(pHub, {
      extra: { permissions: ["billing.manage", "assets.manage", "users.manage", "assignments.manage", "leads.view", "jobs.view_all", "drivers.activity.view", "analytics.view", "account.settings", "documents.manage", "hub.consume"] },
    });
    const ownerPlain = await F.makeOwner(pPlain);
    const op = await F.makeOperator(ownerHub, person("operator", 0, "op"));
    const cust = await L.makeCustomer(`s37-customer-${RUN}`, 1);
    for (const u of [ownerHub, ownerPlain, op]) {
      const r = await setPassword(u._id);
      if (r !== true) throw new Error(`password for ${u.email}: ${JSON.stringify(r)}`);
    }

    const cases = [
      { who: "owner (hub.consume)", u: ownerHub, from: "/logistics", want: "/logistics/owner", sidebar: true },
      { who: "owner (hub.consume)", u: ownerHub, from: "/logistics/search", want: "/logistics/owner", sidebar: true },
      { who: "owner (hub.consume)", u: ownerHub, from: "/logistics/owner/fleet", want: "/logistics/owner/fleet", sidebar: true },
      { who: "owner", u: ownerPlain, from: "/logistics", want: "/logistics/owner", sidebar: true },
      { who: "operator", u: op, from: "/logistics", want: "/logistics/driver", sidebar: true },
      { who: "operator", u: op, from: "/logistics/search", want: "/logistics/driver", sidebar: true },
      { who: "operator", u: op, from: "/logistics/owner/fleet", want: "/logistics/driver", sidebar: true },
      { who: "customer", u: cust, from: "/logistics/search", want: "/logistics/search", sidebar: false },
    ];

    for (const c of cases) {
      L.sec(`37 ${c.who}: sign in from ${c.from}`);
      const a = await L.actor(`s37-${c.who.split(" ")[0]}`);
      actors.push(a);
      await a.page.goto(`${L.WEB}/login?redirect=${encodeURIComponent(c.from)}`, { waitUntil: "domcontentloaded" });
      await a.page.fill('input[name="email"]', c.u.email);
      await a.page.fill('input[name="password"]', PASSWORD);
      await a.page.click('button[type="submit"]');
      await a.page.waitForURL((u) => !/\/login/.test(new URL(u).pathname), { timeout: 20000 }).catch(() => {});
      // Let any guard redirect finish
      await a.page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await a.page.waitForTimeout(1200);
      const at = new URL(a.page.url()).pathname;
      L.check(at === c.want, `${c.who} from ${c.from} lands on ${c.want}`, at);
      if (c.sidebar) {
        L.check(await a.page.locator(".log-supply-shell").isVisible().catch(() => false), `${c.who}: dashboard sidebar shown straight away`);
        const active = (await a.page.locator(".module-switcher .is-active").first().textContent().catch(() => "")) || "";
        L.check(/Logistics/i.test(active), `${c.who}: Logistics toggle active`, active);
      }
      if (at !== c.want) await L.shot(a, `s37-${c.who.split(" ")[0]}-${c.from.replace(/\W+/g, "_")}`);
      await a.ctx.close();
    }
  } catch (e) {
    L.check(false, "stage crashed", e.message.split("\n")[0]);
    for (const x of actors) await L.shot(x, "s37-crash").catch(() => {});
  }
  F.pageChecks(actors);
  await L.done();
})();
